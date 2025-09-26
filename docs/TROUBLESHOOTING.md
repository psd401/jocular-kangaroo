# Troubleshooting Guide

Common issues and solutions for Jocular Kangaroo development and deployment.

## Table of Contents
- [Database Issues](#database-issues)
- [Drizzle ORM Issues](#drizzle-orm-issues)
- [Authentication Issues](#authentication-issues)
- [Deployment Issues](#deployment-issues)
- [Development Environment](#development-environment)
- [Performance Issues](#performance-issues)

## Database Issues

### Connection Errors

#### Issue: "Unable to connect to database"
```
Error: Connect ETIMEDOUT
```

**Possible Causes:**
1. RDS Data API not enabled on cluster
2. Incorrect environment variables
3. AWS credentials not configured
4. VPC/security group misconfiguration

**Solutions:**

1. **Verify RDS Data API is enabled:**
   ```bash
   aws rds describe-db-clusters \
     --db-cluster-identifier jocular-kangaroo-dev \
     --query 'DBClusters[0].EnableHttpEndpoint'
   ```
   Should return `true`. If not:
   ```bash
   aws rds modify-db-cluster \
     --db-cluster-identifier jocular-kangaroo-dev \
     --enable-http-endpoint
   ```

2. **Check environment variables:**
   ```bash
   # Verify in .env.local
   RDS_RESOURCE_ARN=arn:aws:rds:us-east-1:123456789012:cluster:jocular-kangaroo-dev
   RDS_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:...
   RDS_DATABASE_NAME=jocular_kangaroo
   AWS_REGION=us-east-1
   ```

3. **Test AWS credentials:**
   ```bash
   aws sts get-caller-identity
   ```
   Should return your AWS account details.

4. **Verify IAM permissions:**
   Your IAM user/role needs:
   - `rds-data:ExecuteStatement`
   - `rds-data:BatchExecuteStatement`
   - `secretsmanager:GetSecretValue`

---

#### Issue: "Access denied for user"
```
Error: User does not have permission to access secret
```

**Solution:**

1. **Check secret permissions:**
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id <your-secret-arn>
   ```
   If this fails, your IAM role lacks permissions.

2. **Add IAM policy:**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "secretsmanager:GetSecretValue"
         ],
         "Resource": "arn:aws:secretsmanager:*:*:secret:*"
       }
     ]
   }
   ```

---

### Query Errors

#### Issue: "Column does not exist"
```
Error: column "firstName" does not exist
```

**Cause:** Using camelCase directly in SQL without Drizzle transformation.

**Solution:**
```typescript
// ❌ Wrong - raw SQL with camelCase
await db.execute(sql`SELECT firstName FROM users`)

// ✅ Correct - use Drizzle schema
const users = await db.select({ firstName: users.firstName }).from(users)
```

---

#### Issue: "Relation does not exist"
```
Error: relation "new_table" does not exist
```

**Cause:** Migration not applied to database.

**Solution:**

1. **Check if migration was generated:**
   ```bash
   ls -la drizzle/
   ```

2. **Apply pending migrations:**
   ```bash
   npm run db:migrate
   ```

3. **Verify table exists:**
   ```bash
   npm run db:studio
   # Check if table appears in Drizzle Studio
   ```

---

## Drizzle ORM Issues

### Type Errors

#### Issue: "Property does not exist on type"
```typescript
// Error: Property 'firstName' does not exist on type 'User'
const name = user.firstName
```

**Cause:** Schema types are out of sync with database.

**Solution:**

1. **Pull latest schema:**
   ```bash
   npm run db:pull
   ```

2. **Regenerate types:**
   ```bash
   npm run db:generate
   ```

3. **Restart TypeScript server:**
   - VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"

---

#### Issue: "Type 'undefined' is not assignable to..."
```typescript
const user = await db.query.users.findFirst(...)
console.log(user.email)  // Error: Object is possibly 'undefined'
```

**Cause:** `findFirst` returns `undefined` if no match found.

**Solution:**
```typescript
// ✅ Check for undefined
const user = await db.query.users.findFirst(...)
if (!user) {
  throw new Error("User not found")
}
console.log(user.email)  // Now TypeScript knows it's defined

// Or use optional chaining
console.log(user?.email)
```

---

### Migration Issues

#### Issue: "Migration failed - duplicate key"
```
Error: duplicate key value violates unique constraint
```

**Cause:** Migration tries to insert data that already exists.

**Solution:**

1. **Use `ON CONFLICT` in migration:**
   ```sql
   INSERT INTO roles (name, description)
   VALUES ('admin', 'Administrator')
   ON CONFLICT (name) DO NOTHING;
   ```

2. **Or check before insert:**
   ```sql
   INSERT INTO roles (name, description)
   SELECT 'admin', 'Administrator'
   WHERE NOT EXISTS (
     SELECT 1 FROM roles WHERE name = 'admin'
   );
   ```

---

#### Issue: "Migration runs multiple times"
```
Error: table "users" already exists
```

**Cause:** Migration tracking table corrupted or out of sync.

**Solution:**

1. **Check tracking table:**
   ```bash
   npm run db:studio
   # Look at drizzle_migrations table
   ```

2. **Verify applied migrations:**
   ```sql
   SELECT * FROM drizzle_migrations ORDER BY created_at;
   ```

3. **If migration was partially applied:**
   - Manually fix database to match migration end state
   - Add entry to `drizzle_migrations` table with migration hash

---

### Casing Issues

#### Issue: "snake_case in results instead of camelCase"
```typescript
const user = await db.select().from(users)
console.log(user[0].first_name)  // snake_case!
```

**Cause:** Casing transformation not configured correctly.

**Solution:**

1. **Check drizzle.config.ts:**
   ```typescript
   export default defineConfig({
     casing: "snake_case",  // ✅ Must be set
     // ...
   })
   ```

2. **Check drizzle-client.ts:**
   ```typescript
   export const db = drizzle({
     client: rdsClient,
     casing: "snake_case",  // ✅ Must match config
     // ...
   })
   ```

3. **Test casing transformation:**
   ```bash
   npm run db:test-casing
   ```

---

## Authentication Issues

### Session Errors

#### Issue: "Unauthorized - No session"
```
Error: Authentication required
```

**Possible Causes:**
1. User not logged in
2. Session expired
3. Cookie not being sent
4. NextAuth misconfiguration

**Solutions:**

1. **Check session in component:**
   ```typescript
   import { getServerSession } from "@/lib/auth/server-session"

   const session = await getServerSession()
   if (!session) {
     redirect('/sign-in')
   }
   ```

2. **Verify NextAuth configuration:**
   ```bash
   # Check .env.local
   AUTH_URL=http://localhost:3000
   AUTH_SECRET=<your-secret>
   AUTH_COGNITO_CLIENT_ID=<cognito-client-id>
   AUTH_COGNITO_CLIENT_SECRET=<cognito-client-secret>
   AUTH_COGNITO_ISSUER=<cognito-issuer>
   ```

3. **Check Cognito user pool:**
   ```bash
   aws cognito-idp list-users \
     --user-pool-id <your-user-pool-id>
   ```

---

#### Issue: "Insufficient permissions"
```
Error: Access denied to resource
```

**Cause:** User lacks required role or tool access.

**Solution:**

1. **Check user roles:**
   ```typescript
   import { hasToolAccess } from "@/lib/auth/permissions"

   const hasAccess = await hasToolAccess(session.user.sub, "interventions")
   if (!hasAccess) {
     throw new Error("Access denied")
   }
   ```

2. **Verify role assignment in database:**
   ```bash
   npm run db:studio
   # Check user_roles table
   ```

3. **Grant role via admin UI or SQL:**
   ```sql
   INSERT INTO user_roles (user_id, role_id)
   VALUES (
     (SELECT id FROM users WHERE cognito_sub = 'user-sub'),
     (SELECT id FROM roles WHERE name = 'teacher')
   );
   ```

---

## Deployment Issues

### CDK Deployment Errors

#### Issue: "Stack already exists"
```
Error: Stack JocularKangaroo-DatabaseStack-Dev already exists
```

**Solution:**
```bash
# Update existing stack instead
cd infra
npx cdk deploy JocularKangaroo-DatabaseStack-Dev
```

---

#### Issue: "Parameter validation failed"
```
Error: Missing required parameter: GoogleClientId
```

**Solution:**
```bash
# Pass required parameters
npx cdk deploy JocularKangaroo-AuthStack-Dev \
  --parameters GoogleClientId=your-client-id
```

---

#### Issue: "Resource limit exceeded"
```
Error: Cannot exceed quota for PoliciesPerRole
```

**Cause:** IAM role has too many inline policies.

**Solution:**
1. Consolidate policies in CDK:
   ```typescript
   // ❌ Multiple policies
   lambda.addToRolePolicy(policy1)
   lambda.addToRolePolicy(policy2)
   lambda.addToRolePolicy(policy3)

   // ✅ Single consolidated policy
   lambda.addToRolePolicy(new PolicyStatement({
     actions: [...actions1, ...actions2, ...actions3],
     resources: ['*']
   }))
   ```

---

### Migration Lambda Errors

See [Database Migrations Guide](./DATABASE_MIGRATIONS.md#troubleshooting) for comprehensive Lambda troubleshooting.

**Quick checks:**

1. **View CloudWatch logs:**
   ```bash
   aws logs tail /aws/lambda/JocularKangaroo-DatabaseMigration-Dev --follow
   ```

2. **Check Lambda IAM permissions:**
   - `rds-data:ExecuteStatement`
   - `secretsmanager:GetSecretValue`

3. **Verify migrations are bundled:**
   ```bash
   # In Lambda console, check if /drizzle folder exists
   ```

---

## Development Environment

### Build Errors

#### Issue: "Module not found"
```
Error: Cannot find module '@/lib/db/drizzle-client'
```

**Solution:**

1. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

2. **Verify path alias in tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```

3. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

---

#### Issue: "Type error in production build"
```
Error: Type error: Property 'xyz' does not exist
```

**Solution:**

1. **Run typecheck locally:**
   ```bash
   npm run typecheck
   ```

2. **Fix all type errors before deploying.**

3. **Ensure all imports use type-only when appropriate:**
   ```typescript
   import type { User } from "@/src/db/schema"  // ✅ Type-only
   import { User } from "@/src/db/schema"       // ❌ Runtime import
   ```

---

### Hot Reload Not Working

#### Issue: Changes not reflecting in browser

**Solution:**

1. **Restart dev server:**
   ```bash
   # Ctrl+C to stop
   npm run dev
   ```

2. **Clear browser cache:**
   - Chrome: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

3. **Check for errors in terminal** - build might be failing silently.

4. **Disable browser extensions** that might interfere with HMR.

---

## Performance Issues

### Slow Queries

#### Issue: Queries taking >1 second

**Diagnosis:**

1. **Enable query logging:**
   ```typescript
   // In drizzle-client.ts (development only)
   export const db = drizzle({
     // ...
     logger: true  // Log all queries
   })
   ```

2. **Check for N+1 queries:**
   ```typescript
   // ❌ N+1 problem - queries in loop
   for (const student of students) {
     const interventions = await db.query.interventions.findMany({
       where: eq(interventions.studentId, student.id)
     })
   }

   // ✅ Single query with join
   const studentsWithInterventions = await db.query.students.findMany({
     with: { interventions: true }
   })
   ```

3. **Add database indexes:**
   ```typescript
   export const interventions = pgTable('interventions', {
     // ...
   }, (table) => ({
     studentIdx: index('interventions_student_id_idx').on(table.studentId)
   }))
   ```

---

### High Memory Usage

#### Issue: Next.js development server using >2GB RAM

**Solution:**

1. **Limit concurrent builds:**
   ```json
   // next.config.js
   module.exports = {
     experimental: {
       workerThreads: false,
       cpus: 1
     }
   }
   ```

2. **Clear build cache:**
   ```bash
   rm -rf .next
   ```

3. **Increase Node.js memory limit:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run dev
   ```

---

## Getting Help

If you encounter an issue not covered here:

1. **Check logs:**
   - Browser console (F12)
   - Next.js terminal output
   - CloudWatch logs (production)

2. **Search existing issues:**
   - [GitHub Issues](https://github.com/psd401/jocular-kangaroo/issues)
   - Drizzle ORM GitHub
   - Next.js GitHub

3. **Create a new issue:**
   - Include error messages
   - Provide reproduction steps
   - Attach relevant logs

4. **Contact the team:**
   - Internal Slack channel
   - Email development team

---

## Additional Resources

- **[Database Documentation](./DATABASE.md)** - Comprehensive database guide
- **[Database Migrations](./DATABASE_MIGRATIONS.md)** - Migration procedures
- **[Developer Guide](../DEVELOPER_GUIDE.md)** - Development workflows
- **[Deployment Guide](./DEPLOYMENT.md)** - Deployment procedures
- **[Drizzle ORM Docs](https://orm.drizzle.team)** - Official documentation