"use client";

import { useState, useCallback } from "react";
import { P } from "@/styles/tokens";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Loader2, FileText, CheckCircle, Mail, ClipboardList, Brain } from "lucide-react";

interface PostMeetingModalProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

type ProcessingStep = "idle" | "processing" | "review";
type ReviewTab = "summary" | "actions" | "email" | "coaching";

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
  const [coachingData, setCoachingData] = useState<any>(null);
  const [coachingLoading, setCoachingLoading] = useState(false);

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

      // Step 5: Run behavioral coaching analysis (non-blocking)
      setCoachingLoading(true);
      apiRequest("POST", `/api/clients/${clientId}/behavioral/analyze`, {
        communicationText: notes.trim(),
        sourceType: inputType === "transcript" ? "meeting_transcript" : "phone_notes",
        sourceId: meetingId,
      })
        .then(res => res.json())
        .then(data => setCoachingData(data.analysis || data))
        .catch(() => {})
        .finally(() => setCoachingLoading(false));

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
                  { key: "coaching" as const, label: "Coaching", icon: Brain },
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

              {/* Coaching tab */}
              {reviewTab === "coaching" && (
                <div>
                  {coachingLoading ? (
                    <div style={{ textAlign: "center", padding: "24px 0" }}>
                      <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: P.odLBlue, marginBottom: 8 }} />
                      <div style={{ fontSize: 12, color: P.odT3 }}>Analyzing behavioral patterns...</div>
                    </div>
                  ) : coachingData ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {/* Behavioral Risk Score */}
                      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 12, background: P.odBg, borderRadius: 8 }}>
                        <div style={{
                          width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18, fontWeight: 800,
                          background: (coachingData.behavioralRiskScore ?? 50) > 70 ? "rgba(239,68,68,0.1)" : (coachingData.behavioralRiskScore ?? 50) > 40 ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)",
                          color: (coachingData.behavioralRiskScore ?? 50) > 70 ? "#dc2626" : (coachingData.behavioralRiskScore ?? 50) > 40 ? "#d97706" : "#16a34a",
                          border: `2px solid ${(coachingData.behavioralRiskScore ?? 50) > 70 ? "#dc2626" : (coachingData.behavioralRiskScore ?? 50) > 40 ? "#d97706" : "#16a34a"}40`,
                        }}>
                          {coachingData.behavioralRiskScore ?? "—"}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: P.odT2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Behavioral Risk</div>
                          <div style={{ fontSize: 11, color: P.odT3, marginTop: 2 }}>
                            {coachingData.dominantEmotion && <>Dominant emotion: <strong>{coachingData.dominantEmotion}</strong></>}
                            {coachingData.anxietyLevel && <> · Anxiety: <strong>{coachingData.anxietyLevel}</strong></>}
                          </div>
                        </div>
                      </div>

                      {/* Sentiment Profile */}
                      {coachingData.sentimentScore != null && (
                        <div style={{ padding: 12, background: P.odBg, borderRadius: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: P.odT2, marginBottom: 6 }}>Sentiment Profile</div>
                          <div style={{ display: "flex", gap: 12, fontSize: 11, color: P.odT3 }}>
                            <span>Score: <strong>{coachingData.sentimentScore}/100</strong></span>
                            {coachingData.communicationStyle && <span>Style: <strong>{coachingData.communicationStyle}</strong></span>}
                            {coachingData.sentimentTrend && <span>Trend: <strong>{coachingData.sentimentTrend}</strong></span>}
                          </div>
                        </div>
                      )}

                      {/* Detected Biases */}
                      {(coachingData.detectedBiases || []).length > 0 && (
                        <div style={{ padding: 12, background: P.odBg, borderRadius: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: P.odT2, marginBottom: 6 }}>Detected Biases</div>
                          {coachingData.detectedBiases.map((bias: any, i: number) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "4px 0", borderBottom: i < coachingData.detectedBiases.length - 1 ? `1px solid ${P.odBorder}` : "none" }}>
                              <span style={{ fontWeight: 600, color: P.odT1 }}>{bias.biasType || bias.type || bias.name}</span>
                              <span style={{
                                fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                                background: (bias.confidence || "").includes("CONFIRMED") ? "rgba(239,68,68,0.1)" : (bias.confidence || "").includes("LIKELY") ? "rgba(245,158,11,0.1)" : "rgba(59,130,246,0.1)",
                                color: (bias.confidence || "").includes("CONFIRMED") ? "#dc2626" : (bias.confidence || "").includes("LIKELY") ? "#d97706" : "#3b82f6",
                              }}>
                                {bias.confidence || "POSSIBLE"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Coaching Playbook */}
                      {coachingData.coachingPlaybook && (
                        <div style={{ padding: 12, background: P.odBg, borderRadius: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: P.odT2, marginBottom: 6 }}>Coaching Playbook</div>
                          {coachingData.coachingPlaybook.primaryStrategy && (
                            <div style={{ fontSize: 12, color: P.odT2, marginBottom: 6 }}>
                              <strong>Strategy:</strong> {coachingData.coachingPlaybook.primaryStrategy}
                            </div>
                          )}
                          {(coachingData.coachingPlaybook.talkingPoints || []).length > 0 && (
                            <div style={{ marginBottom: 6 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: P.odT3, marginBottom: 4 }}>Talking Points</div>
                              {coachingData.coachingPlaybook.talkingPoints.map((tp: string, i: number) => (
                                <div key={i} style={{ fontSize: 11, color: P.odT2, padding: "3px 0", paddingLeft: 12, borderLeft: `2px solid ${P.odLBlue}30` }}>
                                  {tp}
                                </div>
                              ))}
                            </div>
                          )}
                          {(coachingData.coachingPlaybook.antiPatterns || []).length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "#dc2626", marginBottom: 4 }}>Avoid</div>
                              {coachingData.coachingPlaybook.antiPatterns.map((ap: string, i: number) => (
                                <div key={i} style={{ fontSize: 11, color: P.odT3, padding: "2px 0", paddingLeft: 12, borderLeft: `2px solid rgba(239,68,68,0.3)` }}>
                                  {ap}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Anxiety Triggers */}
                      {(coachingData.anxietyTriggers || []).length > 0 && (
                        <div style={{ padding: 12, background: P.odBg, borderRadius: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: P.odT2, marginBottom: 6 }}>Anxiety Triggers</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {coachingData.anxietyTriggers.map((t: string, i: number) => (
                              <span key={i} style={{
                                fontSize: 11, padding: "2px 8px", borderRadius: 12,
                                background: "rgba(239,68,68,0.08)", color: "#dc2626",
                              }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: P.odT3, fontStyle: "italic", padding: "16px 0" }}>
                      Behavioral coaching analysis is not available for this meeting.
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
