"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { StatusDropdown } from "@/components/opportunities/StatusDropdown";
import { InsightCard } from "@/components/insights/InsightCard";
import { Pagination } from "@/components/shared/Pagination";
import { toast } from "sonner";
import type { Opportunity, Insight, PaginatedResponse } from "@/lib/types";

interface OpportunityDetailData {
  opportunity: Opportunity;
  insights: PaginatedResponse<Insight>;
}

export default function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<OpportunityDetailData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/opportunities/${id}?page=${page}&per_page=10`
      );
      if (!res.ok) throw new Error("Failed to load opportunity");
      const json = await res.json();
      setData({
        opportunity: json.opportunity ?? json,
        insights: json.insights ?? {
          data: [],
          pagination: { page: 1, per_page: 10, total: 0, total_pages: 0 },
        },
      });
    } catch {
      setError("Could not load opportunity details.");
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = async (
    _id: string,
    status: string
  ) => {
    if (!data) return;
    const prev = data.opportunity;
    setData({
      ...data,
      opportunity: {
        ...data.opportunity,
        status: status as Opportunity["status"],
      },
    });
    try {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
    } catch {
      setData({ ...data, opportunity: prev });
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/explorer/opportunities">
            &larr; Back to Opportunities
          </Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive mb-4">
              {error || "Opportunity not found"}
            </p>
            <Button onClick={fetchData}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { opportunity, insights } = data;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/explorer/opportunities">
          &larr; Back to Opportunities
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">{opportunity.title}</CardTitle>
              {opportunity.description && (
                <CardDescription className="mt-1">
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
          <div className="flex items-center gap-4">
            <StatusDropdown
              value={opportunity.status}
              onValueChange={(status) =>
                handleStatusChange(opportunity.id, status)
              }
            />
            <span className="text-xs text-muted-foreground">
              Created:{" "}
              {new Date(opportunity.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Linked Insights</h2>
        {insights.data.length > 0 ? (
          <>
            <div className="grid gap-3">
              {insights.data.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
            {insights.pagination.total_pages > 1 && (
              <Pagination
                page={page}
                totalPages={insights.pagination.total_pages}
                onPageChange={setPage}
              />
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No insights linked to this opportunity.
          </p>
        )}
      </div>
    </div>
  );
}
