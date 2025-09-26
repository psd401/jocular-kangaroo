"use server"

import { db } from "@/lib/db/drizzle-client"
import { navigationItems } from "@/src/db/schema"
import { ActionState } from "@/types"
import type { InsertNavigationItem, SelectNavigationItem } from "@/types/db-types"
import { createLogger, generateRequestId, startTimer, sanitizeForLogging } from "@/lib/logger"
import { handleError, createSuccess, createError } from "@/lib/error-utils"
import { eq } from "drizzle-orm"

export async function getNavigationItemsAction(): Promise<ActionState<SelectNavigationItem[]>> {
  const requestId = generateRequestId()
  const timer = startTimer("getNavigationItemsAction")
  const log = createLogger({ requestId, action: "getNavigationItemsAction" })

  try {
    log.info("Action started")

    const result = await db
      .select()
      .from(navigationItems)
      .orderBy(navigationItems.position, navigationItems.id)

    const items: SelectNavigationItem[] = result.map(item => ({
      id: item.id,
      label: item.label,
      icon: item.icon || '',
      link: item.link,
      description: item.description,
      type: item.type,
      parentId: item.parentId,
      toolId: item.toolId,
      requiresRole: item.requiresRole,
      position: item.position ?? 0,
      isActive: item.isActive,
      createdAt: item.createdAt,
    }))

    timer({ status: "success" })
    log.info("Navigation items retrieved successfully", { count: items.length })
    return createSuccess(items, "Navigation items retrieved successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to get navigation items", {
      context: "getNavigationItemsAction"
    })
  }
}

export async function createNavigationItemAction(
  data: InsertNavigationItem
): Promise<ActionState<SelectNavigationItem>> {
  const requestId = generateRequestId()
  const timer = startTimer("createNavigationItemAction")
  const log = createLogger({ requestId, action: "createNavigationItemAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging(data) })

    const result = await db
      .insert(navigationItems)
      .values({
        label: data.label,
        icon: data.icon || null,
        link: data.link || null,
        description: data.description || null,
        type: (data.type as 'link' | 'section' | 'page') || 'page',
        parentId: data.parentId ? Number(data.parentId) : null,
        toolId: data.toolId ? Number(data.toolId) : null,
        requiresRole: data.requiresRole || null,
        position: data.position || 0,
        isActive: data.isActive ?? true,
      })
      .returning()

    if (!result || result.length === 0) {
      throw createError("Failed to create navigation item", { code: "DATABASE_ERROR" })
    }

    const newItem = result[0];
    const selectItem: SelectNavigationItem = {
      id: newItem.id,
      label: newItem.label,
      icon: newItem.icon || '',
      link: newItem.link,
      description: newItem.description,
      type: newItem.type,
      parentId: newItem.parentId,
      toolId: newItem.toolId,
      requiresRole: newItem.requiresRole,
      position: newItem.position ?? 0,
      isActive: newItem.isActive,
      createdAt: newItem.createdAt,
    }

    timer({ status: "success" })
    log.info("Navigation item created successfully", { itemId: newItem.id })
    return createSuccess(selectItem, "Navigation item created successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to create navigation item", {
      context: "createNavigationItemAction"
    })
  }
}

export async function updateNavigationItemAction(
  id: string | number,
  data: Partial<InsertNavigationItem>
): Promise<ActionState<SelectNavigationItem>> {
  const requestId = generateRequestId()
  const timer = startTimer("updateNavigationItemAction")
  const log = createLogger({ requestId, action: "updateNavigationItemAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ id, data }) })

    const updateData: Partial<typeof navigationItems.$inferInsert> = {}

    if (data.label !== undefined) updateData.label = data.label
    if (data.icon !== undefined) updateData.icon = data.icon || null
    if (data.link !== undefined) updateData.link = data.link || null
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.type !== undefined) updateData.type = data.type as 'link' | 'section' | 'page'
    if (data.parentId !== undefined) updateData.parentId = data.parentId || null
    if (data.toolId !== undefined) updateData.toolId = data.toolId || null
    if (data.requiresRole !== undefined) updateData.requiresRole = data.requiresRole || null
    if (data.position !== undefined) updateData.position = data.position
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const result = await db
      .update(navigationItems)
      .set(updateData)
      .where(eq(navigationItems.id, Number(id)))
      .returning()

    if (!result || result.length === 0) {
      throw createError("Navigation item not found", { code: "NOT_FOUND" })
    }

    const updatedItem = result[0];
    const selectItem: SelectNavigationItem = {
      id: updatedItem.id,
      label: updatedItem.label,
      icon: updatedItem.icon || '',
      link: updatedItem.link,
      description: updatedItem.description,
      type: updatedItem.type,
      parentId: updatedItem.parentId,
      toolId: updatedItem.toolId,
      requiresRole: updatedItem.requiresRole,
      position: updatedItem.position ?? 0,
      isActive: updatedItem.isActive,
      createdAt: updatedItem.createdAt,
    }

    timer({ status: "success" })
    log.info("Navigation item updated successfully", { itemId: Number(id) })
    return createSuccess(selectItem, "Navigation item updated successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to update navigation item", {
      context: "updateNavigationItemAction"
    })
  }
}

export async function deleteNavigationItemAction(
  id: string | number
): Promise<ActionState<void>> {
  const requestId = generateRequestId()
  const timer = startTimer("deleteNavigationItemAction")
  const log = createLogger({ requestId, action: "deleteNavigationItemAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ id }) })

    await db
      .delete(navigationItems)
      .where(eq(navigationItems.id, Number(id)))

    timer({ status: "success" })
    log.info("Navigation item deleted successfully", { itemId: Number(id) })
    return createSuccess(undefined, "Navigation item deleted successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to delete navigation item", {
      context: "deleteNavigationItemAction"
    })
  }
}