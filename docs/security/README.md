# Security Architecture

## Overview

Jocular Kangaroo implements FERPA-compliant row-level data isolation, audit logging, and rate limiting. All security logic lives in `/lib/security/` for CIO auditability and portability to new projects.

## Module Structure

```
/lib/security/
  types.ts                  # Shared interfaces
  access-control-config.ts  # Portable role-to-scope mapping (swap per project)
  access-control.ts         # Core filter builders + security context
  audit-logger.ts           # Fire-and-forget FERPA audit logging
  rate-limiter.ts           # In-memory per-user rate limiter for server actions
  index.ts                  # Barrel exports
```

## Design Principles

1. **Configuration-driven**: Role hierarchy defined in `access-control-config.ts`. Swap this file for a new project.
2. **SQL-injection safe**: Filters use parameterized `$N` placeholders matching RDS Data API conventions.
3. **Fire-and-forget audit**: Audit log writes never block or break user operations.
4. **Fail-closed**: Missing school assignments = user sees nothing (returns `AND FALSE`).
5. **Additive filters**: Access filters append to existing WHERE clauses via `AND` fragments.

## Database Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| `user_schools` | 011 | Maps users to their assigned school(s) |
| `user_students` | 012 | SIS roster or manual teacher-student assignments |
| `data_access_log` | 013 | FERPA audit trail (7-year retention) |

## Related Documentation

- [Access Control](./ACCESS_CONTROL.md) - Role hierarchy, scope definitions
- [Audit Logging](./AUDIT_LOGGING.md) - Schema, retention, query examples
- [Integration Guide](./INTEGRATION_GUIDE.md) - How to add security to new actions
- [Verification](./VERIFICATION.md) - Manual test scenarios
