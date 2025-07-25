import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder for Node environment
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn()
}));

// Mock next/cache
jest.mock('next/cache', () => ({
  unstable_cache: jest.fn((fn) => fn),
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn()
}));

// Mock AWS Cognito authentication
jest.mock('@/lib/auth/server-session', () => ({
  getServerSession: () => Promise.resolve({ 
    sub: 'test-cognito-sub',
    email: 'test@example.com'
  })
}));

jest.mock('aws-amplify', () => ({
  Amplify: {
    configure: jest.fn()
  }
}));

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver; 