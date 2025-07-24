import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { getInterventionsAction } from '@/actions/db/interventions-actions';
import { InterventionsTable } from './_components/interventions-table';

export default async function InterventionsPage({
  searchParams,
}: {
  searchParams: { 
    search?: string; 
    status?: string; 
    type?: string;
    page?: string;
    perPage?: string;
  }
}) {
  const currentPage = Number(searchParams.page) || 1;
  const perPage = Number(searchParams.perPage) || 20;

  // Fetch interventions with filters
  const interventionsResult = await getInterventionsAction({
    status: searchParams.status as any,
    type: searchParams.type as any,
  });

  const interventions = interventionsResult.success ? interventionsResult.data : [];

  // Filter by search term if provided
  const filteredInterventions = searchParams.search
    ? interventions.filter(intervention => {
        const searchTerm = searchParams.search!.toLowerCase();
        return (
          intervention.title.toLowerCase().includes(searchTerm) ||
          intervention.student.first_name.toLowerCase().includes(searchTerm) ||
          intervention.student.last_name.toLowerCase().includes(searchTerm) ||
          intervention.student.student_id.toLowerCase().includes(searchTerm) ||
          (intervention.program?.name?.toLowerCase().includes(searchTerm) ?? false)
        );
      })
    : interventions;

  // Pagination
  const totalItems = filteredInterventions.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedInterventions = filteredInterventions.slice(startIndex, endIndex);

  return (
    <div className="space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interventions</h1>
          <p className="text-muted-foreground">
            Manage and track student interventions
          </p>
        </div>
        <Link href="/interventions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Intervention
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <InterventionsTable
          interventions={paginatedInterventions}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          perPage={perPage}
        />
      </Suspense>
    </div>
  );
}