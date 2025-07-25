// Type definitions for database operations
// These types match the database structure

export type InsertJob = {
  id?: number;
  userId: number;
  status?: string;
  type: string;
  input: string;
  output?: string | null;
  error?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SelectJob = {
  id: number;
  userId: number;
  status: string;
  type: string;
  input: string;
  output: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type InsertNavigationItem = {
  id?: number;
  label: string;
  icon: string;
  link?: string | null;
  parentId?: number | null;
  description?: string | null;
  type?: string;
  toolId?: number | null;
  requiresRole?: string | null;
  position?: number;
  isActive?: boolean;
  createdAt?: Date;
}

export type SelectNavigationItem = {
  id: number;
  label: string;
  icon: string;
  link: string | null;
  parentId: number | null;
  description: string | null;
  type: string;
  toolId: number | null;
  requiresRole: string | null;
  position: number;
  isActive: boolean;
  createdAt: Date;
}

export type SelectUser = {
  id: number;
  cognitoSub: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  lastSignInAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SelectDocument = {
  id: number;
  name: string;
  type: string;
  url: string;
  size: number;
  userId: number;
  conversationId: number | null;
  metadata?: any;
  createdAt: Date;
}

export type InsertDocument = {
  id?: number;
  name: string;
  type: string;
  url: string;
  size?: number;
  userId: number;
  conversationId?: number | null;
  metadata?: any;
}




export type SelectTool = {
  id: number;
  identifier: string;
  name: string;
  description: string | null;
  promptChainToolId: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

