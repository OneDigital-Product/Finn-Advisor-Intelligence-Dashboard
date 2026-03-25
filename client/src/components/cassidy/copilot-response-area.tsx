import { useState } from "react";
import { FollowUpPromptsV2 } from "./follow-up-prompts-v2";
import { TraceTimeline } from "./trace-timeline";
import { useTrace } from "@/hooks/use-trace";
import { Serif, Mono, Lbl } from "@/components/design";
import { FileText, Lightbulb, Link2, Zap, Activity, ExternalLink, AlertTriangle, BookOpen } from "lucide-react";

interface FinDocument {
  url: string;
  name: string;
  format: string;
}

interface Props {
  response: {
    fin_response?: string;
    fin_report?: string;
    suggested_prompts?: Array<{ title: string; prompt: string }> | string[];
    output?: Record<string, any>;
    called_agent?: string;
    documents?: FinDocument[];
    review_required?: boolean;
    suggested_prompt_objects?: Array<{ title: string; prompt: string }>;
  };
  jobId: string;
  onFollowUpSelected?: (prompt: string) => void;
}

const agentLabels: Record<string, string> = {
  "intake-agent": "Intake Agent",
  "investor-profile-agent": "Investor Profile",
  "meeting-signals-agent": "Meeting Signals",
  "report-writer-agent": "Report Writer",
  "knowledge-retrieval-agent": "Knowledge Base",
  "fact-finder-router-agent": "Fact Finder",
  "planning-triage-agent": "Planning Triage",
  "direct-response": "Fin Direct",
};

const tabs = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "details", label: "Details", icon: Lightbulb },
  { id: "sources", label: "Sources", icon: Link2 },
  { id: "actions", label: "Actions", icon: Zap },
  { id: "trace", label: "Trace", icon: Activity },
];

export function CopilotResponseArea({ response, jobId, onFollowUpSelected }: Props) {
  const [activeTab, setActiveTab] = useState("summary");
  const { trace, isLoading: traceLoading } = useTrace(jobId);

  const suggestedPrompts = (response.suggested_prompt_objects && response.suggested_prompt_objects.length > 0)
    ? response.suggested_prompt_objects
    : (response.suggested_prompts?.map((p) =>
        typeof p === "string" ? { title: p, prompt: p } : p
      ) || []);

  const documents = response.documents || [];
  const outputSources = response.output?.sources;
  const allSources = documents.length > 0
    ? documents
    : (Array.isArray(outputSources) ? outputSources : []);

  const agentLabel = response.called_agent
    ? (agentLabels[response.called_agent] || response.called_agent)
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fu" style={{ fontFamily: "'DM Sans', sans-serif" }} data-testid="copilot-response-area">
      <div className="flex gap-0 mb-5" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          const hasContent = tab.id === "sources" ? allSources.length > 0 : true;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] transition-all"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: active ? 700 : 500,
                color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                borderBottom: active ? "2px solid #0C1222" : "2px solid transparent",
                background: "transparent",
                border: "none",
                borderBottomWidth: 2,
                borderBottomStyle: "solid",
                borderBottomColor: active ? "#0C1222" : "transparent",
                cursor: "pointer",
                opacity: hasContent ? 1 : 0.5,
              }}
              data-testid={`tab-${tab.id}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.id === "sources" && allSources.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold" style={{ background: "rgba(107,143,224,.15)", color: "#6B8FE0" }}>
                  {allSources.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div key={activeTab} className="animate-fu">
        {activeTab === "summary" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {agentLabel && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: "rgba(107,143,224,.12)", color: "#6B8FE0" }}
                  data-testid="badge-agent"
                >
                  {agentLabel}
                </span>
              )}
              {response.review_required && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: "rgba(196,75,75,.12)", color: "#C44B4B" }}
                  data-testid="badge-review-required"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Review Required
                </span>
              )}
            </div>
            <div className="text-[13px] leading-[1.8] font-medium whitespace-pre-line" style={{ color: "hsl(var(--foreground))" }} data-testid="text-fin-response">
              {response.fin_response || "No response available."}
            </div>
            {suggestedPrompts.length > 0 && onFollowUpSelected && (
              <div className="pt-3">
                <FollowUpPromptsV2 prompts={suggestedPrompts} onPromptSelected={onFollowUpSelected} />
              </div>
            )}
          </div>
        )}

        {activeTab === "details" && (
          <div>
            {response.fin_report ? (
              <div className="rounded-md p-5" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                <Serif className="text-[15px] font-semibold block mb-3">Detailed Report</Serif>
                <div className="text-[13px] leading-[1.8] font-medium whitespace-pre-line" style={{ color: "hsl(var(--foreground))" }} data-testid="text-fin-report">
                  {response.fin_report}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-[12px]" data-testid="text-no-details">
                No detailed report available for this response.
              </div>
            )}
          </div>
        )}

        {activeTab === "sources" && (
          <div>
            {allSources.length > 0 ? (
              <div className="space-y-2">
                {allSources.map((source: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-md p-4 animate-fu flex items-center justify-between"
                    style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center" style={{ background: source.format === "kb" ? "rgba(61,139,94,.12)" : "rgba(107,143,224,.12)" }}>
                        {source.format === "kb" ? (
                          <BookOpen className="h-3.5 w-3.5" style={{ color: "#3D8B5E" }} />
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5" style={{ color: "#6B8FE0" }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>
                          {source.title || source.name || `Source ${i + 1}`}
                        </div>
                        {(source.snippet || source.url) && (
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
                            {source.snippet || source.url}
                          </p>
                        )}
                      </div>
                    </div>
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-1.5 rounded-md transition-colors hover:bg-accent"
                        data-testid={`link-source-${i}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-[12px]" data-testid="text-no-sources">
                No source citations available for this response.
              </div>
            )}
          </div>
        )}

        {activeTab === "actions" && (
          <div>
            {response.output?.facts || response.output?.signals || response.output?.profiles ? (
              <div className="space-y-4">
                {response.output.facts && (
                  <div className="rounded-md p-5" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                    <Lbl>Extracted Facts</Lbl>
                    <ul className="space-y-2 mt-3">
                      {(response.output.facts as any[]).map((f: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] animate-fu" style={{ animationDelay: `${i * 40}ms` }}>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider shrink-0" style={{ background: "rgba(107,143,224,.12)", color: "#6B8FE0" }}>
                            {f.factType || f.type}
                          </span>
                          <span style={{ color: "hsl(var(--foreground))" }}>
                            <span className="font-semibold">{f.factLabel || f.label}:</span> {f.factValue || f.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {response.output.signals && (
                  <div className="rounded-md p-5" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))" }}>
                    <Lbl>Detected Signals</Lbl>
                    <ul className="space-y-2 mt-3">
                      {(response.output.signals as any[]).map((s: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] animate-fu" style={{ animationDelay: `${i * 40}ms` }}>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider shrink-0 ${s.materiality === "CRITICAL" ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" : ""}`}
                            style={s.materiality !== "CRITICAL" ? { background: "rgba(184,135,43,.12)", color: "#B8872B" } : {}}>
                            {s.signalType || s.signal_type}
                          </span>
                          <span style={{ color: "hsl(var(--foreground))" }}>{s.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-[12px]" data-testid="text-no-actions">
                No actionable items extracted from this response.
              </div>
            )}
          </div>
        )}

        {activeTab === "trace" && (
          <div>
            {traceLoading ? (
              <div className="text-center py-12 text-muted-foreground text-[12px]">Loading trace...</div>
            ) : trace ? (
              <TraceTimeline steps={trace.steps} totalDurationMs={trace.totalDurationMs} status={trace.status} />
            ) : (
              <div className="text-center py-12 text-muted-foreground text-[12px]" data-testid="text-no-trace">
                No execution trace available.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
