import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, ArrowRight, CheckCircle2, Clock, XCircle, FileDown, ArrowUpRight, Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { WithdrawalAnalysisPanel } from "@/components/withdrawal-analysis-panel";


interface WithdrawalSectionProps {
  clientId: string;
  accounts: any[];
}

const STATUS_PIPELINE = [
  { key: "pending", label: "Pending", color: "bg-yellow-500" },
  { key: "nwr_applied", label: "NWR Applied", color: "bg-blue-500" },
  { key: "sf_case_created", label: "SF Case", color: "bg-indigo-500" },
  { key: "eclipse_generated", label: "Eclipse", color: "bg-purple-500" },
  { key: "completed", label: "Complete", color: "bg-green-500" },
];

function StatusPipeline({ currentStatus }: { currentStatus: string }) {
  const currentIdx = STATUS_PIPELINE.findIndex(s => s.key === currentStatus);
  return (
    <div className="flex items-center gap-1" data-testid="status-pipeline">
      {STATUS_PIPELINE.map((step, i) => {
        const isPast = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full border-2 ${
                  isPast ? "bg-green-500 border-green-500" :
                  isCurrent ? `${step.color} border-current` :
                  "bg-muted border-muted-foreground/30"
                }`}
              />
              <span className={`text-[10px] mt-0.5 whitespace-nowrap ${isCurrent ? "font-semibold" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < STATUS_PIPELINE.length - 1 && (
              <div className={`w-6 h-0.5 mb-3 ${i < currentIdx ? "bg-green-500" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WithdrawalSection({ clientId, accounts }: WithdrawalSectionProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("ach");
  const [reason, setReason] = useState("");
  const [frequency, setFrequency] = useState("one_time");
  const [notes, setNotes] = useState("");

  const { data: withdrawals = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/withdrawals", clientId],
    queryFn: async () => {
      const r = await fetch(`/api/withdrawals?clientId=${clientId}`, { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/withdrawals", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals", clientId] });
      toast({ title: "Withdrawal request created", description: "Salesforce case, Orion NWR tag, and Eclipse queue entry generated." });
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create withdrawal", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/withdrawals/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals", clientId] });
      toast({ title: "Withdrawal updated" });
    },
  });

  function resetForm() {
    setShowForm(false);
    setSelectedAccount("");
    setAmount("");
    setMethod("ach");
    setReason("");
    setFrequency("one_time");
    setNotes("");
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "cancelled": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      nwr_applied: "bg-blue-100 text-blue-800",
      sf_case_created: "bg-indigo-100 text-indigo-800",
      eclipse_generated: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="withdrawal-section">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-withdrawal-title">Withdrawals</h3>
          <p className="text-sm text-muted-foreground">Manage withdrawal requests and analyze optimal withdrawal strategies</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm" data-testid="button-new-withdrawal">
          <Plus className="w-4 h-4 mr-1" />
          New Withdrawal
        </Button>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="requests" data-testid="tab-wd-requests">Requests</TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-wd-analysis">
            <Calculator className="w-3.5 h-3.5 mr-1" /> Withdrawal Analysis
          </TabsTrigger>
        </TabsList>
        <TabsContent value="analysis" className="mt-4">
          <WithdrawalAnalysisPanel clientId={clientId} accounts={accounts} compact={false} />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">

      {showForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-card" data-testid="form-withdrawal">
          <h4 className="font-medium text-sm">New Withdrawal Request</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Account</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger data-testid="select-account">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id} data-testid={`select-item-account-${a.id}`}>
                      {a.accountNumber} — {a.accountType} ({formatCurrency(parseFloat(a.balance), { abbreviated: false })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-withdrawal-amount"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Method</label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger data-testid="select-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ach">ACH</SelectItem>
                  <SelectItem value="wire">Wire</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="journal">Journal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Frequency</label>
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
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason</label>
              <Input
                placeholder="e.g. RMD distribution, income, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                data-testid="input-withdrawal-reason"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
            <Textarea
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              data-testid="input-withdrawal-notes"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => createMutation.mutate({ clientId, accountId: selectedAccount, amount: amount, method, reason, frequency, notes })}
              disabled={!selectedAccount || !amount || !reason || createMutation.isPending}
              size="sm"
              data-testid="button-submit-withdrawal"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ArrowUpRight className="w-4 h-4 mr-1" />}
              Submit Request
            </Button>
            <Button variant="ghost" size="sm" onClick={resetForm} data-testid="button-cancel-withdrawal">Cancel</Button>
          </div>
          <div className="bg-muted/50 rounded p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Workflow Pipeline:</p>
            <p>1. Form submission → 2. Orion NWR tag applied → 3. Salesforce case created → 4. Eclipse queue file generated → 5. Status tracking</p>
          </div>
        </div>
      )}

      {withdrawals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground" data-testid="text-no-withdrawals">
          <p className="text-sm">No withdrawal requests yet</p>
          <p className="text-xs mt-1">Click "New Withdrawal" to submit a request</p>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w: any) => (
            <div key={w.id} className="border rounded-lg p-4 space-y-3" data-testid={`card-withdrawal-${w.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {statusIcon(w.status)}
                  <div>
                    <div className="font-medium text-sm">{formatCurrency(parseFloat(w.amount), { abbreviated: false })}</div>
                    <div className="text-xs text-muted-foreground">{w.reason} — {w.method} ({w.frequency?.replace("_", " ")})</div>
                  </div>
                </div>
                <Badge className={`${statusBadge(w.status)} text-[10px]`} data-testid={`badge-status-${w.id}`}>
                  {w.status.replace(/_/g, " ")}
                </Badge>
              </div>

              <StatusPipeline currentStatus={w.status} />

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-muted/30 rounded p-2">
                  <span className="text-muted-foreground block">Salesforce Case</span>
                  <span className="font-mono font-medium" data-testid={`text-sf-case-${w.id}`}>{w.salesforceCaseId || "—"}</span>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <span className="text-muted-foreground block">Orion NWR Tag</span>
                  <span className="font-medium" data-testid={`text-nwr-${w.id}`}>{w.orionNwrTagId ? "Applied" : "Pending"}</span>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <span className="text-muted-foreground block">Eclipse Queue</span>
                  <span className="font-medium" data-testid={`text-eclipse-${w.id}`}>{w.eclipseFileGenerated ? "Queued" : "Pending"}</span>
                </div>
              </div>

              {w.eclipseFileName && (
                <div className="flex items-center gap-2 text-xs">
                  <FileDown className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-mono text-muted-foreground" data-testid={`text-eclipse-file-${w.id}`}>{w.eclipseFileName}</span>
                </div>
              )}

              {w.status !== "completed" && w.status !== "cancelled" && (
                <div className="flex items-center gap-2">
                  {w.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => updateMutation.mutate({ id: w.id, action: "apply_nwr" })}
                      disabled={updateMutation.isPending}
                      data-testid={`button-advance-${w.id}`}
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      Apply NWR
                    </Button>
                  )}
                  {w.status === "nwr_applied" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => updateMutation.mutate({ id: w.id, action: "create_sf_case" })}
                      disabled={updateMutation.isPending}
                      data-testid={`button-sf-case-${w.id}`}
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      Create SF Case
                    </Button>
                  )}
                  {w.status === "sf_case_created" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => updateMutation.mutate({ id: w.id, action: "generate_eclipse" })}
                      disabled={updateMutation.isPending}
                      data-testid={`button-eclipse-${w.id}`}
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      Generate Eclipse
                    </Button>
                  )}
                  {w.status === "eclipse_generated" && (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs"
                      onClick={() => updateMutation.mutate({ id: w.id, action: "complete" })}
                      disabled={updateMutation.isPending}
                      data-testid={`button-complete-${w.id}`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive"
                    onClick={() => updateMutation.mutate({ id: w.id, action: "cancel" })}
                    disabled={updateMutation.isPending}
                    data-testid={`button-cancel-wd-${w.id}`}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {w.notes && (
                <p className="text-xs text-muted-foreground italic" data-testid={`text-notes-${w.id}`}>{w.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
