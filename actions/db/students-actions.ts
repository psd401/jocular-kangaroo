"use server"

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from "@/lib/db/drizzle-client"
import { students, schools, users, studentGuardians, interventions } from "@/src/db/schema"
import { eq, and, or, like, count, sql } from "drizzle-orm"
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
import { createLogger, generateRequestId, startTimer, sanitizeForLogging } from "@/lib/logger";
import { handleError, createSuccess } from "@/lib/error-utils";

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
  const requestId = generateRequestId()
  const timer = startTimer("getStudentsAction")
  const log = createLogger({ requestId, action: "getStudentsAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging(filters) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized access attempt")
      timer({ status: "error" })
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Build dynamic WHERE conditions
    const conditions = [];

    if (filters?.grade) {
      conditions.push(eq(students.grade, filters.grade));
    }

    if (filters?.status) {
      conditions.push(eq(students.status, filters.status));
    }

    if (filters?.school_id) {
      conditions.push(eq(students.schoolId, filters.school_id));
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          like(sql`LOWER(${students.firstName})`, searchTerm),
          like(sql`LOWER(${students.lastName})`, searchTerm),
          like(sql`LOWER(${students.studentId})`, searchTerm)
        )
      );
    }

    // Execute query with joins for additional data
    const result = await db
      .select({
        // Student fields (automatically camelCased)
        id: students.id,
        studentId: students.studentId,
        firstName: students.firstName,
        lastName: students.lastName,
        middleName: students.middleName,
        dateOfBirth: students.dateOfBirth,
        grade: students.grade,
        schoolId: students.schoolId,
        status: students.status,
        email: students.email,
        phone: students.phone,
        address: students.address,
        emergencyContactName: students.emergencyContactName,
        emergencyContactPhone: students.emergencyContactPhone,
        notes: students.notes,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
        createdBy: students.createdBy,
        updatedBy: students.updatedBy,
        // Joined fields
        schoolName: schools.name,
        createdByFirstName: sql<string | null>`${users.firstName}`.as('created_by_first_name'),
        createdByLastName: sql<string | null>`${users.lastName}`.as('created_by_last_name'),
        updatedByFirstName: sql<string | null>`u2.first_name`.as('updated_by_first_name'),
        updatedByLastName: sql<string | null>`u2.last_name`.as('updated_by_last_name'),
      })
      .from(students)
      .leftJoin(schools, eq(students.schoolId, schools.id))
      .leftJoin(users, eq(students.createdBy, users.id))
      .leftJoin(sql`users u2`, sql`${students.updatedBy} = u2.id`)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(students.lastName, students.firstName);

    // Transform results to match expected Student interface
    const studentsData: Student[] = result.map((row) => ({
      id: row.id,
      student_id: row.studentId,
      first_name: row.firstName,
      last_name: row.lastName,
      middle_name: row.middleName || undefined,
      date_of_birth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
      grade: row.grade as GradeLevel,
      school_id: row.schoolId || undefined,
      status: row.status as StudentStatus,
      email: row.email || undefined,
      phone: row.phone || undefined,
      address: row.address || undefined,
      emergency_contact_name: row.emergencyContactName || undefined,
      emergency_contact_phone: row.emergencyContactPhone || undefined,
      notes: row.notes || undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      created_by: row.createdBy || undefined,
      updated_by: row.updatedBy || undefined,
      school_name: row.schoolName || undefined,
      created_by_name: (row.createdByFirstName && row.createdByLastName)
        ? `${row.createdByFirstName} ${row.createdByLastName}`
        : undefined,
      updated_by_name: (row.updatedByFirstName && row.updatedByLastName)
        ? `${row.updatedByFirstName} ${row.updatedByLastName}`
        : undefined,
    }));

    timer({ status: "success" })
    log.info("Action completed", {
      studentCount: studentsData.length,
      hasFilters: !!filters && Object.keys(filters).length > 0
    })

    return createSuccess(studentsData, 'Students fetched successfully');
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to fetch students", {
      context: "getStudentsAction"
    });
  }
}

// Get single student by ID
export async function getStudentByIdAction(id: number): Promise<ActionState<StudentWithDetails>> {
  const requestId = generateRequestId()
  const timer = startTimer("getStudentByIdAction")
  const log = createLogger({ requestId, action: "getStudentByIdAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ id }) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized access attempt")
      timer({ status: "error" })
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Get student with school details
    const studentResult = await db
      .select({
        // Student fields
        id: students.id,
        studentId: students.studentId,
        firstName: students.firstName,
        lastName: students.lastName,
        middleName: students.middleName,
        dateOfBirth: students.dateOfBirth,
        grade: students.grade,
        schoolId: students.schoolId,
        status: students.status,
        email: students.email,
        phone: students.phone,
        address: students.address,
        emergencyContactName: students.emergencyContactName,
        emergencyContactPhone: students.emergencyContactPhone,
        notes: students.notes,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
        createdBy: students.createdBy,
        updatedBy: students.updatedBy,
        // School fields
        schoolName: schools.name,
        schoolDistrict: schools.district,
        schoolCreatedAt: schools.createdAt,
        schoolUpdatedAt: schools.updatedAt,
      })
      .from(students)
      .leftJoin(schools, eq(students.schoolId, schools.id))
      .where(eq(students.id, id))
      .limit(1);

    if (!studentResult || studentResult.length === 0) {
      log.warn("Student not found", { id })
      timer({ status: "error" })
      return { isSuccess: false, message: 'Student not found' };
    }

    const row = studentResult[0];

    // Get guardians
    const guardiansResult = await db
      .select()
      .from(studentGuardians)
      .where(eq(studentGuardians.studentId, id))
      .orderBy(
        sql`${studentGuardians.isPrimaryContact} DESC`,
        studentGuardians.lastName,
        studentGuardians.firstName
      );

    // Build the StudentWithDetails object
    const student: StudentWithDetails = {
      id: row.id,
      student_id: row.studentId,
      first_name: row.firstName,
      last_name: row.lastName,
      middle_name: row.middleName || undefined,
      date_of_birth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
      grade: row.grade as GradeLevel,
      school_id: row.schoolId || undefined,
      status: row.status as StudentStatus,
      email: row.email || undefined,
      phone: row.phone || undefined,
      address: row.address || undefined,
      emergency_contact_name: row.emergencyContactName || undefined,
      emergency_contact_phone: row.emergencyContactPhone || undefined,
      notes: row.notes || undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      created_by: row.createdBy || undefined,
      updated_by: row.updatedBy || undefined,
      school: row.schoolId ? {
        id: row.schoolId,
        name: row.schoolName!,
        district: row.schoolDistrict || undefined,
        created_at: row.schoolCreatedAt!,
        updated_at: row.schoolUpdatedAt!,
      } : undefined,
      guardians: guardiansResult.map((g) => ({
        id: g.id,
        student_id: g.studentId,
        first_name: g.firstName,
        last_name: g.lastName,
        relationship: g.relationship || undefined,
        email: g.email || undefined,
        phone: g.phone || undefined,
        is_primary_contact: g.isPrimaryContact,
        created_at: g.createdAt,
        updated_at: g.updatedAt,
      })),
      interventions: [], // Empty for now, can be populated if needed
    };

    timer({ status: "success" })
    log.info("Action completed", {
      studentId: student.id,
      hasSchool: !!student.school,
      guardianCount: student.guardians?.length || 0
    })

    return createSuccess(student, 'Student fetched successfully');
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to fetch student details", {
      context: "getStudentByIdAction"
    });
  }
}

// Create new student
export async function createStudentAction(
  input: CreateStudentInput
): Promise<ActionState<Student>> {
  const requestId = generateRequestId()
  const timer = startTimer("createStudentAction")
  const log = createLogger({ requestId, action: "createStudentAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging(input) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized access attempt")
      timer({ status: "error" })
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check if user has permission to create students
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'students');
    if (!hasAccess) {
      log.warn("Permission denied", { userId: currentUser.data.user.id })
      timer({ status: "error" })
      return { isSuccess: false, message: 'You do not have permission to create students' };
    }

    // Validate input
    const validationResult = createStudentSchema.safeParse(input);
    if (!validationResult.success) {
      log.warn("Validation failed", { errors: validationResult.error.issues })
      timer({ status: "error" })
      return {
        isSuccess: false,
        message: validationResult.error.issues[0].message
      };
    }

    const data = validationResult.data;

    // Check if student ID already exists
    const existingStudent = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.studentId, data.student_id))
      .limit(1);

    if (existingStudent.length > 0) {
      log.warn("Student ID already exists", { studentId: data.student_id })
      timer({ status: "error" })
      return { isSuccess: false, message: 'A student with this ID already exists' };
    }

    // Insert new student
    const newStudentData = {
      studentId: data.student_id,
      firstName: data.first_name,
      lastName: data.last_name,
      middleName: data.middle_name || null,
      dateOfBirth: data.date_of_birth || null,
      grade: data.grade,
      schoolId: data.school_id || null,
      status: data.status || 'active',
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      emergencyContactName: data.emergency_contact_name || null,
      emergencyContactPhone: data.emergency_contact_phone || null,
      notes: data.notes || null,
      createdBy: currentUser.data.user.id,
      updatedBy: currentUser.data.user.id,
    };

    const result = await db
      .insert(students)
      .values(newStudentData)
      .returning();

    if (!result || result.length === 0) {
      log.error("Failed to insert student")
      timer({ status: "error" })
      return { isSuccess: false, message: 'Failed to create student' };
    }

    const row = result[0];
    const newStudent: Student = {
      id: row.id,
      student_id: row.studentId,
      first_name: row.firstName,
      last_name: row.lastName,
      middle_name: row.middleName || undefined,
      date_of_birth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
      grade: row.grade as GradeLevel,
      school_id: row.schoolId || undefined,
      status: row.status as StudentStatus,
      email: row.email || undefined,
      phone: row.phone || undefined,
      address: row.address || undefined,
      emergency_contact_name: row.emergencyContactName || undefined,
      emergency_contact_phone: row.emergencyContactPhone || undefined,
      notes: row.notes || undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      created_by: row.createdBy || undefined,
      updated_by: row.updatedBy || undefined,
    };

    timer({ status: "success" })
    log.info("Action completed", { studentId: newStudent.id, studentIdString: newStudent.student_id })

    revalidatePath('/students');
    return createSuccess(newStudent, 'Student created successfully');
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to create student", {
      context: "createStudentAction"
    });
  }
}

// Update student
export async function updateStudentAction(
  input: Partial<CreateStudentInput> & { id: number }
): Promise<ActionState<Student>> {
  const requestId = generateRequestId()
  const timer = startTimer("updateStudentAction")
  const log = createLogger({ requestId, action: "updateStudentAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging(input) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized access attempt")
      timer({ status: "error" })
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check if user has permission
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'students');
    if (!hasAccess) {
      log.warn("Permission denied", { userId: currentUser.data.user.id })
      timer({ status: "error" })
      return { isSuccess: false, message: 'You do not have permission to update students' };
    }

    // Validate input
    const validationResult = updateStudentSchema.safeParse(input);
    if (!validationResult.success) {
      log.warn("Validation failed", { errors: validationResult.error.issues })
      timer({ status: "error" })
      return {
        isSuccess: false,
        message: validationResult.error.issues[0].message
      };
    }

    const data = validationResult.data;
    const { id, ...updateFields } = data;

    // Build update object dynamically
    const updateData: any = {
      updatedBy: currentUser.data.user.id,
    };

    // Only include fields that are defined in the input
    if (updateFields.student_id !== undefined) {
      updateData.studentId = updateFields.student_id;
    }
    if (updateFields.first_name !== undefined) {
      updateData.firstName = updateFields.first_name;
    }
    if (updateFields.last_name !== undefined) {
      updateData.lastName = updateFields.last_name;
    }
    if (updateFields.middle_name !== undefined) {
      updateData.middleName = updateFields.middle_name || null;
    }
    if (updateFields.date_of_birth !== undefined) {
      updateData.dateOfBirth = updateFields.date_of_birth || null;
    }
    if (updateFields.grade !== undefined) {
      updateData.grade = updateFields.grade;
    }
    if (updateFields.school_id !== undefined) {
      updateData.schoolId = updateFields.school_id || null;
    }
    if (updateFields.status !== undefined) {
      updateData.status = updateFields.status;
    }
    if (updateFields.email !== undefined) {
      updateData.email = updateFields.email || null;
    }
    if (updateFields.phone !== undefined) {
      updateData.phone = updateFields.phone || null;
    }
    if (updateFields.address !== undefined) {
      updateData.address = updateFields.address || null;
    }
    if (updateFields.emergency_contact_name !== undefined) {
      updateData.emergencyContactName = updateFields.emergency_contact_name || null;
    }
    if (updateFields.emergency_contact_phone !== undefined) {
      updateData.emergencyContactPhone = updateFields.emergency_contact_phone || null;
    }
    if (updateFields.notes !== undefined) {
      updateData.notes = updateFields.notes || null;
    }

    const result = await db
      .update(students)
      .set(updateData)
      .where(eq(students.id, id))
      .returning();

    if (!result || result.length === 0) {
      log.error("Failed to update student - student not found", { id })
      timer({ status: "error" })
      return { isSuccess: false, message: 'Failed to update student' };
    }

    const row = result[0];
    const updatedStudent: Student = {
      id: row.id,
      student_id: row.studentId,
      first_name: row.firstName,
      last_name: row.lastName,
      middle_name: row.middleName || undefined,
      date_of_birth: row.dateOfBirth ? new Date(row.dateOfBirth) : undefined,
      grade: row.grade as GradeLevel,
      school_id: row.schoolId || undefined,
      status: row.status as StudentStatus,
      email: row.email || undefined,
      phone: row.phone || undefined,
      address: row.address || undefined,
      emergency_contact_name: row.emergencyContactName || undefined,
      emergency_contact_phone: row.emergencyContactPhone || undefined,
      notes: row.notes || undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      created_by: row.createdBy || undefined,
      updated_by: row.updatedBy || undefined,
    };

    timer({ status: "success" })
    log.info("Action completed", {
      studentId: updatedStudent.id,
      fieldsUpdated: Object.keys(updateFields).length
    })

    revalidatePath('/students');
    revalidatePath(`/students/${id}`);
    return createSuccess(updatedStudent, 'Student updated successfully');
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to update student", {
      context: "updateStudentAction"
    });
  }
}

// Delete student (soft delete by changing status)
export async function deleteStudentAction(id: number): Promise<ActionState<void>> {
  const requestId = generateRequestId()
  const timer = startTimer("deleteStudentAction")
  const log = createLogger({ requestId, action: "deleteStudentAction" })

  try {
    log.info("Action started", { params: sanitizeForLogging({ id }) })

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized access attempt")
      timer({ status: "error" })
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check if user has permission
    const hasAccess = await hasToolAccess(currentUser.data.user.id, 'students');
    if (!hasAccess) {
      log.warn("Permission denied", { userId: currentUser.data.user.id })
      timer({ status: "error" })
      return { isSuccess: false, message: 'You do not have permission to delete students' };
    }

    // Check if student has active interventions
    const activeInterventionsResult = await db
      .select({ count: count() })
      .from(interventions)
      .where(
        and(
          eq(interventions.studentId, id),
          or(
            eq(interventions.status, 'planned'),
            eq(interventions.status, 'in_progress')
          )
        )
      );

    const activeCount = activeInterventionsResult[0]?.count || 0;
    if (activeCount > 0) {
      log.warn("Cannot delete student with active interventions", { id, activeCount })
      timer({ status: "error" })
      return {
        isSuccess: false,
        message: 'Cannot delete student with active interventions. Please complete or cancel all interventions first.'
      };
    }

    // Soft delete by setting status to inactive
    const result = await db
      .update(students)
      .set({
        status: 'inactive',
        updatedBy: currentUser.data.user.id,
        updatedAt: new Date(),
      })
      .where(eq(students.id, id))
      .returning({ id: students.id });

    if (!result || result.length === 0) {
      log.warn("Student not found for deletion", { id })
      timer({ status: "error" })
      return { isSuccess: false, message: 'Student not found' };
    }

    timer({ status: "success" })
    log.info("Action completed", { studentId: id, deletedStudentId: result[0].id })

    revalidatePath('/students');
    return createSuccess(undefined, 'Student deleted successfully');
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to delete student", {
      context: "deleteStudentAction"
    });
  }
}