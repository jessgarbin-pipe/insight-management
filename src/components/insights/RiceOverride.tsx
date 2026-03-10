"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Insight } from "@/lib/types";

interface RiceOverrideProps {
  insight: Insight;
  onApplied: (updated: Insight) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeRiceScore(
  reach: number,
  impact: number,
  confidence: number,
  effort: number
): number {
  // Raw RICE: (Reach * Impact * Confidence) / Effort
  // Max raw: (10 * 3 * 3) / 1 = 90
  // Min raw: (1 * 1 * 1) / 10 = 0.1
  // Normalize to 0-100
  const raw = (reach * impact * confidence) / effort;
  const maxRaw = (10 * 3 * 3) / 1; // 90
  return Math.round(Math.min(100, (raw / maxRaw) * 100));
}

export function RiceOverride({ insight, onApplied }: RiceOverrideProps) {
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);

  const metadata = insight.metadata as Record<string, unknown>;
  const existingRice = metadata?.rice as
    | { reach: number; impact: number; confidence: number; effort: number }
    | undefined;

  const [reach, setReach] = useState(existingRice?.reach ?? 5);
  const [impact, setImpact] = useState(existingRice?.impact ?? 2);
  const [confidence, setConfidence] = useState(existingRice?.confidence ?? 2);
  const [effort, setEffort] = useState(existingRice?.effort ?? 5);

  const previewScore = useMemo(
    () => normalizeRiceScore(reach, impact, confidence, effort),
    [reach, impact, confidence, effort]
  );

  const handleApply = async () => {
    setApplying(true);
    try {
      const newMetadata = {
        ...metadata,
        rice: { reach, impact, confidence, effort },
        manually_scored: true,
      };

      const res = await fetch(`/api/insights/${insight.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority_score: previewScore,
          metadata: newMetadata,
        }),
      });

      if (!res.ok) throw new Error("Failed to apply RICE override");

      const updated = await res.json();

      toast.success(`Priority score updated to ${previewScore}`);
      onApplied(updated);
    } catch {
      toast.error("Failed to apply RICE override");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Override Priority with RICE
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {expanded ? "Collapse" : "Expand"}
          </span>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Reach (1-10)
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={reach}
                onChange={(e) =>
                  setReach(clamp(parseInt(e.target.value) || 1, 1, 10))
                }
              />
              <p className="text-[10px] text-muted-foreground">
                Users affected
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Impact (1-3)
              </label>
              <Input
                type="number"
                min={1}
                max={3}
                value={impact}
                onChange={(e) =>
                  setImpact(clamp(parseInt(e.target.value) || 1, 1, 3))
                }
              />
              <p className="text-[10px] text-muted-foreground">
                How much it affects them
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Confidence (1-3)
              </label>
              <Input
                type="number"
                min={1}
                max={3}
                value={confidence}
                onChange={(e) =>
                  setConfidence(clamp(parseInt(e.target.value) || 1, 1, 3))
                }
              />
              <p className="text-[10px] text-muted-foreground">
                Estimate certainty
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Effort (1-10)
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={effort}
                onChange={(e) =>
                  setEffort(clamp(parseInt(e.target.value) || 1, 1, 10))
                }
              />
              <p className="text-[10px] text-muted-foreground">
                Work required
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-xs text-muted-foreground">
                Calculated Score: ({reach} x {impact} x {confidence}) / {effort}
              </p>
              <p className="text-lg font-semibold">{previewScore}</p>
            </div>
            {insight.priority_score !== null && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Current Score</p>
                <p className="text-lg font-semibold text-muted-foreground">
                  {insight.priority_score.toFixed(0)}
                </p>
              </div>
            )}
          </div>

          {metadata?.manually_scored === true && (
            <Badge variant="outline">Currently manually scored</Badge>
          )}

          <Button onClick={handleApply} disabled={applying} className="w-full">
            {applying ? "Applying..." : "Apply RICE Score"}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
