"use client";

import { useEffect, useState, useCallback } from "react";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Opportunity, PaginatedResponse } from "@/lib/types";

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/opportunities?page=${page}&per_page=25`
      );
      if (!res.ok) throw new Error("Failed to load opportunities");
      const data: PaginatedResponse<Opportunity> = await res.json();
      setOpportunities(data.data);
      setTotalPages(data.pagination.total_pages);
    } catch {
      setError("Could not load opportunities.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleStatusChange = async (id: string, status: string) => {
    const prev = opportunities;
    setOpportunities((ops) =>
      ops.map((o) => (o.id === id ? { ...o, status: status as Opportunity["status"] } : o))
    );
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
    } catch {
      setOpportunities(prev);
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            AI-identified opportunities from insight clusters
          </p>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            AI-identified opportunities from insight clusters
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={fetchOpportunities}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            AI-identified opportunities from insight clusters
          </p>
        </div>
        <EmptyState
          title="No opportunities yet"
          description="Opportunities are identified when themes reach 3+ insights during aggregate analysis."
          actionLabel="View Themes"
          actionHref="/explorer/themes"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Opportunities</h1>
        <p className="text-sm text-muted-foreground">
          AI-identified opportunities from insight clusters
        </p>
      </div>
      <div className="space-y-4">
        {opportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
