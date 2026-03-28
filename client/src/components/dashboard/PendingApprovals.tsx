"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { P } from "@/styles/tokens";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface PendingGate {
  gateId: string;
  gateName: string;
  workflowName: string;
  clientName: string | null;
  clientId: string | null;
  createdAt: string;
  expiresAt: string | null;
  actions: Array<{ label: string; value: string; destructive?: boolean }>;
}

interface PendingApprovalsProps {
  gates: PendingGate[];
}

export function PendingApprovals({ gates }: PendingApprovalsProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState<string | null>(null);

  const visible = gates.filter(g => !dismissed.has(g.gateId));
  if (visible.length === 0) return null;

  const handleAction = async (gateId: string, action: string) => {
    setActing(gateId);
    try {
      await apiRequest("POST", `/api/workflow-automations/gates/${gateId}/action`, { action });
      // Optimistic removal
      setDismissed(prev => new Set(prev).add(gateId));
      // Invalidate myday + workflows
      queryClient.invalidateQueries({ queryKey: ["/api/myday"] });
      queryClient.invalidateQueries({ predicate: (q) => {
        const k = q.queryKey;
        return Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/api/workflow-automations");
      }});
    } catch {
      // Silently fail — gate stays visible for retry
    } finally {
      setActing(null);
    }
  };

  const timeAgo = (dateStr: string) => {
    const ms = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div>
      {visible.map((gate, idx) => (
        <div
          key={gate.gateId}
          style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 0",
            borderBottom: idx < visible.length - 1 ? `1px solid ${P.odBorder}` : "none",
          }}
        >
          <span style={{ fontSize: 14, color: P.odYellow, marginTop: 2, flexShrink: 0 }}>⚡</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13, fontWeight: 700, color: P.odT1,
                cursor: gate.clientId ? "pointer" : "default",
              }}
              onClick={gate.clientId ? () => {
                router.push(`/clients/${gate.clientId}?from=myday&signal=workflow-gate&signalId=${gate.gateId}`);
              } : undefined}
            >
              {gate.gateName}
            </div>
            <div style={{ fontSize: 10, color: P.odT4, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
              {gate.workflowName}
              {gate.clientName ? ` · ${gate.clientName}` : ""}
              {gate.createdAt ? ` · ${timeAgo(gate.createdAt)}` : ""}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {gate.actions.map((a) => (
                <button
                  key={a.value}
                  disabled={acting === gate.gateId}
                  onClick={(e) => { e.stopPropagation(); handleAction(gate.gateId, a.value); }}
                  style={{
                    fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 4,
                    border: `1px solid ${a.destructive ? P.odOrange : P.odBorder}`,
                    background: a.destructive ? "rgba(229,62,62,0.1)" : "transparent",
                    color: a.destructive ? P.odOrange : P.odT2,
                    cursor: acting === gate.gateId ? "wait" : "pointer",
                    opacity: acting === gate.gateId ? 0.5 : 1,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
