// Set environment variables for tests
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.RDS_RESOURCE_ARN = 'arn:aws:rds:us-east-1:123456789012:cluster:test-cluster';
process.env.RDS_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret';
process.env.AWS_REGION = 'us-east-1';
process.env.NEXT_PUBLIC_AWS_REGION = 'us-east-1';
process.env.NEXT_PUBLIC_USER_POOL_ID = 'us-east-1_test';
process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID = 'test-client-id';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.NODE_ENV = 'test';