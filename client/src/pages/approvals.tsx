import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck, ArrowRight,
  Eye, Loader2, Inbox, Link2, ClipboardCheck, Settings2, Info,
} from "lucide-react";

function statusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending: { variant: "outline", label: "Pending" },
    approved: { variant: "default", label: "Approved" },
    rejected: { variant: "destructive", label: "Rejected" },
    expired: { variant: "secondary", label: "Expired" },
  };
  const s = map[status] || { variant: "secondary" as const, label: status };
  return <Badge variant={s.variant} data-testid={`badge-status-${status}`}>{s.label}</Badge>;
}

function priorityBadge(priority: string) {
  const colors: Record<string, string> = {
    low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    normal: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    high: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[priority] || colors.normal}`} data-testid={`badge-priority-${priority}`}>
      {priority}
    </span>
  );
}

function typeBadge(type: string) {
  const labels: Record<string, string> = {
    custodial_change: "Custodial",
    profile_update: "Profile",
    record_correction: "Correction",
    compliance_review: "Compliance",
    data_reconciliation: "Reconciliation",
  };
  return (
    <Badge variant="secondary" className="text-[10px]" data-testid={`badge-type-${type}`}>
      {labels[type] || type}
    </Badge>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function PayloadDiff({ payload }: { payload: any }) {
  if (!payload || typeof payload !== "object") return <span className="text-sm text-muted-foreground">No payload</span>;
  return (
    <div className="space-y-1 text-sm">
      {Object.entries(payload).map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <span className="font-medium text-muted-foreground min-w-[120px]">{key}:</span>
          <span className="font-mono">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
        </div>
      ))}
    </div>
  );
}

const MODULE_LABELS: Record<string, string> = {
  new_accounts: "New Accounts",
  billing_fee: "Billing & Fee",
  data_integrity: "Data Integrity",
  mergers_acquisitions: "M&A",
};

function validationStatusIcon(status: string) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />;
  if (status === "fail") return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
}

function ValidationResultsPanel({ approvalItemId }: { approvalItemId: string }) {
  const { toast } = useToast();

  const { data: validationData, isLoading: validationLoading } = useQuery<any>({
    queryKey: ["/api/approvals", approvalItemId, "validation-results"],
    queryFn: async () => {
      const res = await fetch(`/api/approvals/${approvalItemId}/validation-results`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/approvals/${approvalItemId}/validate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals", approvalItemId, "validation-results"] });
      toast({ title: "Validation complete" });
    },
    onError: (err: Error) => {
      toast({ title: "Validation failed", description: err.message, variant: "destructive" });
    },
  });

  const results = validationData?.results || [];
  const hasResults = results.length > 0;

  const groupedByModule: Record<string, any[]> = {};
  results.forEach((r: any) => {
    if (!groupedByModule[r.module]) groupedByModule[r.module] = [];
    groupedByModule[r.module].push(r);
  });

  return (
    <div className="space-y-3" data-testid="validation-results-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Pre-Submission Validation</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => validateMutation.mutate()}
          disabled={validateMutation.isPending}
          data-testid="button-run-validation"
        >
          {validateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
          {hasResults ? "Re-validate" : "Run Validation"}
        </Button>
      </div>

      {validationLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : hasResults ? (
        <>
          <div className="flex items-center gap-3 text-sm">
            {validationData.passed ? (
              <Badge variant="default" className="bg-green-600" data-testid="badge-validation-passed">
                <CheckCircle2 className="w-3 h-3 mr-1" /> All Checks Passed
              </Badge>
            ) : (
              <Badge variant="destructive" data-testid="badge-validation-failed">
                <XCircle className="w-3 h-3 mr-1" /> {validationData.failCount} Failed
              </Badge>
            )}
            <span className="text-muted-foreground text-xs">
              {validationData.passCount} passed, {validationData.warnCount} warnings
            </span>
          </div>

          <Accordion type="multiple" className="w-full">
            {Object.entries(groupedByModule).map(([module, checks]) => {
              const moduleFails = checks.filter((c: any) => c.status === "fail").length;
              return (
                <AccordionItem key={module} value={module}>
                  <AccordionTrigger className="text-sm py-2" data-testid={`accordion-module-${module}`}>
                    <div className="flex items-center gap-2">
                      {moduleFails > 0 ? (
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      )}
                      <span>{MODULE_LABELS[module] || module}</span>
                      {moduleFails > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {moduleFails}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pl-1">
                      {checks.map((check: any, idx: number) => (
                        <div
                          key={check.id || idx}
                          className={`flex items-start gap-2 p-2 rounded text-sm ${
                            check.status === "fail"
                              ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
                              : check.status === "warn"
                                ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900"
                                : "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
                          }`}
                          data-testid={`validation-check-${check.ruleKey}`}
                        >
                          {validationStatusIcon(check.status)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs">{check.message}</p>
                            {check.remediation && (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
                                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                {check.remediation}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {!validationData.passed && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-3 text-sm" data-testid="validation-block-message">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium">
                <AlertTriangle className="w-4 h-4" />
                Submission Blocked
              </div>
              <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                Resolve all failed validation checks before this item can be approved.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded text-center">
          No validation has been run yet. Click "Run Validation" to check this item.
        </div>
      )}
    </div>
  );
}

function ValidationRulesAdmin() {
  const { toast } = useToast();
  const [moduleFilter, setModuleFilter] = useState("all");

  const { data: rules = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/validation-rules"],
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/validation-rules/seed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/validation-rules"] });
      toast({ title: "Default rules created" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiRequest("PATCH", `/api/validation-rules/${id}`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/validation-rules"] });
    },
  });

  const filteredRules = rules.filter((r: any) =>
    moduleFilter === "all" || r.module === moduleFilter
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[160px]" data-testid="filter-validation-module">
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="new_accounts">New Accounts</SelectItem>
              <SelectItem value="billing_fee">Billing & Fee</SelectItem>
              <SelectItem value="data_integrity">Data Integrity</SelectItem>
              <SelectItem value="mergers_acquisitions">M&A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {rules.length === 0 && (
          <Button
            size="sm"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            data-testid="button-seed-rules"
          >
            {seedMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
            Initialize Default Rules
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filteredRules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Settings2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No validation rules configured</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Initialize Default Rules" to get started</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="text-right">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule: any) => (
                  <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {MODULE_LABELS[rule.module] || rule.module}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{rule.label}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">
                      {rule.description}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={rule.severity === "error" ? "destructive" : rule.severity === "warn" ? "outline" : "secondary"}
                        className="text-[10px]"
                      >
                        {rule.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, enabled: checked })}
                        data-testid={`switch-rule-${rule.id}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

function CustodialStatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    pending_review: { color: "bg-amber-100 text-amber-700", label: "Pending Review" },
    pending_approval: { color: "bg-blue-100 text-blue-700", label: "Pending Approval" },
    auto_matched: { color: "bg-green-100 text-green-700", label: "Auto-Matched" },
    unmatched: { color: "bg-red-100 text-red-700", label: "Unmatched" },
    ignored: { color: "bg-slate-100 text-slate-500", label: "Ignored" },
    approved: { color: "bg-green-100 text-green-700", label: "Approved" },
  };
  const s = map[status] || { color: "bg-slate-100 text-slate-500", label: status };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>;
}

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionComment, setActionComment] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const [custodialStatusFilter, setCustodialStatusFilter] = useState("all");

  const { data: approvals = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/approvals"],
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/approvals/stats"],
  });

  const { data: custodialChanges = [], isLoading: custodialLoading } = useQuery<any[]>({
    queryKey: ["/api/custodial-changes"],
    refetchOnMount: true,
  });

  const { data: clientsRaw } = useQuery<any>({
    queryKey: ["/api/clients"],
  });
  // /api/clients returns { clients: [...] } when MuleSoft/pagination is active,
  // or a raw array from local DB without params. Normalize to always be an array.
  const clients: any[] = Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw?.clients ?? []);

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/approvals/${id}/approve`, { comment: actionComment || undefined });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/stats"] });
      setShowApproveDialog(false);
      setSelectedItem(null);
      setActionComment("");
      toast({ title: "Approval granted" });
    },
    onError: (err: Error) => {
      const msg = err.message || "Failed to approve";
      if (msg.includes("validation") || msg.includes("Validation")) {
        toast({
          title: "Approval Blocked",
          description: "Validation checks have failed. Resolve all issues before approving.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Failed to approve", description: msg, variant: "destructive" });
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/approvals/${id}/reject`, { comment: actionComment || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/stats"] });
      setShowRejectDialog(false);
      setSelectedItem(null);
      setActionComment("");
      toast({ title: "Item rejected" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to reject", description: err.message, variant: "destructive" });
    },
  });

  const ignoreCustodialMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/custodial-changes/${id}`, { action: "ignore" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custodial-changes"] });
      toast({ title: "Change ignored" });
    },
  });

  const [matchTarget, setMatchTarget] = useState<{ changeId: string; clientId: string } | null>(null);

  const matchCustodialMutation = useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      await apiRequest("PATCH", `/api/custodial-changes/${id}`, { action: "match", matchedClientId: clientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custodial-changes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/approvals/stats"] });
      setMatchTarget(null);
      toast({ title: "Change matched and approval created" });
    },
  });

  const filteredApprovals = approvals.filter((a: any) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (typeFilter !== "all" && a.itemType !== typeFilter) return false;
    return true;
  });

  const filteredCustodial = custodialChanges.filter((c: any) => {
    if (custodialStatusFilter !== "all" && c.status !== custodialStatusFilter) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and manage pending approvals and custodial changes</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold" data-testid="stat-pending">{stats?.pending || 0}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold" data-testid="stat-urgent">{stats?.urgent || 0}</p>
            <p className="text-xs text-muted-foreground">Urgent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold" data-testid="stat-approved">{stats?.approved || 0}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <XCircle className="w-5 h-5 mx-auto mb-1 text-slate-400" />
            <p className="text-2xl font-bold" data-testid="stat-rejected">{stats?.rejected || 0}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="approvals" data-testid="tab-approvals">
            Approval Queue {(stats?.pending || 0) > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px]">{stats.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="custodial" data-testid="tab-custodial">
            Custodial Feed {custodialChanges.filter((c: any) => c.status === "unmatched" || c.status === "pending_review").length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px]">
                {custodialChanges.filter((c: any) => c.status === "unmatched" || c.status === "pending_review").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="validation-rules" data-testid="tab-validation-rules">
            <Settings2 className="w-3.5 h-3.5 mr-1" />
            Validation Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]" data-testid="filter-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="custodial_change">Custodial</SelectItem>
                <SelectItem value="profile_update">Profile Update</SelectItem>
                <SelectItem value="compliance_review">Compliance</SelectItem>
                <SelectItem value="record_correction">Correction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredApprovals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No approval items match your filters</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals.map((item: any) => (
                      <TableRow key={item.id} data-testid={`row-approval-${item.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            {item.description && <p className="text-xs text-muted-foreground truncate max-w-[300px]">{item.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{typeBadge(item.itemType)}</TableCell>
                        <TableCell>{statusBadge(item.status)}</TableCell>
                        <TableCell>{priorityBadge(item.priority)}</TableCell>
                        <TableCell className="text-xs">{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => setSelectedItem(item)}
                                title="Run Validation"
                                data-testid={`button-validate-${item.id}`}
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedItem(item)}
                              data-testid={`button-view-${item.id}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {item.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => { setSelectedItem(item); setShowApproveDialog(true); }}
                                  data-testid={`button-approve-${item.id}`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => { setSelectedItem(item); setShowRejectDialog(true); }}
                                  data-testid={`button-reject-${item.id}`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="custodial" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Select value={custodialStatusFilter} onValueChange={setCustodialStatusFilter}>
              <SelectTrigger className="w-[160px]" data-testid="filter-custodial-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unmatched">Unmatched</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {custodialLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredCustodial.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Link2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No custodial changes match your filter</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredCustodial.map((change: any) => {
                const norm = change.normalizedPayload || {};
                return (
                  <Card key={change.id} data-testid={`card-custodial-${change.id}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm capitalize">{change.source}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{change.changeType}</span>
                            <CustodialStatusBadge status={change.status} />
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {norm.accountNumber && <span>Account: <span className="font-mono">{norm.accountNumber}</span></span>}
                            {norm.clientName && <span>Client: {norm.clientName}</span>}
                            {norm.ticker && <span>Ticker: {norm.ticker}</span>}
                            {norm.quantity && <span>Qty: {norm.quantity}</span>}
                            {norm.value && <span>Value: ${Number(norm.value).toLocaleString()}</span>}
                          </div>
                          {change.notes && <p className="text-xs text-muted-foreground mt-1 italic">{change.notes}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">{formatDate(change.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(change.status === "unmatched" || change.status === "pending_review") && (
                            <>
                              {matchTarget?.changeId === change.id ? (
                                <div className="flex items-center gap-2">
                                  <Select value={matchTarget!.clientId} onValueChange={(v) => setMatchTarget({ ...matchTarget!, clientId: v })}>
                                    <SelectTrigger className="w-[160px] h-8 text-xs" data-testid={`select-match-${change.id}`}>
                                      <SelectValue placeholder="Select client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {clients.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    className="h-8 text-xs"
                                    disabled={!matchTarget!.clientId || matchCustodialMutation.isPending}
                                    onClick={() => matchCustodialMutation.mutate({ id: change.id, clientId: matchTarget!.clientId })}
                                    data-testid={`button-confirm-match-${change.id}`}
                                  >
                                    {matchCustodialMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setMatchTarget(null)}>Cancel</Button>
                                </div>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => setMatchTarget({ changeId: change.id, clientId: "" })}
                                    data-testid={`button-match-${change.id}`}
                                  >
                                    <ArrowRight className="w-3 h-3 mr-1" />
                                    Match
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-xs text-muted-foreground"
                                    onClick={() => ignoreCustodialMutation.mutate(change.id)}
                                    disabled={ignoreCustodialMutation.isPending}
                                    data-testid={`button-ignore-${change.id}`}
                                  >
                                    Ignore
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="validation-rules" className="space-y-4 mt-4">
          <ValidationRulesAdmin />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedItem && !showApproveDialog && !showRejectDialog} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedItem?.title}</DialogTitle>
            <DialogDescription>{selectedItem?.description}</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {statusBadge(selectedItem.status)}
                {priorityBadge(selectedItem.priority)}
                {typeBadge(selectedItem.itemType)}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Entity</p>
                  <p>{selectedItem.entityType} — {selectedItem.entityId || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted By</p>
                  <p>{selectedItem.submittedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p>{formatDate(selectedItem.createdAt)}</p>
                </div>
                {selectedItem.reviewedBy && (
                  <div>
                    <p className="text-xs text-muted-foreground">Reviewed By</p>
                    <p>{selectedItem.reviewedBy} — {formatDate(selectedItem.reviewedAt)}</p>
                  </div>
                )}
              </div>
              {selectedItem.comments && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Comments</p>
                  <p className="text-sm bg-muted/50 p-2 rounded">{selectedItem.comments}</p>
                </div>
              )}
              <ValidationResultsPanel approvalItemId={selectedItem.id} />

              <div>
                <p className="text-xs text-muted-foreground mb-2">Payload</p>
                <div className="bg-muted/30 p-3 rounded border max-h-[200px] overflow-auto">
                  <PayloadDiff payload={selectedItem.payload} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedItem?.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => setShowApproveDialog(true)}
                  data-testid="button-detail-approve"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectDialog(true)}
                  data-testid="button-detail-reject"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApproveDialog} onOpenChange={(o) => { if (!o) { setShowApproveDialog(false); setActionComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve: {selectedItem?.title}</DialogTitle>
            <DialogDescription>This action cannot be undone. Add an optional comment.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Optional comment..."
            value={actionComment}
            onChange={(e) => setActionComment(e.target.value)}
            data-testid="input-approve-comment"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowApproveDialog(false); setActionComment(""); }}>Cancel</Button>
            <Button
              onClick={() => selectedItem && approveMutation.mutate(selectedItem.id)}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={(o) => { if (!o) { setShowRejectDialog(false); setActionComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject: {selectedItem?.title}</DialogTitle>
            <DialogDescription>Provide feedback for the submitter.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={actionComment}
            onChange={(e) => setActionComment(e.target.value)}
            data-testid="input-reject-comment"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setActionComment(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedItem && rejectMutation.mutate(selectedItem.id)}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
