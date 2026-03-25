import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Target,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  TrendingUp,
  Shield,
  Wallet,
  CheckCircle2,
  ArrowRight,
  Brain,
} from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { formatCurrency } from "./shared";
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";
import { GoalsPipeline } from "@/components/charts/goals-pipeline";

interface BucketData {
  id: number;
  name: string;
  description: string;
  currentValue: number;
  targetValue: number;
  currentPct: number;
  targetPct: number;
  fundedRatio: number;
}

interface BucketAnalysis {
  totalPortfolio: number;
  buckets: BucketData[];
  aggregateFundedRatio: number;
  suggestions: string[];
  goalsCount: number;
}

interface Goal {
  id: string;
  clientId: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  timeHorizonYears: number;
  priority: string;
  bucket: number;
  linkedAccountIds: string[];
  status: string;
  notes: string | null;
}

const BUCKET_CONFIG = [
  { id: 1, icon: Wallet, color: P.blue, bg: "rgba(107,143,224,.12)", label: "Bucket 1", name: "Cash & Short-Term", horizon: "1-2 years" },
  { id: 2, icon: Shield, color: P.amb, bg: "rgba(184,135,43,.12)", label: "Bucket 2", name: "Bonds & Intermediate", horizon: "3-7 years" },
  { id: 3, icon: TrendingUp, color: P.grn, bg: "rgba(61,139,94,.12)", label: "Bucket 3", name: "Equities & Growth", horizon: "8+ years" },
];

function FundedBar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div style={{ width: "100%", height: 8, borderRadius: 4, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.min(100, ratio)}%`,
          height: "100%",
          borderRadius: 4,
          background: color,
          transition: "width .5s ease",
        }}
      />
    </div>
  );
}

function BucketCard({ bucket, goals }: { bucket: BucketData; goals: Goal[] }) {
  const config = BUCKET_CONFIG.find(c => c.id === bucket.id)!;
  const Icon = config.icon;
  const bucketGoals = goals.filter(g => g.bucket === bucket.id);

  return (
    <Card className="border-0" style={{ ...V2_CARD, background: P.odBg }} data-testid={`card-bucket-${bucket.id}`}>
      <CardHeader className="pb-3">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: config.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon style={{ width: 18, height: 18, color: config.color }} />
          </div>
          <div style={{ flex: 1 }}>
            <CardTitle style={{ fontSize: 14, color: P.nText, fontWeight: 600, margin: 0 }}>
              {config.label}: {config.name}
            </CardTitle>
            <span style={{ fontSize: 11, color: P.nMid }}>{config.horizon}</span>
          </div>
          <Badge
            variant="secondary"
            className=""
            style={{
              background: bucket.fundedRatio >= 90 ? "rgba(61,139,94,.15)" : bucket.fundedRatio >= 50 ? "rgba(184,135,43,.15)" : "rgba(196,75,75,.15)",
              color: bucket.fundedRatio >= 90 ? P.grn : bucket.fundedRatio >= 50 ? P.amb : P.red,
              fontSize: 13,
            }}
            data-testid={`badge-funded-ratio-${bucket.id}`}
          >
            {bucket.fundedRatio.toFixed(0)}% Funded
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: P.nMid }}>Current: <span style={{ color: P.nText, fontWeight: 600 }}>{formatCurrency(bucket.currentValue)}</span></span>
          <span style={{ color: P.nMid }}>Target: <span style={{ color: P.nText, fontWeight: 600 }}>{formatCurrency(bucket.targetValue)}</span></span>
        </div>
        <FundedBar ratio={bucket.fundedRatio} color={config.color} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: P.nMid }}>
          <span>Allocation: {bucket.currentPct.toFixed(1)}%</span>
          <span>Target: {bucket.targetPct.toFixed(1)}%</span>
        </div>

        {bucketGoals.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 10, color: P.nMid, textTransform: "uppercase", letterSpacing: ".06em" }}>Linked Goals</span>
            <div style={{ marginTop: 4 }} className="space-y-1.5">
              {bucketGoals.map(goal => {
                const goalFunded = parseFloat(goal.targetAmount) > 0
                  ? Math.min(100, (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100) : 0;
                return (
                  <div key={goal.id} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                    borderRadius: 6, background: "rgba(255,255,255,.04)",
                  }} data-testid={`goal-item-${goal.id}`}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: P.nText, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {goal.name}
                      </div>
                      <div style={{ fontSize: 10, color: P.nMid }}>
                        {formatCurrency(parseFloat(goal.currentAmount))} / {formatCurrency(parseFloat(goal.targetAmount))}
                        {goal.linkedAccountIds && (goal.linkedAccountIds as string[]).length > 0 && (
                          <span style={{ marginLeft: 4, color: P.bHi }}>
                            · {(goal.linkedAccountIds as string[]).length} account{(goal.linkedAccountIds as string[]).length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className=""
                      style={{ fontSize: 10, padding: "1px 6px", borderColor: "rgba(255,255,255,.12)" }}
                    >
                      {goal.priority}
                    </Badge>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: goalFunded >= 90 ? P.grn : goalFunded >= 50 ? P.amb : P.red,
                    }}>
                      {goalFunded.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {bucketGoals.length === 0 && (
          <div style={{ fontSize: 11, color: P.nMid, textAlign: "center", padding: "8px 0" }}>
            No goals assigned to this bucket
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LinkedAccountBadges({ linkedAccountIds, accounts }: { linkedAccountIds: string[]; accounts: any[] }) {
  if (!linkedAccountIds || linkedAccountIds.length === 0) return null;
  const linked = accounts.filter((a: any) => linkedAccountIds.includes(a.id));
  if (linked.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
      {linked.map((a: any) => (
        <span key={a.id} style={{
          fontSize: 10, padding: "1px 5px", borderRadius: 3,
          background: "rgba(107,143,224,.1)", color: P.bHi,
        }}>
          {a.accountType}
        </span>
      ))}
    </div>
  );
}

export function GoalsSection({ clientId, accounts }: { clientId: string; accounts: any[] }) {
  const { toast } = useToast();
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("0");
  const [goalHorizon, setGoalHorizon] = useState("5");
  const [goalPriority, setGoalPriority] = useState("medium");
  const [goalBucket, setGoalBucket] = useState("1");
  const [goalNotes, setGoalNotes] = useState("");
  const [goalLinkedAccounts, setGoalLinkedAccounts] = useState<string[]>([]);

  const { data: goals, isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/clients", clientId, "goals"],
    staleTime: 15 * 60 * 1000,
  });

  const { data: bucketAnalysis, isLoading: analysisLoading } = useQuery<BucketAnalysis>({
    queryKey: ["/api/clients", clientId, "bucket-analysis"],
    staleTime: 15 * 60 * 1000,
  });

  const createGoalMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/clients/${clientId}/goals`, {
        name: goalName,
        targetAmount: goalTarget,
        currentAmount: goalCurrent,
        timeHorizonYears: goalHorizon,
        priority: goalPriority,
        bucket: goalBucket,
        linkedAccountIds: goalLinkedAccounts,
        notes: goalNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "bucket-analysis"] });
      setShowNewGoal(false);
      resetForm();
      toast({ title: "Goal created successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error creating goal", description: err.message, variant: "destructive" });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async () => {
      if (!editingGoal) return;
      await apiRequest("PATCH", `/api/clients/${clientId}/goals/${editingGoal.id}`, {
        name: goalName,
        targetAmount: goalTarget,
        currentAmount: goalCurrent,
        timeHorizonYears: goalHorizon,
        priority: goalPriority,
        bucket: goalBucket,
        linkedAccountIds: goalLinkedAccounts,
        notes: goalNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "bucket-analysis"] });
      setEditingGoal(null);
      resetForm();
      toast({ title: "Goal updated successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error updating goal", description: err.message, variant: "destructive" });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      await apiRequest("DELETE", `/api/clients/${clientId}/goals/${goalId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "goals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "bucket-analysis"] });
      toast({ title: "Goal deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error deleting goal", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setGoalName("");
    setGoalTarget("");
    setGoalCurrent("0");
    setGoalHorizon("5");
    setGoalPriority("medium");
    setGoalBucket("1");
    setGoalNotes("");
    setGoalLinkedAccounts([]);
  }

  function openEdit(goal: Goal) {
    setGoalName(goal.name);
    setGoalTarget(goal.targetAmount);
    setGoalCurrent(goal.currentAmount);
    setGoalHorizon(String(goal.timeHorizonYears));
    setGoalPriority(goal.priority);
    setGoalBucket(String(goal.bucket));
    setGoalNotes(goal.notes || "");
    setGoalLinkedAccounts(goal.linkedAccountIds || []);
    setEditingGoal(goal);
  }

  if (goalsLoading || analysisLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  const safeGoals = goals || [];
  const analysis = bucketAnalysis;

  return (
    <div className="space-y-6 animate-slide-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: P.nText, fontFamily: "'Cormorant Garamond', serif" }}>
            Goals & Bucket Strategy
          </h2>
          <p style={{ fontSize: 12, color: P.nMid, marginTop: 2 }}>
            3-bucket approach: Cash (1-2yr), Bonds (3-7yr), Growth (8+yr)
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CassidyAnalysisButton
            taskType="analysis"
            clientId={clientId}
            context={{
              section: "goals",
              totalPortfolio: analysis?.totalPortfolio || 0,
              aggregateFundedRatio: analysis?.aggregateFundedRatio || 0,
              goalsCount: analysis?.goalsCount || 0,
              buckets: (analysis?.buckets || []).map((b: BucketData) => ({
                name: BUCKET_CONFIG.find(c => c.id === b.id)?.name || `Bucket ${b.id}`,
                currentValue: b.currentValue,
                targetValue: b.targetValue,
                fundedRatio: b.fundedRatio,
                currentPct: b.currentPct,
                targetPct: b.targetPct,
              })),
              goals: safeGoals.slice(0, 10).map(g => ({
                name: g.name,
                targetAmount: g.targetAmount,
                currentAmount: g.currentAmount,
                timeHorizonYears: g.timeHorizonYears,
                priority: g.priority,
                bucket: g.bucket,
                status: g.status,
              })),
              suggestions: analysis?.suggestions || [],
            }}
            label="AI Feasibility Check"
            icon={<Brain style={{ width: 16, height: 16 }} />}
            size="sm"
          />
          <Button
            onClick={() => { resetForm(); setShowNewGoal(true); }}
            size="sm"
            data-testid="button-add-goal"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Goal
          </Button>
        </div>
      </div>

      {analysis && (
        <div style={{
          display: "flex", alignItems: "center", gap: 20, padding: "16px 20px",
          borderRadius: 8, background: P.odBg,
        }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 10, color: P.nMid, textTransform: "uppercase", letterSpacing: ".06em" }}>Total Portfolio</span>
            <div style={{ fontSize: 22, fontWeight: 700, color: P.nText, fontFamily: "'DM Mono', monospace" }} data-testid="text-total-portfolio">
              {formatCurrency(analysis.totalPortfolio)}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 10, color: P.nMid, textTransform: "uppercase", letterSpacing: ".06em" }}>Aggregate Funded</span>
            <div style={{
              fontSize: 28, fontWeight: 700, fontFamily: "'DM Mono', monospace",
              color: analysis.aggregateFundedRatio >= 90 ? P.grn : analysis.aggregateFundedRatio >= 60 ? P.amb : P.red,
            }} data-testid="text-aggregate-funded">
              {analysis.aggregateFundedRatio.toFixed(0)}%
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 10, color: P.nMid, textTransform: "uppercase", letterSpacing: ".06em" }}>Goals</span>
            <div style={{ fontSize: 22, fontWeight: 700, color: P.nText, fontFamily: "'DM Mono', monospace" }} data-testid="text-goals-count">
              {analysis.goalsCount}
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <GoalsPipeline
          buckets={analysis.buckets}
          totalPortfolio={analysis.totalPortfolio}
        />
      )}

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {analysis.buckets.map(bucket => (
            <BucketCard key={bucket.id} bucket={bucket} goals={safeGoals} />
          ))}
        </div>
      )}

      {analysis && analysis.suggestions.length > 0 && (
        <Card className="border-0" style={{ ...V2_CARD, background: P.odBg }}>
          <CardHeader className="pb-2">
            <CardTitle style={{ fontSize: 14, color: P.nText, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle style={{ width: 16, height: 16, color: P.amb }} />
              Rebalancing Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.suggestions.map((suggestion, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px",
                borderRadius: 6, background: "rgba(184,135,43,.06)",
              }} data-testid={`suggestion-${i}`}>
                <ArrowRight style={{ width: 14, height: 14, color: P.amb, marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: P.nText, lineHeight: 1.5 }}>{suggestion}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {safeGoals.length > 0 && (
        <Card className="border-0" style={{ ...V2_CARD, background: P.odBg }}>
          <CardHeader className="pb-2">
            <CardTitle style={{ fontSize: 14, color: P.nText, display: "flex", alignItems: "center", gap: 8 }}>
              <Target style={{ width: 16, height: 16, color: P.blue }} />
              All Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {safeGoals.map(goal => {
                const funded = parseFloat(goal.targetAmount) > 0
                  ? Math.min(100, (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100) : 0;
                const bucketConfig = BUCKET_CONFIG.find(c => c.id === goal.bucket)!;
                return (
                  <div key={goal.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                    borderRadius: 8, background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.06)",
                  }} data-testid={`goal-row-${goal.id}`}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 6, background: bucketConfig.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <bucketConfig.icon style={{ width: 16, height: 16, color: bucketConfig.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: P.nText }}>{goal.name}</span>
                        <Badge variant="outline" className="" style={{ fontSize: 10, padding: "0px 5px", borderColor: "rgba(255,255,255,.12)" }}>
                          {bucketConfig.label}
                        </Badge>
                        <Badge variant="outline" className="" style={{ fontSize: 10, padding: "0px 5px", borderColor: "rgba(255,255,255,.12)" }}>
                          {goal.priority}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 11, color: P.nMid, marginTop: 2 }}>
                        {formatCurrency(parseFloat(goal.currentAmount))} / {formatCurrency(parseFloat(goal.targetAmount))} · {goal.timeHorizonYears}yr horizon
                        <LinkedAccountBadges linkedAccountIds={(goal.linkedAccountIds || []) as string[]} accounts={accounts} />
                      </div>
                    </div>
                    <div style={{ width: 80 }}>
                      <FundedBar ratio={funded} color={bucketConfig.color} />
                      <div style={{ fontSize: 10, color: P.nMid, textAlign: "right", marginTop: 2 }}>{funded.toFixed(0)}%</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => openEdit(goal)}
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,.1)",
                          background: "transparent", color: P.nMid, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        data-testid={`button-edit-goal-${goal.id}`}
                      >
                        <Edit2 style={{ width: 12, height: 12 }} />
                      </button>
                      <button
                        onClick={() => deleteGoalMutation.mutate(goal.id)}
                        style={{
                          width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,.1)",
                          background: "transparent", color: P.red, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                        data-testid={`button-delete-goal-${goal.id}`}
                      >
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {safeGoals.length === 0 && (
        <Card className="border-0" style={{ ...V2_CARD, background: P.odBg }}>
          <CardContent>
            <EmptyState
              icon={Target}
              title="No financial goals yet"
              description="Create goals with target amounts and time horizons to see how current portfolio allocations map to the 3-bucket strategy."
              actionLabel="Create First Goal"
              actionIcon={Plus}
              onAction={() => { resetForm(); setShowNewGoal(true); }}
              timeEstimate="Takes about 3 minutes per goal"
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={showNewGoal || !!editingGoal} onOpenChange={(open) => { if (!open) { setShowNewGoal(false); setEditingGoal(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-goal-dialog-title">{editingGoal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
            <DialogDescription>
              {editingGoal ? "Update the goal details below." : "Define a financial goal and assign it to a bucket based on time horizon."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Goal Name</Label>
              <Input
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="e.g., Emergency Fund, College Fund"
                data-testid="input-goal-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Amount ($)</Label>
                <Input
                  type="number"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  placeholder="100000"
                  data-testid="input-goal-target"
                />
              </div>
              <div className="space-y-2">
                <Label>Current Amount ($)</Label>
                <Input
                  type="number"
                  value={goalCurrent}
                  onChange={(e) => setGoalCurrent(e.target.value)}
                  placeholder="0"
                  data-testid="input-goal-current"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time Horizon (years)</Label>
                <Input
                  type="number"
                  value={goalHorizon}
                  onChange={(e) => setGoalHorizon(e.target.value)}
                  placeholder="5"
                  data-testid="input-goal-horizon"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={goalPriority} onValueChange={setGoalPriority}>
                  <SelectTrigger data-testid="select-goal-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bucket Assignment</Label>
              <Select value={goalBucket} onValueChange={setGoalBucket}>
                <SelectTrigger data-testid="select-goal-bucket">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Bucket 1: Cash & Short-Term (1-2 years)</SelectItem>
                  <SelectItem value="2">Bucket 2: Bonds & Intermediate (3-7 years)</SelectItem>
                  <SelectItem value="3">Bucket 3: Equities & Growth (8+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {accounts.length > 0 && (
              <div className="space-y-2">
                <Label>Linked Accounts (optional)</Label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {accounts.map((account: any) => (
                    <label
                      key={account.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
                        borderRadius: 4, cursor: "pointer", fontSize: 12,
                      }}
                      data-testid={`checkbox-account-${account.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={goalLinkedAccounts.includes(account.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGoalLinkedAccounts(prev => [...prev, account.id]);
                          } else {
                            setGoalLinkedAccounts(prev => prev.filter(id => id !== account.id));
                          }
                        }}
                      />
                      <span>{account.accountType} - {account.accountNumber}</span>
                      <span className="text-[#C7D0DD] ml-auto">{formatCurrency(parseFloat(account.balance))}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={goalNotes}
                onChange={(e) => setGoalNotes(e.target.value)}
                placeholder="Additional notes..."
                data-testid="input-goal-notes"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowNewGoal(false); setEditingGoal(null); resetForm(); }} data-testid="button-cancel-goal">
              Cancel
            </Button>
            <Button
              onClick={() => editingGoal ? updateGoalMutation.mutate() : createGoalMutation.mutate()}
              disabled={!goalName || !goalTarget || !goalHorizon || createGoalMutation.isPending || updateGoalMutation.isPending}
              data-testid="button-save-goal"
            >
              {(createGoalMutation.isPending || updateGoalMutation.isPending) ? "Saving..." : editingGoal ? "Update Goal" : "Create Goal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
