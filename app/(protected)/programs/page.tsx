import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { getInterventionProgramsAction } from '@/actions/db/intervention-programs-actions';
import { ProgramsTable } from './_components/programs-table';

export default async function ProgramsPage() {
  // Fetch all programs including inactive ones
  const programsResult = await getInterventionProgramsAction(true);
  const programs = programsResult.isSuccess && programsResult.data ? programsResult.data : [];

  return (
    <div className="space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intervention Programs</h1>
          <p className="text-muted-foreground">
            Manage intervention program templates
          </p>
        </div>
        <Link href="/programs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Program
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ProgramsTable programs={programs} />
      </Suspense>
    </div>
  );
}