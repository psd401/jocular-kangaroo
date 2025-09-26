import { handler } from '../index';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@aws-sdk/client-rds-data');
jest.mock('drizzle-orm/aws-data-api/pg');
jest.mock('drizzle-orm/aws-data-api/pg/migrator');
jest.mock('fs');
jest.mock('path');

const mockMigrate = jest.fn();
const mockDrizzle = jest.fn();

jest.mock('drizzle-orm/aws-data-api/pg/migrator', () => ({
  migrate: (...args: unknown[]) => mockMigrate(...args),
}));

jest.mock('drizzle-orm/aws-data-api/pg', () => ({
  drizzle: (...args: unknown[]) => mockDrizzle(...args),
}));

describe('Lambda Migration Handler', () => {
  const mockEvent = {
    RequestType: 'Create' as const,
    ResourceProperties: {
      ClusterArn: 'arn:aws:rds:us-west-2:123456789012:cluster:test-cluster',
      SecretArn: 'arn:aws:secretsmanager:us-west-2:123456789012:secret:test-secret',
      DatabaseName: 'testdb',
      Environment: 'dev',
    },
    RequestId: 'test-request-123',
    StackId: 'test-stack-id',
    LogicalResourceId: 'test-resource',
    ResponseURL: 'https://example.com/response',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (path.join as jest.Mock).mockReturnValue('/mock/path/drizzle');
    (path.normalize as jest.Mock).mockImplementation((p: string) => p);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(['0000_initial.sql', '0001_add_users.sql']);

    mockDrizzle.mockReturnValue({});
    mockMigrate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Delete Requests', () => {
    it('should return success immediately for Delete requests', async () => {
      const deleteEvent = { ...mockEvent, RequestType: 'Delete' as const };

      const result = await handler(deleteEvent);

      expect(result.Status).toBe('SUCCESS');
      expect(result.Reason).toContain('Delete not required');
      expect(mockMigrate).not.toHaveBeenCalled();
    });
  });

  describe('Create/Update Requests', () => {
    it('should successfully run migrations', async () => {
      const result = await handler(mockEvent);

      expect(result.Status).toBe('SUCCESS');
      expect(result.Reason).toContain('successfully');
      expect(mockDrizzle).toHaveBeenCalled();
      expect(mockMigrate).toHaveBeenCalled();
      expect(result.Data?.filesProcessed).toBe(2);
    });

    it('should include migration duration in result', async () => {
      const result = await handler(mockEvent);

      expect(result.Data?.duration).toBeDefined();
      expect(typeof result.Data?.duration).toBe('number');
    });

    it('should include environment in result', async () => {
      const result = await handler(mockEvent);

      expect(result.Data?.environment).toBe('dev');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing migrations folder', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await handler(mockEvent);

      expect(result.Status).toBe('FAILED');
      expect(result.Reason).toContain('not found');
      expect(result.Reason).toContain('RESOURCE_NOT_FOUND');
    });

    it('should handle migration execution failure', async () => {
      mockMigrate.mockRejectedValue(new Error('SQL syntax error in migration'));

      const result = await handler(mockEvent);

      expect(result.Status).toBe('FAILED');
      expect(result.Reason).toContain('SQL_SYNTAX_ERROR');
    });

    it('should categorize permission errors', async () => {
      mockMigrate.mockRejectedValue(new Error('Permission denied to access database'));

      const result = await handler(mockEvent);

      expect(result.Status).toBe('FAILED');
      expect(result.Reason).toContain('PERMISSION_DENIED');
    });

    it('should categorize network errors', async () => {
      mockMigrate.mockRejectedValue(new Error('Connection timeout to database'));

      const result = await handler(mockEvent);

      expect(result.Status).toBe('FAILED');
      expect(result.Reason).toContain('NETWORK_ERROR');
    });
  });

  describe('Security Validation', () => {
    it('should reject path traversal in migrations folder', async () => {
      (path.normalize as jest.Mock).mockImplementation((p: string) => {
        if (p.includes('drizzle')) {
          return '/different/path/drizzle';
        }
        return '/mock/path';
      });

      const result = await handler(mockEvent);

      expect(result.Status).toBe('FAILED');
      expect(result.Reason).toContain('SECURITY_VIOLATION');
    });

    it('should reject non-SQL migration files', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['0000_initial.sql', 'malicious.sh']);

      const result = await handler(mockEvent);

      expect(result.Status).toBe('FAILED');
      expect(result.Reason).toContain('SECURITY_VIOLATION');
    });

    it('should reject migration filenames with path separators', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['../etc/passwd.sql']);

      const result = await handler(mockEvent);

      expect(result.Status).toBe('FAILED');
      expect(result.Reason).toContain('SECURITY_VIOLATION');
    });
  });

  describe('Migration File Discovery', () => {
    it('should filter out non-SQL files', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([
        '0000_initial.sql',
        'README.md',
        '0001_users.sql',
        'meta.json',
      ]);

      const result = await handler(mockEvent);

      expect(result.Status).toBe('SUCCESS');
      expect(result.Data?.filesProcessed).toBe(2);
    });

    it('should handle empty migrations folder', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const result = await handler(mockEvent);

      expect(result.Status).toBe('SUCCESS');
      expect(result.Data?.filesProcessed).toBe(0);
    });

    it('should sort migration files', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([
        '0002_add_posts.sql',
        '0000_initial.sql',
        '0001_add_users.sql',
      ]);

      const result = await handler(mockEvent);

      expect(result.Status).toBe('SUCCESS');
    });
  });
});