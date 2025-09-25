'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { executeSQL } from '@/lib/db/data-api-adapter';
import { ActionState } from '@/types/actions-types';
import { 
  Student, 
  StudentWithDetails, 
  CreateStudentInput, 
  GradeLevel, 
  StudentStatus 
} from '@/types/intervention-types';
import { getCurrentUserAction } from './get-current-user-action';
import { hasToolAccess } from '@/lib/auth/tool-helpers';

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
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
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
    const students = result.map((row: any) => ({
      id: row.id as number,
      student_id: row.studentId as string,
      first_name: row.firstName as string,
      last_name: row.lastName as string,
      middle_name: row.middleName as string | undefined,
      date_of_birth: row.dateOfBirth ? new Date(row.dateOfBirth as string) : undefined,
      grade: row.grade as GradeLevel,
      school_id: row.schoolId as number | undefined,
      status: row.status as StudentStatus,
      email: row.email as string | undefined,
      phone: row.phone as string | undefined,
      address: row.address as string | undefined,
      emergency_contact_name: row.emergencyContactName as string | undefined,
      emergency_contact_phone: row.emergencyContactPhone as string | undefined,
      notes: row.notes as string | undefined,
      created_at: new Date(row.createdAt as string),
      updated_at: new Date(row.updatedAt as string),
      created_by: row.createdBy as number | undefined,
      updated_by: row.updatedBy as number | undefined,
      school_name: row.schoolName as string | undefined,
      created_by_name: row.createdByName as string | undefined,
      updated_by_name: row.updatedByName as string | undefined,
    }));

    return { isSuccess: true, message: 'Students fetched successfully', data: students };
  } catch (error) {
    // Error logged: Error fetching students
    return { isSuccess: false, message: 'Failed to fetch students' };
  }
}

// Get single student by ID
export async function getStudentByIdAction(id: number): Promise<ActionState<StudentWithDetails>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
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

    if (!studentResult || studentResult.length === 0) {
      return { isSuccess: false, message: 'Student not found' };
    }

    const row = studentResult[0];
    const student: StudentWithDetails = {
      id: row.id as number,
      student_id: row.studentId as string,
      first_name: row.firstName as string,
      last_name: row.lastName as string,
      middle_name: row.middleName as string | undefined,
      date_of_birth: row.dateOfBirth ? new Date(row.dateOfBirth as string) : undefined,
      grade: row.grade as GradeLevel,
      school_id: row.schoolId as number | undefined,
      status: row.status as StudentStatus,
      email: row.email as string | undefined,
      phone: row.phone as string | undefined,
      address: row.address as string | undefined,
      emergency_contact_name: row.emergencyContactName as string | undefined,
      emergency_contact_phone: row.emergencyContactPhone as string | undefined,
      notes: row.notes as string | undefined,
      created_at: new Date(row.createdAt as string),
      updated_at: new Date(row.updatedAt as string),
      created_by: row.createdBy as number | undefined,
      updated_by: row.updatedBy as number | undefined,
      school: row.schoolId ? {
        id: row.schoolId as number,
        name: row.schoolName as string,
        district: row.schoolDistrict as string | undefined,
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

    if (guardiansResult) {
      student.guardians = guardiansResult.map((g: any) => ({
        id: g.id as number,
        student_id: g.studentId as number,
        first_name: g.firstName as string,
        last_name: g.lastName as string,
        relationship: g.relationship as string | undefined,
        email: g.email as string | undefined,
        phone: g.phone as string | undefined,
        is_primary_contact: g.isPrimaryContact as boolean,
        created_at: new Date(g.createdAt as string),
        updated_at: new Date(g.updatedAt as string),
      }));
    }

    return { isSuccess: true, message: 'Student fetched successfully', data: student };
  } catch (error) {
    // Error logged: Error fetching student
    return { isSuccess: false, message: 'Failed to fetch student details' };
  }
}

// Create new student
export async function createStudentAction(
  input: CreateStudentInput
): Promise<ActionState<Student>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check if user has permission to create students
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'students');
    if (!hasAccess) {
      return { isSuccess: false, message: 'You do not have permission to create students' };
    }

    // Validate input
    const validationResult = createStudentSchema.safeParse(input);
    if (!validationResult.success) {
      return { 
        isSuccess: false, 
        message: validationResult.error.issues[0].message 
      };
    }

    const data = validationResult.data;

    // Check if student ID already exists
    const existingCheck = await executeSQL(
      'SELECT id FROM students WHERE student_id = $1',
      [{ name: '1', value: { stringValue: data.student_id } }]
    );

    if (existingCheck && existingCheck.length > 0) {
      return { isSuccess: false, message: 'A student with this ID already exists' };
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
      { name: '15', value: { longValue: currentUser.data.user.id } },
    ];

    const result = await executeSQL(insertQuery, parameters);
    
    if (!result || result.length === 0) {
      return { isSuccess: false, message: 'Failed to create student' };
    }

    const row = result[0];
    const newStudent: Student = {
      id: row.id as number,
      student_id: row.studentId as string,
      first_name: row.firstName as string,
      last_name: row.lastName as string,
      middle_name: row.middleName as string | undefined,
      date_of_birth: row.dateOfBirth ? new Date(row.dateOfBirth as string) : undefined,
      grade: row.grade as GradeLevel,
      school_id: row.schoolId as number | undefined,
      status: row.status as StudentStatus,
      email: row.email as string | undefined,
      phone: row.phone as string | undefined,
      address: row.address as string | undefined,
      emergency_contact_name: row.emergencyContactName as string | undefined,
      emergency_contact_phone: row.emergencyContactPhone as string | undefined,
      notes: row.notes as string | undefined,
      created_at: new Date(row.createdAt as string),
      updated_at: new Date(row.updatedAt as string),
      created_by: row.createdBy as number | undefined,
      updated_by: row.updatedBy as number | undefined,
    };

    revalidatePath('/students');
    return { isSuccess: true, message: 'Student created successfully', data: newStudent };
  } catch (error) {
    // Error logged: Error creating student
    return { isSuccess: false, message: 'Failed to create student' };
  }
}

// Update student
export async function updateStudentAction(
  input: Partial<CreateStudentInput> & { id: number }
): Promise<ActionState<Student>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check if user has permission
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'students');
    if (!hasAccess) {
      return { isSuccess: false, message: 'You do not have permission to update students' };
    }

    // Validate input
    const validationResult = updateStudentSchema.safeParse(input);
    if (!validationResult.success) {
      return { 
        isSuccess: false, 
        message: validationResult.error.issues[0].message 
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
    parameters.push({ name: `${paramIndex}`, value: { longValue: currentUser.data.user.id } });
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
    
    if (!result || result.length === 0) {
      return { isSuccess: false, message: 'Failed to update student' };
    }

    const row = result[0];
    const updatedStudent: Student = {
      id: row.id as number,
      student_id: row.studentId as string,
      first_name: row.firstName as string,
      last_name: row.lastName as string,
      middle_name: row.middleName as string | undefined,
      date_of_birth: row.dateOfBirth ? new Date(row.dateOfBirth as string) : undefined,
      grade: row.grade as GradeLevel,
      school_id: row.schoolId as number | undefined,
      status: row.status as StudentStatus,
      email: row.email as string | undefined,
      phone: row.phone as string | undefined,
      address: row.address as string | undefined,
      emergency_contact_name: row.emergencyContactName as string | undefined,
      emergency_contact_phone: row.emergencyContactPhone as string | undefined,
      notes: row.notes as string | undefined,
      created_at: new Date(row.createdAt as string),
      updated_at: new Date(row.updatedAt as string),
      created_by: row.createdBy as number | undefined,
      updated_by: row.updatedBy as number | undefined,
    };

    revalidatePath('/students');
    revalidatePath(`/students/${id}`);
    return { isSuccess: true, message: 'Student updated successfully', data: updatedStudent };
  } catch (error) {
    // Error logged: Error updating student
    return { isSuccess: false, message: 'Failed to update student' };
  }
}

// Delete student (soft delete by changing status)
export async function deleteStudentAction(id: number): Promise<ActionState<void>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check if user has permission
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'students');
    if (!hasAccess) {
      return { isSuccess: false, message: 'You do not have permission to delete students' };
    }

    // Check if student has active interventions
    const activeInterventionsCheck = await executeSQL(
      `SELECT COUNT(*) as count FROM interventions 
       WHERE student_id = $1 AND status IN ('planned', 'in_progress')`,
      [{ name: '1', value: { longValue: id } }]
    );

    const activeCount = activeInterventionsCheck?.[0]?.count as number || 0;
    if (activeCount > 0) {
      return { 
        isSuccess: false, 
        message: 'Cannot delete student with active interventions. Please complete or cancel all interventions first.' 
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
        { name: '1', value: { longValue: currentUser.data.user.id } },
        { name: '2', value: { longValue: id } }
      ]
    );

    if (!result || result.length === 0) {
      return { isSuccess: false, message: 'Student not found' };
    }

    revalidatePath('/students');
    return { isSuccess: true, message: 'Student deleted successfully', data: undefined };
  } catch (error) {
    // Error logged: Error deleting student
    return { isSuccess: false, message: 'Failed to delete student' };
  }
}