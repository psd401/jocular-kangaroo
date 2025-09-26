interface TestUser {
  id: number;
  cognitoSub: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignInAt: Date | null;
}

interface TestRole {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TestTool {
  id: number;
  identifier: string;
  name: string;
  description: string | null;
  url: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TestStudent {
  id: number;
  firstName: string;
  lastName: string;
  studentId: string;
  gradeLevel: string | null;
  dateOfBirth: Date | null;
  status: string;
  schoolId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

let idCounter = 1;

export function resetIdCounter(): void {
  idCounter = 1;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const id = overrides.id ?? idCounter++;
  return {
    id,
    cognitoSub: `test-cognito-sub-${id}`,
    email: `test${id}@example.com`,
    firstName: `Test`,
    lastName: `User${id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignInAt: new Date(),
    ...overrides,
  };
}

export function createTestRole(overrides: Partial<TestRole> = {}): TestRole {
  const id = overrides.id ?? idCounter++;
  return {
    id,
    name: `Test Role ${id}`,
    description: `Test role description ${id}`,
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestTool(overrides: Partial<TestTool> = {}): TestTool {
  const id = overrides.id ?? idCounter++;
  return {
    id,
    identifier: `test-tool-${id}`,
    name: `Test Tool ${id}`,
    description: `Test tool description ${id}`,
    url: `/tools/test-${id}`,
    icon: 'TestIcon',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestStudent(overrides: Partial<TestStudent> = {}): TestStudent {
  const id = overrides.id ?? idCounter++;
  return {
    id,
    firstName: `Student`,
    lastName: `${id}`,
    studentId: `STU${String(id).padStart(6, '0')}`,
    gradeLevel: '9',
    dateOfBirth: new Date('2010-01-01'),
    status: 'active',
    schoolId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export const testDataFactory = {
  user: createTestUser,
  role: createTestRole,
  tool: createTestTool,
  student: createTestStudent,
  reset: resetIdCounter,
};