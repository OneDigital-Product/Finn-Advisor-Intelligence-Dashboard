"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createApiTracerState, type TracedRequest } from "@/hooks/use-api-tracer";
import {
  Play, Pause, Trash2, ChevronDown, ChevronRight, Circle,
  CheckCircle2, XCircle, AlertCircle, Clock, ArrowRight, Copy,
} from "lucide-react";

// Singleton tracer state
let tracerState: ReturnType<typeof createApiTracerState> | null = null;
function getTracerState() {
  if (!tracerState) tracerState = createApiTracerState();
  return tracerState;
}

function statusColor(status: number): string {
  if (status === 0) return "#ef4444";
  if (status >= 200 && status < 300) return "var(--color-success)";
  if (status >= 300 && status < 400) return "var(--color-warning)";
  if (status >= 400 && status < 500) return "var(--color-orange)";
  return "#ef4444";
}

function statusIcon(status: number) {
  if (status === 0) return <XCircle size={12} />;
  if (status >= 200 && status < 300) return <CheckCircle2 size={12} />;
  if (status >= 400) return <AlertCircle size={12} />;
  return <Circle size={12} />;
}

function methodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET": return "var(--color-brand-secondary)";
    case "POST": return "var(--color-success)";
    case "PUT": case "PATCH": return "var(--color-warning)";
    case "DELETE": return "#ef4444";
    default: return "var(--color-text-tertiary)";
  }
}

function RequestDetail({ req, onClose }: { req: TracedRequest; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"response" | "request">("response");
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{
      background: "var(--color-surface)", borderRadius: 10,
      border: "1px solid var(--color-border-subtle)", overflow: "hidden",
      marginTop: 12,
    }}>
      {/* Detail header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
        borderBottom: "1px solid var(--color-border-subtle)",
        background: "var(--color-surface-raised)",
      }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, color: methodColor(req.method) }}>
          {req.method}
        </span>
        <span style={{ fontSize: 11, color: "var(--color-text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {req.url}
        </span>
        <span style={{ fontSize: 10, color: statusColor(req.status), fontWeight: 600 }}>{req.status || "ERR"}</span>
        <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{req.duration}ms</span>
        <button onClick={onClose} style={{
          border: "none", background: "transparent", color: "var(--color-text-muted)",
          cursor: "pointer", fontSize: 16, lineHeight: 1,
        }}>
          x
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--color-border-subtle)" }}>
        {(["response", "request"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: "8px", border: "none", cursor: "pointer",
              background: activeTab === tab ? "var(--color-surface-raised)" : "transparent",
              color: activeTab === tab ? "var(--color-text-primary)" : "var(--color-text-muted)",
              fontSize: 11, fontWeight: 600, textTransform: "capitalize",
              fontFamily: "inherit", borderBottom: activeTab === tab ? "2px solid var(--color-brand-primary)" : "2px solid transparent",
            }}
          >
            {tab} Body
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => copyToClipboard(activeTab === "response" ? req.responseBody || "" : req.requestBody || "")}
          style={{
            position: "absolute", top: 8, right: 8, border: "none",
            background: "var(--color-surface-overlay)", borderRadius: 4,
            padding: "4px 6px", cursor: "pointer", color: "var(--color-text-tertiary)",
          }}
          title="Copy"
        >
          <Copy size={11} />
        </button>
        <pre style={{
          padding: "12px 16px", margin: 0, fontSize: 11,
          fontFamily: "'JetBrains Mono', 'DM Mono', monospace",
          color: "var(--color-text-secondary)", overflowX: "auto",
          maxHeight: 300, whiteSpace: "pre-wrap", wordBreak: "break-all",
        }}>
          {activeTab === "response"
            ? formatJson(req.responseBody || req.error || "(empty)")
            : formatJson(req.requestBody || "(no body)")
          }
        </pre>
      </div>
    </div>
  );
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

export function ApiTracerSection() {
  const tracer = useRef(getTracerState()).current;

  const requests = useSyncExternalStore(tracer.subscribe, tracer.getRequests, () => []);
  const isRecording = useSyncExternalStore(tracer.subscribe, tracer.isRecording, () => true);
  const [selectedReq, setSelectedReq] = useState<TracedRequest | null>(null);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");

  const filtered = requests.filter(r => {
    if (filter && !r.url.toLowerCase().includes(filter.toLowerCase()) && !r.method.toLowerCase().includes(filter.toLowerCase())) return false;
    if (statusFilter === "success" && (r.status < 200 || r.status >= 300)) return false;
    if (statusFilter === "error" && r.status >= 200 && r.status < 400 && r.status !== 0) return false;
    return true;
  });

  return (
    <div>
      {/* Controls */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap",
      }}>
        <button
          onClick={tracer.toggleRecording}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
            background: isRecording ? "rgba(239, 68, 68, 0.12)" : "rgba(142, 185, 53, 0.12)",
            color: isRecording ? "#ef4444" : "var(--color-success)",
            fontSize: 12, fontWeight: 600, fontFamily: "inherit",
          }}
        >
          {isRecording ? <><Pause size={12} /> Recording</> : <><Play size={12} /> Paused</>}
        </button>
        <button
          onClick={tracer.clearRequests}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 12px", borderRadius: 6, border: "1px solid var(--color-border)",
            background: "transparent", color: "var(--color-text-tertiary)",
            fontSize: 12, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Trash2 size={11} /> Clear
        </button>

        <div style={{ flex: 1 }} />

        <input
          type="text"
          placeholder="Filter by URL or method..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            padding: "6px 12px", borderRadius: 6, border: "1px solid var(--color-border)",
            background: "var(--color-surface)", color: "var(--color-text-primary)",
            fontSize: 12, fontFamily: "inherit", width: 220,
          }}
        />

        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "success", "error"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                border: `1px solid ${statusFilter === s ? "var(--color-brand-primary)" : "var(--color-border)"}`,
                background: statusFilter === s ? "rgba(0, 120, 162, 0.12)" : "transparent",
                color: statusFilter === s ? "var(--color-brand-secondary)" : "var(--color-text-muted)",
                cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "flex", gap: 16, marginBottom: 16, padding: "10px 16px",
        background: "var(--color-surface-raised)", borderRadius: 8,
        border: "1px solid var(--color-border-subtle)",
      }}>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          Total: <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{requests.length}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          Success: <span style={{ color: "var(--color-success)", fontWeight: 600 }}>
            {requests.filter(r => r.status >= 200 && r.status < 300).length}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          Errors: <span style={{ color: "#ef4444", fontWeight: 600 }}>
            {requests.filter(r => r.status >= 400 || r.status === 0).length}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          Avg: <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>
            {requests.length ? Math.round(requests.reduce((a, r) => a + r.duration, 0) / requests.length) : 0}ms
          </span>
        </div>
      </div>

      {/* Request list */}
      <div style={{
        background: "var(--color-surface-raised)", borderRadius: 12,
        border: "1px solid var(--color-border-subtle)", overflow: "hidden",
      }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: "40px 20px", textAlign: "center",
            color: "var(--color-text-muted)", fontSize: 13,
          }}>
            {isRecording ? "No requests captured yet. Navigate around the app to see API calls." : "Recording is paused."}
          </div>
        ) : (
          <div style={{ maxHeight: 500, overflow: "auto" }}>
            {filtered.map(req => {
              const isSelected = selectedReq?.id === req.id;
              return (
                <div key={req.id}>
                  <button
                    onClick={() => setSelectedReq(isSelected ? null : req)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      width: "100%", padding: "8px 16px", border: "none",
                      borderBottom: "1px solid var(--color-border-subtle)",
                      background: isSelected ? "rgba(0, 120, 162, 0.06)" : "transparent",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                      transition: "background .1s ease",
                    }}
                  >
                    <span style={{ color: statusColor(req.status), flexShrink: 0 }}>{statusIcon(req.status)}</span>
                    <span style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700,
                      color: methodColor(req.method), width: 40, flexShrink: 0,
                    }}>
                      {req.method}
                    </span>
                    <span style={{
                      fontSize: 11, color: "var(--color-text-secondary)", flex: 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {req.url.replace(/^https?:\/\/[^/]+/, "")}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: statusColor(req.status),
                      fontFamily: "'DM Mono', monospace", width: 30, textAlign: "right", flexShrink: 0,
                    }}>
                      {req.status || "ERR"}
                    </span>
                    <span style={{
                      fontSize: 10, color: req.duration > 1000 ? "var(--color-warning)" : "var(--color-text-muted)",
                      fontFamily: "'DM Mono', monospace", width: 50, textAlign: "right", flexShrink: 0,
                    }}>
                      {req.duration}ms
                    </span>
                    <span style={{ fontSize: 10, color: "var(--color-text-muted)", width: 60, textAlign: "right", flexShrink: 0 }}>
                      {new Date(req.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    {isSelected ? <ChevronDown size={12} style={{ color: "var(--color-text-muted)" }} /> : <ChevronRight size={12} style={{ color: "var(--color-text-muted)" }} />}
                  </button>
                  {isSelected && <div style={{ padding: "0 16px 12px" }}><RequestDetail req={req} onClose={() => setSelectedReq(null)} /></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
