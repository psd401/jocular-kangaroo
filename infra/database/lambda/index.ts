import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { migrate } from 'drizzle-orm/aws-data-api/pg/migrator';
import * as path from 'path';
import * as fs from 'fs';
import { createLogger } from './logger';

const rdsClient = new RDSDataClient({});

interface CustomResourceEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
  ResourceProperties: {
    ClusterArn: string;
    SecretArn: string;
    DatabaseName: string;
    Environment: string;
  };
  PhysicalResourceId?: string;
  RequestId: string;
  StackId: string;
  LogicalResourceId: string;
  ResponseURL: string;
}

interface MigrationResult {
  PhysicalResourceId: string;
  Status: 'SUCCESS' | 'FAILED';
  Reason: string;
  Data?: Record<string, unknown>;
}

function validateMigrationsPath(migrationsFolder: string): void {
  const normalizedPath = path.normalize(migrationsFolder);
  const expectedBasePath = path.normalize(__dirname);

  if (!normalizedPath.startsWith(expectedBasePath)) {
    throw new Error('Security: Migrations folder path is outside expected directory');
  }

  if (normalizedPath.includes('..')) {
    throw new Error('Security: Path traversal detected in migrations folder');
  }
}

function validateMigrationFiles(migrationFiles: string[]): void {
  for (const file of migrationFiles) {
    if (!file.endsWith('.sql')) {
      throw new Error(`Security: Invalid migration file extension for ${file}`);
    }

    if (file.includes('..') || file.includes('/') || file.includes('\\')) {
      throw new Error(`Security: Invalid characters in migration filename: ${file}`);
    }
  }
}

export async function handler(event: CustomResourceEvent): Promise<MigrationResult> {
  const startTime = Date.now();
  const log = createLogger(event.RequestId, event.ResourceProperties.Environment);

  log.info('Database migration handler invoked', {
    requestType: event.RequestType,
    stackId: event.StackId,
    logicalResourceId: event.LogicalResourceId,
    handlerVersion: 'Jocular Kangaroo - Drizzle ORM Migration System',
  });

  if (event.RequestType === 'Delete') {
    log.info('Delete request received - no action needed for migrations', {
      physicalResourceId: event.PhysicalResourceId || 'db-init',
    });
    return {
      PhysicalResourceId: event.PhysicalResourceId || 'db-init',
      Status: 'SUCCESS',
      Reason: 'Delete not required for database migrations',
    };
  }

  const { ClusterArn, SecretArn, DatabaseName, Environment } = event.ResourceProperties;

  try {
    log.info('Initializing Drizzle ORM with AWS Data API', {
      database: DatabaseName,
      environment: Environment,
      clusterArn: ClusterArn.split(':').slice(0, 6).join(':'),
    });

    const db = drizzle(rdsClient, {
      database: DatabaseName,
      secretArn: SecretArn,
      resourceArn: ClusterArn,
    });

    const migrationsFolder = path.join(__dirname, 'drizzle');
    log.debug('Migrations folder path determined', { migrationsFolder });

    validateMigrationsPath(migrationsFolder);
    log.debug('Migrations path validation passed');

    if (!fs.existsSync(migrationsFolder)) {
      const errorMsg = `Migrations folder not found at ${migrationsFolder}`;
      log.error(errorMsg, { expectedPath: migrationsFolder });
      throw new Error(errorMsg);
    }

    const migrationFiles = fs.readdirSync(migrationsFolder)
      .filter(f => f.endsWith('.sql'))
      .sort();

    log.info('Migration files discovered', {
      count: migrationFiles.length,
      files: migrationFiles,
    });

    if (migrationFiles.length === 0) {
      log.warn('No migration files found in migrations folder');
    }

    validateMigrationFiles(migrationFiles);
    log.debug('Migration files validation passed');

    const migrationStartTime = Date.now();
    log.info('Starting Drizzle migration execution', {
      totalFiles: migrationFiles.length,
    });

    await migrate(db, { migrationsFolder });

    const migrationDuration = Date.now() - migrationStartTime;
    const totalDuration = Date.now() - startTime;

    log.info('Drizzle migrations completed successfully', {
      migrationDuration,
      totalDuration,
      filesProcessed: migrationFiles.length,
    });

    return {
      PhysicalResourceId: 'db-init',
      Status: 'SUCCESS',
      Reason: 'Database migrations completed successfully using Drizzle ORM',
      Data: {
        filesProcessed: migrationFiles.length,
        duration: totalDuration,
        environment: Environment,
      },
    };

  } catch (error: unknown) {
    const totalDuration = Date.now() - startTime;
    const errorObj = error as Error;

    let errorCategory = 'UNKNOWN';
    let errorDetails: Record<string, unknown> = {};

    if (errorObj.message) {
      if (errorObj.message.includes('Security:')) {
        errorCategory = 'SECURITY_VIOLATION';
      } else if (errorObj.message.includes('not found')) {
        errorCategory = 'RESOURCE_NOT_FOUND';
      } else if (errorObj.message.includes('permission') || errorObj.message.includes('denied')) {
        errorCategory = 'PERMISSION_DENIED';
      } else if (errorObj.message.includes('syntax') || errorObj.message.includes('SQL')) {
        errorCategory = 'SQL_SYNTAX_ERROR';
      } else if (errorObj.message.includes('timeout') || errorObj.message.includes('connection')) {
        errorCategory = 'NETWORK_ERROR';
      }
    }

    errorDetails = {
      message: errorObj.message || 'Unknown error',
      stack: errorObj.stack,
      category: errorCategory,
      duration: totalDuration,
    };

    log.error('Database migration failed', errorDetails);

    return {
      PhysicalResourceId: 'db-init',
      Status: 'FAILED',
      Reason: `Database migration failed [${errorCategory}]: ${errorObj.message || 'Unknown error'}`,
    };
  }
}