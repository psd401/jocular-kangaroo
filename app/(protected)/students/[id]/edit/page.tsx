import { notFound } from 'next/navigation';
import { StudentForm } from '../../_components/student-form';
import { getStudentByIdAction } from '@/actions/db/students-actions';
import { getSchoolsAction } from '@/actions/db/schools-actions';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default async function EditStudentPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const studentId = parseInt(params.id);
  
  if (isNaN(studentId)) {
    notFound();
  }

  const [studentResult, schoolsResult] = await Promise.all([
    getStudentByIdAction(studentId),
    getSchoolsAction()
  ]);
  
  if (!studentResult.success || !studentResult.data) {
    notFound();
  }

  const student = studentResult.data;
  const schools = schoolsResult.success ? schoolsResult.data : [];

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="mb-6">
        <Link href={`/students/${student.id}`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Student Details
          </Button>
        </Link>
      </div>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Student</h1>
        <p className="text-muted-foreground">
          Update information for {student.first_name} {student.last_name}
        </p>
      </div>

      <StudentForm student={student} schools={schools} />
    </div>
  );
}