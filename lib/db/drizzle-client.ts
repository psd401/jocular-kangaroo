import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { createLogger } from '@/lib/logger';

const log = createLogger({ context: 'drizzle-client' });

// Lazy-initialize the RDS Data API client
let rdsClient: RDSDataClient | null = null;

function getRDSClient(): RDSDataClient {
  if (!rdsClient) {
    // Use the Node.js credential provider chain which will:
    // 1. Check environment variables (AWS_ACCESS_KEY_ID, etc.)
    // 2. Check ECS container credentials (for Amplify WEB_COMPUTE)
    // 3. Check EC2 instance metadata
    // 4. Check shared credentials file
    // 5. Check ECS task role
    const region = process.env.AWS_REGION || 
                   process.env.AWS_DEFAULT_REGION || 
                   process.env.NEXT_PUBLIC_AWS_REGION || 
                   'us-east-1';
    
    log.info('Initializing RDS Data API client', { region });
    
    rdsClient = new RDSDataClient({ 
      region,
      credentials: fromNodeProviderChain(),
      maxAttempts: 3
    });
  }
  return rdsClient;
}

// Get Data API configuration with validation
function getDataApiConfig() {
  const missingVars = [];
  const invalidVars = [];
  
  // Basic ARN pattern validation
  const arnPattern = /^arn:aws:[a-z0-9-]+:[a-z0-9-]*:[0-9]{12}:.+$/;
  
  if (!process.env.RDS_RESOURCE_ARN) {
    missingVars.push('RDS_RESOURCE_ARN');
  } else if (!arnPattern.test(process.env.RDS_RESOURCE_ARN)) {
    invalidVars.push('RDS_RESOURCE_ARN (invalid ARN format)');
  }
  
  if (!process.env.RDS_SECRET_ARN) {
    missingVars.push('RDS_SECRET_ARN');
  } else if (!arnPattern.test(process.env.RDS_SECRET_ARN)) {
    invalidVars.push('RDS_SECRET_ARN (invalid ARN format)');
  }
  
  if (!process.env.RDS_DATABASE_NAME) {
    missingVars.push('RDS_DATABASE_NAME');
  }
  
  const region = process.env.AWS_REGION || 
                 process.env.AWS_DEFAULT_REGION || 
                 process.env.NEXT_PUBLIC_AWS_REGION;
  
  if (!region) {
    missingVars.push('AWS_REGION or NEXT_PUBLIC_AWS_REGION');
  }
  
  if (missingVars.length > 0 || invalidVars.length > 0) {
    const errorParts = [];
    if (missingVars.length > 0) {
      errorParts.push(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    if (invalidVars.length > 0) {
      errorParts.push(`Invalid environment variables: ${invalidVars.join(', ')}`);
    }
    const errorMsg = errorParts.join('. ');
    
    log.error('Environment validation failed', { 
      missingVars,
      invalidVars,
      region,
      availableAwsVarsCount: Object.keys(process.env).filter(k => 
        k.includes('AWS') || k.includes('RDS')).length
    });
    throw new Error(errorMsg);
  }
  
  return {
    database: process.env.RDS_DATABASE_NAME!,
    resourceArn: process.env.RDS_RESOURCE_ARN!,
    secretArn: process.env.RDS_SECRET_ARN!,
  };
}

// Lazy-initialize the Drizzle database instance
let dbInstance: ReturnType<typeof drizzle> | null = null;

// Export function to get the Drizzle database instance
export function getDb() {
  if (!dbInstance) {
    try {
      const config = getDataApiConfig();
      const client = getRDSClient();
      
      log.info('Initializing Drizzle ORM with AWS Data API');
      
      dbInstance = drizzle(client, {
        database: config.database,
        secretArn: config.secretArn,
        resourceArn: config.resourceArn,
        logger: process.env.DRIZZLE_LOG_LEVEL === 'debug'
      });
    } catch (error) {
      log.error('Failed to initialize Drizzle ORM', error);
      throw error;
    }
  }
  return dbInstance;
}

// Export the Drizzle database instance with lazy initialization
// Uses Proxy pattern to defer initialization until first access, preventing
// connection attempts during module import and enabling better error handling
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const instance = getDb();
    return instance[prop as keyof typeof instance];
  }
});

// Test connection utility
export async function testDrizzleConnection() {
  try {
    log.info('Testing Drizzle ORM connection...');
    
    // Import sql from drizzle-orm
    const { sql } = await import('drizzle-orm');
    
    // Get db instance (will initialize if needed)
    const database = getDb();
    
    // Execute a simple test query
    const result = await database.execute(sql`SELECT 1 as test, NOW() as timestamp`);
    
    log.info('Drizzle connection test successful', { 
      result: result.rows?.[0] || result 
    });
    
    return {
      success: true,
      message: 'Drizzle ORM connection successful',
      timestamp: new Date().toISOString(),
      result: result.rows?.[0] || result
    };
  } catch (error) {
    log.error('Drizzle connection test failed', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    };
  }
}

// Export type for use in other files
export type DrizzleDB = typeof db;