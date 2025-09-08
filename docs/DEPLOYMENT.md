# Deployment Guide

This guide explains how to deploy the Jockular Kangaroo AWS infrastructure using AWS CDK.

## Prerequisites
- AWS CLI installed and configured with credentials for your AWS account
- AWS CDK installed globally (`npm install -g aws-cdk`)
- Node.js 20.x and npm installed
- TypeScript installed in the Lambda directory (will be installed during deployment)
- **IMPORTANT: AWS account must have available VPC capacity (default limit is 5 VPCs)**

## Deployment Steps

> **⚠️ VPC Limit Issue**: The current AWS account has reached its VPC limit (5 VPCs). Before deploying, you must either:
> 1. Request a VPC limit increase through AWS Service Quotas
> 2. Modify the database stack to use an existing VPC (see Troubleshooting section)
> 3. Delete an unused VPC (if available)

### 1. Install Dependencies

First, install the infrastructure dependencies:

```bash
cd infra
npm install
```

If deploying the Lambda function, ensure TypeScript is installed:

```bash
cd database/lambda
npm install typescript --save-dev
cd ../..
```

### 2. Bootstrap CDK (First Time Only)

If this is your first time using CDK in this AWS account/region:

```bash
cdk bootstrap
```

### 3. Deploy Development Environment

Deploy the essential stacks for local development:

#### Database Stack
```bash
cdk deploy JockularKangaroo-DatabaseStack-Dev --require-approval never
```

> **Note**: Database stack creation takes 10-15 minutes due to Aurora Serverless provisioning. You can monitor progress in the CloudFormation console.

#### Auth Stack (requires Google OAuth setup)
To deploy the auth stack, you'll need:
1. Create a Google OAuth application
2. Store the client secret in AWS Secrets Manager as `jockular-kangaroo-dev-google-oauth` with format: `{ "clientSecret": "..." }`
3. Deploy with the client ID parameter:

```bash
cdk deploy JockularKangaroo-AuthStack-Dev \
  --parameters GoogleClientId=your-google-client-id-here \
  --require-approval never
```

#### Storage Stack
```bash
cdk deploy JockularKangaroo-StorageStack-Dev --require-approval never
```

### 4. Deploy Production Environment

Similar to development, but with production parameters:

```bash
# Database
cdk deploy JockularKangaroo-DatabaseStack-Prod --require-approval never

# Auth (requires production Google OAuth credentials)
cdk deploy JockularKangaroo-AuthStack-Prod \
  --parameters GoogleClientId=your-prod-google-client-id \
  --require-approval never

# Storage
cdk deploy JockularKangaroo-StorageStack-Prod --require-approval never
```

### 5. Deploy Frontend (Optional - requires GitHub token and domain)

If you want to deploy the frontend via AWS Amplify:

1. Create a GitHub personal access token and store it in AWS Secrets Manager as `jockular-kangaroo-github-token`
2. Deploy with your domain:

```bash
# Development frontend
cdk deploy JockularKangaroo-FrontendStack-Dev --context baseDomain=yourdomain.com

# Production frontend
cdk deploy JockularKangaroo-FrontendStack-Prod --context baseDomain=yourdomain.com
```

## Stack Outputs

After deployment, you'll get important outputs from each stack:

### Database Stack Outputs:
- `RdsProxyEndpoint` - RDS Proxy endpoint for secure database connections
- `ClusterEndpoint` - Aurora cluster writer endpoint
- `ClusterReaderEndpoint` - Aurora cluster reader endpoint
- `ClusterArn` - Aurora cluster ARN (needed for RDS Data API)
- `DbSecretArn` - Secrets Manager ARN containing database credentials

### Auth Stack Outputs:
- `UserPoolId` - Cognito User Pool ID
- `UserPoolClientId` - Cognito User Pool Client ID
- `CognitoDomainUrl` - Cognito hosted UI domain URL

### Storage Stack Outputs:
- `BucketName` - S3 bucket name for document storage
- `BucketArn` - S3 bucket ARN

## Environment Configuration

A `.env.local.example` file has been created with the deployed values. Copy it to create your local environment:

```bash
cp .env.local.example .env.local
```

For the development deployment that was just completed:

```bash
# Database (Already configured)
RDS_RESOURCE_ARN=arn:aws:rds:us-east-1:390844780692:cluster:jockularkangaroo-databasesta-auroracluster23d869c0-yn4iyugu07hw
RDS_SECRET_ARN=arn:aws:secretsmanager:us-east-1:390844780692:secret:DbSecret685A0FA5-u693am23IA7L-Giz1cc

# Storage (Already configured)
S3_BUCKET_NAME=jockularkangaroo-storagest-documentsbucket9ec9deb9-7kel62rlvz0p

# Auth (To be configured after Auth stack deployment)
NEXT_PUBLIC_USER_POOL_ID=
NEXT_PUBLIC_USER_POOL_CLIENT_ID=
AUTH_COGNITO_CLIENT_ID=
AUTH_COGNITO_ISSUER=

# Region
AWS_REGION=us-east-1

# NextAuth
AUTH_URL=http://localhost:3000
AUTH_SECRET=  # Generate with: openssl rand -base64 32
```

## Local Development

After deploying the dev environment:

```bash
# Return to project root
cd ..

# Install dependencies
npm install

# Run the development server
npm run dev
```

The application will be available at http://localhost:3000

## Cost Optimization

The development environment uses minimal AWS resources:
- Aurora Serverless v2 scales down to 0.5 ACU when idle
- No reader instances in development
- 1-day backup retention
- Resources can be destroyed when not in use

## Cleaning Up

To remove all development resources:

```bash
cd infra
cdk destroy JockularKangaroo-DatabaseStack-Dev JockularKangaroo-AuthStack-Dev JockularKangaroo-StorageStack-Dev
```

For production, deletion protection is enabled on critical resources. You'll need to manually disable deletion protection before destroying production stacks.

## Google OAuth Setup

If deploying the Auth stack, you'll need to set up Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs:
   - For dev: `https://jockular-kangaroo-dev.auth.<region>.amazoncognito.com/oauth2/idpresponse`
   - For prod: `https://jockular-kangaroo-prod.auth.<region>.amazoncognito.com/oauth2/idpresponse`
4. Store the client secret in AWS Secrets Manager as described above
5. Use the client ID when deploying the Auth stack

## GitHub Token Setup (Frontend Deployment Only)

If deploying the frontend stack:

1. Create a GitHub personal access token with repository access
2. Store it in AWS Secrets Manager as `jockular-kangaroo-github-token`
3. Ensure your repository is accessible with this token

## Troubleshooting

### VPC Limit Reached
If you encounter "The maximum number of VPCs has been reached" error:

**Option 1: Request VPC Limit Increase (Recommended)**
1. Go to AWS Console → Service Quotas (or https://console.aws.amazon.com/servicequotas/)
2. Click "AWS services" in the left menu
3. Search for "VPC" or find "Amazon Virtual Private Cloud (Amazon VPC)"
4. Click on "Amazon Virtual Private Cloud (Amazon VPC)"
5. Find "VPCs per Region" in the list
6. Click on it and then click "Request quota increase"
7. Enter your desired value (e.g., 10 or 15)
8. Click "Request"

**Option 2: Use Existing VPC**
Modify the database stack to use an existing VPC instead of creating a new one:
```typescript
// In database-stack.ts, replace the VPC creation with:
const vpc = ec2.Vpc.fromLookup(this, 'ExistingVpc', {
  vpcId: 'vpc-xxxxxx' // Use an existing VPC ID
});
```

**Option 3: Use Default VPC**
```typescript
// Use the default VPC
const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
  isDefault: true
});
```

### Lambda Build Errors
If you see TypeScript errors when deploying the database stack:
```bash
cd infra/database/lambda
npm install typescript --save-dev
npm run build
```

### Stack Already Exists
If a stack already exists, either:
- Update it: `cdk deploy <stack-name>`
- Destroy and redeploy: `cdk destroy <stack-name>` then `cdk deploy <stack-name>`

### Missing Outputs
Stack outputs are shown after deployment. You can also find them in:
- AWS CloudFormation console → Stack → Outputs tab
- AWS CLI: `aws cloudformation describe-stacks --stack-name <stack-name>`

### Export Name Conflicts
If you see errors about export names already being used (e.g., by AIStudio stacks), the JockularKangaroo stacks use prefixed export names to avoid conflicts. All exports are prefixed with "JockularKangaroo-".