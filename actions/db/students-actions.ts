'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { SqlParameter } from '@aws-sdk/client-rds-data';
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
import {
  buildSecurityContext,
  buildStudentAccessFilter,
  logDataAccess,
  logDataAccessBatch,
  checkActionRateLimit,
} from '@/lib/security';

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

// Default and max pagination limits
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

// Get all students with optional filters
export async function getStudentsAction(filters?: {
  grade?: GradeLevel;
  status?: StudentStatus;
  school_id?: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionState<Student[]>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    const userId = currentUser.data.user.id;
    const roleNames = currentUser.data.roles.map(r => r.name);

    // Rate limit check
    if (!checkActionRateLimit(userId, 'getStudents')) {
      return { isSuccess: false, message: 'Rate limit exceeded. Please try again later.' };
    }

    // Build security context and access filter
    const secCtx = await buildSecurityContext(userId, roleNames);

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

    const parameters: SqlParameter[] = [];
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

    // Inject row-level access filter
    const accessFilter = buildStudentAccessFilter(secCtx, paramIndex);
    query += accessFilter.sql;
    parameters.push(...accessFilter.parameters);
    paramIndex = accessFilter.nextParamIndex;

    // Pagination
    const limit = Math.min(filters?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = filters?.offset ?? 0;

    query += ` ORDER BY s.last_name, s.first_name`;
    query += ` LIMIT $${paramIndex}`;
    parameters.push({ name: `${paramIndex}`, value: { longValue: limit } });
    paramIndex++;
    query += ` OFFSET $${paramIndex}`;
    parameters.push({ name: `${paramIndex}`, value: { longValue: offset } });

    const result = await executeSQL(query, parameters);
    const students = result.map((row) => ({
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

    // Audit log
    logDataAccessBatch(
      { userId, action: 'list', entityType: 'student' },
      students.map(s => s.id),
      students.length
    );

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

    const userId = currentUser.data.user.id;
    const roleNames = currentUser.data.roles.map(r => r.name);

    // Rate limit check
    if (!checkActionRateLimit(userId, 'getStudentById')) {
      return { isSuccess: false, message: 'Rate limit exceeded. Please try again later.' };
    }

    // Build security context and verify access
    const secCtx = await buildSecurityContext(userId, roleNames);
    const accessFilter = buildStudentAccessFilter(secCtx, 2);

    const studentQuery = `
      SELECT
        s.*,
        sch.name as school_name,
        sch.district as school_district
      FROM students s
      LEFT JOIN schools sch ON s.school_id = sch.id
      WHERE s.id = $1${accessFilter.sql}
    `;

    const studentResult = await executeSQL(studentQuery, [
      { name: '1', value: { longValue: id } },
      ...accessFilter.parameters,
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
      student.guardians = guardiansResult.map((g) => ({
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

    // Audit log
    logDataAccess({ userId, action: 'view', entityType: 'student', entityId: id });

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

    const userId = currentUser.data.user.id;

    // Rate limit check
    if (!checkActionRateLimit(userId, 'createStudent')) {
      return { isSuccess: false, message: 'Rate limit exceeded. Please try again later.' };
    }

    // Check if user has permission to create students
    const hasAccess = await hasToolAccess(userId, 'students');
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

    const parameters: SqlParameter[] = [
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
      { name: '15', value: { longValue: userId } },
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

    // Audit log
    logDataAccess({ userId, action: 'create', entityType: 'student', entityId: newStudent.id });

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

    const userId = currentUser.data.user.id;
    const roleNames = currentUser.data.roles.map(r => r.name);

    // Rate limit check
    if (!checkActionRateLimit(userId, 'updateStudent')) {
      return { isSuccess: false, message: 'Rate limit exceeded. Please try again later.' };
    }

    // Check if user has permission
    const hasAccess = await hasToolAccess(userId, 'students');
    if (!hasAccess) {
      return { isSuccess: false, message: 'You do not have permission to update students' };
    }

    // Verify user has access to this specific student
    const secCtx = await buildSecurityContext(userId, roleNames);
    const verifyFilter = buildStudentAccessFilter(secCtx, 2);
    const verifyResult = await executeSQL(
      `SELECT id FROM students s WHERE s.id = $1${verifyFilter.sql}`,
      [{ name: '1', value: { longValue: input.id } }, ...verifyFilter.parameters]
    );
    if (!verifyResult || verifyResult.length === 0) {
      return { isSuccess: false, message: 'Student not found or access denied' };
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
    const parameters: SqlParameter[] = [];
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
    parameters.push({ name: `${paramIndex}`, value: { longValue: userId } });
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

    // Audit log
    logDataAccess({ userId, action: 'update', entityType: 'student', entityId: id });

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

    const userId = currentUser.data.user.id;
    const roleNames = currentUser.data.roles.map(r => r.name);

    // Rate limit check
    if (!checkActionRateLimit(userId, 'deleteStudent')) {
      return { isSuccess: false, message: 'Rate limit exceeded. Please try again later.' };
    }

    // Check if user has permission
    const hasAccess = await hasToolAccess(userId, 'students');
    if (!hasAccess) {
      return { isSuccess: false, message: 'You do not have permission to delete students' };
    }

    // Verify user has access to this specific student
    const secCtx = await buildSecurityContext(userId, roleNames);
    const verifyFilter = buildStudentAccessFilter(secCtx, 2);
    const verifyResult = await executeSQL(
      `SELECT id FROM students s WHERE s.id = $1${verifyFilter.sql}`,
      [{ name: '1', value: { longValue: id } }, ...verifyFilter.parameters]
    );
    if (!verifyResult || verifyResult.length === 0) {
      return { isSuccess: false, message: 'Student not found or access denied' };
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
    await executeSQL(
      `UPDATE students
       SET status = 'inactive',
           updated_by = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [
        { name: '1', value: { longValue: userId } },
        { name: '2', value: { longValue: id } }
      ]
    );

    // Audit log
    logDataAccess({ userId, action: 'delete', entityType: 'student', entityId: id });

    revalidatePath('/students');
    return { isSuccess: true, message: 'Student deleted successfully', data: undefined };
  } catch (error) {
    // Error logged: Error deleting student
    return { isSuccess: false, message: 'Failed to delete student' };
  }
}
