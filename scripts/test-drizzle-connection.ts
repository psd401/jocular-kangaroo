#!/usr/bin/env tsx

/**
 * Test script to verify Drizzle ORM connection to AWS RDS via Data API
 * Run with: npm run ts-node scripts/test-drizzle-connection.ts
 */

import * as dotenv from 'dotenv';
import { testDrizzleConnection } from '@/lib/db/drizzle-client';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🔍 Testing Drizzle ORM Connection...\n');
  
  // Check environment variables
  const requiredVars = ['RDS_RESOURCE_ARN', 'RDS_SECRET_ARN', 'RDS_DATABASE_NAME'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.log('\nPlease ensure your .env.local file contains:');
    requiredVars.forEach(v => {
      console.log(`${v}=<your-value>`);
    });
    process.exit(1);
  }
  
  console.log('✅ Environment variables configured:');
  console.log(`   Database: ${process.env.RDS_DATABASE_NAME}`);
  console.log(`   Region: ${process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`   Resource ARN: ${process.env.RDS_RESOURCE_ARN?.substring(0, 50)}...`);
  console.log(`   Secret ARN: ${process.env.RDS_SECRET_ARN?.substring(0, 50)}...`);
  console.log();
  
  // Test the connection
  const result = await testDrizzleConnection();
  
  if (result.success) {
    console.log('✅ Drizzle ORM connection successful!');
    console.log('   Timestamp:', result.timestamp);
    if (result.result) {
      console.log('   Database response:', JSON.stringify(result.result, null, 2));
    }
    console.log('\n🎉 Drizzle ORM is properly configured and ready to use!');
  } else {
    console.error('❌ Drizzle ORM connection failed!');
    console.error('   Error:', result.message);
    if (result.error) {
      console.error('\nFull error details:', result.error);
    }
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});