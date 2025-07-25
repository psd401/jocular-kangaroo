import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { InterventionForm } from '../_components/intervention-form';
import { getStudentsAction } from '@/actions/db/students-actions';
import { getInterventionProgramsAction } from '@/actions/db/intervention-programs-actions';
import { getUsersAction } from '@/actions/db/users-actions';

export default async function NewInterventionPage() {
  // Fetch required data for the form
  const [studentsResult, programsResult, usersResult] = await Promise.all([
    getStudentsAction(),
    getInterventionProgramsAction(false), // Only active programs
    getUsersAction(),
  ]);

  const students = studentsResult.isSuccess ? studentsResult.data || [] : [];
  const programs = programsResult.isSuccess ? programsResult.data || [] : [];
  const users = usersResult.isSuccess ? usersResult.data || [] : [];

  return (
    <div className="space-y-6 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/interventions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Intervention</h1>
          <p className="text-muted-foreground">
            Create a new intervention for a student
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading form...</div>}>
        <InterventionForm 
          students={students}
          programs={programs}
          users={users}
        />
      </Suspense>
    </div>
  );
}