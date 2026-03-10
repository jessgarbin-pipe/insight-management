"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatusDropdown } from "@/components/opportunities/StatusDropdown";
import type { Opportunity } from "@/lib/types";

export function OpportunityCard({
  opportunity,
  insightCount,
  onStatusChange,
}: {
  opportunity: Opportunity;
  insightCount?: number;
  onStatusChange?: (id: string, status: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Link href={`/explorer/opportunities/${opportunity.id}`}>
              <CardTitle className="hover:underline cursor-pointer line-clamp-1">
                {opportunity.title}
              </CardTitle>
            </Link>
            {opportunity.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {opportunity.description}
              </CardDescription>
            )}
          </div>
          {opportunity.estimated_impact && (
            <StatusBadge value={opportunity.estimated_impact} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {insightCount !== undefined && (
              <span className="text-xs text-muted-foreground">
                {insightCount} linked insight{insightCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {onStatusChange && (
            <StatusDropdown
              value={opportunity.status}
              onValueChange={(status) =>
                onStatusChange(opportunity.id, status)
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
