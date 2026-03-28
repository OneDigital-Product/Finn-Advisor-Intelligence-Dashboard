"use client";

import { useRouter } from "next/navigation";
import { useRecentClients, RecentClient } from "@/hooks/use-recent-clients";
import { queryClient } from "@/lib/queryClient";
import { P } from "@/styles/tokens";

/* ── Compact currency formatter ── */
function fmtAum(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

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

  const visible = recents.slice(0, MAX_VISIBLE);

  // Don't render section if no recents
  if (visible.length === 0) return null;

  return (
    <div>
      {visible.map((client: RecentClient, i: number) => {
        const ago = timeAgo(client.viewedAt);
        // Opportunistic AUM from existing summary cache — no fetch triggered
        const cachedSummary = queryClient.getQueryData<any>(["/api/clients", client.id, "summary"]);
        const aum = cachedSummary?.aum || cachedSummary?.client?.totalAum;

        return (
          <button
            key={client.id}
            onClick={() => {
              // Refresh viewedAt timestamp immediately on re-click
              addRecent({ id: client.id, name: client.name, segment: client.segment });
              router.push(`/clients/${client.id}?from=myday&signal=continue-working`);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "12px 14px",
              marginBottom: i < visible.length - 1 ? 2 : 0,
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              transition: "background .15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(79,179,205,0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {/* Two-line layout for narrow right rail */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Line 1: Name */}
              <div style={{
                fontSize: 13, fontWeight: 600, color: P.odT1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {client.name}
              </div>
              {/* Line 2: AUM + Tier + Time ago */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                {aum > 0 && (
                  <span style={{
                    fontSize: 11, color: P.odT3,
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
                  }}>
                    {fmtAum(aum)}
                  </span>
                )}
                {client.segment && (
                  <span style={{
                    fontSize: 9, fontWeight: 600,
                    padding: "1px 5px", borderRadius: 3,
                    border: `1px solid ${P.odBorder}`,
                    color: P.odT3,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    Tier {client.segment}
                  </span>
                )}
                {ago && (
                  <span style={{
                    fontSize: 10, color: P.odT4,
                    fontFamily: "'DM Mono', monospace", fontWeight: 500,
                  }}>
                    {ago}
                  </span>
                )}
              </div>
            </div>

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
