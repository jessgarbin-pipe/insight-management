"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ThemeCard } from "@/components/themes/ThemeCard";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRealtime } from "@/components/providers/RealtimeProvider";
import type { Theme, PaginatedResponse } from "@/lib/types";

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { lastThemeEvent } = useRealtime();
  const prevEventRef = useRef(lastThemeEvent);

  const fetchThemes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/themes?page=${page}&per_page=12`);
      if (!res.ok) throw new Error("Failed to load themes");
      const data: PaginatedResponse<Theme> = await res.json();
      setThemes(data.data);
      setTotalPages(data.pagination.total_pages);
    } catch {
      setError("Could not load themes.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  // Refetch when theme data changes via realtime
  useEffect(() => {
    if (!lastThemeEvent || lastThemeEvent === prevEventRef.current) return;
    prevEventRef.current = lastThemeEvent;

    if (lastThemeEvent.eventType === "UPDATE") {
      // In-place update for insight_count changes
      const updated = lastThemeEvent.record;
      const id = updated.id as string;
      setThemes((prev) =>
        prev.map((theme) =>
          theme.id === id
            ? {
                ...theme,
                insight_count:
                  (updated.insight_count as number) ?? theme.insight_count,
                aggregated_score:
                  (updated.aggregated_score as number | null) ?? theme.aggregated_score,
                trend: (updated.trend as Theme["trend"]) ?? theme.trend,
              }
            : theme
        )
      );
    } else {
      // INSERT or DELETE - full refetch
      fetchThemes();
    }
  }, [lastThemeEvent, fetchThemes]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Themes</h1>
          <p className="text-sm text-muted-foreground">
            AI-identified themes across your insights
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Themes</h1>
          <p className="text-sm text-muted-foreground">
            AI-identified themes across your insights
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={fetchThemes}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (themes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Themes</h1>
          <p className="text-sm text-muted-foreground">
            AI-identified themes across your insights
          </p>
        </div>
        <EmptyState
          title="No themes yet"
          description="Themes are created automatically when insights are processed by AI."
          actionLabel="Add Insights"
          actionHref="/ingest"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Themes</h1>
        <p className="text-sm text-muted-foreground">
          AI-identified themes across your insights
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} />
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
