import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { hasToolAccess } from '@/lib/auth/tool-helpers';
import { getCurrentUser } from '@/actions/db/get-current-user-action';

export default async function SchoolsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>
              Please sign in to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const hasAccess = await hasToolAccess(currentUser.id, 'schools');
  if (!hasAccess) {
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
    <div className="space-y-6 p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">School Management</h1>
        <p className="text-muted-foreground">
          Manage school information and settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schools</CardTitle>
          <CardDescription>
            View and manage school information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            School management interface coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}