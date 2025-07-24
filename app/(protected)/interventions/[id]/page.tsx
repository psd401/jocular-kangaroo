import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, Calendar, Clock, MapPin } from 'lucide-react';
import { getInterventionByIdAction } from '@/actions/db/interventions-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

export default async function InterventionPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const interventionId = parseInt(params.id);
  
  if (isNaN(interventionId)) {
    notFound();
  }

  const result = await getInterventionByIdAction(interventionId);

  if (!result.success || !result.data) {
    notFound();
  }

  const intervention = result.data;

  return (
    <div className="space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/interventions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{intervention.title}</h1>
            <p className="text-muted-foreground">
              Intervention for {intervention.student.first_name} {intervention.student.last_name}
            </p>
          </div>
        </div>
        <Link href={`/interventions/${intervention.id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Intervention
          </Button>
        </Link>
      </div>

      {/* Status and Type Badges */}
      <div className="flex gap-2">
        <Badge variant={statusConfig[intervention.status].variant}>
          {statusConfig[intervention.status].label}
        </Badge>
        <Badge className={cn(typeConfig[intervention.type].className, 'border-0')}>
          {typeConfig[intervention.type].label}
        </Badge>
        {intervention.program && (
          <Badge variant="outline">{intervention.program.name}</Badge>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Sessions ({intervention.sessions?.length || 0})</TabsTrigger>
          <TabsTrigger value="goals">Goals ({intervention.goals?.length || 0})</TabsTrigger>
          <TabsTrigger value="team">Team ({intervention.team_members?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Student Information */}
            <Card>
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">
                    {intervention.student.first_name} {intervention.student.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student ID:</span>
                  <span className="font-medium">{intervention.student.student_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Grade:</span>
                  <span className="font-medium">{intervention.student.grade}</span>
                </div>
                <div className="pt-2">
                  <Link href={`/students/${intervention.student.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Student Profile
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Schedule Information */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(intervention.start_date), 'MMM d, yyyy')}
                    {intervention.end_date && (
                      <> - {format(new Date(intervention.end_date), 'MMM d, yyyy')}</>
                    )}
                  </span>
                </div>
                {intervention.frequency && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{intervention.frequency}</span>
                    {intervention.duration_minutes && (
                      <span className="text-sm">({intervention.duration_minutes} minutes)</span>
                    )}
                  </div>
                )}
                {intervention.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{intervention.location}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Description and Goals */}
          {(intervention.description || intervention.goals) && (
            <div className="grid gap-4 md:grid-cols-2">
              {intervention.description && (
                <Card>
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{intervention.description}</p>
                  </CardContent>
                </Card>
              )}

              {intervention.goals && (
                <Card>
                  <CardHeader>
                    <CardTitle>Goals Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{intervention.goals}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Assignment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned to:</span>
                <span className="font-medium">
                  {intervention.assigned_to_user 
                    ? `${intervention.assigned_to_user.first_name} ${intervention.assigned_to_user.last_name}`
                    : 'Unassigned'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">
                  {format(new Date(intervention.created_at), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="font-medium">
                  {format(new Date(intervention.updated_at), 'MMM d, yyyy')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Completion Notes */}
          {intervention.completion_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Completion Notes</CardTitle>
                <CardDescription>
                  Completed on {intervention.completed_at && format(new Date(intervention.completed_at), 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{intervention.completion_notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Intervention Sessions</h3>
            <Button>Add Session</Button>
          </div>
          
          {intervention.sessions && intervention.sessions.length > 0 ? (
            <div className="space-y-4">
              {intervention.sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">
                          {format(new Date(session.session_date), 'MMM d, yyyy')}
                        </CardTitle>
                        <CardDescription>
                          {session.duration_minutes} minutes • {session.attended ? 'Attended' : 'Missed'}
                        </CardDescription>
                      </div>
                      <Badge variant={session.attended ? 'default' : 'destructive'}>
                        {session.attended ? 'Attended' : 'Missed'}
                      </Badge>
                    </div>
                  </CardHeader>
                  {(session.progress_notes || session.challenges || session.next_steps) && (
                    <CardContent className="space-y-2">
                      {session.progress_notes && (
                        <div>
                          <span className="font-medium text-sm">Progress Notes:</span>
                          <p className="text-sm text-muted-foreground">{session.progress_notes}</p>
                        </div>
                      )}
                      {session.challenges && (
                        <div>
                          <span className="font-medium text-sm">Challenges:</span>
                          <p className="text-sm text-muted-foreground">{session.challenges}</p>
                        </div>
                      )}
                      {session.next_steps && (
                        <div>
                          <span className="font-medium text-sm">Next Steps:</span>
                          <p className="text-sm text-muted-foreground">{session.next_steps}</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No sessions recorded yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Intervention Goals</h3>
            <Button>Add Goal</Button>
          </div>
          
          {intervention.goals && intervention.goals.length > 0 ? (
            <div className="space-y-4">
              {intervention.goals.map((goal) => (
                <Card key={goal.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{goal.goal_text}</CardTitle>
                      <Badge variant={goal.is_achieved ? 'success' : 'secondary'}>
                        {goal.is_achieved ? 'Achieved' : 'In Progress'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {goal.target_date && (
                        <>Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}</>
                      )}
                      {goal.achieved_date && (
                        <> • Achieved: {format(new Date(goal.achieved_date), 'MMM d, yyyy')}</>
                      )}
                    </CardDescription>
                  </CardHeader>
                  {goal.evidence && (
                    <CardContent>
                      <span className="font-medium text-sm">Evidence:</span>
                      <p className="text-sm text-muted-foreground">{goal.evidence}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No goals set yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Team Members</h3>
            <Button>Add Team Member</Button>
          </div>
          
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No team members assigned yet</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Documents & Attachments</h3>
            <Button>Upload Document</Button>
          </div>
          
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No documents uploaded yet</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}