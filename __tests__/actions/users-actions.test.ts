import { createMockDb, mockDbQuery } from '@/tests/helpers/drizzle-mock';
import { testDataFactory } from '@/tests/helpers/test-data-factory';

jest.mock('@/lib/db/drizzle-client', () => ({
  db: createMockDb(),
}));

jest.mock('@/actions/db/get-current-user-action');

import { getUsersAction } from '@/actions/db/users-actions';
import { db } from '@/lib/db/drizzle-client';
import { getCurrentUserAction } from '@/actions/db/get-current-user-action';

describe('users-actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testDataFactory.reset();
  });

  describe('getUsersAction', () => {
    it('should return users successfully', async () => {
      const mockCurrentUser = testDataFactory.user({ id: 1 });
      (getCurrentUserAction as jest.Mock).mockResolvedValue({
        isSuccess: true,
        data: mockCurrentUser,
      });

      const mockUsers = [
        testDataFactory.user({ id: 1, firstName: 'Alice', lastName: 'Anderson' }),
        testDataFactory.user({ id: 2, firstName: 'Bob', lastName: 'Brown' }),
      ];

      mockDbQuery(db as unknown as Record<string, unknown>, mockUsers);

      const result = await getUsersAction();

      expect(result.isSuccess).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0]).toMatchObject({
        id: 1,
        firstName: 'Alice',
        lastName: 'Anderson',
      });
      expect(result.message).toBe('Users fetched successfully');
    });

    it('should handle null firstName and lastName', async () => {
      const mockCurrentUser = testDataFactory.user({ id: 1 });
      (getCurrentUserAction as jest.Mock).mockResolvedValue({
        isSuccess: true,
        data: mockCurrentUser,
      });

      const mockUsers = [
        testDataFactory.user({ id: 1, firstName: null, lastName: null }),
      ];

      mockDbQuery(db as unknown as Record<string, unknown>, mockUsers);

      const result = await getUsersAction();

      expect(result.isSuccess).toBe(true);
      expect(result.data?.[0].firstName).toBe('');
      expect(result.data?.[0].lastName).toBe('');
    });

    it('should return unauthorized when user is not authenticated', async () => {
      (getCurrentUserAction as jest.Mock).mockResolvedValue({
        isSuccess: false,
        message: 'Unauthorized',
      });

      const result = await getUsersAction();

      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe('Unauthorized');
      expect(db.select).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockCurrentUser = testDataFactory.user({ id: 1 });
      (getCurrentUserAction as jest.Mock).mockResolvedValue({
        isSuccess: true,
        data: mockCurrentUser,
      });

      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await getUsersAction();

      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe('Failed to fetch users');
    });

    it('should return empty array when no users exist', async () => {
      const mockCurrentUser = testDataFactory.user({ id: 1 });
      (getCurrentUserAction as jest.Mock).mockResolvedValue({
        isSuccess: true,
        data: mockCurrentUser,
      });

      mockDbQuery(db as unknown as Record<string, unknown>, []);

      const result = await getUsersAction();

      expect(result.isSuccess).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });
});