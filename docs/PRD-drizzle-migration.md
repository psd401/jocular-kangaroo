# Product Requirements Document: Drizzle ORM Migration

## 1. Executive Summary

### Problem Statement
The Jocular Kangaroo application currently uses direct AWS RDS Data API calls for all database operations, resulting in:
- Manual SQL string construction prone to errors
- Lack of type safety for database operations
- Complex parameter binding and result mapping
- Inconsistent database access patterns across the codebase
- Manual migration management without proper version control

### Proposed Solution  
Migrate all database operations to Drizzle ORM while maintaining the AWS RDS Data API as the underlying connection mechanism. This provides:
- Type-safe database queries with full TypeScript integration
- Automated schema synchronization and migration management
- Consistent database access patterns using Drizzle's query builder
- Improved developer experience with auto-completion and compile-time error checking
- Standardized migration workflow following Drizzle best practices

### Expected Outcomes
- **100% migration** from direct RDS Data API calls to Drizzle ORM
- **Zero downtime** during migration process
- **Improved type safety** eliminating runtime SQL errors
- **50% reduction** in database-related code complexity
- **Automated migrations** with proper version control and rollback capabilities

## 2. User Personas & Stories

### Primary Persona: Development Team
- **Role**: Full-stack developers working on Jocular Kangaroo
- **Jobs to be Done**: 
  - Write type-safe database queries
  - Manage schema changes efficiently
  - Debug database issues quickly
- **Pain Points**:
  - Manual SQL string construction is error-prone
  - No compile-time validation of queries
  - Complex parameter binding with RDS Data API
  - Difficulty tracking schema changes
- **Success Criteria**:
  - All database queries are type-safe
  - Schema changes are version controlled
  - Database operations have IntelliSense support

### User Stories

**Story 1: Type-Safe Database Queries**
As a developer
I want to write database queries with full type safety
So that I catch errors at compile time rather than runtime

Acceptance Criteria:
- Given a database table When I query it Then TypeScript knows the exact shape of returned data
- Given an invalid column name When I write a query Then TypeScript shows an error
- Given a schema change When I update the schema Then all affected queries show type errors

**Story 2: Automated Schema Migration**
As a developer
I want automated schema migration management
So that database changes are versioned and reproducible

Acceptance Criteria:
- Given a schema change When I run migration generation Then SQL files are created automatically
- Given pending migrations When I deploy Then migrations run in correct order
- Given a failed migration When it occurs Then the system can rollback safely

**Story 3: Consistent Database Access**
As a developer
I want a consistent API for all database operations
So that the codebase is maintainable and predictable

Acceptance Criteria:
- Given any database operation When implemented Then it uses Drizzle ORM patterns
- Given a new developer When they join Then they can understand database patterns quickly
- Given a complex query When written Then it follows established Drizzle patterns

## 3. Feature Specifications

### Functional Requirements

| Priority | Requirement | Success Criteria |
|----------|-------------|------------------|
| P0 (MVP) | Drizzle ORM setup with AWS Data API | Successfully connects to RDS via Data API using Drizzle |
| P0 (MVP) | Schema introspection from existing database | All 20 tables correctly mapped to Drizzle schema |
| P0 (MVP) | Migration of all executeSQL calls | 100% of direct API calls replaced with Drizzle |
| P0 (MVP) | Type-safe schema definitions | Full TypeScript types for all tables and columns |
| P0 (MVP) | Migration system implementation | Drizzle Kit manages all future migrations |
| P1 | Query optimization with Drizzle | Complex queries use Drizzle's query builder |
| P1 | Transaction support | All transactions use Drizzle's transaction API |
| P1 | Relation definitions | Foreign keys properly defined in Drizzle schema |
| P2 | Performance monitoring | Query performance tracked and optimized |
| P2 | Schema validation | Runtime validation of database constraints |

### Non-Functional Requirements
- **Performance**: Query execution time ≤ current implementation
- **Security**: Maintain parameterized queries, no SQL injection vulnerabilities
- **Compatibility**: Support existing AWS Amplify deployment
- **Reliability**: 99.9% uptime, graceful error handling
- **Developer Experience**: Full IntelliSense support, clear documentation

## 4. Technical Architecture

### System Design
```
Application Layer
    ↓
Drizzle ORM
    ↓
AWS RDS Data API Driver
    ↓
AWS RDS Aurora PostgreSQL
```

### Migration Strategy

#### Phase 1: Setup & Introspection (Week 1)
1. Install Drizzle ORM and AWS Data API packages
2. Configure drizzle.config.ts for AWS Data API
3. Run introspection to generate initial schema
4. Set up migration infrastructure

#### Phase 2: Schema Definition (Week 2)
1. Review and refine introspected schema
2. Add proper TypeScript types
3. Define relations between tables
4. Validate against existing database

#### Phase 3: Core Migration (Week 3-4)
1. Create Drizzle database client wrapper
2. Migrate lib/db/data-api-adapter.ts functions
3. Update all action files to use Drizzle
4. Convert API routes to Drizzle

#### Phase 4: Infrastructure Migration (Week 5)
1. Update Lambda migration handler
2. Convert SQL files to Drizzle migrations
3. Test migration pipeline
4. Update CDK deployment scripts

#### Phase 5: Testing & Optimization (Week 6)
1. Comprehensive testing of all queries
2. Performance benchmarking
3. Query optimization where needed
4. Documentation updates

### Data Model Example
```typescript
// Before (Raw SQL)
const sql = `
  SELECT * FROM users 
  WHERE cognito_sub = :cognitoSub
`;
const params = [
  { name: 'cognitoSub', value: { stringValue: sub } }
];
const result = await executeSQL(sql, params);

// After (Drizzle ORM)
const result = await db
  .select()
  .from(users)
  .where(eq(users.cognitoSub, sub));
```

### API Specification
```typescript
// Drizzle Configuration
export const db = drizzle(rdsClient, {
  database: process.env.RDS_DATABASE_NAME,
  secretArn: process.env.RDS_SECRET_ARN,
  resourceArn: process.env.RDS_RESOURCE_ARN,
  schema
});

// Schema Definition
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  cognitoSub: varchar('cognito_sub', { length: 255 }).unique(),
  email: varchar('email', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastSignInAt: timestamp('last_sign_in_at')
});
```

## 5. Implementation Plan

### Week 1-2: Foundation
- Set up Drizzle ORM with AWS Data API driver
- Run database introspection
- Generate and validate schema files
- Create migration infrastructure

### Week 3-4: Core Features
- Implement Drizzle database client
- Migrate core database adapter functions
- Convert user management queries
- Update authentication flows

### Week 5: Infrastructure
- Update Lambda migration handlers
- Convert existing migrations to Drizzle format
- Test deployment pipeline
- Update environment configurations

### Week 6: Launch
- Performance testing and optimization
- Complete documentation
- Team training on Drizzle patterns
- Production deployment

## 6. Success Metrics

### 30 Days Post-Launch
- 100% of database queries using Drizzle ORM
- 0 SQL injection vulnerabilities
- <5% performance degradation
- 100% type coverage for database operations

### 60 Days Post-Launch
- 50% reduction in database-related bugs
- 30% faster development of new features
- All developers trained on Drizzle patterns
- Migration system successfully used for 3+ schema changes

### 90 Days Post-Launch
- 70% reduction in database debugging time
- Established best practices documentation
- Automated performance monitoring in place
- Full team adoption and satisfaction

## 7. Migration Checklist

### Pre-Migration
- [ ] Backup production database
- [ ] Document all custom SQL functions
- [ ] Inventory all database operations
- [ ] Set up development environment

### During Migration
- [ ] Introspect existing schema
- [ ] Validate generated types
- [ ] Migrate core functions
- [ ] Update all action files
- [ ] Convert API routes
- [ ] Update Lambda functions
- [ ] Migrate test suites

### Post-Migration
- [ ] Performance benchmarking
- [ ] Security audit
- [ ] Documentation update
- [ ] Team training
- [ ] Production deployment
- [ ] Monitor for issues

## 8. Risk Mitigation

### Identified Risks
1. **Performance Degradation**
   - Mitigation: Benchmark all queries, optimize as needed
   
2. **Breaking Changes**
   - Mitigation: Comprehensive testing, staged rollout
   
3. **Migration Failures**
   - Mitigation: Implement rollback procedures, test thoroughly
   
4. **Learning Curve**
   - Mitigation: Provide training, create documentation

## 9. Dependencies

### Technical Dependencies
- drizzle-orm package
- @aws-sdk/client-rds-data
- drizzle-kit for migrations
- PostgreSQL dialect support

### Team Dependencies
- Database administrator for schema review
- DevOps for deployment updates
- QA for comprehensive testing
- All developers for code migration

## 10. Open Questions

1. Should we maintain backward compatibility during migration?
2. How do we handle custom SQL functions and procedures?
3. What is the rollback strategy if issues arise?
4. Should we migrate all tables at once or incrementally?

## Appendix: File-by-File Migration Plan

### Core Database Files
1. `/lib/db/data-api-adapter.ts` - Primary migration target
2. `/lib/db/data-api-client.ts` - Replace with Drizzle client
3. `/lib/db/field-mapper.ts` - May become obsolete with Drizzle

### Action Files (18 files)
- `/actions/db/*.ts` - All need Drizzle conversion

### API Routes (7 files)
- `/app/api/**/*.ts` - Convert direct SQL to Drizzle

### Infrastructure
- `/infra/database/lambda/index.ts` - Migration handler
- `/infra/database/lambda/db-init-handler.ts` - Initial setup
- `/infra/database/schema/*.sql` - Convert to Drizzle migrations

### Configuration
- Create `/drizzle.config.ts` - Drizzle configuration
- Create `/src/db/schema.ts` - Type-safe schema definitions
- Update `.env` files - Add any new variables

---
*Document Version: 1.0*
*Last Updated: September 2025*
*Status: Ready for Review*