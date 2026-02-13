// Types
export type {
  SecurityContext,
  AccessFilter,
  DataScope,
  RoleScopeConfig,
  AccessControlConfig,
  AuditLogEntry,
  AuditAction,
  AuditEntityType,
  RateLimitConfig,
} from "./types"

// Config
export { ACCESS_CONTROL_CONFIG } from "./access-control-config"

// Access control
export {
  buildSecurityContext,
  resolveDataScope,
  buildStudentAccessFilter,
  buildInterventionAccessFilter,
  buildSchoolAccessFilter,
  getSecurityContext,
} from "./access-control"

// Audit logging
export { logDataAccess, logDataAccessBatch } from "./audit-logger"

// Rate limiting
export { checkActionRateLimit } from "./rate-limiter"
