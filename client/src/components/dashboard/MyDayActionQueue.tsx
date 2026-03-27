"use client";

import { useState } from "react";
import { P } from "@/styles/tokens";

/* ── Types ── */
interface RankedTask {
  id: string;
  subject: string;
  relatedTo?: string;
  dueDate?: string;
  rank: number;
  rankLabel?: string;
  source?: string;
}

interface NbaAction {
  id: string;
  title?: string;
  actionType?: string;
  clientName?: string;
}

interface MyDayActionQueueProps {
  tasks: RankedTask[];
  nbaActions: NbaAction[];
  onCompleteNba: (id: string) => void;
  onDismissNba: (id: string) => void;
}

/* ── Constants ── */
const INITIAL_TASKS = 5;
const INITIAL_NBA = 3;

/* ── Rank badge colors ── */
function rankStyle(rank: number): { bg: string; fg: string } {
  if (rank === 1) return { bg: "#E53E3E20", fg: "#E53E3E" };
  if (rank === 2) return { bg: P.odYellow + "20", fg: P.odYellow };
  return { bg: P.odBorder, fg: P.odT3 };
}

/* ── Component ── */
export function MyDayActionQueue({ tasks, nbaActions, onCompleteNba, onDismissNba }: MyDayActionQueueProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleTasks = expanded ? tasks : tasks.slice(0, INITIAL_TASKS);
  const visibleNba = expanded ? nbaActions : nbaActions.slice(0, INITIAL_NBA);
  const hiddenCount = Math.max(0, tasks.length - INITIAL_TASKS) + Math.max(0, nbaActions.length - INITIAL_NBA);

  if (tasks.length === 0 && nbaActions.length === 0) {
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
            padding: "8px 0", borderBottom: `1px solid ${P.odBorder}40`,
          }}>
            <input
              type="checkbox"
              style={{ accentColor: P.odGreen, width: 14, height: 14, cursor: "pointer" }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: P.odT1 }}>{task.subject}</div>
              <div style={{ fontSize: 10, color: P.odT3, fontFamily: "'DM Mono', monospace" }}>
                {task.relatedTo}{task.dueDate ? ` · Due: ${task.dueDate}` : ""}
              </div>
            </div>
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

      {/* NBA suggested actions */}
      {visibleNba.map((action) => (
        <div key={action.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 0", borderBottom: `1px solid ${P.odBorder}40`,
        }}>
          <span style={{ fontSize: 14, color: P.odLBlue }}>●</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: P.odT1 }}>
              {action.title || action.actionType?.replace(/_/g, " ")}
            </div>
            <div style={{ fontSize: 10, color: P.odT3 }}>{action.clientName}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => onCompleteNba(action.id)}
              style={{ fontSize: 10, fontWeight: 600, color: P.odGreen, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Done</button>
            <button onClick={() => onDismissNba(action.id)}
              style={{ fontSize: 10, fontWeight: 600, color: P.odT3, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>Skip</button>
          </div>
        </div>
      ))}

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
