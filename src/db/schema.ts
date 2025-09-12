// This file will contain the complete database schema after introspection
// For now, it's a placeholder to test the Drizzle configuration

import { pgTable, serial, varchar, timestamp, pgEnum } from 'drizzle-orm/pg-core';

// Example: Define navigation_type enum (will be replaced by introspection)
export const navigationTypeEnum = pgEnum('navigation_type', ['page', 'tool', 'link']);

// Example: Users table (will be replaced by introspection)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  cognitoSub: varchar('cognito_sub', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastSignInAt: timestamp('last_sign_in_at')
});

// This file will be populated with all tables after running:
// npm run db:pull