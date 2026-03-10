"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { BriefingSummary } from "@/components/briefing/BriefingSummary";
import { BriefingItemCard } from "@/components/briefing/BriefingItem";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { OnboardingCard } from "@/components/dashboard/OnboardingCard";
import { InsightVolumeChart } from "@/components/dashboard/InsightVolumeChart";
import { ThemeDistributionChart } from "@/components/dashboard/ThemeDistributionChart";
import { StatusBreakdownChart } from "@/components/dashboard/StatusBreakdownChart";
import { useRealtime } from "@/components/providers/RealtimeProvider";
import type { BriefingResponse, BriefingItem } from "@/lib/types";

interface StatsData {
  daily_volume: { date: string; count: number }[];
  theme_distribution: { name: string; count: number }[];
  status_breakdown: { status: string; count: number }[];
}

export default function DashboardPage() {
  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInsights, setHasInsights] = useState(true);
  const { lastInsightEvent, isConnected } = useRealtime();
  const prevEventRef = useRef(lastInsightEvent);

  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/briefing", { method: "POST" });
      if (!res.ok) throw new Error("Failed to load briefing");
      const data: BriefingResponse = await res.json();
      setBriefing(data);

      const isEmpty = data.items.length === 0 && data.summary?.includes("no insights");
      setHasInsights(!isEmpty);
    } catch {
      setError("Could not load briefing. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) return;
      const data: StatsData = await res.json();
      setStats(data);
    } catch {
      // Stats are non-critical; fail silently
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
    fetchStats();
  }, [fetchBriefing, fetchStats]);

  // Auto-refresh when new insights arrive via realtime
  useEffect(() => {
    if (!lastInsightEvent || lastInsightEvent === prevEventRef.current) return;
    prevEventRef.current = lastInsightEvent;

    if (lastInsightEvent.eventType === "INSERT" && lastInsightEvent.title) {
      toast.info(`New insight received: ${lastInsightEvent.title}`);
    }

    // Debounce refetch to avoid rapid successive calls
    const timer = setTimeout(() => {
      fetchBriefing();
      fetchStats();
    }, 1000);
    return () => clearTimeout(timer);
  }, [lastInsightEvent, fetchBriefing, fetchStats]);

  const handleAccept = async (item: BriefingItem) => {
    try {
      const { type, params } = item.suggested_action;

      if (type === "change_status") {
        await fetch(`/api/insights/${params.insight_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: params.new_status }),
        });
      } else if (type === "investigate") {
        await fetch(`/api/insights/${params.insight_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "related" }),
        });
      } else if (type === "create_opportunity") {
        await fetch("/api/opportunities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: params.title || item.description,
            description: params.description || item.description,
            estimated_impact: params.estimated_impact || "medium",
            theme_id: params.theme_id || null,
          }),
        });
      } else if (type === "link_to_opportunity") {
        await fetch(`/api/insights/${params.insight_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "related" }),
        });
      } else if (type === "archive_theme") {
        const themeId = params.theme_id as string;
        if (themeId) {
          await fetch(`/api/themes/${themeId}/archive`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      await fetch("/api/manager-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: "accept",
          insight_id: (params.insight_id as string) || null,
          theme_id: (params.theme_id as string) || null,
          details: {
            briefing_item_id: item.id,
            suggested_action: item.suggested_action,
          },
        }),
      }).catch(() => {});

      toast.success("Action accepted");
    } catch {
      toast.error("Failed to execute action");
    }
  };

  const handleDismiss = async (item: BriefingItem) => {
    try {
      const { params } = item.suggested_action;

      await fetch("/api/manager-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: "dismiss",
          insight_id: (params.insight_id as string) || null,
          theme_id: (params.theme_id as string) || null,
          details: {
            briefing_item_id: item.id,
            suggested_action: item.suggested_action,
          },
        }),
      }).catch(() => {});

      toast.info("Item dismissed");
    } catch {
      toast.error("Failed to dismiss");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your AI-generated executive summary
          </p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your AI-generated executive summary
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={fetchBriefing}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasInsights || !briefing || (briefing.items.length === 0 && !briefing.summary)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your AI-generated executive summary
          </p>
        </div>
        <OnboardingCard />
      </div>
    );
  }

  const sortedItems = [...briefing.items].sort(
    (a, b) => a.priority - b.priority
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your AI-generated executive summary
          </p>
        </div>
        {isConnected && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </div>
        )}
      </div>

      <BriefingSummary
        summary={briefing.summary}
        generatedAt={briefing.generated_at}
        cached={briefing.cached}
      />

      {sortedItems.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Action Items</h2>
          {sortedItems.map((item) => (
            <BriefingItemCard
              key={item.id}
              item={item}
              onAccept={handleAccept}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No new items need your attention.
            </p>
          </CardContent>
        </Card>
      )}

      {stats && (
        <div className="space-y-6">
          <h2 className="text-sm font-semibold">Analytics</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <InsightVolumeChart data={stats.daily_volume} />
            <ThemeDistributionChart data={stats.theme_distribution} />
          </div>
          <StatusBreakdownChart data={stats.status_breakdown} />
        </div>
      )}
    </div>
  );
}
