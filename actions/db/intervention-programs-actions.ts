'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { executeSQL } from '@/lib/db/data-api-client';
import { ActionState } from '@/types/actions-types';
import { InterventionProgram, InterventionType } from '@/types/intervention-types';
import { getCurrentUser } from './get-current-user-action';
import { hasToolAccess } from '@/lib/auth/role-helpers';

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
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    let query = `
      SELECT 
        id, name, description, type, duration_days,
        materials, goals, is_active, created_at, updated_at
      FROM intervention_programs
    `;
    
    if (!includeInactive) {
      query += ' WHERE is_active = true';
    }
    
    query += ' ORDER BY type, name';

    const result = await executeSQL(query);
    const programs = result.records?.map(record => ({
      id: record[0].longValue!,
      name: record[1].stringValue!,
      description: record[2].stringValue,
      type: record[3].stringValue as InterventionType,
      duration_days: record[4].longValue,
      materials: record[5].stringValue,
      goals: record[6].stringValue,
      is_active: record[7].booleanValue!,
      created_at: new Date(record[8].stringValue!),
      updated_at: new Date(record[9].stringValue!),
    })) || [];

    return { success: true, data: programs };
  } catch (error) {
    console.error('Error fetching intervention programs:', error);
    return { success: false, error: 'Failed to fetch intervention programs' };
  }
}

// Get single program by ID
export async function getInterventionProgramByIdAction(
  id: number
): Promise<ActionState<InterventionProgram>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const query = `
      SELECT 
        id, name, description, type, duration_days,
        materials, goals, is_active, created_at, updated_at
      FROM intervention_programs
      WHERE id = $1
    `;
    
    const result = await executeSQL(query, [
      { name: '1', value: { longValue: id } }
    ]);

    if (!result.records || result.records.length === 0) {
      return { success: false, error: 'Program not found' };
    }

    const record = result.records[0];
    const program: InterventionProgram = {
      id: record[0].longValue!,
      name: record[1].stringValue!,
      description: record[2].stringValue,
      type: record[3].stringValue as InterventionType,
      duration_days: record[4].longValue,
      materials: record[5].stringValue,
      goals: record[6].stringValue,
      is_active: record[7].booleanValue!,
      created_at: new Date(record[8].stringValue!),
      updated_at: new Date(record[9].stringValue!),
    };

    return { success: true, data: program };
  } catch (error) {
    console.error('Error fetching intervention program:', error);
    return { success: false, error: 'Failed to fetch intervention program' };
  }
}

// Create new intervention program
export async function createInterventionProgramAction(
  input: z.infer<typeof createProgramSchema>
): Promise<ActionState<InterventionProgram>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.id, 'programs');
    if (!hasAccess) {
      return { success: false, error: 'You do not have permission to create programs' };
    }

    // Validate input
    const validationResult = createProgramSchema.safeParse(input);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: validationResult.error.errors[0].message 
      };
    }

    const data = validationResult.data;

    const insertQuery = `
      INSERT INTO intervention_programs (
        name, description, type, duration_days,
        materials, goals, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `;

    const parameters = [
      { name: '1', value: { stringValue: data.name } },
      { name: '2', value: data.description ? { stringValue: data.description } : { isNull: true } },
      { name: '3', value: { stringValue: data.type } },
      { name: '4', value: data.duration_days ? { longValue: data.duration_days } : { isNull: true } },
      { name: '5', value: data.materials ? { stringValue: data.materials } : { isNull: true } },
      { name: '6', value: data.goals ? { stringValue: data.goals } : { isNull: true } },
      { name: '7', value: { booleanValue: data.is_active ?? true } },
    ];

    const result = await executeSQL(insertQuery, parameters);
    
    if (!result.records || result.records.length === 0) {
      return { success: false, error: 'Failed to create program' };
    }

    const record = result.records[0];
    const newProgram: InterventionProgram = {
      id: record[0].longValue!,
      name: record[1].stringValue!,
      description: record[2].stringValue,
      type: record[3].stringValue as InterventionType,
      duration_days: record[4].longValue,
      materials: record[5].stringValue,
      goals: record[6].stringValue,
      is_active: record[7].booleanValue!,
      created_at: new Date(record[8].stringValue!),
      updated_at: new Date(record[9].stringValue!),
    };

    revalidatePath('/programs');
    return { success: true, data: newProgram };
  } catch (error) {
    console.error('Error creating intervention program:', error);
    return { success: false, error: 'Failed to create intervention program' };
  }
}

// Update intervention program
export async function updateInterventionProgramAction(
  input: z.infer<typeof updateProgramSchema>
): Promise<ActionState<InterventionProgram>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.id, 'programs');
    if (!hasAccess) {
      return { success: false, error: 'You do not have permission to update programs' };
    }

    // Validate input
    const validationResult = updateProgramSchema.safeParse(input);
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

    Object.entries(updateFields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateParts.push(`${key} = $${paramIndex}`);
        if (value === null || value === '') {
          parameters.push({ name: `${paramIndex}`, value: { isNull: true } });
        } else if (typeof value === 'boolean') {
          parameters.push({ name: `${paramIndex}`, value: { booleanValue: value } });
        } else if (typeof value === 'number') {
          parameters.push({ name: `${paramIndex}`, value: { longValue: value } });
        } else {
          parameters.push({ name: `${paramIndex}`, value: { stringValue: String(value) } });
        }
        paramIndex++;
      }
    });

    // Add updated_at
    updateParts.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add id parameter
    parameters.push({ name: `${paramIndex}`, value: { longValue: id } });

    const updateQuery = `
      UPDATE intervention_programs 
      SET ${updateParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await executeSQL(updateQuery, parameters);
    
    if (!result.records || result.records.length === 0) {
      return { success: false, error: 'Failed to update program' };
    }

    const record = result.records[0];
    const updatedProgram: InterventionProgram = {
      id: record[0].longValue!,
      name: record[1].stringValue!,
      description: record[2].stringValue,
      type: record[3].stringValue as InterventionType,
      duration_days: record[4].longValue,
      materials: record[5].stringValue,
      goals: record[6].stringValue,
      is_active: record[7].booleanValue!,
      created_at: new Date(record[8].stringValue!),
      updated_at: new Date(record[9].stringValue!),
    };

    revalidatePath('/programs');
    revalidatePath(`/programs/${id}`);
    return { success: true, data: updatedProgram };
  } catch (error) {
    console.error('Error updating intervention program:', error);
    return { success: false, error: 'Failed to update intervention program' };
  }
}

// Delete (deactivate) intervention program
export async function deleteInterventionProgramAction(id: number): Promise<ActionState<void>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.id, 'programs');
    if (!hasAccess) {
      return { success: false, error: 'You do not have permission to delete programs' };
    }

    // Check if program is being used by active interventions
    const activeCheck = await executeSQL(
      `SELECT COUNT(*) as count FROM interventions 
       WHERE program_id = $1 AND status IN ('planned', 'in_progress')`,
      [{ name: '1', value: { longValue: id } }]
    );

    const activeCount = activeCheck.records?.[0]?.[0]?.longValue || 0;
    if (activeCount > 0) {
      return { 
        success: false, 
        error: 'Cannot delete program that is being used by active interventions' 
      };
    }

    // Soft delete by setting is_active to false
    const result = await executeSQL(
      `UPDATE intervention_programs 
       SET is_active = false, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [{ name: '1', value: { longValue: id } }]
    );

    if (!result.numberOfRecordsUpdated || result.numberOfRecordsUpdated === 0) {
      return { success: false, error: 'Program not found' };
    }

    revalidatePath('/programs');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error deleting intervention program:', error);
    return { success: false, error: 'Failed to delete intervention program' };
  }
}