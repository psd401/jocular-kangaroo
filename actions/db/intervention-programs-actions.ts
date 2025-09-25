'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle-client';
import { interventionPrograms, interventions } from '@/src/db/schema';
import { ActionState } from '@/types/actions-types';
import { InterventionProgram, InterventionType } from '@/types/intervention-types';
import { getCurrentUserAction } from './get-current-user-action';
import { hasToolAccess } from '@/lib/auth/tool-helpers';
import { createLogger, generateRequestId, startTimer, sanitizeForLogging } from '@/lib/logger';
import { handleError, createSuccess, createError } from '@/lib/error-utils';
import { eq, count, inArray, asc, and } from 'drizzle-orm';

// Validation schemas
const createProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required'),
  description: z.string().optional(),
  type: z.enum(['academic', 'behavioral', 'social_emotional', 'attendance', 'health', 'other']),
  duration_days: z.number().optional(),
  materials: z.string().optional(),
  goals: z.string().optional(),
  is_active: z.boolean().optional(),
});

const updateProgramSchema = createProgramSchema.partial().extend({
  id: z.number(),
});

// Get all intervention programs
export async function getInterventionProgramsAction(
  includeInactive = false
): Promise<ActionState<InterventionProgram[]>> {
  const requestId = generateRequestId()
  const timer = startTimer("getInterventionProgramsAction")
  const log = createLogger({ requestId, action: "getInterventionProgramsAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ includeInactive }) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    const query = db
      .select()
      .from(interventionPrograms)
      .orderBy(asc(interventionPrograms.type), asc(interventionPrograms.name))

    if (!includeInactive) {
      query.where(eq(interventionPrograms.isActive, true))
    }

    const result = await query

    const programs = result.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      type: row.type as InterventionType,
      duration_days: row.durationDays || undefined,
      materials: row.materials || undefined,
      goals: row.goals || undefined,
      is_active: row.isActive,
      created_at: new Date(row.createdAt),
      updated_at: new Date(row.updatedAt),
    }));

    timer({ status: "success" })
    log.info("Programs retrieved successfully", { count: programs.length })
    return createSuccess(programs, 'Programs fetched successfully')
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to fetch intervention programs", {
      context: "getInterventionProgramsAction"
    })
  }
}

// Get single program by ID
export async function getInterventionProgramByIdAction(
  id: number
): Promise<ActionState<InterventionProgram>> {
  const requestId = generateRequestId()
  const timer = startTimer("getInterventionProgramByIdAction")
  const log = createLogger({ requestId, action: "getInterventionProgramByIdAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ id }) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    const result = await db
      .select()
      .from(interventionPrograms)
      .where(eq(interventionPrograms.id, id))
      .limit(1)

    if (!result || result.length === 0) {
      timer({ status: "success" })
      log.info("Program not found", { programId: id })
      throw createError('Program not found', { code: "NOT_FOUND" })
    }

    const row = result[0];
    const program: InterventionProgram = {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      type: row.type as InterventionType,
      duration_days: row.durationDays || undefined,
      materials: row.materials || undefined,
      goals: row.goals || undefined,
      is_active: row.isActive,
      created_at: new Date(row.createdAt),
      updated_at: new Date(row.updatedAt),
    };

    timer({ status: "success" })
    log.info("Program retrieved successfully", { programId: id })
    return createSuccess(program, 'Program fetched successfully')
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to fetch intervention program", {
      context: "getInterventionProgramByIdAction"
    })
  }
}

// Create new intervention program
export async function createInterventionProgramAction(
  input: z.infer<typeof createProgramSchema>
): Promise<ActionState<InterventionProgram>> {
  const requestId = generateRequestId()
  const timer = startTimer("createInterventionProgramAction")
  const log = createLogger({ requestId, action: "createInterventionProgramAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging(input) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'programs');
    if (!hasAccess) {
      log.warn("Access denied - no program permission", { userId: currentUser.data.user.id })
      throw createError('You do not have permission to create programs', { code: "FORBIDDEN" })
    }

    // Validate input
    const validationResult = createProgramSchema.safeParse(input);
    if (!validationResult.success) {
      log.warn("Validation failed", { errors: validationResult.error.issues })
      throw createError(validationResult.error.issues[0].message, { code: "VALIDATION_ERROR" })
    }

    const data = validationResult.data;

    const result = await db
      .insert(interventionPrograms)
      .values({
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        durationDays: data.duration_days ?? null,
        materials: data.materials ?? null,
        goals: data.goals ?? null,
        isActive: data.is_active ?? true,
      })
      .returning()

    if (!result || result.length === 0) {
      throw createError('Failed to create program', { code: "DATABASE_ERROR" })
    }

    const row = result[0];
    const newProgram: InterventionProgram = {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      type: row.type as InterventionType,
      duration_days: row.durationDays ?? undefined,
      materials: row.materials ?? undefined,
      goals: row.goals ?? undefined,
      is_active: row.isActive,
      created_at: new Date(row.createdAt),
      updated_at: new Date(row.updatedAt),
    };

    revalidatePath('/programs');

    timer({ status: "success" })
    log.info("Program created successfully", { programId: newProgram.id })
    return createSuccess(newProgram, 'Program created successfully')
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to create intervention program", {
      context: "createInterventionProgramAction"
    })
  }
}

// Update intervention program
export async function updateInterventionProgramAction(
  input: z.infer<typeof updateProgramSchema>
): Promise<ActionState<InterventionProgram>> {
  const requestId = generateRequestId()
  const timer = startTimer("updateInterventionProgramAction")
  const log = createLogger({ requestId, action: "updateInterventionProgramAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging(input) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'programs');
    if (!hasAccess) {
      log.warn("Access denied - no program permission", { userId: currentUser.data.user.id })
      throw createError('You do not have permission to update programs', { code: "FORBIDDEN" })
    }

    // Validate input
    const validationResult = updateProgramSchema.safeParse(input);
    if (!validationResult.success) {
      log.warn("Validation failed", { errors: validationResult.error.issues })
      throw createError(validationResult.error.issues[0].message, { code: "VALIDATION_ERROR" })
    }

    const { id, ...updateFields } = validationResult.data;

    // Build update data for Drizzle
    const updateData: Partial<typeof interventionPrograms.$inferInsert> = {}

    if (updateFields.name !== undefined) {
      updateData.name = updateFields.name
    }
    if (updateFields.description !== undefined) {
      updateData.description = updateFields.description ?? null
    }
    if (updateFields.type !== undefined) {
      updateData.type = updateFields.type
    }
    if (updateFields.duration_days !== undefined) {
      updateData.durationDays = updateFields.duration_days ?? null
    }
    if (updateFields.materials !== undefined) {
      updateData.materials = updateFields.materials ?? null
    }
    if (updateFields.goals !== undefined) {
      updateData.goals = updateFields.goals ?? null
    }
    if (updateFields.is_active !== undefined) {
      updateData.isActive = updateFields.is_active
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date()

    const result = await db
      .update(interventionPrograms)
      .set(updateData)
      .where(eq(interventionPrograms.id, id))
      .returning()

    if (!result || result.length === 0) {
      throw createError('Failed to update program', { code: "NOT_FOUND" })
    }

    const row = result[0];
    const updatedProgram: InterventionProgram = {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      type: row.type as InterventionType,
      duration_days: row.durationDays ?? undefined,
      materials: row.materials ?? undefined,
      goals: row.goals ?? undefined,
      is_active: row.isActive,
      created_at: new Date(row.createdAt),
      updated_at: new Date(row.updatedAt),
    };

    revalidatePath('/programs');
    revalidatePath(`/programs/${id}`);

    timer({ status: "success" })
    log.info("Program updated successfully", { programId: id })
    return createSuccess(updatedProgram, 'Program updated successfully')
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to update intervention program", {
      context: "updateInterventionProgramAction"
    })
  }
}

// Delete (deactivate) intervention program
export async function deleteInterventionProgramAction(id: number): Promise<ActionState<void>> {
  const requestId = generateRequestId()
  const timer = startTimer("deleteInterventionProgramAction")
  const log = createLogger({ requestId, action: "deleteInterventionProgramAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ id }) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'programs');
    if (!hasAccess) {
      log.warn("Access denied - no program permission", { userId: currentUser.data.user.id })
      throw createError('You do not have permission to delete programs', { code: "FORBIDDEN" })
    }

    // Check if program is being used by active interventions using Drizzle
    const activeCheck = await db
      .select({ count: count() })
      .from(interventions)
      .where(and(
        eq(interventions.programId, id),
        inArray(interventions.status, ['planned', 'in_progress'])
      ))

    const activeCount = activeCheck[0]?.count || 0;
    if (activeCount > 0) {
      log.warn("Cannot delete program in use by active interventions", { programId: id, activeCount })
      throw createError('Cannot delete program that is being used by active interventions', { code: "CONFLICT" })
    }

    // Soft delete by setting is_active to false
    const result = await db
      .update(interventionPrograms)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(interventionPrograms.id, id))
      .returning({ id: interventionPrograms.id })

    if (!result || result.length === 0) {
      throw createError('Program not found', { code: "NOT_FOUND" })
    }

    revalidatePath('/programs');

    timer({ status: "success" })
    log.info("Program deleted successfully", { programId: id })
    return createSuccess(undefined, 'Program deleted successfully')
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to delete intervention program", {
      context: "deleteInterventionProgramAction"
    })
  }
}