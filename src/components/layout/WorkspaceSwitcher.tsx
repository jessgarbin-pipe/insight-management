"use client";

import { useOrganization } from "@/hooks/useOrganization";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WorkspaceSwitcher() {
  const { currentOrg, organizations, isLoading, switchOrg } =
    useOrganization();

  if (isLoading || organizations.length === 0) {
    return null;
  }

  // Don't show switcher if user has only one org
  if (organizations.length === 1 && currentOrg) {
    return (
      <span className="text-sm text-muted-foreground truncate max-w-[120px]">
        {currentOrg.name}
      </span>
    );
  }

  return (
    <Select value={currentOrg?.id || ""} onValueChange={switchOrg}>
      <SelectTrigger className="h-8 w-[160px] text-sm">
        <SelectValue placeholder="Select workspace" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
