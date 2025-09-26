# Database Architecture

Comprehensive database documentation for Jocular Kangaroo's Drizzle ORM implementation.

## Table of Contents
- [Overview](#overview)
- [Schema Organization](#schema-organization)
- [Query Patterns](#query-patterns)
- [Automatic Casing](#automatic-casing)
- [Transactions](#transactions)
- [Performance](#performance)
- [Security](#security)

## Overview

### Technology Stack
- **ORM**: Drizzle ORM v0.44.5 - Type-safe database operations
- **Database**: AWS RDS Aurora Serverless v2 (PostgreSQL 15)
- **Connection**: AWS RDS Data API - Serverless, no connection pooling needed
- **Migrations**: Drizzle Kit - SQL-based migrations with TypeScript schema
- **Casing**: Automatic snake_case ↔ camelCase transformation

### Why Drizzle ORM?

**Previous Approach** (Direct RDS Data API):
```typescript
// ❌ Manual SQL with manual type mapping
const result = await executeSQL(
  "SELECT first_name, last_name, created_at FROM users WHERE id = :id",
  [{ name: "id", value: { longValue: userId } }]
)
// Manual transformation needed
const user = {
  firstName: result.records[0][0].stringValue,
  lastName: result.records[0][1].stringValue,
  createdAt: new Date(result.records[0][2].stringValue)
}
```

**Current Approach** (Drizzle ORM):
```typescript
// ✅ Type-safe with automatic mapping
const user = await db.query.users.findFirst({
  where: eq(users.id, userId)
})  // Fully typed, automatic camelCase, no manual transformation!
```

### Key Benefits
- ✅ **Type Safety**: Full TypeScript inference, zero `any` types
- ✅ **Automatic Casing**: snake_case database ↔ camelCase TypeScript
- ✅ **Relational Queries**: Join tables with simple syntax
- ✅ **SQL-based Migrations**: Review SQL before applying
- ✅ **Zero Runtime Overhead**: Compiles to efficient SQL
- ✅ **IDE Support**: Autocomplete and inline documentation

## Schema Organization

### File Structure
```
/src/db/
├── schema.ts           # Main schema definitions
├── relations.ts        # Relationship definitions (if separated)
└── test-casing.ts      # Casing transformation tests

/drizzle/
├── 0001_initial.sql    # Migration files (immutable)
├── 0002_users.sql
├── ...
└── meta/               # Drizzle metadata
    ├── _journal.json
    └── 0001_snapshot.json
```

### Core Tables

#### Users & Authentication
```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  cognitoSub: varchar('cognito_sub', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastSignInAt: timestamp('last_sign_in_at')
})
```

**Database columns**: `cognito_sub`, `first_name`, `created_at` (snake_case)
**TypeScript properties**: `cognitoSub`, `firstName`, `createdAt` (camelCase)

#### Roles & Permissions
```typescript
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isSystem: boolean('is_system').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  roleId: integer('role_id').references(() => roles.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})
```

#### Students
```typescript
export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  sisId: varchar('sis_id', { length: 100 }).unique().notNull(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  gradeLevel: gradeLevelEnum('grade_level').notNull(),
  status: studentStatusEnum('status').default('active').notNull(),
  schoolId: integer('school_id').references(() => schools.id),
  createdAt: timestamp('created_at').defaultNow().notNull()
})
```

#### Interventions
```typescript
export const interventions = pgTable('interventions', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id).notNull(),
  type: interventionTypeEnum('type').notNull(),
  status: interventionStatusEnum('status').default('planned').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})
```

### Enums

PostgreSQL enums provide type safety at the database level:

```typescript
export const interventionTypeEnum = pgEnum('intervention_type', [
  'academic', 'behavioral', 'social_emotional', 'attendance', 'health', 'other'
])

export const interventionStatusEnum = pgEnum('intervention_status', [
  'planned', 'in_progress', 'completed', 'discontinued', 'on_hold'
])

export const studentStatusEnum = pgEnum('student_status', [
  'active', 'inactive', 'transferred', 'graduated'
])
```

## Query Patterns

### Basic Queries

#### Select All
```typescript
import { db } from "@/lib/db/drizzle-client"
import { users } from "@/src/db/schema"

const allUsers = await db.select().from(users)
```

#### Select Specific Columns
```typescript
import { sql } from "drizzle-orm"

const userNames = await db
  .select({
    id: users.id,
    fullName: sql`${users.firstName} || ' ' || ${users.lastName}`,
    email: users.email
  })
  .from(users)
```

#### Where Conditions
```typescript
import { eq, and, or, gte, like } from "drizzle-orm"

// Single condition
const user = await db
  .select()
  .from(users)
  .where(eq(users.cognitoSub, session.user.sub))

// Multiple conditions (AND)
const activeStudents = await db
  .select()
  .from(students)
  .where(
    and(
      eq(students.status, 'active'),
      eq(students.gradeLevel, '5')
    )
  )

// OR conditions
const recentOrActive = await db
  .select()
  .from(interventions)
  .where(
    or(
      eq(interventions.status, 'in_progress'),
      gte(interventions.createdAt, new Date('2024-01-01'))
    )
  )

// LIKE patterns
const searchUsers = await db
  .select()
  .from(users)
  .where(like(users.email, '%@example.com'))
```

### Relational Queries

Drizzle's relational query API is more intuitive than joins:

```typescript
// Define relations first (in src/db/schema.ts or relations.ts)
import { relations } from "drizzle-orm"

export const usersRelations = relations(users, ({ many, one }) => ({
  userRoles: many(userRoles),
  createdInterventions: many(interventions)
}))

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id]
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id]
  })
}))

// Query with relations
const userWithRoles = await db.query.users.findFirst({
  where: eq(users.cognitoSub, session.user.sub),
  with: {
    userRoles: {
      with: {
        role: true  // Include full role details
      }
    }
  }
})

// Result type is fully inferred:
// {
//   id: number
//   cognitoSub: string
//   email: string
//   ...
//   userRoles: {
//     id: number
//     userId: number
//     roleId: number
//     role: {
//       id: number
//       name: string
//       description: string | null
//       ...
//     }
//   }[]
// }
```

#### Deep Nesting
```typescript
const studentWithEverything = await db.query.students.findFirst({
  where: eq(students.id, studentId),
  with: {
    school: true,
    interventions: {
      with: {
        creator: {
          columns: { id: true, firstName: true, lastName: true }
        },
        sessions: {
          orderBy: (sessions, { desc }) => [desc(sessions.sessionDate)]
        }
      }
    }
  }
})
```

### Joins (Alternative to Relational API)

Traditional SQL-style joins are also supported:

```typescript
import { eq } from "drizzle-orm"

const result = await db
  .select({
    userName: users.firstName,
    roleName: roles.name
  })
  .from(users)
  .leftJoin(userRoles, eq(users.id, userRoles.userId))
  .leftJoin(roles, eq(userRoles.roleId, roles.id))
  .where(eq(users.cognitoSub, session.user.sub))
```

### Aggregations

```typescript
import { sql } from "drizzle-orm"
import { count, sum, avg, min, max } from "drizzle-orm"

// Count rows
const userCount = await db
  .select({ count: count() })
  .from(users)

// Group by
const interventionsByType = await db
  .select({
    type: interventions.type,
    count: count()
  })
  .from(interventions)
  .groupBy(interventions.type)

// Complex aggregation
const studentStats = await db
  .select({
    gradeLevel: students.gradeLevel,
    totalStudents: count(),
    activeInterventions: sum(
      sql`CASE WHEN ${interventions.status} = 'in_progress' THEN 1 ELSE 0 END`
    )
  })
  .from(students)
  .leftJoin(interventions, eq(students.id, interventions.studentId))
  .groupBy(students.gradeLevel)
```

### Insert

```typescript
// Single insert
const newUser = await db
  .insert(users)
  .values({
    cognitoSub: session.user.sub,
    email: session.user.email,
    firstName: "John",
    lastName: "Doe"
  })
  .returning()  // Returns inserted row with generated ID

// Multiple inserts
const newStudents = await db
  .insert(students)
  .values([
    { sisId: "S001", firstName: "Alice", lastName: "Smith", gradeLevel: "5" },
    { sisId: "S002", firstName: "Bob", lastName: "Jones", gradeLevel: "6" }
  ])
  .returning()
```

### Update

```typescript
// Update with where
const updated = await db
  .update(users)
  .set({
    firstName: "Jane",
    updatedAt: new Date()
  })
  .where(eq(users.id, userId))
  .returning()

// Conditional updates
const activated = await db
  .update(students)
  .set({ status: 'active' })
  .where(eq(students.id, studentId))
```

### Delete

```typescript
// Delete with where
const deleted = await db
  .delete(interventions)
  .where(eq(interventions.id, interventionId))
  .returning()

// Delete with conditions
const cleaned = await db
  .delete(sessions)
  .where(
    and(
      eq(sessions.interventionId, interventionId),
      sql`${sessions.sessionDate} < NOW() - INTERVAL '2 years'`
    )
  )
```

## Automatic Casing

Drizzle automatically transforms between database and TypeScript naming conventions.

### Configuration

**drizzle.config.ts**:
```typescript
export default defineConfig({
  casing: "snake_case",  // 🎯 Enable automatic transformation
  // ...
})
```

**drizzle-client.ts**:
```typescript
import { drizzle } from "drizzle-orm/aws-data-api/pg"
import { RDSDataClient } from "@aws-sdk/client-rds-data"

export const db = drizzle({
  client: rdsClient,
  casing: "snake_case",  // 🎯 Must match config
  // ...
})
```

### How It Works

| TypeScript Code | Generated SQL |
|----------------|---------------|
| `users.firstName` | `users.first_name` |
| `users.cognitoSub` | `users.cognito_sub` |
| `users.createdAt` | `users.created_at` |
| `students.sisId` | `students.sis_id` |
| `interventions.startDate` | `interventions.start_date` |

### Schema Definition

Always define columns in snake_case:

```typescript
// ✅ Correct
export const users = pgTable('users', {
  firstName: varchar('first_name', { length: 255 }),  // snake_case column name
  cognitoSub: varchar('cognito_sub', { length: 255 })
})

// ❌ Wrong - will cause mismatch
export const users = pgTable('users', {
  firstName: varchar('firstName', { length: 255 }),  // camelCase won't transform
})
```

### Query Usage

Always use camelCase in queries:

```typescript
// ✅ Correct - use camelCase
const user = await db.query.users.findFirst({
  where: eq(users.firstName, "John")  // Transforms to first_name
})

console.log(user.firstName)  // camelCase result
console.log(user.createdAt)  // camelCase result

// ❌ Wrong - don't use snake_case in code
const user = await db.query.users.findFirst({
  where: eq(users.first_name, "John")  // Type error!
})
```

### Testing Casing

Run the test script to verify transformation:

```bash
npm run db:test-casing
```

This queries the database and logs results to confirm casing works correctly.

## Transactions

Use transactions for operations that must succeed or fail together.

### Basic Transaction

```typescript
await db.transaction(async (tx) => {
  // Create intervention
  const intervention = await tx
    .insert(interventions)
    .values({
      studentId,
      type: 'academic',
      status: 'planned',
      startDate: new Date(),
      title: 'Academic Support'
    })
    .returning()

  // Create first session
  await tx
    .insert(interventionSessions)
    .values({
      interventionId: intervention[0].id,
      sessionDate: new Date(),
      progressNotes: "Initial session",
      recordedBy: userId
    })

  // Update student status
  await tx
    .update(students)
    .set({ status: 'active' })
    .where(eq(students.id, studentId))

  // If any query fails, all changes are rolled back
})
```

### Error Handling in Transactions

```typescript
try {
  await db.transaction(async (tx) => {
    const user = await tx
      .insert(users)
      .values({ cognitoSub, email })
      .returning()

    await tx
      .insert(userRoles)
      .values({ userId: user[0].id, roleId: defaultRoleId })

    // If this throws, entire transaction rolls back
    if (!user[0].email.includes('@')) {
      throw new Error('Invalid email')
    }
  })
} catch (error) {
  // Transaction was rolled back
  // Note: log is created using createLogger() from @/lib/logger
  log.error("Transaction failed", { error })
}
```

### Nested Transactions

Drizzle supports savepoints for nested transactions:

```typescript
await db.transaction(async (tx) => {
  await tx.insert(students).values({ sisId: "S001", ... })

  try {
    await tx.transaction(async (tx2) => {
      // This can fail independently
      await tx2.insert(interventions).values({ studentId, ... })
    })
  } catch (error) {
    // Inner transaction rolled back, outer continues
    // Note: log is created using createLogger() from @/lib/logger
    log.warn("Intervention creation failed, continuing", { error })
  }

  // This still executes even if inner transaction failed
  // Note: Using students table for demonstration; adjust to your schema
  await tx.update(students)
    .set({ updatedAt: new Date() })
    .where(eq(students.sisId, "S001"))
})
```

## Performance

### Indexing

Indexes are defined in the schema:

```typescript
import { index, uniqueIndex } from "drizzle-orm/pg-core"

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  cognitoSub: varchar('cognito_sub', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).notNull()
}, (table) => ({
  // Composite index for common query pattern
  emailIdx: index('users_email_idx').on(table.email),

  // Unique index
  cognitoSubIdx: uniqueIndex('users_cognito_sub_idx').on(table.cognitoSub)
}))
```

### Query Optimization

**Use `findFirst()` instead of `findMany()` when expecting one result:**

```typescript
// ✅ Efficient - stops after first match
const user = await db.query.users.findFirst({
  where: eq(users.id, userId)
})

// ❌ Inefficient - fetches all matches then takes first
const user = (await db.query.users.findMany({
  where: eq(users.id, userId)
}))[0]
```

**Select only needed columns:**

```typescript
// ✅ Efficient - fewer bytes transferred
const userNames = await db
  .select({ id: users.id, firstName: users.firstName })
  .from(users)

// ❌ Inefficient - transfers all columns
const userNames = await db.select().from(users)
```

**Use pagination for large result sets:**

```typescript
import { asc, desc } from "drizzle-orm"

const pageSize = 50
const page = 2

const students = await db
  .select()
  .from(students)
  .orderBy(asc(students.lastName))
  .limit(pageSize)
  .offset((page - 1) * pageSize)
```

### Connection Management

The RDS Data API is serverless - no connection pooling needed:

- ✅ No connection limits to manage
- ✅ Automatically scales with load
- ✅ No "too many connections" errors
- ⚠️ Higher latency than direct connections (~50-100ms)

## Security

### Parameterized Queries

Drizzle automatically parameterizes all queries - SQL injection is impossible:

```typescript
// ✅ Safe - automatically parameterized
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, userInput))  // userInput is safely escaped

// ❌ Never construct raw SQL with user input via string concatenation
import { sql } from "drizzle-orm"

const user = await db.execute(
  sql.raw(`SELECT * FROM users WHERE email = '${userInput}'`)  // Vulnerable to SQL Injection!
)
```

### Row-Level Security

Implement authorization checks in server actions:

```typescript
"use server"
import { getServerSession } from "@/lib/auth/server-session"
import { hasToolAccess } from "@/lib/auth/permissions"

export async function deleteIntervention(id: number) {
  const session = await getServerSession()
  if (!session) {
    throw ErrorFactories.authNoSession()
  }

  // Check permission
  const hasAccess = await hasToolAccess(session.user.sub, "interventions")
  if (!hasAccess) {
    throw ErrorFactories.authInsufficientPermissions()
  }

  // Verify ownership or admin status
  const intervention = await db.query.interventions.findFirst({
    where: eq(interventions.id, id)
  })

  if (!intervention) {
    throw new Error("Intervention not found")
  }

  // Get current user's database ID from session
  const currentUser = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.cognitoSub, session.user.sub)
  })

  if (!currentUser) {
    throw new Error("Current user not found")
  }

  // Check ownership (session.user.sub maps to users.cognitoSub, not users.id)
  if (intervention.createdBy !== currentUser.id && !session.user.isAdmin) {
    throw new Error("Unauthorized")
  }

  await db.delete(interventions).where(eq(interventions.id, id))
}
```

### Secrets Management

Database credentials are stored in AWS Secrets Manager:

```typescript
// ✅ Credentials loaded from AWS Secrets Manager
const rdsClient = new RDSDataClient({
  region: process.env.AWS_REGION
})

export const db = drizzle({
  client: rdsClient,
  database: process.env.RDS_DATABASE_NAME!,
  resourceArn: process.env.RDS_RESOURCE_ARN!,
  secretArn: process.env.RDS_SECRET_ARN!  // Managed by AWS
})
```

### Logging Safety

Never log sensitive data:

```typescript
import { sanitizeForLogging } from "@/lib/logger"

// ✅ Safe - PII removed
log.info("User query", {
  userId: sanitizeForLogging(user.id),
  email: sanitizeForLogging(user.email)
})

// ❌ Unsafe - full email logged
log.info("User query", { email: user.email })
```

## Additional Resources

- **[Database Migrations Guide](./DATABASE_MIGRATIONS.md)** - Creating and applying migrations
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[Drizzle ORM Docs](https://orm.drizzle.team)** - Official documentation
- **[TypeScript Guidelines](./TYPESCRIPT_GUIDELINES.md)** - Project-specific TS patterns

---

**Questions or Issues?** Contact the development team or create an issue in the repository.