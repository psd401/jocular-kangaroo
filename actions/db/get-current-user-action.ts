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

function getAdminEmails(): Set<string> {
  const adminEmailsEnv = process.env.ADMIN_EMAILS || ''
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const emails = adminEmailsEnv
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => {
      if (email.length === 0) return false
      if (!emailRegex.test(email)) {
        console.warn(`Invalid email in ADMIN_EMAILS, skipping: ${email}`)
        return false
      }
      return true
    })

  return new Set(emails)
}

function isAdminEmail(email: string): boolean {
  if (!email) return false
  const adminEmails = getAdminEmails()
  return adminEmails.has(email.toLowerCase())
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
      user = await db.transaction(async (tx) => {
        const newUser = await tx
          .insert(users)
          .values({
            cognitoSub: session.sub,
            email: session.email || `${session.sub}@cognito.local`,
            firstName: session.email?.split("@")[0] || "User",
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning()

        // Check if user should be admin via ADMIN_EMAILS environment variable
        const shouldBeAdmin = session.email && isAdminEmail(session.email)

        if (shouldBeAdmin) {
          // Assign Administrator role
          const adminRole = await tx
            .select()
            .from(roles)
            .where(eq(roles.name, "Administrator"))
            .limit(1)

          if (adminRole.length > 0) {
            await tx
              .insert(userRoles)
              .values({
                userId: newUser[0].id,
                roleId: adminRole[0].id,
                createdAt: new Date(),
                updatedAt: new Date()
              })

            log.info("🔐 Admin role assigned via ADMIN_EMAILS whitelist", {
              userId: newUser[0].id,
              email: session.email,
              source: "environment_bootstrap"
            })
          } else {
            log.error("Administrator role not found in database", { userId: newUser[0].id })
          }
        } else {
          // Assign default "student" role to new users
          const studentRole = await tx
            .select()
            .from(roles)
            .where(eq(roles.name, "student"))
            .limit(1)

          if (studentRole.length > 0) {
            await tx
              .insert(userRoles)
              .values({
                userId: newUser[0].id,
                roleId: studentRole[0].id,
                createdAt: new Date(),
                updatedAt: new Date()
              })

            log.info("Created new user with student role", { userId: newUser[0].id })
          } else {
            log.warn("Student role not found, user created without default role", { userId: newUser[0].id })
          }
        }

        return newUser
      })
    }

    // Retroactive admin assignment for existing users in ADMIN_EMAILS whitelist
    if (user.length > 0 && session.email && isAdminEmail(session.email)) {
      // Check if user already has Administrator role
      const existingAdminRole = await db
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(
          and(
            eq(userRoles.userId, user[0].id),
            eq(roles.name, "Administrator")
          )
        )
        .limit(1)

      if (existingAdminRole.length === 0) {
        // User is in whitelist but doesn't have admin role - grant it
        const adminRole = await db
          .select()
          .from(roles)
          .where(eq(roles.name, "Administrator"))
          .limit(1)

        if (adminRole.length > 0) {
          await db.insert(userRoles).values({
            userId: user[0].id,
            roleId: adminRole[0].id,
            createdAt: new Date(),
            updatedAt: new Date()
          })

          log.info("🔐 Admin role retroactively assigned via ADMIN_EMAILS whitelist", {
            userId: user[0].id,
            email: session.email,
            source: "environment_bootstrap_retroactive"
          })
        } else {
          log.error("Administrator role not found for retroactive assignment", { userId: user[0].id })
        }
      }
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