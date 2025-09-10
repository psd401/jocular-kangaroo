-- 005-initial-data.sql: Insert initial data for the application

-- Insert default roles (for intervention tracking system)
INSERT INTO roles (name, description, is_system) VALUES 
('Administrator', 'Full system access with all permissions', true),
('Teacher', 'Regular classroom teacher', true),
('Counselor', 'School counselor or social worker', true),
('Specialist', 'Intervention specialist or resource teacher', true),
('Nurse', 'School nurse', true),
('Principal', 'School principal with administrative access', true)
ON CONFLICT DO NOTHING;

-- Insert system settings
INSERT INTO settings (key, value, category, description, is_secret) VALUES
-- System configuration
('system.version', '1.0.0', 'system', 'Current system version', false),
('system.maintenance_mode', 'false', 'system', 'Whether the system is in maintenance mode', false),

-- Application settings
('app_name', 'Jocular Kangaroo', 'general', 'Application name', false),
('app_description', 'K-12 Intervention Tracking System', 'general', 'Application description', false),
('default_school_year', '2024-2025', 'academic', 'Current school year', false),
('intervention_reminder_days', '7', 'notifications', 'Days before intervention review reminder', false),
('session_default_duration', '30', 'interventions', 'Default intervention session duration in minutes', false),

-- Storage configuration
('AWS_REGION', 'us-east-1', 'storage', 'AWS region for S3 operations', false),
('S3_BUCKET', '', 'storage', 'AWS S3 bucket name for document storage', false),

-- External services
('GITHUB_ISSUE_TOKEN', '', 'external_services', 'GitHub personal access token for creating issues', true)
ON CONFLICT (key) DO NOTHING;