import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ProgramForm } from '../_components/program-form';

export default function NewProgramPage() {
  return (
    <div className="space-y-6 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/programs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Program</h1>
          <p className="text-muted-foreground">
            Create a new intervention program template
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading form...</div>}>
        <ProgramForm />
      </Suspense>
    </div>
  );
}