import { Card, CardContent } from "@/components/ui/card";
import { InsightCard } from "@/components/insights/InsightCard";
import type { Insight } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  referencedInsights?: Insight[];
}

export function ChatMessage({
  role,
  content,
  referencedInsights,
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex w-full",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] space-y-2",
          role === "user" ? "items-end" : "items-start"
        )}
      >
        <Card
          className={cn(
            role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          <CardContent className="pt-3 pb-3">
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          </CardContent>
        </Card>

        {referencedInsights && referencedInsights.length > 0 && (
          <div className="space-y-1.5 mt-2">
            <span className="text-xs text-muted-foreground">
              Referenced insights:
            </span>
            <div className="grid gap-1.5">
              {referencedInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} compact />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
