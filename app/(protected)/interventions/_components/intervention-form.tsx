'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Student } from '@/types/intervention-types';
import { InterventionProgram, Intervention } from '@/types/intervention-types';
import { UserForSelect } from '@/actions/db/users-actions';
import { createInterventionAction, updateInterventionAction } from '@/actions/db/interventions-actions';

const formSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  program_id: z.string().optional(),
  type: z.enum(['academic', 'behavioral', 'social_emotional', 'attendance', 'health', 'other'], {
    required_error: 'Intervention type is required',
  }),
  status: z.enum(['planned', 'in_progress', 'completed', 'discontinued', 'on_hold']).optional(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  goals: z.string().optional(),
  start_date: z.date({
    required_error: 'Start date is required',
  }),
  end_date: z.date().optional(),
  frequency: z.string().optional(),
  duration_minutes: z.string().optional(),
  location: z.string().optional(),
  assigned_to: z.string().optional(),
  completion_notes: z.string().optional(),
});

interface InterventionFormProps {
  students: Student[];
  programs: InterventionProgram[];
  users: UserForSelect[];
  intervention?: Intervention;
}

export function InterventionForm({ 
  students, 
  programs, 
  users,
  intervention 
}: InterventionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      student_id: intervention?.student_id?.toString() || '',
      program_id: intervention?.program_id?.toString() || '',
      type: intervention?.type || undefined,
      status: intervention?.status || 'planned',
      title: intervention?.title || '',
      description: intervention?.description || '',
      goals: intervention?.goals || '',
      start_date: intervention?.start_date ? new Date(intervention.start_date) : undefined,
      end_date: intervention?.end_date ? new Date(intervention.end_date) : undefined,
      frequency: intervention?.frequency || '',
      duration_minutes: intervention?.duration_minutes?.toString() || '',
      location: intervention?.location || '',
      assigned_to: intervention?.assigned_to?.toString() || '',
      completion_notes: intervention?.completion_notes || '',
    },
  });

  const selectedType = form.watch('type');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const data = {
        student_id: parseInt(values.student_id),
        program_id: values.program_id ? parseInt(values.program_id) : undefined,
        type: values.type,
        status: values.status,
        title: values.title,
        description: values.description || undefined,
        goals: values.goals || undefined,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        end_date: values.end_date ? format(values.end_date, 'yyyy-MM-dd') : undefined,
        frequency: values.frequency || undefined,
        duration_minutes: values.duration_minutes ? parseInt(values.duration_minutes) : undefined,
        location: values.location || undefined,
        assigned_to: values.assigned_to ? parseInt(values.assigned_to) : undefined,
        completion_notes: values.completion_notes || undefined,
      };

      const result = intervention
        ? await updateInterventionAction({ ...data, id: intervention.id })
        : await createInterventionAction(data);

      if (result.isSuccess) {
        toast.success(intervention ? 'Intervention updated' : 'Intervention created');
        router.push(`/interventions/${result.data?.id || intervention?.id}`);
      } else {
        toast.error(result.message || 'Something went wrong');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filter programs by selected type
  const filteredPrograms = selectedType 
    ? programs.filter(p => p.type === selectedType)
    : programs;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Student Selection */}
        <FormField
          control={form.control}
          name="student_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.last_name}, {student.first_name} - ID: {student.student_id} (Grade {student.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Select the student who will receive this intervention
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type and Program */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select intervention type" />
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

          <FormField
            control={form.control}
            name="program_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Program Template</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={!selectedType}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a program (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {filteredPrograms.map((program) => (
                      <SelectItem key={program.id} value={program.id.toString()}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select a program template to pre-fill details
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Title and Status */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter intervention title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
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
                  placeholder="Describe the intervention..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
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
                  placeholder="What are the goals of this intervention?"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Dates */}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Leave blank for ongoing interventions
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Schedule Details */}
        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 3x per week" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="30" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Resource Room" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Assignment */}
        <FormField
          control={form.control}
          name="assigned_to"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned To</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.last_name}, {user.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Completion Notes (only show for completed interventions) */}
        {form.watch('status') === 'completed' && (
          <FormField
            control={form.control}
            name="completion_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Completion Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Notes about the intervention completion..."
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : intervention ? 'Update Intervention' : 'Create Intervention'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/interventions')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}