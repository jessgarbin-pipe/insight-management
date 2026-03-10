"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { InsightsContent } from "./insights-content";

function InsightsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Browse, filter, and manage all insights
        </p>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<InsightsLoading />}>
      <InsightsContent />
    </Suspense>
  );
}
