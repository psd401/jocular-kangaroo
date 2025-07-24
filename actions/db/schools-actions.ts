'use server';

import { executeSQL } from '@/lib/db/data-api-client';
import { ActionState } from '@/types/actions-types';
import { School } from '@/types/intervention-types';
import { getCurrentUser } from './get-current-user-action';

// Get all schools
export async function getSchoolsAction(): Promise<ActionState<School[]>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const query = `
      SELECT 
        id, name, district, address, phone, email, 
        principal_name, created_at, updated_at
      FROM schools
      ORDER BY name
    `;

    const result = await executeSQL(query);
    const schools = result.records?.map(record => ({
      id: record[0].longValue!,
      name: record[1].stringValue!,
      district: record[2].stringValue,
      address: record[3].stringValue,
      phone: record[4].stringValue,
      email: record[5].stringValue,
      principal_name: record[6].stringValue,
      created_at: new Date(record[7].stringValue!),
      updated_at: new Date(record[8].stringValue!),
    })) || [];

    return { success: true, data: schools };
  } catch (error) {
    console.error('Error fetching schools:', error);
    return { success: false, error: 'Failed to fetch schools' };
  }
}