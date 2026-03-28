"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { P } from "@/styles/tokens";

interface NeedsAttentionProps {
  /** Top cases from /api/myday response */
  cases: Array<{
    id: string;
    subject: string;
    status: string;
    priority: string;
    accountName: string;
    clientId?: string | null;
    createdDate: string;
  }>;
  /** Whether to show the "See all alerts" link */
  onSeeAll?: () => void;
}

/**
 * Needs Attention — unified section merging:
 * 1. Active risks / cases (from /api/myday)
 * 2. Profile reminders (from /api/reminders/pending)
 *
 * Ranked by: cases → reminders
 * Shows top 3 by default, "Show more" for 4-5.
 */
export function NeedsAttention({ cases, onSeeAll }: NeedsAttentionProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  // Reminders query — returns flat PendingReminder[] from local DB
  const { data: remindersRaw } = useQuery<any[]>({
    queryKey: ["/api/reminders/pending"],
    queryFn: async () => {
      const res = await fetch("/api/reminders/pending", { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      // API returns flat array or { expired, expiringSoon } — normalize to flat array
      return Array.isArray(data) ? data : [...(data.expired || []), ...(data.expiringSoon || [])];
    },
    staleTime: 300_000,
  });

  // Merge and rank all items
  const items = useMemo(() => {
    const merged: Array<{
      id: string;
      type: "case" | "reminder";
      clientId?: string;
      title: string;
      subtitle: string;
      severity: "critical" | "high" | "medium" | "low";
      actions: Array<{ label: string; onClick: () => void }>;
    }> = [];

    // 1. Cases (highest priority)
    (cases || []).forEach((c) => {
      // Case age — compact relative time
      let ageStr = "";
      if (c.createdDate) {
        const days = Math.floor((Date.now() - new Date(c.createdDate).getTime()) / 86_400_000);
        if (days >= 0 && days < 1) ageStr = " · today";
        else if (days === 1) ageStr = " · 1d ago";
        else if (days < 14) ageStr = ` · ${days}d ago`;
        else if (days < 60) ageStr = ` · ${Math.floor(days / 7)}w ago`;
        else ageStr = ` · ${Math.floor(days / 30)}mo ago`;
      }
      merged.push({
        id: `case-${c.id}`,
        type: "case",
        clientId: c.clientId || undefined,
        title: c.subject,
        subtitle: (c.accountName || c.status) + ageStr,
        severity: c.priority?.toLowerCase() === "high" ? "high" : "medium",
        actions: [],
      });
    });

    // 2. Reminders — individual items (max 1 expired + 1 expiring soon)
    const allReminders = remindersRaw || [];
    const topExpired = allReminders.filter((r: any) => r.status === "expired" || (r.daysUntilExpiration != null && r.daysUntilExpiration <= 0)).slice(0, 1);
    const topExpiring = allReminders.filter((r: any) => r.status !== "expired" && r.daysUntilExpiration != null && r.daysUntilExpiration > 0).slice(0, 1);
    for (const r of topExpired) {
      merged.push({
        id: `reminder-exp-${r.profileId || r.clientId}`,
        type: "reminder",
        clientId: r.clientId || undefined,
        title: r.clientName || "Client",
        subtitle: `${r.profileType || "Profile"} review — expired`,
        severity: "high",
        actions: [],
      });
    }
    for (const r of topExpiring) {
      merged.push({
        id: `reminder-soon-${r.profileId || r.clientId}`,
        type: "reminder",
        clientId: r.clientId || undefined,
        title: r.clientName || "Client",
        subtitle: `${r.profileType || "Profile"} review — expires in ${r.daysUntilExpiration} days`,
        severity: "medium",
        actions: [],
      });
    }

    // Sort: critical → high → medium → low
    const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    merged.sort((a, b) => (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2));

    return merged;
  }, [cases, remindersRaw]);

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
    case: "\u26A0",
    reminder: "\u25CB",
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
            padding: "12px 10px",
            margin: "0 -10px",
            borderBottom: `1px solid ${P.odBorder}`,
            borderRadius: 6,
            transition: "background .15s ease",
            cursor: item.clientId ? "pointer" : "default",
          }}
          onClick={item.clientId ? () => {
            router.push(`/clients/${item.clientId}?from=myday&signal=${item.type === "case" ? "case" : "profile-reminder"}&signalId=${item.id}`);
          } : undefined}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(79,179,205,0.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <span
            style={{
              fontSize: 16,
              color: sevColor[item.severity] || P.odT3,
              marginTop: 1,
              flexShrink: 0,
            }}
          >
            {typeIcon[item.type] || "\u25CF"}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: P.odT1 }}>
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
                    borderRadius: 6,
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
