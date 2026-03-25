import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Save, Clock, AlertTriangle, CheckCircle2, ClipboardCheck, Bug, Lightbulb, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useEffect } from "react";

interface FeedbackItem {
  id: string;
  type: string;
  message: string;
  pageUrl?: string;
  email?: string;
  createdAt?: string;
}

interface ApprovalRule {
  id: string;
  itemType: string;
  requiredReviewerRole: string;
  slaHours: number;
  escalationRole?: string;
  isActive: boolean;
}

interface IntegrationHealthItem {
  source: string;
  label?: string;
  status: string;
  lastSyncAt: string;
  errorCount: number;
}

interface ReminderSettings {
  [key: string]: { days: number };
}

interface AuditEvent {
  id?: string;
  jobId?: string;
  job_id?: string;
  eventType?: string;
  event_type?: string;
  timestamp?: string;
}

interface AuditJobDetail {
  job_id?: string;
  advisor_name: string;
  client_name: string;
  task_type: string;
  status: string;
  timeline?: { event: string; actor: string; detail: string; timestamp?: string }[];
}

const feedbackTypeConfig: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  bug: { label: "Bug Report", icon: Bug, color: "text-red-600" },
  feature: { label: "Feature Request", icon: Lightbulb, color: "text-amber-600" },
  feedback: { label: "General Feedback", icon: MessageSquare, color: "text-blue-600" },
};

function PilotFeedbackTab() {
  const [filterType, setFilterType] = useState<string>("all");

  const { data: feedback, isLoading } = useQuery<FeedbackItem[]>({
    queryKey: ["/api/admin/feedback"],
  });

  const { data: stats } = useQuery<{ type: string; count: number }[]>({
    queryKey: ["/api/admin/feedback/stats"],
  });

  const filtered = feedback?.filter((f) => filterType === "all" || f.type === filterType) || [];
  const totalCount = stats?.reduce((sum, s) => sum + s.count, 0) || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pilot-feedback-tab">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-total-feedback">{totalCount}</p>
            <p className="text-sm text-muted-foreground">Total Feedback</p>
          </CardContent>
        </Card>
        {(["bug", "feature", "feedback"] as const).map((type) => {
          const config = feedbackTypeConfig[type];
          const count = stats?.find((s) => s.type === type)?.count || 0;
          const TypeIcon = config.icon;
          return (
            <Card key={type}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TypeIcon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-2xl font-bold" data-testid={`text-count-${type}`}>{count}</span>
                </div>
                <p className="text-sm text-muted-foreground">{config.label}s</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Feedback</CardTitle>
            <div className="flex gap-1">
              {["all", "bug", "feature", "feedback"].map((t) => (
                <Button
                  key={t}
                  variant={filterType === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(t)}
                  data-testid={`button-filter-${t}`}
                >
                  {t === "all" ? "All" : feedbackTypeConfig[t]?.label || t}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-feedback">
              No feedback received yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Page</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const config = feedbackTypeConfig[item.type] || feedbackTypeConfig.feedback;
                  const TypeIcon = config.icon;
                  return (
                    <TableRow key={item.id} data-testid={`row-feedback-${item.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <TypeIcon className={`w-4 h-4 ${config.color}`} />
                          <Badge variant="outline" className="text-xs">{config.label}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{item.message}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.pageUrl || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.email || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ApprovalRulesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);

  const { data: rules = [], isLoading } = useQuery<ApprovalRule[]>({
    queryKey: ["/api/admin/approval-rules"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/approval-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approval-rules"] });
      toast({ title: "Rule deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/approval-rules/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approval-rules"] });
      toast({ title: "Rule updated" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rules.length} rule{rules.length !== 1 ? "s" : ""} configured</p>
        <Button size="sm" onClick={() => { setEditingRule(null); setShowForm(true); }} data-testid="button-create-rule">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create Rule
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardCheck className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No approval rules configured yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Type</TableHead>
                  <TableHead>Reviewer Role</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Escalation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                    <TableCell className="font-medium capitalize">{rule.itemType?.replace(/_/g, " ")}</TableCell>
                    <TableCell className="capitalize">{rule.requiredReviewerRole?.replace(/_/g, " ")}</TableCell>
                    <TableCell>{rule.slaHours}h</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{rule.escalationRole?.replace(/_/g, " ") || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={rule.isActive ? "default" : "secondary"}
                        className="cursor-pointer no-default-active-elevate"
                        onClick={() => toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                        data-testid={`badge-toggle-${rule.id}`}
                      >
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingRule(rule); setShowForm(true); }} data-testid={`button-edit-${rule.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(rule.id)} data-testid={`button-delete-${rule.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <ApprovalRuleFormDialog
        rule={editingRule}
        open={showForm}
        onOpenChange={(v) => { if (!v) { setShowForm(false); setEditingRule(null); } else setShowForm(true); }}
      />
    </div>
  );
}

function ApprovalRuleFormDialog({ rule, open, onOpenChange }: { rule: ApprovalRule | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [itemType, setItemType] = useState("");
  const [reviewerRole, setReviewerRole] = useState("");
  const [slaHours, setSlaHours] = useState(24);
  const [escalationRole, setEscalationRole] = useState("");

  useEffect(() => {
    if (open) {
      setItemType(rule?.itemType || "");
      setReviewerRole(rule?.requiredReviewerRole || "");
      setSlaHours(rule?.slaHours || 24);
      setEscalationRole(rule?.escalationRole || "");
    }
  }, [open, rule]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = { itemType, requiredReviewerRole: reviewerRole, slaHours, escalationRole: escalationRole || null };
      if (rule) {
        return apiRequest("PATCH", `/api/admin/approval-rules/${rule.id}`, payload);
      }
      return apiRequest("POST", "/api/admin/approval-rules", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/approval-rules"] });
      toast({ title: rule ? "Rule updated" : "Rule created" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const itemTypes = [
    { value: "profile_update", label: "Profile Update" },
    { value: "custodial_change", label: "Custodial Change" },
    { value: "record_correction", label: "Record Correction" },
    { value: "compliance_review", label: "Compliance Review" },
    { value: "data_reconciliation", label: "Data Reconciliation" },
  ];

  const roles = [
    { value: "supervisor", label: "Supervisor" },
    { value: "compliance_officer", label: "Compliance Officer" },
    { value: "admin", label: "Admin" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Approval Rule" : "Create Approval Rule"}</DialogTitle>
          <DialogDescription>Configure when and how approval items are routed for review.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Item Type</Label>
            <select value={itemType} onChange={(e) => setItemType(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" data-testid="select-item-type">
              <option value="">Select type...</option>
              {itemTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Required Reviewer Role</Label>
            <select value={reviewerRole} onChange={(e) => setReviewerRole(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" data-testid="select-reviewer-role">
              <option value="">Select role...</option>
              {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>SLA Hours</Label>
            <Input type="number" value={slaHours} onChange={(e) => setSlaHours(Number(e.target.value))} min={1} data-testid="input-sla-hours" />
          </div>
          <div className="space-y-1.5">
            <Label>Escalation Role (optional)</Label>
            <select value={escalationRole} onChange={(e) => setEscalationRole(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" data-testid="select-escalation-role">
              <option value="">None</option>
              {roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!itemType || !reviewerRole || mutation.isPending} data-testid="button-save-rule">
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IntegrationHealthTab() {
  const { data: integrations = [], isLoading } = useQuery<IntegrationHealthItem[]>({
    queryKey: ["/api/admin/integrations"],
  });

  const allConnected = integrations.every((i) => i.status === "connected" || i.status === "active");

  return (
    <div className="space-y-4">
      <Card className={allConnected ? "border-emerald-200 dark:border-emerald-800" : "border-amber-200 dark:border-amber-800"}>
        <CardContent className="flex items-center gap-3 py-3">
          {allConnected ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium">All systems operational</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium">{integrations.filter((i) => i.status !== "connected" && i.status !== "active").length} system(s) require attention</span>
            </>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => {
            const isOk = integration.status === "connected" || integration.status === "active";
            return (
              <Card key={integration.source} data-testid={`card-integration-${integration.source}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{integration.label || integration.source}</CardTitle>
                    <Badge variant={isOk ? "default" : integration.status === "not_configured" ? "secondary" : "destructive"} className="no-default-active-elevate text-[10px]">
                      {isOk ? "Connected" : integration.status === "not_configured" ? "Not Configured" : "Error"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Last sync: {new Date(integration.lastSyncAt).toLocaleString()}</span>
                  </div>
                  {integration.errorCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{integration.errorCount} error(s)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <div className={`w-2 h-2 rounded-full ${isOk ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <span className="text-[10px] text-muted-foreground capitalize">{integration.source}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReminderSettingsTab() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<ReminderSettings>({
    queryKey: ["/api/admin/settings/reminders"],
  });

  const [local, setLocal] = useState<ReminderSettings | null>(null);

  useEffect(() => {
    if (settings && !local) setLocal(settings);
  }, [settings, local]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/admin/settings/reminders", local),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/reminders"] });
      toast({ title: "Reminder settings saved" });
    },
  });

  if (isLoading || !local) return <Skeleton className="h-64" />;

  const reminderFields = [
    { key: "profileExpiration", label: "Profile Expiration", description: "Days before investor profile expires" },
    { key: "documentDeadline", label: "Document Deadline", description: "Days before document deadline" },
    { key: "complianceReview", label: "Compliance Review", description: "Days before compliance review due" },
    { key: "clientReview", label: "Client Review", description: "Days before periodic client review" },
  ];

  return (
    <div className="space-y-4 max-w-xl">
      {reminderFields.map((field) => (
        <Card key={field.key}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex-1">
              <p className="text-sm font-medium">{field.label}</p>
              <p className="text-xs text-muted-foreground">{field.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                className="w-20 text-center"
                value={local[field.key]?.days || 30}
                onChange={(e) => setLocal({ ...local, [field.key]: { ...local[field.key], days: Number(e.target.value) } })}
                min={1}
                data-testid={`input-${field.key}-days`}
              />
              <span className="text-xs text-muted-foreground">days</span>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-reminders">
        <Save className="w-3.5 h-3.5 mr-1" />
        {saveMutation.isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}

function CassidyAuditTab() {
  const [jobIdSearch, setJobIdSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [results, setResults] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [jobDetail, setJobDetail] = useState<AuditJobDetail | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (jobIdSearch) params.set("job_id", jobIdSearch);
      if (eventTypeFilter) params.set("event_type", eventTypeFilter);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/cassidy-audit?${params}`);
      if (res.ok) {
        setResults(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const [fullTrace, setFullTrace] = useState<any>(null);
  const [chainStats, setChainStats] = useState<any>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const viewJobTimeline = async (jobId: string) => {
    try {
      setFullTrace(null);
      setChainStats(null);
      const res = await fetch(`/api/admin/cassidy-audit/${jobId}`);
      if (res.ok) {
        setJobDetail(await res.json());
      }
    } catch {
    }
  };

  const exportFullTrace = async (jobId: string) => {
    setTraceLoading(true);
    try {
      const res = await fetch(`/api/cassidy/jobs/${jobId}/trace/full`);
      if (res.ok) {
        setFullTrace(await res.json());
      }
    } catch {
    } finally {
      setTraceLoading(false);
    }
  };

  const viewChainStats = async (jobId: string) => {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/cassidy/jobs/${jobId}/chain-stats`);
      if (res.ok) {
        setChainStats(await res.json());
      }
    } catch {
    } finally {
      setStatsLoading(false);
    }
  };

  const eventTypes = [
    { value: "", label: "All Events" },
    { value: "request_sent", label: "Request Sent" },
    { value: "routing_decision", label: "Routing Decision" },
    { value: "agent_called", label: "Agent Called" },
    { value: "agent_responded", label: "Agent Responded" },
    { value: "synthesis_complete", label: "Synthesis Complete" },
    { value: "callback_received", label: "Callback Received" },
    { value: "result_rendered", label: "Result Rendered" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search Audit Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Job ID</Label>
              <Input placeholder="UUID" value={jobIdSearch} onChange={(e) => setJobIdSearch(e.target.value)} data-testid="input-audit-job-id" />
            </div>
            <div>
              <Label>Event Type</Label>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger data-testid="select-audit-event-type"><SelectValue placeholder="All Events" /></SelectTrigger>
                <SelectContent>
                  {eventTypes.map((et) => (
                    <SelectItem key={et.value || "all"} value={et.value || "all"}>{et.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="input-audit-start-date" />
            </div>
            <div>
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-testid="input-audit-end-date" />
            </div>
          </div>
          <Button onClick={handleSearch} disabled={loading} data-testid="button-audit-search">
            {loading ? "Searching..." : "Search"}
          </Button>
        </CardContent>
      </Card>

      {jobDetail && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Job Timeline: {jobDetail.job_id?.substring(0, 8)}...</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setJobDetail(null)} data-testid="button-close-timeline">Close</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex gap-4 text-muted-foreground">
                <span>Advisor: {jobDetail.advisor_name}</span>
                <span>Client: {jobDetail.client_name}</span>
                <span>Type: {jobDetail.task_type}</span>
                <span className="capitalize">Status: {jobDetail.status}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  disabled={traceLoading}
                  onClick={() => exportFullTrace(jobDetail.job_id!)}
                  data-testid="button-export-full-trace"
                >
                  {traceLoading ? "Loading..." : "Full Trace"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  disabled={statsLoading}
                  onClick={() => viewChainStats(jobDetail.job_id!)}
                  data-testid="button-view-chain-stats"
                >
                  {statsLoading ? "Loading..." : "Chain Stats"}
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {(jobDetail.timeline || []).map((event, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-2 rounded bg-muted/50" data-testid={`audit-timeline-${idx}`}>
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{event.event}</span>
                        <span className="text-xs text-muted-foreground">{event.actor}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{event.detail}</div>
                      <div className="text-xs text-muted-foreground">{event.timestamp ? new Date(event.timestamp).toLocaleString() : ""}</div>
                    </div>
                  </div>
                ))}
              </div>

              {fullTrace && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Full Trace Export</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(fullTrace, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `trace-${jobDetail.job_id}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      data-testid="button-download-trace"
                    >
                      Download JSON
                    </Button>
                  </div>
                  <pre className="text-[10px] bg-muted/50 p-3 rounded overflow-auto max-h-64">{JSON.stringify(fullTrace, null, 2)}</pre>
                </div>
              )}

              {chainStats && (
                <div className="mt-4">
                  <span className="text-xs font-medium block mb-2">Chain Execution Stats</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(chainStats).filter(([k]) => k !== "job_id").map(([key, value]) => (
                      <div key={key} className="p-2 rounded bg-muted/50 text-center" data-testid={`chain-stat-${key}`}>
                        <div className="text-[10px] text-muted-foreground">{key.replace(/_/g, " ")}</div>
                        <div className="text-sm font-medium">{typeof value === "number" ? value.toLocaleString() : String(value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results ({results.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events found. Run a search to see results.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Timestamp</th>
                    <th className="text-left p-2 font-medium">Job ID</th>
                    <th className="text-left p-2 font-medium">Event</th>
                    <th className="text-left p-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((event, idx: number) => (
                    <tr key={event.id || idx} className="border-b hover:bg-muted/50" data-testid={`audit-row-${idx}`}>
                      <td className="p-2 text-xs text-muted-foreground">{event.timestamp ? new Date(event.timestamp).toLocaleString() : ""}</td>
                      <td className="p-2 font-mono text-xs">{(event.jobId || event.job_id)?.substring(0, 8)}...</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">{event.eventType || event.event_type}</Badge>
                      </td>
                      <td className="p-2">
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => viewJobTimeline((event.jobId || event.job_id) ?? "")} data-testid={`button-view-timeline-${idx}`}>
                          View Timeline
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface TriggerCategory {
  id: string;
  name: string;
  description: string | null;
  defaultActions: string[];
  isActive: boolean;
}

function TriggerCategoriesTab() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: categories, isLoading } = useQuery<TriggerCategory[]>({
    queryKey: ["/api/triggers/categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      const res = await apiRequest("POST", "/api/triggers/categories", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/triggers/categories"] });
      setShowCreate(false);
      setName("");
      setDescription("");
      toast({ title: "Category created" });
    },
    onError: () => toast({ title: "Failed to create category", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; description?: string }) => {
      const res = await apiRequest("PUT", `/api/triggers/categories/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/triggers/categories"] });
      setEditingId(null);
      setName("");
      setDescription("");
      toast({ title: "Category updated" });
    },
    onError: () => toast({ title: "Failed to update category", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, activate }: { id: string; activate: boolean }) => {
      await apiRequest("PUT", `/api/triggers/categories/${id}/${activate ? "activate" : "deactivate"}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/triggers/categories"] });
      toast({ title: "Category status updated" });
    },
    onError: () => toast({ title: "Failed to toggle category", variant: "destructive" }),
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6" data-testid="trigger-categories-tab">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Trigger Categories</CardTitle>
          <Button size="sm" onClick={() => { setShowCreate(true); setName(""); setDescription(""); }} data-testid="button-create-trigger-category">
            <Plus className="w-4 h-4 mr-1" /> New Category
          </Button>
        </CardHeader>
        <CardContent>
          {(!categories || categories.length === 0) ? (
            <p className="text-sm text-muted-foreground">No trigger categories defined yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id} data-testid={`trigger-category-${cat.id}`}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{cat.description || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={cat.isActive ? "default" : "secondary"}>
                        {cat.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setEditingId(cat.id);
                            setName(cat.name);
                            setDescription(cat.description || "");
                          }}
                          data-testid={`button-edit-category-${cat.id}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleMutation.mutate({ id: cat.id, activate: !cat.isActive })}
                          data-testid={`button-toggle-category-${cat.id}`}
                        >
                          {cat.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Trigger Category</DialogTitle>
            <DialogDescription>Create a category that groups life event triggers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Retirement Planning" data-testid="input-category-name" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." data-testid="input-category-description" />
            </div>
            <Button
              className="w-full"
              disabled={!name || createMutation.isPending}
              onClick={() => createMutation.mutate({ name, description })}
              data-testid="button-submit-category"
            >
              {createMutation.isPending ? "Creating..." : "Create Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingId} onOpenChange={(open) => { if (!open) setEditingId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trigger Category</DialogTitle>
            <DialogDescription>Update the category name or description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-edit-category-name" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-edit-category-description" />
            </div>
            <Button
              className="w-full"
              disabled={!name || updateMutation.isPending}
              onClick={() => editingId && updateMutation.mutate({ id: editingId, name, description })}
              data-testid="button-update-category"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ApiKeyMeta {
  id: string;
  keyName: string;
  integration: string;
  lastRotatedAt: string | null;
  expiresAt: string | null;
  rotatedBy: string | null;
  notes: string | null;
}

function ApiKeyRotationTab() {
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState({ keyName: "", integration: "", expiresAt: "", lastRotatedAt: "", notes: "" });

  const { data: keys = [], isLoading } = useQuery<ApiKeyMeta[]>({
    queryKey: ["/api/admin/api-key-metadata"],
  });

  const addMutation = useMutation({
    mutationFn: (data: { keyName: string; integration: string; lastRotatedAt?: string; expiresAt?: string | null; notes?: string | null }) =>
      apiRequest("POST", "/api/admin/api-key-metadata", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-key-metadata"] });
      toast({ title: "Key metadata saved" });
      setShowAdd(false);
      setNewKey({ keyName: "", integration: "", expiresAt: "", lastRotatedAt: "", notes: "" });
    },
    onError: () => toast({ title: "Failed to save key metadata", variant: "destructive" }),
  });

  const rotateMutation = useMutation({
    mutationFn: (keyName: string) =>
      apiRequest("POST", `/api/admin/api-key-metadata/${encodeURIComponent(keyName)}/rotate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-key-metadata"] });
      toast({ title: "Key marked as rotated" });
    },
    onError: () => toast({ title: "Failed to mark key as rotated", variant: "destructive" }),
  });

  function getKeyStatus(key: ApiKeyMeta): { status: "ok" | "warning" | "critical"; message: string } {
    const now = Date.now();
    const lastRotated = key.lastRotatedAt ? new Date(key.lastRotatedAt).getTime() : null;
    const ageDays = lastRotated ? Math.floor((now - lastRotated) / (1000 * 60 * 60 * 24)) : -1;
    const expiresAt = key.expiresAt ? new Date(key.expiresAt).getTime() : null;
    const daysUntilExpiry = expiresAt ? Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;

    if (daysUntilExpiry !== null && daysUntilExpiry <= 0) {
      return { status: "critical", message: `Expired ${Math.abs(daysUntilExpiry)} day(s) ago` };
    }
    if (daysUntilExpiry !== null && daysUntilExpiry <= 14) {
      return { status: "warning", message: `Expires in ${daysUntilExpiry} day(s)` };
    }
    if (ageDays < 0) {
      return { status: "warning", message: "Last rotation date unknown" };
    }
    if (ageDays >= 90) {
      return { status: "warning", message: `${ageDays} days old — rotation recommended` };
    }
    return { status: "ok", message: `${ageDays} days old` };
  }

  const hasWarnings = keys.some((k) => {
    const s = getKeyStatus(k);
    return s.status !== "ok";
  });

  return (
    <div className="space-y-4">
      {hasWarnings && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium">One or more API keys need attention</span>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{keys.length} key(s) tracked</span>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-api-key">
          <Plus className="w-4 h-4 mr-1" /> Track Key
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : keys.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No API keys tracked yet. Add keys to monitor their age and rotation status.</p>
            <p className="text-xs text-muted-foreground">Common keys to track: OPENAI_API_KEY, SALESFORCE_CLIENT_SECRET, ORION_API_KEY, CASSIDY_API_KEY</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => {
            const { status, message } = getKeyStatus(key);
            return (
              <Card key={key.id} data-testid={`card-api-key-${key.keyName}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{key.keyName}</CardTitle>
                      <span className="text-xs text-muted-foreground capitalize">{key.integration}</span>
                    </div>
                    <Badge
                      variant={status === "ok" ? "default" : status === "warning" ? "secondary" : "destructive"}
                      className="no-default-active-elevate text-[10px]"
                      data-testid={`badge-key-status-${key.keyName}`}
                    >
                      {status === "ok" ? "Healthy" : status === "warning" ? "Needs Rotation" : "Expired"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Last rotated: {key.lastRotatedAt ? new Date(key.lastRotatedAt).toLocaleDateString() : "Unknown"}</span>
                    {key.rotatedBy && <span className="text-muted-foreground">by {key.rotatedBy}</span>}
                  </div>
                  {key.expiresAt && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Expires: {new Date(key.expiresAt).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className={`flex items-center gap-2 text-xs ${status === "critical" ? "text-destructive" : status === "warning" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                    {status === "ok" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                    <span>{message}</span>
                  </div>
                  {key.notes && (
                    <p className="text-xs text-muted-foreground italic">{key.notes}</p>
                  )}
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rotateMutation.mutate(key.keyName)}
                      disabled={rotateMutation.isPending}
                      data-testid={`button-rotate-${key.keyName}`}
                    >
                      <Save className="w-3 h-3 mr-1" /> Mark as Rotated
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Track API Key</DialogTitle>
            <DialogDescription>Add or update metadata for an API key to monitor its age.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Key Name</Label>
              <Input
                value={newKey.keyName}
                onChange={(e) => setNewKey({ ...newKey, keyName: e.target.value })}
                placeholder="e.g. OPENAI_API_KEY"
                data-testid="input-key-name"
              />
            </div>
            <div>
              <Label>Integration</Label>
              <Select value={newKey.integration} onValueChange={(v) => setNewKey({ ...newKey, integration: v })}>
                <SelectTrigger data-testid="select-integration">
                  <SelectValue placeholder="Select integration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="salesforce">Salesforce</SelectItem>
                  <SelectItem value="orion">Orion</SelectItem>
                  <SelectItem value="cassidy">Cassidy</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Last Rotated Date (optional, defaults to today)</Label>
              <Input
                type="date"
                value={newKey.lastRotatedAt}
                onChange={(e) => setNewKey({ ...newKey, lastRotatedAt: e.target.value })}
                data-testid="input-last-rotated-at"
              />
            </div>
            <div>
              <Label>Expiration Date (optional)</Label>
              <Input
                type="date"
                value={newKey.expiresAt}
                onChange={(e) => setNewKey({ ...newKey, expiresAt: e.target.value })}
                data-testid="input-expires-at"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={newKey.notes}
                onChange={(e) => setNewKey({ ...newKey, notes: e.target.value })}
                placeholder="Any additional context"
                data-testid="input-key-notes"
              />
            </div>
            <Button
              className="w-full"
              disabled={!newKey.keyName || !newKey.integration || addMutation.isPending}
              onClick={() => addMutation.mutate({
                keyName: newKey.keyName,
                integration: newKey.integration,
                lastRotatedAt: newKey.lastRotatedAt || undefined,
                expiresAt: newKey.expiresAt || null,
                notes: newKey.notes || null,
              })}
              data-testid="button-save-key"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { PilotFeedbackTab, ApprovalRulesTab, IntegrationHealthTab, ReminderSettingsTab, CassidyAuditTab, TriggerCategoriesTab, ApiKeyRotationTab };
