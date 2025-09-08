import { RDSDataClient, ExecuteStatementCommand } from '@aws-sdk/client-rds-data';
import * as fs from 'fs';
import * as path from 'path';

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

// Initial setup files (only run on empty database)
const INITIAL_SETUP_FILES = [
  '001-enums.sql',
  '002-tables.sql', 
  '003-constraints.sql',
  '004-indexes.sql',
  '005-initial-data.sql'
];

// Migration files that should ALWAYS run (additive only)
const MIGRATION_FILES = [
  '006-intervention-tables.sql',
  '007-intervention-indexes.sql',
  '008-intervention-data.sql',
  '009-intervention-tools.sql',
  '010-navigation-tool-link.sql'
];

export async function handler(event: CustomResourceEvent): Promise<any> {
  console.log('Database initialization event:', JSON.stringify(event, null, 2));
  console.log('Handler version: Jockular Kangaroo - Include migration files 006-010');

  // Only run on Create or Update
  if (event.RequestType === 'Delete') {
    return {
      PhysicalResourceId: event.PhysicalResourceId || 'db-init',
      Status: 'SUCCESS',
      Reason: 'Delete not required for database initialization'
    };
  }

  const { ClusterArn, SecretArn, DatabaseName, Environment } = event.ResourceProperties;

  try {
    // Check if this is a fresh database or existing one
    const isDatabaseEmpty = await checkIfDatabaseEmpty(ClusterArn, SecretArn, DatabaseName);
    
    if (isDatabaseEmpty) {
      console.log('🆕 Empty database detected - running full initialization');
      
      // Run initial setup files for fresh installation
      for (const sqlFile of INITIAL_SETUP_FILES) {
        console.log(`Executing initial setup: ${sqlFile}`);
        await executeFileStatements(ClusterArn, SecretArn, DatabaseName, sqlFile);
      }
    } else {
      console.log('✅ Existing database detected - skipping initial setup files');
      console.log('⚠️  ONLY migration files will be processed');
    }

    // ALWAYS run migrations (they should be idempotent and safe)
    console.log('🔄 Processing migrations...');
    
    // Ensure migration tracking table exists
    await ensureMigrationTable(ClusterArn, SecretArn, DatabaseName);
    
    // Run each migration that hasn't been run yet
    for (const migrationFile of MIGRATION_FILES) {
      const hasRun = await checkMigrationRun(ClusterArn, SecretArn, DatabaseName, migrationFile);
      
      if (!hasRun) {
        console.log(`▶️  Running migration: ${migrationFile}`);
        const startTime = Date.now();
        
        try {
          await executeFileStatements(ClusterArn, SecretArn, DatabaseName, migrationFile);
          
          // Record successful migration
          await recordMigration(ClusterArn, SecretArn, DatabaseName, migrationFile, true, Date.now() - startTime);
          console.log(`✅ Migration ${migrationFile} completed successfully`);
          
        } catch (error: any) {
          // Record failed migration
          await recordMigration(ClusterArn, SecretArn, DatabaseName, migrationFile, false, Date.now() - startTime, error.message);
          throw new Error(`Migration ${migrationFile} failed: ${error.message}`);
        }
      } else {
        console.log(`⏭️  Skipping migration ${migrationFile} - already run`);
      }
    }

    return {
      PhysicalResourceId: 'db-init',
      Status: 'SUCCESS',
      Reason: 'Database initialization/migration completed successfully'
    };

  } catch (error: any) {
    console.error('❌ Database operation failed:', error);
    return {
      PhysicalResourceId: 'db-init',
      Status: 'FAILED',
      Reason: `Database operation failed: ${error.message || error}`
    };
  }
}

// Check if database is empty (fresh installation)
async function checkIfDatabaseEmpty(clusterArn: string, secretArn: string, database: string): Promise<boolean> {
  try {
    // Check if users table exists (core table that should always exist)
    const result = await executeSql(
      clusterArn,
      secretArn,
      database,
      `SELECT COUNT(*) FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name = 'users'`
    );
    const count = result.records?.[0]?.[0]?.longValue || 0;
    return count === 0;
  } catch (error: any) {
    // If we can't check, assume empty for safety
    console.log('Could not check if database is empty, assuming fresh install');
    return true;
  }
}

// Ensure migration tracking table exists (matches existing structure)
async function ensureMigrationTable(clusterArn: string, secretArn: string, database: string): Promise<void> {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS migration_log (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      execution_time_ms INTEGER,
      success BOOLEAN,
      error_message TEXT
    )`;
  
  await executeSql(clusterArn, secretArn, database, createTableSql);
}

// Check if a specific migration has been run
async function checkMigrationRun(clusterArn: string, secretArn: string, database: string, migrationName: string): Promise<boolean> {
  try {
    const result = await executeSql(
      clusterArn,
      secretArn,
      database,
      `SELECT success FROM migration_log WHERE migration_name = '${migrationName}'`
    );
    return result.records && result.records.length > 0 && result.records[0][0]?.booleanValue === true;
  } catch (error: any) {
    return false;
  }
}

// Record migration execution (matches existing table structure)
async function recordMigration(clusterArn: string, secretArn: string, database: string, migrationName: string, success: boolean, executionTimeMs: number, errorMessage?: string): Promise<void> {
  // Simple INSERT - don't try to update if exists since table has no unique constraint
  const sql = `
    INSERT INTO migration_log (migration_name, execution_time_ms, success, error_message, executed_at)
    VALUES ('${migrationName}', ${executionTimeMs}, ${success}, ${errorMessage ? `'${errorMessage.replace(/'/g, "''")}'` : 'NULL'}, CURRENT_TIMESTAMP)`;
  
  await executeSql(clusterArn, secretArn, database, sql);
}

// Execute statements from a file
async function executeFileStatements(clusterArn: string, secretArn: string, database: string, sqlFile: string): Promise<void> {
  const sqlPath = path.join(__dirname, 'schema', sqlFile);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Split SQL into individual statements
  const statements = splitSqlStatements(sql);
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await executeSql(clusterArn, secretArn, database, statement);
      } catch (error: any) {
        // Log error but continue if it's a "already exists" type error
        if (error.message?.includes('already exists') || 
            error.message?.includes('duplicate key') ||
            error.message?.includes('already exists')) {
          console.log(`Skipping (already exists): ${error.message}`);
        } else {
          throw error;
        }
      }
    }
  }
}

async function executeSql(
  clusterArn: string,
  secretArn: string,
  database: string,
  sql: string
): Promise<any> {
  const command = new ExecuteStatementCommand({
    resourceArn: clusterArn,
    secretArn: secretArn,
    database: database,
    sql: sql,
    includeResultMetadata: true
  });

  const response = await rdsClient.send(command);
  return response;
}

function splitSqlStatements(sql: string): string[] {
  // Remove comments and empty lines
  const lines = sql.split('\n');
  const cleanedLines: string[] = [];
  let inMultiLineComment = false;
  
  for (const line of lines) {
    let cleanedLine = line;
    
    // Handle multi-line comments
    if (inMultiLineComment) {
      const endIndex = cleanedLine.indexOf('*/');
      if (endIndex !== -1) {
        inMultiLineComment = false;
        cleanedLine = cleanedLine.substring(endIndex + 2);
      } else {
        continue;
      }
    }
    
    const startIndex = cleanedLine.indexOf('/*');
    if (startIndex !== -1) {
      const endIndex = cleanedLine.indexOf('*/', startIndex);
      if (endIndex !== -1) {
        cleanedLine = cleanedLine.substring(0, startIndex) + cleanedLine.substring(endIndex + 2);
      } else {
        inMultiLineComment = true;
        cleanedLine = cleanedLine.substring(0, startIndex);
      }
    }
    
    // Remove single-line comments
    const commentIndex = cleanedLine.indexOf('--');
    if (commentIndex !== -1) {
      cleanedLine = cleanedLine.substring(0, commentIndex);
    }
    
    if (cleanedLine.trim()) {
      cleanedLines.push(cleanedLine);
    }
  }
  
  // Join lines and split by semicolon
  const fullSql = cleanedLines.join('\n');
  const statements = fullSql.split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s + ';'); // Add semicolon back
  
  return statements;
}

