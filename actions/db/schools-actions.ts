'use server';

import { executeSQL } from '@/lib/db/data-api-adapter';
import { ActionState } from '@/types/actions-types';
import { School } from '@/types/intervention-types';
import { getCurrentUserAction } from './get-current-user-action';

// Helper to convert null to undefined
const nullToUndefined = <T>(value: T | null): T | undefined => value === null ? undefined : value;

// Get all schools
export async function getSchoolsAction(): Promise<ActionState<School[]>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    const query = `
      SELECT 
        id, name, district, address, phone, email, 
        principal_name, created_at, updated_at
      FROM schools
      ORDER BY name
    `;

    const result = await executeSQL<any>(query);
    const schools = result.map(row => ({
      id: row.id as number,
      name: row.name as string,
      district: nullToUndefined(row.district as string | null),
      address: nullToUndefined(row.address as string | null),
      phone: nullToUndefined(row.phone as string | null),
      email: nullToUndefined(row.email as string | null),
      principal_name: nullToUndefined(row.principalName as string | null),
      created_at: new Date(row.createdAt as string),
      updated_at: new Date(row.updatedAt as string),
    }));

    return { isSuccess: true, message: 'Schools fetched successfully', data: schools };
  } catch (error) {
    // Error logged: Error fetching schools
    return { isSuccess: false, message: 'Failed to fetch schools' };
  }
}