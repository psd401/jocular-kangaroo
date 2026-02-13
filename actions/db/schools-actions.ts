'use server';

import { SqlParameter } from '@aws-sdk/client-rds-data';
import { executeSQL } from '@/lib/db/data-api-adapter';
import { ActionState } from '@/types/actions-types';
import { School } from '@/types/intervention-types';
import { getCurrentUserAction } from './get-current-user-action';
import {
  buildSecurityContext,
  buildSchoolAccessFilter,
  logDataAccessBatch,
  checkActionRateLimit,
} from '@/lib/security';

// Helper to convert null to undefined
const nullToUndefined = <T>(value: T | null): T | undefined => value === null ? undefined : value;

// Get all schools
export async function getSchoolsAction(): Promise<ActionState<School[]>> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser.isSuccess || !currentUser.data) {
      return { isSuccess: false, message: 'Unauthorized' };
    }

    const userId = currentUser.data.user.id;
    const roleNames = currentUser.data.roles.map(r => r.name);

    // Rate limit check
    if (!checkActionRateLimit(userId, 'getSchools')) {
      return { isSuccess: false, message: 'Rate limit exceeded. Please try again later.' };
    }

    // Build security context and access filter
    const secCtx = await buildSecurityContext(userId, roleNames);
    const accessFilter = buildSchoolAccessFilter(secCtx, 1);

    let query = `
      SELECT
        id, name, district, address, phone, email,
        principal_name, created_at, updated_at
      FROM schools
      WHERE 1=1
    `;

    const parameters: SqlParameter[] = [];

    // Inject row-level access filter
    query += accessFilter.sql;
    parameters.push(...accessFilter.parameters);

    query += ` ORDER BY name`;

    const result = await executeSQL(query, parameters);
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

    // Audit log
    logDataAccessBatch(
      { userId, action: 'list', entityType: 'school' },
      schools.map(s => s.id),
      schools.length
    );

    return { isSuccess: true, message: 'Schools fetched successfully', data: schools };
  } catch (error) {
    // Error logged: Error fetching schools
    return { isSuccess: false, message: 'Failed to fetch schools' };
  }
}
