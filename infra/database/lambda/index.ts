import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { migrate } from 'drizzle-orm/aws-data-api/pg/migrator';
import * as path from 'path';
import * as fs from 'fs';

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

export async function handler(event: CustomResourceEvent): Promise<any> {
  console.log('Database migration event:', JSON.stringify(event, null, 2));
  console.log('Handler version: Jocular Kangaroo - Drizzle ORM Migration System');

  if (event.RequestType === 'Delete') {
    return {
      PhysicalResourceId: event.PhysicalResourceId || 'db-init',
      Status: 'SUCCESS',
      Reason: 'Delete not required for database migrations'
    };
  }

  const { ClusterArn, SecretArn, DatabaseName, Environment } = event.ResourceProperties;

  try {
    console.log('🚀 Initializing Drizzle ORM with AWS Data API');

    const db = drizzle(rdsClient, {
      database: DatabaseName,
      secretArn: SecretArn,
      resourceArn: ClusterArn,
    });

    const migrationsFolder = path.join(__dirname, 'drizzle');

    console.log('📁 Migrations folder:', migrationsFolder);

    if (!fs.existsSync(migrationsFolder)) {
      throw new Error(`Migrations folder not found at ${migrationsFolder}`);
    }

    const migrationFiles = fs.readdirSync(migrationsFolder)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('📋 Found migration files:', migrationFiles);

    console.log('🔄 Running Drizzle migrations...');
    await migrate(db, { migrationsFolder });
    console.log('✅ Drizzle migrations completed successfully');

    return {
      PhysicalResourceId: 'db-init',
      Status: 'SUCCESS',
      Reason: 'Database migrations completed successfully using Drizzle ORM'
    };

  } catch (error: any) {
    console.error('❌ Database migration failed:', error);
    console.error('Error stack:', error.stack);
    return {
      PhysicalResourceId: 'db-init',
      Status: 'FAILED',
      Reason: `Database migration failed: ${error.message || error}`
    };
  }
}