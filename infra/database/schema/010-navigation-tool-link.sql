-- 010-navigation-tool-link.sql: Update navigation items to link with tool identifiers

-- Add tool_identifier column to navigation_items
ALTER TABLE navigation_items ADD COLUMN IF NOT EXISTS tool_identifier VARCHAR(100);

-- Update existing navigation items to use tool identifiers
UPDATE navigation_items SET tool_identifier = 'students' WHERE link = '/students';
UPDATE navigation_items SET tool_identifier = 'interventions' WHERE link = '/interventions';
UPDATE navigation_items SET tool_identifier = 'reports' WHERE link = '/reports';
UPDATE navigation_items SET tool_identifier = 'programs' WHERE link = '/programs';
UPDATE navigation_items SET tool_identifier = 'calendar' WHERE link = '/calendar';

-- Add admin-only navigation items
INSERT INTO navigation_items (label, icon, link, parent_id, position, is_active, description, type, tool_identifier) VALUES
('Schools', 'School', '/schools', NULL, 6, true, 'Manage schools', 'link', 'schools'),
('Settings', 'Settings', '/settings', NULL, 7, true, 'System settings', 'link', 'settings'),
('Users', 'Users', '/users', NULL, 8, true, 'User management', 'link', 'users')
ON CONFLICT DO NOTHING;