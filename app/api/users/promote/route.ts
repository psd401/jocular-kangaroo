import { getServerSession } from '@/lib/auth/server-session';
import { db } from '@/lib/db/drizzle-client';
import { users, roles, userRoles } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { hasRole } from '@/utils/roles';
import { withErrorHandling, unauthorized } from '@/lib/api-utils';
import { createError } from '@/lib/error-utils';
import { getErrorMessage } from '@/types/errors';
import { ErrorLevel } from '@/types/actions-types';

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return unauthorized('User not authenticated');
  }

  return withErrorHandling(async () => {
    const isAdmin = await hasRole('administrator');
    if (!isAdmin) {
      throw createError('Only administrators can promote users to administrator role', {
        code: 'FORBIDDEN',
        level: ErrorLevel.WARN,
        details: { cognitoSub: session.sub, action: 'promote_user' }
      });
    }

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      throw createError('Target user ID is required', {
        code: 'VALIDATION',
        level: ErrorLevel.WARN,
        details: { field: 'targetUserId' }
      });
    }

    try {
      const [adminRole] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, 'administrator'))
        .limit(1);

      if (!adminRole) {
        throw createError('Administrator role not found', {
          code: 'NOT_FOUND',
          level: ErrorLevel.WARN,
          details: { roleName: 'administrator' }
        });
      }

      await db.delete(userRoles).where(eq(userRoles.userId, targetUserId));

      await db.insert(userRoles).values({
        userId: targetUserId,
        roleId: adminRole.id
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
        throw createError('User not found', {
          code: 'NOT_FOUND',
          level: ErrorLevel.WARN,
          details: { targetUserId }
        });
      }

      return {
        success: true,
        user: result[0]
      };
    } catch (error) {
      if (getErrorMessage(error).includes('not found')) {
        throw createError('User or role not found', {
          code: 'NOT_FOUND',
          level: ErrorLevel.WARN,
          details: { targetUserId }
        });
      }
      throw error;
    }
  });
} 