"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useRecentClients, RecentClient } from "@/hooks/use-recent-clients";
import { P } from "@/styles/tokens";

/* ── Config ── */
const MAX_VISIBLE = 3;

/* ── Time-ago formatter ── */
function timeAgo(viewedAt?: number): string {
  if (!viewedAt) return "";
  const diffMs = Date.now() - viewedAt;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

/* ── Component ── */
export function ContinueWorking() {
  const router = useRouter();
  const { recents, addRecent } = useRecentClients();

  // Tap into the meetings cache (TodaySchedule already populates this key with staleTime: Infinity)
  const { data: meetingsData } = useQuery<any>({
    queryKey: ["/api/meetings"],
    staleTime: Infinity,      // never refetch — ride TodaySchedule's cache
    enabled: recents.length > 0,
  });

  // Build a set of client IDs that have a meeting today
  const meetingClientIds = useMemo(() => {
    const ids = new Set<string>();
    if (!meetingsData) return ids;
    const meetings: any[] = Array.isArray(meetingsData) ? meetingsData : meetingsData?.meetings || [];
    const today = new Date().toISOString().slice(0, 10);
    for (const m of meetings) {
      const mDate = (m.startTime || "").slice(0, 10);
      if (mDate === today && m.clientId) {
        ids.add(m.clientId);
      }
    }
    return ids;
  }, [meetingsData]);

  const visible = recents.slice(0, MAX_VISIBLE);

  // Don't render section if no recents
  if (visible.length === 0) return null;

  return (
    <div>
      {visible.map((client: RecentClient, i: number) => {
        const hasMeeting = meetingClientIds.has(client.id);
        const ago = timeAgo(client.viewedAt);

        return (
          <button
            key={client.id}
            onClick={() => {
              // Refresh viewedAt timestamp immediately on re-click
              addRecent({ id: client.id, name: client.name, segment: client.segment });
              router.push(`/clients/${client.id}`);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "10px 12px",
              marginBottom: i < visible.length - 1 ? 2 : 0,
              background: "transparent",
              border: `1px solid transparent`,
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              transition: "all .12s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(79,179,205,0.04)";
              e.currentTarget.style.borderColor = P.odBorder;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "transparent";
            }}
          >
            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: P.odT1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {client.name}
              </div>
            </div>

            {/* Meeting today indicator */}
            {hasMeeting && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                padding: "2px 7px", borderRadius: 4,
                background: P.odLBlue + "18", color: P.odLBlue,
                flexShrink: 0,
              }}>
                Meeting today
              </span>
            )}

            {/* Segment/tier pill */}
            {client.segment && (
              <span style={{
                fontSize: 9, fontWeight: 600,
                padding: "2px 7px", borderRadius: 4,
                border: `1px solid ${P.odBorder}`,
                color: P.odT3, flexShrink: 0,
                textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                Tier {client.segment}
              </span>
            )}

            {/* Time ago */}
            {ago && (
              <span style={{
                fontSize: 10, color: P.odT3, flexShrink: 0,
                fontFamily: "'DM Mono', monospace", fontWeight: 500,
              }}>
                {ago}
              </span>
            )}

            {/* Arrow */}
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={P.odT3}
              strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <path d="M6 4l4 4-4 4" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
