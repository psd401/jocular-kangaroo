'use server';

import { executeSQL } from '@/lib/db/data-api-adapter';
import { ActionState } from '@/types/actions-types';
import { getCurrentUserAction } from './get-current-user-action';
import { hasRole } from '@/lib/auth/role-helpers';

export interface Role {
  id: number;
  name: string;
  description?: string;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithRoles {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  roles: Role[];
  created_at: Date;
  last_sign_in_at?: Date;
}

// Get all roles
export async function getRolesAction(): Promise<ActionState<Role[]>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check if user is admin
    const isAdmin = await hasRole('Administrator');
    if (!isAdmin) {
      return { isSuccess: false, message: 'You do not have permission to view roles' };
    }

    const query = `
      SELECT 
        id, name, description, is_system, created_at, updated_at
      FROM roles
      ORDER BY name
    `;

    const result = await executeSQL(query);
    const roles = result.map(row => ({
      id: row.id as number,
      name: row.name as string,
      description: row.description as string | undefined,
      is_system: row.isSystem as boolean,
      created_at: new Date(row.createdAt as string),
      updated_at: new Date(row.updatedAt as string),
    }));

    return { isSuccess: true, message: 'Roles fetched successfully', data: roles };
  } catch (error) {
    // Error logged: Error fetching roles
    return { isSuccess: false, message: 'Failed to fetch roles' };
  }
}

// Get all users with their roles
export async function getUsersWithRolesAction(): Promise<ActionState<UserWithRoles[]>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check if user is admin
    const isAdmin = await hasRole('Administrator');
    if (!isAdmin) {
      return { isSuccess: false, message: 'You do not have permission to view users' };
    }

    const query = `
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.created_at, u.last_sign_in_at,
        r.id as role_id, r.name as role_name, r.description as role_description, r.is_system
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.last_name, u.first_name, r.name
    `;

    const result = await executeSQL(query);
    
    // Group users with their roles
    const usersMap = new Map<number, UserWithRoles>();
    
    result.forEach(row => {
      const userId = row.id as number;
      
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          id: userId,
          email: row.email as string,
          first_name: row.firstName as string | undefined,
          last_name: row.lastName as string | undefined,
          created_at: new Date(row.createdAt as string),
          last_sign_in_at: row.lastSignInAt ? new Date(row.lastSignInAt as string) : undefined,
          roles: []
        });
      }
      
      // Add role if it exists
      if (row.roleId) {
        const user = usersMap.get(userId)!;
        user.roles.push({
          id: row.roleId as number,
          name: row.roleName as string,
          description: row.roleDescription as string | undefined,
          is_system: row.isSystem as boolean,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    });

    return { isSuccess: true, message: 'Users fetched successfully', data: Array.from(usersMap.values()) };
  } catch (error) {
    // Error logged: Error fetching users with roles
    return { isSuccess: false, message: 'Failed to fetch users' };
  }
}

// Update user roles
export async function updateUserRolesAction(userId: number, roleIds: number[]): Promise<ActionState<void>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    // Check if user is admin
    const isAdmin = await hasRole('Administrator');
    if (!isAdmin) {
      return { isSuccess: false, message: 'You do not have permission to update user roles' };
    }

    // Don't allow users to modify their own admin role
    if (userId === currentUser.data.user.id) {
      const userRoles = await executeSQL(
        `SELECT role_id FROM user_roles WHERE user_id = $1`,
        [{ name: '1', value: { longValue: userId } }]
      );
      
      const adminRole = await executeSQL(
        `SELECT id FROM roles WHERE name = 'Administrator'`,
        []
      );
      
      if (adminRole.length > 0 && userRoles.length > 0) {
        const adminRoleId = adminRole[0].id as number;
        const hasAdminRole = userRoles.some(r => (r.roleId as number) === adminRoleId);
        const keepingAdminRole = roleIds.includes(adminRoleId);
        
        if (hasAdminRole && !keepingAdminRole) {
          return { isSuccess: false, message: 'Cannot remove your own administrator role' };
        }
      }
    }

    // Start transaction
    await executeSQL('BEGIN');

    try {
      // Remove existing roles
      await executeSQL(
        'DELETE FROM user_roles WHERE user_id = $1',
        [{ name: '1', value: { longValue: userId } }]
      );

      // Add new roles
      for (const roleId of roleIds) {
        await executeSQL(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [
            { name: '1', value: { longValue: userId } },
            { name: '2', value: { longValue: roleId } }
          ]
        );
      }

      await executeSQL('COMMIT');
      return { isSuccess: true, message: 'User roles updated successfully', data: undefined };
    } catch (error) {
      await executeSQL('ROLLBACK');
      throw error;
    }
  } catch (error) {
    // Error logged: Error updating user roles
    return { isSuccess: false, message: 'Failed to update user roles' };
  }
}