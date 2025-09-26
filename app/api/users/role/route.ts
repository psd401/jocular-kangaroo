import { getServerSession } from '@/lib/auth/server-session';
import { db } from '@/lib/db/drizzle-client';
import { users, roles, userRoles } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { hasRole } from '@/utils/roles';
import { generateRequestId, createLogger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/users/role", method: "POST" });

  const session = await getServerSession();

  if (!session) {
    logger.info("Unauthorized access attempt for role update");
    return new NextResponse('Unauthorized', { status: 401 });
  }

  logger.info("User authenticated for role update", { cognitoSub: session.sub });

  const isAdmin = await hasRole('administrator');
  if (!isAdmin) {
    logger.info("Non-admin user attempted role update", { cognitoSub: session.sub });
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const { targetUserId, role } = await request.json();

    if (!targetUserId || !role || !['student', 'staff', 'administrator'].includes(role)) {
      logger.error("Invalid request data for role update", { targetUserId, role });
      return new NextResponse('Invalid request', { status: 400 });
    }

    logger.info("Updating user role", { targetUserId, role });

    const [roleData] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, role))
      .limit(1);

    if (!roleData) {
      logger.error("Role not found", { role });
      return new NextResponse('Role not found', { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx.delete(userRoles).where(eq(userRoles.userId, targetUserId));

      await tx.insert(userRoles).values({
        userId: targetUserId,
        roleId: roleData.id
      });
    });

    const result = await db
      .select({
        id: users.id,
        cognitoSub: users.cognitoSub,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!result || result.length === 0) {
      logger.error("User not found after role update", { targetUserId });
      return new NextResponse('User not found', { status: 404 });
    }

    logger.info("User role updated successfully", {
      targetUserId,
      role,
      updatedBy: session.sub
    });

    return NextResponse.json(result[0]);
  } catch (error) {
    logger.error('Error updating user role:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 