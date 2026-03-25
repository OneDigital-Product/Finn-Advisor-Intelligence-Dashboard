import { useState } from "react";
import { Mono, Lbl } from "@/components/design";
import { CheckCircle, AlertCircle, Clock, ChevronDown, ChevronRight } from "lucide-react";

interface TraceStep {
  stepId: number;
  title: string;
  timestamp: string;
  status: string;
  durationMs?: number;
  details: Record<string, any>;
}

interface TraceTimelineProps {
  steps: TraceStep[];
  totalDurationMs: number;
  status: string;
}

function StatusIcon({ status }: { status: string }) {
  const size = "h-3.5 w-3.5 shrink-0";
  switch (status) {
    case "completed":
      return <CheckCircle className={`${size} text-[#3D8B5E]`} />;
    case "failed":
      return <AlertCircle className={`${size} text-[#C44B4B]`} />;
    case "in_progress":
      return <Clock className={`${size} text-[#6B8FE0] animate-pulse`} />;
    default:
      return <Clock className={`${size} text-muted-foreground`} />;
  }
}

function formatDuration(ms?: number): string {
  if (ms === undefined || ms === null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function statusColor(status: string): string {
  switch (status) {
    case "completed": return "#3D8B5E";
    case "failed": return "#C44B4B";
    case "in_progress": return "#6B8FE0";
    default: return "hsl(var(--muted-foreground))";
  }
}

export function TraceTimeline({ steps, totalDurationMs, status }: TraceTimelineProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const toggleStep = (stepId: number) => {
    setExpandedStep((prev) => (prev === stepId ? null : stepId));
  };

  return (
    <div
      className="rounded-md p-4"
      style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border))", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="space-y-0">
        {steps.map((step, index) => {
          const isExpanded = expandedStep === step.stepId;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.stepId} className="animate-fu" style={{ animationDelay: `${index * 40}ms` }} data-testid={`trace-step-${step.stepId}`}>
              <button
                type="button"
                className="flex items-center gap-3 w-full text-left py-2 px-2 rounded-md transition-colors"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(var(--background))"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                onClick={() => toggleStep(step.stepId)}
                data-testid={`button-toggle-step-${step.stepId}`}
              >
                <div className="flex flex-col items-center shrink-0">
                  <StatusIcon status={step.status} />
                  {!isLast && <div className="w-px h-4 mt-1" style={{ background: "hsl(var(--border))" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-semibold truncate" style={{ color: "hsl(var(--foreground))" }}>{step.title}</span>
                    {step.durationMs !== undefined && (
                      <Mono className="text-[10px] text-muted-foreground">{formatDuration(step.durationMs)}</Mono>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="ml-9 mb-3 mt-1">
                  <pre
                    className="rounded-md p-3 text-[11px] overflow-auto max-h-60"
                    style={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontFamily: "'DM Mono', Menlo, monospace" }}
                  >
                    <code>{JSON.stringify(step.details, null, 2)}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap pt-3 mt-3" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <Mono className="text-[11px] text-muted-foreground">
          Total: {formatDuration(totalDurationMs)}
        </Mono>
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ color: statusColor(status), background: `${statusColor(status)}15` }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
