# Authentication Setup Guide

## Current Status
✅ Database Stack - Deployed
✅ Storage Stack - Deployed
❌ Auth Stack - Not yet deployed (requires Google OAuth setup)

## To Deploy Auth Stack

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (Web application)
3. Add these authorized redirect URIs:
   - `https://jocular-kangaroo-dev.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
4. Save the Client ID and Client Secret

### 2. Store Client Secret in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name jocular-kangaroo-dev-google-oauth \
  --secret-string '{"clientSecret":"YOUR_GOOGLE_CLIENT_SECRET"}'
```

### 3. Deploy Auth Stack

```bash
cd infra
cdk deploy JockularKangaroo-AuthStack-Dev \
  --parameters GoogleClientId=YOUR_GOOGLE_CLIENT_ID \
  --require-approval never
```

### 4. Update .env.local

After deployment, update your `.env.local` with the Auth stack outputs:
- NEXT_PUBLIC_USER_POOL_ID
- NEXT_PUBLIC_USER_POOL_CLIENT_ID
- AUTH_COGNITO_CLIENT_ID (same as above)
- AUTH_COGNITO_ISSUER (format: https://cognito-idp.us-east-1.amazonaws.com/USER_POOL_ID)

## Running Without Auth

If you want to test the application without authentication:

1. The app is currently configured to require auth for most routes
2. You can temporarily comment out the auth checks in:
   - `app/layout.tsx` - SessionProvider wrapper
   - `middleware.ts` - Auth middleware
   - Individual page components that check for authentication

However, note that many features (user management, role-based access) depend on authentication being configured.