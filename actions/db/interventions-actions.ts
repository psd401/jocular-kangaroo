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
import { handleError, createSuccess, ErrorFactories } from '@/lib/error-utils';
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
      throw ErrorFactories.authNoSession()
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
      context: "getInterventionsAction",
      requestId,
      operation: "getInterventions"
    })
  }
}

// Get single intervention by ID with full details
export async function getInterventionByIdAction(id: number): Promise<ActionState<InterventionWithDetails>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Get intervention details
    const interventionQuery = `
      SELECT 
        i.id, i.student_id, i.program_id, i.type, i.status,
        i.title, i.description, i.goals, i.start_date, i.end_date,
        i.frequency, i.duration_minutes, i.location, i.assigned_to,
        i.created_by, i.created_at, i.updated_at, i.completed_at,
        i.completion_notes,
        s.student_id as student_number, s.first_name, s.last_name, s.grade,
        p.name as program_name,
        u.first_name as assigned_first_name, u.last_name as assigned_last_name
      FROM interventions i
      LEFT JOIN students s ON i.student_id = s.id
      LEFT JOIN intervention_programs p ON i.program_id = p.id
      LEFT JOIN users u ON i.assigned_to = u.id
      WHERE i.id = $1
    `;
    
    const interventionResult = await executeSQL(interventionQuery, [
      { name: '1', value: { longValue: id } }
    ]);

    if (!interventionResult || interventionResult.length === 0) {
      return { isSuccess: false, message: 'Intervention not found' };
    }

    const row = interventionResult[0];
    const intervention: InterventionWithDetails = {
      id: row.id as number,
      student_id: row.studentId as number,
      program_id: nullToUndefined(row.programId as number | null),
      type: row.type as InterventionType,
      status: row.status as InterventionStatus,
      title: row.title as string,
      description: nullToUndefined(row.description as string | null),
      goals: nullToUndefined(row.goals as string | null),
      start_date: new Date(row.startDate as string),
      end_date: row.endDate ? new Date(row.endDate as string) : undefined,
      frequency: nullToUndefined(row.frequency as string | null),
      duration_minutes: nullToUndefined(row.durationMinutes as number | null),
      location: nullToUndefined(row.location as string | null),
      assigned_to: nullToUndefined(row.assignedTo as number | null),
      created_by: row.createdBy as number,
      created_at: new Date(row.createdAt as string),
      updated_at: new Date(row.updatedAt as string),
      completed_at: row.completedAt ? new Date(row.completedAt as string) : undefined,
      completion_notes: nullToUndefined(row.completionNotes as string | null),
      student: {
        id: row.studentId as number,
        student_id: row.studentNumber as string,
        first_name: row.firstName as string,
        last_name: row.lastName as string,
        grade: row.grade as any,
        middle_name: undefined,
        status: 'active' as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
      program: row.programId ? {
        id: row.programId as number,
        name: row.programName as string,
        type: row.type as InterventionType,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } : undefined,
      assigned_to_user: row.assignedTo ? {
        id: row.assignedTo as number,
        first_name: row.assignedFirstName as string,
        last_name: row.assignedLastName as string,
      } : undefined,
      team_members: [],
      sessions: [],
      goalDetails: [],
    };

    // Get team members
    const teamQuery = `
      SELECT it.id, it.user_id, it.role, u.first_name, u.last_name
      FROM intervention_team it
      LEFT JOIN users u ON it.user_id = u.id
      WHERE it.intervention_id = $1
    `;
    
    const teamResult = await executeSQL(teamQuery, [
      { name: '1', value: { longValue: id } }
    ]);

    if (teamResult) {
      intervention.team_members = teamResult.map(r => ({
        id: r.id as number,
        intervention_id: id,
        user_id: r.userId as number,
        role: nullToUndefined(r.role as string | null),
        created_at: new Date(),
      }));
    }

    // Get recent sessions
    const sessionsQuery = `
      SELECT id, session_date, duration_minutes, attended, 
             progress_notes, challenges, next_steps
      FROM intervention_sessions
      WHERE intervention_id = $1
      ORDER BY session_date DESC
      LIMIT 10
    `;
    
    const sessionsResult = await executeSQL(sessionsQuery, [
      { name: '1', value: { longValue: id } }
    ]);

    if (sessionsResult) {
      intervention.sessions = sessionsResult.map(r => ({
        id: r.id as number,
        intervention_id: id,
        session_date: new Date(r.sessionDate as string),
        duration_minutes: nullToUndefined(r.durationMinutes as number | null),
        attended: r.attended as boolean,
        progress_notes: nullToUndefined(r.progressNotes as string | null),
        challenges: nullToUndefined(r.challenges as string | null),
        next_steps: nullToUndefined(r.nextSteps as string | null),
        recorded_by: 0,
        created_at: new Date(),
        updated_at: new Date(),
      }));
    }

    // Get goals
    const goalsQuery = `
      SELECT id, goal_text, target_date, is_achieved, 
             achieved_date, evidence
      FROM intervention_goals
      WHERE intervention_id = $1
      ORDER BY target_date
    `;
    
    const goalsResult = await executeSQL(goalsQuery, [
      { name: '1', value: { longValue: id } }
    ]);

    if (goalsResult) {
      intervention.goalDetails = goalsResult.map(r => ({
        id: r.id as number,
        intervention_id: id,
        goal_text: r.goalText as string,
        target_date: r.targetDate ? new Date(r.targetDate as string) : undefined,
        is_achieved: r.isAchieved as boolean,
        achieved_date: r.achievedDate ? new Date(r.achievedDate as string) : undefined,
        evidence: nullToUndefined(r.evidence as string | null),
        created_at: new Date(),
        updated_at: new Date(),
      }));
    }

    return { isSuccess: true, message: 'Intervention fetched successfully', data: intervention };
  } catch (error) {
    // Error logged: Error fetching intervention
    return { isSuccess: false, message: 'Failed to fetch intervention details' };
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
      throw ErrorFactories.authNoSession()
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'interventions');
    if (!hasAccess) {
      log.warn("Access denied - no intervention permission", { userId: currentUser.data.user.id })
      throw ErrorFactories.authInsufficientPermissions('You do not have permission to create interventions')
    }

    // Validate input
    const validationResult = createInterventionSchema.safeParse(input);
    if (!validationResult.success) {
      log.warn("Validation failed", { errors: validationResult.error.issues })
      throw ErrorFactories.validation(validationResult.error.issues[0].message)
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
      throw ErrorFactories.database('Failed to create intervention')
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
      start_date: new Date(row.startDate || ''),
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
      context: "createInterventionAction",
      requestId,
      operation: "createIntervention"
    })
  }
}

// Update intervention
export async function updateInterventionAction(
  input: Partial<CreateInterventionInput> & { id: number }
): Promise<ActionState<Intervention>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'interventions');
    if (!hasAccess) {
      return { isSuccess: false, message: 'You do not have permission to update interventions' };
    }

    // Validate input
    const validationResult = updateInterventionSchema.safeParse(input);
    if (!validationResult.success) {
      return { 
        isSuccess: false, 
        message: validationResult.error.issues[0].message 
      };
    }

    const { id, ...updateFields } = validationResult.data;

    // Build dynamic update query
    const updateParts: string[] = [];
    const parameters: any[] = [];
    let paramIndex = 1;

    // Handle status change to completed
    if (updateFields.status === 'completed') {
      updateParts.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    Object.entries(updateFields).forEach(([key, value]) => {
      if (value !== undefined && key !== 'completed_at') {
        updateParts.push(`${key} = $${paramIndex}`);
        if (value === null || value === '') {
          parameters.push({ name: `${paramIndex}`, value: { isNull: true } });
        } else {
          parameters.push({ 
            name: `${paramIndex}`, 
            value: typeof value === 'number' 
              ? { longValue: value } 
              : { stringValue: String(value) } 
          });
        }
        paramIndex++;
      }
    });

    // Add updated_at
    updateParts.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add id parameter
    parameters.push({ name: `${paramIndex}`, value: { longValue: id } });

    const updateQuery = `
      UPDATE interventions 
      SET ${updateParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await executeSQL(updateQuery, parameters);
    
    if (!result || result.length === 0) {
      return { isSuccess: false, message: 'Failed to update intervention' };
    }

    const row = result[0];
    const updatedIntervention: Intervention = {
      id: row.id as number,
      student_id: row.studentId as number,
      program_id: nullToUndefined(row.programId as number | null),
      type: row.type as InterventionType,
      status: row.status as InterventionStatus,
      title: row.title as string,
      description: nullToUndefined(row.description as string | null),
      goals: nullToUndefined(row.goals as string | null),
      start_date: new Date(row.startDate as string),
      end_date: row.endDate ? new Date(row.endDate as string) : undefined,
      frequency: nullToUndefined(row.frequency as string | null),
      duration_minutes: nullToUndefined(row.durationMinutes as number | null),
      location: nullToUndefined(row.location as string | null),
      assigned_to: nullToUndefined(row.assignedTo as number | null),
      created_by: row.createdBy as number,
      created_at: new Date(row.createdAt as string),
      updated_at: new Date(row.updatedAt as string),
      completed_at: row.completedAt ? new Date(row.completedAt as string) : undefined,
      completion_notes: nullToUndefined(row.completionNotes as string | null),
    };

    revalidatePath('/interventions');
    revalidatePath(`/interventions/${id}`);
    return { isSuccess: true, message: 'Intervention updated successfully', data: updatedIntervention };
  } catch (error) {
    // Error logged: Error updating intervention
    return { isSuccess: false, message: 'Failed to update intervention' };
  }
}

// Delete intervention
export async function deleteInterventionAction(id: number): Promise<ActionState<void>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'interventions');
    if (!hasAccess) {
      return { isSuccess: false, message: 'You do not have permission to delete interventions' };
    }

    // Delete related records first (cascade)
    await executeSQL('DELETE FROM intervention_sessions WHERE intervention_id = $1', [
      { name: '1', value: { longValue: id } }
    ]);
    
    await executeSQL('DELETE FROM intervention_goals WHERE intervention_id = $1', [
      { name: '1', value: { longValue: id } }
    ]);
    
    await executeSQL('DELETE FROM intervention_team WHERE intervention_id = $1', [
      { name: '1', value: { longValue: id } }
    ]);
    
    await executeSQL('DELETE FROM intervention_attachments WHERE intervention_id = $1', [
      { name: '1', value: { longValue: id } }
    ]);

    // Delete the intervention
    const result = await executeSQL(
      'DELETE FROM interventions WHERE id = $1',
      [{ name: '1', value: { longValue: id } }]
    );

    if (!result || result.length === 0) {
      return { isSuccess: false, message: 'Intervention not found' };
    }

    revalidatePath('/interventions');
    return { isSuccess: true, message: 'Intervention deleted successfully', data: undefined };
  } catch (error) {
    // Error logged: Error deleting intervention
    return { isSuccess: false, message: 'Failed to delete intervention' };
  }
}