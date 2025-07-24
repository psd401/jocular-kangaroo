# Jockular Kangaroo Deployment Guide

This guide provides step-by-step instructions for deploying the Jockular Kangaroo intervention tracking system to AWS.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **AWS CDK CLI** installed: `npm install -g aws-cdk`
4. **Node.js 18+** and npm
5. **Domain name** (optional, for custom domain)

## Pre-Deployment Setup

### 1. Create AWS Secrets

Create the following secrets in AWS Secrets Manager:

```bash
# GitHub token for Amplify deployments
aws secretsmanager create-secret \
  --name JockularKangaroo/github-token \
  --secret-string '{"token":"your-github-personal-access-token"}'

# Google OAuth credentials (if using Google login)
aws secretsmanager create-secret \
  --name JockularKangaroo/google-oauth \
  --secret-string '{"clientId":"your-client-id","clientSecret":"your-client-secret"}'
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.production` and update:

```bash
# Database (will be auto-populated by CDK)
RDS_RESOURCE_ARN=
RDS_SECRET_ARN=
RDS_DATABASE_NAME=jockular_kangaroo

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# AWS Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
S3_BUCKET_NAME=jockular-kangaroo-documents-prod

# Application
NEXT_PUBLIC_APP_NAME="Jockular Kangaroo"
NEXT_PUBLIC_DISTRICT_NAME="Your School District"
```

### 3. Update CDK Configuration

Edit `infra/config/index.ts` to set your deployment parameters:

```typescript
export const config = {
  project: "JockularKangaroo",
  owner: "your-email@district.edu",
  baseDomain: "your-domain.com", // Optional
  github: {
    owner: "your-github-org",
    repo: "jockular-kangaroo",
    branch: "main"
  }
};
```

## Deployment Steps

### 1. Bootstrap CDK

If this is your first CDK deployment in the account/region:

```bash
cd infra
cdk bootstrap
```

### 2. Deploy Infrastructure Stacks

Deploy all stacks in order:

```bash
# Deploy development environment
cdk deploy JockularKangaroo-VPC-Dev \
           JockularKangaroo-DatabaseStack-Dev \
           JockularKangaroo-AuthStack-Dev \
           JockularKangaroo-StorageStack-Dev \
           JockularKangaroo-AmplifyStack-Dev

# Deploy production environment
cdk deploy JockularKangaroo-VPC-Prod \
           JockularKangaroo-DatabaseStack-Prod \
           JockularKangaroo-AuthStack-Prod \
           JockularKangaroo-StorageStack-Prod \
           JockularKangaroo-AmplifyStack-Prod
```

Or deploy all at once:

```bash
cdk deploy --all
```

### 3. Initialize Database

After the database stack is deployed:

1. Get the database connection details from CloudFormation outputs
2. Run the schema migrations:

```bash
# Connect to the database using the RDS Data API
npm run db:migrate:prod
```

### 4. Configure Amplify

1. Go to AWS Amplify Console
2. Find your app (JockularKangaroo-Dev or JockularKangaroo-Prod)
3. Go to "Environment variables" and add:

```
RDS_RESOURCE_ARN=<from CloudFormation outputs>
RDS_SECRET_ARN=<from CloudFormation outputs>
NEXTAUTH_URL=https://your-amplify-url.amplifyapp.com
NEXTAUTH_SECRET=<your-generated-secret>
```

### 5. Configure Cognito

1. Go to AWS Cognito Console
2. Find your User Pool (JockularKangaroo-UserPool-[Dev/Prod])
3. Configure app client settings:
   - Add callback URLs
   - Configure identity providers (if using Google)
   - Set up user attributes

### 6. Set Up Initial Admin User

1. Create the first admin user in Cognito:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <your-user-pool-id> \
  --username admin@district.edu \
  --user-attributes Name=email,Value=admin@district.edu \
  --temporary-password TempPass123!
```

2. Sign in and assign Administrator role through the database

### 7. Configure Custom Domain (Optional)

If using a custom domain:

1. Create a Route 53 hosted zone (or use existing)
2. Update Amplify app settings with custom domain
3. Configure SSL certificate

## Post-Deployment Tasks

### 1. Verify Deployment

- [ ] Access the application URL
- [ ] Sign in with admin credentials
- [ ] Create a test student
- [ ] Create a test intervention
- [ ] Upload a test document
- [ ] Verify all navigation items appear

### 2. Configure Settings

1. Sign in as Administrator
2. Go to Settings page
3. Configure:
   - School year
   - District information
   - Notification preferences

### 3. Set Up User Roles

1. Go to Users page
2. Create accounts for:
   - Teachers
   - Counselors
   - Specialists
   - Other staff
3. Assign appropriate roles

### 4. Load Initial Data

1. Add schools to the system
2. Import student records (if migrating)
3. Create intervention program templates

## Monitoring and Maintenance

### CloudWatch Dashboards

Monitor your application through CloudWatch:

- Database performance metrics
- Amplify build and deployment logs
- Cognito authentication events
- S3 storage usage

### Backup Strategy

1. **Database**: Aurora automated backups (7-day retention)
2. **Documents**: S3 versioning enabled
3. **Configuration**: Store in version control

### Security Best Practices

1. Enable MFA for admin accounts
2. Regularly rotate secrets
3. Review IAM permissions
4. Monitor CloudTrail logs
5. Keep dependencies updated

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check RDS_RESOURCE_ARN and RDS_SECRET_ARN
   - Verify security group rules
   - Check VPC connectivity

2. **Authentication Issues**
   - Verify Cognito app client settings
   - Check callback URLs
   - Ensure NEXTAUTH_SECRET is set

3. **File Upload Errors**
   - Verify S3 bucket permissions
   - Check CORS configuration
   - Ensure IAM role has S3 access

### Support

For issues or questions:
- Check AWS CloudWatch logs
- Review Amplify build logs
- Contact your AWS administrator

## Cost Optimization

To minimize AWS costs:

1. Use Aurora Serverless v2 with minimum capacity of 0.5 ACU
2. Enable S3 lifecycle policies for old documents
3. Set up CloudWatch alarms for unusual usage
4. Review and adjust Cognito pricing tier
5. Use Amplify build minutes efficiently

## Updates and Maintenance

### Updating the Application

1. Push changes to GitHub repository
2. Amplify will automatically build and deploy
3. Monitor deployment in Amplify Console

### Database Migrations

When schema changes are needed:

1. Update schema files in `infra/database/schema/`
2. Test migrations in development first
3. Apply to production during maintenance window

### Security Updates

Regularly update dependencies:

```bash
npm audit
npm update
npm audit fix
```

## Rollback Procedures

If issues occur:

1. **Application**: Use Amplify Console to redeploy previous version
2. **Database**: Restore from automated backup
3. **Infrastructure**: Use CDK to roll back stack updates

```bash
# Roll back to previous CDK deployment
cdk deploy --rollback
```