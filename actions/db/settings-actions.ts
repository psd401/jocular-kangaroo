"use server"

import { getServerSession } from "@/lib/auth/server-session"
import { db } from "@/lib/db/drizzle-client"
import { settings } from "@/src/db/schema"
import { hasRole } from "@/lib/auth/role-helpers"
import { ActionState } from "@/types/actions-types"
import { createError, createSuccess, handleError } from "@/lib/error-utils"
import { createLogger, generateRequestId, startTimer, sanitizeForLogging } from "@/lib/logger"
import { revalidateSettingsCache } from "@/lib/settings-manager"
import { eq, sql } from "drizzle-orm"

export interface Setting {
  id: number
  key: string
  value: string | null
  description: string | null
  category: string | null
  isSecret: boolean
  hasValue?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateSettingInput {
  key: string
  value: string | null
  description?: string | null
  category?: string | null
  isSecret?: boolean
}

export interface UpdateSettingInput {
  key: string
  value: string | null
  description?: string | null
}

// Get all settings (admin only)
export async function getSettingsAction(): Promise<ActionState<Setting[]>> {
  const requestId = generateRequestId()
  const timer = startTimer("getSettingsAction")
  const log = createLogger({ requestId, action: "getSettingsAction" })

  try {
    log.info("Action started")

    const session = await getServerSession()
    if (!session) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Check if user is an administrator
    const isAdmin = await hasRole("administrator")
    if (!isAdmin) {
      log.warn("Access denied - not administrator", { userId: (session as any).user?.sub })
      throw createError("Only administrators can view settings", { code: "FORBIDDEN" })
    }

    const result = await db
      .select({
        id: settings.id,
        key: settings.key,
        value: sql<string>`
          CASE
            WHEN ${settings.isSecret} = true THEN '••••••••'
            ELSE ${settings.value}
          END
        `,
        hasValue: sql<boolean>`
          CASE
            WHEN ${settings.value} IS NOT NULL AND ${settings.value} != '' THEN true
            ELSE false
          END
        `,
        description: settings.description,
        category: settings.category,
        isSecret: settings.isSecret,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      })
      .from(settings)
      .orderBy(settings.category, settings.key)

    timer({ status: "success" })
    log.info("Settings retrieved successfully", { count: result.length })
    return createSuccess(result as unknown as Setting[], "Settings retrieved successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to retrieve settings", {
      context: "getSettingsAction"
    })
  }
}

// Get a single setting value (for internal use)
export async function getSettingValueAction(key: string): Promise<string | null> {
  const requestId = generateRequestId()
  const timer = startTimer("getSettingValueAction")
  const log = createLogger({ requestId, action: "getSettingValueAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ key }) })

    const result = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1)

    if (result.length > 0) {
      const value = result[0].value
      timer({ status: "success" })
      log.info("Setting value retrieved", { hasValue: !!value })
      return value
    }

    timer({ status: "success" })
    log.info("Setting not found")
    return null
  } catch (error) {
    timer({ status: "error" })
    log.error(`Error getting setting value for ${key}`, { error })
    return null
  }
}

// Create or update a setting (admin only)
export async function upsertSettingAction(input: CreateSettingInput): Promise<ActionState<Setting>> {
  const requestId = generateRequestId()
  const timer = startTimer("upsertSettingAction")
  const log = createLogger({ requestId, action: "upsertSettingAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging(input) })

    const session = await getServerSession()
    if (!session) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Check if user is an administrator
    const isAdmin = await hasRole("administrator")
    if (!isAdmin) {
      log.warn("Access denied - not administrator", { userId: (session as any).user?.sub })
      throw createError("Only administrators can manage settings", { code: "FORBIDDEN" })
    }

    // Use transaction for complex upsert logic
    const result = await db.transaction(async (tx) => {
      // Check if setting exists
      const existingSetting = await tx
        .select({
          id: settings.id,
          isSecret: settings.isSecret,
          value: settings.value
        })
        .from(settings)
        .where(eq(settings.key, input.key))
        .limit(1)

      if (existingSetting.length > 0) {
        // Update existing setting
        const existing = existingSetting[0]
        const isSecret = existing.isSecret
        const hasExistingValue = existing.value !== null && existing.value !== ''
        const keepExistingValue = isSecret && !input.value && hasExistingValue

        log.info("Updating existing setting", {
          key: input.key,
          isSecret,
          keepExistingValue
        })

        if (keepExistingValue) {
          // Update without changing the value
          const updated = await tx
            .update(settings)
            .set({
              description: input.description || null,
              category: input.category || null,
              isSecret: input.isSecret || false,
              updatedAt: new Date()
            })
            .where(eq(settings.key, input.key))
            .returning({
              id: settings.id,
              key: settings.key,
              value: sql<string>`
                CASE
                  WHEN ${settings.isSecret} = true THEN '••••••••'
                  ELSE ${settings.value}
                END
              `,
              hasValue: sql<boolean>`
                CASE
                  WHEN ${settings.value} IS NOT NULL AND ${settings.value} != '' THEN true
                  ELSE false
                END
              `,
              description: settings.description,
              category: settings.category,
              isSecret: settings.isSecret,
              createdAt: settings.createdAt,
              updatedAt: settings.updatedAt,
            })

          return updated[0]
        } else {
          // Update including the value
          const updated = await tx
            .update(settings)
            .set({
              value: input.value || '',
              description: input.description || null,
              category: input.category || null,
              isSecret: input.isSecret || false,
              updatedAt: new Date()
            })
            .where(eq(settings.key, input.key))
            .returning({
              id: settings.id,
              key: settings.key,
              value: sql<string>`
                CASE
                  WHEN ${settings.isSecret} = true THEN '••••••••'
                  ELSE ${settings.value}
                END
              `,
              hasValue: sql<boolean>`
                CASE
                  WHEN ${settings.value} IS NOT NULL AND ${settings.value} != '' THEN true
                  ELSE false
                END
              `,
              description: settings.description,
              category: settings.category,
              isSecret: settings.isSecret,
              createdAt: settings.createdAt,
              updatedAt: settings.updatedAt,
            })

          return updated[0]
        }
      } else {
        // Create new setting
        log.info("Creating new setting", { key: input.key })

        const created = await tx
          .insert(settings)
          .values({
            key: input.key,
            value: input.value || '',
            description: input.description || null,
            category: input.category || null,
            isSecret: input.isSecret || false
          })
          .returning({
            id: settings.id,
            key: settings.key,
            value: sql<string>`
              CASE
                WHEN ${settings.isSecret} = true THEN '••••••••'
                ELSE ${settings.value}
              END
            `,
            hasValue: sql<boolean>`
              CASE
                WHEN ${settings.value} IS NOT NULL AND ${settings.value} != '' THEN true
                ELSE false
              END
            `,
            description: settings.description,
            category: settings.category,
            isSecret: settings.isSecret,
            createdAt: settings.createdAt,
            updatedAt: settings.updatedAt,
          })

        return created[0]
      }
    })

    if (!result) {
      throw createError("Failed to save setting")
    }

    // Invalidate the settings cache
    await revalidateSettingsCache()

    timer({ status: "success" })
    log.info("Setting saved successfully", { key: input.key })
    return createSuccess(result as unknown as Setting, "Setting saved successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to save setting", {
      context: "upsertSettingAction"
    })
  }
}

// Delete a setting (admin only)
export async function deleteSettingAction(key: string): Promise<ActionState<void>> {
  const requestId = generateRequestId()
  const timer = startTimer("deleteSettingAction")
  const log = createLogger({ requestId, action: "deleteSettingAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ key }) })

    const session = await getServerSession()
    if (!session) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Check if user is an administrator
    const isAdmin = await hasRole("administrator")
    if (!isAdmin) {
      log.warn("Access denied - not administrator", { userId: (session as any).user?.sub })
      throw createError("Only administrators can delete settings", { code: "FORBIDDEN" })
    }

    await db
      .delete(settings)
      .where(eq(settings.key, key))

    // Invalidate the settings cache
    await revalidateSettingsCache()

    timer({ status: "success" })
    log.info("Setting deleted successfully", { key })
    return createSuccess(undefined, "Setting deleted successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to delete setting", {
      context: "deleteSettingAction"
    })
  }
}

// Get actual (unmasked) value for a secret setting (admin only)
export async function getSettingActualValueAction(key: string): Promise<ActionState<string | null>> {
  const requestId = generateRequestId()
  const timer = startTimer("getSettingActualValueAction")
  const log = createLogger({ requestId, action: "getSettingActualValueAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ key }) })

    const session = await getServerSession()
    if (!session) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Check if user is an administrator
    const isAdmin = await hasRole("administrator")
    if (!isAdmin) {
      log.warn("Access denied - not administrator", { userId: (session as any).user?.sub })
      throw createError("Only administrators can view secret values", { code: "FORBIDDEN" })
    }

    const result = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1)

    if (result.length > 0) {
      const value = result[0].value
      timer({ status: "success" })
      log.info("Actual value retrieved", { key, hasValue: !!value })
      return createSuccess(value, "Value retrieved successfully")
    }

    timer({ status: "success" })
    log.info("Setting not found", { key })
    return createSuccess(null, "Setting not found")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to retrieve setting value", {
      context: "getSettingActualValueAction"
    })
  }
}

// Test API connection (admin only)
export async function testSettingConnectionAction(key: string, value: string): Promise<ActionState<void>> {
  const requestId = generateRequestId()
  const timer = startTimer("testSettingConnectionAction")
  const log = createLogger({ requestId, action: "testSettingConnectionAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ key }) })

    const session = await getServerSession()
    if (!session) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Check if user is an administrator
    const isAdmin = await hasRole("administrator")
    if (!isAdmin) {
      log.warn("Access denied - not administrator", { userId: (session as any).user?.sub })
      throw createError("Only administrators can test settings", { code: "FORBIDDEN" })
    }

    // Test based on the key type
    switch (key) {
      case 'AZURE_OPENAI_KEY':
        // TODO: Implement Azure OpenAI test
        timer({ status: "success" })
        log.info("Connection test completed", { key, result: "not implemented" })
        return createSuccess(undefined, "Azure OpenAI connection test not yet implemented")

      case 'GOOGLE_API_KEY':
        // TODO: Implement Google AI test
        timer({ status: "success" })
        log.info("Connection test completed", { key, result: "not implemented" })
        return createSuccess(undefined, "Google AI connection test not yet implemented")

      case 'S3_BUCKET':
        // TODO: Implement S3 bucket test
        timer({ status: "success" })
        log.info("Connection test completed", { key, result: "not implemented" })
        return createSuccess(undefined, "S3 bucket connection test not yet implemented")

      case 'GITHUB_ISSUE_TOKEN':
        // TODO: Implement GitHub token test
        timer({ status: "success" })
        log.info("Connection test completed", { key, result: "not implemented" })
        return createSuccess(undefined, "GitHub token test not yet implemented")

      default:
        timer({ status: "success" })
        log.info("Connection test completed", { key, result: "not available" })
        return createSuccess(undefined, "Connection test not available for this setting")
    }
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to test setting connection", {
      context: "testSettingConnectionAction"
    })
  }
}