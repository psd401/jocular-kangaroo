import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  date,
  bigint,
  jsonb,
  pgEnum
} from 'drizzle-orm/pg-core';

// ===== ENUMS =====
export const executionStatusEnum = pgEnum('execution_status', ['pending', 'running', 'completed', 'failed']);
export const fieldTypeEnum = pgEnum('field_type', ['short_text', 'long_text', 'select', 'multi_select', 'file_upload']);
export const gradeLevelEnum = pgEnum('grade_level', ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']);
export const interventionStatusEnum = pgEnum('intervention_status', ['planned', 'in_progress', 'completed', 'discontinued', 'on_hold']);
export const interventionTypeEnum = pgEnum('intervention_type', ['academic', 'behavioral', 'social_emotional', 'attendance', 'health', 'other']);
export const jobStatusEnum = pgEnum('job_status', ['pending', 'running', 'completed', 'failed']);
export const navigationTypeEnum = pgEnum('navigation_type', ['link', 'section', 'page']);
export const studentStatusEnum = pgEnum('student_status', ['active', 'inactive', 'transferred', 'graduated']);
export const toolStatusEnum = pgEnum('tool_status', ['draft', 'pending_approval', 'approved', 'rejected', 'disabled']);

// ===== CORE TABLES =====

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  cognitoSub: varchar('cognito_sub', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastSignInAt: timestamp('last_sign_in_at')
});

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isSystem: boolean('is_system').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const userRoles = pgTable('user_roles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  roleId: integer('role_id').references(() => roles.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const tools = pgTable('tools', {
  id: serial('id').primaryKey(),
  identifier: varchar('identifier', { length: 100 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  url: varchar('url', { length: 255 }),
  icon: varchar('icon', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  parentNavigationId: integer('parent_navigation_id'),
  displayOrder: integer('display_order').default(0)
});

export const roleTools = pgTable('role_tools', {
  id: serial('id').primaryKey(),
  roleId: integer('role_id').references(() => roles.id).notNull(),
  toolId: integer('tool_id').references(() => tools.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const navigationItems = pgTable('navigation_items', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  icon: text('icon'),
  link: text('link'),
  parentId: integer('parent_id'),
  toolId: integer('tool_id').references(() => tools.id),
  requiresRole: text('requires_role'),
  position: integer('position').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  description: text('description'),
  type: navigationTypeEnum('type').notNull(),
  toolIdentifier: varchar('tool_identifier', { length: 100 })
});

export const schools = pgTable('schools', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  district: varchar('district', { length: 255 }),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  principalName: varchar('principal_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ===== STUDENT MANAGEMENT =====

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  studentId: varchar('student_id', { length: 50 }).unique().notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  middleName: varchar('middle_name', { length: 100 }),
  dateOfBirth: date('date_of_birth'),
  grade: gradeLevelEnum('grade'),
  schoolId: integer('school_id').references(() => schools.id),
  status: studentStatusEnum('status').default('active').notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  emergencyContactName: varchar('emergency_contact_name', { length: 255 }),
  emergencyContactPhone: varchar('emergency_contact_phone', { length: 20 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id)
});

export const studentGuardians = pgTable('student_guardians', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  relationship: varchar('relationship', { length: 50 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  isPrimaryContact: boolean('is_primary_contact').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ===== INTERVENTION SYSTEM =====

export const interventionPrograms = pgTable('intervention_programs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: interventionTypeEnum('type').notNull(),
  durationDays: integer('duration_days'),
  materials: text('materials'),
  goals: text('goals'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const interventions = pgTable('interventions', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id).notNull(),
  programId: integer('program_id').references(() => interventionPrograms.id),
  type: interventionTypeEnum('type').notNull(),
  status: interventionStatusEnum('status').default('planned').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  goals: text('goals'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  frequency: varchar('frequency', { length: 100 }),
  durationMinutes: integer('duration_minutes'),
  location: varchar('location', { length: 255 }),
  assignedTo: integer('assigned_to').references(() => users.id),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  completionNotes: text('completion_notes')
});

export const interventionGoals = pgTable('intervention_goals', {
  id: serial('id').primaryKey(),
  interventionId: integer('intervention_id').references(() => interventions.id).notNull(),
  goalText: text('goal_text').notNull(),
  targetDate: date('target_date'),
  isAchieved: boolean('is_achieved').default(false).notNull(),
  achievedDate: date('achieved_date'),
  evidence: text('evidence'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const interventionSessions = pgTable('intervention_sessions', {
  id: serial('id').primaryKey(),
  interventionId: integer('intervention_id').references(() => interventions.id).notNull(),
  sessionDate: date('session_date').notNull(),
  durationMinutes: integer('duration_minutes'),
  attended: boolean('attended').default(true).notNull(),
  progressNotes: text('progress_notes'),
  challenges: text('challenges'),
  nextSteps: text('next_steps'),
  recordedBy: integer('recorded_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const interventionTeam = pgTable('intervention_team', {
  id: serial('id').primaryKey(),
  interventionId: integer('intervention_id').references(() => interventions.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: varchar('role', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ===== DOCUMENT MANAGEMENT =====

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 50 }).notNull(),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
  processingStatus: varchar('processing_status', { length: 50 }).default('pending'),
  processedAt: timestamp('processed_at')
});

export const interventionAttachments = pgTable('intervention_attachments', {
  id: serial('id').primaryKey(),
  interventionId: integer('intervention_id').references(() => interventions.id).notNull(),
  documentId: integer('document_id').references(() => documents.id).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: integer('created_by').references(() => users.id).notNull()
});

// ===== COMMUNICATION =====

export const communicationLog = pgTable('communication_log', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => students.id),
  interventionId: integer('intervention_id').references(() => interventions.id),
  contactType: varchar('contact_type', { length: 50 }).notNull(),
  contactDate: timestamp('contact_date').notNull(),
  contactedPerson: varchar('contacted_person', { length: 255 }),
  summary: text('summary').notNull(),
  followUpRequired: boolean('follow_up_required').default(false).notNull(),
  followUpDate: date('follow_up_date'),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ===== SYSTEM TABLES =====

export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  jobType: varchar('job_type', { length: 100 }).notNull(),
  status: jobStatusEnum('status').default('pending').notNull(),
  userId: integer('user_id').references(() => users.id),
  inputData: jsonb('input_data'),
  outputData: jsonb('output_data'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull()
});

export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).unique().notNull(),
  value: text('value').notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  isSecret: boolean('is_secret').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const migrationLog = pgTable('migration_log', {
  id: serial('id').primaryKey(),
  migrationName: varchar('migration_name', { length: 255 }).notNull(),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
  executionTimeMs: integer('execution_time_ms'),
  success: boolean('success').notNull(),
  errorMessage: text('error_message')
});