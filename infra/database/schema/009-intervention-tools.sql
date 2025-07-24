-- 009-intervention-tools.sql: Define tools for role-based access control

-- Insert tools for intervention tracking system
INSERT INTO tools (identifier, name, description, is_active) VALUES
('students', 'Student Management', 'Create, view, and manage student records', true),
('interventions', 'Intervention Tracking', 'Create and manage student interventions', true),
('programs', 'Program Management', 'Manage intervention program templates', true),
('reports', 'Reports & Analytics', 'View intervention reports and analytics', true),
('schools', 'School Management', 'Manage school information', true),
('calendar', 'Calendar', 'View and manage intervention schedules', true),
('settings', 'Settings', 'Manage system settings', true),
('users', 'User Management', 'Manage users and roles', true)
ON CONFLICT (identifier) DO NOTHING;

-- Assign tools to roles
-- Administrators get access to all tools
INSERT INTO role_tools (role_id, tool_id)
SELECT r.id, t.id
FROM roles r
CROSS JOIN tools t
WHERE r.name = 'Administrator'
ON CONFLICT DO NOTHING;

-- Teachers get access to students, interventions, calendar, and reports
INSERT INTO role_tools (role_id, tool_id)
SELECT r.id, t.id
FROM roles r
CROSS JOIN tools t
WHERE r.name = 'Teacher'
  AND t.identifier IN ('students', 'interventions', 'calendar', 'reports')
ON CONFLICT DO NOTHING;

-- Counselors get access to students, interventions, programs, calendar, and reports
INSERT INTO role_tools (role_id, tool_id)
SELECT r.id, t.id
FROM roles r
CROSS JOIN tools t
WHERE r.name = 'Counselor'
  AND t.identifier IN ('students', 'interventions', 'programs', 'calendar', 'reports')
ON CONFLICT DO NOTHING;

-- Specialists get access to students, interventions, programs, calendar, and reports
INSERT INTO role_tools (role_id, tool_id)
SELECT r.id, t.id
FROM roles r
CROSS JOIN tools t
WHERE r.name = 'Specialist'
  AND t.identifier IN ('students', 'interventions', 'programs', 'calendar', 'reports')
ON CONFLICT DO NOTHING;

-- Nurses get access to students and health-related interventions
INSERT INTO role_tools (role_id, tool_id)
SELECT r.id, t.id
FROM roles r
CROSS JOIN tools t
WHERE r.name = 'Nurse'
  AND t.identifier IN ('students', 'interventions', 'calendar')
ON CONFLICT DO NOTHING;