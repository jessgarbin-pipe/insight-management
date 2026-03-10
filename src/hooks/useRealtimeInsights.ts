"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type EventType = "INSERT" | "UPDATE" | "DELETE";

interface RealtimeEvent {
  eventType: EventType;
  table: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

type RealtimeCallback = (event: RealtimeEvent) => void;

export function useRealtimeInsights(onEvent: RealtimeCallback) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("insights-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "insights" },
        (payload) => {
          callbackRef.current({
            eventType: payload.eventType as EventType,
            table: "insights",
            new: (payload.new as Record<string, unknown>) ?? {},
            old: (payload.old as Record<string, unknown>) ?? {},
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refresh = useCallback(() => {
    // Caller can use this to trigger their own refetch logic
  }, []);

  return { refresh };
}
