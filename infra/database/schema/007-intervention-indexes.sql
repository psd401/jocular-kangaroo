-- 007-intervention-indexes.sql: Create indexes for intervention tracking tables
-- This file creates indexes to optimize query performance

-- Student indexes
CREATE INDEX idx_students_student_id ON students(student_id);
CREATE INDEX idx_students_last_name ON students(last_name);
CREATE INDEX idx_students_grade ON students(grade);
CREATE INDEX idx_students_school_id ON students(school_id);
CREATE INDEX idx_students_status ON students(status);

-- Intervention indexes
CREATE INDEX idx_interventions_student_id ON interventions(student_id);
CREATE INDEX idx_interventions_assigned_to ON interventions(assigned_to);
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_type ON interventions(type);
CREATE INDEX idx_interventions_start_date ON interventions(start_date);
CREATE INDEX idx_interventions_created_by ON interventions(created_by);

-- Session indexes
CREATE INDEX idx_intervention_sessions_intervention_id ON intervention_sessions(intervention_id);
CREATE INDEX idx_intervention_sessions_session_date ON intervention_sessions(session_date);
CREATE INDEX idx_intervention_sessions_recorded_by ON intervention_sessions(recorded_by);

-- Communication log indexes
CREATE INDEX idx_communication_log_student_id ON communication_log(student_id);
CREATE INDEX idx_communication_log_intervention_id ON communication_log(intervention_id);
CREATE INDEX idx_communication_log_contact_date ON communication_log(contact_date);
CREATE INDEX idx_communication_log_created_by ON communication_log(created_by);

-- Guardian indexes
CREATE INDEX idx_student_guardians_student_id ON student_guardians(student_id);
CREATE INDEX idx_student_guardians_is_primary ON student_guardians(is_primary_contact);

-- Team member indexes
CREATE INDEX idx_intervention_team_intervention_id ON intervention_team(intervention_id);
CREATE INDEX idx_intervention_team_user_id ON intervention_team(user_id);

-- Goals indexes
CREATE INDEX idx_intervention_goals_intervention_id ON intervention_goals(intervention_id);
CREATE INDEX idx_intervention_goals_target_date ON intervention_goals(target_date);
CREATE INDEX idx_intervention_goals_is_achieved ON intervention_goals(is_achieved);

-- Attachment indexes
CREATE INDEX idx_intervention_attachments_intervention_id ON intervention_attachments(intervention_id);
CREATE INDEX idx_intervention_attachments_document_id ON intervention_attachments(document_id);