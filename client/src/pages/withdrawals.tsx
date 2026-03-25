import { useState, useRef } from "react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, Plus, Loader2, CheckCircle2, Clock, XCircle,
  ArrowRight, FileDown, ShieldCheck, Tag, FileText, History,
  AlertTriangle, Download, RefreshCw,
} from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { WithdrawalAnalysisPanel } from "@/components/withdrawal-analysis-panel";
import { P } from "@/styles/tokens";
import { EmptyState } from "@/components/empty-state";
import { ArrowDownToLine } from "lucide-react";

interface WithdrawalRequest {
  id: string;
  advisorId: string;
  clientId: string;
  accountId: string;
  amount: string;
  method: string;
  reason: string;
  frequency: string;
  taxWithholding: string | null;
  notes: string | null;
  status: string;
  orionSetAsideId: string | null;
  orionNwrTagId: string | null;
  salesforceCaseId: string | null;
  salesforceCaseNumber: string | null;
  eclipseFileGenerated: boolean;
  eclipseFileName: string | null;
  tradeConfirmedAt: string | null;
  nwrRemovedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  clientName: string;
  accountNumber: string;
  accountType: string;
}

interface AuditEntry {
  id: string;
  withdrawalId: string;
  action: string;
  performedBy: string;
  details: Record<string, unknown>;
  createdAt: string;
}

interface ClientOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface AccountOption {
  id: string;
  accountNumber: string;
  accountType: string;
  balance: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Pending", variant: "outline", icon: Clock },
  set_aside_created: { label: "Set-Aside Created", variant: "secondary", icon: DollarSign },
  nwr_applied: { label: "NWR Applied", variant: "secondary", icon: Tag },
  sf_case_created: { label: "SF Case Created", variant: "secondary", icon: FileText },
  eclipse_generated: { label: "Eclipse Generated", variant: "secondary", icon: FileDown },
  trade_executing: { label: "Trade Executing", variant: "default", icon: ArrowRight },
  trade_confirmed: { label: "Trade Confirmed", variant: "default", icon: CheckCircle2 },
  completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
};

const METHOD_LABELS: Record<string, string> = {
  ach: "ACH Transfer",
  wire: "Wire Transfer",
  check: "Check",
  journal: "Journal",
};

const REASON_OPTIONS = [
  "RMD Distribution",
  "Client Request",
  "Systematic Withdrawal",
  "Fee Payment",
  "Charitable Distribution",
  "Hardship",
  "Other",
];

const AUDIT_ACTION_LABELS: Record<string, string> = {
  request_created: "Request Created",
  orion_set_aside_created: "Orion Set-Aside & NWR Applied",
  salesforce_case_created: "Salesforce Case Created",
  eclipse_file_generated: "Eclipse Import File Generated",
  trade_confirmed: "Trade Confirmed & NWR Removed",
  withdrawal_cancelled: "Withdrawal Cancelled",
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "secondary" as const, icon: Clock };
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1" data-testid={`badge-withdrawal-status-${status}`}>
      <Icon size={12} />
      {config.label}
    </Badge>
  );
}

function WithdrawalForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [clientId, setClientId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [reason, setReason] = useState("");
  const [frequency, setFrequency] = useState("one_time");
  const [taxWithholding, setTaxWithholding] = useState("");
  const [notes, setNotes] = useState("");

  const { data: clientsRaw, isLoading: loadingClients } = useQuery<any>({
    queryKey: ["/api/clients"],
  });
  // /api/clients returns { clients: [...] } when MuleSoft/pagination is active,
  // or a raw array from local DB without params. Normalize to always be an array.
  const clients: ClientOption[] = Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw?.clients ?? []);

  const { data: clientDetail, isLoading: loadingAccounts } = useQuery<{ accounts: AccountOption[] }>({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });
  const accounts = clientDetail?.accounts || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/withdrawals", {
        clientId,
        accountId,
        amount,
        method,
        reason,
        frequency,
        taxWithholding: taxWithholding || undefined,
        notes: notes || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      toast({ title: "Withdrawal request created", description: "The request is now pending processing.", duration: 3000 });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const selectedAccount = accounts.find((a: AccountOption) => a.id === accountId);

  return (
    <div className="space-y-6">
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client" data-testid="label-client">Client</Label>
            {loadingClients ? <Skeleton className="h-10 w-full" /> : (
              <Select value={clientId} onValueChange={(v) => { setClientId(v); setAccountId(""); }}>
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c: ClientOption) => (
                    <SelectItem key={c.id} value={c.id} data-testid={`select-item-client-${c.id}`}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account" data-testid="label-account">Account</Label>
            {clientId && loadingAccounts ? <Skeleton className="h-10 w-full" /> : (
              <Select value={accountId} onValueChange={setAccountId} disabled={!clientId}>
                <SelectTrigger data-testid="select-account">
                  <SelectValue placeholder={clientId ? "Select an account" : "Select a client first"} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a: AccountOption) => (
                    <SelectItem key={a.id} value={a.id} data-testid={`select-item-account-${a.id}`}>
                      {a.accountNumber} - {a.accountType} (${parseFloat(a.balance).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button
            onClick={() => setStep(2)}
            disabled={!clientId || !accountId}
            className="w-full"
            data-testid="button-next-step"
          >
            Next <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {selectedAccount && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-sm text-muted-foreground" data-testid="text-selected-account">
                  Account: {selectedAccount.accountNumber} ({selectedAccount.accountType})
                  <br />
                  Balance: ${parseFloat(selectedAccount.balance).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount" data-testid="label-amount">Withdrawal Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              data-testid="input-amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method" data-testid="label-method">Withdrawal Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger data-testid="select-method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ach">ACH Transfer</SelectItem>
                <SelectItem value="wire">Wire Transfer</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="journal">Journal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" data-testid="label-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger data-testid="select-reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency" data-testid="label-frequency">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger data-testid="select-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">One-Time</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax" data-testid="label-tax-withholding">Tax Withholding (%)</Label>
            <Input
              id="tax"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={taxWithholding}
              onChange={(e) => setTaxWithholding(e.target.value)}
              placeholder="0.00"
              data-testid="input-tax-withholding"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" data-testid="label-notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              data-testid="input-notes"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1" data-testid="button-back">
              Back
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!amount || !method || !reason || createMutation.isPending}
              className="flex-1"
              data-testid="button-submit-withdrawal"
            >
              {createMutation.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Submit Request
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function WithdrawalDetail({ withdrawal, onClose }: { withdrawal: WithdrawalRequest; onClose: () => void }) {
  const { toast } = useToast();

  const { data: auditLog = [], isLoading: loadingAudit } = useQuery<AuditEntry[]>({
    queryKey: ["/api/withdrawals", withdrawal.id, "audit-log"],
  });

  const setAsideMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/withdrawals/${withdrawal.id}/set-aside`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      toast({ title: "Set-aside created", description: "Orion set-aside and NWR tag applied." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sfCaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/withdrawals/${withdrawal.id}/salesforce-case`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      toast({ title: "Salesforce case created", description: "Withdrawal case has been created in Salesforce." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const eclipseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/withdrawals/${withdrawal.id}/eclipse-file`);
      return res.json();
    },
    onSuccess: (data: { eclipseFile?: { content: string; fileName: string } }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      toast({ title: "Eclipse file generated", description: "Import file is ready for download." });
      if (data.eclipseFile) {
        const blob = new Blob([data.eclipseFile.content], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.eclipseFile.fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const confirmTradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/withdrawals/${withdrawal.id}/confirm-trade`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      toast({ title: "Trade confirmed", description: "Withdrawal completed, NWR tag removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/withdrawals/${withdrawal.id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      toast({ title: "Withdrawal cancelled" });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const syncSfMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/withdrawals/${withdrawal.id}/sync-salesforce`);
      return res.json();
    },
    onSuccess: (data: { synced: boolean; statusChanged?: boolean; sfCaseStatus?: string; newStatus?: string; message?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      if (data.statusChanged) {
        toast({ title: "Salesforce synced", description: `Status updated to ${data.newStatus} (SF: ${data.sfCaseStatus})` });
      } else if (data.synced) {
        toast({ title: "Salesforce synced", description: `Case status: ${data.sfCaseStatus}. No status change needed.` });
      } else {
        toast({ title: "Sync unavailable", description: data.message || "Salesforce not configured" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Sync error", description: err.message, variant: "destructive" });
    },
  });

  const isTerminal = ["completed", "cancelled"].includes(withdrawal.status);
  const anyPending = setAsideMutation.isPending || sfCaseMutation.isPending ||
    eclipseMutation.isPending || confirmTradeMutation.isPending || cancelMutation.isPending || syncSfMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Client</p>
          <p className="font-medium" data-testid="text-detail-client">{withdrawal.clientName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Account</p>
          <p className="font-medium" data-testid="text-detail-account">{withdrawal.accountNumber} ({withdrawal.accountType})</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="font-medium text-lg" data-testid="text-detail-amount">${parseFloat(withdrawal.amount).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Method</p>
          <p className="font-medium" data-testid="text-detail-method">{METHOD_LABELS[withdrawal.method] || withdrawal.method}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Reason</p>
          <p className="font-medium" data-testid="text-detail-reason">{withdrawal.reason}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <StatusBadge status={withdrawal.status} />
        </div>
        {withdrawal.taxWithholding && (
          <div>
            <p className="text-xs text-muted-foreground">Tax Withholding</p>
            <p className="font-medium">{withdrawal.taxWithholding}%</p>
          </div>
        )}
        {withdrawal.salesforceCaseNumber && (
          <div>
            <p className="text-xs text-muted-foreground">SF Case #</p>
            <p className="font-medium" data-testid="text-detail-sf-case">{withdrawal.salesforceCaseNumber}</p>
          </div>
        )}
      </div>

      {withdrawal.notes && (
        <div>
          <p className="text-xs text-muted-foreground">Notes</p>
          <p className="text-sm">{withdrawal.notes}</p>
        </div>
      )}

      <CassidyAnalysisButton
        taskType="recommendation"
        clientId={withdrawal.clientId || ""}
        context={{
          analysisType: "withdrawal",
          clientName: withdrawal.clientName,
          accountType: withdrawal.accountType,
          accountNumber: withdrawal.accountNumber,
          withdrawalAmount: parseFloat(withdrawal.amount),
          method: withdrawal.method,
          reason: withdrawal.reason,
          frequency: withdrawal.frequency || "one_time",
          taxWithholding: withdrawal.taxWithholding,
        }}
        label="Optimize Withdrawal"
        variant="outline"
        displayMode="inline"
      />

      {!isTerminal && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Workflow Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {!withdrawal.orionSetAsideId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAsideMutation.mutate()}
                  disabled={anyPending}
                  data-testid="button-create-set-aside"
                >
                  {setAsideMutation.isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : <Tag size={14} className="mr-1" />}
                  Create Set-Aside & NWR
                </Button>
              )}

              {!withdrawal.salesforceCaseId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sfCaseMutation.mutate()}
                  disabled={anyPending}
                  data-testid="button-create-sf-case"
                >
                  {sfCaseMutation.isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : <FileText size={14} className="mr-1" />}
                  Create SF Case
                </Button>
              )}

              {withdrawal.salesforceCaseId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => syncSfMutation.mutate()}
                  disabled={anyPending}
                  data-testid="button-sync-salesforce"
                >
                  {syncSfMutation.isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : <RefreshCw size={14} className="mr-1" />}
                  Sync SF Status
                </Button>
              )}

              {!withdrawal.eclipseFileGenerated && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => eclipseMutation.mutate()}
                  disabled={anyPending}
                  data-testid="button-generate-eclipse"
                >
                  {eclipseMutation.isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : <Download size={14} className="mr-1" />}
                  Generate Eclipse File
                </Button>
              )}

              {withdrawal.status !== "completed" && withdrawal.eclipseFileGenerated && (
                <Button
                  size="sm"
                  onClick={() => confirmTradeMutation.mutate()}
                  disabled={anyPending}
                  data-testid="button-confirm-trade"
                >
                  {confirmTradeMutation.isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : <CheckCircle2 size={14} className="mr-1" />}
                  Confirm Trade
                </Button>
              )}

              <Button
                size="sm"
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={anyPending}
                data-testid="button-cancel-withdrawal"
              >
                {cancelMutation.isPending ? <Loader2 className="animate-spin mr-1" size={14} /> : <XCircle size={14} className="mr-1" />}
                Cancel
              </Button>
            </div>

            {withdrawal.orionSetAsideId && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 size={12} className="text-green-600" /> Orion set-aside: {withdrawal.orionSetAsideId}
              </p>
            )}
            {withdrawal.orionNwrTagId && !withdrawal.nwrRemovedAt && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag size={12} className="text-amber-600" /> NWR tag active: {withdrawal.orionNwrTagId}
              </p>
            )}
            {withdrawal.nwrRemovedAt && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 size={12} className="text-green-600" /> NWR removed: {new Date(withdrawal.nwrRemovedAt).toLocaleString()}
              </p>
            )}
            {withdrawal.eclipseFileName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileDown size={12} className="text-blue-600" /> Eclipse file: {withdrawal.eclipseFileName}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-1">
          <History size={14} /> Audit Trail
        </h4>
        {loadingAudit ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : auditLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit entries yet.</p>
        ) : (
          <div className="space-y-2">
            {auditLog.map((entry: AuditEntry) => (
              <div key={entry.id} className="flex items-start gap-3 text-sm border-l-2 border-muted pl-3 py-1" data-testid={`audit-entry-${entry.id}`}>
                <div className="flex-1">
                  <p className="font-medium">{AUDIT_ACTION_LABELS[entry.action] || entry.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WithdrawalsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const sheetTriggerRef = useRef<HTMLElement | null>(null);

  const { data: withdrawals = [], isLoading } = useQuery<WithdrawalRequest[]>({
    queryKey: ["/api/withdrawals", statusFilter !== "all" ? `?status=${statusFilter}` : ""],
    queryFn: async () => {
      const url = statusFilter !== "all"
        ? `/api/withdrawals?status=${statusFilter}`
        : "/api/withdrawals";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch withdrawals");
      return res.json();
    },
  });

  const filteredWithdrawals = withdrawals.filter((w) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return w.clientName.toLowerCase().includes(q) || w.accountNumber.toLowerCase().includes(q);
  });

  const pendingCount = withdrawals.filter((w) => !["completed", "cancelled"].includes(w.status)).length;
  const completedCount = withdrawals.filter((w) => w.status === "completed").length;
  const totalAmount = withdrawals
    .filter((w) => w.status !== "cancelled")
    .reduce((sum, w) => sum + parseFloat(w.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground" data-testid="text-withdrawal-subtitle">
            Manage withdrawal requests, Orion set-asides, and trade execution
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="button-new-withdrawal">
          <Plus size={16} className="mr-2" /> New Withdrawal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: P.aL }}>
                <Clock size={18} style={{ color: P.amb }} />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-pending-count">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: P.gL }}>
                <CheckCircle2 size={18} style={{ color: P.grn }} />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-completed-count">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ background: P.bIce }}>
                <DollarSign size={18} style={{ color: P.blue }} />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-amount">${totalAmount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests" data-testid="tab-requests">Withdrawal Requests</TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-withdrawal-analysis">Withdrawal Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="analysis" className="mt-4">
          <WithdrawalAnalysisPanel />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Withdrawal Requests</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search client or account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px] h-9"
                data-testid="input-withdrawal-search"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="nwr_applied">NWR Applied</SelectItem>
                  <SelectItem value="sf_case_created">SF Case Created</SelectItem>
                  <SelectItem value="eclipse_generated">Eclipse Generated</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Showing {filteredWithdrawals.length} of {withdrawals.length} requests
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <EmptyState
              icon={ArrowDownToLine}
              title="No withdrawal requests"
              description="Create a new withdrawal request to get started."
              actionLabel="New Withdrawal"
              onAction={() => setShowCreateDialog(true)}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWithdrawals.map((w) => (
                  <TableRow
                    key={w.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={(e) => {
                      sheetTriggerRef.current = e.currentTarget as HTMLElement;
                      setSelectedWithdrawal(w);
                    }}
                    data-testid={`row-withdrawal-${w.id}`}
                  >
                    <TableCell className="font-medium" data-testid={`text-client-name-${w.id}`}>{w.clientName}</TableCell>
                    <TableCell data-testid={`text-account-${w.id}`}>{w.accountNumber}</TableCell>
                    <TableCell data-testid={`text-amount-${w.id}`}>${parseFloat(w.amount).toLocaleString()}</TableCell>
                    <TableCell>{METHOD_LABELS[w.method] || w.method}</TableCell>
                    <TableCell>{w.reason}</TableCell>
                    <TableCell><StatusBadge status={w.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {w.submittedAt ? new Date(w.submittedAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" data-testid={`button-view-${w.id}`}>
                        <ArrowRight size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Withdrawal Request</DialogTitle>
            <DialogDescription>Create a withdrawal request for a client account.</DialogDescription>
          </DialogHeader>
          <WithdrawalForm onClose={() => setShowCreateDialog(false)} />
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedWithdrawal} onOpenChange={(open) => {
        if (!open) {
          setSelectedWithdrawal(null);
          requestAnimationFrame(() => {
            if (sheetTriggerRef.current && document.contains(sheetTriggerRef.current)) {
              sheetTriggerRef.current.focus();
            } else {
              const fallback = document.querySelector('[data-testid="text-page-title"]') as HTMLElement;
              fallback?.focus();
            }
            sheetTriggerRef.current = null;
          });
        }
      }}>
        <SheetContent side="right" className="w-[560px] sm:max-w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Withdrawal Details</SheetTitle>
            <SheetDescription>
              {selectedWithdrawal?.clientName} — ${selectedWithdrawal ? parseFloat(selectedWithdrawal.amount).toLocaleString() : ""}
            </SheetDescription>
          </SheetHeader>
          {selectedWithdrawal && (
            <WithdrawalDetail
              withdrawal={selectedWithdrawal}
              onClose={() => setSelectedWithdrawal(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
