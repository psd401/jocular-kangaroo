'use client';

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
import { Badge } from '@/components/ui/badge';
import { Eye, Pencil } from 'lucide-react';
import { InterventionProgram } from '@/types/intervention-types';
import { cn } from '@/lib/utils';

interface ProgramsTableProps {
  programs: InterventionProgram[];
}

const typeConfig = {
  academic: { label: 'Academic', className: 'bg-blue-100 text-blue-800' },
  behavioral: { label: 'Behavioral', className: 'bg-purple-100 text-purple-800' },
  social_emotional: { label: 'Social Emotional', className: 'bg-green-100 text-green-800' },
  attendance: { label: 'Attendance', className: 'bg-orange-100 text-orange-800' },
  health: { label: 'Health', className: 'bg-red-100 text-red-800' },
  other: { label: 'Other', className: 'bg-gray-100 text-gray-800' },
};

export function ProgramsTable({ programs }: ProgramsTableProps) {
  // Group programs by type
  const programsByType = programs.reduce((acc, program) => {
    if (!acc[program.type]) {
      acc[program.type] = [];
    }
    acc[program.type].push(program);
    return acc;
  }, {} as Record<string, InterventionProgram[]>);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Program Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {programs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No programs found.
              </TableCell>
            </TableRow>
          ) : (
            Object.entries(programsByType).flatMap(([type, typePrograms]) =>
              typePrograms.map((program) => (
                <TableRow key={program.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{program.name}</div>
                      {program.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {program.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(typeConfig[program.type].className, 'border-0')}>
                      {typeConfig[program.type].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {program.duration_days ? `${program.duration_days} days` : 'Ongoing'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={program.is_active ? 'default' : 'secondary'}>
                      {program.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/programs/${program.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/programs/${program.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )
          )}
        </TableBody>
      </Table>
    </div>
  );
}