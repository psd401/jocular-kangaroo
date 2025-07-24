'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Search,
} from 'lucide-react';
import { InterventionWithDetails } from '@/types/intervention-types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface InterventionsTableProps {
  interventions: InterventionWithDetails[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
}

const statusConfig = {
  planned: { label: 'Planned', variant: 'secondary' as const },
  in_progress: { label: 'In Progress', variant: 'default' as const },
  completed: { label: 'Completed', variant: 'success' as const },
  discontinued: { label: 'Discontinued', variant: 'destructive' as const },
  on_hold: { label: 'On Hold', variant: 'warning' as const },
};

const typeConfig = {
  academic: { label: 'Academic', className: 'bg-blue-100 text-blue-800' },
  behavioral: { label: 'Behavioral', className: 'bg-purple-100 text-purple-800' },
  social_emotional: { label: 'Social Emotional', className: 'bg-green-100 text-green-800' },
  attendance: { label: 'Attendance', className: 'bg-orange-100 text-orange-800' },
  health: { label: 'Health', className: 'bg-red-100 text-red-800' },
  other: { label: 'Other', className: 'bg-gray-100 text-gray-800' },
};

export function InterventionsTable({
  interventions,
  currentPage,
  totalPages,
  totalItems,
  perPage,
}: InterventionsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm) {
      params.set('search', searchTerm);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/interventions?${params.toString()}`);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    params.set('page', '1');
    router.push(`/interventions?${params.toString()}`);
  };

  const handleTypeFilter = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (type === 'all') {
      params.delete('type');
    } else {
      params.set('type', type);
    }
    params.set('page', '1');
    router.push(`/interventions?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/interventions?${params.toString()}`);
  };

  const handlePerPageChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('perPage', value);
    params.set('page', '1');
    router.push(`/interventions?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-sm">
          <Input
            placeholder="Search interventions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        
        <div className="flex gap-2">
          <Select
            value={searchParams.get('status') || 'all'}
            onValueChange={handleStatusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="discontinued">Discontinued</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={searchParams.get('type') || 'all'}
            onValueChange={handleTypeFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="behavioral">Behavioral</SelectItem>
              <SelectItem value="social_emotional">Social Emotional</SelectItem>
              <SelectItem value="attendance">Attendance</SelectItem>
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Intervention</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interventions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No interventions found.
                </TableCell>
              </TableRow>
            ) : (
              interventions.map((intervention) => (
                <TableRow key={intervention.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {intervention.student.first_name} {intervention.student.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ID: {intervention.student.student_id} | Grade: {intervention.student.grade}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{intervention.title}</div>
                      {intervention.program && (
                        <div className="text-sm text-muted-foreground">
                          {intervention.program.name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(typeConfig[intervention.type].className, 'border-0')}>
                      {typeConfig[intervention.type].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[intervention.status].variant}>
                      {statusConfig[intervention.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(intervention.start_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {intervention.assigned_to_user ? (
                      <div className="text-sm">
                        {intervention.assigned_to_user.first_name} {intervention.assigned_to_user.last_name}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/interventions/${intervention.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/interventions/${intervention.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * perPage) + 1} to{' '}
              {Math.min(currentPage * perPage, totalItems)} of {totalItems} results
            </p>
            <Select value={perPage.toString()} onValueChange={handlePerPageChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                return page === 1 || 
                       page === totalPages || 
                       (page >= currentPage - 1 && page <= currentPage + 1);
              })
              .map((page, index, array) => (
                <div key={page} className="flex items-center gap-2">
                  {index > 0 && array[index - 1] !== page - 1 && (
                    <span className="text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                </div>
              ))}
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}