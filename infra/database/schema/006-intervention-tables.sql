-- 006-intervention-tables.sql: Create intervention tracking tables
-- This file creates all tables specific to the K-12 intervention tracking system

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(255),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    principal_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL, -- District student ID
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE,
    grade grade_level NOT NULL,
    school_id INTEGER REFERENCES schools(id),
    status student_status DEFAULT 'active',
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Intervention templates/programs
CREATE TABLE IF NOT EXISTS intervention_programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type intervention_type NOT NULL,
    duration_days INTEGER, -- Expected duration
    materials TEXT, -- Materials needed
    goals TEXT, -- Program goals
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Main interventions table
CREATE TABLE IF NOT EXISTS interventions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    program_id INTEGER REFERENCES intervention_programs(id),
    type intervention_type NOT NULL,
    status intervention_status DEFAULT 'planned',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goals TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    frequency VARCHAR(100), -- e.g., "Daily", "3x per week"
    duration_minutes INTEGER, -- Session duration
    location VARCHAR(255),
    assigned_to INTEGER REFERENCES users(id), -- Primary staff responsible
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    completion_notes TEXT
);

-- Intervention sessions/progress tracking
CREATE TABLE IF NOT EXISTS intervention_sessions (
    id SERIAL PRIMARY KEY,
    intervention_id INTEGER NOT NULL REFERENCES interventions(id),
    session_date DATE NOT NULL,
    duration_minutes INTEGER,
    attended BOOLEAN DEFAULT true,
    progress_notes TEXT,
    challenges TEXT,
    next_steps TEXT,
    recorded_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Intervention team members (multiple staff can be involved)
CREATE TABLE IF NOT EXISTS intervention_team (
    id SERIAL PRIMARY KEY,
    intervention_id INTEGER NOT NULL REFERENCES interventions(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    role VARCHAR(100), -- e.g., "Lead Teacher", "Counselor", "Specialist"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(intervention_id, user_id)
);

-- Intervention goals and outcomes
CREATE TABLE IF NOT EXISTS intervention_goals (
    id SERIAL PRIMARY KEY,
    intervention_id INTEGER NOT NULL REFERENCES interventions(id),
    goal_text TEXT NOT NULL,
    target_date DATE,
    is_achieved BOOLEAN DEFAULT false,
    achieved_date DATE,
    evidence TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Intervention attachments (link to existing documents table)
CREATE TABLE IF NOT EXISTS intervention_attachments (
    id SERIAL PRIMARY KEY,
    intervention_id INTEGER NOT NULL REFERENCES interventions(id),
    document_id INTEGER NOT NULL REFERENCES documents(id),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id),
    UNIQUE(intervention_id, document_id)
);

-- Student guardians/parents
CREATE TABLE IF NOT EXISTS student_guardians (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50), -- e.g., "Mother", "Father", "Guardian"
    email VARCHAR(255),
    phone VARCHAR(20),
    is_primary_contact BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Communication log for parent/guardian contacts
CREATE TABLE IF NOT EXISTS communication_log (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id),
    intervention_id INTEGER REFERENCES interventions(id),
    contact_type VARCHAR(50), -- e.g., "Email", "Phone", "Meeting"
    contact_date TIMESTAMP NOT NULL,
    contacted_person VARCHAR(255),
    summary TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);