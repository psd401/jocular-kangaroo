import { executeSQL } from "@/lib/db/data-api-adapter"
import logger from "@/lib/logger"
import type { AuditLogEntry } from "./types"

/**
 * Writes a single audit log entry to `data_access_log`.
 * Fire-and-forget: catches all errors internally so it never breaks
 * the calling operation.
 */
export function logDataAccess(entry: AuditLogEntry): void {
  const sql = `
    INSERT INTO data_access_log (user_id, action, entity_type, entity_id, metadata, request_id)
    VALUES ($1, $2, $3, $4, $5, $6)
  `

  const params = [
    { name: "1", value: { longValue: entry.userId } },
    { name: "2", value: { stringValue: entry.action } },
    { name: "3", value: { stringValue: entry.entityType } },
    { name: "4", value: entry.entityId != null ? { longValue: entry.entityId } : { isNull: true } },
    {
      name: "5",
      value: entry.metadata
        ? { stringValue: JSON.stringify(entry.metadata) }
        : { isNull: true },
    },
    {
      name: "6",
      value: entry.requestId
        ? { stringValue: entry.requestId }
        : { isNull: true },
    },
  ]

  // Fire and forget — do not await
  executeSQL(sql, params).catch((err) => {
    logger.warn("Failed to write audit log entry", {
      error: err instanceof Error ? err.message : String(err),
      entry: { action: entry.action, entityType: entry.entityType },
    })
  })
}

/**
 * Writes a single summary audit log entry for list/batch operations.
 * Includes result count and entity IDs in metadata.
 */
export function logDataAccessBatch(
  entry: Omit<AuditLogEntry, "entityId">,
  entityIds: number[],
  resultCount: number
): void {
  logDataAccess({
    ...entry,
    metadata: {
      ...entry.metadata,
      resultCount,
      entityIds: entityIds.slice(0, 100), // cap to avoid oversized JSONB
    },
  })
}
