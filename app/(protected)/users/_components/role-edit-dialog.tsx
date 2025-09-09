'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserWithRoles, Role, updateUserRolesAction } from '@/actions/db/roles-actions';

interface RoleEditDialogProps {
  user: UserWithRoles;
  roles: Role[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleEditDialog({ user, roles, open, onOpenChange }: RoleEditDialogProps) {
  const router = useRouter();
  const [selectedRoles, setSelectedRoles] = useState<number[]>(
    user.roles.map(r => r.id)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await updateUserRolesAction(user.id, selectedRoles);
      
      if (result.isSuccess) {
        toast.success('User roles updated successfully');
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to update user roles');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRole = (roleId: number) => {
    setSelectedRoles(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User Roles</DialogTitle>
          <DialogDescription>
            Update role assignments for {user.first_name || user.email}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            {roles.map((role) => (
              <div key={role.id} className="flex items-start space-x-3">
                <Checkbox
                  id={`role-${role.id}`}
                  checked={selectedRoles.includes(role.id)}
                  onCheckedChange={() => toggleRole(role.id)}
                  disabled={isSubmitting}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor={`role-${role.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {role.name}
                  </Label>
                  {role.description && (
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedRoles.length === 0}
          >
            {isSubmitting ? 'Updating...' : 'Update Roles'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}