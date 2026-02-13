-- Migration 012: Direct teacher-student assignments
-- Populated by SIS import or manual admin assignment.
-- Used for "assigned" scope row-level access control.

CREATE TABLE IF NOT EXISTS user_students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    relationship VARCHAR(50) DEFAULT 'teacher',
    source VARCHAR(20) DEFAULT 'manual',  -- 'sis' or 'manual'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_user_students_user_id ON user_students(user_id);
CREATE INDEX IF NOT EXISTS idx_user_students_student_id ON user_students(student_id);
CREATE INDEX IF NOT EXISTS idx_user_students_source ON user_students(source);
