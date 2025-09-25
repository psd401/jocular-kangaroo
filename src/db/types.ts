import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import {
  users,
  roles,
  userRoles,
  tools,
  roleTools,
  navigationItems,
  schools,
  students,
  studentGuardians,
  interventionPrograms,
  interventions,
  interventionGoals,
  interventionSessions,
  interventionTeam,
  interventionAttachments,
  documents,
  communicationLog,
  jobs,
  settings,
  migrationLog
} from './schema';

// ===== SELECT TYPES (for reading from database) =====
export type User = InferSelectModel<typeof users>;
export type Role = InferSelectModel<typeof roles>;
export type UserRole = InferSelectModel<typeof userRoles>;
export type Tool = InferSelectModel<typeof tools>;
export type RoleTool = InferSelectModel<typeof roleTools>;
export type NavigationItem = InferSelectModel<typeof navigationItems>;
export type School = InferSelectModel<typeof schools>;
export type Student = InferSelectModel<typeof students>;
export type StudentGuardian = InferSelectModel<typeof studentGuardians>;
export type InterventionProgram = InferSelectModel<typeof interventionPrograms>;
export type Intervention = InferSelectModel<typeof interventions>;
export type InterventionGoal = InferSelectModel<typeof interventionGoals>;
export type InterventionSession = InferSelectModel<typeof interventionSessions>;
export type InterventionTeam = InferSelectModel<typeof interventionTeam>;
export type InterventionAttachment = InferSelectModel<typeof interventionAttachments>;
export type Document = InferSelectModel<typeof documents>;
export type CommunicationLog = InferSelectModel<typeof communicationLog>;
export type Job = InferSelectModel<typeof jobs>;
export type Setting = InferSelectModel<typeof settings>;
export type MigrationLog = InferSelectModel<typeof migrationLog>;

// ===== INSERT TYPES (for creating new records) =====
export type NewUser = InferInsertModel<typeof users>;
export type NewRole = InferInsertModel<typeof roles>;
export type NewUserRole = InferInsertModel<typeof userRoles>;
export type NewTool = InferInsertModel<typeof tools>;
export type NewRoleTool = InferInsertModel<typeof roleTools>;
export type NewNavigationItem = InferInsertModel<typeof navigationItems>;
export type NewSchool = InferInsertModel<typeof schools>;
export type NewStudent = InferInsertModel<typeof students>;
export type NewStudentGuardian = InferInsertModel<typeof studentGuardians>;
export type NewInterventionProgram = InferInsertModel<typeof interventionPrograms>;
export type NewIntervention = InferInsertModel<typeof interventions>;
export type NewInterventionGoal = InferInsertModel<typeof interventionGoals>;
export type NewInterventionSession = InferInsertModel<typeof interventionSessions>;
export type NewInterventionTeam = InferInsertModel<typeof interventionTeam>;
export type NewInterventionAttachment = InferInsertModel<typeof interventionAttachments>;
export type NewDocument = InferInsertModel<typeof documents>;
export type NewCommunicationLog = InferInsertModel<typeof communicationLog>;
export type NewJob = InferInsertModel<typeof jobs>;
export type NewSetting = InferInsertModel<typeof settings>;
export type NewMigrationLog = InferInsertModel<typeof migrationLog>;

// ===== ENUM TYPES =====
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';
export type FieldType = 'short_text' | 'long_text' | 'select' | 'multi_select' | 'file_upload';
export type GradeLevel = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';
export type InterventionStatus = 'planned' | 'in_progress' | 'completed' | 'discontinued' | 'on_hold';
export type InterventionType = 'academic' | 'behavioral' | 'social_emotional' | 'attendance' | 'health' | 'other';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type NavigationType = 'link' | 'section' | 'page';
export type StudentStatus = 'active' | 'inactive' | 'transferred' | 'graduated';
export type ToolStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'disabled';

// ===== EXTENDED TYPES WITH RELATIONS =====
export type StudentWithRelations = Student & {
  school?: School;
  guardians?: StudentGuardian[];
  interventions?: Intervention[];
  createdBy?: User;
  updatedBy?: User;
};

export type InterventionWithRelations = Intervention & {
  student?: Student;
  program?: InterventionProgram;
  assignedTo?: User;
  createdBy?: User;
  goals?: InterventionGoal[];
  sessions?: InterventionSession[];
  teamMembers?: (InterventionTeam & { user?: User })[];
  attachments?: (InterventionAttachment & { document?: Document })[];
};

export type UserWithRelations = User & {
  userRoles?: (UserRole & { role?: Role })[];
};