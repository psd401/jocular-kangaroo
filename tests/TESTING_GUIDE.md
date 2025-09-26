# Testing Guide - Drizzle ORM

This guide explains how to write tests for actions using Drizzle ORM.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Helpers](#test-helpers)
3. [Mocking Drizzle](#mocking-drizzle)
4. [Test Data Factories](#test-data-factories)
5. [Common Patterns](#common-patterns)
6. [Best Practices](#best-practices)

## Quick Start

### Basic Test Structure

```typescript
import { db } from '@/lib/db/drizzle-client';
import { createMockDb, mockDbQuery } from '@/tests/helpers/drizzle-mock';
import { testDataFactory } from '@/tests/helpers/test-data-factory';

jest.mock('@/lib/db/drizzle-client', () => ({
  db: createMockDb(),
}));

describe('My Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testDataFactory.reset();
  });

  it('should fetch data successfully', async () => {
    const mockData = [testDataFactory.user()];
    mockDbQuery(db, mockData);

    const result = await myAction();

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveLength(1);
  });
});
```

## Test Helpers

### Drizzle Mock (`tests/helpers/drizzle-mock.ts`)

Provides utilities for mocking Drizzle database operations.

#### `createMockDb()`

Creates a mock database instance with all Drizzle methods.

```typescript
const mockDb = createMockDb();
```

#### `mockDbQuery(db, returnValue)`

Mocks a SELECT query to return specific data.

```typescript
mockDbQuery(db, [{ id: 1, name: 'Test' }]);
```

#### `mockDbInsert(db, returnValue)`

Mocks an INSERT operation.

```typescript
mockDbInsert(db, [{ id: 1, name: 'New User' }]);
```

#### `mockDbUpdate(db, returnValue)`

Mocks an UPDATE operation.

```typescript
mockDbUpdate(db, [{ id: 1, name: 'Updated User' }]);
```

#### `mockDbDelete(db, returnValue)`

Mocks a DELETE operation.

```typescript
mockDbDelete(db, [{ id: 1 }]);
```

#### `mockTransaction(db, customImplementation?)`

Mocks a transaction. By default, it creates a mock transaction that passes a mock database to the callback. You can optionally provide a custom implementation.

```typescript
// Default behavior - automatically creates mock transaction
mockTransaction(db);

// Custom implementation
mockTransaction(db, async (callback) => {
  const txMock = createMockDb();
  const result = await callback(txMock);
  return result;
});
```

### Test Data Factory (`tests/helpers/test-data-factory.ts`)

Provides factory functions for creating test data with sensible defaults.

#### Available Factories

```typescript
// Create a test user
const user = testDataFactory.user({
  firstName: 'Custom',
  lastName: 'Name',
});

// Create a test role
const role = testDataFactory.role({
  name: 'Admin',
});

// Create a test tool
const tool = testDataFactory.tool({
  identifier: 'custom-tool',
});

// Create a test student
const student = testDataFactory.student({
  gradeLevel: '10',
});

// Reset ID counter (use in beforeEach)
testDataFactory.reset();
```

## Mocking Drizzle

### SELECT Queries

```typescript
it('should query users', async () => {
  const mockUsers = [
    testDataFactory.user({ id: 1 }),
    testDataFactory.user({ id: 2 }),
  ];

  mockDbQuery(db, mockUsers);

  const result = await getUsersAction();

  expect(result.data).toHaveLength(2);
});
```

### INSERT Operations

```typescript
it('should insert a user', async () => {
  const newUser = testDataFactory.user({ id: 1 });

  mockDbInsert(db, [newUser]);

  const result = await createUserAction({ email: 'test@example.com' });

  expect(result.isSuccess).toBe(true);
  expect(db.insert).toHaveBeenCalled();
});
```

### UPDATE Operations

```typescript
it('should update a user', async () => {
  const updatedUser = testDataFactory.user({
    id: 1,
    firstName: 'Updated',
  });

  mockDbUpdate(db, [updatedUser]);

  const result = await updateUserAction(1, { firstName: 'Updated' });

  expect(result.isSuccess).toBe(true);
  expect(db.update).toHaveBeenCalled();
});
```

### DELETE Operations

```typescript
it('should delete a user', async () => {
  mockDbDelete(db, [{ id: 1 }]);

  const result = await deleteUserAction(1);

  expect(result.isSuccess).toBe(true);
  expect(db.delete).toHaveBeenCalled();
});
```

### Transactions

```typescript
it('should handle transactions', async () => {
  // Use default transaction mock (most common case)
  mockTransaction(db as unknown as Record<string, unknown>);

  const result = await actionWithTransaction();

  expect(result.isSuccess).toBe(true);
  expect(db.transaction).toHaveBeenCalled();
});

// Example with custom transaction behavior
it('should handle transaction rollback', async () => {
  mockTransaction(db as unknown as Record<string, unknown>, async (callback) => {
    const txMock = createMockDb();
    throw new Error('Transaction rolled back');
  });

  const result = await actionWithTransaction();

  expect(result.isSuccess).toBe(false);
});
```

## Common Patterns

### Testing Authentication

```typescript
import { getCurrentUserAction } from '@/actions/db/get-current-user-action';

jest.mock('@/actions/db/get-current-user-action');

it('should require authentication', async () => {
  (getCurrentUserAction as jest.Mock).mockResolvedValue({
    isSuccess: false,
    message: 'Unauthorized',
  });

  const result = await protectedAction();

  expect(result.isSuccess).toBe(false);
  expect(result.message).toBe('Unauthorized');
});
```

### Testing Error Handling

```typescript
it('should handle database errors', async () => {
  (db.select as jest.Mock).mockImplementation(() => {
    throw new Error('Database connection failed');
  });

  const result = await myAction();

  expect(result.isSuccess).toBe(false);
  expect(result.message).toContain('Failed');
});
```

### Testing Empty Results

```typescript
it('should handle empty results', async () => {
  mockDbQuery(db, []);

  const result = await myAction();

  expect(result.isSuccess).toBe(true);
  expect(result.data).toHaveLength(0);
});
```

### Testing Relations

```typescript
it('should fetch related data', async () => {
  const mockData = [
    {
      ...testDataFactory.user({ id: 1 }),
      userRoles: [
        {
          roleId: 1,
          role: testDataFactory.role({ id: 1, name: 'Admin' }),
        },
      ],
    },
  ];

  mockDbQuery(db, mockData);

  const result = await getUserWithRolesAction(1);

  expect(result.data?.userRoles).toBeDefined();
  expect(result.data?.userRoles[0].role.name).toBe('Admin');
});
```

## Best Practices

### 1. Always Clear Mocks

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  testDataFactory.reset();
});
```

### 2. Use Test Data Factory

```typescript
const user = testDataFactory.user();
```

### 3. Test Both Success and Failure Cases

```typescript
describe('getUserAction', () => {
  it('should succeed when user exists', async () => {
    // success case
  });

  it('should fail when user not found', async () => {
    // failure case
  });

  it('should fail when database errors', async () => {
    // error case
  });
});
```

### 4. Test Edge Cases

```typescript
it('should handle null values', async () => {
  const user = testDataFactory.user({
    firstName: null,
    lastName: null,
  });
  // test handling
});
```

### 5. Use Descriptive Test Names

```typescript
it('should return unauthorized when user lacks admin role', async () => {
  // test
});
```

### 6. Group Related Tests

```typescript
describe('getUsersAction', () => {
  describe('authentication', () => {
    it('should require authentication', async () => {});
    it('should validate session', async () => {});
  });

  describe('data fetching', () => {
    it('should fetch all users', async () => {});
    it('should order by last name', async () => {});
  });
});
```

### 7. Verify Mock Calls

```typescript
it('should call database with correct parameters', async () => {
  mockDbQuery(db, [testDataFactory.user()]);

  await getUsersAction();

  expect(db.select).toHaveBeenCalled();
  expect(db.select).toHaveBeenCalledTimes(1);
});
```

## Running Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Example: Complete Test File

```typescript
import { getUsersAction } from '@/actions/db/users-actions';
import { db } from '@/lib/db/drizzle-client';
import { getCurrentUserAction } from '@/actions/db/get-current-user-action';
import { createMockDb, mockDbQuery } from '@/tests/helpers/drizzle-mock';
import { testDataFactory } from '@/tests/helpers/test-data-factory';

jest.mock('@/lib/db/drizzle-client', () => ({
  db: createMockDb(),
}));

jest.mock('@/actions/db/get-current-user-action');

describe('users-actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testDataFactory.reset();
  });

  describe('getUsersAction', () => {
    it('should return users successfully', async () => {
      const mockCurrentUser = testDataFactory.user({ id: 1 });
      (getCurrentUserAction as jest.Mock).mockResolvedValue({
        isSuccess: true,
        data: mockCurrentUser,
      });

      const mockUsers = [
        testDataFactory.user({ id: 1, firstName: 'Alice' }),
        testDataFactory.user({ id: 2, firstName: 'Bob' }),
      ];

      mockDbQuery(db, mockUsers);

      const result = await getUsersAction();

      expect(result.isSuccess).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle unauthorized access', async () => {
      (getCurrentUserAction as jest.Mock).mockResolvedValue({
        isSuccess: false,
        message: 'Unauthorized',
      });

      const result = await getUsersAction();

      expect(result.isSuccess).toBe(false);
      expect(db.select).not.toHaveBeenCalled();
    });
  });
});
```

## Troubleshooting

### Mock Not Working

Ensure you're mocking the correct module:

```typescript
jest.mock('@/lib/db/drizzle-client', () => ({
  db: createMockDb(),
}));
```

### Type Errors

Import types correctly:

```typescript
import type { PgDatabase } from 'drizzle-orm/pg-core';
```

### Async Issues

Always use `async/await`:

```typescript
it('should work', async () => {
  const result = await myAction();
  expect(result).toBeDefined();
});
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Testing Library](https://testing-library.com/)