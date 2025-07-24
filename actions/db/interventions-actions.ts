'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { executeSQL } from '@/lib/db/data-api-client';
import { ActionState } from '@/types/actions-types';
import { 
  Intervention, 
  InterventionWithDetails, 
  CreateInterventionInput,
  InterventionType,
  InterventionStatus 
} from '@/types/intervention-types';
import { getCurrentUser } from './get-current-user-action';
import { hasToolAccess } from '@/lib/auth/role-helpers';

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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
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
    const interventions = result.records?.map(record => ({
      id: record[0].longValue!,
      student_id: record[1].longValue!,
      program_id: record[2].longValue,
      type: record[3].stringValue as InterventionType,
      status: record[4].stringValue as InterventionStatus,
      title: record[5].stringValue!,
      description: record[6].stringValue,
      goals: record[7].stringValue,
      start_date: new Date(record[8].stringValue!),
      end_date: record[9].stringValue ? new Date(record[9].stringValue) : undefined,
      frequency: record[10].stringValue,
      duration_minutes: record[11].longValue,
      location: record[12].stringValue,
      assigned_to: record[13].longValue,
      created_by: record[14].longValue!,
      created_at: new Date(record[15].stringValue!),
      updated_at: new Date(record[16].stringValue!),
      completed_at: record[17].stringValue ? new Date(record[17].stringValue) : undefined,
      completion_notes: record[18].stringValue,
      student: {
        id: record[1].longValue!,
        student_id: record[19].stringValue!,
        first_name: record[20].stringValue!,
        last_name: record[21].stringValue!,
        grade: record[22].stringValue as any,
        middle_name: undefined,
        status: 'active' as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
      program: record[2].longValue ? {
        id: record[2].longValue,
        name: record[23].stringValue!,
        type: record[3].stringValue as InterventionType,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } : undefined,
      assigned_to_user: record[13].longValue ? {
        id: record[13].longValue,
        first_name: record[24].stringValue!,
        last_name: record[25].stringValue!,
      } : undefined,
    })) || [];

    return { success: true, data: interventions };
  } catch (error) {
    console.error('Error fetching interventions:', error);
    return { success: false, error: 'Failed to fetch interventions' };
  }
}

// Get single intervention by ID with full details
export async function getInterventionByIdAction(id: number): Promise<ActionState<InterventionWithDetails>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
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

    if (!interventionResult.records || interventionResult.records.length === 0) {
      return { success: false, error: 'Intervention not found' };
    }

    const record = interventionResult.records[0];
    const intervention: InterventionWithDetails = {
      id: record[0].longValue!,
      student_id: record[1].longValue!,
      program_id: record[2].longValue,
      type: record[3].stringValue as InterventionType,
      status: record[4].stringValue as InterventionStatus,
      title: record[5].stringValue!,
      description: record[6].stringValue,
      goals: record[7].stringValue,
      start_date: new Date(record[8].stringValue!),
      end_date: record[9].stringValue ? new Date(record[9].stringValue) : undefined,
      frequency: record[10].stringValue,
      duration_minutes: record[11].longValue,
      location: record[12].stringValue,
      assigned_to: record[13].longValue,
      created_by: record[14].longValue!,
      created_at: new Date(record[15].stringValue!),
      updated_at: new Date(record[16].stringValue!),
      completed_at: record[17].stringValue ? new Date(record[17].stringValue) : undefined,
      completion_notes: record[18].stringValue,
      student: {
        id: record[1].longValue!,
        student_id: record[19].stringValue!,
        first_name: record[20].stringValue!,
        last_name: record[21].stringValue!,
        grade: record[22].stringValue as any,
        middle_name: undefined,
        status: 'active' as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
      program: record[2].longValue ? {
        id: record[2].longValue,
        name: record[23].stringValue!,
        type: record[3].stringValue as InterventionType,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      } : undefined,
      assigned_to_user: record[13].longValue ? {
        id: record[13].longValue,
        first_name: record[24].stringValue!,
        last_name: record[25].stringValue!,
      } : undefined,
      team_members: [],
      sessions: [],
      goals: [],
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

    if (teamResult.records) {
      intervention.team_members = teamResult.records.map(r => ({
        id: r[0].longValue!,
        intervention_id: id,
        user_id: r[1].longValue!,
        role: r[2].stringValue,
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

    if (sessionsResult.records) {
      intervention.sessions = sessionsResult.records.map(r => ({
        id: r[0].longValue!,
        intervention_id: id,
        session_date: new Date(r[1].stringValue!),
        duration_minutes: r[2].longValue,
        attended: r[3].booleanValue!,
        progress_notes: r[4].stringValue,
        challenges: r[5].stringValue,
        next_steps: r[6].stringValue,
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

    if (goalsResult.records) {
      intervention.goals = goalsResult.records.map(r => ({
        id: r[0].longValue!,
        intervention_id: id,
        goal_text: r[1].stringValue!,
        target_date: r[2].stringValue ? new Date(r[2].stringValue) : undefined,
        is_achieved: r[3].booleanValue!,
        achieved_date: r[4].stringValue ? new Date(r[4].stringValue) : undefined,
        evidence: r[5].stringValue,
        created_at: new Date(),
        updated_at: new Date(),
      }));
    }

    return { success: true, data: intervention };
  } catch (error) {
    console.error('Error fetching intervention:', error);
    return { success: false, error: 'Failed to fetch intervention details' };
  }
}

// Create new intervention
export async function createInterventionAction(
  input: CreateInterventionInput
): Promise<ActionState<Intervention>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.id, 'interventions');
    if (!hasAccess) {
      return { success: false, error: 'You do not have permission to create interventions' };
    }

    // Validate input
    const validationResult = createInterventionSchema.safeParse(input);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: validationResult.error.errors[0].message 
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
      { name: '14', value: { longValue: currentUser.id } },
    ];

    const result = await executeSQL(insertQuery, parameters);
    
    if (!result.records || result.records.length === 0) {
      return { success: false, error: 'Failed to create intervention' };
    }

    const record = result.records[0];
    const newIntervention: Intervention = {
      id: record[0].longValue!,
      student_id: record[1].longValue!,
      program_id: record[2].longValue,
      type: record[3].stringValue as InterventionType,
      status: record[4].stringValue as InterventionStatus,
      title: record[5].stringValue!,
      description: record[6].stringValue,
      goals: record[7].stringValue,
      start_date: new Date(record[8].stringValue!),
      end_date: record[9].stringValue ? new Date(record[9].stringValue) : undefined,
      frequency: record[10].stringValue,
      duration_minutes: record[11].longValue,
      location: record[12].stringValue,
      assigned_to: record[13].longValue,
      created_by: record[14].longValue!,
      created_at: new Date(record[15].stringValue!),
      updated_at: new Date(record[16].stringValue!),
      completed_at: record[17].stringValue ? new Date(record[17].stringValue) : undefined,
      completion_notes: record[18].stringValue,
    };

    revalidatePath('/interventions');
    revalidatePath(`/students/${data.student_id}`);
    return { success: true, data: newIntervention };
  } catch (error) {
    console.error('Error creating intervention:', error);
    return { success: false, error: 'Failed to create intervention' };
  }
}

// Update intervention
export async function updateInterventionAction(
  input: Partial<CreateInterventionInput> & { id: number }
): Promise<ActionState<Intervention>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.id, 'interventions');
    if (!hasAccess) {
      return { success: false, error: 'You do not have permission to update interventions' };
    }

    // Validate input
    const validationResult = updateInterventionSchema.safeParse(input);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: validationResult.error.errors[0].message 
      };
    }

    const { id, ...updateFields } = validationResult.data;

    // Build dynamic update query
    const updateParts: string[] = [];
    const parameters: any[] = [];
    let paramIndex = 1;

    // Handle status change to completed
    if (updateFields.status === 'completed' && !updateFields.completed_at) {
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
    
    if (!result.records || result.records.length === 0) {
      return { success: false, error: 'Failed to update intervention' };
    }

    const record = result.records[0];
    const updatedIntervention: Intervention = {
      id: record[0].longValue!,
      student_id: record[1].longValue!,
      program_id: record[2].longValue,
      type: record[3].stringValue as InterventionType,
      status: record[4].stringValue as InterventionStatus,
      title: record[5].stringValue!,
      description: record[6].stringValue,
      goals: record[7].stringValue,
      start_date: new Date(record[8].stringValue!),
      end_date: record[9].stringValue ? new Date(record[9].stringValue) : undefined,
      frequency: record[10].stringValue,
      duration_minutes: record[11].longValue,
      location: record[12].stringValue,
      assigned_to: record[13].longValue,
      created_by: record[14].longValue!,
      created_at: new Date(record[15].stringValue!),
      updated_at: new Date(record[16].stringValue!),
      completed_at: record[17].stringValue ? new Date(record[17].stringValue) : undefined,
      completion_notes: record[18].stringValue,
    };

    revalidatePath('/interventions');
    revalidatePath(`/interventions/${id}`);
    return { success: true, data: updatedIntervention };
  } catch (error) {
    console.error('Error updating intervention:', error);
    return { success: false, error: 'Failed to update intervention' };
  }
}

// Delete intervention
export async function deleteInterventionAction(id: number): Promise<ActionState<void>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.id, 'interventions');
    if (!hasAccess) {
      return { success: false, error: 'You do not have permission to delete interventions' };
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

    if (!result.numberOfRecordsUpdated || result.numberOfRecordsUpdated === 0) {
      return { success: false, error: 'Intervention not found' };
    }

    revalidatePath('/interventions');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error deleting intervention:', error);
    return { success: false, error: 'Failed to delete intervention' };
  }
}