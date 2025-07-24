'use server';

import { executeSQL } from '@/lib/db/data-api-client';
import { ActionState } from '@/types/actions-types';
import { getCurrentUser } from './get-current-user-action';
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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user is admin
    const isAdmin = await hasRole('Administrator');
    if (!isAdmin) {
      return { success: false, error: 'You do not have permission to view roles' };
    }

    const query = `
      SELECT 
        id, name, description, is_system, created_at, updated_at
      FROM roles
      ORDER BY name
    `;

    const result = await executeSQL(query);
    const roles = result.records?.map(record => ({
      id: record[0].longValue!,
      name: record[1].stringValue!,
      description: record[2].stringValue,
      is_system: record[3].booleanValue!,
      created_at: new Date(record[4].stringValue!),
      updated_at: new Date(record[5].stringValue!),
    })) || [];

    return { success: true, data: roles };
  } catch (error) {
    console.error('Error fetching roles:', error);
    return { success: false, error: 'Failed to fetch roles' };
  }
}

// Get all users with their roles
export async function getUsersWithRolesAction(): Promise<ActionState<UserWithRoles[]>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user is admin
    const isAdmin = await hasRole('Administrator');
    if (!isAdmin) {
      return { success: false, error: 'You do not have permission to view users' };
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
    
    result.records?.forEach(record => {
      const userId = record[0].longValue!;
      
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          id: userId,
          email: record[1].stringValue!,
          first_name: record[2].stringValue,
          last_name: record[3].stringValue,
          created_at: new Date(record[4].stringValue!),
          last_sign_in_at: record[5].stringValue ? new Date(record[5].stringValue) : undefined,
          roles: []
        });
      }
      
      // Add role if it exists
      if (record[6].longValue) {
        const user = usersMap.get(userId)!;
        user.roles.push({
          id: record[6].longValue,
          name: record[7].stringValue!,
          description: record[8].stringValue,
          is_system: record[9].booleanValue!,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    });

    return { success: true, data: Array.from(usersMap.values()) };
  } catch (error) {
    console.error('Error fetching users with roles:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
}

// Update user roles
export async function updateUserRolesAction(userId: number, roleIds: number[]): Promise<ActionState<void>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if user is admin
    const isAdmin = await hasRole('Administrator');
    if (!isAdmin) {
      return { success: false, error: 'You do not have permission to update user roles' };
    }

    // Don't allow users to modify their own admin role
    if (userId === currentUser.id) {
      const userRoles = await executeSQL(
        `SELECT role_id FROM user_roles WHERE user_id = $1`,
        [{ name: '1', value: { longValue: userId } }]
      );
      
      const adminRole = await executeSQL(
        `SELECT id FROM roles WHERE name = 'Administrator'`,
        []
      );
      
      if (adminRole.records?.length && userRoles.records?.length) {
        const adminRoleId = adminRole.records[0][0].longValue!;
        const hasAdminRole = userRoles.records.some(r => r[0].longValue === adminRoleId);
        const keepingAdminRole = roleIds.includes(adminRoleId);
        
        if (hasAdminRole && !keepingAdminRole) {
          return { success: false, error: 'Cannot remove your own administrator role' };
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
      return { success: true, data: undefined };
    } catch (error) {
      await executeSQL('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating user roles:', error);
    return { success: false, error: 'Failed to update user roles' };
  }
}