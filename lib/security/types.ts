import { SqlParameter } from "@aws-sdk/client-rds-data"

// --- Data Scope ---

/** Determines how broadly a role can see data */
export type DataScope = "all" | "school" | "assigned"

// --- Security Context ---

/** Built per-request from the current user's DB relationships */
export interface SecurityContext {
  userId: number
  roles: string[]
  schoolIds: number[]
  studentIds: number[]
}

// --- Access Filter ---

/** SQL WHERE fragment + parameters returned by filter builders */
export interface AccessFilter {
  /** SQL fragment to append (e.g., "AND s.school_id IN ($3, $4)"), empty string if no filter needed */
  sql: string
  /** RDS Data API parameters for the fragment */
  parameters: SqlParameter[]
  /** Next available parameter index after the ones used */
  nextParamIndex: number
}

// --- Role Configuration ---

/** Per-role scope configuration */
export interface RoleScopeConfig {
  scope: DataScope
}

/** Top-level access control configuration — swap this for a new project */
export interface AccessControlConfig {
  /** Role names in priority order (highest privilege first) */
  rolePriority: string[]
  /** Maps role name (lowercase) to its scope config */
  roleScopes: Record<string, RoleScopeConfig>
}

// --- Audit Logging ---

export type AuditAction = "view" | "list" | "create" | "update" | "delete"

export type AuditEntityType =
  | "student"
  | "intervention"
  | "intervention_session"
  | "intervention_goal"
  | "school"

export interface AuditLogEntry {
  userId: number
  action: AuditAction
  entityType: AuditEntityType
  entityId?: number
  metadata?: Record<string, unknown>
  requestId?: string
}

// --- Rate Limiting ---

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number
  /** Window size in milliseconds */
  windowMs: number
}
