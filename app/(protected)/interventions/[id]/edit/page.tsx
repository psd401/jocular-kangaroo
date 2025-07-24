import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { InterventionForm } from '../../_components/intervention-form';
import { getInterventionByIdAction } from '@/actions/db/interventions-actions';
import { getStudentsAction } from '@/actions/db/students-actions';
import { getInterventionProgramsAction } from '@/actions/db/intervention-programs-actions';
import { getUsersAction } from '@/actions/db/users-actions';

export default async function EditInterventionPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const interventionId = parseInt(params.id);
  
  if (isNaN(interventionId)) {
    notFound();
  }

  // Fetch intervention and required data
  const [interventionResult, studentsResult, programsResult, usersResult] = await Promise.all([
    getInterventionByIdAction(interventionId),
    getStudentsAction(),
    getInterventionProgramsAction(false),
    getUsersAction(),
  ]);

  if (!interventionResult.success || !interventionResult.data) {
    notFound();
  }

  const intervention = interventionResult.data;
  const students = studentsResult.success ? studentsResult.data : [];
  const programs = programsResult.success ? programsResult.data : [];
  const users = usersResult.success ? usersResult.data : [];

  return (
    <div className="space-y-6 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/interventions/${intervention.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Intervention</h1>
          <p className="text-muted-foreground">
            Update intervention details for {intervention.student.first_name} {intervention.student.last_name}
          </p>
        </div>
      </div>

      <InterventionForm 
        students={students}
        programs={programs}
        users={users}
        intervention={intervention}
      />
    </div>
  );
}