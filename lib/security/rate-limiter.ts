import type { RateLimitConfig } from "./types"

/** Default: 100 requests per minute per user per action */
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60_000,
}

interface WindowEntry {
  timestamps: number[]
}

/**
 * In-memory sliding-window rate limiter for server actions.
 * Keyed by `userId:actionName`.
 *
 * This complements the existing `/lib/rate-limit.ts` which works with
 * NextRequest API routes. This version works in server action context
 * where there is no NextRequest object.
 */
const windows = new Map<string, WindowEntry>()

/** Periodically clean up expired windows to prevent memory leaks */
let cleanupScheduled = false

function scheduleCleanup(): void {
  if (cleanupScheduled) return
  cleanupScheduled = true

  setTimeout(() => {
    cleanupScheduled = false
    const now = Date.now()
    const maxWindowMs = 5 * 60_000 // clean entries older than 5 minutes

    for (const [key, entry] of windows.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < maxWindowMs)
      if (entry.timestamps.length === 0) {
        windows.delete(key)
      }
    }
  }, 60_000) // run cleanup every 60 seconds
}

/**
 * Checks whether the given user+action is within rate limits.
 *
 * @returns `true` if the request is allowed, `false` if rate-limited.
 */
export function checkActionRateLimit(
  userId: number,
  actionName: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): boolean {
  const key = `${userId}:${actionName}`
  const now = Date.now()
  const windowStart = now - config.windowMs

  let entry = windows.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    windows.set(key, entry)
  }

  // Prune timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  if (entry.timestamps.length >= config.maxRequests) {
    return false
  }

  entry.timestamps.push(now)
  scheduleCleanup()
  return true
}
