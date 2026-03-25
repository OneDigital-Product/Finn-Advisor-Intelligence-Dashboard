import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Heart,
  DollarSign,
  Trash2,
  TrendingUp,
  BookOpen,
  HandHeart,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
} from "lucide-react";
import { InfoTip } from "@/components/info-tip";
import { EmptyState } from "@/components/empty-state";
import { P } from "@/styles/tokens";

interface PhilanthropicSectionProps {
  clientId: string;
  clientName: string;
  totalAum: number;
  advisorId: string;
}

import { formatCurrency as fmtCurrency } from "@/lib/format";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";
const fmtFullCurrency = (v: number) => fmtCurrency(v, { abbreviated: false });

export function PhilanthropicSection({ clientId, clientName, totalAum, advisorId }: PhilanthropicSectionProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "daf" | "crt" | "qcd" | "tax-impact">("overview");
  const [showCreateDaf, setShowCreateDaf] = useState(false);
  const [showCreateDafTxn, setShowCreateDafTxn] = useState<string | null>(null);
  const [showCreateCrt, setShowCreateCrt] = useState(false);
  const [showCreateQcd, setShowCreateQcd] = useState(false);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "philanthropic"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/philanthropic`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 15 * 60 * 1000,
  });

  const createDafMutation = useMutation({
    mutationFn: async (d: any) => { const res = await apiRequest("POST", "/api/philanthropic/daf-accounts", d); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropic"] }); setShowCreateDaf(false); toast({ title: "DAF account created" }); },
    onError: () => toast({ title: "Failed to create DAF", variant: "destructive" }),
  });

  const deleteDafMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/philanthropic/daf-accounts/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropic"] }); toast({ title: "DAF deleted" }); },
  });

  const createDafTxnMutation = useMutation({
    mutationFn: async (d: any) => { const res = await apiRequest("POST", "/api/philanthropic/daf-transactions", d); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropic"] }); setShowCreateDafTxn(null); toast({ title: "Transaction recorded" }); },
    onError: () => toast({ title: "Failed to record transaction", variant: "destructive" }),
  });

  const createCrtMutation = useMutation({
    mutationFn: async (d: any) => { const res = await apiRequest("POST", "/api/philanthropic/crts", d); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropic"] }); setShowCreateCrt(false); toast({ title: "CRT created" }); },
    onError: () => toast({ title: "Failed to create CRT", variant: "destructive" }),
  });

  const deleteCrtMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/philanthropic/crts/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropic"] }); toast({ title: "CRT deleted" }); },
  });

  const createQcdMutation = useMutation({
    mutationFn: async (d: any) => { const res = await apiRequest("POST", "/api/philanthropic/qcds", d); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropic"] }); setShowCreateQcd(false); toast({ title: "QCD recorded" }); },
    onError: () => toast({ title: "Failed to record QCD", variant: "destructive" }),
  });

  const deleteQcdMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/philanthropic/qcds/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "philanthropic"] }); toast({ title: "QCD deleted" }); },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { dafAccounts = [], charitableRemainderTrusts = [], qcdRecords = [], summary = {} } = data || {};

  const subtabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "daf" as const, label: "DAF Accounts", count: dafAccounts.length },
    { id: "crt" as const, label: "CRT", count: charitableRemainderTrusts.length },
    { id: "qcd" as const, label: "QCD", count: qcdRecords.length },
    { id: "tax-impact" as const, label: "Tax Impact" },
  ];

  return (
    <div className="space-y-6" data-testid="philanthropic-section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-philanthropic-title">Philanthropic Planning</h2>
          <p className="text-sm text-muted-foreground">Donor-Advised Funds, Charitable Remainder Trusts, and Qualified Charitable Distributions</p>
        </div>
      </div>

      <div className="flex gap-1 border-b pb-px">
        {subtabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md transition-colors ${
              activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            data-testid={`tab-phil-${tab.id}`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && <span className="ml-1.5 text-xs opacity-75">({tab.count})</span>}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card style={V2_CARD}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1"><Heart className="w-4 h-4 text-rose-600" /><span className="text-xs text-[#C7D0DD]">Total Philanthropic</span></div>
                <div className="text-xl font-bold" data-testid="text-total-philanthropic">{fmtCurrency(summary.totalPhilanthropicValue || 0)}</div>
              </CardContent>
            </Card>
            <Card style={V2_CARD}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1"><HandHeart className="w-4 h-4 text-teal-600" /><span className="text-xs text-[#C7D0DD]">DAF Balance</span></div>
                <div className="text-xl font-bold" data-testid="text-daf-balance">{fmtCurrency(summary.totalDafBalance || 0)}</div>
                <div className="text-xs text-[#C7D0DD] mt-0.5">{summary.dafAccountCount || 0} account{(summary.dafAccountCount || 0) !== 1 ? "s" : ""}</div>
              </CardContent>
            </Card>
            <Card style={V2_CARD}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1"><BookOpen className="w-4 h-4 text-purple-600" /><span className="text-xs text-[#C7D0DD]">CRT Value</span></div>
                <div className="text-xl font-bold" data-testid="text-crt-value">{fmtCurrency(summary.totalCrtValue || 0)}</div>
                <div className="text-xs text-[#C7D0DD] mt-0.5">{summary.crtCount || 0} trust{(summary.crtCount || 0) !== 1 ? "s" : ""}</div>
              </CardContent>
            </Card>
            <Card style={V2_CARD}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1"><Calculator className="w-4 h-4 text-blue-600" /><span className="text-xs text-[#C7D0DD]">Tax Savings</span></div>
                <div className="text-xl font-bold" data-testid="text-tax-savings">{fmtCurrency(summary.totalTaxSavings || 0)}</div>
                <div className="text-xs text-[#C7D0DD] mt-0.5">from QCDs</div>
              </CardContent>
            </Card>
          </div>

          {summary.currentYearQcdTotal > 0 && (
            <Card style={V2_CARD} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">QCD Annual Tracking ({new Date().getFullYear()})</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Progress value={(summary.currentYearQcdTotal / summary.qcdAnnualLimit) * 100} className="h-2" />
                    <div className="flex justify-between mt-1 text-xs text-[#C7D0DD]">
                      <span>{fmtFullCurrency(summary.currentYearQcdTotal)} used</span>
                      <span>{fmtFullCurrency(summary.qcdRemainingCapacity)} remaining</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{fmtFullCurrency(summary.qcdAnnualLimit)}</div>
                    <div className="text-[10px] text-[#C7D0DD]">Annual Limit</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {dafAccounts.length === 0 && charitableRemainderTrusts.length === 0 && qcdRecords.length === 0 && (
            <Card style={V2_CARD}>
              <CardContent className="py-8 text-center">
                <Heart className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <h3 className="font-medium mb-1">No Philanthropic Data</h3>
                <p className="text-sm text-muted-foreground mb-4">Track charitable giving through DAFs, CRTs, and QCDs.</p>
                <div className="flex justify-center gap-2">
                  <Button size="sm" onClick={() => { setActiveTab("daf"); setShowCreateDaf(true); }} data-testid="button-start-daf"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add DAF</Button>
                  <Button size="sm" variant="outline" onClick={() => { setActiveTab("qcd"); setShowCreateQcd(true); }} data-testid="button-start-qcd"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add QCD</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "daf" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateDaf(true)} data-testid="button-add-daf"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add DAF Account</Button>
          </div>
          {dafAccounts.length === 0 ? (
            <Card style={V2_CARD}><CardContent><EmptyState icon={HandHeart} title="No DAF accounts yet" description="Donor-Advised Funds provide an immediate tax deduction and allow recommending grants to charities over time." actionLabel="Add DAF Account" actionIcon={Plus} onAction={() => setShowCreateDaf(true)} /></CardContent></Card>
          ) : (
            <div className="space-y-4">
              {dafAccounts.map((acct: any) => (
                <Card key={acct.id} style={V2_CARD} data-testid={`card-daf-${acct.id}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-sm">{acct.accountName}</h3>
                        <div className="text-xs text-[#C7D0DD]">{acct.sponsorOrganization}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowCreateDafTxn(acct.id)} data-testid={`button-add-daf-txn-${acct.id}`}>
                          <Plus className="w-3 h-3 mr-1" /> Transaction
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteDafMutation.mutate(acct.id)} data-testid={`button-delete-daf-${acct.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                        <div className="text-[14px] text-[#C7D0DD]">Balance</div>
                        <div className="text-sm font-bold text-green-700 dark:text-green-400">{fmtFullCurrency(parseFloat(acct.currentBalance || "0"))}</div>
                      </div>
                      <div className="p-2 rounded bg-muted/40">
                        <div className="text-[14px] text-[#C7D0DD]">Contributions</div>
                        <div className="text-sm font-medium">{fmtFullCurrency(parseFloat(acct.totalContributions || "0"))}</div>
                      </div>
                      <div className="p-2 rounded bg-muted/40">
                        <div className="text-[14px] text-[#C7D0DD]">Grants Made</div>
                        <div className="text-sm font-medium">{fmtFullCurrency(parseFloat(acct.totalGrants || "0"))}</div>
                      </div>
                      <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                        <div className="text-[14px] text-[#C7D0DD]">Tax Deductions</div>
                        <div className="text-sm font-medium">{fmtFullCurrency(parseFloat(acct.taxDeductionsTaken || "0"))}</div>
                      </div>
                    </div>
                    {acct.transactions && acct.transactions.length > 0 && (
                      <div>
                        <div className="text-[14px] text-[#C7D0DD] mb-1">Recent Transactions</div>
                        <div className="space-y-1">
                          {acct.transactions.slice(0, 5).map((txn: any) => (
                            <div key={txn.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/20">
                              <div className="flex items-center gap-2">
                                {txn.transactionType === "contribution" ? (
                                  <ArrowUpRight className="w-3 h-3 text-green-600" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3 text-blue-600" />
                                )}
                                <span>{txn.transactionType === "contribution" ? "Contribution" : "Grant"}</span>
                                {txn.recipientOrg && <span className="text-[#C7D0DD]">to {txn.recipientOrg}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={txn.transactionType === "contribution" ? "text-green-600" : ""}>{fmtFullCurrency(parseFloat(txn.amount))}</span>
                                <span className="text-[#C7D0DD]">{txn.transactionDate}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "crt" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateCrt(true)} data-testid="button-add-crt"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add CRT</Button>
          </div>
          {charitableRemainderTrusts.length === 0 ? (
            <Card style={V2_CARD}><CardContent><EmptyState icon={Heart} title="No Charitable Remainder Trusts" description="CRTs pay income to the donor for life or a term, then distribute the remainder to charity — providing an immediate tax deduction." actionLabel="Add CRT" actionIcon={Plus} onAction={() => setShowCreateCrt(true)} /></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {charitableRemainderTrusts.map((crt: any) => (
                <Card key={crt.id} style={V2_CARD} data-testid={`card-crt-${crt.id}`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-sm">{crt.trustName}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{crt.crtType}</Badge>
                          <Badge variant={crt.status === "active" ? "default" : "secondary"} className="text-[10px]">{crt.status}</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteCrtMutation.mutate(crt.id)} data-testid={`button-delete-crt-${crt.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-2 rounded bg-muted/40">
                        <div className="text-[14px] text-[#C7D0DD]">Funded Value</div>
                        <div className="text-sm font-medium">{fmtFullCurrency(parseFloat(crt.fundedValue || "0"))}</div>
                      </div>
                      <div className="p-2 rounded bg-muted/40">
                        <div className="text-[14px] text-[#C7D0DD]">Payout Rate</div>
                        <div className="text-sm font-medium">{(parseFloat(crt.payoutRate || "0") * 100).toFixed(1)}%</div>
                      </div>
                      <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                        <div className="text-[14px] text-[#C7D0DD]">Annual Income</div>
                        <div className="text-sm font-medium">{fmtFullCurrency(crt.projections?.projectedAnnualIncome || 0)}</div>
                      </div>
                      <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                        <div className="text-[14px] text-[#C7D0DD]">Charitable Deduction</div>
                        <div className="text-sm font-medium">{fmtFullCurrency(crt.projections?.charitableDeduction || 0)}</div>
                      </div>
                    </div>
                    {crt.projections && (
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/30">
                          <div className="text-[14px] text-[#C7D0DD]">Total Projected Income</div>
                          <div className="text-sm font-medium">{fmtFullCurrency(crt.projections.totalProjectedIncome || 0)}</div>
                        </div>
                        <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/30">
                          <div className="text-[14px] text-[#C7D0DD]">Remainder to Charity</div>
                          <div className="text-sm font-medium">{fmtFullCurrency(crt.projections.remainderToCharity || 0)}</div>
                        </div>
                      </div>
                    )}
                    {crt.charitableBeneficiary && <div className="text-xs text-[#C7D0DD] mt-2">Charity: {crt.charitableBeneficiary}</div>}
                    {crt.incomeBeneficiary && <div className="text-xs text-[#C7D0DD]">Income to: {crt.incomeBeneficiary}</div>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "qcd" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#C7D0DD]">
              {new Date().getFullYear()} QCD: {fmtFullCurrency(summary.currentYearQcdTotal || 0)} of {fmtFullCurrency(summary.qcdAnnualLimit || 105000)} limit
            </div>
            <Button size="sm" onClick={() => setShowCreateQcd(true)} data-testid="button-add-qcd"><Plus className="w-3.5 h-3.5 mr-1.5" /> Add QCD</Button>
          </div>
          {qcdRecords.length === 0 ? (
            <Card style={V2_CARD}><CardContent><EmptyState icon={DollarSign} title="No QCD records" description="Qualified Charitable Distributions transfer IRA funds directly to charity, satisfying RMD requirements without increasing taxable income." actionLabel="Add QCD" actionIcon={Plus} onAction={() => setShowCreateQcd(true)} /></CardContent></Card>
          ) : (
            <div className="space-y-2">
              {qcdRecords.map((qcd: any) => (
                <Card key={qcd.id} style={V2_CARD} data-testid={`card-qcd-${qcd.id}`}>
                  <CardContent className="pt-3 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{qcd.charityName}</span>
                          <Badge variant="outline" className="text-[10px]">{qcd.taxYear}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-[#C7D0DD]">
                          <span>{qcd.distributionDate}</span>
                          {parseFloat(qcd.rmdSatisfied || "0") > 0 && <span>RMD satisfied: {fmtFullCurrency(parseFloat(qcd.rmdSatisfied))}</span>}
                          {parseFloat(qcd.taxSavingsEstimate || "0") > 0 && <span className="text-green-600">Tax savings: {fmtFullCurrency(parseFloat(qcd.taxSavingsEstimate))}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{fmtFullCurrency(parseFloat(qcd.amount || "0"))}</span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteQcdMutation.mutate(qcd.id)} data-testid={`button-delete-qcd-${qcd.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "tax-impact" && (
        <TaxImpactPanel clientId={clientId} charitableRemainderTrusts={charitableRemainderTrusts} />
      )}

      <CreateDafDialog open={showCreateDaf} onClose={() => setShowCreateDaf(false)} onSubmit={(d: any) => createDafMutation.mutate({ ...d, clientId, advisorId })} isPending={createDafMutation.isPending} />
      <CreateDafTxnDialog open={!!showCreateDafTxn} dafAccountId={showCreateDafTxn || ""} onClose={() => setShowCreateDafTxn(null)} onSubmit={(d: any) => createDafTxnMutation.mutate(d)} isPending={createDafTxnMutation.isPending} />
      <CreateCrtDialog open={showCreateCrt} onClose={() => setShowCreateCrt(false)} onSubmit={(d: any) => createCrtMutation.mutate({ ...d, clientId, advisorId })} isPending={createCrtMutation.isPending} />
      <CreateQcdDialog open={showCreateQcd} onClose={() => setShowCreateQcd(false)} onSubmit={(d: any) => createQcdMutation.mutate({ ...d, clientId, advisorId })} isPending={createQcdMutation.isPending} />
    </div>
  );
}

function TaxImpactPanel({ clientId, charitableRemainderTrusts }: { clientId: string; charitableRemainderTrusts: any[] }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    agi: "",
    filingStatus: "married_filing_jointly" as "single" | "married_filing_jointly",
    contributions: [{ amount: "", type: "cash_public" as string }],
    rmdAmount: "",
    age: "",
    section7520Rate: "5.2",
    crtType: "CRUT" as string,
    crtPayoutRate: "5",
    crtTermYears: "20",
  });
  const [result, setResult] = useState<any>(null);

  const taxMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/philanthropic/tax-impact", payload);
      return res.json();
    },
    onSuccess: (data: any) => setResult(data),
    onError: () => toast({ title: "Failed to calculate tax impact", variant: "destructive" }),
  });

  const handleCalculate = () => {
    const agi = parseFloat(form.agi);
    if (!agi || agi <= 0) { toast({ title: "Please enter a valid AGI", variant: "destructive" }); return; }
    const contributions = form.contributions
      .filter(c => parseFloat(c.amount) > 0)
      .map(c => ({ amount: parseFloat(c.amount), type: c.type }));
    if (contributions.length === 0) { toast({ title: "Please add at least one contribution", variant: "destructive" }); return; }

    const crt = charitableRemainderTrusts[0];
    const payload: any = {
      agi,
      filingStatus: form.filingStatus,
      contributions,
      section7520Rate: parseFloat(form.section7520Rate) / 100,
      crtPayoutRate: parseFloat(form.crtPayoutRate) / 100,
      crtTermYears: parseInt(form.crtTermYears) || 20,
      crtType: form.crtType,
      crtFundedValue: crt ? parseFloat(crt.fundedValue || "0") : contributions.reduce((s: number, c: any) => s + c.amount, 0),
    };
    if (form.rmdAmount) payload.rmdAmount = parseFloat(form.rmdAmount);
    if (form.age) payload.age = parseFloat(form.age);
    taxMutation.mutate(payload);
  };

  const addContribution = () => setForm(p => ({ ...p, contributions: [...p.contributions, { amount: "", type: "cash_public" }] }));
  const removeContribution = (i: number) => setForm(p => ({ ...p, contributions: p.contributions.filter((_, idx) => idx !== i) }));
  const updateContribution = (i: number, field: string, value: string) => {
    setForm(p => ({ ...p, contributions: p.contributions.map((c, idx) => idx === i ? { ...c, [field]: value } : c) }));
  };

  const typeLabels: Record<string, string> = {
    cash_public: "Cash to public charities (60%)",
    appreciated_property: "Appreciated property (30%)",
    private_foundation: "Private foundation (20%)",
  };

  return (
    <div className="space-y-4" data-testid="tax-impact-panel">
      <Card style={V2_CARD}>
        <CardContent className="pt-4 pb-3">
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><Calculator className="w-4 h-4 text-blue-600" /> Charitable Tax Impact Calculator</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <Label htmlFor="input-tax-agi" className="text-xs">Adjusted Gross Income (AGI) *</Label>
              <Input type="number" value={form.agi} onChange={e => setForm(p => ({ ...p, agi: e.target.value }))} placeholder="e.g. 500000" id="input-tax-agi" data-testid="input-tax-agi" />
            </div>
            <div>
              <Label htmlFor="select-tax-filing" className="text-xs">Filing Status</Label>
              <Select value={form.filingStatus} onValueChange={(v: any) => setForm(p => ({ ...p, filingStatus: v }))}>
                <SelectTrigger id="select-tax-filing" data-testid="select-tax-filing"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married_filing_jointly">Married Filing Jointly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-medium">Contributions</Label>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addContribution} data-testid="button-add-contribution"><Plus className="w-3 h-3 mr-1" /> Add</Button>
            </div>
            {form.contributions.map((c, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <Input type="number" className="flex-1" value={c.amount} onChange={e => updateContribution(i, "amount", e.target.value)} placeholder="Amount" data-testid={`input-contribution-amount-${i}`} />
                <Select value={c.type} onValueChange={v => updateContribution(i, "type", v)}>
                  <SelectTrigger className="w-[220px]" data-testid={`select-contribution-type-${i}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash_public">Cash (60% limit)</SelectItem>
                    <SelectItem value="appreciated_property">Appreciated (30%)</SelectItem>
                    <SelectItem value="private_foundation">Private Fdn (20%)</SelectItem>
                  </SelectContent>
                </Select>
                {form.contributions.length > 1 && (
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground" onClick={() => removeContribution(i)} data-testid={`button-remove-contribution-${i}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div><Label htmlFor="input-tax-age" className="text-xs">Age (for QCD)</Label><Input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} placeholder="e.g. 73" id="input-tax-age" data-testid="input-tax-age" /></div>
            <div><Label htmlFor="input-tax-rmd" className="text-xs">RMD Amount</Label><Input type="number" value={form.rmdAmount} onChange={e => setForm(p => ({ ...p, rmdAmount: e.target.value }))} placeholder="e.g. 50000" id="input-tax-rmd" data-testid="input-tax-rmd" /></div>
            <div><Label htmlFor="input-tax-7520" className="text-xs">§7520 Rate (%)</Label><Input type="number" step="0.1" value={form.section7520Rate} onChange={e => setForm(p => ({ ...p, section7520Rate: e.target.value }))} id="input-tax-7520" data-testid="input-tax-7520" /></div>
            <div><Label htmlFor="select-tax-crt-type" className="text-xs">CRT Type</Label>
              <Select value={form.crtType} onValueChange={v => setForm(p => ({ ...p, crtType: v }))}>
                <SelectTrigger id="select-tax-crt-type" data-testid="select-tax-crt-type"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CRAT">CRAT</SelectItem><SelectItem value="CRUT">CRUT</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><Label htmlFor="input-tax-crt-payout" className="text-xs">CRT Payout Rate (%)</Label><Input type="number" step="0.1" value={form.crtPayoutRate} onChange={e => setForm(p => ({ ...p, crtPayoutRate: e.target.value }))} id="input-tax-crt-payout" data-testid="input-tax-crt-payout" /></div>
            <div><Label htmlFor="input-tax-crt-term" className="text-xs">CRT Term (years)</Label><Input type="number" value={form.crtTermYears} onChange={e => setForm(p => ({ ...p, crtTermYears: e.target.value }))} id="input-tax-crt-term" data-testid="input-tax-crt-term" /></div>
          </div>

          <Button onClick={handleCalculate} disabled={taxMutation.isPending} className="w-full" data-testid="button-calculate-tax">
            {taxMutation.isPending ? "Calculating..." : "Calculate Tax Impact"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card style={V2_CARD}><CardContent className="pt-4 pb-3">
              <div className="text-[10px] text-[#C7D0DD]">Total Deducted</div>
              <div className="text-lg font-bold text-green-700 dark:text-green-400" data-testid="text-total-deducted">{fmtFullCurrency(result.totalDeductedThisYear)}</div>
              <Badge variant={result.itemizingBeneficial ? "default" : "secondary"} className="text-[10px] mt-1" data-testid="badge-itemizing">{result.itemizingBeneficial ? "Itemizing" : "Standard Deduction"}</Badge>
            </CardContent></Card>
            <Card style={V2_CARD}><CardContent className="pt-4 pb-3">
              <div className="text-[10px] text-[#C7D0DD]">Tax Savings</div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-400" data-testid="text-tax-savings-calc">{fmtFullCurrency(result.taxSavingsFromDeductions)}</div>
              {!result.itemizingBeneficial && result.totalDeductedThisYear > 0 && <div className="text-[10px] text-amber-600 mt-0.5">Below standard deduction</div>}
            </CardContent></Card>
            <Card style={V2_CARD}><CardContent className="pt-4 pb-3">
              <div className="text-[10px] text-[#C7D0DD]">Marginal Rate</div>
              <div className="text-lg font-bold" data-testid="text-marginal-rate">{(result.marginalRate * 100).toFixed(0)}%</div>
            </CardContent></Card>
            <Card style={V2_CARD}><CardContent className="pt-4 pb-3">
              <div className="text-[10px] text-[#C7D0DD]">Carryforward</div>
              <div className="text-lg font-bold text-amber-700 dark:text-amber-400" data-testid="text-total-carryforward">{fmtFullCurrency(result.totalCarryforward)}</div>
            </CardContent></Card>
          </div>

          {result.deductions && result.deductions.length > 0 && (
            <Card style={V2_CARD}>
              <CardContent className="pt-4 pb-3">
                <h4 className="text-sm font-medium mb-2">AGI Deduction Limits</h4>
                <div className="space-y-2">
                  {result.deductions.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30" data-testid={`row-deduction-${i}`}>
                      <div>
                        <span className="font-medium">{typeLabels[d.contributionType] || d.contributionType}</span>
                        <span className="text-[#C7D0DD] ml-2">Contributed: {fmtFullCurrency(d.totalContributed)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-600">Deducted: {fmtFullCurrency(d.deductedThisYear)}</span>
                        {d.carryforward > 0 && <span className="text-amber-600">CF: {fmtFullCurrency(d.carryforward)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.carryforwardSchedule && result.carryforwardSchedule.length > 0 && result.totalCarryforward > 0 && (
            <Card style={V2_CARD}>
              <CardContent className="pt-4 pb-3">
                <h4 className="text-sm font-medium mb-2">5-Year Carryforward Schedule</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-[#C7D0DD]">
                        <th className="text-left py-1.5 pr-3">Year</th>
                        <th className="text-right py-1.5 px-2">Beginning</th>
                        <th className="text-right py-1.5 px-2">Utilized</th>
                        <th className="text-right py-1.5 px-2">Expired</th>
                        <th className="text-right py-1.5 pl-2">Ending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.carryforwardSchedule.map((row: any) => (
                        <tr key={row.year} className="border-b border-muted/20" data-testid={`row-cf-${row.year}`}>
                          <td className="py-1.5 pr-3 font-medium">{row.year}</td>
                          <td className="text-right py-1.5 px-2">{fmtFullCurrency(row.beginningBalance)}</td>
                          <td className="text-right py-1.5 px-2 text-green-600">{fmtFullCurrency(row.utilized)}</td>
                          <td className="text-right py-1.5 px-2 text-red-500">{row.expired > 0 ? fmtFullCurrency(row.expired) : "—"}</td>
                          <td className="text-right py-1.5 pl-2 font-medium">{fmtFullCurrency(row.endingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {result.strategyComparison && result.strategyComparison.length > 0 && (
            <Card style={V2_CARD}>
              <CardContent className="pt-4 pb-3">
                <h4 className="text-sm font-medium mb-2">Strategy Comparison</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.strategyComparison.map((s: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border bg-muted/10" data-testid={`card-strategy-${i}`}>
                      <div className="font-medium text-sm mb-2">{s.strategy}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-[#C7D0DD]">Giving: </span><span className="font-medium">{fmtFullCurrency(s.givingAmount)}</span></div>
                        <div><span className="text-[#C7D0DD]">Deduction: </span><span className="font-medium">{fmtFullCurrency(s.deductionAmount)}</span></div>
                        <div><span className="text-[#C7D0DD]">Tax Savings: </span><span className="font-medium text-green-600">{fmtFullCurrency(s.taxSavings)}</span></div>
                        <div><span className="text-[#C7D0DD]">After-Tax Cost: </span><span className="font-medium">{fmtFullCurrency(s.afterTaxCost)}</span></div>
                        {s.incomeStream > 0 && <div className="col-span-2"><span className="text-[#C7D0DD]">Annual Income: </span><span className="font-medium text-blue-600">{fmtFullCurrency(s.incomeStream)}/yr</span></div>}
                      </div>
                      {s.notes && s.notes.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {s.notes.map((n: string, ni: number) => (
                            <div key={ni} className="text-[10px] text-[#C7D0DD]">• {n}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.crtProjection && (
            <Card style={V2_CARD} className="border-l-4 border-l-purple-500">
              <CardContent className="pt-4 pb-3">
                <h4 className="text-sm font-medium mb-2">CRT Projection (§7520 Present Value)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/30">
                    <div className="text-[10px] text-[#C7D0DD]">Charitable Deduction</div>
                    <div className="text-sm font-bold" data-testid="text-crt-deduction">{fmtFullCurrency(result.crtProjection.charitableDeduction)}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/40">
                    <div className="text-[10px] text-[#C7D0DD]">Annual Income</div>
                    <div className="text-sm font-medium">{fmtFullCurrency(result.crtProjection.annualIncome)}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/40">
                    <div className="text-[10px] text-[#C7D0DD]">Total Income</div>
                    <div className="text-sm font-medium">{fmtFullCurrency(result.crtProjection.totalIncome)}</div>
                  </div>
                  <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                    <div className="text-[10px] text-[#C7D0DD]">Tax Savings</div>
                    <div className="text-sm font-bold text-green-700 dark:text-green-400">{fmtFullCurrency(result.crtProjection.taxSavingsFromDeduction)}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/40">
                    <div className="text-[10px] text-[#C7D0DD]">PV of Income</div>
                    <div className="text-sm font-medium">{fmtFullCurrency(result.crtProjection.presentValueOfIncome)}</div>
                  </div>
                  <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/30">
                    <div className="text-[10px] text-[#C7D0DD]">Remainder to Charity</div>
                    <div className="text-sm font-medium">{fmtFullCurrency(result.crtProjection.remainderToCharity)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {result.qcdOptimization && (
            <Card style={V2_CARD} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4 pb-3">
                <h4 className="text-sm font-medium mb-2">QCD Optimization</h4>
                {result.qcdOptimization.qcdEligible ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                      <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                        <div className="text-[10px] text-[#C7D0DD]">Recommended QCD</div>
                        <div className="text-sm font-bold" data-testid="text-qcd-recommended">{fmtFullCurrency(result.qcdOptimization.recommendedQcdAmount)}</div>
                      </div>
                      <div className="p-2 rounded bg-muted/40">
                        <div className="text-[10px] text-[#C7D0DD]">RMD Obligation</div>
                        <div className="text-sm font-medium">{fmtFullCurrency(result.qcdOptimization.rmdObligation)}</div>
                      </div>
                      <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                        <div className="text-[10px] text-[#C7D0DD]">Tax Savings</div>
                        <div className="text-sm font-bold text-green-700 dark:text-green-400">{fmtFullCurrency(result.qcdOptimization.taxSavings)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="p-2 rounded bg-muted/40">
                        <div className="text-[10px] text-[#C7D0DD]">Taxable Income (without QCD)</div>
                        <div className="text-sm font-medium">{fmtFullCurrency(result.qcdOptimization.taxableIncomeWithoutQcd)}</div>
                      </div>
                      <div className="p-2 rounded bg-muted/40">
                        <div className="text-[10px] text-[#C7D0DD]">Taxable Income (with QCD)</div>
                        <div className="text-sm font-medium">{fmtFullCurrency(result.qcdOptimization.taxableIncomeWithQcd)}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-[#C7D0DD] p-2">Client is not yet eligible for QCDs (must be 70½ or older).</div>
                )}
                {result.qcdOptimization.notes.map((n: string, i: number) => (
                  <div key={i} className="text-[10px] text-[#C7D0DD]">• {n}</div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.notes && result.notes.length > 0 && (
            <Card style={V2_CARD}>
              <CardContent className="pt-4 pb-3">
                <h4 className="text-sm font-medium mb-2">Notes & Observations</h4>
                <div className="space-y-1">
                  {result.notes.map((n: string, i: number) => (
                    <div key={i} className="text-xs text-[#C7D0DD] flex items-start gap-1.5" data-testid={`text-note-${i}`}>
                      <TrendingUp className="w-3 h-3 mt-0.5 shrink-0 text-blue-500" />
                      <span>{n}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function CreateDafDialog({ open, onClose, onSubmit, isPending }: { open: boolean; onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const [form, setForm] = useState({ sponsorOrganization: "", accountName: "", currentBalance: "", dateOpened: "", notes: "" });
  const handleSubmit = () => { if (!form.sponsorOrganization || !form.accountName) return; onSubmit(form); setForm({ sponsorOrganization: "", accountName: "", currentBalance: "", dateOpened: "", notes: "" }); };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add DAF Account</DialogTitle><DialogDescription>Create a new Donor-Advised Fund account.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="input-daf-sponsor" className="text-xs">Sponsor Organization *</Label><Input value={form.sponsorOrganization} onChange={e => setForm(p => ({ ...p, sponsorOrganization: e.target.value }))} placeholder="e.g. Fidelity Charitable, Schwab Charitable" id="input-daf-sponsor" data-testid="input-daf-sponsor" /></div>
          <div><Label htmlFor="input-daf-name" className="text-xs">Account Name *</Label><Input value={form.accountName} onChange={e => setForm(p => ({ ...p, accountName: e.target.value }))} id="input-daf-name" data-testid="input-daf-name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="input-daf-balance" className="text-xs">Initial Balance</Label><Input value={form.currentBalance} onChange={e => setForm(p => ({ ...p, currentBalance: e.target.value }))} id="input-daf-balance" data-testid="input-daf-balance" /></div>
            <div><Label htmlFor="input-daf-date" className="text-xs">Date Opened</Label><Input type="date" value={form.dateOpened} onChange={e => setForm(p => ({ ...p, dateOpened: e.target.value }))} id="input-daf-date" data-testid="input-daf-date" /></div>
          </div>
          <div><Label htmlFor="input-daf-notes" className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} id="input-daf-notes" data-testid="input-daf-notes" /></div>
          <Button onClick={handleSubmit} disabled={!form.sponsorOrganization || !form.accountName || isPending} className="w-full" data-testid="button-submit-daf">Create DAF Account</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateDafTxnDialog({ open, dafAccountId, onClose, onSubmit, isPending }: { open: boolean; dafAccountId: string; onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const [form, setForm] = useState({ transactionType: "contribution", amount: "", recipientOrg: "", description: "", transactionDate: "" });
  const handleSubmit = () => { if (!form.amount || !form.transactionDate) return; onSubmit({ ...form, dafAccountId, taxYear: new Date(form.transactionDate).getFullYear() }); setForm({ transactionType: "contribution", amount: "", recipientOrg: "", description: "", transactionDate: "" }); };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Record DAF Transaction</DialogTitle><DialogDescription>Log a contribution or grant.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="select-daf-txn-type" className="text-xs">Type</Label>
            <Select value={form.transactionType} onValueChange={v => setForm(p => ({ ...p, transactionType: v }))}>
              <SelectTrigger id="select-daf-txn-type" data-testid="select-daf-txn-type"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="contribution">Contribution</SelectItem><SelectItem value="grant">Grant</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="input-daf-txn-amount" className="text-xs">Amount *</Label><Input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} id="input-daf-txn-amount" data-testid="input-daf-txn-amount" /></div>
          {form.transactionType === "grant" && (
            <div><Label htmlFor="input-daf-recipient" className="text-xs">Recipient Organization</Label><Input value={form.recipientOrg} onChange={e => setForm(p => ({ ...p, recipientOrg: e.target.value }))} id="input-daf-recipient" data-testid="input-daf-recipient" /></div>
          )}
          <div><Label htmlFor="input-daf-txn-date" className="text-xs">Date *</Label><Input type="date" value={form.transactionDate} onChange={e => setForm(p => ({ ...p, transactionDate: e.target.value }))} id="input-daf-txn-date" data-testid="input-daf-txn-date" /></div>
          <div><Label htmlFor="input-daf-txn-desc" className="text-xs">Description</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} id="input-daf-txn-desc" data-testid="input-daf-txn-desc" /></div>
          <Button onClick={handleSubmit} disabled={!form.amount || !form.transactionDate || isPending} className="w-full" data-testid="button-submit-daf-txn">Record Transaction</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateCrtDialog({ open, onClose, onSubmit, isPending }: { open: boolean; onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const [form, setForm] = useState({ trustName: "", crtType: "CRAT", fundedValue: "", payoutRate: "0.05", termYears: 20, charitableBeneficiary: "", incomeBeneficiary: "", dateEstablished: "", notes: "" });
  const handleSubmit = () => { if (!form.trustName) return; onSubmit({ ...form, termYears: Number(form.termYears) }); setForm({ trustName: "", crtType: "CRAT", fundedValue: "", payoutRate: "0.05", termYears: 20, charitableBeneficiary: "", incomeBeneficiary: "", dateEstablished: "", notes: "" }); };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Charitable Remainder Trust</DialogTitle><DialogDescription>Configure CRT details and projections.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="input-crt-name" className="text-xs">Trust Name *</Label><Input value={form.trustName} onChange={e => setForm(p => ({ ...p, trustName: e.target.value }))} id="input-crt-name" data-testid="input-crt-name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="select-crt-type" className="text-xs">CRT Type</Label>
              <Select value={form.crtType} onValueChange={v => setForm(p => ({ ...p, crtType: v }))}>
                <SelectTrigger id="select-crt-type" data-testid="select-crt-type"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CRAT">CRAT (Annuity)</SelectItem><SelectItem value="CRUT">CRUT (Unitrust)</SelectItem><SelectItem value="NIMCRUT">NIMCRUT</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="input-crt-value" className="text-xs">Funded Value</Label><Input value={form.fundedValue} onChange={e => setForm(p => ({ ...p, fundedValue: e.target.value }))} id="input-crt-value" data-testid="input-crt-value" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="input-crt-payout" className="text-xs">Payout Rate</Label><Input value={form.payoutRate} onChange={e => setForm(p => ({ ...p, payoutRate: e.target.value }))} id="input-crt-payout" data-testid="input-crt-payout" /></div>
            <div><Label htmlFor="input-crt-term" className="text-xs">Term (Years)</Label><Input type="number" value={form.termYears} onChange={e => setForm(p => ({ ...p, termYears: parseInt(e.target.value) || 20 }))} id="input-crt-term" data-testid="input-crt-term" /></div>
          </div>
          <div><Label htmlFor="input-crt-charity" className="text-xs">Charitable Beneficiary</Label><Input value={form.charitableBeneficiary} onChange={e => setForm(p => ({ ...p, charitableBeneficiary: e.target.value }))} id="input-crt-charity" data-testid="input-crt-charity" /></div>
          <div><Label htmlFor="input-crt-income-ben" className="text-xs">Income Beneficiary</Label><Input value={form.incomeBeneficiary} onChange={e => setForm(p => ({ ...p, incomeBeneficiary: e.target.value }))} id="input-crt-income-ben" data-testid="input-crt-income-ben" /></div>
          <div><Label htmlFor="input-crt-date" className="text-xs">Date Established</Label><Input type="date" value={form.dateEstablished} onChange={e => setForm(p => ({ ...p, dateEstablished: e.target.value }))} id="input-crt-date" data-testid="input-crt-date" /></div>
          <div><Label htmlFor="input-crt-notes" className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} id="input-crt-notes" data-testid="input-crt-notes" /></div>
          <Button onClick={handleSubmit} disabled={!form.trustName || isPending} className="w-full" data-testid="button-submit-crt">Create CRT</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateQcdDialog({ open, onClose, onSubmit, isPending }: { open: boolean; onClose: () => void; onSubmit: (d: any) => void; isPending: boolean }) {
  const [form, setForm] = useState({ charityName: "", amount: "", distributionDate: "", taxYear: new Date().getFullYear(), rmdSatisfied: "", taxSavingsEstimate: "", notes: "" });
  const handleSubmit = () => { if (!form.charityName || !form.amount || !form.distributionDate) return; onSubmit({ ...form, taxYear: Number(form.taxYear) }); setForm({ charityName: "", amount: "", distributionDate: "", taxYear: new Date().getFullYear(), rmdSatisfied: "", taxSavingsEstimate: "", notes: "" }); };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Record Qualified Charitable Distribution</DialogTitle><DialogDescription>Track an IRA-to-charity QCD with tax impact.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="input-qcd-charity" className="text-xs">Charity Name *</Label><Input value={form.charityName} onChange={e => setForm(p => ({ ...p, charityName: e.target.value }))} id="input-qcd-charity" data-testid="input-qcd-charity" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="input-qcd-amount" className="text-xs">Amount *</Label><Input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} id="input-qcd-amount" data-testid="input-qcd-amount" /></div>
            <div><Label htmlFor="input-qcd-year" className="text-xs">Tax Year</Label><Input type="number" value={form.taxYear} onChange={e => setForm(p => ({ ...p, taxYear: parseInt(e.target.value) || new Date().getFullYear() }))} id="input-qcd-year" data-testid="input-qcd-year" /></div>
          </div>
          <div><Label htmlFor="input-qcd-date" className="text-xs">Distribution Date</Label><Input type="date" value={form.distributionDate} onChange={e => setForm(p => ({ ...p, distributionDate: e.target.value }))} id="input-qcd-date" data-testid="input-qcd-date" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="input-qcd-rmd" className="text-xs">RMD Satisfied</Label><Input value={form.rmdSatisfied} onChange={e => setForm(p => ({ ...p, rmdSatisfied: e.target.value }))} id="input-qcd-rmd" data-testid="input-qcd-rmd" /></div>
            <div><Label htmlFor="input-qcd-savings" className="text-xs">Tax Savings Estimate</Label><Input value={form.taxSavingsEstimate} onChange={e => setForm(p => ({ ...p, taxSavingsEstimate: e.target.value }))} id="input-qcd-savings" data-testid="input-qcd-savings" /></div>
          </div>
          <div><Label htmlFor="input-qcd-notes" className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} id="input-qcd-notes" data-testid="input-qcd-notes" /></div>
          <Button onClick={handleSubmit} disabled={!form.charityName || !form.amount || !form.distributionDate || isPending} className="w-full" data-testid="button-submit-qcd">Record QCD</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
