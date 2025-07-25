-- 003-constraints.sql: Add all foreign key constraints
-- This file adds referential integrity constraints between tables

-- User roles constraints
ALTER TABLE user_roles 
    ADD CONSTRAINT user_roles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles 
    ADD CONSTRAINT user_roles_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

-- Role tools constraints
ALTER TABLE role_tools 
    ADD CONSTRAINT role_tools_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE role_tools 
    ADD CONSTRAINT role_tools_tool_id_fkey 
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE;

-- Navigation items constraints
ALTER TABLE navigation_items 
    ADD CONSTRAINT navigation_items_parent_id_fkey 
    FOREIGN KEY (parent_id) REFERENCES navigation_items(id) ON DELETE CASCADE;

ALTER TABLE navigation_items 
    ADD CONSTRAINT navigation_items_tool_id_fkey 
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE SET NULL;

-- Documents constraints
ALTER TABLE documents 
    ADD CONSTRAINT documents_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Jobs constraints
ALTER TABLE jobs 
    ADD CONSTRAINT jobs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

