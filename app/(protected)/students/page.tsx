import { Suspense } from 'react';
import { StudentsTable } from './_components/students-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { getStudentsAction } from '@/actions/db/students-actions';
import { getSchoolsAction } from '@/actions/db/schools-actions';

export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  const [studentsResult, schoolsResult] = await Promise.all([
    getStudentsAction(),
    getSchoolsAction()
  ]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage student records and information</p>
        </div>
        <Link href="/students/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <StudentsTable 
          students={studentsResult.isSuccess && studentsResult.data ? studentsResult.data : []}
          schools={schoolsResult.isSuccess && schoolsResult.data ? schoolsResult.data : []}
        />
      </Suspense>
    </div>
  );
}