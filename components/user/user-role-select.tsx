'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface UserRoleSelectProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
  disabled?: boolean;
}

export function UserRoleSelect({ currentRole, onRoleChange, disabled }: UserRoleSelectProps) {
  return (
    <Select
      defaultValue={currentRole}
      onValueChange={onRoleChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a role" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="student">Student</SelectItem>
        <SelectItem value="staff">Staff</SelectItem>
        <SelectItem value="administrator">Administrator</SelectItem>
      </SelectContent>
    </Select>
  );
} 