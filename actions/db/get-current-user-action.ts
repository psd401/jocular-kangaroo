"use server"

import { db } from "@/lib/db/drizzle-client"
import { users, roles, userRoles } from "@/src/db/schema"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth/server-session"
import { ActionState } from "@/types"
import { SelectUser } from "@/types/db-types"
import { createLogger, generateRequestId, startTimer, sanitizeForLogging } from "@/lib/logger"
import { handleError, createSuccess } from "@/lib/error-utils"

interface CurrentUserWithRoles {
  user: SelectUser
  roles: { id: number; name: string; description?: string }[]
}

export async function getCurrentUserAction(): Promise<
  ActionState<CurrentUserWithRoles>
> {
  const requestId = generateRequestId()
  const timer = startTimer("getCurrentUserAction")
  const log = createLogger({ requestId, action: "getCurrentUserAction" })

  try {
    const session = await getServerSession()
    if (!session) {
      log.warn("No session available")
      timer({ status: "error" })
      return { isSuccess: false, message: "No session" }
    }

    log.info("Action started", {
      params: sanitizeForLogging({ cognitoSub: session.sub, email: session.email })
    })

    // First try to find user by cognito_sub
    let user = await db
      .select()
      .from(users)
      .where(eq(users.cognitoSub, session.sub))
      .limit(1)

    // If not found by cognito_sub, check if user exists by email
    if (user.length === 0 && session.email) {
      const existingUserByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, session.email))
        .limit(1)

      if (existingUserByEmail.length > 0) {
        // User exists with this email but different cognito_sub
        // Update the cognito_sub to link to the new auth system
        user = await db
          .update(users)
          .set({
            cognitoSub: session.sub,
            updatedAt: new Date()
          })
          .where(eq(users.id, existingUserByEmail[0].id))
          .returning()
      }
    }

    // If user still doesn't exist, create them
    if (user.length === 0) {
      const newUser = await db
        .insert(users)
        .values({
          cognitoSub: session.sub,
          email: session.email || `${session.sub}@cognito.local`,
          firstName: session.email?.split("@")[0] || "User",
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning()

      user = newUser

      // Assign default "student" role to new users
      const studentRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "student"))
        .limit(1)

      if (studentRole.length > 0) {
        await db
          .insert(userRoles)
          .values({
            userId: user[0].id,
            roleId: studentRole[0].id,
            createdAt: new Date(),
            updatedAt: new Date()
          })
      }

      log.info("Created new user", { userId: user[0].id })
    }

    // Update last_sign_in_at
    const updatedUser = await db
      .update(users)
      .set({
        lastSignInAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, user[0].id))
      .returning()

    // Get user's roles with join
    const userWithRoles = await db
      .select({
        roleId: roles.id,
        roleName: roles.name,
        roleDescription: roles.description
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user[0].id))

    const rolesList = userWithRoles.map(role => ({
      id: role.roleId,
      name: role.roleName,
      description: role.roleDescription || undefined
    }))

    const finalUser = updatedUser[0] as SelectUser

    timer({ status: "success" })
    log.info("Action completed", { userId: finalUser.id, roleCount: rolesList.length })

    return createSuccess(
      { user: finalUser, roles: rolesList },
      "User retrieved successfully"
    )

  } catch (error) {
    timer({ status: "error" })
    return handleError(error, "Failed to get current user", {
      context: "getCurrentUserAction"
    })
  }
} 