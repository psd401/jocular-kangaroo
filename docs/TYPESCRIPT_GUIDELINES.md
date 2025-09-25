# TypeScript Guidelines

This document outlines TypeScript best practices for the Jocular Kangaroo codebase.

## Error Handling

### Type-Safe Error Handling

Never use `any` type for error handling. Instead, use the utilities provided in `/types/errors.ts`:

```typescript
import { getErrorMessage } from "@/types/errors"

try {
  // Your code here
} catch (error) {
  // Don't use: catch (error: any)
  logger.error("Error occurred:", error)
  return NextResponse.json(
    { error: getErrorMessage(error) },
    { status: 500 }
  )
}
```

### Error Type Guards

Use type guards to safely check error types:

```typescript
import { isError, hasMessage } from "@/types/errors"

if (isError(error)) {
  // error is now typed as Error
  console.log(error.message, error.stack)
}

if (hasMessage(error)) {
  // error has a message property
  console.log(error.message)
}
```

## Avoiding `any` Types

### Event Handlers

Use proper React event types:

```typescript
// Bad
onClick={(e: any) => handleClick(e)}

// Good
onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleClick(e)}
onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(e)}
onSubmit={(e: React.FormEvent<HTMLFormElement>) => handleSubmit(e)}
```

### API Responses

Define interfaces for API responses:

```typescript
// Bad
const data: any = await response.json()

// Good
interface UserResponse {
  id: number
  name: string
  email: string
}
const data: UserResponse = await response.json()
```

### Database Queries (Modern Drizzle Approach)

Use Drizzle ORM with automatic type inference and casing transformation:

```typescript
import { db } from "@/lib/db/drizzle-client"
import { users } from "@/src/db/schema"
import { eq } from "drizzle-orm"

// ❌ Bad - Direct SQL without types
const result: any[] = await executeSQL("SELECT * FROM users")

// ✅ Good - Drizzle with automatic type inference and casing
const userList = await db.select().from(users).where(eq(users.isActive, true))
// TypeScript automatically knows:
// - userList: Array<{ id: number; firstName: string | null; createdAt: Date; ... }>
// - Properties are camelCase (firstName, createdAt)
// - Database uses snake_case (first_name, created_at)

// ✅ Good - Complex query with relations
const userWithRoles = await db.query.users.findFirst({
  where: eq(users.cognitoSub, sub),
  with: {
    userRoles: {
      with: {
        role: true
      }
    }
  }
})
// Full type safety for nested relations!
```

**Legacy approach** (being phased out):
```typescript
import { SelectUser, InsertUser } from "@/types/schema-types"
const users: SelectUser[] = await executeSQL(query) // Manual typing required
```

### AWS SDK Parameters

Use proper types from AWS SDK:

```typescript
import { SqlParameter } from "@aws-sdk/client-rds-data"

// Bad
const params: any[] = [...]

// Good
const params: SqlParameter[] = [
  { name: "id", value: { longValue: 1 } }
]
```

## Type Utilities

### Unknown vs Any

Prefer `unknown` over `any` when the type is truly unknown:

```typescript
// Bad
function processData(data: any) { ... }

// Good
function processData(data: unknown) {
  // Type narrowing required before use
  if (typeof data === 'string') {
    // data is now string
  }
}
```

### Record Types

Use `Record<string, unknown>` for objects with unknown structure:

```typescript
// Bad
const metadata: any = { ... }

// Good
const metadata: Record<string, unknown> = { ... }
```

### Generic Constraints

Use proper constraints instead of `any`:

```typescript
// Bad
function process<T extends any[]>(items: T) { ... }

// Good
function process<T extends unknown[]>(items: T) { ... }
```

## Component Props

### Icon Components

Type icon props properly:

```typescript
// Bad
icon?: any

// Good
icon?: React.ComponentType<{ className?: string }>
```

### Form Fields

Use union types for known values:

```typescript
// Bad
type: any

// Good
type: 'text' | 'number' | 'email' | 'select' | 'textarea'
```

## Database Types

Always use the generated schema types:

```typescript
import { 
  SelectUser, 
  InsertUser,
  SelectConversation,
  SelectAiModel 
} from "@/types/schema-types"
```

## Table Component Types

Use proper types from the table library:

```typescript
import { Column } from "@tanstack/react-table"

// Bad
accessorFn: (row: any) => row.name

// Good
accessorFn: (row: SelectUser) => row.name

// For column definitions
const columns: Column<SelectUser, unknown>[] = [...]
```

## Importing Types

- Import types from their proper locations
- Create shared type files for commonly used types
- Export types alongside their implementations

```typescript
// types/api.ts
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
}

// Usage
import { ApiResponse } from "@/types/api"
const response: ApiResponse<User> = await fetchUser()
```

## ESLint Configuration

The project enforces these TypeScript rules:
- `@typescript-eslint/no-explicit-any`: Error
- `@typescript-eslint/no-unused-vars`: Error
- `@typescript-eslint/no-empty-object-type`: Error

Run `npm run lint` to check for violations.