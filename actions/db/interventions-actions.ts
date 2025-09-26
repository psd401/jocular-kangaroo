'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/drizzle-client';
import { interventions, students, interventionPrograms, users, interventionTeam, interventionSessions, interventionGoals } from '@/src/db/schema';
import { ActionState } from '@/types/actions-types';
import {
  Intervention,
  InterventionWithDetails,
  CreateInterventionInput,
  InterventionType,
  InterventionStatus
} from '@/types/intervention-types';
import { getCurrentUserAction } from './get-current-user-action';
import { hasToolAccess } from '@/lib/auth/tool-helpers';
import { createLogger, generateRequestId, startTimer, sanitizeForLogging } from '@/lib/logger';
import { handleError, createSuccess, createError } from '@/lib/error-utils';
import { eq, and, or, gte, lte, desc } from 'drizzle-orm';

// Helper function to convert null to undefined
const nullToUndefined = <T>(value: T | null): T | undefined => value === null ? undefined : value;

// Validation schemas
const createInterventionSchema = z.object({
  student_id: z.number(),
  program_id: z.number().optional(),
  type: z.enum(['academic', 'behavioral', 'social_emotional', 'attendance', 'health', 'other']),
  status: z.enum(['planned', 'in_progress', 'completed', 'discontinued', 'on_hold']).optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  goals: z.string().optional(),
  start_date: z.string(),
  end_date: z.string().optional(),
  frequency: z.string().optional(),
  duration_minutes: z.number().optional(),
  location: z.string().optional(),
  assigned_to: z.number().optional(),
});

const updateInterventionSchema = createInterventionSchema.partial().extend({
  id: z.number(),
  completion_notes: z.string().optional(),
});

// Get all interventions with optional filters
export async function getInterventionsAction(filters?: {
  student_id?: number;
  status?: InterventionStatus;
  type?: InterventionType;
  assigned_to?: number;
  start_date?: string;
  end_date?: string;
}): Promise<ActionState<InterventionWithDetails[]>> {
  const requestId = generateRequestId()
  const timer = startTimer("getInterventionsAction")
  const log = createLogger({ requestId, action: "getInterventionsAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging(filters) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Build WHERE conditions
    const whereConditions = []
    if (filters?.student_id) {
      whereConditions.push(eq(interventions.studentId, filters.student_id))
    }
    if (filters?.status) {
      whereConditions.push(eq(interventions.status, filters.status))
    }
    if (filters?.type) {
      whereConditions.push(eq(interventions.type, filters.type))
    }
    if (filters?.assigned_to) {
      whereConditions.push(eq(interventions.assignedTo, filters.assigned_to))
    }
    if (filters?.start_date) {
      whereConditions.push(gte(interventions.startDate, filters.start_date))
    }
    if (filters?.end_date) {
      whereConditions.push(lte(interventions.endDate, filters.end_date))
    }

    const result = await db
      .select({
        // Intervention fields
        id: interventions.id,
        studentId: interventions.studentId,
        programId: interventions.programId,
        type: interventions.type,
        status: interventions.status,
        title: interventions.title,
        description: interventions.description,
        goals: interventions.goals,
        startDate: interventions.startDate,
        endDate: interventions.endDate,
        frequency: interventions.frequency,
        durationMinutes: interventions.durationMinutes,
        location: interventions.location,
        assignedTo: interventions.assignedTo,
        createdBy: interventions.createdBy,
        createdAt: interventions.createdAt,
        updatedAt: interventions.updatedAt,
        completedAt: interventions.completedAt,
        completionNotes: interventions.completionNotes,
        // Student fields
        studentNumber: students.studentId,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        studentGrade: students.grade,
        // Program fields
        programName: interventionPrograms.name,
        // Assigned user fields
        assignedFirstName: users.firstName,
        assignedLastName: users.lastName,
      })
      .from(interventions)
      .leftJoin(students, eq(interventions.studentId, students.id))
      .leftJoin(interventionPrograms, eq(interventions.programId, interventionPrograms.id))
      .leftJoin(users, eq(interventions.assignedTo, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(interventions.startDate), desc(interventions.createdAt))

    const interventionsData = result.map(row => ({
      id: row.id,
      student_id: row.studentId,
      program_id: nullToUndefined(row.programId),
      type: row.type as InterventionType,
      status: row.status as InterventionStatus,
      title: row.title,
      description: nullToUndefined(row.description),
      goals: nullToUndefined(row.goals),
      start_date: row.startDate ? new Date(row.startDate) : new Date(),
      end_date: row.endDate ? new Date(row.endDate) : undefined,
      frequency: nullToUndefined(row.frequency),
      duration_minutes: nullToUndefined(row.durationMinutes),
      location: nullToUndefined(row.location),
      assigned_to: nullToUndefined(row.assignedTo),
      created_by: row.createdBy,
      created_at: new Date(row.createdAt),
      updated_at: new Date(row.updatedAt),
      completed_at: row.completedAt ? new Date(row.completedAt) : undefined,
      completion_notes: nullToUndefined(row.completionNotes),
      student: {
        id: row.studentId,
        student_id: row.studentNumber || '',
        first_name: row.studentFirstName || '',
        last_name: row.studentLastName || '',
        grade: row.studentGrade as any,
        middle_name: undefined,
        status: 'active' as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
      program: row.programId ? {
        id: row.programId,
        name: row.programName || '',
        type: row.type as InterventionType,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } : undefined,
      assigned_to_user: row.assignedTo ? {
        id: row.assignedTo,
        first_name: row.assignedFirstName || '',
        last_name: row.assignedLastName || '',
      } : undefined,
    }));

    timer({ status: "success" })
    log.info("Interventions retrieved successfully", { count: interventionsData.length })
    return createSuccess(interventionsData, 'Interventions fetched successfully')
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to fetch interventions", {
      context: "getInterventionsAction"
    })
  }
}

// Get single intervention by ID with full details
export async function getInterventionByIdAction(id: number): Promise<ActionState<InterventionWithDetails>> {
  const requestId = generateRequestId()
  const timer = startTimer("getInterventionByIdAction")
  const log = createLogger({ requestId, action: "getInterventionByIdAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ id }) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Get intervention details using Drizzle
    const interventionResult = await db
      .select({
        // Intervention fields
        id: interventions.id,
        studentId: interventions.studentId,
        programId: interventions.programId,
        type: interventions.type,
        status: interventions.status,
        title: interventions.title,
        description: interventions.description,
        goals: interventions.goals,
        startDate: interventions.startDate,
        endDate: interventions.endDate,
        frequency: interventions.frequency,
        durationMinutes: interventions.durationMinutes,
        location: interventions.location,
        assignedTo: interventions.assignedTo,
        createdBy: interventions.createdBy,
        createdAt: interventions.createdAt,
        updatedAt: interventions.updatedAt,
        completedAt: interventions.completedAt,
        completionNotes: interventions.completionNotes,
        // Student fields
        studentNumber: students.studentId,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        studentGrade: students.grade,
        // Program fields
        programName: interventionPrograms.name,
        // Assigned user fields
        assignedFirstName: users.firstName,
        assignedLastName: users.lastName,
      })
      .from(interventions)
      .leftJoin(students, eq(interventions.studentId, students.id))
      .leftJoin(interventionPrograms, eq(interventions.programId, interventionPrograms.id))
      .leftJoin(users, eq(interventions.assignedTo, users.id))
      .where(eq(interventions.id, id))
      .limit(1)

    if (!interventionResult || interventionResult.length === 0) {
      timer({ status: "success" })
      log.info("Intervention not found", { interventionId: id })
      throw createError('Intervention not found', { code: "NOT_FOUND" })
    }

    const row = interventionResult[0];
    const intervention: InterventionWithDetails = {
      id: row.id,
      student_id: row.studentId,
      program_id: nullToUndefined(row.programId),
      type: row.type as InterventionType,
      status: row.status as InterventionStatus,
      title: row.title,
      description: nullToUndefined(row.description),
      goals: nullToUndefined(row.goals),
      start_date: new Date(row.startDate || 0),
      end_date: row.endDate ? new Date(row.endDate) : undefined,
      frequency: nullToUndefined(row.frequency),
      duration_minutes: nullToUndefined(row.durationMinutes),
      location: nullToUndefined(row.location),
      assigned_to: nullToUndefined(row.assignedTo),
      created_by: row.createdBy,
      created_at: new Date(row.createdAt),
      updated_at: new Date(row.updatedAt),
      completed_at: row.completedAt ? new Date(row.completedAt) : undefined,
      completion_notes: nullToUndefined(row.completionNotes),
      student: {
        id: row.studentId,
        student_id: row.studentNumber ?? '',
        first_name: row.studentFirstName ?? '',
        last_name: row.studentLastName ?? '',
        grade: row.studentGrade as any,
        middle_name: undefined,
        status: 'active' as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
      program: row.programId ? {
        id: row.programId,
        name: row.programName ?? '',
        type: row.type as InterventionType,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } : undefined,
      assigned_to_user: row.assignedTo ? {
        id: row.assignedTo,
        first_name: row.assignedFirstName ?? '',
        last_name: row.assignedLastName ?? '',
      } : undefined,
      team_members: [],
      sessions: [],
      goalDetails: [],
    };

    // Get team members using Drizzle
    const teamResult = await db
      .select({
        id: interventionTeam.id,
        userId: interventionTeam.userId,
        role: interventionTeam.role,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(interventionTeam)
      .leftJoin(users, eq(interventionTeam.userId, users.id))
      .where(eq(interventionTeam.interventionId, id))

    intervention.team_members = teamResult.map(r => ({
      id: r.id,
      intervention_id: id,
      user_id: r.userId,
      role: nullToUndefined(r.role),
      created_at: new Date(),
    }));

    // Get recent sessions using Drizzle
    const sessionsResult = await db
      .select({
        id: interventionSessions.id,
        sessionDate: interventionSessions.sessionDate,
        durationMinutes: interventionSessions.durationMinutes,
        attended: interventionSessions.attended,
        progressNotes: interventionSessions.progressNotes,
        challenges: interventionSessions.challenges,
        nextSteps: interventionSessions.nextSteps,
        recordedBy: interventionSessions.recordedBy,
        createdAt: interventionSessions.createdAt,
        updatedAt: interventionSessions.updatedAt,
      })
      .from(interventionSessions)
      .where(eq(interventionSessions.interventionId, id))
      .orderBy(desc(interventionSessions.sessionDate))
      .limit(10)

    intervention.sessions = sessionsResult.map(r => ({
      id: r.id,
      intervention_id: id,
      session_date: new Date(r.sessionDate),
      duration_minutes: nullToUndefined(r.durationMinutes),
      attended: r.attended,
      progress_notes: nullToUndefined(r.progressNotes),
      challenges: nullToUndefined(r.challenges),
      next_steps: nullToUndefined(r.nextSteps),
      recorded_by: r.recordedBy ?? 0,
      created_at: new Date(r.createdAt),
      updated_at: new Date(r.updatedAt),
    }));

    // Get goals using Drizzle
    const goalsResult = await db
      .select({
        id: interventionGoals.id,
        goalText: interventionGoals.goalText,
        targetDate: interventionGoals.targetDate,
        isAchieved: interventionGoals.isAchieved,
        achievedDate: interventionGoals.achievedDate,
        evidence: interventionGoals.evidence,
        createdAt: interventionGoals.createdAt,
        updatedAt: interventionGoals.updatedAt,
      })
      .from(interventionGoals)
      .where(eq(interventionGoals.interventionId, id))
      .orderBy(interventionGoals.targetDate)

    intervention.goalDetails = goalsResult.map(r => ({
      id: r.id,
      intervention_id: id,
      goal_text: r.goalText,
      target_date: r.targetDate ? new Date(r.targetDate) : undefined,
      is_achieved: r.isAchieved,
      achieved_date: r.achievedDate ? new Date(r.achievedDate) : undefined,
      evidence: nullToUndefined(r.evidence),
      created_at: new Date(r.createdAt),
      updated_at: new Date(r.updatedAt),
    }));

    timer({ status: "success" })
    log.info("Intervention retrieved successfully", { interventionId: id })
    return createSuccess(intervention, 'Intervention fetched successfully')
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to fetch intervention details", {
      context: "getInterventionByIdAction"
    })
  }
}

// Create new intervention
export async function createInterventionAction(
  input: CreateInterventionInput
): Promise<ActionState<Intervention>> {
  const requestId = generateRequestId()
  const timer = startTimer("createInterventionAction")
  const log = createLogger({ requestId, action: "createInterventionAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging(input) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'interventions');
    if (!hasAccess) {
      log.warn("Access denied - no intervention permission", { userId: currentUser.data.user.id })
      throw createError('You do not have permission to create interventions', { code: "FORBIDDEN" })
    }

    // Validate input
    const validationResult = createInterventionSchema.safeParse(input);
    if (!validationResult.success) {
      log.warn("Validation failed", { errors: validationResult.error.issues })
      throw createError(validationResult.error.issues[0].message, { code: "VALIDATION_ERROR" })
    }

    const data = validationResult.data;

    // Insert new intervention
    const result = await db
      .insert(interventions)
      .values({
        studentId: data.student_id,
        programId: data.program_id || null,
        type: data.type,
        status: data.status || 'planned',
        title: data.title,
        description: data.description || null,
        goals: data.goals || null,
        startDate: data.start_date,
        endDate: data.end_date || null,
        frequency: data.frequency || null,
        durationMinutes: data.duration_minutes || null,
        location: data.location || null,
        assignedTo: data.assigned_to || null,
        createdBy: currentUser.data.user.id,
      })
      .returning()

    if (!result || result.length === 0) {
      throw createError('Failed to create intervention', { code: "DATABASE_ERROR" })
    }

    const row = result[0];
    const newIntervention: Intervention = {
      id: row.id,
      student_id: row.studentId,
      program_id: nullToUndefined(row.programId),
      type: row.type as InterventionType,
      status: row.status as InterventionStatus,
      title: row.title,
      description: nullToUndefined(row.description),
      goals: nullToUndefined(row.goals),
      start_date: new Date(row.startDate || 0),
      end_date: row.endDate ? new Date(row.endDate) : undefined,
      frequency: nullToUndefined(row.frequency),
      duration_minutes: nullToUndefined(row.durationMinutes),
      location: nullToUndefined(row.location),
      assigned_to: nullToUndefined(row.assignedTo),
      created_by: row.createdBy,
      created_at: new Date(row.createdAt),
      updated_at: new Date(row.updatedAt),
      completed_at: row.completedAt ? new Date(row.completedAt) : undefined,
      completion_notes: nullToUndefined(row.completionNotes),
    };

    revalidatePath('/interventions');
    revalidatePath(`/students/${data.student_id}`);

    timer({ status: "success" })
    log.info("Intervention created successfully", { interventionId: newIntervention.id })
    return createSuccess(newIntervention, 'Intervention created successfully')
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to create intervention", {
      context: "createInterventionAction"
    })
  }
}

// Update intervention
export async function updateInterventionAction(
  input: Partial<CreateInterventionInput> & { id: number }
): Promise<ActionState<Intervention>> {
  const requestId = generateRequestId()
  const timer = startTimer("updateInterventionAction")
  const log = createLogger({ requestId, action: "updateInterventionAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging(input) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'interventions');
    if (!hasAccess) {
      log.warn("Access denied - no intervention permission", { userId: currentUser.data.user.id })
      throw createError('You do not have permission to update interventions', { code: "FORBIDDEN" })
    }

    // Validate input
    const validationResult = updateInterventionSchema.safeParse(input);
    if (!validationResult.success) {
      log.warn("Validation failed", { errors: validationResult.error.issues })
      throw createError(validationResult.error.issues[0].message, { code: "VALIDATION_ERROR" })
    }

    const { id, ...updateFields } = validationResult.data;

    // Build update data for Drizzle
    const updateData: Partial<typeof interventions.$inferInsert> = {}

    if (updateFields.student_id !== undefined) {
      updateData.studentId = updateFields.student_id
    }
    if (updateFields.program_id !== undefined) {
      updateData.programId = updateFields.program_id ?? null
    }
    if (updateFields.type !== undefined) {
      updateData.type = updateFields.type
    }
    if (updateFields.status !== undefined) {
      updateData.status = updateFields.status
      // Handle status change to completed
      if (updateFields.status === 'completed') {
        updateData.completedAt = new Date()
      }
    }
    if (updateFields.title !== undefined) {
      updateData.title = updateFields.title
    }
    if (updateFields.description !== undefined) {
      updateData.description = updateFields.description ?? null
    }
    if (updateFields.goals !== undefined) {
      updateData.goals = updateFields.goals ?? null
    }
    if (updateFields.start_date !== undefined) {
      updateData.startDate = updateFields.start_date
    }
    if (updateFields.end_date !== undefined) {
      updateData.endDate = updateFields.end_date ?? null
    }
    if (updateFields.frequency !== undefined) {
      updateData.frequency = updateFields.frequency ?? null
    }
    if (updateFields.duration_minutes !== undefined) {
      updateData.durationMinutes = updateFields.duration_minutes ?? null
    }
    if (updateFields.location !== undefined) {
      updateData.location = updateFields.location ?? null
    }
    if (updateFields.assigned_to !== undefined) {
      updateData.assignedTo = updateFields.assigned_to ?? null
    }
    if (updateFields.completion_notes !== undefined) {
      updateData.completionNotes = updateFields.completion_notes ?? null
    }

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date()

    const result = await db
      .update(interventions)
      .set(updateData)
      .where(eq(interventions.id, id))
      .returning()

    if (!result || result.length === 0) {
      throw createError('Failed to update intervention', { code: "NOT_FOUND" })
    }

    const row = result[0];
    const updatedIntervention: Intervention = {
      id: row.id,
      student_id: row.studentId,
      program_id: nullToUndefined(row.programId),
      type: row.type as InterventionType,
      status: row.status as InterventionStatus,
      title: row.title,
      description: nullToUndefined(row.description),
      goals: nullToUndefined(row.goals),
      start_date: new Date(row.startDate || 0),
      end_date: row.endDate ? new Date(row.endDate) : undefined,
      frequency: nullToUndefined(row.frequency),
      duration_minutes: nullToUndefined(row.durationMinutes),
      location: nullToUndefined(row.location),
      assigned_to: nullToUndefined(row.assignedTo),
      created_by: row.createdBy,
      created_at: new Date(row.createdAt),
      updated_at: new Date(row.updatedAt),
      completed_at: row.completedAt ? new Date(row.completedAt) : undefined,
      completion_notes: nullToUndefined(row.completionNotes),
    };

    revalidatePath('/interventions');
    revalidatePath(`/interventions/${id}`);

    timer({ status: "success" })
    log.info("Intervention updated successfully", { interventionId: id })
    return createSuccess(updatedIntervention, 'Intervention updated successfully')
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to update intervention", {
      context: "updateInterventionAction"
    })
  }
}

// Delete intervention
export async function deleteInterventionAction(id: number): Promise<ActionState<void>> {
  const requestId = generateRequestId()
  const timer = startTimer("deleteInterventionAction")
  const log = createLogger({ requestId, action: "deleteInterventionAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ id }) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized")
      throw createError("No session", { code: "UNAUTHORIZED" })
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'interventions');
    if (!hasAccess) {
      log.warn("Access denied - no intervention permission", { userId: currentUser.data.user.id })
      throw createError('You do not have permission to delete interventions', { code: "FORBIDDEN" })
    }

    // Use transaction to delete related records first (cascade)
    await db.transaction(async (tx) => {
      // Delete related records first
      await tx.delete(interventionSessions).where(eq(interventionSessions.interventionId, id))
      await tx.delete(interventionGoals).where(eq(interventionGoals.interventionId, id))
      await tx.delete(interventionTeam).where(eq(interventionTeam.interventionId, id))

      // Delete the intervention
      const result = await tx.delete(interventions).where(eq(interventions.id, id)).returning()

      if (!result || result.length === 0) {
        throw createError('Intervention not found', { code: "NOT_FOUND" })
      }
    })

    revalidatePath('/interventions');

    timer({ status: "success" })
    log.info("Intervention deleted successfully", { interventionId: id })
    return createSuccess(undefined, 'Intervention deleted successfully')
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to delete intervention", {
      context: "deleteInterventionAction"
    })
  }
}