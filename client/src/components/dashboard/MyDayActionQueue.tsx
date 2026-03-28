"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { P } from "@/styles/tokens";

/* ── Types ── */
interface RankedTask {
  id: string;
  subject: string;
  relatedTo?: string;
  clientId?: string | null;
  dueDate?: string;
  rank: number;
  rankLabel?: string;
  source?: string;
  priority?: string;
}

interface MyDayActionQueueProps {
  tasks: RankedTask[];
}

/* ── Constants ── */
const INITIAL_TASKS = 5;

/* ── Rank badge colors ── */
function rankStyle(rank: number): { bg: string; fg: string } {
  if (rank === 1) return { bg: "#E53E3E20", fg: "#E53E3E" };
  if (rank === 2) return { bg: P.odYellow + "20", fg: P.odYellow };
  return { bg: P.odBorder, fg: P.odT3 };
}

/* ── Component ── */
export function MyDayActionQueue({ tasks }: MyDayActionQueueProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const visibleTasks = expanded ? tasks : tasks.slice(0, INITIAL_TASKS);
  const hiddenCount = Math.max(0, tasks.length - INITIAL_TASKS);

  if (tasks.length === 0) {
    return (
      <div style={{ padding: "12px 0", color: P.odT3, fontSize: 13, fontStyle: "italic" }}>
        No pending tasks right now.
      </div>
    );
  }

  return (
    <div>
      {/* Ranked tasks */}
      {visibleTasks.map((task) => {
        const rs = rankStyle(task.rank);
        return (
          <div key={task.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 10px", margin: "0 -10px",
            borderBottom: `1px solid ${P.odBorder}60`,
            borderRadius: 6,
            transition: "background .15s ease",
            cursor: task.clientId ? "pointer" : "default",
          }}
          onClick={task.clientId ? () => {
            router.push(`/clients/${task.clientId}?from=myday&signal=task&signalId=${task.id}`);
          } : undefined}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(79,179,205,0.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <button
              style={{
                width: 16, height: 16, borderRadius: 8,
                border: `1.5px solid ${P.odT3}`,
                background: "transparent",
                cursor: "pointer", flexShrink: 0, padding: 0,
                transition: "border-color .15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = P.odGreen; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = P.odT3; }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.odT1 }}>{task.subject}</div>
              <div style={{ fontSize: 10, color: P.odT4, fontFamily: "'DM Mono', monospace" }}>
                {task.relatedTo}{task.dueDate ? ` · Due: ${task.dueDate}` : ""}
              </div>
            </div>
            {task.priority?.toLowerCase() === "high" && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                padding: "2px 6px", borderRadius: 4,
                background: P.odOrange + "20", color: P.odOrange,
              }}>
                High
              </span>
            )}
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "2px 6px", borderRadius: 4,
              background: rs.bg, color: rs.fg,
            }}>
              {task.rankLabel}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 600, color: P.odT3,
              padding: "2px 6px", borderRadius: 4, border: `1px solid ${P.odBorder}`,
            }}>
              {task.source === "salesforce" ? "SF" : "App"}
            </span>
          </div>
        );
      })}

      {/* Show more / Show less */}
      {!expanded && hiddenCount > 0 && (
        <button onClick={() => setExpanded(true)} style={{
          display: "block", margin: "10px 0 0", padding: "4px 0",
          fontSize: 11, fontWeight: 600, color: P.odLBlue,
          background: "none", border: "none", cursor: "pointer",
        }}>
          Show {hiddenCount} more →
        </button>
      )}
      {expanded && hiddenCount > 0 && (
        <button onClick={() => setExpanded(false)} style={{
          display: "block", margin: "10px 0 0", padding: "4px 0",
          fontSize: 11, fontWeight: 600, color: P.odT3,
          background: "none", border: "none", cursor: "pointer",
        }}>
          Show less
        </button>
      )}
    </div>
  );
}
