import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

type SSEEventType =
  | "cassidy:job_completed"
  | "signals:proactive_scan_complete"
  | "signals:household_updated"
  | "workflow:meeting_processed"
  | "behavioral:alert"
  | "alert:new"
  | "approval:new"
  | "approval:status_changed"
  | "reminder:created"
  | "workflow:step_completed"
  | "workflow:gate_created"
  | "workflow:status_changed"
  | "heartbeat"
  | "connected";

function invalidateByPrefix(prefix: string) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && typeof key[0] === "string" && key[0].startsWith(prefix);
    },
  });
}

const EVENT_HANDLERS: Record<string, () => void> = {
  "cassidy:job_completed": () => {
    invalidateByPrefix("/api/cassidy");
    invalidateByPrefix("/api/reports");
  },
  "signals:proactive_scan_complete": () => {
    invalidateByPrefix("/api/cassidy/signals");
  },
  "signals:household_updated": () => {
    queryClient.invalidateQueries({ queryKey: ["/api/myday"] });
  },
  "alert:new": () => {
    invalidateByPrefix("/api/alerts");
  },
  "approval:new": () => {
    queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
    queryClient.invalidateQueries({ queryKey: ["/api/approvals/stats"] });
  },
  "approval:status_changed": () => {
    queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
    queryClient.invalidateQueries({ queryKey: ["/api/approvals/stats"] });
  },
  "reminder:created": () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reminders/pending"] });
  },
  "workflow:step_completed": () => {
    invalidateByPrefix("/api/workflow-automations");
  },
  "workflow:gate_created": () => {
    invalidateByPrefix("/api/workflow-automations");
    queryClient.invalidateQueries({ queryKey: ["/api/myday"] });
  },
  "workflow:status_changed": () => {
    invalidateByPrefix("/api/workflow-automations");
  },
  "workflow:meeting_processed": () => {
    invalidateByPrefix("/api/meetings");
    queryClient.invalidateQueries({ queryKey: ["/api/myday"] });
  },
  "behavioral:alert": () => {
    invalidateByPrefix("/api/clients");
    queryClient.invalidateQueries({ queryKey: ["/api/myday"] });
  },
};

/**
 * SSE event hook — production-hardened for Vercel serverless.
 *
 * Key behaviors:
 * 1. Exponential backoff reconnection (1s → 30s max)
 * 2. Visibility-aware: disconnects when tab is hidden, reconnects when visible
 * 3. Heartbeat monitoring: if no heartbeat received in 45s, force reconnect
 *    (server sends heartbeat every 30s — if we miss one, connection is dead)
 * 4. On reconnect after visibility change, invalidates all SSE-driven queries
 *    to catch any events missed while disconnected
 */
export function useSSEEvents() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const wasHidden = useRef(false);

  const disconnect = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const resetHeartbeatTimer = useCallback(() => {
    if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
    // If no heartbeat/event in 45s, consider connection dead and reconnect
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        // Reconnect immediately — this is a silent connection death
        reconnectAttempts.current = 0;
        connect();
      }
    }, 45_000);
  }, []);

  const connect = useCallback(() => {
    disconnect();

    const es = new EventSource("/api/events/stream", { withCredentials: true });
    eventSourceRef.current = es;

    const eventTypes: SSEEventType[] = [
      "cassidy:job_completed",
      "signals:proactive_scan_complete",
      "alert:new",
      "approval:new",
      "approval:status_changed",
      "reminder:created",
      "workflow:step_completed",
      "workflow:gate_created",
      "workflow:status_changed",
    ];

    for (const eventType of eventTypes) {
      es.addEventListener(eventType, () => {
        resetHeartbeatTimer();
        const handler = EVENT_HANDLERS[eventType];
        if (handler) handler();
      });
    }

    es.addEventListener("connected", () => {
      reconnectAttempts.current = 0;
      resetHeartbeatTimer();
    });

    // Listen for heartbeat to keep the connection alive timer going
    es.addEventListener("heartbeat", () => {
      resetHeartbeatTimer();
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }

      // Don't reconnect if tab is hidden — we'll reconnect on visibility change
      if (document.visibilityState === "hidden") return;

      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30_000);
      reconnectAttempts.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };
  }, [disconnect, resetHeartbeatTimer]);

  useEffect(() => {
    connect();

    // ── Visibility-aware SSE management ──
    // Disconnect when tab is hidden to free server resources.
    // Reconnect when tab becomes visible — invalidate SSE-driven queries
    // to catch any events missed while disconnected.
    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        wasHidden.current = true;
        disconnect();
      } else if (document.visibilityState === "visible") {
        reconnectAttempts.current = 0;
        connect();

        // If we were hidden, we may have missed SSE events.
        // Invalidate all event-driven queries so they refetch.
        if (wasHidden.current) {
          wasHidden.current = false;
          invalidateByPrefix("/api/alerts");
          invalidateByPrefix("/api/approvals");
          invalidateByPrefix("/api/tasks");
          invalidateByPrefix("/api/reminders");
          invalidateByPrefix("/api/cassidy");
          invalidateByPrefix("/api/workflow-automations");
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      disconnect();
    };
  }, [connect, disconnect]);
}
