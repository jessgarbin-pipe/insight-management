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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { RiceOverride } from "@/components/insights/RiceOverride";
import type { Insight } from "@/lib/types";

export default function InsightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);

  const fetchInsight = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/insights/${id}`);
      if (!res.ok) throw new Error("Failed to load insight");
      const data = await res.json();
      setInsight(data);
    } catch {
      setError("Could not load insight details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  const handleStatusChange = async (newStatus: string) => {
    if (!insight) return;
    const prev = insight;
    setInsight({ ...insight, status: newStatus as Insight["status"] });
    try {
      const res = await fetch(`/api/insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
    } catch {
      setInsight(prev);
      toast.error("Failed to update status");
    }
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      const res = await fetch(`/api/insights/${id}/reprocess`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success("Reprocessing started");
      setTimeout(fetchInsight, 3000);
    } catch {
      toast.error("Failed to start reprocessing");
    } finally {
      setReprocessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !insight) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/explorer/insights">&larr; Back to Insights</Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-destructive mb-4">
              {error || "Insight not found"}
            </p>
            <Button onClick={fetchInsight}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metadata = insight.metadata as Record<string, unknown>;
  const isManuallyScored = metadata?.manually_scored === true;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/explorer/insights">&larr; Back to Insights</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle className="text-lg">{insight.title}</CardTitle>
              <CardDescription className="mt-1">
                Source: {insight.source} &middot; Created:{" "}
                {new Date(insight.created_at).toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isManuallyScored && (
                <Badge variant="outline">Manually Scored</Badge>
              )}
              <StatusBadge value={insight.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {insight.description}
          </p>

          <Separator />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <span className="text-xs text-muted-foreground block mb-1">
                Status
              </span>
              <Select
                value={insight.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="related">Related</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">
                Priority
              </span>
              <p className="text-sm font-medium">
                {insight.priority_score !== null
                  ? insight.priority_score.toFixed(1)
                  : "Not scored"}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">
                Sentiment
              </span>
              {insight.sentiment ? (
                <StatusBadge value={insight.sentiment} />
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">
                Type
              </span>
              {insight.type ? (
                <StatusBadge value={insight.type} />
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>

          {insight.urgency && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1">
                Urgency
              </span>
              <StatusBadge value={insight.urgency} />
            </div>
          )}

          {Object.keys(metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-xs font-medium block mb-2">
                  Metadata
                </span>
                <div className="grid gap-1">
                  {Object.entries(metadata)
                    .filter(
                      ([k]) =>
                        k !== "manually_scored" && k !== "rice"
                    )
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="text-muted-foreground font-medium">
                          {key}:
                        </span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReprocess}
              disabled={reprocessing}
            >
              {reprocessing ? "Reprocessing..." : "Reprocess with AI"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <RiceOverride insight={insight} onApplied={(updated) => setInsight(updated)} />
    </div>
  );
}
