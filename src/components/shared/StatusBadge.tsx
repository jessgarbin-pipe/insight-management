import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusVariants: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  related: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  closed: "bg-green-100 text-green-800 hover:bg-green-100",
  archived: "bg-muted text-muted-foreground hover:bg-muted",
  high: "bg-destructive/10 text-destructive hover:bg-destructive/10",
  medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  low: "bg-green-100 text-green-800 hover:bg-green-100",
  positive: "bg-green-100 text-green-800 hover:bg-green-100",
  negative: "bg-destructive/10 text-destructive hover:bg-destructive/10",
  neutral: "bg-muted text-muted-foreground hover:bg-muted",
};

export function StatusBadge({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(statusVariants[value] ?? "", className)}
    >
      {value.replace("_", " ")}
    </Badge>
  );
}
