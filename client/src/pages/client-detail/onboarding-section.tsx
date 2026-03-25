import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Rocket,
  CalendarDays,
  FileText,
  Loader2,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

interface OnboardingStatus {
  workflowId: string;
  clientId: string;
  clientName: string;
  startDate: string;
  currentDay: number;
  progressPercent: number;
  currentMilestone: string;
  nextMilestone: string | null;
  completedMilestones: number;
  totalMilestones: number;
  overdueItems: string[];
  paperwork: {
    total: number;
    received: number;
    outstanding: string[];
  };
  status: "on_track" | "at_risk" | "behind" | "completed";
  steps: Array<{
    title: string;
    description: string;
    milestoneDay: number;
    milestoneCategory: string;
    completed: boolean;
    completedAt: string | null;
    deliverables: string[];
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  on_track: { label: "On Track", variant: "default", icon: CheckCircle2 },
  at_risk: { label: "At Risk", variant: "outline", icon: AlertTriangle },
  behind: { label: "Behind", variant: "destructive", icon: AlertTriangle },
  completed: { label: "Completed", variant: "secondary", icon: CheckCircle2 },
};

export function OnboardingSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();

  const { data: onboarding, isLoading } = useQuery<OnboardingStatus>({
    queryKey: ["/api/onboarding", clientId, "status"],
    queryFn: async () => {
      const res = await fetch(`/api/onboarding/${clientId}/status`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/onboarding/create", { clientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding", clientId, "status"] });
      toast({ title: "Onboarding workflow created" });
    },
    onError: () => toast({ title: "Failed to create onboarding", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!onboarding) {
    return (
      <Card style={V2_CARD} data-testid="card-no-onboarding">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Rocket className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Active Onboarding</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            Start a First 100 Days onboarding workflow for this client to track milestones, automate reminders, and ensure a smooth transition.
          </p>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            data-testid="button-start-onboarding"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start First 100 Days
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[onboarding.status] || STATUS_CONFIG.on_track;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6" data-testid="onboarding-section">
      <Card style={V2_CARD} data-testid="card-onboarding-overview">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
              <Rocket className="h-4 w-4" />
              First 100 Days Onboarding
            </CardTitle>
            <Badge variant={statusConfig.variant} data-testid="badge-onboarding-status">
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div data-testid="stat-current-day">
              <div className="text-2xl font-bold">{onboarding.currentDay}</div>
              <div className="text-xs text-muted-foreground">Current Day</div>
            </div>
            <div data-testid="stat-progress">
              <div className="text-2xl font-bold">{onboarding.progressPercent}%</div>
              <div className="text-xs text-muted-foreground">Progress</div>
            </div>
            <div data-testid="stat-milestones">
              <div className="text-2xl font-bold">{onboarding.completedMilestones}/{onboarding.totalMilestones}</div>
              <div className="text-xs text-muted-foreground">Milestones</div>
            </div>
            <div data-testid="stat-paperwork">
              <div className="text-2xl font-bold">{onboarding.paperwork.received}/{onboarding.paperwork.total}</div>
              <div className="text-xs text-muted-foreground">Documents</div>
            </div>
          </div>

          <div className="w-full bg-muted rounded-full h-2 mb-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${onboarding.progressPercent}%`,
                background: onboarding.status === "behind" ? "#ef4444" :
                  onboarding.status === "at_risk" ? "#f59e0b" : "#22c55e",
              }}
              data-testid="progress-bar"
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Started {onboarding.startDate}</span>
            <span>Day {onboarding.currentDay} of 100</span>
          </div>
        </CardContent>
      </Card>

      {onboarding.overdueItems.length > 0 && (
        <Card style={V2_CARD} className="border-destructive/30" data-testid="card-overdue-items">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue Items ({onboarding.overdueItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {onboarding.overdueItems.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <Clock className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card style={V2_CARD} data-testid="card-milestone-timeline">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Milestone Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(onboarding.steps || []).map((step, i) => {
              const isPast = onboarding.currentDay >= step.milestoneDay;
              const isCurrent = !step.completed && isPast;
              return (
                <div
                  key={i}
                  className={`flex gap-3 p-3 rounded-lg transition-colors ${
                    step.completed ? "bg-green-50 dark:bg-green-950/30" :
                    isCurrent ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" :
                    "bg-muted/50"
                  }`}
                  data-testid={`milestone-${i}`}
                >
                  <div className="shrink-0 mt-0.5">
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : isCurrent ? (
                      <Clock className="h-5 w-5 text-amber-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium ${step.completed ? "text-green-700 dark:text-green-400" : ""}`}>
                        {step.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        Day {step.milestoneDay}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {step.deliverables.map((d, j) => (
                        <div key={j} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <FileText className="h-3 w-3 shrink-0" />
                          {d}
                        </div>
                      ))}
                    </div>
                    {step.completedAt && (
                      <div className="text-[10px] text-green-600 mt-1">
                        Completed {new Date(step.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {onboarding.paperwork.outstanding.length > 0 && (
        <Card style={V2_CARD} data-testid="card-outstanding-docs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Outstanding Paperwork
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {onboarding.paperwork.outstanding.map((doc, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Circle className="h-3 w-3 shrink-0" />
                  {doc}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
