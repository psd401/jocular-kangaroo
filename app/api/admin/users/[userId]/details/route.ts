import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-check';
import { db } from '@/lib/db/drizzle-client';
import { users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { generateRequestId, createLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const requestId = generateRequestId();
  const logger = createLogger({ requestId, route: "/api/admin/users/[userId]/details", method: "GET" });

  const params = await context.params;
  logger.info("Fetching user details", { userId: params.userId });

  const authError = await requireAdmin();
  if (authError) {
    logger.warn("Admin authorization failed", { userId: params.userId });
    return authError;
  }

  try {
    const result = await db
      .select({
        id: users.id,
        cognitoSub: users.cognitoSub,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName
      })
      .from(users)
      .where(eq(users.id, parseInt(params.userId)))
      .limit(1);

    if (!result || result.length === 0) {
      logger.warn("User not found", { userId: params.userId });
      return new NextResponse('User not found', { status: 404 });
    }

    const user = result[0];

    logger.info("User details retrieved successfully", { userId: params.userId, userEmail: user.email });

    return NextResponse.json({
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddresses: [{ emailAddress: user.email }]
    });
  } catch (error) {
    logger.error('Error fetching user details', { error, userId: params.userId });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 