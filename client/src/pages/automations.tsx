import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Search,
  Filter,
  Plus,
  RotateCcw,
  Timer,
  User,
  GitBranch,
  Zap,
  Activity,
  ThumbsUp,
  ThumbsDown,
  Pause,
  StopCircle,
  Pencil,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { Serif } from "@/components/design/typography";

type PendingGateSummary = {
  id: string;
  gateName: string;
  expiresAt: string | null;
  escalationLevel: number;
};

type WorkflowInstanceEnriched = {
  id: string;
  definitionId: string;
  advisorId: string;
  clientId: string | null;
  meetingId: string | null;
  status: string;
  currentStepIndex: number;
  triggerPayload: Record<string, any>;
  context: Record<string, any>;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  pausedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  definitionName: string;
  definitionSlug: string;
  definitionCategory: string;
  clientName: string | null;
  totalSteps: number;
  completedSteps: number;
  completionSummary: string | null;
  pendingGateCount: number;
  pendingGates: PendingGateSummary[];
};

type StepExecution = {
  id: string;
  instanceId: string;
  stepIndex: number;
  stepName: string;
  stepType: string;
  status: string;
  inputPayload: Record<string, any>;
  outputPayload: Record<string, any> | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  durationMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
};

type WorkflowGate = {
  id: string;
  instanceId: string;
  stepExecutionId: string | null;
  gateName: string;
  gateType: string;
  ownerId: string;
  ownerRole: string;
  status: string;
  decision: string | null;
  decisionNote: string | null;
  timeoutHours: number;
  escalationLevel: number;
  escalatedAt: string | null;
  payload: Record<string, any>;
  decidedAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  workflowName?: string;
  clientName?: string | null;
  clientId?: string | null;
};

type InstanceDetail = WorkflowInstanceEnriched & {
  stepExecutions: StepExecution[];
  gates: WorkflowGate[];
};

type WorkflowDefinition = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  isActive: boolean;
};

type ClientInfo = {
  id: string;
  firstName: string;
  lastName: string;
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: P.lt, icon: Clock },
  running: { label: "Running", color: P.blue, icon: Play },
  awaiting_gate: { label: "Awaiting Gate", color: P.amb, icon: AlertTriangle },
  completed: { label: "Completed", color: P.grn, icon: CheckCircle2 },
  failed: { label: "Failed", color: P.red, icon: XCircle },
  cancelled: { label: "Cancelled", color: P.lt, icon: StopCircle },
  paused: { label: "Paused", color: P.amb, icon: Pause },
};

function getElapsedTime(startedAt: string | null) {
  if (!startedAt) return "—";
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days === 0 && hours === 0) return "Just now";
  if (days === 0) return `${hours}h`;
  if (days === 1) return "1 day";
  return `${days} days`;
}

function getTimeRemaining(expiresAt: string | null) {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  if (diffMs <= 0) return "Overdue";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <Badge
      className="gap-1 text-xs font-medium"
      style={{
        background: `${config.color}18`,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

function ProgressBar({ current, total, size = "md" }: { current: number; total: number; size?: "sm" | "md" }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const h = size === "sm" ? 4 : 6;
  return (
    <div
      style={{
        width: "100%",
        height: h,
        background: P.odBorder,
        borderRadius: 99,
        overflow: "hidden",
      }}
      data-testid="progress-bar"
    >
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: percent === 100 ? P.grn : P.blue,
          borderRadius: 99,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

function CountdownBadge({ expiresAt }: { expiresAt: string | null }) {
  const [remaining, setRemaining] = useState(getTimeRemaining(expiresAt));

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(expiresAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!remaining) return null;

  const isOverdue = remaining === "Overdue";
  const color = isOverdue ? P.red : P.amb;

  return (
    <Badge
      className="text-[10px] gap-0.5"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
      data-testid="badge-countdown"
    >
      <Timer className="w-2.5 h-2.5" />
      {remaining}
    </Badge>
  );
}

function renderMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="prose prose-sm max-w-none" style={{ fontSize: 12, lineHeight: 1.6 }}>
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <h4 key={i} style={{ fontWeight: 600, fontSize: 13, margin: "8px 0 4px" }}>{line.slice(4)}</h4>;
        if (line.startsWith("## ")) return <h3 key={i} style={{ fontWeight: 600, fontSize: 14, margin: "8px 0 4px" }}>{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={i} style={{ fontWeight: 700, fontSize: 15, margin: "8px 0 4px" }}>{line.slice(2)}</h2>;
        if (line.startsWith("- ")) return <li key={i} style={{ marginLeft: 16 }}>{line.slice(2)}</li>;
        if (line.startsWith("* ")) return <li key={i} style={{ marginLeft: 16 }}>{line.slice(2)}</li>;
        if (line.match(/^\d+\.\s/)) return <li key={i} style={{ marginLeft: 16, listStyleType: "decimal" }}>{line.replace(/^\d+\.\s/, "")}</li>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} style={{ fontWeight: 600 }}>{line.slice(2, -2)}</p>;
        if (line.trim() === "") return <br key={i} />;
        return <p key={i} style={{ margin: "2px 0" }}>{line}</p>;
      })}
    </div>
  );
}

function WorkflowCard({
  instance,
  onSelect,
}: {
  instance: WorkflowInstanceEnriched;
  onSelect: () => void;
}) {
  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={onSelect}
      data-testid={`card-workflow-${instance.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 15,
                  fontWeight: 600,
                  color: P.ink,
                }}
                data-testid={`text-workflow-name-${instance.id}`}
              >
                {instance.definitionName}
              </span>
              <StatusBadge status={instance.status} />
            </div>
            <div className="flex items-center gap-1.5 text-xs flex-wrap" style={{ color: P.mid }}>
              {instance.clientName && (
                <>
                  <User className="w-3 h-3" />
                  <span data-testid={`text-client-name-${instance.id}`}>{instance.clientName}</span>
                  <span>·</span>
                </>
              )}
              <Clock className="w-3 h-3" />
              <span>{getElapsedTime(instance.startedAt)}</span>
              {instance.definitionCategory && instance.definitionCategory !== "general" && (
                <>
                  <span>·</span>
                  <span style={{ textTransform: "capitalize" }}>{instance.definitionCategory}</span>
                </>
              )}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: P.lt }} />
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: P.mid }}>
            <span className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              Step {instance.currentStepIndex + 1}{instance.totalSteps > 0 ? ` of ${instance.totalSteps}` : ""}
            </span>
            <div className="flex items-center gap-2">
              {instance.totalSteps > 0 && (
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
                  {instance.completedSteps}/{instance.totalSteps}
                </span>
              )}
              {instance.pendingGateCount > 0 && (
                <Badge
                  className="text-[10px] gap-0.5"
                  style={{ background: `${P.amb}18`, color: P.amb, border: `1px solid ${P.amb}30` }}
                  data-testid={`badge-gate-count-${instance.id}`}
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {instance.pendingGateCount} gate{instance.pendingGateCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
          {instance.totalSteps > 0 && (
            <ProgressBar current={instance.completedSteps} total={instance.totalSteps} size="sm" />
          )}
        </div>

        {instance.status === "completed" && (
          <div className="mt-1 space-y-1">
            <div className="text-xs" style={{ color: P.grn }}>
              <CheckCircle2 className="w-3 h-3 inline mr-1" />
              Completed {instance.completedAt ? new Date(instance.completedAt).toLocaleDateString() : ""}
              {instance.completedSteps > 0 && ` · ${instance.completedSteps} steps processed`}
            </div>
            {instance.completionSummary && (
              <div
                className="text-xs p-2 rounded"
                style={{ background: `${P.grn}08`, color: P.dark, lineHeight: 1.5 }}
                data-testid={`text-completion-summary-${instance.id}`}
              >
                {instance.completionSummary.length > 150
                  ? `${instance.completionSummary.slice(0, 150)}...`
                  : instance.completionSummary}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs gap-1"
                style={{ color: P.blue }}
                onClick={(e) => { e.stopPropagation(); }}
                data-testid={`button-view-artifacts-${instance.id}`}
              >
                View Details
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {instance.error && (
          <div className="text-xs p-2 rounded mt-1" style={{ background: P.rL, color: P.red }}>
            {instance.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GateCard({
  gate,
  onReview,
}: {
  gate: WorkflowGate;
  onReview: () => void;
}) {
  return (
    <Card
      className="border-l-4 cursor-pointer hover:shadow-md transition-all"
      style={{ borderLeftColor: P.amb }}
      onClick={onReview}
      data-testid={`card-gate-${gate.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <AlertTriangle className="w-4 h-4" style={{ color: P.amb }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: P.ink }} data-testid={`text-gate-name-${gate.id}`}>
                {gate.gateName}
              </span>
            </div>
            <div className="text-xs" style={{ color: P.mid }}>
              {gate.workflowName || "Workflow"}{gate.clientName ? ` · ${gate.clientName}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CountdownBadge expiresAt={gate.expiresAt} />
            {gate.escalationLevel > 0 && (
              <Badge
                className="text-[10px]"
                style={{ background: `${P.red}18`, color: P.red, border: `1px solid ${P.red}30` }}
                data-testid={`badge-escalation-${gate.id}`}
              >
                L{gate.escalationLevel}
              </Badge>
            )}
          </div>
        </div>

        {gate.payload && Object.keys(gate.payload).length > 0 && (
          <div
            className="text-xs p-3 rounded-lg mb-3"
            style={{ background: P.bFr, color: P.dark, maxHeight: 120, overflow: "auto" }}
            data-testid={`text-gate-content-${gate.id}`}
          >
            {gate.payload.content ? renderMarkdown(String(gate.payload.content)) : (
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
                {JSON.stringify(gate.payload, null, 2)}
              </pre>
            )}
          </div>
        )}

        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); onReview(); }}
          className="gap-1"
          data-testid={`button-review-${gate.id}`}
        >
          Review
        </Button>
      </CardContent>
    </Card>
  );
}

function WorkflowDetailPanel({
  instanceId,
  onClose,
}: {
  instanceId: string;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const { data: detail, isLoading, isError } = useQuery<InstanceDetail>({
    queryKey: ["/api/workflow-automations/instances", instanceId],
    enabled: !!instanceId,
  });

  const gateActionMutation = useMutation({
    mutationFn: async ({ gateId, decision, decisionNote }: { gateId: string; decision: string; decisionNote?: string }) => {
      const res = await apiRequest("POST", `/api/workflow-automations/gates/${gateId}/action`, {
        decision,
        decisionNote,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Gate resolved", description: "The gate action has been processed." });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-automations/instances", instanceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-automations/instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-automations/gates/pending"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
          background: P.odSurf, borderLeft: `1px solid ${P.odBorder}`, zIndex: 50,
          display: "flex", flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(0,0,0,.08)",
        }}
        data-testid="panel-workflow-detail"
      >
        <div style={{ padding: 24 }}>
          <Skeleton className="h-6 w-48 mb-3" />
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-4 w-full mb-4" />
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 mb-2 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
          background: P.odSurf, borderLeft: `1px solid ${P.odBorder}`, zIndex: 50,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxShadow: "-8px 0 32px rgba(0,0,0,.08)",
        }}
        data-testid="panel-workflow-detail"
      >
        <XCircle className="w-8 h-8 mb-2" style={{ color: P.red }} />
        <div style={{ color: P.mid, fontSize: 13 }}>Failed to load details</div>
        <Button variant="outline" size="sm" className="mt-3" onClick={onClose} data-testid="button-close-detail">
          Close
        </Button>
      </div>
    );
  }

  const steps = detail.stepExecutions || [];
  const gates = detail.gates || [];

  return (
    <div
      style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
        background: P.odSurf, borderLeft: `1px solid ${P.odBorder}`, zIndex: 50,
        display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,.08)",
      }}
      data-testid="panel-workflow-detail"
    >
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${P.odBorder}` }}>
        <div className="flex items-center justify-between mb-3">
          <Serif style={{ fontSize: 18, fontWeight: 600, color: P.ink }} data-testid="text-detail-name">
            {detail.definitionName}
          </Serif>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-detail">
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <StatusBadge status={detail.status} />
          {detail.clientName && (
            <span className="text-xs" style={{ color: P.mid }}>
              <User className="w-3 h-3 inline mr-1" />
              {detail.clientName}
            </span>
          )}
          <span className="text-xs" style={{ color: P.mid }}>
            <Clock className="w-3 h-3 inline mr-1" />
            {getElapsedTime(detail.startedAt)}
          </span>
          <span className="text-xs" style={{ color: P.lt, fontFamily: "'DM Mono', monospace" }}>
            {detail.definitionSlug}
          </span>
        </div>
        {steps.length > 0 && (
          <div className="flex items-center gap-2">
            <ProgressBar
              current={steps.filter(s => s.status === "completed").length}
              total={steps.length}
            />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: P.mid, whiteSpace: "nowrap" }}>
              {steps.filter(s => s.status === "completed").length}/{steps.length}
            </span>
          </div>
        )}
        {detail.error && (
          <div className="text-xs p-2 rounded mt-2" style={{ background: P.rL, color: P.red }}>
            {detail.error}
          </div>
        )}
        {detail.status === "completed" && detail.completedAt && (
          <div className="text-xs mt-2" style={{ color: P.grn }}>
            <CheckCircle2 className="w-3 h-3 inline mr-1" />
            Completed {new Date(detail.completedAt).toLocaleDateString()}
            {steps.filter(s => s.status === "completed").length > 0 && ` · ${steps.filter(s => s.status === "completed").length} steps executed`}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
        {gates.filter(g => g.status === "pending").length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-medium mb-3" style={{ color: P.amb, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Gates Awaiting Action
            </div>
            <div className="space-y-2">
              {gates.filter(g => g.status === "pending").map(gate => (
                <Card key={gate.id} className="border-l-4" style={{ borderLeftColor: P.amb }} data-testid={`detail-gate-${gate.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontWeight: 600, fontSize: 12, color: P.ink }}>{gate.gateName}</span>
                      <CountdownBadge expiresAt={gate.expiresAt} />
                    </div>
                    {gate.payload?.content && (
                      <div className="text-xs p-2 rounded mb-2" style={{ background: P.bFr, maxHeight: 150, overflow: "auto" }}>
                        {renderMarkdown(String(gate.payload.content))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => gateActionMutation.mutate({ gateId: gate.id, decision: "approved" })}
                        disabled={gateActionMutation.isPending}
                        data-testid={`button-approve-gate-${gate.id}`}
                      >
                        <ThumbsUp className="w-3 h-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => gateActionMutation.mutate({ gateId: gate.id, decision: "rejected" })}
                        disabled={gateActionMutation.isPending}
                        data-testid={`button-reject-gate-${gate.id}`}
                      >
                        <ThumbsDown className="w-3 h-3" /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs font-medium mb-3" style={{ color: P.mid, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Step Timeline
        </div>
        <div className="space-y-1">
          {steps.sort((a, b) => a.stepIndex - b.stepIndex).map((step, i) => {
            const isCompleted = step.status === "completed";
            const isRunning = step.status === "running";
            const isFailed = step.status === "failed";
            const isPending = step.status === "pending";

            return (
              <div key={step.id} className="flex gap-3" data-testid={`timeline-step-${step.stepIndex}`}>
                <div className="flex flex-col items-center">
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isCompleted ? P.grn : isRunning ? P.blue : isFailed ? P.red : P.odBorder,
                      color: isCompleted || isRunning || isFailed ? "#fff" : P.lt,
                      fontSize: 11,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isFailed ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : isRunning ? (
                      <Play className="w-3.5 h-3.5" />
                    ) : (
                      step.stepIndex + 1
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      style={{
                        width: 2,
                        flex: 1,
                        minHeight: 20,
                        background: isCompleted ? P.grn : P.odBorder,
                      }}
                    />
                  )}
                </div>
                <div className="pb-4 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isRunning ? 600 : 500,
                        color: isPending ? P.lt : P.ink,
                      }}
                      data-testid={`text-step-name-${step.stepIndex}`}
                    >
                      {step.stepName}
                    </span>
                    <span className="text-[10px]" style={{ color: P.lt, fontFamily: "'DM Mono', monospace" }}>
                      {step.stepType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {step.durationMs != null && (
                      <span className="text-xs" style={{ color: P.lt }}>
                        {step.durationMs >= 1000 ? `${(step.durationMs / 1000).toFixed(1)}s` : `${step.durationMs}ms`}
                      </span>
                    )}
                    {step.completedAt && (
                      <span className="text-xs" style={{ color: P.lt }}>
                        {step.durationMs != null ? " · " : ""}Completed {new Date(step.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {step.error && (
                    <div className="text-xs mt-1 p-2 rounded" style={{ background: P.rL, color: P.rD }}>
                      {step.error}
                    </div>
                  )}
                  {step.outputPayload && Object.keys(step.outputPayload).length > 0 && (
                    <details className="mt-1">
                      <summary className="text-xs cursor-pointer" style={{ color: P.blue }} data-testid={`toggle-output-${step.stepIndex}`}>
                        View output
                      </summary>
                      <div className="text-xs p-2 rounded mt-1 border" style={{ background: P.bFr, maxHeight: 150, overflow: "auto" }}>
                        {step.outputPayload.content ? (
                          renderMarkdown(String(step.outputPayload.content))
                        ) : (
                          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
                            {JSON.stringify(step.outputPayload, null, 2)}
                          </pre>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {gates.filter(g => g.status !== "pending").length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-medium mb-2" style={{ color: P.mid, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Resolved Gates
            </div>
            {gates.filter(g => g.status !== "pending").map(gate => (
              <div key={gate.id} className="text-xs p-2 rounded mb-1 border" data-testid={`resolved-gate-${gate.id}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ fontWeight: 600 }}>{gate.gateName}</span>
                  <Badge
                    className="text-[10px]"
                    style={{
                      background: gate.decision === "approved" ? `${P.grn}18` : `${P.red}18`,
                      color: gate.decision === "approved" ? P.grn : P.red,
                      border: `1px solid ${gate.decision === "approved" ? P.grn : P.red}30`,
                    }}
                  >
                    {gate.decision || gate.status}
                  </Badge>
                </div>
                {gate.decisionNote && (
                  <div style={{ color: P.mid }}>{gate.decisionNote}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type MeetingInfo = {
  id: string;
  title: string;
  startTime: string;
  status: string;
  clientId: string | null;
};

function StartWorkflowDialog({
  open,
  onOpenChange,
  preselectedClientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
}) {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState(preselectedClientId || "");
  const [selectedDefinition, setSelectedDefinition] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState("");

  useEffect(() => {
    if (preselectedClientId) setSelectedClient(preselectedClientId);
  }, [preselectedClientId]);

  const { data: clientsRaw } = useQuery<any>({
    queryKey: ["/api/clients"],
  });
  // /api/clients returns { clients: [...] } when MuleSoft/pagination is active,
  // or a raw array from local DB without params. Normalize to always be an array.
  const clients: ClientInfo[] = Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw?.clients ?? []);

  const { data: definitions = [] } = useQuery<WorkflowDefinition[]>({
    queryKey: ["/api/workflow-automations/definitions"],
  });

  const { data: meetings = [] } = useQuery<MeetingInfo[]>({
    queryKey: ["/api/meetings"],
  });

  const activeDefinitions = definitions.filter(d => d.isActive);

  const filteredMeetings = useMemo(() => {
    if (!selectedClient) return meetings;
    return meetings.filter(m => m.clientId === selectedClient);
  }, [meetings, selectedClient]);

  const selectedDef = activeDefinitions.find(d => d.id === selectedDefinition);
  const isMeetingRelated = selectedDef?.category === "meeting" || selectedDef?.slug?.includes("meeting");

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string | undefined> = {
        definitionId: selectedDefinition,
        clientId: selectedClient || undefined,
      };
      if (selectedMeeting) {
        payload.meetingId = selectedMeeting;
      }
      const res = await apiRequest("POST", "/api/workflow-automations/trigger", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Workflow triggered", description: "The workflow automation has been started." });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-automations/instances"] });
      onOpenChange(false);
      setSelectedClient(preselectedClientId || "");
      setSelectedDefinition("");
      setSelectedMeeting("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-start-workflow">
        <DialogHeader>
          <DialogTitle>Start Workflow</DialogTitle>
          <DialogDescription>Select a workflow definition and optionally a client or meeting to begin automation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Workflow Definition</Label>
            <Select value={selectedDefinition} onValueChange={setSelectedDefinition}>
              <SelectTrigger data-testid="select-definition">
                <SelectValue placeholder="Select a workflow..." />
              </SelectTrigger>
              <SelectContent>
                {activeDefinitions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                    {d.category !== "general" ? ` (${d.category})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Client {preselectedClientId ? "" : "(optional)"}</Label>
            <Select value={selectedClient} onValueChange={(val) => { setSelectedClient(val); setSelectedMeeting(""); }}>
              <SelectTrigger data-testid="select-client">
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(isMeetingRelated || filteredMeetings.length > 0) && (
            <div className="space-y-2">
              <Label>Meeting {isMeetingRelated ? "(recommended)" : "(optional)"}</Label>
              <Select value={selectedMeeting} onValueChange={setSelectedMeeting}>
                <SelectTrigger data-testid="select-meeting">
                  <SelectValue placeholder="Select a meeting..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredMeetings.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title || "Untitled"} ({new Date(m.startTime).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-start">
            Cancel
          </Button>
          <Button
            onClick={() => triggerMutation.mutate()}
            disabled={!selectedDefinition || triggerMutation.isPending}
            data-testid="button-confirm-start"
          >
            {triggerMutation.isPending ? (
              <RotateCcw className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Play className="w-4 h-4 mr-1" />
            )}
            Start Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GateActionModal({
  open,
  onOpenChange,
  gate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gate: WorkflowGate | null;
}) {
  const { toast } = useToast();
  const [editedContent, setEditedContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [restartStep, setRestartStep] = useState(false);

  useEffect(() => {
    if (gate?.payload?.content) {
      setEditedContent(String(gate.payload.content));
    }
    setIsEditing(false);
    setShowRejectForm(false);
    setRejectReason("");
    setRestartStep(false);
  }, [gate]);

  const gateActionMutation = useMutation({
    mutationFn: async ({ decision, decisionNote }: { decision: string; decisionNote?: string }) => {
      let note = decisionNote || "";
      if (isEditing && editedContent !== String(gate?.payload?.content || "")) {
        note = note ? `${note}\n\nEdited content:\n${editedContent}` : `Edited content:\n${editedContent}`;
      }
      if (restartStep) {
        note = note ? `${note}\n\n[RESTART_STEP: true]` : "[RESTART_STEP: true]";
      }
      const res = await apiRequest("POST", `/api/workflow-automations/gates/${gate!.id}/action`, {
        decision,
        decisionNote: note || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Gate resolved", description: "Your decision has been recorded." });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-automations/instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-automations/gates/pending"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (!gate) return null;

  const hasContent = gate.payload?.content;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-auto" data-testid="dialog-gate-action">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: P.amb }} />
            {gate.gateName}
          </DialogTitle>
          <DialogDescription>
            {gate.workflowName || "Workflow"}
            {gate.clientName ? ` · ${gate.clientName}` : ""}
            {gate.expiresAt && (
              <span className="ml-2">
                · <Timer className="w-3 h-3 inline" /> {getTimeRemaining(gate.expiresAt)} remaining
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {hasContent && !isEditing && (
            <div className="relative">
              <div
                className="text-sm p-4 rounded-lg border"
                style={{ background: P.bFr, maxHeight: 300, overflow: "auto" }}
                data-testid="text-gate-artifact"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-xs" style={{ color: P.mid }}>AI-Generated Content</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => setIsEditing(true)}
                    data-testid="button-edit-content"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                </div>
                {renderMarkdown(String(gate.payload.content))}
              </div>
            </div>
          )}

          {hasContent && isEditing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Edit Content</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setIsEditing(false)}
                  data-testid="button-preview-content"
                >
                  Preview
                </Button>
              </div>
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={10}
                className="font-mono text-xs"
                data-testid="input-edit-content"
              />
            </div>
          )}

          {!hasContent && gate.payload && Object.keys(gate.payload).length > 0 && (
            <div className="text-sm p-3 rounded-lg" style={{ background: P.odSurf2 }}>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
                {JSON.stringify(gate.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {showRejectForm && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Reason for rejection or requested changes</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain what needs to change..."
                rows={3}
                data-testid="input-reject-reason"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: P.mid }}>
              <input
                type="checkbox"
                checked={restartStep}
                onChange={(e) => setRestartStep(e.target.checked)}
                className="rounded"
                data-testid="checkbox-restart-step"
              />
              <RotateCcw className="w-3 h-3" />
              Restart this step after changes
            </label>
          </div>
        )}

        <DialogFooter>
          {!showRejectForm ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                className="gap-1"
                disabled={gateActionMutation.isPending}
                data-testid="button-modal-reject"
              >
                <ThumbsDown className="w-4 h-4" />
                Reject / Changes
              </Button>
              <Button
                onClick={() => gateActionMutation.mutate({ decision: "approved" })}
                className="gap-1"
                disabled={gateActionMutation.isPending}
                data-testid="button-modal-approve"
              >
                {gateActionMutation.isPending ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsUp className="w-4 h-4" />
                )}
                Approve
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setShowRejectForm(false); setRestartStep(false); }} data-testid="button-back-reject">
                Back
              </Button>
              <Button
                variant="outline"
                onClick={() => gateActionMutation.mutate({ decision: "request_changes", decisionNote: rejectReason })}
                disabled={gateActionMutation.isPending}
                data-testid="button-request-changes"
              >
                Request Changes
              </Button>
              <Button
                variant="destructive"
                onClick={() => gateActionMutation.mutate({ decision: "rejected", decisionNote: rejectReason })}
                disabled={gateActionMutation.isPending}
                data-testid="button-confirm-reject"
              >
                Reject
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AutomationsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedClientId = urlParams.get("clientId") || undefined;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>(preselectedClientId || "all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [selectedGate, setSelectedGate] = useState<WorkflowGate | null>(null);

  const { data: instances = [], isLoading, isError, error: queryError, refetch } = useQuery<WorkflowInstanceEnriched[]>({
    queryKey: ["/api/workflow-automations/instances"],
    staleTime: Infinity, // SSE "workflow:*" events invalidate this — no polling needed
    gcTime: 30 * 60 * 1000,
  });

  const { data: pendingGates = [] } = useQuery<WorkflowGate[]>({
    queryKey: ["/api/workflow-automations/gates/pending"],
    staleTime: Infinity, // SSE "workflow:gate_created" invalidates this
    gcTime: 30 * 60 * 1000,
  });

  const { data: definitions = [] } = useQuery<WorkflowDefinition[]>({
    queryKey: ["/api/workflow-automations/definitions"],
  });

  const uniqueClients = useMemo(() => {
    const map = new Map<string, string>();
    instances.forEach(inst => {
      if (inst.clientId && inst.clientName) {
        map.set(inst.clientId, inst.clientName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [instances]);

  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    instances.forEach(inst => {
      if (inst.definitionCategory) set.add(inst.definitionCategory);
    });
    return Array.from(set).sort();
  }, [instances]);

  const filteredInstances = useMemo(() => {
    return instances.filter((inst) => {
      if (statusFilter !== "all") {
        if (statusFilter === "awaiting_gate") {
          if (inst.pendingGateCount === 0 && inst.status !== "awaiting_gate") return false;
        } else if (inst.status !== statusFilter) {
          return false;
        }
      }
      if (clientFilter !== "all" && inst.clientId !== clientFilter) return false;
      if (typeFilter !== "all" && inst.definitionCategory !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          inst.definitionName.toLowerCase().includes(q) ||
          inst.definitionSlug.toLowerCase().includes(q) ||
          (inst.clientName || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [instances, statusFilter, clientFilter, typeFilter, searchQuery]);

  const activeInstances = useMemo(
    () => filteredInstances.filter((i) => ["pending", "running", "awaiting_gate", "paused"].includes(i.status)),
    [filteredInstances]
  );

  const completedInstances = useMemo(
    () => filteredInstances.filter((i) => i.status === "completed"),
    [filteredInstances]
  );

  const failedInstances = useMemo(
    () => filteredInstances.filter((i) => ["failed", "cancelled"].includes(i.status)),
    [filteredInstances]
  );

  const stats = useMemo(() => ({
    total: instances.length,
    active: instances.filter((i) => ["pending", "running", "awaiting_gate", "paused"].includes(i.status)).length,
    completed: instances.filter((i) => i.status === "completed").length,
    gates: pendingGates.length,
  }), [instances, pendingGates]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16" data-testid="text-error-state">
        <XCircle className="w-10 h-10 mx-auto mb-3" style={{ color: P.red }} />
        <div style={{ fontSize: 15, fontWeight: 500, color: P.dark }}>
          Failed to load workflow automations
        </div>
        <div className="text-xs mt-1 mb-4" style={{ color: P.mid }}>
          {queryError instanceof Error ? queryError.message : "An unexpected error occurred."}
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-1.5" data-testid="button-retry">
          <RotateCcw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-automations">
      <div className="flex items-center justify-between">
        <div>
          <Serif style={{ fontSize: 20, fontWeight: 600, color: P.ink }} data-testid="text-page-title">
            Workflow Automations
          </Serif>
          <div className="text-sm mt-0.5" style={{ color: P.mid }}>
            Monitor, manage, and trigger your workflow automations.
          </div>
        </div>
        <Button
          onClick={() => setShowStartDialog(true)}
          className="gap-1.5"
          data-testid="button-start-workflow"
        >
          <Plus className="w-4 h-4" />
          Start Workflow
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Workflows", value: stats.total, icon: Activity, color: P.blue },
          { label: "Active", value: stats.active, icon: Play, color: P.blue },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: P.grn },
          { label: "Gates Pending", value: stats.gates, icon: AlertTriangle, color: P.amb },
        ].map((stat) => (
          <Card key={stat.label} data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `${stat.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: stat.color,
                  }}
                >
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 22,
                      fontWeight: 700,
                      color: P.ink,
                    }}
                    data-testid={`text-stat-value-${stat.label.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs" style={{ color: P.mid }}>
                    {stat.label}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingGates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: P.amb }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: P.ink }}>
              Needs Your Attention
            </span>
            <Badge
              className="text-xs"
              style={{ background: `${P.amb}18`, color: P.amb, border: `1px solid ${P.amb}30` }}
              data-testid="badge-gates-count"
            >
              {pendingGates.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingGates.map((gate) => (
              <GateCard
                key={gate.id}
                gate={gate}
                onReview={() => setSelectedGate(gate)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: P.lt }} />
            <Input
              placeholder="Search workflows or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <Filter className="w-3.5 h-3.5 mr-1.5" style={{ color: P.lt }} />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="awaiting_gate">Awaiting Gate</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {uniqueClients.length > 0 && (
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-44" data-testid="select-client-filter">
                <User className="w-3.5 h-3.5 mr-1.5" style={{ color: P.lt }} />
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {uniqueClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {uniqueTypes.length > 1 && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40" data-testid="select-type-filter">
                <GitBranch className="w-3.5 h-3.5 mr-1.5" style={{ color: P.lt }} />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    <span style={{ textTransform: "capitalize" }}>{t}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {activeInstances.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Play className="w-4 h-4" style={{ color: P.blue }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: P.ink }}>Active Workflows</span>
              <span className="text-xs" style={{ color: P.lt }}>
                ({activeInstances.length})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeInstances.map((inst) => (
                <WorkflowCard key={inst.id} instance={inst} onSelect={() => setSelectedInstanceId(inst.id)} />
              ))}
            </div>
          </div>
        )}

        {completedInstances.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4" style={{ color: P.grn }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: P.ink }}>Recent Completions</span>
              <span className="text-xs" style={{ color: P.lt }}>
                ({completedInstances.length})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {completedInstances.map((inst) => (
                <WorkflowCard key={inst.id} instance={inst} onSelect={() => setSelectedInstanceId(inst.id)} />
              ))}
            </div>
          </div>
        )}

        {failedInstances.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4" style={{ color: P.red }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: P.ink }}>Failed / Cancelled</span>
              <span className="text-xs" style={{ color: P.lt }}>
                ({failedInstances.length})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {failedInstances.map((inst) => (
                <WorkflowCard key={inst.id} instance={inst} onSelect={() => setSelectedInstanceId(inst.id)} />
              ))}
            </div>
          </div>
        )}

        {filteredInstances.length === 0 && (
          <div className="text-center py-16" data-testid="text-empty-state">
            <Zap className="w-10 h-10 mx-auto mb-3" style={{ color: P.lt }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: P.mid }}>
              {searchQuery || statusFilter !== "all" || clientFilter !== "all" || typeFilter !== "all"
                ? "No workflows match your filters"
                : "No workflow automations yet"}
            </div>
            <div className="text-xs mt-1" style={{ color: P.lt }}>
              {searchQuery || statusFilter !== "all" || clientFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Start a workflow to begin automating client processes."}
            </div>
            {!searchQuery && statusFilter === "all" && clientFilter === "all" && typeFilter === "all" && (
              <Button
                className="mt-4 gap-1.5"
                onClick={() => setShowStartDialog(true)}
                data-testid="button-start-workflow-empty"
              >
                <Plus className="w-4 h-4" />
                Start Workflow
              </Button>
            )}
          </div>
        )}
      </div>

      {selectedInstanceId && (
        <WorkflowDetailPanel
          instanceId={selectedInstanceId}
          onClose={() => setSelectedInstanceId(null)}
        />
      )}

      <StartWorkflowDialog open={showStartDialog} onOpenChange={setShowStartDialog} preselectedClientId={preselectedClientId} />

      <GateActionModal
        open={!!selectedGate}
        onOpenChange={(open) => !open && setSelectedGate(null)}
        gate={selectedGate}
      />
    </div>
  );
}
