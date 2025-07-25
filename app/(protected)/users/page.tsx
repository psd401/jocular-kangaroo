import { Suspense } from 'react';
import { getUsersWithRolesAction, getRolesAction } from '@/actions/db/roles-actions';
import { UsersTable } from './_components/users-table';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function UsersPage() {
  // Fetch users and roles
  const [usersResult, rolesResult] = await Promise.all([
    getUsersWithRolesAction(),
    getRolesAction()
  ]);

  const users = usersResult.isSuccess ? usersResult.data : [];
  const roles = rolesResult.isSuccess ? rolesResult.data : [];

  if (!usersResult.isSuccess || !rolesResult.isSuccess) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts and role assignments
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <UsersTable users={users || []} roles={roles || []} />
      </Suspense>
    </div>
  );
}