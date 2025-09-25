'use server';

import { db } from "@/lib/db/drizzle-client"
import { schools } from "@/src/db/schema"
import { ActionState } from '@/types/actions-types';
import { School } from '@/types/intervention-types';
import { getCurrentUserAction } from './get-current-user-action';
import { createLogger, generateRequestId, startTimer } from "@/lib/logger"
import { handleError, createSuccess } from "@/lib/error-utils"

// Get all schools
export async function getSchoolsAction(): Promise<ActionState<School[]>> {
  const requestId = generateRequestId()
  const timer = startTimer("getSchoolsAction")
  const log = createLogger({ requestId, action: "getSchoolsAction" })

  try {
    log.info("Action started")

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized access attempt")
      timer({ status: "error" })
      return { isSuccess: false, message: 'Unauthorized' };
    }

    const result = await db
      .select()
      .from(schools)
      .orderBy(schools.name)

    const schoolsList: School[] = result.map(row => ({
      id: row.id,
      name: row.name,
      district: row.district || undefined,
      address: row.address || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
      principal_name: row.principalName || undefined,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    }));

    timer({ status: "success" })
    log.info("Action completed", { schoolCount: schoolsList.length })

    return createSuccess(schoolsList, 'Schools fetched successfully')
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to fetch schools", {
      context: "getSchoolsAction"
    })
  }
}