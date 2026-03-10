import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

export function BriefingSummary({
  summary,
  generatedAt,
  cached,
}: {
  summary: string;
  generatedAt: string;
  cached: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Executive Summary</CardTitle>
          <span className="text-xs text-muted-foreground">
            {cached ? "Cached" : "Fresh"} &middot;{" "}
            {new Date(generatedAt).toLocaleString()}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground">{summary}</p>
      </CardContent>
    </Card>
  );
}
