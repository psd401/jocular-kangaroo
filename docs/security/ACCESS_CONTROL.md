# Access Control

## Role Hierarchy

| Role | Scope | Sees |
|------|-------|------|
| Administrator | `all` | All students, all schools, all interventions |
| Principal | `school` | All students and interventions at their assigned school(s) |
| Teacher | `assigned` | SIS-rostered students + intervention relationships, within their school(s) |
| Counselor | `assigned` | Same as Teacher |
| Specialist | `assigned` | Same as Teacher |
| Nurse | `assigned` | Same as Teacher |

## Scope Definitions

### `all`
No filter applied. User sees every record.

### `school`
Records filtered by `user_schools` junction table. User only sees records at schools they're assigned to.

### `assigned`
Two-layer filter:
1. **School filter** (same as `school` scope)
2. **Student filter** within those schools via UNION of:
   - `user_students` table (SIS roster / manual assignments)
   - `interventions.assigned_to` (intervention assignment)
   - `interventions.created_by` (intervention creator)
   - `intervention_team.user_id` (team membership)

This means a teacher sees students from their SIS roster AND any student they have an intervention relationship with, but only at their assigned school(s).

## Scope Resolution

When a user has multiple roles, the **highest-privilege** scope wins. Priority order: `all` > `school` > `assigned`.

Example: User with both "Teacher" and "Principal" roles resolves to `school` scope.

## Fail-Closed Behavior

- User with no school assignments sees **nothing** (filter returns `AND FALSE`)
- Unknown roles default to `assigned` (most restrictive)
- New users default to "Teacher" role

## Configuration

Edit `/lib/security/access-control-config.ts` to modify the role hierarchy:

```typescript
export const ACCESS_CONTROL_CONFIG: AccessControlConfig = {
  rolePriority: ["Administrator", "Principal", "Teacher", ...],
  roleScopes: {
    administrator: { scope: "all" },
    principal:     { scope: "school" },
    teacher:       { scope: "assigned" },
    // Add new roles here
  },
}
```

## Database Tables

### `user_schools`
```sql
-- Maps users to schools they can access
user_id  | school_id | is_primary
---------|-----------|----------
1        | 10        | true
1        | 11        | false
```

### `user_students`
```sql
-- Direct teacher-student assignments (SIS or manual)
user_id | student_id | relationship | source
--------|------------|-------------|-------
1       | 100        | teacher     | sis
1       | 101        | teacher     | manual
```
