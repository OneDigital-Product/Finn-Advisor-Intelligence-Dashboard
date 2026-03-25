import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  DollarSign,
  Heart,
  Target,
  TrendingUp,
  Trash2,
  HandHeart,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  PieChart,
  ChevronRight,
  Brain,
} from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { SignalCard } from "@/components/design/signal-card";
import { EmptyState } from "@/components/empty-state";
import { P } from "@/styles/tokens";

interface PhilanthropySectionProps {
  clientId: string;
  clientName: string;
  advisorId: string;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  DAF: "Donor Advised Fund",
  CRT: "Charitable Remainder Trust",
  PRIVATE_FOUNDATION: "Private Foundation",
  CHARITABLE_GIFT_ANNUITY: "Charitable Gift Annuity",
  POOLED_INCOME_FUND: "Pooled Income Fund",
  DIRECT: "Direct Giving",
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  DAF: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  CRT: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  PRIVATE_FOUNDATION: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  CHARITABLE_GIFT_ANNUITY: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  POOLED_INCOME_FUND: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  DIRECT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const GOAL_CATEGORIES: Record<string, string> = {
  education: "Education",
  health: "Health & Medical",
  environment: "Environment",
  arts: "Arts & Culture",
  community: "Community",
  religious: "Religious",
  international: "International",
  general: "General",
};

import { formatCurrency as fmtCurrency } from "@/lib/format";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";
const fmtFullCurrency = (v: number) => fmtCurrency(v, { abbreviated: false });

export function PhilanthropySection({ clientId, clientName, advisorId }: PhilanthropySectionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "accounts" | "goals" | "crt-model" | "qcd">("overview");
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showAddContribution, setShowAddContribution] = useState(false);
  const [showAddGrant, setShowAddGrant] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const { data: philanthopyData, isLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "philanthropy"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/philanthropy`);
      if (!res.ok) throw new Error("Failed to fetch philanthropy data");
      return res.json();
    },
    enabled: !!clientId,
  });

  const [crtInputs, setCrtInputs] = useState({
    fundedAmount: 1000000,
    termYears: 20,
    payoutRate: 0.05,
    section7520Rate: 0.052,
    assumedGrowthRate: 0.07,
    trustType: "CRUT" as "CRAT" | "CRUT",
    taxBracket: 0.37,
  });

  const [qcdInputs, setQcdInputs] = useState({
    accountHolderDOB: "",
    accountBalance: 500000,
    taxYear: new Date().getFullYear(),
    assumedGrowthRate: 0.05,
    qcdAmount: 50000,
    marginalTaxRate: 0.37,
  });

  const [crtResult, setCrtResult] = useState<any>(null);
  const [qcdResult, setQcdResult] = useState<any>(null);

  const createAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/philanthropy/accounts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropy"] });
      setShowCreateAccount(false);
      toast({ title: "Charitable account created" });
    },
    onError: () => toast({ title: "Failed to create account", variant: "destructive" }),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/philanthropy/accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropy"] });
      toast({ title: "Account deleted" });
    },
    onError: () => toast({ title: "Failed to delete account", variant: "destructive" }),
  });

  const addContributionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/philanthropy/contributions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropy"] });
      setShowAddContribution(false);
      toast({ title: "Contribution recorded" });
    },
    onError: () => toast({ title: "Failed to add contribution", variant: "destructive" }),
  });

  const addGrantMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/philanthropy/grants", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropy"] });
      setShowAddGrant(false);
      toast({ title: "Grant recorded" });
    },
    onError: () => toast({ title: "Failed to add grant", variant: "destructive" }),
  });

  const createGoalMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/philanthropy/goals", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropy"] });
      setShowCreateGoal(false);
      toast({ title: "Philanthropic goal created" });
    },
    onError: () => toast({ title: "Failed to create goal", variant: "destructive" }),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/philanthropy/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropy"] });
      toast({ title: "Goal deleted" });
    },
    onError: () => toast({ title: "Failed to delete goal", variant: "destructive" }),
  });

  const runCrtModel = useMutation({
    mutationFn: async (inputs: any) => {
      const res = await apiRequest("POST", "/api/philanthropy/crt-model", inputs);
      return res.json();
    },
    onSuccess: (data) => setCrtResult(data),
    onError: () => toast({ title: "Failed to run CRT model", variant: "destructive" }),
  });

  const runQcdAnalysis = useMutation({
    mutationFn: async (inputs: any) => {
      const res = await apiRequest("POST", "/api/philanthropy/qcd-analysis", inputs);
      return res.json();
    },
    onSuccess: (data) => setQcdResult(data),
    onError: (error: any) => toast({ title: error.message || "Failed to run QCD analysis", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { accounts = [], goals = [], summary = {} } = philanthopyData || {};
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "accounts", label: "Accounts" },
    { id: "goals", label: "Goals" },
    { id: "crt-model", label: "CRT Modeler" },
    { id: "qcd", label: "QCD Analysis" },
  ];

  return (
    <div className="space-y-6" data-testid="section-philanthropy">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2" data-testid="text-philanthropy-title">
            <HandHeart className="h-5 w-5 text-rose-500" /> Philanthropic Strategy
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{clientName}'s charitable giving and impact planning</p>
        </div>
        <CassidyAnalysisButton
          taskType="analysis"
          clientId={clientId}
          context={{
            section: "philanthropy",
            clientName,
            totalGiving: summary.totalGiving || 0,
            totalContributions: summary.totalContributions || 0,
            totalBalance: summary.totalBalance || 0,
            totalTaxDeductions: summary.totalTaxDeductions || 0,
            accounts: accounts.slice(0, 5).map((a: any) => ({
              name: a.name,
              type: a.accountType,
              balance: a.currentBalance,
              contributions: a.totalContributions,
              grants: a.totalGrants,
            })),
            goals: goals.slice(0, 5).map((g: any) => ({
              name: g.name,
              category: g.category,
              targetAmount: g.targetAmount,
              currentAmount: g.currentAmount,
            })),
          }}
          label="AI Giving Strategy"
          icon={<Brain className="h-4 w-4" />}
          size="sm"
        />
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-philanthropy-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card style={V2_CARD} data-testid="card-total-giving">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <span className="text-xs text-muted-foreground">Total Giving</span>
                </div>
                <div className="text-2xl font-bold">{fmtCurrency(summary.totalGiving || 0)}</div>
              </CardContent>
            </Card>
            <Card style={V2_CARD} data-testid="card-total-contributions">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight className="h-4 w-4" style={{ color: P.grn }} />
                  <span className="text-xs text-muted-foreground">Total Contributions</span>
                </div>
                <div className="text-2xl font-bold">{fmtCurrency(summary.totalContributions || 0)}</div>
              </CardContent>
            </Card>
            <Card style={V2_CARD} data-testid="card-total-balance">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Account Balances</span>
                </div>
                <div className="text-2xl font-bold">{fmtCurrency(summary.totalBalance || 0)}</div>
              </CardContent>
            </Card>
            <Card style={V2_CARD} data-testid="card-tax-deductions">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4" style={{ color: P.grn }} />
                  <span className="text-xs text-muted-foreground">Tax Deductions</span>
                </div>
                <div className="text-2xl font-bold">{fmtCurrency(summary.totalTaxDeductions || 0)}</div>
              </CardContent>
            </Card>
          </div>

          {accounts.length > 0 && (
            <Card style={V2_CARD}>
              <CardHeader className="pb-3">
                <CardTitle className="" style={V2_TITLE}>Charitable Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {accounts.map((account: any) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => { setSelectedAccountId(account.id); setActiveTab("accounts"); }}
                      data-testid={`card-account-${account.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{account.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className={`text-[10px] ${ACCOUNT_TYPE_COLORS[account.accountType] || "bg-gray-100 text-gray-800"}`}>
                              {ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}
                            </Badge>
                            {account.provider && <span className="text-xs text-muted-foreground">{account.provider}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">{fmtFullCurrency(parseFloat(account.currentBalance || "0"))}</div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {goals.length > 0 && (
            <Card style={V2_CARD}>
              <CardHeader className="pb-3">
                <CardTitle className="" style={V2_TITLE}>Philanthropic Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {goals.map((goal: any) => {
                    const progress = parseFloat(goal.targetAmount) > 0
                      ? (parseFloat(goal.currentAmount || "0") / parseFloat(goal.targetAmount)) * 100
                      : 0;
                    return (
                      <div key={goal.id} className="p-3 rounded-lg border" data-testid={`card-goal-${goal.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">{goal.name}</div>
                          <Badge variant="outline" className="text-[10px]">
                            {GOAL_CATEGORIES[goal.category] || goal.category}
                          </Badge>
                        </div>
                        <Progress value={Math.min(100, progress)} className="h-2 mb-1" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{fmtFullCurrency(parseFloat(goal.currentAmount || "0"))} raised</span>
                          <span>{fmtFullCurrency(parseFloat(goal.targetAmount))} target</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {accounts.length === 0 && goals.length === 0 && (
            <Card style={V2_CARD}>
              <CardContent className="py-12 text-center">
                <HandHeart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="font-medium mb-1">No Philanthropic Activity</h3>
                <p className="text-sm text-muted-foreground mb-4">Create a charitable account or set a philanthropic goal to get started.</p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" onClick={() => setShowCreateAccount(true)} data-testid="button-create-first-account">
                    <Plus className="h-4 w-4 mr-1" /> Add Account
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCreateGoal(true)} data-testid="button-create-first-goal">
                    <Target className="h-4 w-4 mr-1" /> Set Goal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateAccount(true)} data-testid="button-create-account">
              <Plus className="h-4 w-4 mr-1" /> Add Account
            </Button>
          </div>

          {accounts.length === 0 ? (
            <Card style={V2_CARD}>
              <CardContent>
                <EmptyState icon={HandHeart} title="No charitable accounts" description="Track Donor-Advised Funds, Charitable Remainder Trusts, and other giving vehicles to coordinate philanthropic strategy." actionLabel="Add Account" actionIcon={Plus} onAction={() => setShowCreateAccount(true)} />
              </CardContent>
            </Card>
          ) : (
            accounts.map((account: any) => (
              <Card key={account.id} style={V2_CARD} data-testid={`account-detail-${account.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="" style={V2_TITLE}>{account.name}</CardTitle>
                      <Badge className={`text-[10px] ${ACCOUNT_TYPE_COLORS[account.accountType] || ""}`}>
                        {ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedAccountId(account.id); setShowAddContribution(true); }}
                        data-testid={`button-add-contribution-${account.id}`}
                      >
                        <ArrowUpRight className="h-3 w-3 mr-1" /> Contribution
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedAccountId(account.id); setShowAddGrant(true); }}
                        data-testid={`button-add-grant-${account.id}`}
                      >
                        <ArrowDownRight className="h-3 w-3 mr-1" /> Grant
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteAccountMutation.mutate(account.id)}
                        data-testid={`button-delete-account-${account.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="p-3 rounded-md bg-muted/40">
                      <div className="text-xs text-muted-foreground">Balance</div>
                      <div className="text-sm font-semibold">{fmtFullCurrency(parseFloat(account.currentBalance || "0"))}</div>
                    </div>
                    <div className="p-3 rounded-md bg-muted/40">
                      <div className="text-xs text-muted-foreground">Contributions</div>
                      <div className="text-sm font-semibold">{fmtFullCurrency(parseFloat(account.totalContributions || "0"))}</div>
                    </div>
                    <div className="p-3 rounded-md bg-muted/40">
                      <div className="text-xs text-muted-foreground">Grants Made</div>
                      <div className="text-sm font-semibold">{fmtFullCurrency(parseFloat(account.totalGrants || "0"))}</div>
                    </div>
                    <div className="p-3 rounded-md bg-muted/40">
                      <div className="text-xs text-muted-foreground">Provider</div>
                      <div className="text-sm font-semibold">{account.provider || "—"}</div>
                    </div>
                  </div>

                  {account.contributions?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Recent Contributions</h4>
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="text-left p-2 text-xs font-medium text-muted-foreground">Date</th>
                              <th className="text-left p-2 text-xs font-medium text-muted-foreground">Type</th>
                              <th className="text-right p-2 text-xs font-medium text-muted-foreground">Amount</th>
                              <th className="text-right p-2 text-xs font-medium text-muted-foreground">Tax Deduction</th>
                            </tr>
                          </thead>
                          <tbody>
                            {account.contributions.slice(0, 5).map((c: any) => (
                              <tr key={c.id} className="border-b last:border-0" data-testid={`row-contribution-${c.id}`}>
                                <td className="p-2">{c.date}</td>
                                <td className="p-2 capitalize">{c.type}</td>
                                <td className="p-2 text-right font-medium">{fmtFullCurrency(parseFloat(c.amount))}</td>
                                <td className="p-2 text-right text-emerald-600 dark:text-emerald-400">
                                  {c.taxDeductionAmount ? fmtFullCurrency(parseFloat(c.taxDeductionAmount)) : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {account.grants?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Recent Grants</h4>
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="text-left p-2 text-xs font-medium text-muted-foreground">Date</th>
                              <th className="text-left p-2 text-xs font-medium text-muted-foreground">Recipient</th>
                              <th className="text-left p-2 text-xs font-medium text-muted-foreground">Purpose</th>
                              <th className="text-right p-2 text-xs font-medium text-muted-foreground">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {account.grants.slice(0, 5).map((g: any) => (
                              <tr key={g.id} className="border-b last:border-0" data-testid={`row-grant-${g.id}`}>
                                <td className="p-2">{g.date}</td>
                                <td className="p-2 font-medium">{g.recipientName}</td>
                                <td className="p-2 text-muted-foreground">{g.purpose || "—"}</td>
                                <td className="p-2 text-right font-medium">{fmtFullCurrency(parseFloat(g.amount))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "goals" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateGoal(true)} data-testid="button-create-goal">
              <Plus className="h-4 w-4 mr-1" /> Add Goal
            </Button>
          </div>

          {goals.length === 0 ? (
            <Card style={V2_CARD}>
              <CardContent>
                <EmptyState icon={Target} title="No philanthropic goals" description="Set giving targets with timelines and track progress toward charitable objectives across all accounts." actionLabel="Add Goal" actionIcon={Plus} onAction={() => setShowCreateGoal(true)} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((goal: any) => {
                const progress = parseFloat(goal.targetAmount) > 0
                  ? (parseFloat(goal.currentAmount || "0") / parseFloat(goal.targetAmount)) * 100
                  : 0;
                return (
                  <Card key={goal.id} style={V2_CARD} data-testid={`goal-detail-${goal.id}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-medium">{goal.name}</div>
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {GOAL_CATEGORIES[goal.category] || goal.category}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteGoalMutation.mutate(goal.id)}
                          data-testid={`button-delete-goal-${goal.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Progress value={Math.min(100, progress)} className="h-2 mb-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{fmtFullCurrency(parseFloat(goal.currentAmount || "0"))} / {fmtFullCurrency(parseFloat(goal.targetAmount))}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      {goal.targetYear && (
                        <div className="text-xs text-muted-foreground mt-1">Target Year: {goal.targetYear}</div>
                      )}
                      {goal.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{goal.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "crt-model" && (
        <div className="space-y-4">
          <Card style={V2_CARD}>
            <CardHeader className="pb-3">
              <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
                <Calculator className="h-4 w-4" /> Charitable Remainder Trust Modeler
              </CardTitle>
              <p className="text-xs text-muted-foreground">Model income streams, remainder values, and tax deductions for CRTs</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label htmlFor="crt-funded-amount" className="text-xs">Funded Amount</Label>
                  <Input
                    id="crt-funded-amount"
                    type="number"
                    value={crtInputs.fundedAmount}
                    onChange={e => setCrtInputs(p => ({ ...p, fundedAmount: parseFloat(e.target.value) || 0 }))}
                    data-testid="input-crt-funded-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="crt-term" className="text-xs">Term (Years)</Label>
                  <Input
                    id="crt-term"
                    type="number"
                    value={crtInputs.termYears}
                    onChange={e => setCrtInputs(p => ({ ...p, termYears: parseInt(e.target.value) || 0 }))}
                    data-testid="input-crt-term"
                  />
                </div>
                <div>
                  <Label htmlFor="crt-payout" className="text-xs">Payout Rate (%)</Label>
                  <Input
                    id="crt-payout"
                    type="number"
                    step="0.01"
                    value={(crtInputs.payoutRate * 100).toFixed(1)}
                    onChange={e => setCrtInputs(p => ({ ...p, payoutRate: (parseFloat(e.target.value) || 0) / 100 }))}
                    data-testid="input-crt-payout"
                  />
                </div>
                <div>
                  <Label htmlFor="crt-type" className="text-xs">Trust Type</Label>
                  <Select value={crtInputs.trustType} onValueChange={(v: "CRAT" | "CRUT") => setCrtInputs(p => ({ ...p, trustType: v }))}>
                    <SelectTrigger id="crt-type" data-testid="select-crt-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRAT">CRAT (Fixed Annuity)</SelectItem>
                      <SelectItem value="CRUT">CRUT (Unitrust)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="crt-7520" className="text-xs">§7520 Rate (%)</Label>
                  <Input
                    id="crt-7520"
                    type="number"
                    step="0.01"
                    value={(crtInputs.section7520Rate * 100).toFixed(1)}
                    onChange={e => setCrtInputs(p => ({ ...p, section7520Rate: (parseFloat(e.target.value) || 0) / 100 }))}
                    data-testid="input-crt-7520"
                  />
                </div>
                <div>
                  <Label htmlFor="crt-growth" className="text-xs">Growth Rate (%)</Label>
                  <Input
                    id="crt-growth"
                    type="number"
                    step="0.01"
                    value={(crtInputs.assumedGrowthRate * 100).toFixed(1)}
                    onChange={e => setCrtInputs(p => ({ ...p, assumedGrowthRate: (parseFloat(e.target.value) || 0) / 100 }))}
                    data-testid="input-crt-growth"
                  />
                </div>
                <div>
                  <Label htmlFor="crt-tax" className="text-xs">Tax Bracket (%)</Label>
                  <Input
                    id="crt-tax"
                    type="number"
                    step="1"
                    value={(crtInputs.taxBracket * 100).toFixed(0)}
                    onChange={e => setCrtInputs(p => ({ ...p, taxBracket: (parseFloat(e.target.value) || 0) / 100 }))}
                    data-testid="input-crt-tax"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => runCrtModel.mutate(crtInputs)}
                    disabled={runCrtModel.isPending}
                    className="w-full"
                    data-testid="button-run-crt"
                  >
                    {runCrtModel.isPending ? "Calculating..." : "Run Model"}
                  </Button>
                </div>
              </div>

              {crtResult && (
                <div className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="p-3 rounded-md bg-muted/40">
                      <div className="text-xs text-muted-foreground">Funded Amount</div>
                      <div className="text-sm font-semibold">{fmtFullCurrency(crtResult.summary.fundedAmount)}</div>
                    </div>
                    <div className="p-3 rounded-md bg-muted/40">
                      <div className="text-xs text-muted-foreground">Total Payouts</div>
                      <div className="text-sm font-semibold">{fmtFullCurrency(crtResult.summary.totalPayouts)}</div>
                    </div>
                    <div className="p-3 rounded-md bg-muted/40">
                      <div className="text-xs text-muted-foreground">Remainder Value</div>
                      <div className="text-sm font-semibold">{fmtFullCurrency(crtResult.summary.remainderValue)}</div>
                    </div>
                    <div className="p-3 rounded-md" style={{ background: P.gL }}>
                      <div className="text-xs text-muted-foreground">Charitable Deduction</div>
                      <div className="text-sm font-semibold" style={{ color: P.grn }}>{fmtFullCurrency(crtResult.summary.charitableDeduction)}</div>
                    </div>
                    <div className="p-3 rounded-md" style={{ background: P.gL }}>
                      <div className="text-xs text-muted-foreground">Tax Savings</div>
                      <div className="text-sm font-semibold" style={{ color: P.grn }}>{fmtFullCurrency(crtResult.summary.taxSavings)}</div>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-2 text-xs font-medium text-muted-foreground">Year</th>
                          <th className="text-right p-2 text-xs font-medium text-muted-foreground">Annual Payout</th>
                          <th className="text-right p-2 text-xs font-medium text-muted-foreground">Remaining Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {crtResult.projections.map((p: any) => (
                          <tr key={p.year} className="border-b last:border-0" data-testid={`row-crt-year-${p.year}`}>
                            <td className="p-2">{p.year}</td>
                            <td className="p-2 text-right font-medium">{fmtFullCurrency(p.annualPayout)}</td>
                            <td className="p-2 text-right">{fmtFullCurrency(p.remainingValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "qcd" && (
        <div className="space-y-4">
          <Card style={V2_CARD}>
            <CardHeader className="pb-3">
              <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
                <PieChart className="h-4 w-4" /> Qualified Charitable Distribution Analysis
              </CardTitle>
              <p className="text-xs text-muted-foreground">Integrate QCDs with RMD planning for tax-efficient charitable giving</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="qcd-dob" className="text-xs">Date of Birth</Label>
                  <Input
                    id="qcd-dob"
                    type="date"
                    value={qcdInputs.accountHolderDOB}
                    onChange={e => setQcdInputs(p => ({ ...p, accountHolderDOB: e.target.value }))}
                    data-testid="input-qcd-dob"
                  />
                </div>
                <div>
                  <Label htmlFor="qcd-balance" className="text-xs">IRA Balance</Label>
                  <Input
                    id="qcd-balance"
                    type="number"
                    value={qcdInputs.accountBalance}
                    onChange={e => setQcdInputs(p => ({ ...p, accountBalance: parseFloat(e.target.value) || 0 }))}
                    data-testid="input-qcd-balance"
                  />
                </div>
                <div>
                  <Label htmlFor="qcd-year" className="text-xs">Tax Year</Label>
                  <Input
                    id="qcd-year"
                    type="number"
                    value={qcdInputs.taxYear}
                    onChange={e => setQcdInputs(p => ({ ...p, taxYear: parseInt(e.target.value) || 0 }))}
                    data-testid="input-qcd-year"
                  />
                </div>
                <div>
                  <Label htmlFor="qcd-amount" className="text-xs">Annual QCD Amount</Label>
                  <Input
                    id="qcd-amount"
                    type="number"
                    value={qcdInputs.qcdAmount}
                    onChange={e => setQcdInputs(p => ({ ...p, qcdAmount: parseFloat(e.target.value) || 0 }))}
                    data-testid="input-qcd-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="qcd-tax-rate" className="text-xs">Marginal Tax Rate (%)</Label>
                  <Input
                    id="qcd-tax-rate"
                    type="number"
                    step="1"
                    value={(qcdInputs.marginalTaxRate * 100).toFixed(0)}
                    onChange={e => setQcdInputs(p => ({ ...p, marginalTaxRate: (parseFloat(e.target.value) || 0) / 100 }))}
                    data-testid="input-qcd-tax-rate"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => runQcdAnalysis.mutate(qcdInputs)}
                    disabled={runQcdAnalysis.isPending || !qcdInputs.accountHolderDOB}
                    className="w-full"
                    data-testid="button-run-qcd"
                  >
                    {runQcdAnalysis.isPending ? "Analyzing..." : "Run Analysis"}
                  </Button>
                </div>
              </div>

              {qcdResult && (
                <div className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-md bg-muted/40">
                      <div className="text-xs text-muted-foreground">Current Year RMD</div>
                      <div className="text-sm font-semibold">{fmtFullCurrency(qcdResult.currentYearRMD)}</div>
                    </div>
                    <div className="p-3 rounded-md bg-muted/40">
                      <div className="text-xs text-muted-foreground">RMD Percentage</div>
                      <div className="text-sm font-semibold">{qcdResult.rmdPercentage}%</div>
                    </div>
                    {qcdResult.qcdSummary && (
                      <>
                        <div className="p-3 rounded-md" style={{ background: P.gL }}>
                          <div className="text-xs text-muted-foreground">Total QCD (10yr)</div>
                          <div className="text-sm font-semibold" style={{ color: P.grn }}>{fmtFullCurrency(qcdResult.qcdSummary.totalQCDOverPeriod)}</div>
                        </div>
                        <div className="p-3 rounded-md" style={{ background: P.gL }}>
                          <div className="text-xs text-muted-foreground">Total Tax Savings</div>
                          <div className="text-sm font-semibold" style={{ color: P.grn }}>{fmtFullCurrency(qcdResult.qcdSummary.totalTaxSavings)}</div>
                        </div>
                      </>
                    )}
                  </div>

                  {qcdResult.projections?.length > 0 && (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left p-2 text-xs font-medium text-muted-foreground">Year</th>
                            <th className="text-left p-2 text-xs font-medium text-muted-foreground">Age</th>
                            <th className="text-right p-2 text-xs font-medium text-muted-foreground">RMD</th>
                            <th className="text-right p-2 text-xs font-medium text-muted-foreground">QCD</th>
                            <th className="text-right p-2 text-xs font-medium text-muted-foreground">Taxable</th>
                            <th className="text-right p-2 text-xs font-medium text-muted-foreground">Tax Saved</th>
                          </tr>
                        </thead>
                        <tbody>
                          {qcdResult.projections.map((p: any) => (
                            <tr key={p.year} className="border-b last:border-0" data-testid={`row-qcd-year-${p.year}`}>
                              <td className="p-2">{p.year}</td>
                              <td className="p-2">{p.age}</td>
                              <td className="p-2 text-right font-medium">{fmtFullCurrency(p.rmdAmount)}</td>
                              <td className="p-2 text-right text-rose-600 dark:text-rose-400">{p.qcdAmount !== undefined ? fmtFullCurrency(p.qcdAmount) : "—"}</td>
                              <td className="p-2 text-right">{p.taxableDistribution !== undefined ? fmtFullCurrency(p.taxableDistribution) : fmtFullCurrency(p.rmdAmount)}</td>
                              <td className="p-2 text-right text-emerald-600 dark:text-emerald-400">{p.taxSavingsFromQCD ? fmtFullCurrency(p.taxSavingsFromQCD) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {qcdResult.notes?.length > 0 && (
                    <SignalCard level="info" title="QCD Notes">
                      <div className="text-xs space-y-1">
                        {qcdResult.notes.map((note: string, i: number) => (
                          <p key={i}>{note}</p>
                        ))}
                      </div>
                    </SignalCard>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showCreateAccount} onOpenChange={setShowCreateAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Charitable Account</DialogTitle>
            <DialogDescription>Track a new charitable giving vehicle</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            createAccountMutation.mutate({
              clientId,
              advisorId,
              accountType: fd.get("accountType"),
              name: fd.get("name"),
              provider: fd.get("provider") || undefined,
              accountNumber: fd.get("accountNumber") || undefined,
              currentBalance: fd.get("currentBalance") || "0",
              inceptionDate: fd.get("inceptionDate") || undefined,
              notes: fd.get("notes") || undefined,
            });
          }}>
            <div className="space-y-3">
              <div>
                <Label htmlFor="phil-account-type">Account Type</Label>
                <Select name="accountType" defaultValue="DAF">
                  <SelectTrigger id="phil-account-type" data-testid="select-account-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="phil-account-name">Name</Label>
                <Input id="phil-account-name" name="name" required data-testid="input-account-name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="phil-account-provider">Provider</Label>
                  <Input id="phil-account-provider" name="provider" placeholder="e.g. Fidelity Charitable" data-testid="input-account-provider" />
                </div>
                <div>
                  <Label htmlFor="phil-account-number">Account Number</Label>
                  <Input id="phil-account-number" name="accountNumber" data-testid="input-account-number" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="phil-account-balance">Current Balance</Label>
                  <Input id="phil-account-balance" name="currentBalance" type="number" step="0.01" defaultValue="0" data-testid="input-account-balance" />
                </div>
                <div>
                  <Label htmlFor="phil-account-inception">Inception Date</Label>
                  <Input id="phil-account-inception" name="inceptionDate" type="date" data-testid="input-account-inception" />
                </div>
              </div>
              <div>
                <Label htmlFor="phil-account-notes">Notes</Label>
                <Textarea id="phil-account-notes" name="notes" rows={2} data-testid="input-account-notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateAccount(false)} data-testid="button-cancel-account">Cancel</Button>
              <Button type="submit" disabled={createAccountMutation.isPending} data-testid="button-submit-account">
                {createAccountMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Philanthropic Goal</DialogTitle>
            <DialogDescription>Define a charitable giving target</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            createGoalMutation.mutate({
              clientId,
              name: fd.get("name"),
              targetAmount: fd.get("targetAmount"),
              currentAmount: fd.get("currentAmount") || "0",
              targetYear: fd.get("targetYear") ? parseInt(fd.get("targetYear") as string) : undefined,
              category: fd.get("category") || "general",
              notes: fd.get("notes") || undefined,
            });
          }}>
            <div className="space-y-3">
              <div>
                <Label htmlFor="phil-goal-name">Goal Name</Label>
                <Input id="phil-goal-name" name="name" required data-testid="input-goal-name" />
              </div>
              <div>
                <Label htmlFor="phil-goal-category">Category</Label>
                <Select name="category" defaultValue="general">
                  <SelectTrigger id="phil-goal-category" data-testid="select-goal-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(GOAL_CATEGORIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="phil-goal-target">Target Amount</Label>
                  <Input id="phil-goal-target" name="targetAmount" type="number" step="0.01" required data-testid="input-goal-target" />
                </div>
                <div>
                  <Label htmlFor="phil-goal-current">Current Amount</Label>
                  <Input id="phil-goal-current" name="currentAmount" type="number" step="0.01" defaultValue="0" data-testid="input-goal-current" />
                </div>
              </div>
              <div>
                <Label htmlFor="phil-goal-year">Target Year</Label>
                <Input id="phil-goal-year" name="targetYear" type="number" data-testid="input-goal-year" />
              </div>
              <div>
                <Label htmlFor="phil-goal-notes">Notes</Label>
                <Textarea id="phil-goal-notes" name="notes" rows={2} data-testid="input-goal-notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateGoal(false)} data-testid="button-cancel-goal">Cancel</Button>
              <Button type="submit" disabled={createGoalMutation.isPending} data-testid="button-submit-goal">
                {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddContribution} onOpenChange={setShowAddContribution}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Contribution</DialogTitle>
            <DialogDescription>Add a contribution to this charitable account</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            addContributionMutation.mutate({
              accountId: selectedAccountId,
              amount: fd.get("amount"),
              date: fd.get("date"),
              type: fd.get("type") || "cash",
              taxDeductionAmount: fd.get("taxDeductionAmount") || undefined,
              taxYear: fd.get("taxYear") ? parseInt(fd.get("taxYear") as string) : undefined,
              notes: fd.get("notes") || undefined,
            });
          }}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="contrib-amount">Amount</Label>
                  <Input id="contrib-amount" name="amount" type="number" step="0.01" required data-testid="input-contribution-amount" />
                </div>
                <div>
                  <Label htmlFor="contrib-date">Date</Label>
                  <Input id="contrib-date" name="date" type="date" required data-testid="input-contribution-date" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="contrib-type">Type</Label>
                  <Select name="type" defaultValue="cash">
                    <SelectTrigger id="contrib-type" data-testid="select-contribution-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="securities">Securities</SelectItem>
                      <SelectItem value="real_estate">Real Estate</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="contrib-deduction">Tax Deduction</Label>
                  <Input id="contrib-deduction" name="taxDeductionAmount" type="number" step="0.01" data-testid="input-contribution-deduction" />
                </div>
              </div>
              <div>
                <Label htmlFor="contrib-tax-year">Tax Year</Label>
                <Input id="contrib-tax-year" name="taxYear" type="number" defaultValue={new Date().getFullYear()} data-testid="input-contribution-tax-year" />
              </div>
              <div>
                <Label htmlFor="contrib-notes">Notes</Label>
                <Textarea id="contrib-notes" name="notes" rows={2} data-testid="input-contribution-notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddContribution(false)} data-testid="button-cancel-contribution">Cancel</Button>
              <Button type="submit" disabled={addContributionMutation.isPending} data-testid="button-submit-contribution">
                {addContributionMutation.isPending ? "Recording..." : "Record Contribution"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddGrant} onOpenChange={setShowAddGrant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Grant</DialogTitle>
            <DialogDescription>Add a grant or donation from this account</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            addGrantMutation.mutate({
              accountId: selectedAccountId,
              recipientName: fd.get("recipientName"),
              recipientEin: fd.get("recipientEin") || undefined,
              amount: fd.get("amount"),
              date: fd.get("date"),
              purpose: fd.get("purpose") || undefined,
              notes: fd.get("notes") || undefined,
            });
          }}>
            <div className="space-y-3">
              <div>
                <Label htmlFor="grant-recipient">Recipient Organization</Label>
                <Input id="grant-recipient" name="recipientName" required data-testid="input-grant-recipient" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="grant-amount">Amount</Label>
                  <Input id="grant-amount" name="amount" type="number" step="0.01" required data-testid="input-grant-amount" />
                </div>
                <div>
                  <Label htmlFor="grant-date">Date</Label>
                  <Input id="grant-date" name="date" type="date" required data-testid="input-grant-date" />
                </div>
              </div>
              <div>
                <Label htmlFor="grant-ein">EIN</Label>
                <Input id="grant-ein" name="recipientEin" placeholder="XX-XXXXXXX" data-testid="input-grant-ein" />
              </div>
              <div>
                <Label htmlFor="grant-purpose">Purpose</Label>
                <Input id="grant-purpose" name="purpose" data-testid="input-grant-purpose" />
              </div>
              <div>
                <Label htmlFor="grant-notes">Notes</Label>
                <Textarea id="grant-notes" name="notes" rows={2} data-testid="input-grant-notes" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddGrant(false)} data-testid="button-cancel-grant">Cancel</Button>
              <Button type="submit" disabled={addGrantMutation.isPending} data-testid="button-submit-grant">
                {addGrantMutation.isPending ? "Recording..." : "Record Grant"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
