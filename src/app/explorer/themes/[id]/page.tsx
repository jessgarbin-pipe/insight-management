"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TrendIndicator } from "@/components/themes/TrendIndicator";
import { InsightCard } from "@/components/insights/InsightCard";
import { Pagination } from "@/components/shared/Pagination";
import type { Theme, Insight, PaginatedResponse } from "@/lib/types";

interface ThemeDetailData {
  theme: Theme;
  insights: PaginatedResponse<Insight>;
}

export default function ThemeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ThemeDetailData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTheme = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/themes/${id}?page=${page}&per_page=10`);
      if (!res.ok) throw new Error("Failed to load theme");
      const json = await res.json();
      setData({
        theme: json.theme ?? json,
        insights: json.insights ?? { data: [], pagination: { page: 1, per_page: 10, total: 0, total_pages: 0 } },
      });
    } catch {
      setError("Could not load theme details.");
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
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
          <Link href="/explorer/themes">&larr; Back to Themes</Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive mb-4">
              {error || "Theme not found"}
            </p>
            <Button onClick={fetchTheme}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { theme, insights } = data;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/explorer/themes">&larr; Back to Themes</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">{theme.name}</CardTitle>
              {theme.description && (
                <CardDescription className="mt-1">
                  {theme.description}
                </CardDescription>
              )}
            </div>
            <TrendIndicator trend={theme.trend} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <StatusBadge
              value={`${theme.insight_count} insight${theme.insight_count !== 1 ? "s" : ""}`}
            />
            {theme.aggregated_score !== null && (
              <span className="text-xs text-muted-foreground">
                Avg. Score: {theme.aggregated_score.toFixed(1)}
              </span>
            )}
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
            No insights linked to this theme.
          </p>
        )}
      </div>
    </div>
  );
}
