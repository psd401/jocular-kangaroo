import { StudentForm } from '../_components/student-form';
import { getSchoolsAction } from '@/actions/db/schools-actions';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NewStudentPage() {
  const schoolsResult = await getSchoolsAction();
  const schools = schoolsResult.isSuccess && schoolsResult.data ? schoolsResult.data : [];

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="mb-6">
        <Link href="/students">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Students
          </Button>
        </Link>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add New Student</h1>
        <p className="text-muted-foreground">Create a new student record</p>
      </div>

      <StudentForm schools={schools} />
    </div>
  );
}