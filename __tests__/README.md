# Jockular Kangaroo Test Suite

## Overview

This project uses Jest as the testing framework with support for TypeScript and React components.

## Test Structure

Tests are organized in the `__tests__` directory at the root level. The test suite includes:

### Unit Tests
- **Field Mapper Tests** (`field-mapper.test.ts`): Tests for snake_case/camelCase conversion utilities
- **Example Tests** (`example.test.ts`): Basic test examples to verify Jest setup

### Test Setup
- **Jest Configuration** (`jest.config.js`): Configures Jest for Next.js and TypeScript
- **Jest Setup** (`jest.setup.js`): Sets up test environment with:
  - TextEncoder/TextDecoder polyfills
  - Next.js navigation mocks
  - AWS Amplify mocks
  - ResizeObserver mock
- **Environment Variables** (`.jest/setEnvVars.js`): Sets test environment variables

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test __tests__/field-mapper.test.ts

# Run tests with coverage
npm test -- --coverage
```

## Writing Tests

### Example Unit Test

```typescript
import { someFunction } from '@/lib/some-module';

describe('Some Module', () => {
  it('should do something', () => {
    const result = someFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Example Component Test

```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/my-component';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

## Test Coverage Areas

The following areas have been identified for testing:

1. **Database Actions**
   - Student CRUD operations
   - Intervention management
   - Program management
   - User and role management

2. **Authentication & Authorization**
   - Role-based access control
   - User authentication flows
   - Permission checks

3. **API Routes**
   - Document upload/download
   - Intervention endpoints
   - Admin endpoints

4. **UI Components**
   - Forms (Student, Intervention, Program)
   - Tables and data displays
   - Navigation components

5. **Utilities**
   - Field mapping (snake_case/camelCase)
   - Data formatting
   - Validation helpers

## Future Improvements

1. Add integration tests for API endpoints
2. Add E2E tests using Playwright or Cypress
3. Increase test coverage for critical paths
4. Add performance tests for data-heavy operations
5. Mock AWS services more comprehensively

## Troubleshooting

### Common Issues

1. **TextEncoder not defined**: Already handled in jest.setup.js
2. **Module not found**: Check path aliases in jest.config.js
3. **React Testing Library errors**: Ensure all async operations use `waitFor`

### Debug Tips

- Use `console.log` in tests (will show in test output)
- Run single test with `.only`: `it.only('test name', ...)`
- Skip tests with `.skip`: `it.skip('test name', ...)`
- Use `--verbose` flag for detailed output