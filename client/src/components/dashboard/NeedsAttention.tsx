"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { P } from "@/styles/tokens";

interface NeedsAttentionProps {
  /** Top cases from /api/myday response */
  cases: Array<{
    id: string;
    subject: string;
    status: string;
    priority: string;
    accountName: string;
    createdDate: string;
  }>;
  /** Whether to show the "See all alerts" link */
  onSeeAll?: () => void;
}

interface InsightItem {
  id: string;
  title: string;
  description: string;
  severity: string;
  insightType: string;
  isRead: boolean;
  isDismissed: boolean;
}

/**
 * Needs Attention — unified section merging:
 * 1. Active risks / cases (from /api/myday)
 * 2. Material AI insights (from /api/insights/dashboard)
 * 3. Profile reminders (from /api/reminders/pending)
 *
 * Ranked by: cases → high-severity insights → reminders → lower insights
 * Shows top 3 by default, "Show more" for 4-5.
 */
export function NeedsAttention({ cases, onSeeAll }: NeedsAttentionProps) {
  const [expanded, setExpanded] = useState(false);

  // Insights query (already one of our 4 approved endpoints)
  const { data: insightsData } = useQuery<{ recent: InsightItem[]; high: number }>({
    queryKey: ["/api/insights/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/insights/dashboard", { credentials: "include" });
      if (!res.ok) return { recent: [], high: 0 };
      return res.json();
    },
    staleTime: 60_000,
  });

  // Reminders query (lightweight, local DB only)
  const { data: remindersData } = useQuery<{ expired: any[]; expiringSoon: any[] }>({
    queryKey: ["/api/reminders/pending"],
    queryFn: async () => {
      const res = await fetch("/api/reminders/pending", { credentials: "include" });
      if (!res.ok) return { expired: [], expiringSoon: [] };
      return res.json();
    },
    staleTime: 300_000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/insights/${id}/read`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/insights/dashboard"] }),
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/insights/${id}/dismiss`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/insights/dashboard"] }),
  });

  // Merge and rank all items
  const items = useMemo(() => {
    const merged: Array<{
      id: string;
      type: "case" | "insight" | "reminder";
      title: string;
      subtitle: string;
      severity: "critical" | "high" | "medium" | "low";
      actions: Array<{ label: string; onClick: () => void }>;
    }> = [];

    // 1. Cases (highest priority)
    (cases || []).forEach((c) => {
      merged.push({
        id: `case-${c.id}`,
        type: "case",
        title: c.subject,
        subtitle: c.accountName || c.status,
        severity: c.priority?.toLowerCase() === "high" ? "high" : "medium",
        actions: [],
      });
    });

    // 2. High-severity insights
    const insights = (insightsData?.recent || []).filter(
      (i) => !i.isDismissed && (i.severity === "high" || i.severity === "critical")
    );
    insights.slice(0, 3).forEach((i) => {
      merged.push({
        id: `insight-${i.id}`,
        type: "insight",
        title: i.title,
        subtitle: i.description?.slice(0, 80) || "",
        severity: i.severity as any,
        actions: [
          ...(!i.isRead ? [{ label: "Read", onClick: () => markReadMutation.mutate(i.id) }] : []),
          { label: "Dismiss", onClick: () => dismissMutation.mutate(i.id) },
        ],
      });
    });

    // 3. Reminders (profile expirations)
    const expiredCount = remindersData?.expired?.length || 0;
    const soonCount = remindersData?.expiringSoon?.length || 0;
    if (expiredCount + soonCount > 0) {
      merged.push({
        id: "reminders",
        type: "reminder",
        title: `${expiredCount + soonCount} profiles need review`,
        subtitle: expiredCount > 0
          ? `${expiredCount} expired · ${soonCount} expiring soon`
          : `${soonCount} expiring within 30 days`,
        severity: expiredCount > 0 ? "high" : "medium",
        actions: [],
      });
    }

    // Sort: critical → high → medium → low
    const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    merged.sort((a, b) => (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2));

    return merged;
  }, [cases, insightsData, remindersData, markReadMutation, dismissMutation]);

  const visible = expanded ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  if (items.length === 0) {
    return (
      <div style={{ padding: "16px 0", color: P.odT3, fontSize: 13, fontStyle: "italic" }}>
        No items need attention right now.
      </div>
    );
  }

  const sevColor: Record<string, string> = {
    critical: "#E53E3E",
    high: P.odOrange,
    medium: P.odYellow,
    low: P.odT3,
  };

  const typeIcon: Record<string, string> = {
    case: "⚠",
    insight: "◉",
    reminder: "○",
  };

  return (
    <div>
      {visible.map((item) => (
        <div
          key={item.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "10px 0",
            borderBottom: `1px solid ${P.odBorder}`,
          }}
        >
          <span
            style={{
              fontSize: 14,
              color: sevColor[item.severity] || P.odT3,
              marginTop: 2,
              flexShrink: 0,
            }}
          >
            {typeIcon[item.type] || "●"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: P.odT1 }}>
              {item.title}
            </div>
            <div style={{ fontSize: 11, color: P.odT3, marginTop: 2 }}>
              {item.subtitle}
            </div>
          </div>
          {item.actions.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {item.actions.map((a) => (
                <button
                  key={a.label}
                  onClick={a.onClick}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: `1px solid ${P.odBorder}`,
                    background: "transparent",
                    color: P.odT2,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0" }}>
        {hasMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            style={{
              fontSize: 11,
              color: P.odLBlue,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Show {items.length - 3} more
          </button>
        )}
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            style={{
              fontSize: 11,
              color: P.odLBlue,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginLeft: "auto",
            }}
          >
            See all alerts →
          </button>
        )}
      </div>
    </div>
  );
}
