import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NextLink from "next/link";
import {
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileWarning,
  DollarSign,
  Users,
  TrendingUp,
  Bell,
  Plus,
  Sparkles,
  Download,
  Filter,
  ChevronRight,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { Serif, Mono, Lbl } from "@/components/design/typography";
import { Pill } from "@/components/design";
import { Score } from "@/components/design/score";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { formatCurrency as _fc } from "@/lib/format";
const formatCurrency = (v: number) => _fc(v, { abbreviated: false });

function NigoForm({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    clientId: "",
    custodian: "",
    submissionType: "",
    reasonCode: "",
    reasonDescription: "",
    submittedDate: new Date().toISOString().split("T")[0],
    rejectedDate: new Date().toISOString().split("T")[0],
    priority: "normal",
  });

  const { data: clientsDataRaw } = useQuery<any>({ queryKey: ["/api/clients"] });
  // /api/clients returns { clients: [...] } when MuleSoft/pagination is active,
  // or a raw array from local DB without params. Normalize to always be an array.
  const clientsData: any[] = Array.isArray(clientsDataRaw) ? clientsDataRaw : (clientsDataRaw?.clients ?? []);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/custodial-reporting/nigo", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custodial-reporting/nigo"] });
      toast({ title: "NIGO record created" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create NIGO record", variant: "destructive" });
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <Lbl>Client</Lbl>
        <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
          <SelectTrigger data-testid="select-nigo-client"><SelectValue placeholder="Select client" /></SelectTrigger>
          <SelectContent>
            {clientsData?.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Lbl>Custodian</Lbl>
        <Input
          value={formData.custodian}
          onChange={(e) => setFormData({ ...formData, custodian: e.target.value })}
          placeholder="e.g. Schwab, Fidelity, Pershing"
          data-testid="input-nigo-custodian"
        />
      </div>
      <div>
        <Lbl>Submission Type</Lbl>
        <Select value={formData.submissionType} onValueChange={(v) => setFormData({ ...formData, submissionType: v })}>
          <SelectTrigger data-testid="select-nigo-type"><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="account_opening">Account Opening</SelectItem>
            <SelectItem value="transfer">Transfer / ACAT</SelectItem>
            <SelectItem value="distribution">Distribution</SelectItem>
            <SelectItem value="beneficiary_change">Beneficiary Change</SelectItem>
            <SelectItem value="name_change">Name Change</SelectItem>
            <SelectItem value="address_change">Address Change</SelectItem>
            <SelectItem value="rmd_distribution">RMD Distribution</SelectItem>
            <SelectItem value="rollover">Rollover</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Lbl>Reason Code</Lbl>
        <Select value={formData.reasonCode} onValueChange={(v) => setFormData({ ...formData, reasonCode: v })}>
          <SelectTrigger data-testid="select-nigo-reason"><SelectValue placeholder="Select reason" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="missing_signature">Missing Signature</SelectItem>
            <SelectItem value="incorrect_info">Incorrect Information</SelectItem>
            <SelectItem value="missing_documentation">Missing Documentation</SelectItem>
            <SelectItem value="medallion_required">Medallion Guarantee Required</SelectItem>
            <SelectItem value="form_outdated">Outdated Form</SelectItem>
            <SelectItem value="ssn_mismatch">SSN Mismatch</SelectItem>
            <SelectItem value="address_mismatch">Address Mismatch</SelectItem>
            <SelectItem value="beneficiary_incomplete">Beneficiary Info Incomplete</SelectItem>
            <SelectItem value="notarization_required">Notarization Required</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Lbl>Description</Lbl>
        <Input
          value={formData.reasonDescription}
          onChange={(e) => setFormData({ ...formData, reasonDescription: e.target.value })}
          placeholder="Additional details"
          data-testid="input-nigo-description"
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <Lbl>Submitted Date</Lbl>
          <Input type="date" value={formData.submittedDate} onChange={(e) => setFormData({ ...formData, submittedDate: e.target.value })} data-testid="input-nigo-submitted-date" />
        </div>
        <div>
          <Lbl>Rejected Date</Lbl>
          <Input type="date" value={formData.rejectedDate} onChange={(e) => setFormData({ ...formData, rejectedDate: e.target.value })} data-testid="input-nigo-rejected-date" />
        </div>
      </div>
      <div>
        <Lbl>Priority</Lbl>
        <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
          <SelectTrigger data-testid="select-nigo-priority"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={() => createMutation.mutate(formData)}
        disabled={!formData.clientId || !formData.custodian || !formData.submissionType || !formData.reasonCode || createMutation.isPending}
        data-testid="button-create-nigo"
        style={{ marginTop: 8 }}
      >
        {createMutation.isPending ? "Creating..." : "Create NIGO Record"}
      </Button>
    </div>
  );
}

function RmdDashboard() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/custodial-reporting/rmd-summary"] });

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>;

  if (!data || data.totalClients === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <DollarSign style={{ width: 40, height: 40, color: P.lt, margin: "0 auto 12px", opacity: 0.5 }} />
        <p style={{ fontSize: 13, color: P.lt }}>No clients with RMD requirements found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Total RMD Due", value: formatCurrency(data.totalRmd), icon: <DollarSign style={{ width: 16, height: 16, color: P.blue }} />, color: P.blue, sub: `${data.year} tax year` },
          { label: "RMD Clients", value: data.totalClients, icon: <Users style={{ width: 16, height: 16, color: P.grn }} />, color: P.grn, sub: "Requiring distributions" },
          { label: "Total IRA Balance", value: formatCurrency(data.totalBalance), icon: <TrendingUp style={{ width: 16, height: 16, color: P.amb }} />, color: P.amb, sub: "Across all accounts" },
          { label: "Custodians", value: data.custodianSummary?.length || 0, icon: <Building2 style={{ width: 16, height: 16, color: P.mid }} />, color: P.mid, sub: "With RMD accounts" },
        ].map((s, i) => (
          <div key={i} className="animate-fu" style={{
            padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
            animationDelay: `${i * 50}ms`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Lbl>{s.label}</Lbl>
              {s.icon}
            </div>
            <Serif style={{ fontSize: 22, fontWeight: 600, color: s.color, display: "block" }} as="p">{s.value}</Serif>
            <div style={{ fontSize: 10, color: P.lt, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
        <Lbl style={{ marginBottom: 12, display: "block" }}>RMD by Custodian</Lbl>
        <div className="space-y-2">
          {data.custodianSummary?.map((cust: any, idx: number) => (
            <div key={cust.custodian} className="animate-si" style={{
              display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
              borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
              animationDelay: `${idx * 30}ms`,
            }} data-testid={`custodian-rmd-${idx}`}>
              <Building2 style={{ width: 18, height: 18, color: P.blue, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: P.dark }}>{cust.custodian}</span>
                <div style={{ fontSize: 11, color: P.mid, marginTop: 2 }}>
                  {cust.clientCount} clients · {cust.accountCount} accounts
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Mono style={{ fontSize: 14, fontWeight: 600, color: P.blue, display: "block" }}>{formatCurrency(cust.totalRmd)}</Mono>
                <Mono style={{ fontSize: 10, color: P.lt, display: "block" }}>of {formatCurrency(cust.totalBalance)}</Mono>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: 16, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
        <Lbl style={{ marginBottom: 12, display: "block" }}>Client RMD Details</Lbl>
        <div className="space-y-2">
          {data.clients?.map((client: any, idx: number) => (
            <div key={client.clientId} className="animate-si hv-glow" style={{
              display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
              borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
              borderLeft: `3px solid ${P.blue}`,
              animationDelay: `${idx * 30}ms`,
            }} data-testid={`client-rmd-${idx}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <NextLink href={`/clients/${client.clientId}`}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: P.blue, cursor: "pointer" }}>{client.clientName}</span>
                  </NextLink>
                  <Pill label={`Age ${client.age}`} c={P.mid} bg={P.odSurf2} />
                </div>
                <div style={{ fontSize: 11, color: P.mid, marginTop: 3 }}>
                  Factor: {client.factor} · {client.accounts.length} account{client.accounts.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Mono style={{ fontSize: 14, fontWeight: 600, color: P.dark, display: "block" }}>{formatCurrency(client.rmdAmount)}</Mono>
                <Mono style={{ fontSize: 10, color: P.lt, display: "block" }}>Balance: {formatCurrency(client.totalBalance)}</Mono>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NigoDashboard() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/custodial-reporting/nigo", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/custodial-reporting/nigo${params}`, { credentials: "include" });
      return res.json();
    },
  });

  const guidanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/custodial-reporting/nigo/${id}/guidance`);
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/custodial-reporting/nigo"] });
      toast({ title: "Guidance generated" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/custodial-reporting/nigo/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custodial-reporting/nigo"] });
      toast({ title: "NIGO updated" });
    },
  });

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>;

  const summary = data?.summary || { total: 0, open: 0, inProgress: 0, resolved: 0, escalated: 0, avgAging: 0 };

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "open", "in_progress", "resolved", "escalated"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: 500,
                background: statusFilter === s ? P.blue : "transparent",
                color: statusFilter === s ? "#fff" : P.mid,
                border: `1px solid ${statusFilter === s ? P.blue : P.odBorder}`,
                cursor: "pointer",
              }}
              data-testid={`filter-nigo-${s}`}
            >
              {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-nigo">
              <Plus style={{ width: 14, height: 14, marginRight: 4 }} /> New NIGO
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create NIGO Record</DialogTitle>
            </DialogHeader>
            <NigoForm onClose={() => setShowCreateDialog(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {[
          { label: "Total", value: summary.total, color: P.mid, icon: <FileWarning style={{ width: 14, height: 14, color: P.mid }} /> },
          { label: "Open", value: summary.open, color: P.red, icon: <AlertTriangle style={{ width: 14, height: 14, color: P.red }} /> },
          { label: "In Progress", value: summary.inProgress, color: P.amb, icon: <Clock style={{ width: 14, height: 14, color: P.amb }} /> },
          { label: "Resolved", value: summary.resolved, color: P.grn, icon: <CheckCircle2 style={{ width: 14, height: 14, color: P.grn }} /> },
          { label: "Avg Aging", value: `${summary.avgAging}d`, color: P.blue, icon: <Clock style={{ width: 14, height: 14, color: P.blue }} /> },
        ].map((s, i) => (
          <div key={i} className="animate-fu" style={{
            padding: 12, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
            animationDelay: `${i * 50}ms`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <Lbl>{s.label}</Lbl>
              {s.icon}
            </div>
            <Serif style={{ fontSize: 20, fontWeight: 600, color: s.color, display: "block" }} as="p">{s.value}</Serif>
          </div>
        ))}
      </div>

      {(data?.records?.length || 0) === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <CheckCircle2 style={{ width: 40, height: 40, color: P.grn, margin: "0 auto 12px", opacity: 0.5 }} />
          <p style={{ fontSize: 13, color: P.lt }}>No NIGO records found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.records?.map((record: any, idx: number) => {
            const statusColors: Record<string, string> = {
              open: P.red, in_progress: P.amb, resolved: P.grn, escalated: P.red,
            };
            const statusBg: Record<string, string> = {
              open: P.rL, in_progress: P.aL, resolved: P.gL, escalated: P.rL,
            };
            const priorityColors: Record<string, string> = {
              low: P.lt, normal: P.mid, high: P.amb, critical: P.red,
            };

            return (
              <div key={record.id} className="animate-si hv-glow" style={{
                padding: "14px 18px", borderRadius: 6, background: P.odSurf,
                border: `1px solid ${P.odBorder}`, borderLeft: `3px solid ${statusColors[record.status] || P.mid}`,
                animationDelay: `${idx * 30}ms`,
              }} data-testid={`nigo-record-${record.id}`}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: P.dark }}>{record.custodian}</span>
                      <Pill label={record.status.replace(/_/g, " ")} c={statusColors[record.status] || P.mid} bg={statusBg[record.status] || P.odSurf2} />
                      <Pill label={record.submissionType.replace(/_/g, " ")} c={P.blue} bg={P.bIce} />
                      {record.priority !== "normal" && (
                        <Pill label={record.priority} c={priorityColors[record.priority] || P.mid} bg={P.odSurf2} />
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: P.mid, marginTop: 4 }}>
                      <strong>Reason:</strong> {record.reasonCode.replace(/_/g, " ")}
                      {record.reasonDescription && ` — ${record.reasonDescription}`}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                      <NextLink href={`/clients/${record.clientId}`}>
                        <span style={{ fontSize: 11, color: P.blue, fontWeight: 500 }}>{record.clientName}</span>
                      </NextLink>
                      <Mono style={{ fontSize: 10, color: P.lt }}>Aging: {record.aging}d</Mono>
                      <Mono style={{ fontSize: 10, color: P.lt }}>Submitted: {record.submittedDate}</Mono>
                    </div>

                    {record.resolutionGuidance && (
                      <div style={{
                        marginTop: 10, padding: 12, borderRadius: 6,
                        background: P.bIce, border: `1px solid ${P.bHi}`,
                        fontSize: 12, color: P.dark, lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <Sparkles style={{ width: 12, height: 12, color: P.blue }} />
                          <Lbl style={{ color: P.blue }}>AI Resolution Guidance</Lbl>
                        </div>
                        {record.resolutionGuidance}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    {record.status !== "resolved" && (
                      <>
                        <button
                          onClick={() => guidanceMutation.mutate(record.id)}
                          disabled={guidanceMutation.isPending}
                          style={{
                            padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 500,
                            background: P.bIce, color: P.blue, border: `1px solid ${P.bHi}`,
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                          }}
                          data-testid={`button-guidance-${record.id}`}
                        >
                          <Sparkles style={{ width: 10, height: 10 }} /> Guidance
                        </button>
                        {record.status === "open" && (
                          <button
                            onClick={() => updateMutation.mutate({ id: record.id, data: { status: "in_progress" } })}
                            style={{
                              padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 500,
                              background: P.aL, color: P.amb, border: `1px solid ${P.amb}`,
                              cursor: "pointer",
                            }}
                            data-testid={`button-progress-${record.id}`}
                          >
                            Start Work
                          </button>
                        )}
                        <button
                          onClick={() => updateMutation.mutate({ id: record.id, data: { status: "resolved" } })}
                          style={{
                            padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 500,
                            background: P.gL, color: P.grn, border: `1px solid ${P.grn}`,
                            cursor: "pointer",
                          }}
                          data-testid={`button-resolve-${record.id}`}
                        >
                          Resolve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustodianSummary() {
  const { data, isLoading } = useQuery<any[]>({ queryKey: ["/api/custodial-reporting/custodian-summary"] });

  if (isLoading) return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>;

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <Building2 style={{ width: 40, height: 40, color: P.lt, margin: "0 auto 12px", opacity: 0.5 }} />
        <p style={{ fontSize: 13, color: P.lt }}>No custodian data available</p>
      </div>
    );
  }

  const totalAum = data.reduce((s, c) => s + c.totalAum, 0);

  return (
    <div className="space-y-4">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[
          { label: "Total AUM", value: formatCurrency(totalAum), color: P.blue },
          { label: "Custodians", value: data.length, color: P.grn },
          { label: "Total Accounts", value: data.reduce((s: number, c: any) => s + c.accountCount, 0), color: P.amb },
        ].map((s, i) => (
          <div key={i} className="animate-fu" style={{
            padding: 14, borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
            animationDelay: `${i * 50}ms`,
          }}>
            <Lbl>{s.label}</Lbl>
            <Serif style={{ fontSize: 20, fontWeight: 600, color: s.color, display: "block", marginTop: 4 }} as="p">{s.value}</Serif>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {data.map((cust: any, idx: number) => {
          const aumPct = totalAum > 0 ? Math.round((cust.totalAum / totalAum) * 100) : 0;
          return (
            <div key={cust.custodian} className="animate-si" style={{
              padding: "16px 18px", borderRadius: 6, background: P.odSurf,
              border: `1px solid ${P.odBorder}`,
              animationDelay: `${idx * 30}ms`,
            }} data-testid={`custodian-summary-${idx}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <Building2 style={{ width: 20, height: 20, color: P.blue, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: P.dark }}>{cust.custodian}</span>
                    <Pill label={`${aumPct}% of AUM`} c={P.blue} bg={P.bIce} />
                    {cust.openNigos > 0 && (
                      <Pill label={`${cust.openNigos} NIGO${cust.openNigos > 1 ? "s" : ""}`} c={P.red} bg={P.rL} />
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: P.mid, marginTop: 2 }}>
                    {cust.clientCount} clients · {cust.accountCount} accounts
                  </div>
                </div>
                <Mono style={{ fontSize: 16, fontWeight: 600, color: P.dark }}>{formatCurrency(cust.totalAum)}</Mono>
              </div>

              <div style={{ height: 4, borderRadius: 99, background: P.odSurf2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99, width: `${aumPct}%`,
                  background: `linear-gradient(90deg, ${P.bHi}, ${P.blue})`,
                  transition: "width 1s ease",
                }} />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {Object.entries(cust.accountTypes || {}).map(([type, count]) => (
                  <span key={type} style={{ fontSize: 10, color: P.lt, padding: "2px 6px", background: P.odSurf2, borderRadius: 4 }}>
                    {type}: {count as number}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AlertsPanel() {
  const { data, isLoading } = useQuery<any[]>({ queryKey: ["/api/custodial-reporting/alerts"] });

  if (isLoading) return <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-20" />)}</div>;

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <CheckCircle2 style={{ width: 40, height: 40, color: P.grn, margin: "0 auto 12px", opacity: 0.5 }} />
        <p style={{ fontSize: 13, color: P.lt }}>No active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((alert: any, idx: number) => {
        const sevColor = alert.severity === "critical" ? P.red : alert.severity === "warning" ? P.amb : P.blue;
        const sevBg = alert.severity === "critical" ? P.rL : alert.severity === "warning" ? P.aL : P.bIce;

        return (
          <div key={idx} className="animate-si" style={{
            display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px",
            borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`,
            borderLeft: `3px solid ${sevColor}`,
            animationDelay: `${idx * 30}ms`,
          }} data-testid={`alert-${idx}`}>
            <Bell style={{ width: 16, height: 16, color: sevColor, marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: P.dark }}>{alert.title}</span>
                <Pill label={alert.severity} c={sevColor} bg={sevBg} />
                <Pill label={alert.type.replace(/_/g, " ")} c={P.mid} bg={P.odSurf2} />
              </div>
              <div style={{ fontSize: 12, color: P.mid, marginTop: 3, lineHeight: 1.5 }}>{alert.message}</div>
              {alert.clientName && (
                <NextLink href={`/clients/${alert.clientId}`}>
                  <span style={{ fontSize: 11, color: P.blue, fontWeight: 500, marginTop: 2, display: "inline-block" }}>{alert.clientName}</span>
                </NextLink>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CustodialReporting() {
  const { data: rmdData } = useQuery<any>({ queryKey: ["/api/custodial-reporting/rmd-summary"] });
  const { data: nigoData } = useQuery<any>({
    queryKey: ["/api/custodial-reporting/nigo"],
    queryFn: async () => {
      const res = await fetch("/api/custodial-reporting/nigo", { credentials: "include" });
      return res.json();
    },
  });

  const openNigos = nigoData?.summary?.open || 0;
  const healthScore = openNigos === 0 ? 100 : Math.max(0, 100 - (openNigos * 15));
  const hColor = healthScore >= 80 ? P.grn : healthScore >= 60 ? P.amb : P.red;

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: P.mid }}>Custodial reporting, RMD tracking, and NIGO management across all custodians</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CassidyAnalysisButton
            taskType="analysis"
            clientId="custodial-overview"
            context={{
              section: "custodial_reporting",
              healthScore,
              openNigos,
              totalNigos: nigoData?.summary?.total || 0,
              inProgressNigos: nigoData?.summary?.inProgress || 0,
              resolvedNigos: nigoData?.summary?.resolved || 0,
              escalatedNigos: nigoData?.summary?.escalated || 0,
              avgAging: nigoData?.summary?.avgAging || 0,
              rmdTotalClients: rmdData?.totalClients || 0,
              rmdTotalAmount: rmdData?.totalRmd || 0,
              rmdTotalBalance: rmdData?.totalBalance || 0,
              recentNigos: (nigoData?.records || []).slice(0, 5).map((r: any) => ({
                custodian: r.custodian,
                status: r.status,
                submissionType: r.submissionType,
                reasonCode: r.reasonCode,
                aging: r.aging,
                priority: r.priority,
              })),
            }}
            label="AI Pattern Analysis"
            size="sm"
          />
          <Score value={healthScore} size={42} color={hColor} label="Status" />
        </div>
      </div>

      <Tabs defaultValue="rmd">
        <TabsList style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${P.odBorder}`, background: "transparent", borderRadius: 0, height: "auto" }}>
          {[
            { id: "rmd", l: `RMD Dashboard (${rmdData?.totalClients || 0})` },
            { id: "nigo", l: `NIGO Tracker (${nigoData?.summary?.total || 0})` },
            { id: "custodians", l: "Custodian Summary" },
            { id: "alerts", l: "Alerts" },
          ].map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} style={{
              padding: "8px 18px 10px", border: "none", background: "transparent",
              fontFamily: "'DM Sans'", fontSize: 12, cursor: "pointer",
            }} data-testid={`tab-custodial-${tab.id}`}>
              {tab.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="rmd">
          <RmdDashboard />
        </TabsContent>

        <TabsContent value="nigo">
          <NigoDashboard />
        </TabsContent>

        <TabsContent value="custodians">
          <CustodianSummary />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
