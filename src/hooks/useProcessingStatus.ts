"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ProcessingState {
  isProcessing: boolean;
  sentiment: string | null;
  type: string | null;
  priority_score: number | null;
}

export function useProcessingStatus(insightId: string | null) {
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    sentiment: null,
    type: null,
    priority_score: null,
  });
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!insightId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`processing-${insightId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "insights",
          filter: `id=eq.${insightId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const sentiment = row.sentiment as string | null;
          const type = row.type as string | null;
          const priority_score = row.priority_score as number | null;

          const wasProcessing =
            !sentiment && !type && priority_score === null;
          const nowProcessed =
            sentiment !== null || type !== null || priority_score !== null;

          setState({
            isProcessing: wasProcessing && !nowProcessed,
            sentiment,
            type,
            priority_score,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [insightId]);

  const startProcessing = () => {
    setState((prev) => ({ ...prev, isProcessing: true }));
  };

  return { ...state, startProcessing };
}
