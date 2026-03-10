import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { Insight } from "@/lib/types";

export function InsightCard({
  insight,
  compact,
}: {
  insight: Insight;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link href={`/explorer/insights/${insight.id}`}>
        <Card size="sm" className="transition-shadow hover:ring-2 hover:ring-primary/20 cursor-pointer">
          <CardContent className="pt-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium line-clamp-1">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {insight.source}
                </p>
              </div>
              {insight.sentiment && (
                <StatusBadge value={insight.sentiment} />
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/explorer/insights/${insight.id}`}>
      <Card className="transition-shadow hover:ring-2 hover:ring-primary/20 cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1">{insight.title}</CardTitle>
            <StatusBadge value={insight.status} />
          </div>
          <CardDescription className="line-clamp-2">
            {insight.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {insight.source}
            </span>
            {insight.sentiment && <StatusBadge value={insight.sentiment} />}
            {insight.type && (
              <StatusBadge value={insight.type} />
            )}
            {insight.priority_score !== null && (
              <span className="text-xs text-muted-foreground">
                Score: {insight.priority_score.toFixed(0)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
