// Intervention tracking system types

export type GradeLevel = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

export type InterventionType = 'academic' | 'behavioral' | 'social_emotional' | 'attendance' | 'health' | 'other';

export type InterventionStatus = 'planned' | 'in_progress' | 'completed' | 'discontinued' | 'on_hold';

export type StudentStatus = 'active' | 'inactive' | 'transferred' | 'graduated';

export interface School {
  id: number;
  name: string;
  district?: string;
  address?: string;
  phone?: string;
  email?: string;
  principal_name?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Student {
  id: number;
  student_id: string; // District student ID
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth?: Date;
  grade: GradeLevel;
  school_id?: number;
  status: StudentStatus;
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
  updated_by?: number;
}

export interface InterventionProgram {
  id: number;
  name: string;
  description?: string;
  type: InterventionType;
  duration_days?: number;
  materials?: string;
  goals?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Intervention {
  id: number;
  student_id: number;
  program_id?: number;
  type: InterventionType;
  status: InterventionStatus;
  title: string;
  description?: string;
  goals?: string;
  start_date: Date;
  end_date?: Date;
  frequency?: string;
  duration_minutes?: number;
  location?: string;
  assigned_to?: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  completion_notes?: string;
}

export interface InterventionSession {
  id: number;
  intervention_id: number;
  session_date: Date;
  duration_minutes?: number;
  attended: boolean;
  progress_notes?: string;
  challenges?: string;
  next_steps?: string;
  recorded_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface InterventionTeamMember {
  id: number;
  intervention_id: number;
  user_id: number;
  role?: string;
  created_at: Date;
}

export interface InterventionGoal {
  id: number;
  intervention_id: number;
  goal_text: string;
  target_date?: Date;
  is_achieved: boolean;
  achieved_date?: Date;
  evidence?: string;
  created_at: Date;
  updated_at: Date;
}

export interface StudentGuardian {
  id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  relationship?: string;
  email?: string;
  phone?: string;
  is_primary_contact: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CommunicationLog {
  id: number;
  student_id: number;
  intervention_id?: number;
  contact_type?: string;
  contact_date: Date;
  contacted_person?: string;
  summary?: string;
  follow_up_required: boolean;
  follow_up_date?: Date;
  created_by: number;
  created_at: Date;
}

// Extended types with relationships
export interface StudentWithDetails extends Student {
  school?: School;
  guardians?: StudentGuardian[];
  interventions?: Intervention[];
}

export interface InterventionWithDetails extends Intervention {
  student?: Student;
  program?: InterventionProgram;
  assigned_to_user?: { id: number; first_name: string; last_name: string };
  team_members?: InterventionTeamMember[];
  sessions?: InterventionSession[];
  goals?: InterventionGoal[];
}

// Form types for creating/updating records
export interface CreateStudentInput {
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  date_of_birth?: string;
  grade: GradeLevel;
  school_id?: number;
  status?: StudentStatus;
  email?: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}

export interface CreateInterventionInput {
  student_id: number;
  program_id?: number;
  type: InterventionType;
  status?: InterventionStatus;
  title: string;
  description?: string;
  goals?: string;
  start_date: string;
  end_date?: string;
  frequency?: string;
  duration_minutes?: number;
  location?: string;
  assigned_to?: number;
}

export interface CreateSessionInput {
  intervention_id: number;
  session_date: string;
  duration_minutes?: number;
  attended?: boolean;
  progress_notes?: string;
  challenges?: string;
  next_steps?: string;
}