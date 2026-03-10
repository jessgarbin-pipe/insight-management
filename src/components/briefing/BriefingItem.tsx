"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BriefingItem as BriefingItemType } from "@/lib/types";

export function BriefingItemCard({
  item,
  onAccept,
  onDismiss,
}: {
  item: BriefingItemType;
  onAccept: (item: BriefingItemType) => Promise<void>;
  onDismiss: (item: BriefingItemType) => Promise<void>;
}) {
  const [loading, setLoading] = useState<"accept" | "dismiss" | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleAccept = async () => {
    setLoading("accept");
    try {
      await onAccept(item);
      setDismissed(true);
    } finally {
      setLoading(null);
    }
  };

  const handleDismiss = async () => {
    setLoading("dismiss");
    try {
      await onDismiss(item);
      setDismissed(true);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm">{item.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{item.suggested_action.label}</Badge>
              <span className="text-xs text-muted-foreground">
                Priority: {item.priority}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleAccept}
              disabled={loading !== null}
            >
              {loading === "accept" ? "..." : "Accept"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              disabled={loading !== null}
            >
              {loading === "dismiss" ? "..." : "Dismiss"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
