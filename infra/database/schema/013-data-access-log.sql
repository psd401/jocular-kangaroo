-- Migration 013: FERPA audit log for data access tracking
-- Retention: 7 years per FERPA requirements.
-- Consider partitioning by year when row count exceeds 10M.

CREATE TABLE IF NOT EXISTS data_access_log (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    metadata JSONB,
    ip_address VARCHAR(45),
    request_id VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_data_access_log_user_id ON data_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_log_entity ON data_access_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_data_access_log_created_at ON data_access_log(created_at);
CREATE INDEX IF NOT EXISTS idx_data_access_log_action ON data_access_log(action);
