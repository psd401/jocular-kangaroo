'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { executeSQL } from '@/lib/db/data-api-client';
import { ActionState } from '@/types/actions-types';
import { 
  Student, 
  StudentWithDetails, 
  CreateStudentInput, 
  GradeLevel, 
  StudentStatus 
} from '@/types/intervention-types';
import { getCurrentUser } from './get-current-user-action';
import { hasToolAccess } from '@/lib/auth/role-helpers';

// Validation schemas
const createStudentSchema = z.object({
  student_id: z.string().min(1, 'Student ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  middle_name: z.string().optional(),
  date_of_birth: z.string().optional(),
  grade: z.enum(['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']),
  school_id: z.number().optional(),
  status: z.enum(['active', 'inactive', 'transferred', 'graduated']).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  notes: z.string().optional(),
});

const updateStudentSchema = createStudentSchema.partial().extend({
  id: z.number(),
});

// Get all students with optional filters
export async function getStudentsAction(filters?: {
  grade?: GradeLevel;
  status?: StudentStatus;
  school_id?: number;
  search?: string;
}): Promise<ActionState<Student[]>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    let query = `
      SELECT 
        s.*,
        sch.name as school_name,
        u1.first_name || ' ' || u1.last_name as created_by_name,
        u2.first_name || ' ' || u2.last_name as updated_by_name
      FROM students s
      LEFT JOIN schools sch ON s.school_id = sch.id
      LEFT JOIN users u1 ON s.created_by = u1.id
      LEFT JOIN users u2 ON s.updated_by = u2.id
      WHERE 1=1
    `;
    
    const parameters: any[] = [];
    let paramIndex = 1;

    if (filters?.grade) {
      query += ` AND s.grade = $${paramIndex}`;
      parameters.push({ name: `${paramIndex}`, value: { stringValue: filters.grade } });
      paramIndex++;
    }

    if (filters?.status) {
      query += ` AND s.status = $${paramIndex}`;
      parameters.push({ name: `${paramIndex}`, value: { stringValue: filters.status } });
      paramIndex++;
    }

    if (filters?.school_id) {
      query += ` AND s.school_id = $${paramIndex}`;
      parameters.push({ name: `${paramIndex}`, value: { longValue: filters.school_id } });
      paramIndex++;
    }

    if (filters?.search) {
      query += ` AND (
        LOWER(s.first_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(s.last_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(s.student_id) LIKE LOWER($${paramIndex})
      )`;
      parameters.push({ name: `${paramIndex}`, value: { stringValue: `%${filters.search}%` } });
      paramIndex++;
    }

    query += ` ORDER BY s.last_name, s.first_name`;

    const result = await executeSQL(query, parameters);
    const students = result.records?.map(record => ({
      id: record[0].longValue!,
      student_id: record[1].stringValue!,
      first_name: record[2].stringValue!,
      last_name: record[3].stringValue!,
      middle_name: record[4].stringValue,
      date_of_birth: record[5].stringValue ? new Date(record[5].stringValue) : undefined,
      grade: record[6].stringValue as GradeLevel,
      school_id: record[7].longValue,
      status: record[8].stringValue as StudentStatus,
      email: record[9].stringValue,
      phone: record[10].stringValue,
      address: record[11].stringValue,
      emergency_contact_name: record[12].stringValue,
      emergency_contact_phone: record[13].stringValue,
      notes: record[14].stringValue,
      created_at: new Date(record[15].stringValue!),
      updated_at: new Date(record[16].stringValue!),
      created_by: record[17].longValue,
      updated_by: record[18].longValue,
      school_name: record[19].stringValue,
      created_by_name: record[20].stringValue,
      updated_by_name: record[21].stringValue,
    })) || [];

    return { success: true, data: students };
  } catch (error) {
    console.error('Error fetching students:', error);
    return { success: false, error: 'Failed to fetch students' };
  }
}

// Get single student by ID
export async function getStudentByIdAction(id: number): Promise<ActionState<StudentWithDetails>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Get student details
    const studentQuery = `
      SELECT 
        s.*,
        sch.name as school_name,
        sch.district as school_district
      FROM students s
      LEFT JOIN schools sch ON s.school_id = sch.id
      WHERE s.id = $1
    `;
    
    const studentResult = await executeSQL(studentQuery, [
      { name: '1', value: { longValue: id } }
    ]);

    if (!studentResult.records || studentResult.records.length === 0) {
      return { success: false, error: 'Student not found' };
    }

    const record = studentResult.records[0];
    const student: StudentWithDetails = {
      id: record[0].longValue!,
      student_id: record[1].stringValue!,
      first_name: record[2].stringValue!,
      last_name: record[3].stringValue!,
      middle_name: record[4].stringValue,
      date_of_birth: record[5].stringValue ? new Date(record[5].stringValue) : undefined,
      grade: record[6].stringValue as GradeLevel,
      school_id: record[7].longValue,
      status: record[8].stringValue as StudentStatus,
      email: record[9].stringValue,
      phone: record[10].stringValue,
      address: record[11].stringValue,
      emergency_contact_name: record[12].stringValue,
      emergency_contact_phone: record[13].stringValue,
      notes: record[14].stringValue,
      created_at: new Date(record[15].stringValue!),
      updated_at: new Date(record[16].stringValue!),
      created_by: record[17].longValue,
      updated_by: record[18].longValue,
      school: record[7].longValue ? {
        id: record[7].longValue,
        name: record[19].stringValue!,
        district: record[20].stringValue,
        created_at: new Date(),
        updated_at: new Date(),
      } : undefined,
      guardians: [],
      interventions: [],
    };

    // Get guardians
    const guardiansQuery = `
      SELECT * FROM student_guardians 
      WHERE student_id = $1 
      ORDER BY is_primary_contact DESC, last_name, first_name
    `;
    
    const guardiansResult = await executeSQL(guardiansQuery, [
      { name: '1', value: { longValue: id } }
    ]);

    if (guardiansResult.records) {
      student.guardians = guardiansResult.records.map(g => ({
        id: g[0].longValue!,
        student_id: g[1].longValue!,
        first_name: g[2].stringValue!,
        last_name: g[3].stringValue!,
        relationship: g[4].stringValue,
        email: g[5].stringValue,
        phone: g[6].stringValue,
        is_primary_contact: g[7].booleanValue!,
        created_at: new Date(g[8].stringValue!),
        updated_at: new Date(g[9].stringValue!),
      }));
    }

    return { success: true, data: student };
  } catch (error) {
    console.error('Error fetching student:', error);
    return { success: false, error: 'Failed to fetch student details' };
  }
}

// Create new student
export async function createStudentAction(
  input: CreateStudentInput
): Promise<ActionState<Student>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user has permission to create students
    const hasAccess = await hasToolAccess(currentUser.id, 'students');
    if (!hasAccess) {
      return { success: false, error: 'You do not have permission to create students' };
    }

    // Validate input
    const validationResult = createStudentSchema.safeParse(input);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: validationResult.error.errors[0].message 
      };
    }

    const data = validationResult.data;

    // Check if student ID already exists
    const existingCheck = await executeSQL(
      'SELECT id FROM students WHERE student_id = $1',
      [{ name: '1', value: { stringValue: data.student_id } }]
    );

    if (existingCheck.records && existingCheck.records.length > 0) {
      return { success: false, error: 'A student with this ID already exists' };
    }

    // Insert new student
    const insertQuery = `
      INSERT INTO students (
        student_id, first_name, last_name, middle_name, date_of_birth,
        grade, school_id, status, email, phone, address,
        emergency_contact_name, emergency_contact_phone, notes,
        created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15
      ) RETURNING *
    `;

    const parameters = [
      { name: '1', value: { stringValue: data.student_id } },
      { name: '2', value: { stringValue: data.first_name } },
      { name: '3', value: { stringValue: data.last_name } },
      { name: '4', value: data.middle_name ? { stringValue: data.middle_name } : { isNull: true } },
      { name: '5', value: data.date_of_birth ? { stringValue: data.date_of_birth } : { isNull: true } },
      { name: '6', value: { stringValue: data.grade } },
      { name: '7', value: data.school_id ? { longValue: data.school_id } : { isNull: true } },
      { name: '8', value: { stringValue: data.status || 'active' } },
      { name: '9', value: data.email ? { stringValue: data.email } : { isNull: true } },
      { name: '10', value: data.phone ? { stringValue: data.phone } : { isNull: true } },
      { name: '11', value: data.address ? { stringValue: data.address } : { isNull: true } },
      { name: '12', value: data.emergency_contact_name ? { stringValue: data.emergency_contact_name } : { isNull: true } },
      { name: '13', value: data.emergency_contact_phone ? { stringValue: data.emergency_contact_phone } : { isNull: true } },
      { name: '14', value: data.notes ? { stringValue: data.notes } : { isNull: true } },
      { name: '15', value: { longValue: currentUser.id } },
    ];

    const result = await executeSQL(insertQuery, parameters);
    
    if (!result.records || result.records.length === 0) {
      return { success: false, error: 'Failed to create student' };
    }

    const record = result.records[0];
    const newStudent: Student = {
      id: record[0].longValue!,
      student_id: record[1].stringValue!,
      first_name: record[2].stringValue!,
      last_name: record[3].stringValue!,
      middle_name: record[4].stringValue,
      date_of_birth: record[5].stringValue ? new Date(record[5].stringValue) : undefined,
      grade: record[6].stringValue as GradeLevel,
      school_id: record[7].longValue,
      status: record[8].stringValue as StudentStatus,
      email: record[9].stringValue,
      phone: record[10].stringValue,
      address: record[11].stringValue,
      emergency_contact_name: record[12].stringValue,
      emergency_contact_phone: record[13].stringValue,
      notes: record[14].stringValue,
      created_at: new Date(record[15].stringValue!),
      updated_at: new Date(record[16].stringValue!),
      created_by: record[17].longValue,
      updated_by: record[18].longValue,
    };

    revalidatePath('/students');
    return { success: true, data: newStudent };
  } catch (error) {
    console.error('Error creating student:', error);
    return { success: false, error: 'Failed to create student' };
  }
}

// Update student
export async function updateStudentAction(
  input: Partial<CreateStudentInput> & { id: number }
): Promise<ActionState<Student>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user has permission
    const hasAccess = await hasToolAccess(currentUser.id, 'students');
    if (!hasAccess) {
      return { success: false, error: 'You do not have permission to update students' };
    }

    // Validate input
    const validationResult = updateStudentSchema.safeParse(input);
    if (!validationResult.success) {
      return { 
        success: false, 
        error: validationResult.error.errors[0].message 
      };
    }

    const data = validationResult.data;
    const { id, ...updateFields } = data;

    // Build dynamic update query
    const updateParts: string[] = [];
    const parameters: any[] = [];
    let paramIndex = 1;

    Object.entries(updateFields).forEach(([key, value]) => {
      if (value !== undefined) {
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

    // Add updated_by
    updateParts.push(`updated_by = $${paramIndex}`);
    parameters.push({ name: `${paramIndex}`, value: { longValue: currentUser.id } });
    paramIndex++;

    // Add updated_at
    updateParts.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add id parameter
    parameters.push({ name: `${paramIndex}`, value: { longValue: id } });

    const updateQuery = `
      UPDATE students 
      SET ${updateParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await executeSQL(updateQuery, parameters);
    
    if (!result.records || result.records.length === 0) {
      return { success: false, error: 'Failed to update student' };
    }

    const record = result.records[0];
    const updatedStudent: Student = {
      id: record[0].longValue!,
      student_id: record[1].stringValue!,
      first_name: record[2].stringValue!,
      last_name: record[3].stringValue!,
      middle_name: record[4].stringValue,
      date_of_birth: record[5].stringValue ? new Date(record[5].stringValue) : undefined,
      grade: record[6].stringValue as GradeLevel,
      school_id: record[7].longValue,
      status: record[8].stringValue as StudentStatus,
      email: record[9].stringValue,
      phone: record[10].stringValue,
      address: record[11].stringValue,
      emergency_contact_name: record[12].stringValue,
      emergency_contact_phone: record[13].stringValue,
      notes: record[14].stringValue,
      created_at: new Date(record[15].stringValue!),
      updated_at: new Date(record[16].stringValue!),
      created_by: record[17].longValue,
      updated_by: record[18].longValue,
    };

    revalidatePath('/students');
    revalidatePath(`/students/${id}`);
    return { success: true, data: updatedStudent };
  } catch (error) {
    console.error('Error updating student:', error);
    return { success: false, error: 'Failed to update student' };
  }
}

// Delete student (soft delete by changing status)
export async function deleteStudentAction(id: number): Promise<ActionState<void>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user has permission
    const hasAccess = await hasToolAccess(currentUser.id, 'students');
    if (!hasAccess) {
      return { success: false, error: 'You do not have permission to delete students' };
    }

    // Check if student has active interventions
    const activeInterventionsCheck = await executeSQL(
      `SELECT COUNT(*) as count FROM interventions 
       WHERE student_id = $1 AND status IN ('planned', 'in_progress')`,
      [{ name: '1', value: { longValue: id } }]
    );

    const activeCount = activeInterventionsCheck.records?.[0]?.[0]?.longValue || 0;
    if (activeCount > 0) {
      return { 
        success: false, 
        error: 'Cannot delete student with active interventions. Please complete or cancel all interventions first.' 
      };
    }

    // Soft delete by setting status to inactive
    const result = await executeSQL(
      `UPDATE students 
       SET status = 'inactive', 
           updated_by = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [
        { name: '1', value: { longValue: currentUser.id } },
        { name: '2', value: { longValue: id } }
      ]
    );

    if (!result.numberOfRecordsUpdated || result.numberOfRecordsUpdated === 0) {
      return { success: false, error: 'Student not found' };
    }

    revalidatePath('/students');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error deleting student:', error);
    return { success: false, error: 'Failed to delete student' };
  }
}