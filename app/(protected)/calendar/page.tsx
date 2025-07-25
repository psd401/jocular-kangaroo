import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

export default function CalendarPage() {
  return (
    <div className="space-y-6 p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Intervention Calendar</h1>
        <p className="text-muted-foreground">
          View and manage intervention schedules
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
              <CardDescription>
                Monthly view of scheduled interventions
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[500px] flex items-center justify-center">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Interactive calendar coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Schedule</CardTitle>
              <CardDescription>
                Interventions scheduled for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground text-center py-4">
                  No interventions scheduled for today
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming</CardTitle>
              <CardDescription>
                Next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground text-center py-4">
                  No upcoming interventions
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendar Features</CardTitle>
          <CardDescription>
            Coming soon
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            The calendar module will include:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Schedule Management</p>
                <p className="text-xs text-muted-foreground">
                  Create and manage intervention sessions
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Users className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Staff Assignments</p>
                <p className="text-xs text-muted-foreground">
                  View staff schedules and availability
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Location Tracking</p>
                <p className="text-xs text-muted-foreground">
                  Manage room assignments and resources
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Recurring Sessions</p>
                <p className="text-xs text-muted-foreground">
                  Set up weekly or daily intervention patterns
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}