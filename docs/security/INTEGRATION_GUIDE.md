# Security Integration Guide

## Files Modified

| File | Change |
|------|--------|
| `actions/db/students-actions.ts` | Access filters, audit logging, rate limits, pagination, fixed `any[]` types |
| `actions/db/interventions-actions.ts` | Access filters, audit logging, rate limits, pagination, fixed `any[]` types |
| `actions/db/schools-actions.ts` | School list filtered by user's assigned schools |
| `actions/db/get-current-user-action.ts` | Fixed default role: `"student"` (non-existent) to `"Teacher"` |
| `middleware.ts` | Removed `/api/health` from public paths |
| `app/api/health/route.ts` | Admin-only auth, sanitized production output |
| `app/api/db/test-connection/route.ts` | Admin-only auth, sanitized error messages |
| `infra/database/lambda/index.ts` | Added migrations 011-013 to `MIGRATION_FILES` |

## Adding Security to a New Server Action

### Step 1: Import security functions

```typescript
import {
  buildSecurityContext,
  buildStudentAccessFilter,    // or buildInterventionAccessFilter
  logDataAccess,
  logDataAccessBatch,
  checkActionRateLimit,
} from '@/lib/security';
```

### Step 2: Add rate limiting (top of function)

```typescript
const userId = currentUser.data.user.id;
const roleNames = currentUser.data.roles.map(r => r.name);

if (!checkActionRateLimit(userId, 'myActionName')) {
  return { isSuccess: false, message: 'Rate limit exceeded. Please try again later.' };
}
```

### Step 3: Build security context and inject filter

```typescript
const secCtx = await buildSecurityContext(userId, roleNames);
const accessFilter = buildStudentAccessFilter(secCtx, paramIndex);
query += accessFilter.sql;
parameters.push(...accessFilter.parameters);
paramIndex = accessFilter.nextParamIndex;
```

### Step 4: Add audit logging

```typescript
// For list operations:
logDataAccessBatch(
  { userId, action: 'list', entityType: 'student' },
  results.map(r => r.id),
  results.length
);

// For single-record operations:
logDataAccess({ userId, action: 'view', entityType: 'student', entityId: id });
```

### Step 5: For write operations, verify access first

```typescript
const secCtx = await buildSecurityContext(userId, roleNames);
const verifyFilter = buildStudentAccessFilter(secCtx, 2);
const verifyResult = await executeSQL(
  `SELECT id FROM students s WHERE s.id = $1${verifyFilter.sql}`,
  [{ name: '1', value: { longValue: id } }, ...verifyFilter.parameters]
);
if (!verifyResult || verifyResult.length === 0) {
  return { isSuccess: false, message: 'Student not found or access denied' };
}
```

## Porting to a New Project

1. Copy the entire `/lib/security/` directory
2. Edit `access-control-config.ts` with your project's roles
3. Create the 3 database migration files (011-013)
4. Update your server actions following the pattern above

The only project-specific file is `access-control-config.ts`. Everything else is generic.
