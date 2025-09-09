# Environment Variables Documentation

This document provides a comprehensive guide to all environment variables required for the Jockular Kangaroo application to function properly in AWS Amplify deployment.

## Required Environment Variables

### Authentication Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `AUTH_URL` | The full URL where your app is hosted | `https://dev.yourdomain.com` | ✅ |
| `AUTH_SECRET` | Secret for NextAuth.js session encryption | Generate with: `openssl rand -base64 32` | ✅ |
| `AUTH_COGNITO_CLIENT_ID` | AWS Cognito client ID | From Auth stack outputs | ✅ |
| `AUTH_COGNITO_ISSUER` | AWS Cognito issuer URL | `https://cognito-idp.us-east-1.amazonaws.com/<pool-id>` | ✅ |

### Public Authentication Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito user pool ID (client-side) | From Auth stack outputs | ✅ |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito client ID (client-side) | From Auth stack outputs | ✅ |
| `NEXT_PUBLIC_COGNITO_DOMAIN` | Cognito domain for OAuth | `jockularkangaroo-dev.auth.us-east-1.amazoncognito.com` | ✅ |
| `NEXT_PUBLIC_AWS_REGION` | AWS region for client-side operations | `us-east-1` | ✅ |

### Database Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `RDS_RESOURCE_ARN` | ARN of the RDS Aurora Serverless cluster | `arn:aws:rds:us-east-1:xxx:cluster:jockularkangaroo-xxx` | ✅ |
| `RDS_SECRET_ARN` | ARN of the database credentials secret | `arn:aws:secretsmanager:us-east-1:xxx:secret:xxx` | ✅ |
| `SQL_LOGGING` | Enable/disable SQL query logging | `false` for production, `true` for debugging | ❌ |

### AWS SDK Variables

> **Important**: AWS Amplify restricts environment variables with the `AWS_` prefix in the console. However, Amplify automatically provides `AWS_REGION` and `AWS_DEFAULT_REGION` at runtime. You only need to set `NEXT_PUBLIC_AWS_REGION` as a fallback.

## Setting Environment Variables in AWS Amplify

### Method 1: AWS Amplify Console (Recommended)

1. Navigate to your AWS Amplify app in the AWS Console
2. Select your app and go to "Environment variables" in the left sidebar
3. Click "Manage variables"
4. Add each variable with its corresponding value
5. Save the changes
6. Redeploy your app for changes to take effect

### Method 2: AWS CLI

```bash
aws amplify update-app \
  --app-id <your-app-id> \
  --environment-variables \
    AUTH_URL=https://dev.yourdomain.com \
    AUTH_SECRET=<your-generated-secret> \
    AUTH_COGNITO_CLIENT_ID=<your-cognito-client-id> \
    AUTH_COGNITO_ISSUER=https://cognito-idp.us-east-1.amazonaws.com/<pool-id> \
    NEXT_PUBLIC_COGNITO_USER_POOL_ID=<your-pool-id> \
    NEXT_PUBLIC_COGNITO_CLIENT_ID=<your-client-id> \
    NEXT_PUBLIC_COGNITO_DOMAIN=<your-cognito-domain> \
    NEXT_PUBLIC_AWS_REGION=us-east-1 \
    RDS_RESOURCE_ARN=<your-rds-arn> \
    RDS_SECRET_ARN=<your-secret-arn> \
    SQL_LOGGING=false
```

## Important Notes

### Build Process
- The `amplify.yml` and CDK buildSpec are configured to write environment variables to a `.env` file during build
- This ensures runtime access to these variables in the Next.js application
- The pattern `'^AUTH_|^NEXT_PUBLIC_|^RDS_|^SQL_'` captures all required variables
- AWS-prefixed variables cannot be set in the Amplify console but are provided automatically by Amplify at runtime

### AWS Credentials
- AWS Amplify WEB_COMPUTE platform requires **two IAM roles**:
  1. **Service Role**: For build/deploy operations
  2. **SSR Compute Role**: For runtime AWS access (CRITICAL for database connectivity)
- The application uses the AWS SDK credential provider chain to authenticate
- The SSR Compute role must have permissions for:
  - RDS Data API (`rds-data:*`)
  - Secrets Manager (`secretsmanager:GetSecretValue`)
- Without the SSR Compute role, you'll get "Could not load credentials from any providers" errors

### Region Configuration
- The AWS SDK needs region configuration to make API calls
- AWS Amplify automatically provides `AWS_REGION` and `AWS_DEFAULT_REGION` at runtime
- Set `NEXT_PUBLIC_AWS_REGION` in the console as a fallback
- The application checks these in order: `AWS_REGION` (Amplify) → `AWS_DEFAULT_REGION` (Amplify) → `NEXT_PUBLIC_AWS_REGION` (User)

## Troubleshooting

### Common Issues

1. **500 Error on API Routes**
   - Check CloudWatch logs for detailed error messages
   - Verify all required environment variables are set
   - Use the health check endpoint to validate configuration

2. **"Missing required environment variables" Error**
   - Check the specific variables mentioned in the error
   - Ensure variables are properly set in Amplify console
   - Redeploy after adding/updating variables

3. **AWS Credentials Error: "Could not load credentials from any providers"**
   - **Most likely cause**: Missing SSR Compute role
   - Go to Amplify Console → App settings → IAM roles
   - Ensure an SSR Compute role is attached (not just a service role)
   - The SSR Compute role needs RDS Data API and Secrets Manager permissions
   - See `/docs/FIX_SSR_COMPUTE_ROLE.md` for detailed fix instructions

### Health Check
Use the `/api/health` endpoint to verify:
- Environment variable configuration
- Database connectivity
- AWS credentials chain

## Security Best Practices

1. **Never commit environment variables to version control**
2. **Use AWS Secrets Manager for sensitive values**
3. **Rotate AUTH_SECRET periodically**
4. **Use least-privilege IAM policies**
5. **Enable SQL_LOGGING only for debugging, never in production**

## Getting Stack Outputs

To get the required values from your CDK deployment:

```bash
# List all stacks
aws cloudformation list-stacks

# Get specific stack outputs
aws cloudformation describe-stacks \
  --stack-name JockularKangaroo-DatabaseStack-Dev \
  --query 'Stacks[0].Outputs'

aws cloudformation describe-stacks \
  --stack-name JockularKangaroo-AuthStack-Dev \
  --query 'Stacks[0].Outputs'
```

## Additional Resources

- [AWS Amplify Environment Variables](https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html)
- [NextAuth.js Configuration](https://next-auth.js.org/configuration/options)
- [AWS RDS Data API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html)