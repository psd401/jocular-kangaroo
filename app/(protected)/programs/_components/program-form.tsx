'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { InterventionProgram } from '@/types/intervention-types';
import { createInterventionProgramAction, updateInterventionProgramAction } from '@/actions/db/intervention-programs-actions';

const formSchema = z.object({
  name: z.string().min(1, 'Program name is required').max(100),
  description: z.string().optional(),
  type: z.enum(['academic', 'behavioral', 'social_emotional', 'attendance', 'health', 'other'], {
    message: 'Program type is required',
  }),
  duration_days: z.string().optional(),
  materials: z.string().optional(),
  goals: z.string().optional(),
  is_active: z.boolean().optional(),
});

interface ProgramFormProps {
  program?: InterventionProgram;
}

export function ProgramForm({ program }: ProgramFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: program?.name || '',
      description: program?.description || '',
      type: program?.type || undefined,
      duration_days: program?.duration_days?.toString() || '',
      materials: program?.materials || '',
      goals: program?.goals || '',
      is_active: program?.is_active ?? true,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const data = {
        name: values.name,
        description: values.description || undefined,
        type: values.type,
        duration_days: values.duration_days ? parseInt(values.duration_days) : undefined,
        materials: values.materials || undefined,
        goals: values.goals || undefined,
        is_active: values.is_active,
      };

      const result = program
        ? await updateInterventionProgramAction({ ...data, id: program.id })
        : await createInterventionProgramAction(data);

      if (result.isSuccess) {
        toast.success(program ? 'Program updated' : 'Program created');
        router.push(`/programs/${result.data?.id || program?.id}`);
      } else {
        toast.error(result.message || 'Something went wrong');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Name and Type */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Program Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Reading Recovery" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select program type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="social_emotional">Social Emotional</SelectItem>
                    <SelectItem value="attendance">Attendance</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the program and its purpose..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide a brief overview of the intervention program
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Goals */}
        <FormField
          control={form.control}
          name="goals"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goals</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="List the main goals and objectives..."
                  className="resize-none"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                What are the expected outcomes of this program?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Materials */}
        <FormField
          control={form.control}
          name="materials"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Materials</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="List required materials and resources..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                What materials are needed to implement this program?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Duration and Status */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="duration_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (days)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="e.g., 90" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Expected program duration in days (leave blank for ongoing)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active</FormLabel>
                  <FormDescription>
                    Allow this program to be selected for new interventions
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : program ? 'Update Program' : 'Create Program'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/programs')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}