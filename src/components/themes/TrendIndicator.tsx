import { cn } from "@/lib/utils";

const trendConfig = {
  growing: { label: "Growing", color: "text-green-600", arrow: "\u2191" },
  stable: { label: "Stable", color: "text-muted-foreground", arrow: "\u2192" },
  declining: { label: "Declining", color: "text-destructive", arrow: "\u2193" },
};

export function TrendIndicator({
  trend,
  className,
}: {
  trend: "growing" | "stable" | "declining" | null;
  className?: string;
}) {
  if (!trend) return null;

  const config = trendConfig[trend];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        config.color,
        className
      )}
    >
      <span className="text-sm">{config.arrow}</span>
      {config.label}
    </span>
  );
}
