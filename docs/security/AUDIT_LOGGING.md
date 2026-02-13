# Audit Logging

## Overview

FERPA requires educational institutions to maintain records of who accessed student data. The `data_access_log` table records every data access event.

## Schema

```sql
CREATE TABLE data_access_log (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action VARCHAR(20) NOT NULL,        -- view, list, create, update, delete
    entity_type VARCHAR(50) NOT NULL,   -- student, intervention, school, etc.
    entity_id INTEGER,                  -- specific record ID (null for list ops)
    metadata JSONB,                     -- resultCount, entityIds, filters, etc.
    ip_address VARCHAR(45),             -- reserved for future use
    request_id VARCHAR(20),             -- correlates with application logs
    created_at TIMESTAMP NOT NULL
);
```

## Actions Logged

| Action | Entity Types | When |
|--------|-------------|------|
| `list` | student, intervention, school | Fetching lists (includes resultCount in metadata) |
| `view` | student, intervention | Fetching single record by ID |
| `create` | student, intervention | Creating new records |
| `update` | student, intervention | Updating existing records |
| `delete` | student, intervention | Deleting (soft or hard) records |

## Retention Policy

- **FERPA requirement**: 7 years minimum
- **Current implementation**: No auto-deletion
- **Future consideration**: Partition by year when row count exceeds 10M

## Fire-and-Forget Design

Audit log writes are intentionally non-blocking:
- `logDataAccess()` calls `executeSQL().catch()` internally
- Failed writes are logged as warnings but never throw
- User operations are never blocked by audit failures

## Query Examples

### Recent access to a specific student
```sql
SELECT d.*, u.email, u.first_name, u.last_name
FROM data_access_log d
JOIN users u ON d.user_id = u.id
WHERE d.entity_type = 'student' AND d.entity_id = 123
ORDER BY d.created_at DESC
LIMIT 50;
```

### All data access by a specific user in a date range
```sql
SELECT * FROM data_access_log
WHERE user_id = 5
  AND created_at BETWEEN '2025-01-01' AND '2025-12-31'
ORDER BY created_at DESC;
```

### Daily access summary
```sql
SELECT
  DATE(created_at) as access_date,
  action,
  entity_type,
  COUNT(*) as access_count
FROM data_access_log
GROUP BY DATE(created_at), action, entity_type
ORDER BY access_date DESC;
```

## Indexes

| Index | Columns | Use Case |
|-------|---------|----------|
| `idx_data_access_log_user_id` | `user_id` | Per-user audit queries |
| `idx_data_access_log_entity` | `entity_type, entity_id` | Per-record audit trail |
| `idx_data_access_log_created_at` | `created_at` | Date range queries |
| `idx_data_access_log_action` | `action` | Action-type filtering |
