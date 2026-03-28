"use client";

import { useState, useCallback } from "react";
import { P } from "@/styles/tokens";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  X,
  Loader2,
  Sparkles,
  FileText,
  ClipboardCopy,
  ClipboardList,
  Save,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

interface ReviewSummaryModalProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

type ReviewType = "annual" | "quarterly" | "ad-hoc";
type ViewMode = "advisor" | "client";

export function ReviewSummaryModal({ clientId, clientName, onClose }: ReviewSummaryModalProps) {
  const [reviewType, setReviewType] = useState<ReviewType>("annual");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("advisor");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await apiRequest("POST", `/api/clients/${clientId}/review-summary`, { reviewType });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to generate review summary.");
    } finally {
      setGenerating(false);
    }
  }, [clientId, reviewType]);

  const handleSaveToSF = useCallback(async () => {
    if (!result) return;
    setSaving(true);
    try {
      await apiRequest("POST", `/api/clients/${clientId}/tasks`, {
        title: `${reviewType.charAt(0).toUpperCase() + reviewType.slice(1)} Review Summary`,
        description: result.reviewSummary?.clientSummary?.slice(0, 2000) || "Review summary generated",
        type: "note",
      });
    } finally {
      setSaving(false);
    }
  }, [clientId, result, reviewType]);

  const handleCopyClientSummary = useCallback(() => {
    if (!result?.reviewSummary?.clientSummary) return;
    navigator.clipboard.writeText(result.reviewSummary.clientSummary);
  }, [result]);

  const handleCreateTasks = useCallback(async () => {
    if (!result?.reviewSummary?.actionItems) return;
    for (const item of result.reviewSummary.actionItems.filter((a: any) => a.owner === "advisor").slice(0, 5)) {
      try {
        await apiRequest("POST", "/api/tasks", {
          title: item.description,
          priority: item.priority <= 2 ? "High" : "Normal",
          dueDate: item.deadline,
          clientId,
          status: "open",
        });
      } catch {}
    }
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    queryClient.invalidateQueries({ queryKey: ["/api/myday"] });
  }, [result, clientId]);

  const summary = result?.reviewSummary;
  const insights = result?.insights;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 720, maxHeight: "85vh", overflow: "auto",
        background: P.odSurf, border: `1px solid ${P.odBorder2}`,
        borderRadius: 12, padding: 0,
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", borderBottom: `1px solid ${P.odBorder}`,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: P.odT1, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={18} style={{ color: P.odLBlue }} /> Review Summary
            </div>
            <div style={{ fontSize: 12, color: P.odT3, marginTop: 2 }}>{clientName}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: P.odT3 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {!result && !generating && (
            <div>
              {/* Review type selector */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: P.odT3, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Review Type
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["annual", "quarterly", "ad-hoc"] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setReviewType(type)}
                      style={{
                        padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        background: reviewType === type ? "rgba(79,179,205,0.1)" : "transparent",
                        color: reviewType === type ? P.odLBlue : P.odT3,
                        border: `1px solid ${reviewType === type ? P.odLBlue + "40" : P.odBorder}`,
                        cursor: "pointer", textTransform: "capitalize",
                      }}
                    >{type.replace("-", " ")}</button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(229,62,62,0.1)", color: "#dc2626", fontSize: 12, marginBottom: 12 }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                style={{
                  display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
                  width: "100%", padding: "10px 0", borderRadius: 8,
                  fontSize: 13, fontWeight: 700,
                  background: P.odLBlue, color: "#fff",
                  border: "none", cursor: "pointer",
                }}
              >
                <Sparkles size={16} /> Generate Review Summary
              </button>
            </div>
          )}

          {generating && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: P.odLBlue, marginBottom: 16 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: P.odT1 }}>Generating review summary...</div>
              <div style={{ fontSize: 12, color: P.odT3, marginTop: 4 }}>Running financial assessment + client insights (agents 02 + 06)</div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {result && !generating && (
            <div>
              {/* View mode toggle */}
              <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${P.odBorder}`, marginBottom: 16 }}>
                {([
                  { key: "advisor" as const, label: "Advisor View" },
                  { key: "client" as const, label: "Client View" },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setViewMode(tab.key)}
                    style={{
                      padding: "8px 16px", fontSize: 12, fontWeight: viewMode === tab.key ? 700 : 500,
                      color: viewMode === tab.key ? P.odLBlue : P.odT3,
                      background: "none", border: "none", cursor: "pointer",
                      borderBottom: viewMode === tab.key ? `2px solid ${P.odLBlue}` : "2px solid transparent",
                    }}
                  >{tab.label}</button>
                ))}
              </div>

              {/* Advisor view */}
              {viewMode === "advisor" && summary && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{
                    fontSize: 13, color: P.odT2, lineHeight: 1.7, whiteSpace: "pre-wrap",
                    padding: 16, background: P.odBg, borderRadius: 8, maxHeight: 250, overflow: "auto",
                  }}>
                    {summary.advisorSummary || "No advisor summary generated."}
                  </div>

                  {/* Decisions */}
                  {(summary.decisions || []).length > 0 && (
                    <div style={{ padding: 12, background: P.odBg, borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: P.odT2, marginBottom: 6 }}>Decisions</div>
                      {summary.decisions.map((d: any, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "4px 0", borderBottom: i < summary.decisions.length - 1 ? `1px solid ${P.odBorder}` : "none" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                            background: d.decisionStatus === "AGREED" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                            color: d.decisionStatus === "AGREED" ? "#16a34a" : "#d97706",
                          }}>{d.decisionStatus}</span>
                          <span style={{ color: P.odT1 }}>{d.decision}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Insights from Agent 06 */}
                  {insights && (insights.insights || []).length > 0 && (
                    <div style={{ padding: 12, background: P.odBg, borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: P.odT2, marginBottom: 6 }}>
                        Insights ({insights.totalInsights || insights.insights.length})
                      </div>
                      {insights.insights.slice(0, 6).map((ins: any, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, padding: "6px 0", borderBottom: i < Math.min(insights.insights.length, 6) - 1 ? `1px solid ${P.odBorder}` : "none" }}>
                          {ins.insightType === "alert" ? <AlertTriangle size={14} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} /> :
                           ins.insightType === "opportunity" ? <ArrowRight size={14} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} /> :
                           <CheckCircle size={14} style={{ color: P.odLBlue, flexShrink: 0, marginTop: 1 }} />}
                          <div>
                            <div style={{ fontWeight: 600, color: P.odT1 }}>{ins.title}</div>
                            <div style={{ color: P.odT3, fontSize: 11, marginTop: 2 }}>{ins.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action items */}
                  {(summary.actionItems || []).length > 0 && (
                    <div style={{ padding: 12, background: P.odBg, borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: P.odT2, marginBottom: 6 }}>Next Steps</div>
                      {summary.actionItems.slice(0, 5).map((a: any, i: number) => (
                        <div key={i} style={{ fontSize: 12, padding: "4px 0", color: P.odT2 }}>
                          • {a.description} <span style={{ color: P.odT3 }}>({a.owner}{a.deadline ? `, by ${a.deadline}` : ""})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Client view */}
              {viewMode === "client" && summary && (
                <div style={{
                  fontSize: 13, color: P.odT2, lineHeight: 1.7, whiteSpace: "pre-wrap",
                  padding: 16, background: P.odBg, borderRadius: 8, maxHeight: 400, overflow: "auto",
                }}>
                  {summary.clientSummary || "No client-friendly summary generated."}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <button
                  onClick={handleSaveToSF}
                  disabled={saving}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: "transparent", color: P.odLBlue,
                    border: `1px solid ${P.odLBlue}40`, cursor: "pointer",
                  }}
                >
                  <Save size={14} /> {saving ? "Saving..." : "Save to Salesforce"}
                </button>
                <button
                  onClick={handleCopyClientSummary}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: "transparent", color: P.odLBlue,
                    border: `1px solid ${P.odLBlue}40`, cursor: "pointer",
                  }}
                >
                  <ClipboardCopy size={14} /> Copy Client Summary
                </button>
                {(summary?.actionItems || []).length > 0 && (
                  <button
                    onClick={handleCreateTasks}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: P.odGreen, color: "#fff",
                      border: "none", cursor: "pointer",
                    }}
                  >
                    <ClipboardList size={14} /> Create Follow-Up Tasks
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
