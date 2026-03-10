"use client";

import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendIndicator } from "@/components/themes/TrendIndicator";
import type { Theme } from "@/lib/types";

export function ThemeCard({ theme }: { theme: Theme }) {
  const scorePercent = theme.aggregated_score ?? 0;

  return (
    <Link href={`/explorer/themes/${theme.id}`}>
      <Card className="transition-shadow hover:ring-2 hover:ring-primary/20 cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2">{theme.name}</CardTitle>
            <TrendIndicator trend={theme.trend} />
          </div>
          {theme.description && (
            <CardDescription className="line-clamp-2">
              {theme.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Badge variant="secondary">
              {theme.insight_count} insight{theme.insight_count !== 1 ? "s" : ""}
            </Badge>
            <div className="flex items-center gap-2 flex-1 max-w-32">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, scorePercent)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {scorePercent.toFixed(0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
