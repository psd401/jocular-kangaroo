import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { hasToolAccess } from '@/utils/roles';

export const dynamic = 'force-dynamic';

export default async function SchoolsPage() {
  const hasAccess = await hasToolAccess('schools');
  if (!hasAccess) {
    return (
      <div>
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
    <div className="space-y-6">
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