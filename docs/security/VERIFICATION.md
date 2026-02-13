# Security Verification

## Manual Test Scenarios

### 1. Admin User (scope: `all`)

**Setup**: User with "Administrator" role

| Test | Expected Result |
|------|----------------|
| GET students list | Sees all students across all schools |
| GET interventions list | Sees all interventions |
| GET schools list | Sees all schools |
| GET student by ID | Can view any student |
| GET /api/health | Returns health check data |

### 2. Principal User (scope: `school`)

**Setup**: User with "Principal" role, assigned to School A via `user_schools`

| Test | Expected Result |
|------|----------------|
| GET students list | Sees only students at School A |
| GET interventions list | Sees only interventions for students at School A |
| GET schools list | Sees only School A |
| GET student by ID (School A) | Returns student data |
| GET student by ID (School B) | Returns "Student not found" |
| GET /api/health | Returns 403 Forbidden |

### 3. Teacher User (scope: `assigned`)

**Setup**: User with "Teacher" role, assigned to School A, with SIS roster of students [100, 101], and an intervention assigned for student 102

| Test | Expected Result |
|------|----------------|
| GET students list | Sees students 100, 101, 102 only (roster + intervention relationship) |
| GET student by ID (100) | Returns student data |
| GET student by ID (200, not rostered) | Returns "Student not found" |
| GET interventions list | Sees interventions they created, are assigned to, or are team members of |
| GET schools list | Sees only School A |

### 4. User With No School Assignments

**Setup**: User with any role, but no rows in `user_schools` (non-admin)

| Test | Expected Result |
|------|----------------|
| GET students list | Returns empty list |
| GET interventions list | Returns empty list |
| GET schools list | Returns empty list |

### 5. Unauthenticated User

| Test | Expected Result |
|------|----------------|
| GET /api/health | Redirected to login (middleware) then 401 |
| GET /api/db/test-connection | Redirected to login (middleware) then 401 |

## Audit Log Verification

After performing any of the above operations, verify entries in `data_access_log`:

```sql
SELECT * FROM data_access_log
ORDER BY created_at DESC
LIMIT 20;
```

Expected fields:
- `user_id` matches the acting user
- `action` matches the operation (list, view, create, update, delete)
- `entity_type` matches the resource accessed
- `metadata` contains `resultCount` for list operations

## Rate Limit Testing

1. Send >100 requests to any action within 60 seconds
2. Expect: First 100 succeed, subsequent return "Rate limit exceeded"
3. Wait 60 seconds, verify requests succeed again

## Pagination Testing

1. Call `getStudentsAction({ limit: 5, offset: 0 })`
2. Verify: Returns max 5 records
3. Call with `limit: 1000` — verify it caps at 500
4. Call with different offsets to verify proper pagination
