import { SqlParameter } from "@aws-sdk/client-rds-data"
import { executeSQL } from "@/lib/db/data-api-adapter"
import { getCurrentUserAction } from "@/actions/db/get-current-user-action"
import { ACCESS_CONTROL_CONFIG } from "./access-control-config"
import type {
  SecurityContext,
  AccessFilter,
  DataScope,
  AccessControlConfig,
} from "./types"
import logger from "@/lib/logger"

// ---------------------------------------------------------------------------
// Build security context
// ---------------------------------------------------------------------------

/**
 * Queries user_schools and user_students to build a SecurityContext.
 * Falls back to empty arrays if the tables don't have data yet.
 */
export async function buildSecurityContext(
  userId: number,
  roles: string[]
): Promise<SecurityContext> {
  let schoolIds: number[] = []
  let studentIds: number[] = []

  try {
    const schoolRows = await executeSQL(
      "SELECT school_id FROM user_schools WHERE user_id = $1",
      [{ name: "1", value: { longValue: userId } }]
    )
    schoolIds = schoolRows.map((r) => r.schoolId as number)
  } catch (err) {
    logger.warn("Could not query user_schools — table may not exist yet", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  try {
    const studentRows = await executeSQL(
      "SELECT student_id FROM user_students WHERE user_id = $1",
      [{ name: "1", value: { longValue: userId } }]
    )
    studentIds = studentRows.map((r) => r.studentId as number)
  } catch (err) {
    logger.warn("Could not query user_students — table may not exist yet", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return { userId, roles, schoolIds, studentIds }
}

// ---------------------------------------------------------------------------
// Resolve data scope
// ---------------------------------------------------------------------------

/**
 * Returns the highest-privilege scope from the user's role set.
 * If none of their roles are in the config, returns "assigned" (most restrictive).
 */
export function resolveDataScope(
  roles: string[],
  config: AccessControlConfig = ACCESS_CONTROL_CONFIG
): DataScope {
  const scopePriority: DataScope[] = ["all", "school", "assigned"]

  for (const scope of scopePriority) {
    for (const role of roles) {
      const roleCfg = config.roleScopes[role.toLowerCase()]
      if (roleCfg && roleCfg.scope === scope) {
        return scope
      }
    }
  }

  return "assigned"
}

// ---------------------------------------------------------------------------
// Student access filter
// ---------------------------------------------------------------------------

/**
 * Returns a SQL WHERE fragment that restricts students to those the user can see.
 *
 * Assumes the students table is aliased as `s` in the calling query.
 *
 * - `all` scope: no filter
 * - `school` scope: s.school_id IN (user's schools)
 * - `assigned` scope: school filter + student must be in user_students OR
 *   linked via interventions (assigned_to, created_by, intervention_team)
 *
 * If the user has no school assignments, returns `AND FALSE` (sees nothing).
 */
export function buildStudentAccessFilter(
  ctx: SecurityContext,
  startParamIndex: number,
  config: AccessControlConfig = ACCESS_CONTROL_CONFIG
): AccessFilter {
  const scope = resolveDataScope(ctx.roles, config)

  if (scope === "all") {
    return { sql: "", parameters: [], nextParamIndex: startParamIndex }
  }

  // No school assignments = sees nothing
  if (ctx.schoolIds.length === 0) {
    return { sql: " AND FALSE", parameters: [], nextParamIndex: startParamIndex }
  }

  const params: SqlParameter[] = []
  let idx = startParamIndex

  // School filter — applies to both "school" and "assigned"
  const schoolPlaceholders = ctx.schoolIds.map((schoolId) => {
    params.push({ name: `${idx}`, value: { longValue: schoolId } })
    return `$${idx++}`
  })
  let sql = ` AND s.school_id IN (${schoolPlaceholders.join(", ")})`

  if (scope === "assigned") {
    // User ID param (used multiple times via same index)
    const userIdIdx = idx
    params.push({ name: `${userIdIdx}`, value: { longValue: ctx.userId } })
    idx++

    sql += ` AND s.id IN (
      SELECT student_id FROM user_students WHERE user_id = $${userIdIdx}
      UNION
      SELECT student_id FROM interventions WHERE assigned_to = $${userIdIdx}
      UNION
      SELECT student_id FROM interventions WHERE created_by = $${userIdIdx}
      UNION
      SELECT i.student_id FROM interventions i
        JOIN intervention_team it ON it.intervention_id = i.id
        WHERE it.user_id = $${userIdIdx}
    )`
  }

  return { sql, parameters: params, nextParamIndex: idx }
}

// ---------------------------------------------------------------------------
// Intervention access filter
// ---------------------------------------------------------------------------

/**
 * Returns a SQL WHERE fragment that restricts interventions.
 *
 * Assumes the interventions table is aliased as `i` and students as `s` (via JOIN).
 *
 * - `all`: no filter
 * - `school`: student's school must be in user's schools
 * - `assigned`: school filter + user must be assigned_to, created_by, or on team
 */
export function buildInterventionAccessFilter(
  ctx: SecurityContext,
  startParamIndex: number,
  config: AccessControlConfig = ACCESS_CONTROL_CONFIG
): AccessFilter {
  const scope = resolveDataScope(ctx.roles, config)

  if (scope === "all") {
    return { sql: "", parameters: [], nextParamIndex: startParamIndex }
  }

  if (ctx.schoolIds.length === 0) {
    return { sql: " AND FALSE", parameters: [], nextParamIndex: startParamIndex }
  }

  const params: SqlParameter[] = []
  let idx = startParamIndex

  // School filter via student
  const schoolPlaceholders = ctx.schoolIds.map((schoolId) => {
    params.push({ name: `${idx}`, value: { longValue: schoolId } })
    return `$${idx++}`
  })
  let sql = ` AND s.school_id IN (${schoolPlaceholders.join(", ")})`

  if (scope === "assigned") {
    const userIdIdx = idx
    params.push({ name: `${userIdIdx}`, value: { longValue: ctx.userId } })
    idx++

    sql += ` AND (
      i.assigned_to = $${userIdIdx}
      OR i.created_by = $${userIdIdx}
      OR EXISTS (
        SELECT 1 FROM intervention_team it
        WHERE it.intervention_id = i.id AND it.user_id = $${userIdIdx}
      )
      OR i.student_id IN (
        SELECT student_id FROM user_students WHERE user_id = $${userIdIdx}
      )
    )`
  }

  return { sql, parameters: params, nextParamIndex: idx }
}

// ---------------------------------------------------------------------------
// School access filter
// ---------------------------------------------------------------------------

/**
 * Filters the school list. Assumes schools table is the main table (no alias needed,
 * uses `id` directly).
 *
 * - `all` scope: no filter
 * - Otherwise: restrict to user's assigned schools
 */
export function buildSchoolAccessFilter(
  ctx: SecurityContext,
  startParamIndex: number,
  config: AccessControlConfig = ACCESS_CONTROL_CONFIG
): AccessFilter {
  const scope = resolveDataScope(ctx.roles, config)

  if (scope === "all") {
    return { sql: "", parameters: [], nextParamIndex: startParamIndex }
  }

  if (ctx.schoolIds.length === 0) {
    return { sql: " AND FALSE", parameters: [], nextParamIndex: startParamIndex }
  }

  const params: SqlParameter[] = []
  let idx = startParamIndex

  const placeholders = ctx.schoolIds.map((schoolId) => {
    params.push({ name: `${idx}`, value: { longValue: schoolId } })
    return `$${idx++}`
  })

  return {
    sql: ` AND id IN (${placeholders.join(", ")})`,
    parameters: params,
    nextParamIndex: idx,
  }
}

// ---------------------------------------------------------------------------
// Convenience: get security context for current user
// ---------------------------------------------------------------------------

/**
 * Gets the current authenticated user and builds their SecurityContext.
 * Returns null if not authenticated.
 */
export async function getSecurityContext(): Promise<SecurityContext | null> {
  const userResult = await getCurrentUserAction()
  if (!userResult.isSuccess || !userResult.data) {
    return null
  }

  const { user, roles } = userResult.data
  return buildSecurityContext(
    user.id,
    roles.map((r) => r.name)
  )
}
