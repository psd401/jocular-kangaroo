'use server';

import { db } from "@/lib/db/drizzle-client"
import { users } from "@/src/db/schema"
import { isNull } from "drizzle-orm"
import { ActionState } from '@/types/actions-types';
import { getCurrentUserAction } from './get-current-user-action';
import { createLogger, generateRequestId, startTimer } from "@/lib/logger"
import { handleError, createSuccess } from "@/lib/error-utils"

export interface UserForSelect {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

// Get all users for selection (e.g., in dropdowns)
export async function getUsersAction(): Promise<ActionState<UserForSelect[]>> {
  const requestId = generateRequestId()
  const timer = startTimer("getUsersAction")
  const log = createLogger({ requestId, action: "getUsersAction" })

  try {
    log.info("Action started")

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn("Unauthorized access attempt")
      timer({ status: "error" })
      return { isSuccess: false, message: 'Unauthorized' };
    }

    const result = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .orderBy(users.lastName, users.firstName)

    const usersList = result.map(row => ({
      id: row.id,
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      email: row.email,
    }))

    timer({ status: "success" })
    log.info("Action completed", { userCount: usersList.length })

    return createSuccess(usersList, 'Users fetched successfully')
  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to fetch users", {
      context: "getUsersAction"
    })
  }
}