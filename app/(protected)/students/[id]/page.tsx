import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  Edit, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  School,
  AlertCircle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { getStudentByIdAction } from '@/actions/db/students-actions';

export default async function StudentDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const studentId = parseInt(params.id);
  
  if (isNaN(studentId)) {
    notFound();
  }

  const result = await getStudentByIdAction(studentId);
  
  if (!result.success || !result.data) {
    notFound();
  }

  const student = result.data;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'transferred': return 'outline';
      case 'graduated': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/students">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Students
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {student.first_name} {student.middle_name} {student.last_name}
            </h1>
            <p className="text-muted-foreground">Student ID: {student.student_id}</p>
          </div>
        </div>
        <Link href={`/students/${student.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Student
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={getStatusBadgeVariant(student.status)}>
                {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
              </Badge>
            </CardContent>
          </Card>

          {/* Basic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Grade {student.grade}
                </span>
              </div>
              
              {student.date_of_birth && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Born {format(new Date(student.date_of_birth), 'PPP')}
                  </span>
                </div>
              )}
              
              {student.school && (
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{student.school.name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${student.email}`} className="text-sm hover:underline">
                    {student.email}
                  </a>
                </div>
              )}
              
              {student.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${student.phone}`} className="text-sm hover:underline">
                    {student.phone}
                  </a>
                </div>
              )}
              
              {student.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{student.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact Card */}
          {(student.emergency_contact_name || student.emergency_contact_phone) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {student.emergency_contact_name && (
                  <p className="text-sm font-medium">{student.emergency_contact_name}</p>
                )}
                {student.emergency_contact_phone && (
                  <a 
                    href={`tel:${student.emergency_contact_phone}`} 
                    className="text-sm hover:underline flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {student.emergency_contact_phone}
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="interventions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="interventions">Interventions</TabsTrigger>
              <TabsTrigger value="guardians">Guardians</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="interventions" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Active Interventions</CardTitle>
                    <Link href={`/interventions/new?student=${student.id}`}>
                      <Button size="sm">Add Intervention</Button>
                    </Link>
                  </div>
                  <CardDescription>
                    Current and upcoming intervention programs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    No active interventions found.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Past Interventions</CardTitle>
                  <CardDescription>
                    Completed intervention history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    No past interventions found.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="guardians" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Parent/Guardian Information</CardTitle>
                    <Button size="sm">Add Guardian</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {student.guardians && student.guardians.length > 0 ? (
                    <div className="space-y-4">
                      {student.guardians.map((guardian) => (
                        <div key={guardian.id} className="border-b pb-4 last:border-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {guardian.first_name} {guardian.last_name}
                              </p>
                              {guardian.relationship && (
                                <p className="text-sm text-muted-foreground">
                                  {guardian.relationship}
                                </p>
                              )}
                              {guardian.email && (
                                <a 
                                  href={`mailto:${guardian.email}`} 
                                  className="text-sm hover:underline flex items-center gap-1 mt-1"
                                >
                                  <Mail className="h-3 w-3" />
                                  {guardian.email}
                                </a>
                              )}
                              {guardian.phone && (
                                <a 
                                  href={`tel:${guardian.phone}`} 
                                  className="text-sm hover:underline flex items-center gap-1"
                                >
                                  <Phone className="h-3 w-3" />
                                  {guardian.phone}
                                </a>
                              )}
                            </div>
                            {guardian.is_primary_contact && (
                              <Badge variant="secondary">Primary</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No guardians added yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {student.notes ? (
                    <p className="text-sm whitespace-pre-wrap">{student.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No additional notes.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}