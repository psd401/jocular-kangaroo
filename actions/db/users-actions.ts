'use server';

import { executeSQL } from '@/lib/db/data-api-adapter';
import { ActionState } from '@/types/actions-types';
import { getCurrentUserAction } from './get-current-user-action';

export interface UserForSelect {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

// Get all users for selection (e.g., in dropdowns)
export async function getUsersAction(): Promise<ActionState<UserForSelect[]>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    const query = `
      SELECT 
        id, first_name, last_name, email
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY last_name, first_name
    `;

    const result = await executeSQL<any>(query);
    const users = result.map(row => ({
      id: row.id as number,
      first_name: row.firstName as string,
      last_name: row.lastName as string,
      email: row.email as string,
    }));

    return { isSuccess: true, message: 'Users fetched successfully', data: users };
  } catch (error) {
    // Error logged: Error fetching users
    return { isSuccess: false, message: 'Failed to fetch users' };
  }
}