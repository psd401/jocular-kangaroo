# Migration Example: From data-api-adapter to Drizzle ORM

This document shows how to migrate existing database queries from the manual `data-api-adapter` + `snakeToCamel()` approach to Drizzle ORM with automatic casing transformation.

## 🔄 Migration Benefits

- ✅ **Type Safety**: Full TypeScript support with compile-time error checking
- ✅ **Automatic Casing**: No more manual `snakeToCamel()` transformations
- ✅ **Query Builder**: IntelliSense-powered query building
- ✅ **Relation Support**: Built-in foreign key and relationship handling
- ✅ **Performance**: Optimized queries with prepared statements

## 📋 Before & After Examples

### Example 1: Simple User Query

#### BEFORE (Manual approach)
```typescript
// Using data-api-adapter + manual field mapping
import { executeSQL } from '@/lib/db/data-api-adapter';
import { snakeToCamel } from '@/lib/db/field-mapper';

export async function getUserByCognitoSub(cognitoSub: string) {
  const sql = `
    SELECT id, cognito_sub, email, first_name, last_name, created_at, last_sign_in_at
    FROM users
    WHERE cognito_sub = :cognitoSub
  `;

  const params = [
    { name: 'cognitoSub', value: { stringValue: cognitoSub } }
  ];

  const result = await executeSQL(sql, params);

  // Manual transformation required
  return result.map(row => snakeToCamel<{
    id: number;
    cognitoSub: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    lastSignInAt: string;
  }>(row));
}
```

#### AFTER (Drizzle with automatic casing)
```typescript
// Using Drizzle ORM with automatic transformation
import { db } from '@/lib/db/drizzle-client';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function getUserByCognitoSub(cognitoSub: string) {
  // Type-safe query with automatic casing transformation
  return await db
    .select({
      id: users.id,
      cognitoSub: users.cognitoSub,     // Automatic snake_case -> camelCase
      email: users.email,
      firstName: users.firstName,       // Automatic snake_case -> camelCase
      lastName: users.lastName,         // Automatic snake_case -> camelCase
      createdAt: users.createdAt,       // Automatic snake_case -> camelCase
      lastSignInAt: users.lastSignInAt  // Automatic snake_case -> camelCase
    })
    .from(users)
    .where(eq(users.cognitoSub, cognitoSub));
}

// Result is automatically typed as:
// Array<{
//   id: number;
//   cognitoSub: string;
//   email: string;
//   firstName: string | null;
//   lastName: string | null;
//   createdAt: Date;
//   lastSignInAt: Date | null;
// }>
```

### Example 2: Complex Join Query with Relations

#### BEFORE (Manual approach)
```typescript
export async function getUserWithRolesAndTools(userId: number) {
  const sql = `
    SELECT DISTINCT
      u.id, u.cognito_sub, u.first_name, u.last_name,
      r.id as role_id, r.name as role_name,
      t.id as tool_id, t.name as tool_name, t.identifier as tool_identifier
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    LEFT JOIN role_tools rt ON r.id = rt.role_id
    LEFT JOIN tools t ON rt.tool_id = t.id
    WHERE u.id = :userId
  `;

  const params = [{ name: 'userId', value: { longValue: userId } }];
  const result = await executeSQL(sql, params);

  // Complex manual aggregation and transformation needed
  const userMap = new Map();
  result.forEach(row => {
    const transformedRow = snakeToCamel(row);
    // ... complex grouping logic
  });

  return Array.from(userMap.values());
}
```

#### AFTER (Drizzle with relations)
```typescript
import { db } from '@/lib/db/drizzle-client';
import { users, roles, tools } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function getUserWithRolesAndTools(userId: number) {
  // Type-safe query with automatic joins and casing
  return await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      userRoles: {
        with: {
          role: {
            with: {
              roleTools: {
                with: {
                  tool: true
                }
              }
            }
          }
        }
      }
    }
  });
}

// Result is automatically typed with full relation structure!
```

### Example 3: Transaction with Error Handling

#### BEFORE (Manual approach)
```typescript
export async function createUserWithRole(userData: CreateUserData, roleId: number) {
  const client = getRDSClient();
  let transactionId: string | undefined;

  try {
    // Begin transaction
    const beginResult = await client.send(new BeginTransactionCommand({
      resourceArn: process.env.RDS_RESOURCE_ARN!,
      secretArn: process.env.RDS_SECRET_ARN!,
      database: process.env.RDS_DATABASE_NAME!
    }));
    transactionId = beginResult.transactionId;

    // Insert user
    const userSql = `
      INSERT INTO users (cognito_sub, email, first_name, last_name, created_at, updated_at)
      VALUES (:cognitoSub, :email, :firstName, :lastName, NOW(), NOW())
      RETURNING id
    `;

    const userParams = [
      { name: 'cognitoSub', value: { stringValue: userData.cognitoSub } },
      { name: 'email', value: { stringValue: userData.email } },
      { name: 'firstName', value: { stringValue: userData.firstName } },
      { name: 'lastName', value: { stringValue: userData.lastName } }
    ];

    const userResult = await executeSQL(userSql, userParams, transactionId);
    const userId = userResult[0].id;

    // Insert user role
    const roleSql = `
      INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
      VALUES (:userId, :roleId, NOW(), NOW())
    `;

    const roleParams = [
      { name: 'userId', value: { longValue: userId } },
      { name: 'roleId', value: { longValue: roleId } }
    ];

    await executeSQL(roleSql, roleParams, transactionId);

    // Commit transaction
    await client.send(new CommitTransactionCommand({
      resourceArn: process.env.RDS_RESOURCE_ARN!,
      secretArn: process.env.RDS_SECRET_ARN!,
      transactionId
    }));

    return { userId, success: true };

  } catch (error) {
    if (transactionId) {
      await client.send(new RollbackTransactionCommand({
        resourceArn: process.env.RDS_RESOURCE_ARN!,
        secretArn: process.env.RDS_SECRET_ARN!,
        transactionId
      }));
    }
    throw error;
  }
}
```

#### AFTER (Drizzle transactions)
```typescript
import { db } from '@/lib/db/drizzle-client';
import { users, userRoles } from '@/src/db/schema';

export async function createUserWithRole(userData: CreateUserData, roleId: number) {
  return await db.transaction(async (tx) => {
    // Insert user with automatic casing transformation
    const [user] = await tx
      .insert(users)
      .values({
        cognitoSub: userData.cognitoSub,    // Automatic camelCase -> snake_case
        email: userData.email,
        firstName: userData.firstName,      // Automatic camelCase -> snake_case
        lastName: userData.lastName,        // Automatic camelCase -> snake_case
        createdAt: new Date(),             // Automatic camelCase -> snake_case
        updatedAt: new Date()              // Automatic camelCase -> snake_case
      })
      .returning({ id: users.id });

    // Insert user role
    await tx
      .insert(userRoles)
      .values({
        userId: user.id,                   // Automatic camelCase -> snake_case
        roleId,                           // Automatic camelCase -> snake_case
        createdAt: new Date(),            // Automatic camelCase -> snake_case
        updatedAt: new Date()             // Automatic camelCase -> snake_case
      });

    return { userId: user.id, success: true };
  });

  // Transaction automatically rolls back on error!
}
```

## 🔧 Migration Steps

### Step 1: Import Dependencies
Replace data-api-adapter imports with Drizzle:
```typescript
// Remove these
import { executeSQL } from '@/lib/db/data-api-adapter';
import { snakeToCamel } from '@/lib/db/field-mapper';

// Add these
import { db } from '@/lib/db/drizzle-client';
import { users, roles, tools } from '@/src/db/schema';
import { eq, and, or, like, desc, asc } from 'drizzle-orm';
```

### Step 2: Replace SQL Strings with Query Builder
```typescript
// Before: Raw SQL
const sql = "SELECT * FROM users WHERE email = :email";

// After: Query builder
const result = await db.select().from(users).where(eq(users.email, email));
```

### Step 3: Remove Manual Field Transformations
```typescript
// Before: Manual transformation
const result = await executeSQL(sql, params);
const transformed = result.map(row => snakeToCamel<UserType>(row));

// After: Automatic transformation
const result = await db.select().from(users).where(eq(users.id, id));
// Result is automatically camelCase! ✨
```

### Step 4: Use Type-Safe Parameters
```typescript
// Before: Manual parameter binding
const params = [
  { name: 'email', value: { stringValue: email } },
  { name: 'isActive', value: { booleanValue: true } }
];

// After: Type-safe parameters
const result = await db
  .select()
  .from(users)
  .where(and(
    eq(users.email, email),      // Type-safe
    eq(users.isActive, true)     // Type-safe
  ));
```

## 📊 Performance Comparison

| Feature | data-api-adapter | Drizzle ORM |
|---------|------------------|-------------|
| **Type Safety** | ❌ Runtime only | ✅ Compile-time |
| **Field Mapping** | ❌ Manual | ✅ Automatic |
| **Query Building** | ❌ String concatenation | ✅ Type-safe builder |
| **IntelliSense** | ❌ Limited | ✅ Full support |
| **Error Handling** | ❌ Runtime SQL errors | ✅ Compile-time validation |
| **Relations** | ❌ Manual joins | ✅ Automatic |
| **Transactions** | ❌ Complex | ✅ Simple |

## 🎯 Next Steps

1. Start with simple SELECT queries
2. Migrate INSERT/UPDATE operations
3. Convert complex joins to relations
4. Update transaction handling
5. Remove unused data-api-adapter functions
6. Clean up field-mapper imports

## 🚀 Pro Tips

1. **Use `db.query` for relation-heavy queries**
2. **Use `db.select()` for custom projections**
3. **Leverage TypeScript inference - don't over-specify types**
4. **Use prepared statements for repeated queries**
5. **Test migration incrementally with existing tests**