# CLAUDE.md

Jocular Kangaroo codebase guidance for Claude Code. Optimized for token efficiency and accuracy.

## 🚀 Quick Reference

```bash
# Development
npm run dev                # Start dev server (port 3000)
npm run build              # Build for production
npm run lint               # MUST pass before commit
npm run typecheck          # MUST pass before commit

# Database (Drizzle ORM)
npm run db:studio          # Visual database browser
npm run db:generate        # Generate migrations
npm run db:push            # Push schema changes
npm run db:pull            # Pull schema from database
npm run db:test-casing     # Test automatic casing transformation

# Infrastructure (from /infra)
cd infra && npx cdk deploy --all                                # Deploy all stacks
cd infra && npx cdk deploy JocularKangaroo-FrontendStack-Dev   # Deploy single stack
```

## 🎯 Critical Rules

1. **Type Safety**: NO `any` types. Full TypeScript. Run `npm run lint` and `npm run typecheck` on ENTIRE codebase before commits.
2. **Database Migrations**: Files 001-005 are IMMUTABLE. Only add migrations 006+. Add filename to `MIGRATION_FILES` array in `/infra/database/lambda/index.ts`.
3. **Logging**: NEVER use `console.log/error`. Always use `@/lib/logger`. See patterns below.
4. **Git Flow**: PRs target `dev` branch, never `main`. Write detailed commit messages.
5. **Testing**: Add tests for new features and run them before commits.

## 🏗️ Architecture

**Stack**: Next.js 15 App Router • AWS Amplify SSR • Aurora Serverless v2 • Cognito Auth

**Core Patterns**:
- Server Actions return `ActionState<T>` 
- RDS Data API for all DB operations
- JWT sessions via NextAuth v5
- Layered architecture (presentation → application → infrastructure)

**File Structure**:
```
/app         → Pages & API routes
/actions     → Server actions (*.actions.ts)
/components  → UI components
/lib         → Core utilities & adapters
/infra       → AWS CDK infrastructure
```

## 🗄️ Database Operations

**Modern Approach - Drizzle ORM with Automatic Casing**:
```typescript
import { db } from "@/lib/db/drizzle-client"
import { users } from "@/src/db/schema"
import { eq } from "drizzle-orm"

// ✅ Automatic snake_case ↔ camelCase transformation
const user = await db.select().from(users).where(eq(users.firstName, "John"))
console.log(user[0].firstName)  // Automatic camelCase result!
console.log(user[0].createdAt)  // No manual transformation needed!
```

**Legacy Approach - Direct Data API** (⚠️ Being phased out):
```bash
# Use MCP tools to verify structure when needed
mcp__awslabs_postgres-mcp-server__get_table_schema
mcp__awslabs_postgres-mcp-server__run_query
```

**Casing Configuration** (✅ Automatically configured):
- **Database columns**: snake_case (`first_name`, `created_at`, `user_id`)
- **TypeScript properties**: camelCase (`firstName`, `createdAt`, `userId`)
- **Automatic transformation**: Enabled via `casing: "snake_case"` in drizzle.config.ts and drizzle-client.ts

## 📝 Server Action Template (Modern Drizzle Approach)

```typescript
"use server"
import { createLogger, generateRequestId, startTimer, sanitizeForLogging } from "@/lib/logger"
import { handleError, ErrorFactories, createSuccess } from "@/lib/error-utils"
import { getServerSession } from "@/lib/auth/server-session"
import { db } from "@/lib/db/drizzle-client"
import { users } from "@/src/db/schema"
import { eq } from "drizzle-orm"

export async function actionName(params: ParamsType): Promise<ActionState<ReturnType>> {
  const requestId = generateRequestId()
  const timer = startTimer("actionName")
  const log = createLogger({ requestId, action: "actionName" })

  try {
    log.info("Action started", { params: sanitizeForLogging(params) })

    // Auth check
    const session = await getServerSession()
    if (!session) {
      log.warn("Unauthorized")
      throw ErrorFactories.authNoSession()
    }

    // ✅ Modern Drizzle query with automatic casing
    const result = await db
      .select()
      .from(users)
      .where(eq(users.cognitoSub, session.user.sub))

    // Result automatically has camelCase properties! 🎉
    log.info("Query result", {
      userCount: result.length,
      firstName: result[0]?.firstName // Automatic camelCase
    })

    timer({ status: "success" })
    log.info("Action completed")
    return createSuccess(result, "Success message")

  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "User-friendly error", {
      context: "actionName",
      requestId,
      operation: "actionName"
    })
  }
}
```

## 🔒 Security

- Routes under `/(protected)` require authentication
- Role-based access via `hasToolAccess("tool-name")` - checks if user has permission
- Parameterized queries prevent SQL injection
- Secrets in AWS Secrets Manager
- `sanitizeForLogging()` for PII protection

## 📦 Key Dependencies

- `next@15.2.3` - Next.js framework
- `next-auth@5.0.0-beta.29` - Authentication
- AWS SDK v3 clients for cloud services

## 🚨 Critical Rules for Code Quality

Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask.

### BEFORE ANY COMMIT:
1. **MUST RUN**: `npm run lint` - Fix ALL errors
2. **MUST RUN**: `npm run typecheck` - Fix ALL type errors
3. **NO EXCEPTIONS**: Both must pass with zero errors

### Logging Standards:
- **NEVER** use `console.log`, `console.error`, `console.warn` in application code
- **ALWAYS** use `createLogger()` from `@/lib/logger`
- **REQUIRED** in server actions: `generateRequestId()` and `startTimer()`
- **NO GENERIC** error messages like "DB error" - be specific
- **EXCEPTION**: Lambda infrastructure code (e.g., `/infra/database/lambda/`) uses its own structured logger (`logger.ts`) optimized for CloudWatch. This logger outputs JSON to stdout which CloudWatch captures and indexes.

### TypeScript Standards:
- **NO** `any` types anywhere in codebase
- **FULL** type coverage required
- **STRICT** mode enabled and enforced

### Database Standards:
- **NEVER** modify migration files 001-005
- **ALWAYS** add new migrations as 006+
- **USE** Drizzle ORM with automatic casing (snake_case DB ↔ camelCase TS)
- **VERIFY** schema with MCP tools or `src/db/schema.ts` before coding
- **PREFER** Drizzle queries over direct SQL for type safety

## 🚨 Common Pitfalls

- **Don't** modify files 001-005 in `/infra/database/schema/`
- **Don't** use console methods - ESLint will catch this
- **Don't** create PRs against `main` - use `dev`
- **Don't** skip type checking - entire codebase must pass
- **Don't** trust app code for DB schema - use MCP tools
- **Don't** commit without running lint and typecheck

## 📖 Documentation

**Structure:**
```
/docs/
├── DEPLOYMENT.md       # Deployment guide
├── AUTH_SETUP.md       # Authentication setup
└── *.md               # Various documentation
```

**Maintenance:**
- Keep docs current with code changes
- Update when adding new features
- Remove outdated content

---
*Strict quality standards enforced. Last updated: September 2025*