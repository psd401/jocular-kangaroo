"use server"

import { db } from "@/lib/db/drizzle-client"
import { navigationItems } from "@/src/db/schema"
import { ActionState } from "@/types"
import type { InsertNavigationItem, SelectNavigationItem } from "@/types/db-types"
import { createLogger, generateRequestId, startTimer, sanitizeForLogging } from "@/lib/logger"
import { handleError, createSuccess, ErrorFactories } from "@/lib/error-utils"
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
      icon: item.icon || undefined,
      link: item.link || undefined,
      description: item.description || undefined,
      type: item.type,
      parentId: item.parentId || undefined,
      toolId: item.toolId || undefined,
      requiresRole: item.requiresRole || undefined,
      position: item.position,
      isActive: item.isActive,
      createdAt: item.createdAt,
      toolIdentifier: item.toolIdentifier || undefined,
    }))

    timer({ status: "success" })
    log.info("Navigation items retrieved successfully", { count: items.length })
    return createSuccess(items, "Navigation items retrieved successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to get navigation items", {
      context: "getNavigationItemsAction",
      requestId,
      operation: "getNavigationItems"
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
        type: data.type || 'page',
        parentId: data.parentId ? Number(data.parentId) : null,
        toolId: data.toolId ? Number(data.toolId) : null,
        requiresRole: data.requiresRole || null,
        position: data.position || 0,
        isActive: data.isActive ?? true,
        toolIdentifier: data.toolIdentifier || null,
      })
      .returning()

    if (!result || result.length === 0) {
      throw ErrorFactories.database("Failed to create navigation item")
    }

    const newItem = result[0];
    const selectItem: SelectNavigationItem = {
      id: newItem.id,
      label: newItem.label,
      icon: newItem.icon || undefined,
      link: newItem.link || undefined,
      description: newItem.description || undefined,
      type: newItem.type,
      parentId: newItem.parentId || undefined,
      toolId: newItem.toolId || undefined,
      requiresRole: newItem.requiresRole || undefined,
      position: newItem.position,
      isActive: newItem.isActive,
      createdAt: newItem.createdAt,
      toolIdentifier: newItem.toolIdentifier || undefined,
    }

    timer({ status: "success" })
    log.info("Navigation item created successfully", { itemId: newItem.id })
    return createSuccess(selectItem, "Navigation item created successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to create navigation item", {
      context: "createNavigationItemAction",
      requestId,
      operation: "createNavigationItem"
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
    if (data.type !== undefined) updateData.type = data.type
    if (data.parentId !== undefined) updateData.parentId = data.parentId || null
    if (data.toolId !== undefined) updateData.toolId = data.toolId || null
    if (data.requiresRole !== undefined) updateData.requiresRole = data.requiresRole || null
    if (data.position !== undefined) updateData.position = data.position
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.toolIdentifier !== undefined) updateData.toolIdentifier = data.toolIdentifier || null

    const result = await db
      .update(navigationItems)
      .set(updateData)
      .where(eq(navigationItems.id, Number(id)))
      .returning()

    if (!result || result.length === 0) {
      throw ErrorFactories.notFound("Navigation item not found")
    }

    const updatedItem = result[0];
    const selectItem: SelectNavigationItem = {
      id: updatedItem.id,
      label: updatedItem.label,
      icon: updatedItem.icon || undefined,
      link: updatedItem.link || undefined,
      description: updatedItem.description || undefined,
      type: updatedItem.type,
      parentId: updatedItem.parentId || undefined,
      toolId: updatedItem.toolId || undefined,
      requiresRole: updatedItem.requiresRole || undefined,
      position: updatedItem.position,
      isActive: updatedItem.isActive,
      createdAt: updatedItem.createdAt,
      toolIdentifier: updatedItem.toolIdentifier || undefined,
    }

    timer({ status: "success" })
    log.info("Navigation item updated successfully", { itemId: Number(id) })
    return createSuccess(selectItem, "Navigation item updated successfully")
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to update navigation item", {
      context: "updateNavigationItemAction",
      requestId,
      operation: "updateNavigationItem"
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
      context: "deleteNavigationItemAction",
      requestId,
      operation: "deleteNavigationItem"
    })
  }
}