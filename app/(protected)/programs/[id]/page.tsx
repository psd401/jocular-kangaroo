import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import { getInterventionProgramByIdAction } from '@/actions/db/intervention-programs-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const typeConfig = {
  academic: { label: 'Academic', className: 'bg-blue-100 text-blue-800' },
  behavioral: { label: 'Behavioral', className: 'bg-purple-100 text-purple-800' },
  social_emotional: { label: 'Social Emotional', className: 'bg-green-100 text-green-800' },
  attendance: { label: 'Attendance', className: 'bg-orange-100 text-orange-800' },
  health: { label: 'Health', className: 'bg-red-100 text-red-800' },
  other: { label: 'Other', className: 'bg-gray-100 text-gray-800' },
};

export default async function ProgramPage({ 
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/programs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{program.name}</h1>
            <p className="text-muted-foreground">
              Intervention Program Template
            </p>
          </div>
        </div>
        <Link href={`/programs/${program.id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Program
          </Button>
        </Link>
      </div>

      {/* Status and Type Badges */}
      <div className="flex gap-2">
        <Badge className={cn(typeConfig[program.type].className, 'border-0')}>
          {typeConfig[program.type].label}
        </Badge>
        <Badge variant={program.is_active ? 'default' : 'secondary'}>
          {program.is_active ? 'Active' : 'Inactive'}
        </Badge>
        {program.duration_days && (
          <Badge variant="outline">{program.duration_days} days</Badge>
        )}
      </div>

      {/* Program Details */}
      <div className="space-y-6">
        {program.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{program.description}</p>
            </CardContent>
          </Card>
        )}

        {program.goals && (
          <Card>
            <CardHeader>
              <CardTitle>Goals</CardTitle>
              <CardDescription>
                Expected outcomes and objectives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{program.goals}</p>
            </CardContent>
          </Card>
        )}

        {program.materials && (
          <Card>
            <CardHeader>
              <CardTitle>Materials</CardTitle>
              <CardDescription>
                Required resources and materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{program.materials}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Program Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{typeConfig[program.type].label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">
                {program.duration_days ? `${program.duration_days} days` : 'Ongoing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium">
                {program.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}