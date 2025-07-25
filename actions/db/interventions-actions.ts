'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { executeSQL } from '@/lib/db/data-api-adapter';
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
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    let query = `
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
      WHERE 1=1
    `;
    
    const parameters: any[] = [];
    let paramIndex = 1;

    if (filters?.student_id) {
      query += ` AND i.student_id = $${paramIndex}`;
      parameters.push({ name: `${paramIndex}`, value: { longValue: filters.student_id } });
      paramIndex++;
    }

    if (filters?.status) {
      query += ` AND i.status = $${paramIndex}`;
      parameters.push({ name: `${paramIndex}`, value: { stringValue: filters.status } });
      paramIndex++;
    }

    if (filters?.type) {
      query += ` AND i.type = $${paramIndex}`;
      parameters.push({ name: `${paramIndex}`, value: { stringValue: filters.type } });
      paramIndex++;
    }

    if (filters?.assigned_to) {
      query += ` AND i.assigned_to = $${paramIndex}`;
      parameters.push({ name: `${paramIndex}`, value: { longValue: filters.assigned_to } });
      paramIndex++;
    }

    if (filters?.start_date) {
      query += ` AND i.start_date >= $${paramIndex}`;
      parameters.push({ name: `${paramIndex}`, value: { stringValue: filters.start_date } });
      paramIndex++;
    }

    if (filters?.end_date) {
      query += ` AND i.end_date <= $${paramIndex}`;
      parameters.push({ name: `${paramIndex}`, value: { stringValue: filters.end_date } });
      paramIndex++;
    }

    query += ` ORDER BY i.start_date DESC, i.created_at DESC`;

    const result = await executeSQL(query, parameters);
    const interventions = result.map(row => ({
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
    }));

    return { isSuccess: true, message: 'Interventions fetched successfully', data: interventions };
  } catch (error) {
    // Error logged: Error fetching interventions
    return { isSuccess: false, message: 'Failed to fetch interventions' };
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
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'interventions');
    if (!hasAccess) {
      return { isSuccess: false, message: 'You do not have permission to create interventions' };
    }

    // Validate input
    const validationResult = createInterventionSchema.safeParse(input);
    if (!validationResult.success) {
      return { 
        isSuccess: false, 
        message: validationResult.error.errors[0].message 
      };
    }

    const data = validationResult.data;

    // Insert new intervention
    const insertQuery = `
      INSERT INTO interventions (
        student_id, program_id, type, status, title, description,
        goals, start_date, end_date, frequency, duration_minutes,
        location, assigned_to, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *
    `;

    const parameters = [
      { name: '1', value: { longValue: data.student_id } },
      { name: '2', value: data.program_id ? { longValue: data.program_id } : { isNull: true } },
      { name: '3', value: { stringValue: data.type } },
      { name: '4', value: { stringValue: data.status || 'planned' } },
      { name: '5', value: { stringValue: data.title } },
      { name: '6', value: data.description ? { stringValue: data.description } : { isNull: true } },
      { name: '7', value: data.goals ? { stringValue: data.goals } : { isNull: true } },
      { name: '8', value: { stringValue: data.start_date } },
      { name: '9', value: data.end_date ? { stringValue: data.end_date } : { isNull: true } },
      { name: '10', value: data.frequency ? { stringValue: data.frequency } : { isNull: true } },
      { name: '11', value: data.duration_minutes ? { longValue: data.duration_minutes } : { isNull: true } },
      { name: '12', value: data.location ? { stringValue: data.location } : { isNull: true } },
      { name: '13', value: data.assigned_to ? { longValue: data.assigned_to } : { isNull: true } },
      { name: '14', value: { longValue: currentUser.data.user.id } },
    ];

    const result = await executeSQL(insertQuery, parameters);
    
    if (!result || result.length === 0) {
      return { isSuccess: false, message: 'Failed to create intervention' };
    }

    const row = result[0];
    const newIntervention: Intervention = {
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
    revalidatePath(`/students/${data.student_id}`);
    return { isSuccess: true, message: 'Intervention created successfully', data: newIntervention };
  } catch (error) {
    // Error logged: Error creating intervention
    return { isSuccess: false, message: 'Failed to create intervention' };
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
        message: validationResult.error.errors[0].message 
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