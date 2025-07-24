'use server';

import { executeSQL } from '@/lib/db/data-api-client';
import { ActionState } from '@/types/actions-types';
import { getCurrentUser } from './get-current-user-action';

export interface UserForSelect {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

// Get all users for selection (e.g., in dropdowns)
export async function getUsersAction(): Promise<ActionState<UserForSelect[]>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const query = `
      SELECT 
        id, first_name, last_name, email
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY last_name, first_name
    `;

    const result = await executeSQL(query);
    const users = result.records?.map(record => ({
      id: record[0].longValue!,
      first_name: record[1].stringValue!,
      last_name: record[2].stringValue!,
      email: record[3].stringValue!,
    })) || [];

    return { success: true, data: users };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
}