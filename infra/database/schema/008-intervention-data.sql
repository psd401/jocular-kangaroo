-- 008-intervention-data.sql: Initial data for intervention tracking system
-- This file inserts default data needed for the application to function

-- Insert default roles for intervention tracking
INSERT INTO roles (name, description, is_system) VALUES
('Teacher', 'Regular classroom teacher', true),
('Administrator', 'School administrator with full access', true),
('Counselor', 'School counselor or social worker', true),
('Specialist', 'Intervention specialist or resource teacher', true),
('Nurse', 'School nurse', true)
ON CONFLICT DO NOTHING;

-- Insert default intervention programs
INSERT INTO intervention_programs (name, description, type, duration_days) VALUES
('Reading Recovery', 'Intensive reading intervention for struggling readers', 'academic', 90),
('Math Foundations', 'Basic math skills reinforcement program', 'academic', 60),
('Behavior Check-In/Check-Out', 'Daily behavior monitoring and support', 'behavioral', 180),
('Social Skills Group', 'Small group social skills instruction', 'social_emotional', 45),
('Attendance Improvement Plan', 'Structured support for chronic absenteeism', 'attendance', 30),
('Peer Tutoring', 'Student peer support program', 'academic', 60),
('Homework Club', 'After-school homework support', 'academic', 180),
('Anger Management', 'Individual or group anger management sessions', 'behavioral', 45),
('Friendship Group', 'Social skills development for peer relationships', 'social_emotional', 30),
('Study Skills Workshop', 'Organization and study skills training', 'academic', 30)
ON CONFLICT DO NOTHING;

-- Insert sample school (update with actual data during deployment)
INSERT INTO schools (name, district, address, phone, email, principal_name) VALUES
('Sample Elementary School', 'Peninsula School District', '123 School St, City, State 12345', '555-0100', 'elementary@psd401.net', 'Dr. Sample Principal'),
('Sample Middle School', 'Peninsula School District', '456 Education Ave, City, State 12345', '555-0200', 'middle@psd401.net', 'Dr. Sample Principal'),
('Sample High School', 'Peninsula School District', '789 Learning Blvd, City, State 12345', '555-0300', 'high@psd401.net', 'Dr. Sample Principal')
ON CONFLICT DO NOTHING;

-- Insert navigation items for intervention tracking
INSERT INTO navigation_items (label, icon, link, parent_id, position, is_active, description, type) VALUES
('Students', 'Users', '/students', NULL, 1, true, 'Manage student records', 'link'),
('Interventions', 'ClipboardList', '/interventions', NULL, 2, true, 'Track and manage interventions', 'link'),
('Reports', 'BarChart', '/reports', NULL, 3, true, 'View intervention reports', 'link'),
('Programs', 'BookOpen', '/programs', NULL, 4, true, 'Manage intervention programs', 'link'),
('Calendar', 'Calendar', '/calendar', NULL, 5, true, 'Intervention calendar', 'link')
ON CONFLICT DO NOTHING;

-- Update settings for the application
INSERT INTO settings (key, value, description, category) VALUES
('app_name', 'Jockular Kangaroo', 'Application name', 'general'),
('app_description', 'K-12 Intervention Tracking System', 'Application description', 'general'),
('default_school_year', '2024-2025', 'Current school year', 'academic'),
('intervention_reminder_days', '7', 'Days before intervention review reminder', 'notifications'),
('session_default_duration', '30', 'Default intervention session duration in minutes', 'interventions')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP;