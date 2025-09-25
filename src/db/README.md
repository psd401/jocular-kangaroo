# Database Schema

This directory contains the complete type-safe database schema definitions generated via introspection of the PostgreSQL database.

## Files

- **`schema.ts`** - Main schema file containing all 20 table definitions and 9 enum types
- **`relations.ts`** - Relational definitions between tables for proper joins and data fetching
- **`types.ts`** - TypeScript type definitions for all tables (select and insert types)
- **`README.md`** - This documentation file

## Tables (20 total)

### Core System
- `users` - User accounts and authentication data
- `roles` - Role definitions for access control
- `user_roles` - Many-to-many relationship between users and roles
- `tools` - Available tools/applications in the system
- `role_tools` - Many-to-many relationship between roles and tools
- `navigation_items` - Navigation menu structure
- `settings` - System configuration settings
- `jobs` - Background job queue and status tracking
- `migration_log` - Database migration execution history

### School Management
- `schools` - School information and metadata
- `students` - Student records and personal information
- `student_guardians` - Guardian/parent contact information

### Intervention System
- `intervention_programs` - Predefined intervention program templates
- `interventions` - Individual intervention instances for students
- `intervention_goals` - Specific goals for each intervention
- `intervention_sessions` - Session notes and attendance tracking
- `intervention_team` - Team members assigned to interventions
- `intervention_attachments` - Documents attached to interventions

### Document Management
- `documents` - File metadata and S3 references
- `communication_log` - Communication history and follow-ups

## Enums (9 total)

- `execution_status` - Job/process execution states
- `field_type` - Form field types for dynamic forms
- `grade_level` - K-12 grade levels
- `intervention_status` - Intervention lifecycle states
- `intervention_type` - Categories of interventions
- `job_status` - Background job states
- `navigation_type` - Navigation item types
- `student_status` - Student enrollment status
- `tool_status` - Tool approval workflow states

## Usage

### Modern Drizzle ORM with Automatic Casing

```typescript
import { db } from '@/lib/db/drizzle-client';
import { users, students, interventions } from '@/src/db/schema';
import { User, Student, NewIntervention } from '@/src/db/types';
import { eq, and, desc } from 'drizzle-orm';

// ✅ Automatic snake_case (DB) ↔ camelCase (TypeScript) transformation
const user = await db.select().from(users).where(eq(users.cognitoSub, 'abc123'));
console.log(user[0].firstName); // Automatic camelCase property!

// ✅ Complex queries with relations
const studentWithInterventions = await db.query.students.findFirst({
  where: eq(students.id, studentId),
  with: {
    interventions: {
      orderBy: desc(interventions.createdAt)
    }
  }
});
```

### Configuration (Automatically Enabled)
- **Database columns**: snake_case format (`first_name`, `created_at`, `user_id`)
- **TypeScript properties**: camelCase format (`firstName`, `createdAt`, `userId`)
- **Transformation**: Automatic via `casing: "snake_case"` in `drizzle.config.ts` and `drizzle-client.ts`

## Relations

All foreign key relationships are properly defined with bidirectional relations for efficient querying:

- Users ↔ Students (created_by, updated_by)
- Students ↔ Schools
- Students ↔ Interventions
- Interventions ↔ Programs
- Interventions ↔ Goals/Sessions/Team
- Documents ↔ Attachments
- And many more...

## Generated

This schema was generated on September 25, 2025 via database introspection using the MCP Postgres tools, as `drizzle-kit pull` encountered AWS Data API limitations with the `regclass` PostgreSQL type.

All 20 tables successfully introspected with complete:
- ✅ Table structures and constraints
- ✅ Foreign key relationships
- ✅ Enum types and values
- ✅ Default values and nullable fields
- ✅ Type-safe schema definitions
- ✅ Bidirectional relations
- ✅ Insert and select type definitions