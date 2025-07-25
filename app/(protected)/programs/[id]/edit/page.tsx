import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ProgramForm } from '../../_components/program-form';
import { getInterventionProgramByIdAction } from '@/actions/db/intervention-programs-actions';

export default async function EditProgramPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const programId = parseInt(id);
  
  if (isNaN(programId)) {
    notFound();
  }

  const result = await getInterventionProgramByIdAction(programId);

  if (!result.isSuccess || !result.data) {
    notFound();
  }

  const program = result.data;

  return (
    <div className="space-y-6 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/programs/${program.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Program</h1>
          <p className="text-muted-foreground">
            Update the {program.name} program template
          </p>
        </div>
      </div>

      <ProgramForm program={program} />
    </div>
  );
}