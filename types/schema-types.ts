// Re-export types from db-types
export type {
  SelectUser,
  SelectDocument,
  SelectJob,
  SelectNavigationItem,
  SelectTool,
  InsertJob,
  InsertNavigationItem,
  InsertDocument
} from '@/types/db-types';

export type Role = 'student' | 'staff' | 'administrator'

// Core Types - these need to be added to db-types.ts if used
export type InsertUser = {
  id?: string;
  cognitoSub?: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  lastSignInAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

