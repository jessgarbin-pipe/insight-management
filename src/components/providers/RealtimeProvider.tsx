"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeContextValue {
  lastUpdate: number;
  lastInsightEvent: RealtimeInsightEvent | null;
  lastThemeEvent: RealtimeTableEvent | null;
  lastOpportunityEvent: RealtimeTableEvent | null;
  isConnected: boolean;
}

interface RealtimeTableEvent {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  record: Record<string, unknown>;
  oldRecord: Record<string, unknown>;
  timestamp: number;
}

export interface RealtimeInsightEvent extends RealtimeTableEvent {
  title?: string;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  lastUpdate: 0,
  lastInsightEvent: null,
  lastThemeEvent: null,
  lastOpportunityEvent: null,
  isConnected: false,
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [lastUpdate, setLastUpdate] = useState(0);
  const [lastInsightEvent, setLastInsightEvent] =
    useState<RealtimeInsightEvent | null>(null);
  const [lastThemeEvent, setLastThemeEvent] =
    useState<RealtimeTableEvent | null>(null);
  const [lastOpportunityEvent, setLastOpportunityEvent] =
    useState<RealtimeTableEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelsRef = useRef<RealtimeChannel[]>([]);

  const handleEvent = useCallback(
    (
      table: string,
      eventType: "INSERT" | "UPDATE" | "DELETE",
      newRecord: Record<string, unknown>,
      oldRecord: Record<string, unknown>
    ) => {
      const now = Date.now();
      setLastUpdate(now);

      const event: RealtimeTableEvent = {
        eventType,
        record: newRecord,
        oldRecord,
        timestamp: now,
      };

      if (table === "insights") {
        setLastInsightEvent({
          ...event,
          title: newRecord.title as string | undefined,
        });
      } else if (table === "themes") {
        setLastThemeEvent(event);
      } else if (table === "opportunities") {
        setLastOpportunityEvent(event);
      }
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();

    const tables = ["insights", "themes", "opportunities"] as const;

    const channels = tables.map((table) =>
      supabase
        .channel(`realtime-${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) => {
            handleEvent(
              table,
              payload.eventType as "INSERT" | "UPDATE" | "DELETE",
              (payload.new as Record<string, unknown>) ?? {},
              (payload.old as Record<string, unknown>) ?? {}
            );
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setIsConnected(true);
          }
        })
    );

    channelsRef.current = channels;

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
      setIsConnected(false);
    };
  }, [handleEvent]);

  return (
    <RealtimeContext.Provider
      value={{
        lastUpdate,
        lastInsightEvent,
        lastThemeEvent,
        lastOpportunityEvent,
        isConnected,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
