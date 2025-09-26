'use server';

import { db } from '@/lib/db/drizzle-client';
import { roles, users, userRoles } from '@/src/db/schema';
import { eq, asc } from 'drizzle-orm';
import { ActionState } from '@/types/actions-types';
import { getCurrentUserAction } from './get-current-user-action';
import { hasRole } from '@/lib/auth/role-helpers';
import { createLogger, generateRequestId, startTimer, sanitizeForLogging } from '@/lib/logger';
import { handleError, createSuccess, createError } from '@/lib/error-utils';
import { ErrorLevel } from '@/types/actions-types';

export interface Role {
  id: number;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithRoles {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: Role[];
  createdAt: Date;
  lastSignInAt?: Date;
}

// Get all roles
export async function getRolesAction(): Promise<ActionState<Role[]>> {
  const requestId = generateRequestId();
  const timer = startTimer('getRolesAction');
  const log = createLogger({ requestId, action: 'getRolesAction' });

  try {
    log.info('Action started');

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn('Unauthorized access attempt');
      timer({ status: 'error' });
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check if user is admin
    const isAdmin = await hasRole('Administrator');
    if (!isAdmin) {
      log.warn('User lacks Administrator role', {
        userId: currentUser.data.user.id,
        userRoles: currentUser.data.roles.map(r => r.name)
      });
      timer({ status: 'error' });
      return { isSuccess: false, message: 'You do not have permission to view roles' };
    }

    // Query roles with Drizzle ORM
    const roleResults = await db
      .select()
      .from(roles)
      .orderBy(asc(roles.name));

    // Drizzle automatically converts snake_case to camelCase
    const rolesList: Role[] = roleResults.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    timer({ status: 'success' });
    log.info('Action completed', { roleCount: rolesList.length });

    return createSuccess(rolesList, 'Roles fetched successfully');
  } catch (error) {
    timer({ status: 'error' });
    return handleError(error, 'Failed to fetch roles', {
      context: 'getRolesAction'
    });
  }
}

// Get all users with their roles
export async function getUsersWithRolesAction(): Promise<ActionState<UserWithRoles[]>> {
  const requestId = generateRequestId();
  const timer = startTimer('getUsersWithRolesAction');
  const log = createLogger({ requestId, action: 'getUsersWithRolesAction' });

  try {
    log.info('Action started');

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn('Unauthorized access attempt');
      timer({ status: 'error' });
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check if user is admin
    const isAdmin = await hasRole('Administrator');
    if (!isAdmin) {
      log.warn('User lacks Administrator role', {
        userId: currentUser.data.user.id,
        userRoles: currentUser.data.roles.map(r => r.name)
      });
      timer({ status: 'error' });
      return { isSuccess: false, message: 'You do not have permission to view users' };
    }

    // Query users with their roles using LEFT JOIN
    const result = await db
      .select({
        userId: users.id,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userCreatedAt: users.createdAt,
        userLastSignInAt: users.lastSignInAt,
        roleId: roles.id,
        roleName: roles.name,
        roleDescription: roles.description,
        roleIsSystem: roles.isSystem,
        roleCreatedAt: roles.createdAt,
        roleUpdatedAt: roles.updatedAt
      })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .orderBy(asc(users.lastName), asc(users.firstName), asc(roles.name));

    // Group users with their roles
    const usersMap = new Map<number, UserWithRoles>();

    result.forEach(row => {
      const userId = row.userId;

      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          id: userId,
          email: row.userEmail,
          firstName: row.userFirstName || undefined,
          lastName: row.userLastName || undefined,
          createdAt: row.userCreatedAt,
          lastSignInAt: row.userLastSignInAt || undefined,
          roles: []
        });
      }

      // Add role if it exists
      if (row.roleId) {
        const user = usersMap.get(userId)!;
        user.roles.push({
          id: row.roleId,
          name: row.roleName!,
          description: row.roleDescription || undefined,
          isSystem: row.roleIsSystem!,
          createdAt: row.roleCreatedAt!,
          updatedAt: row.roleUpdatedAt!
        });
      }
    });

    const usersList = Array.from(usersMap.values());

    timer({ status: 'success' });
    log.info('Action completed', { userCount: usersList.length });

    return createSuccess(usersList, 'Users fetched successfully');
  } catch (error) {
    timer({ status: 'error' });
    return handleError(error, 'Failed to fetch users', {
      context: 'getUsersWithRolesAction'
    });
  }
}

// Update user roles
export async function updateUserRolesAction(userId: number, roleIds: number[]): Promise<ActionState<void>> {
  const requestId = generateRequestId();
  const timer = startTimer('updateUserRolesAction');
  const log = createLogger({ requestId, action: 'updateUserRolesAction' });

  try {
    log.info('Action started', {
      params: sanitizeForLogging({ userId, roleIds })
    });

    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      log.warn('Unauthorized access attempt');
      timer({ status: 'error' });
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check if user is admin
    const isAdmin = await hasRole('Administrator');
    if (!isAdmin) {
      log.warn('User lacks Administrator role', {
        userId: currentUser.data.user.id,
        userRoles: currentUser.data.roles.map(r => r.name)
      });
      timer({ status: 'error' });
      return { isSuccess: false, message: 'You do not have permission to update user roles' };
    }

    // Get admin role ID for validation checks
    const adminRole = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, 'Administrator'))
      .limit(1);

    if (adminRole.length === 0) {
      log.error('Administrator role not found in database');
      timer({ status: 'error' });
      return { isSuccess: false, message: 'System configuration error: Administrator role not found' };
    }

    const adminRoleId = adminRole[0].id;

    // Get target user's current roles
    const targetUserRoles = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    const targetHasAdmin = targetUserRoles.some(r => r.roleId === adminRoleId);
    const keepingAdmin = roleIds.includes(adminRoleId);

    // Check if we're removing admin role from target user
    if (targetHasAdmin && !keepingAdmin) {
      log.info('Removing admin role detected', { userId, adminRoleId });

      // Count total administrators in system
      const adminCount = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, adminRoleId));

      if (adminCount.length <= 1) {
        log.warn('SECURITY: Blocked removal of last administrator', {
          targetUserId: userId,
          currentUserId: currentUser.data.user.id,
          adminRoleId,
          adminCount: adminCount.length
        });
        timer({ status: 'error' });
        return {
          isSuccess: false,
          message: 'Cannot remove the last administrator. System requires at least one admin user.'
        };
      }
    }

    // Don't allow users to modify their own admin role
    if (userId === currentUser.data.user.id) {
      log.info('Checking self-modification of admin role', { currentUserId: userId });

      if (targetHasAdmin && !keepingAdmin) {
        log.warn('Attempt to remove own administrator role', {
          userId,
          adminRoleId,
          currentRoleIds: targetUserRoles.map(r => r.roleId),
          newRoleIds: roleIds
        });
        timer({ status: 'error' });
        return { isSuccess: false, message: 'Cannot remove your own administrator role' };
      }
    }

    // Use Drizzle transaction
    await db.transaction(async (tx) => {
      log.info('Starting transaction', { userId, roleIds });

      // Remove existing roles
      await tx
        .delete(userRoles)
        .where(eq(userRoles.userId, userId));

      log.info('Removed existing user roles', { userId });

      // Add new roles
      if (roleIds.length > 0) {
        const newUserRoles = roleIds.map(roleId => ({
          userId,
          roleId,
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        await tx
          .insert(userRoles)
          .values(newUserRoles);

        log.info('Added new user roles', { userId, roleCount: roleIds.length });
      }
    });

    timer({ status: 'success' });
    log.info('Action completed', { userId, roleCount: roleIds.length });

    return createSuccess(undefined, 'User roles updated successfully');
  } catch (error) {
    timer({ status: 'error' });
    return handleError(error, 'Failed to update user roles', {
      context: 'updateUserRolesAction'
    });
  }
}