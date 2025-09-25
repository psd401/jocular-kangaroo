'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { executeSQL } from '@/lib/db/data-api-adapter';
import { ActionState } from '@/types/actions-types';
import { InterventionProgram, InterventionType } from '@/types/intervention-types';
import { getCurrentUserAction } from './get-current-user-action';
import { hasToolAccess } from '@/lib/auth/tool-helpers';

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
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
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

    const result = await executeSQL<any>(query);
    const programs = result.map(row => ({
      id: row.id as number,
      name: row.name as string,
      description: row.description as string | undefined,
      type: row.type as InterventionType,
      duration_days: row.durationDays as number | undefined,
      materials: row.materials as string | undefined,
      goals: row.goals as string | undefined,
      is_active: row.isActive as boolean,
      created_at: new Date(row.createdAt as string),
      updated_at: new Date(row.updatedAt as string),
    }));

    return { isSuccess: true, message: 'Programs fetched successfully', data: programs };
  } catch (error) {
    // Error logged: Error fetching intervention programs
    return { isSuccess: false, message: 'Failed to fetch intervention programs' };
  }
}

// Get single program by ID
export async function getInterventionProgramByIdAction(
  id: number
): Promise<ActionState<InterventionProgram>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    const query = `
      SELECT 
        id, name, description, type, duration_days,
        materials, goals, is_active, created_at, updated_at
      FROM intervention_programs
      WHERE id = $1
    `;
    
    const result = await executeSQL<any>(query, [
      { name: '1', value: { longValue: id } }
    ]);

    if (!result || result.length === 0) {
      return { isSuccess: false, message: 'Program not found' };
    }

    const row = result[0];
    const program: InterventionProgram = {
      id: row.id as number,
      name: row.name as string,
      description: row.description as string | undefined,
      type: row.type as InterventionType,
      duration_days: row.durationDays as number | undefined,
      materials: row.materials as string | undefined,
      goals: row.goals as string | undefined,
      is_active: row.isActive as boolean,
      created_at: new Date(row.createdAt as string),
      updated_at: new Date(row.updatedAt as string),
    };

    return { isSuccess: true, message: 'Program fetched successfully', data: program };
  } catch (error) {
    // Error logged: Error fetching intervention program
    return { isSuccess: false, message: 'Failed to fetch intervention program' };
  }
}

// Create new intervention program
export async function createInterventionProgramAction(
  input: z.infer<typeof createProgramSchema>
): Promise<ActionState<InterventionProgram>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'programs');
    if (!hasAccess) {
      return { isSuccess: false, message: 'You do not have permission to create programs' };
    }

    // Validate input
    const validationResult = createProgramSchema.safeParse(input);
    if (!validationResult.success) {
      return { 
        isSuccess: false, 
        message: validationResult.error.issues[0].message 
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

    const result = await executeSQL<any>(insertQuery, parameters);
    
    if (!result || result.length === 0) {
      return { isSuccess: false, message: 'Failed to create program' };
    }

    const row = result[0];
    const newProgram: InterventionProgram = {
      id: row.id as number,
      name: row.name as string,
      description: row.description as string | undefined,
      type: row.type as InterventionType,
      duration_days: row.durationDays as number | undefined,
      materials: row.materials as string | undefined,
      goals: row.goals as string | undefined,
      is_active: row.isActive as boolean,
      created_at: new Date(row.createdAt as string),
      updated_at: new Date(row.updatedAt as string),
    };

    revalidatePath('/programs');
    return { isSuccess: true, message: 'Program created successfully', data: newProgram };
  } catch (error) {
    // Error logged: Error creating intervention program
    return { isSuccess: false, message: 'Failed to create intervention program' };
  }
}

// Update intervention program
export async function updateInterventionProgramAction(
  input: z.infer<typeof updateProgramSchema>
): Promise<ActionState<InterventionProgram>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'programs');
    if (!hasAccess) {
      return { isSuccess: false, message: 'You do not have permission to update programs' };
    }

    // Validate input
    const validationResult = updateProgramSchema.safeParse(input);
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

    const result = await executeSQL<any>(updateQuery, parameters);
    
    if (!result || result.length === 0) {
      return { isSuccess: false, message: 'Failed to update program' };
    }

    const row = result[0];
    const updatedProgram: InterventionProgram = {
      id: row.id as number,
      name: row.name as string,
      description: row.description as string | undefined,
      type: row.type as InterventionType,
      duration_days: row.durationDays as number | undefined,
      materials: row.materials as string | undefined,
      goals: row.goals as string | undefined,
      is_active: row.isActive as boolean,
      created_at: new Date(row.createdAt as string),
      updated_at: new Date(row.updatedAt as string),
    };

    revalidatePath('/programs');
    revalidatePath(`/programs/${id}`);
    return { isSuccess: true, message: 'Program updated successfully', data: updatedProgram };
  } catch (error) {
    // Error logged: Error updating intervention program
    return { isSuccess: false, message: 'Failed to update intervention program' };
  }
}

// Delete (deactivate) intervention program
export async function deleteInterventionProgramAction(id: number): Promise<ActionState<void>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check permissions
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'programs');
    if (!hasAccess) {
      return { isSuccess: false, message: 'You do not have permission to delete programs' };
    }

    // Check if program is being used by active interventions
    const activeCheck = await executeSQL<any>(
      `SELECT COUNT(*) as count FROM interventions 
       WHERE program_id = $1 AND status IN ('planned', 'in_progress')`,
      [{ name: '1', value: { longValue: id } }]
    );

    const activeCount = activeCheck[0]?.count || 0;
    if (activeCount > 0) {
      return { 
        isSuccess: false, 
        message: 'Cannot delete program that is being used by active interventions' 
      };
    }

    // Soft delete by setting is_active to false
    const result = await executeSQL(
      `UPDATE intervention_programs 
       SET is_active = false, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1
       RETURNING id`,
      [{ name: '1', value: { longValue: id } }]
    );

    if (!result || result.length === 0) {
      return { isSuccess: false, message: 'Program not found' };
    }

    revalidatePath('/programs');
    return { isSuccess: true, message: 'Program deleted successfully', data: undefined };
  } catch (error) {
    // Error logged: Error deleting intervention program
    return { isSuccess: false, message: 'Failed to delete intervention program' };
  }
}