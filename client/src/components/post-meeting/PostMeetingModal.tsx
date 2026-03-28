"use client";

import { useState, useCallback } from "react";
import { P } from "@/styles/tokens";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Loader2, FileText, CheckCircle, Mail, ClipboardList } from "lucide-react";

interface PostMeetingModalProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

type ProcessingStep = "idle" | "processing" | "review";
type ReviewTab = "summary" | "actions" | "email";

export function PostMeetingModal({ clientId, clientName, onClose }: PostMeetingModalProps) {
  const [step, setStep] = useState<ProcessingStep>("idle");
  const [reviewTab, setReviewTab] = useState<ReviewTab>("summary");
  const [notes, setNotes] = useState("");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [inputType, setInputType] = useState<"notes" | "transcript">("notes");

  // Processing results
  const [summary, setSummary] = useState<any>(null);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [email, setEmail] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = useCallback(async () => {
    if (!notes.trim()) return;
    setStep("processing");
    setError(null);

    try {
      // Step 1: Create/update meeting with notes if we have a meetingId
      const meetingId = selectedMeetingId || `temp-${Date.now()}`;

      // Step 2: Call summarize endpoint (uses Agent 02 internally)
      const summarizeRes = await apiRequest("POST", `/api/meetings/${meetingId}/summarize`, {
        notes: notes.trim(),
        clientId,
        inputType,
      });
      const summarizeData = await summarizeRes.json();
      setSummary(summarizeData.transcriptSummary || summarizeData);

      // Step 3: Extract action items from the summary
      if (summarizeData.suggestedTasks) {
        setActionItems(summarizeData.suggestedTasks.map((t: any, i: number) => ({
          id: `action-${i}`,
          title: t.title || t.subject || t.description,
          description: t.description || "",
          owner: t.owner || "advisor",
          priority: t.priority || "Normal",
          dueDate: t.dueDate || null,
          selected: true,
        })));
      }

      // Step 4: Generate follow-up email
      try {
        const emailRes = await apiRequest("POST", `/api/meetings/${meetingId}/follow-up-email`, {
          clientName,
          meetingNotes: notes.trim(),
          summary: summarizeData.transcriptSummary?.advisorSummary || "",
        });
        const emailData = await emailRes.json();
        setEmail(emailData);
      } catch {
        // Email generation is optional — don't block the flow
      }

      setStep("review");
    } catch (err: any) {
      setError(err.message || "Processing failed. Please try again.");
      setStep("idle");
    }
  }, [notes, selectedMeetingId, clientId, clientName, inputType]);

  const handleCreateTasks = useCallback(async () => {
    const selected = actionItems.filter(a => a.selected);
    for (const task of selected) {
      try {
        await apiRequest("POST", "/api/tasks", {
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueDate: task.dueDate,
          clientId,
          status: "open",
        });
      } catch {
        // Continue creating remaining tasks
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/myday"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    onClose();
  }, [actionItems, clientId, onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: 680, maxHeight: "85vh", overflow: "auto",
        background: P.odSurf, border: `1px solid ${P.odBorder2}`,
        borderRadius: 12, padding: 0,
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", borderBottom: `1px solid ${P.odBorder}`,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: P.odT1 }}>Post-Meeting Summary</div>
            <div style={{ fontSize: 12, color: P.odT3, marginTop: 2 }}>{clientName}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: P.odT3 }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px" }}>
          {step === "idle" && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <button
                    onClick={() => setInputType("notes")}
                    style={{
                      padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: inputType === "notes" ? "rgba(79,179,205,0.1)" : "transparent",
                      color: inputType === "notes" ? P.odLBlue : P.odT3,
                      border: `1px solid ${inputType === "notes" ? P.odLBlue + "40" : P.odBorder}`,
                      cursor: "pointer",
                    }}
                  >I have notes</button>
                  <button
                    onClick={() => setInputType("transcript")}
                    style={{
                      padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      background: inputType === "transcript" ? "rgba(79,179,205,0.1)" : "transparent",
                      color: inputType === "transcript" ? P.odLBlue : P.odT3,
                      border: `1px solid ${inputType === "transcript" ? P.odLBlue + "40" : P.odBorder}`,
                      cursor: "pointer",
                    }}
                  >I have a transcript</button>
                </div>

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={inputType === "notes" ? "Paste your meeting notes or key points..." : "Paste your meeting transcript..."}
                  style={{
                    width: "100%", minHeight: 180, padding: 14, borderRadius: 8,
                    background: P.odBg, border: `1px solid ${P.odBorder}`,
                    color: P.odT1, fontSize: 13, fontFamily: "'Inter', sans-serif",
                    resize: "vertical",
                  }}
                />
              </div>

              {error && (
                <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(229,62,62,0.1)", color: P.odOrange, fontSize: 12, marginBottom: 12 }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleProcess}
                disabled={!notes.trim()}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 20px", borderRadius: 8,
                  fontSize: 13, fontWeight: 700,
                  background: notes.trim() ? P.odLBlue : P.odBorder,
                  color: notes.trim() ? "#fff" : P.odT3,
                  border: "none", cursor: notes.trim() ? "pointer" : "not-allowed",
                  width: "100%", justifyContent: "center",
                }}
              >
                <FileText size={16} /> Generate Summary
              </button>
            </div>
          )}

          {step === "processing" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: P.odLBlue, marginBottom: 16 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: P.odT1 }}>Processing meeting data...</div>
              <div style={{ fontSize: 12, color: P.odT3, marginTop: 4 }}>Generating summary, extracting action items, drafting follow-up</div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {step === "review" && (
            <div>
              {/* Tab bar */}
              <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${P.odBorder}`, marginBottom: 16 }}>
                {([
                  { key: "summary" as const, label: "Summary", icon: FileText },
                  { key: "actions" as const, label: `Actions (${actionItems.length})`, icon: ClipboardList },
                  { key: "email" as const, label: "Follow-Up Email", icon: Mail },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setReviewTab(tab.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "8px 16px", fontSize: 12, fontWeight: reviewTab === tab.key ? 700 : 500,
                      color: reviewTab === tab.key ? P.odLBlue : P.odT3,
                      background: "none", border: "none", cursor: "pointer",
                      borderBottom: reviewTab === tab.key ? `2px solid ${P.odLBlue}` : "2px solid transparent",
                    }}
                  >
                    <tab.icon size={14} /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Summary tab */}
              {reviewTab === "summary" && summary && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: P.odT2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Advisor Summary
                  </div>
                  <div style={{
                    fontSize: 13, color: P.odT2, lineHeight: 1.7, whiteSpace: "pre-wrap",
                    padding: 16, background: P.odBg, borderRadius: 8, marginBottom: 16,
                    maxHeight: 300, overflow: "auto",
                  }}>
                    {typeof summary === "string" ? summary : summary.advisorSummary || summary.content || JSON.stringify(summary, null, 2)}
                  </div>
                </div>
              )}

              {/* Actions tab */}
              {reviewTab === "actions" && (
                <div>
                  {actionItems.length === 0 ? (
                    <div style={{ fontSize: 13, color: P.odT3, fontStyle: "italic", padding: "16px 0" }}>No action items extracted.</div>
                  ) : (
                    <>
                      {actionItems.map((item, idx) => (
                        <div key={item.id} style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "10px 0",
                          borderBottom: idx < actionItems.length - 1 ? `1px solid ${P.odBorder}` : "none",
                        }}>
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => {
                              const updated = [...actionItems];
                              updated[idx] = { ...item, selected: !item.selected };
                              setActionItems(updated);
                            }}
                            style={{ marginTop: 3, accentColor: P.odLBlue }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: P.odT1 }}>{item.title}</div>
                            <div style={{ fontSize: 11, color: P.odT3, marginTop: 2 }}>
                              {item.owner} · {item.priority} · {item.dueDate || "No due date"}
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={handleCreateTasks}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
                          width: "100%", padding: "10px 0", marginTop: 12, borderRadius: 8,
                          fontSize: 13, fontWeight: 700,
                          background: P.odGreen, color: "#fff", border: "none", cursor: "pointer",
                        }}
                      >
                        <CheckCircle size={16} /> Create {actionItems.filter(a => a.selected).length} Tasks
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Email tab */}
              {reviewTab === "email" && (
                <div>
                  {email ? (
                    <>
                      <div style={{
                        fontSize: 13, color: P.odT2, lineHeight: 1.7, whiteSpace: "pre-wrap",
                        padding: 16, background: P.odBg, borderRadius: 8, marginBottom: 12,
                        maxHeight: 300, overflow: "auto",
                      }}>
                        {typeof email === "string" ? email : email.content || email.emailContent || JSON.stringify(email, null, 2)}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => {
                            const text = typeof email === "string" ? email : email.content || email.emailContent || "";
                            navigator.clipboard.writeText(text);
                          }}
                          style={{
                            padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                            background: "transparent", color: P.odLBlue,
                            border: `1px solid ${P.odLBlue}40`, cursor: "pointer",
                          }}
                        >Copy to Clipboard</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: P.odT3, fontStyle: "italic", padding: "16px 0" }}>
                      Follow-up email generation is not available right now.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
