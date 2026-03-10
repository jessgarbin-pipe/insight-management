"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InsightTable } from "@/components/insights/InsightTable";
import { InsightFilters } from "@/components/insights/InsightFilters";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiDownloadLine } from "@remixicon/react";
import { toast } from "sonner";
import { useRealtime } from "@/components/providers/RealtimeProvider";
import type {
  Insight,
  Theme,
  PaginatedResponse,
} from "@/lib/types";

export function InsightsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [insights, setInsights] = useState<Insight[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newInsightCount, setNewInsightCount] = useState(0);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(
    searchParams.get("status") || "open"
  );
  const [themeId, setThemeId] = useState(
    searchParams.get("theme_id") || "all"
  );
  const [source, setSource] = useState(
    searchParams.get("source") || "all"
  );
  const [dateFrom, setDateFrom] = useState(
    searchParams.get("date_from") || ""
  );
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");

  const { lastInsightEvent } = useRealtime();
  const prevEventRef = useRef(lastInsightEvent);

  // Listen for realtime insight events
  useEffect(() => {
    if (!lastInsightEvent || lastInsightEvent === prevEventRef.current) return;
    prevEventRef.current = lastInsightEvent;

    if (lastInsightEvent.eventType === "INSERT") {
      setNewInsightCount((c) => c + 1);
    } else if (lastInsightEvent.eventType === "UPDATE") {
      // In-place update when AI fields populate
      const updated = lastInsightEvent.record;
      const id = updated.id as string;
      setInsights((prev) =>
        prev.map((insight) =>
          insight.id === id
            ? {
                ...insight,
                sentiment: (updated.sentiment as Insight["sentiment"]) ?? insight.sentiment,
                type: (updated.type as Insight["type"]) ?? insight.type,
                priority_score:
                  (updated.priority_score as number | null) ?? insight.priority_score,
                urgency: (updated.urgency as Insight["urgency"]) ?? insight.urgency,
                status: (updated.status as Insight["status"]) ?? insight.status,
                title: (updated.title as string) ?? insight.title,
              }
            : insight
        )
      );
    }
  }, [lastInsightEvent]);

  const handleRefreshNew = () => {
    setNewInsightCount(0);
    fetchInsights();
  };

  const updateUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams();
      const values: Record<string, string> = {
        search,
        status,
        theme_id: themeId,
        source,
        date_from: dateFrom,
        date_to: dateTo,
        page: String(page),
        ...overrides,
      };
      for (const [k, v] of Object.entries(values)) {
        if (v && v !== "all" && v !== "1") {
          params.set(k, v);
        }
      }
      router.replace(`/explorer/insights?${params.toString()}`, {
        scroll: false,
      });
    },
    [search, status, themeId, source, dateFrom, dateTo, page, router]
  );

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", "25");
      params.set("sort", "priority_score");
      params.set("order", "desc");
      if (search) params.set("search", search);
      if (status && status !== "all") params.set("status", status);
      if (themeId && themeId !== "all") params.set("theme_id", themeId);
      if (source && source !== "all") params.set("source", source);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`/api/insights?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load insights");
      const data: PaginatedResponse<Insight> = await res.json();
      setInsights(data.data);
      setTotalPages(data.pagination.total_pages);

      const uniqueSources = [
        ...new Set(data.data.map((i) => i.source)),
      ].sort();
      if (uniqueSources.length > sources.length) {
        setSources(uniqueSources);
      }
    } catch {
      setError("Could not load insights.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, themeId, source, dateFrom, dateTo, sources.length]);

  useEffect(() => {
    fetch("/api/themes?per_page=100")
      .then((r) => r.json())
      .then((d: PaginatedResponse<Theme>) => setThemes(d.data))
      .catch(() => {});

    fetch("/api/insights?per_page=100&sort=source")
      .then((r) => r.json())
      .then((d: PaginatedResponse<Insight>) => {
        const unique = [...new Set(d.data.map((i) => i.source))].sort();
        setSources(unique);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchInsights();
    updateUrl({});
  }, [fetchInsights, updateUrl]);

  const handleBulkStatusChange = async (ids: string[], newStatus: string) => {
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/insights/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );
      toast.success(`Updated ${ids.length} insight(s)`);
      fetchInsights();
    } catch {
      toast.error("Failed to update some insights");
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status && status !== "all") params.set("status", status);
    if (themeId && themeId !== "all") params.set("theme_id", themeId);
    if (source && source !== "all") params.set("source", source);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    const url = `/api/insights/export?${params.toString()}`;
    window.location.href = url;
  };

  const handleReset = () => {
    setSearch("");
    setStatus("open");
    setThemeId("all");
    setSource("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  if (loading && insights.length === 0) {
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

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Insights</h1>
          <p className="text-sm text-muted-foreground">
            Browse, filter, and manage all insights
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={fetchInsights}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Browse, filter, and manage all insights
        </p>
      </div>

      {newInsightCount > 0 && (
        <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-800 dark:bg-blue-950">
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {newInsightCount} new insight{newInsightCount !== 1 ? "s" : ""} available
          </span>
          <Button variant="ghost" size="sm" onClick={handleRefreshNew}>
            Refresh
          </Button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <InsightFilters
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          status={status}
          onStatusChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          themeId={themeId}
          onThemeChange={(v) => {
            setThemeId(v);
            setPage(1);
          }}
          source={source}
          onSourceChange={(v) => {
            setSource(v);
            setPage(1);
          }}
          dateFrom={dateFrom}
          onDateFromChange={(v) => {
            setDateFrom(v);
            setPage(1);
          }}
          dateTo={dateTo}
          onDateToChange={(v) => {
            setDateTo(v);
            setPage(1);
          }}
          themes={themes}
          sources={sources}
          onReset={handleReset}
        />
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <RiDownloadLine className="h-4 w-4 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {insights.length === 0 ? (
        <EmptyState
          title="No insights found"
          description="Try adjusting your filters or add new insights."
          actionLabel="Add Insights"
          actionHref="/ingest"
        />
      ) : (
        <>
          <InsightTable
            insights={insights}
            onBulkStatusChange={handleBulkStatusChange}
          />
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
