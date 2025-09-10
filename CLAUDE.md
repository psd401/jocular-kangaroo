# CLAUDE.md

Jocular Kangaroo codebase guidance for Claude Code. Optimized for token efficiency and accuracy.

## 🚀 Quick Reference

```bash
# Development
npm run dev                # Start dev server (port 3000)
npm run build              # Build for production
npm run lint               # MUST pass before commit
npm run typecheck          # MUST pass before commit

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

**Always use MCP tools to verify structure**:
```bash
mcp__awslabs_postgres-mcp-server__get_table_schema
mcp__awslabs_postgres-mcp-server__run_query
```

**Data API Parameters**:
- `stringValue`, `longValue`, `booleanValue`, `doubleValue`, `isNull`

**Field Transformation** (DB returns snake_case, app uses camelCase):
```typescript
import { snakeToCamel } from "@/lib/db/field-mapper"

// Database returns: { user_id: 1, created_at: "2025-01-01" }
// App expects: { userId: 1, createdAt: "2025-01-01" }
const results = await executeSQL("SELECT user_id, created_at FROM users")
const transformed = results.map(row => snakeToCamel<UserType>(row))
```

## 📝 Server Action Template

```typescript
"use server"
import { createLogger, generateRequestId, startTimer, sanitizeForLogging } from "@/lib/logger"
import { handleError, ErrorFactories, createSuccess } from "@/lib/error-utils"
import { getServerSession } from "@/lib/auth/server-session"

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
    
    // Business logic
    const result = await executeSQL("SELECT * FROM ...", params)
    
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
- **NEVER** use `console.log`, `console.error`, `console.warn`
- **ALWAYS** use `createLogger()` from `@/lib/logger`
- **REQUIRED** in server actions: `generateRequestId()` and `startTimer()`
- **NO GENERIC** error messages like "DB error" - be specific

### TypeScript Standards:
- **NO** `any` types anywhere in codebase
- **FULL** type coverage required
- **STRICT** mode enabled and enforced

### Database Standards:
- **NEVER** modify migration files 001-005
- **ALWAYS** add new migrations as 006+ 
- **VERIFY** schema with MCP tools before coding
- **USE** parameterized queries only

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