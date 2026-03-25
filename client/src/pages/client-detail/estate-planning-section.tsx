import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback, useRef } from "react";
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
import { useCassidyJob } from "@/hooks/use-cassidy-job";
import { CassidyAnalysisButton } from "@/components/cassidy/analysis-button";
import {
  Plus,
  AlertTriangle,
  Shield,
  Clock,
  DollarSign,
  Users,
  ArrowRight,
  Trash2,
  Gift,
  Building2,
  ChevronRight,
  TrendingDown,
  Landmark,
  FileText,
  X,
  UserPlus,
  Calculator,
  BarChart3,
  Scale,
  Info,
  Brain,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Send,
  ClipboardCheck,
  Upload,
  Eye,
  Check,
  Edit3,
} from "lucide-react";
import { BeneficiaryAuditSection } from "./beneficiary-audit";
import { NavTabs } from "@/components/design/nav-tabs";
import { SignalCard } from "@/components/design/signal-card";
import { InfoTip } from "@/components/info-tip";
import { EmptyState } from "@/components/empty-state";

interface EstatePlanningSectionProps {
  clientId: string;
  clientName: string;
  totalAum: number;
  advisorId: string;
}

const TRUST_TYPE_LABELS: Record<string, string> = {
  GRAT: "GRAT",
  SLAT: "SLAT",
  QPRT: "QPRT",
  ILIT: "ILIT",
  CRT: "CRT",
  DAF: "DAF",
  REVOCABLE: "Revocable",
  DYNASTY: "Dynasty",
};

const TRUST_TYPE_COLORS: Record<string, string> = {
  GRAT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  SLAT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  QPRT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  ILIT: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  CRT: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  DAF: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  REVOCABLE: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300",
  DYNASTY: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

import { formatCurrency as fmtCurrency } from "@/lib/format";
const fmtFullCurrency = (v: number) => fmtCurrency(v, { abbreviated: false });
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

export function EstatePlanningSection({ clientId, clientName, totalAum, advisorId }: EstatePlanningSectionProps) {
  const { toast } = useToast();
  const [showCreateTrust, setShowCreateTrust] = useState(false);
  const [showCreateGift, setShowCreateGift] = useState(false);
  const [selectedTrust, setSelectedTrust] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "trusts" | "exemptions" | "gifts" | "wealthmap" | "taxanalysis" | "aianalysis" | "documents" | "beneficiaryaudit">("overview");
  const [aiJobId, setAiJobId] = useState<string | null>(null);

  const { data: estateData, isLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "estate-planning"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/estate-planning`);
      if (!res.ok) throw new Error("Failed to fetch estate planning data");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 15 * 60 * 1000,
  });

  const createTrustMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/estate-planning/trusts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "estate-planning"] });
      setShowCreateTrust(false);
      toast({ title: "Trust created successfully" });
    },
    onError: () => toast({ title: "Failed to create trust", variant: "destructive" }),
  });

  const deleteTrustMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/estate-planning/trusts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "estate-planning"] });
      setSelectedTrust(null);
      toast({ title: "Trust deleted" });
    },
  });

  const createGiftMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/estate-planning/gifts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "estate-planning"] });
      setShowCreateGift(false);
      toast({ title: "Gift recorded successfully" });
    },
    onError: () => toast({ title: "Failed to record gift", variant: "destructive" }),
  });

  const deleteGiftMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/estate-planning/gifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "estate-planning"] });
      toast({ title: "Gift record deleted" });
    },
  });

  const addRelationshipMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/estate-planning/trust-relationships", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "estate-planning"] });
      toast({ title: "Relationship added" });
    },
    onError: () => toast({ title: "Failed to add relationship", variant: "destructive" }),
  });

  const deleteRelationshipMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/estate-planning/trust-relationships/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "estate-planning"] });
      toast({ title: "Relationship removed" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { trusts = [], exemptions = [], gifts = [], summary = {}, sunsetAlert, recommendations = [], trustTypes = {} } = estateData || {};

  const { taxAnalysis } = estateData || {};

  const subtabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "taxanalysis" as const, label: "Tax Analysis" },
    { id: "trusts" as const, label: "Trusts", count: trusts.length },
    { id: "exemptions" as const, label: "Exemptions" },
    { id: "gifts" as const, label: "Gifts", count: gifts.length },
    { id: "wealthmap" as const, label: "Wealth Map" },
    { id: "aianalysis" as const, label: "AI Analysis" },
    { id: "documents" as const, label: "Doc Checklist" },
    { id: "beneficiaryaudit" as const, label: "Beneficiary Audit" },
  ];

  return (
    <div className="space-y-6" data-testid="estate-planning-section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-estate-planning-title">Estate Planning</h2>
          <p className="text-sm text-muted-foreground">Multi-generational wealth transfer and trust management</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowCreateGift(true)} data-testid="button-add-gift">
            <Gift className="w-3.5 h-3.5 mr-1.5" /> Record Gift
          </Button>
          <Button size="sm" onClick={() => setShowCreateTrust(true)} data-testid="button-add-trust">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Trust
          </Button>
        </div>
      </div>

      <NavTabs
        tabs={subtabs.map(t => ({ id: t.id, label: t.label, count: t.count }))}
        active={activeTab}
        onChange={(id) => setActiveTab(id as typeof activeTab)}

      />

      {activeTab === "overview" && (
        <div role="tabpanel" id="tabpanel-overview">
          <OverviewTab
            summary={summary}
            sunsetAlert={sunsetAlert}
            recommendations={recommendations}
            trusts={trusts}
            gifts={gifts}
          />
        </div>
      )}

      {activeTab === "trusts" && (
        <div role="tabpanel" id="tabpanel-trusts">
          <TrustsTab
            trusts={trusts}
            trustTypes={trustTypes}
            onSelect={setSelectedTrust}
            onDelete={(id: string) => deleteTrustMutation.mutate(id)}
          />
        </div>
      )}

      {activeTab === "exemptions" && (
        <div role="tabpanel" id="tabpanel-exemptions">
          <ExemptionsTab
            summary={summary}
            exemptions={exemptions}
            sunsetAlert={sunsetAlert}
            gstTracking={estateData?.gstTracking}
          />
        </div>
      )}

      {activeTab === "gifts" && (
        <div role="tabpanel" id="tabpanel-gifts">
          <GiftsTab
            gifts={gifts}
            onDelete={(id: string) => deleteGiftMutation.mutate(id)}
            summary={summary}
          />
        </div>
      )}

      {activeTab === "taxanalysis" && taxAnalysis && (
        <div role="tabpanel" id="tabpanel-taxanalysis">
          <TaxAnalysisTab taxAnalysis={taxAnalysis} summary={summary} />
        </div>
      )}

      {activeTab === "wealthmap" && (
        <div role="tabpanel" id="tabpanel-wealthmap">
          <WealthMapTab
            trusts={trusts}
            clientName={clientName}
            totalAum={totalAum}
            summary={summary}
          />
        </div>
      )}

      {activeTab === "aianalysis" && (
        <div role="tabpanel" id="tabpanel-aianalysis">
          <AIEstateAnalysisTab
            clientId={clientId}
            clientName={clientName}
            totalAum={totalAum}
            trusts={trusts}
            gifts={gifts}
            summary={summary}
            exemptions={exemptions}
            sunsetAlert={sunsetAlert}
            taxAnalysis={taxAnalysis}
            aiJobId={aiJobId}
            setAiJobId={setAiJobId}
          />
        </div>
      )}

      {activeTab === "documents" && (
        <div role="tabpanel" id="tabpanel-documents">
          <EstateDocumentChecklist clientId={clientId} />
        </div>
      )}

      {activeTab === "beneficiaryaudit" && (
        <div role="tabpanel" id="tabpanel-beneficiaryaudit">
          <BeneficiaryAuditSection
            clientId={clientId}
            clientName={clientName}
            advisorId={advisorId}
          />
        </div>
      )}

      <CreateTrustDialog
        open={showCreateTrust}
        onClose={() => setShowCreateTrust(false)}
        onSubmit={(data: any) => createTrustMutation.mutate({ ...data, clientId, advisorId })}
        isPending={createTrustMutation.isPending}
      />

      <CreateGiftDialog
        open={showCreateGift}
        onClose={() => setShowCreateGift(false)}
        onSubmit={(data: any) => createGiftMutation.mutate({ ...data, clientId })}
        isPending={createGiftMutation.isPending}
      />

      {selectedTrust && (
        <Dialog open={!!selectedTrust} onOpenChange={() => setSelectedTrust(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-trust-detail-title">{selectedTrust.name}</DialogTitle>
              <DialogDescription>
                {trustTypes[selectedTrust.trustType]?.description || selectedTrust.trustType}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md bg-muted/40">
                  <div className="text-xs text-muted-foreground">Type</div>
                  <div className="text-sm font-medium flex items-center gap-1">{TRUST_TYPE_LABELS[selectedTrust.trustType] || selectedTrust.trustType}{["GRAT","ILIT","SLAT","QPRT"].includes(selectedTrust.trustType) && <InfoTip term={selectedTrust.trustType.toLowerCase()} />}</div>
                </div>
                <div className="p-3 rounded-md bg-muted/40">
                  <div className="text-xs text-muted-foreground">Funded Value</div>
                  <div className="text-sm font-medium">{fmtFullCurrency(parseFloat(selectedTrust.fundedValue || "0"))}</div>
                </div>
                {selectedTrust.dateEstablished && (
                  <div className="p-3 rounded-md bg-muted/40">
                    <div className="text-xs text-muted-foreground">Established</div>
                    <div className="text-sm font-medium">{selectedTrust.dateEstablished}</div>
                  </div>
                )}
                {selectedTrust.jurisdiction && (
                  <div className="p-3 rounded-md bg-muted/40">
                    <div className="text-xs text-muted-foreground">Jurisdiction</div>
                    <div className="text-sm font-medium">{selectedTrust.jurisdiction}</div>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Parties</h4>
                {selectedTrust.relationships && selectedTrust.relationships.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {selectedTrust.relationships.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span>{r.personName}</span>
                          <Badge variant="outline" className="text-[10px]">{r.role}</Badge>
                          {r.generation !== null && r.generation !== undefined && (
                            <span className="text-[10px] text-muted-foreground">Gen {r.generation}</span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          data-testid={`button-remove-relationship-${r.id}`}
                          onClick={() => deleteRelationshipMutation.mutate(r.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <AddRelationshipForm
                  trustId={selectedTrust.id}
                  onAdd={(data: any) => addRelationshipMutation.mutate(data)}
                  isPending={addRelationshipMutation.isPending}
                />
              </div>

              {selectedTrust.modeling && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Trust Modeling</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTrust.modeling.annualDistribution > 0 && (
                      <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                        <div className="text-[10px] text-muted-foreground">Annual Distribution</div>
                        <div className="text-sm font-medium" data-testid="text-trust-annual-dist">{fmtFullCurrency(selectedTrust.modeling.annualDistribution)}</div>
                      </div>
                    )}
                    {selectedTrust.modeling.remainderValue > 0 && (
                      <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                        <div className="text-[10px] text-muted-foreground">Remainder Value</div>
                        <div className="text-sm font-medium" data-testid="text-trust-remainder">{fmtFullCurrency(selectedTrust.modeling.remainderValue)}</div>
                      </div>
                    )}
                    <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30">
                      <div className="text-[10px] text-muted-foreground">Gift Tax Value</div>
                      <div className="text-sm font-medium" data-testid="text-trust-gift-tax">{fmtFullCurrency(selectedTrust.modeling.giftTaxValue)}</div>
                    </div>
                    {selectedTrust.modeling.effectiveTaxRate > 0 && (
                      <div className="p-2 rounded bg-red-50 dark:bg-red-950/30">
                        <div className="text-[10px] text-muted-foreground">Effective Tax Rate</div>
                        <div className="text-sm font-medium" data-testid="text-trust-eff-rate">{(selectedTrust.modeling.effectiveTaxRate * 100).toFixed(2)}%</div>
                      </div>
                    )}
                  </div>
                  {selectedTrust.modeling.modelingNotes?.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {selectedTrust.modeling.modelingNotes.map((note: string, i: number) => (
                        <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                          <FileText className="w-3 h-3 mt-0.5 shrink-0 text-blue-500" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {trustTypes[selectedTrust.trustType]?.taxBenefits && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Tax Benefits</h4>
                  <ul className="space-y-1">
                    {trustTypes[selectedTrust.trustType].taxBenefits.map((b: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Shield className="w-3.5 h-3.5 mt-0.5 text-green-600 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedTrust.notes && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedTrust.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AddRelationshipForm({ trustId, onAdd, isPending }: { trustId: string; onAdd: (data: any) => void; isPending: boolean }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [generation, setGeneration] = useState("");

  const handleSubmit = () => {
    if (!name || !role) return;
    onAdd({
      trustId,
      personName: name,
      role,
      generation: generation ? parseInt(generation) : null,
    });
    setName("");
    setRole("");
    setGeneration("");
  };

  return (
    <div className="flex flex-wrap items-end gap-2 p-2 rounded bg-muted/20 border border-dashed">
      <div className="flex-1 min-w-[120px]">
        <Label htmlFor="rel-name" className="text-[10px]">Name</Label>
        <Input
          id="rel-name"
          placeholder="Person name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 text-xs"
          data-testid="input-relationship-name"
        />
      </div>
      <div className="w-[120px]">
        <Label htmlFor="rel-role" className="text-[10px]">Role</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger id="rel-role" className="h-7 text-xs" data-testid="select-relationship-role">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grantor">Grantor</SelectItem>
            <SelectItem value="trustee">Trustee</SelectItem>
            <SelectItem value="beneficiary">Beneficiary</SelectItem>
            <SelectItem value="successor_trustee">Successor Trustee</SelectItem>
            <SelectItem value="protector">Protector</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-[60px]">
        <Label htmlFor="rel-gen" className="text-[10px]">Gen</Label>
        <Input
          id="rel-gen"
          type="number"
          placeholder="0"
          value={generation}
          onChange={(e) => setGeneration(e.target.value)}
          className="h-7 text-xs"
          data-testid="input-relationship-generation"
        />
      </div>
      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={handleSubmit}
        disabled={!name || !role || isPending}
        data-testid="button-add-relationship"
      >
        <UserPlus className="w-3 h-3 mr-1" />
        Add
      </Button>
    </div>
  );
}

function OverviewTab({ summary, sunsetAlert, recommendations, trusts, gifts }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card style={V2_CARD}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Total Estate Value</span>
            </div>
            <div className="text-xl font-bold" data-testid="text-estate-total-value">
              {fmtCurrency(summary.totalEstateValue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card style={V2_CARD}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Trust Assets</span>
            </div>
            <div className="text-xl font-bold" data-testid="text-trust-total-value">
              {fmtCurrency(summary.totalTrustValue || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {summary.activeTrusts || 0} active trust{(summary.activeTrusts || 0) !== 1 ? "s" : ""}
            </div>
          </CardContent>
        </Card>

        <Card style={V2_CARD}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Remaining Exemption</span>
            </div>
            <div className="text-xl font-bold" data-testid="text-remaining-exemption">
              {fmtCurrency(summary.remainingExemption || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              of {fmtCurrency(summary.currentFederalExemption || 0)} limit
            </div>
          </CardContent>
        </Card>

        <Card style={V2_CARD}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Lifetime Gifts Used</span>
            </div>
            <div className="text-xl font-bold" data-testid="text-lifetime-gifts">
              {fmtCurrency(summary.totalLifetimeGifts || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {(summary.totalBusinessValue > 0 || summary.totalCrtValue > 0) && (
        <Card style={V2_CARD} className="border-l-4 border-l-purple-400">
          <CardContent className="pt-4 pb-3">
            <div className="text-sm font-semibold mb-2">Business & Charitable Estate Impact</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {summary.totalBusinessValue > 0 && (
                <div data-testid="text-business-value">
                  <span className="text-xs text-muted-foreground block">Business Value</span>
                  <span className="font-semibold">{fmtCurrency(summary.totalBusinessValue)}</span>
                  {summary.businessEntityCount > 0 && (
                    <span className="text-xs text-muted-foreground ml-1">({summary.businessEntityCount} entit{summary.businessEntityCount === 1 ? 'y' : 'ies'})</span>
                  )}
                </div>
              )}
              {summary.totalFlpDiscounts > 0 && (
                <div data-testid="text-flp-discounts">
                  <span className="text-xs text-muted-foreground block">FLP Discounts</span>
                  <span className="font-semibold text-green-700">-{fmtCurrency(summary.totalFlpDiscounts)}</span>
                  <span className="text-xs text-muted-foreground ml-1">({summary.flpCount} FLP{summary.flpCount !== 1 ? 's' : ''})</span>
                </div>
              )}
              {summary.totalCrtValue > 0 && (
                <div data-testid="text-crt-value">
                  <span className="text-xs text-muted-foreground block">CRT Removals</span>
                  <span className="font-semibold text-green-700">-{fmtCurrency(summary.totalCrtValue)}</span>
                  <span className="text-xs text-muted-foreground ml-1">({summary.crtCount} CRT{summary.crtCount !== 1 ? 's' : ''})</span>
                </div>
              )}
              {summary.grossEstateValue > 0 && (
                <div data-testid="text-adjusted-estate">
                  <span className="text-xs text-muted-foreground block">Adjusted Estate</span>
                  <span className="font-semibold">{fmtCurrency(summary.adjustedEstateValue)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {sunsetAlert && (
        <SignalCard
          level={sunsetAlert.urgency === "critical" ? "action-needed" : sunsetAlert.urgency === "high" ? "review" : "info"}
          title={`TCJA Sunset Alert — ${sunsetAlert.daysRemaining} days remaining`}
        >
              <div>
                <p style={{ marginBottom: 8 }}>
                  The Tax Cuts and Jobs Act provisions are set to sunset on {sunsetAlert.sunsetDate}.
                  The federal estate tax exemption could drop from {fmtCurrency(sunsetAlert.currentExemption)} to {fmtCurrency(sunsetAlert.postSunsetExemption)}.
                </p>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="p-2 rounded bg-muted/40 text-center">
                    <div className="text-xs text-muted-foreground">Exemption Reduction</div>
                    <div className="text-sm font-bold" style={{ color: P.red }} data-testid="text-exemption-reduction">
                      -{fmtCurrency(sunsetAlert.exemptionReduction)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-muted/40 text-center">
                    <div className="text-xs text-muted-foreground">Potential Add'l Tax</div>
                    <div className="text-sm font-bold" style={{ color: P.red }}>
                      {fmtCurrency(sunsetAlert.potentialAdditionalTax)}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-muted/40 text-center">
                    <div className="text-xs text-muted-foreground">Post-Sunset Limit</div>
                    <div className="text-sm font-bold">
                      {fmtCurrency(sunsetAlert.postSunsetExemption)}
                    </div>
                  </div>
                </div>
              </div>
        </SignalCard>
      )}

      {recommendations.length > 0 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Action Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.map((rec: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-muted/30" data-testid={`recommendation-${i}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  rec.priority === "high" ? "bg-red-500" : rec.priority === "medium" ? "bg-amber-500" : "bg-blue-500"
                }`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{rec.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{rec.description}</div>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{rec.priority}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {trusts.length > 0 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Trust Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trusts.slice(0, 5).map((trust: any) => (
                <div key={trust.id} className="flex items-center justify-between p-2 rounded bg-muted/30" data-testid={`trust-summary-${trust.id}`}>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${TRUST_TYPE_COLORS[trust.trustType] || ""}`}>
                      {TRUST_TYPE_LABELS[trust.trustType] || trust.trustType}
                    </Badge>
                    <span className="text-sm font-medium">{trust.name}</span>
                  </div>
                  <span className="text-sm font-medium">{fmtCurrency(parseFloat(trust.fundedValue || "0"))}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TrustsTab({ trusts, trustTypes, onSelect, onDelete }: any) {
  if (trusts.length === 0) {
    return (
      <Card style={V2_CARD}>
        <CardContent>
          <EmptyState
            icon={Building2}
            title="No trust structures configured"
            description="Add trusts like GRATs, SLATs, ILITs, or QPRTs to model estate planning strategies and reduce taxable estate value."
            timeEstimate="Takes about 3 minutes per trust"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {trusts.map((trust: any) => (
        <Card key={trust.id} style={V2_CARD} className="hover:shadow-sm transition-shadow cursor-pointer" data-testid={`trust-card-${trust.id}`}>
          <CardContent className="p-4" onClick={() => onSelect(trust)}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-[10px] ${TRUST_TYPE_COLORS[trust.trustType] || ""}`}>
                    {TRUST_TYPE_LABELS[trust.trustType] || trust.trustType}
                  </Badge>
                  <span className="font-medium text-sm">{trust.name}</span>
                  <Badge variant={trust.status === "active" ? "default" : "secondary"} className="text-[10px]">
                    {trust.status}
                  </Badge>
                </div>
                {trustTypes[trust.trustType]?.label && (
                  <p className="text-xs text-muted-foreground mb-2">{trustTypes[trust.trustType].label}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    <DollarSign className="w-3 h-3 inline mr-0.5" />
                    {fmtCurrency(parseFloat(trust.fundedValue || "0"))}
                  </span>
                  {trust.dateEstablished && (
                    <span>
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      Est. {trust.dateEstablished}
                    </span>
                  )}
                  {trust.relationships && trust.relationships.length > 0 && (
                    <span>
                      <Users className="w-3 h-3 inline mr-0.5" />
                      {trust.relationships.length} parties
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={(e) => { e.stopPropagation(); onDelete(trust.id); }}
                  data-testid={`button-delete-trust-${trust.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ExemptionsTab({ summary, exemptions, sunsetAlert, gstTracking }: any) {
  const usedPct = summary.currentFederalExemption > 0
    ? ((summary.totalLifetimeGifts || 0) / summary.currentFederalExemption) * 100
    : 0;
  const gstUsedPct = gstTracking?.gstUtilizationPercent || 0;

  return (
    <div className="space-y-6">
      <Card style={V2_CARD}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Federal Estate Tax Exemption</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-muted-foreground">2024 Exemption</div>
              <div className="text-sm font-bold">{fmtCurrency(summary.currentFederalExemption || 0)}</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-muted-foreground">Used (Lifetime Gifts)</div>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{fmtCurrency(summary.totalLifetimeGifts || 0)}</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-muted-foreground">Remaining</div>
              <div className="text-sm font-bold text-green-600 dark:text-green-400" data-testid="text-exemption-remaining">
                {fmtCurrency(summary.remainingExemption || 0)}
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-muted-foreground">Annual Exclusion</div>
              <div className="text-sm font-bold">{fmtCurrency(summary.annualExclusion || 0)}</div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Exemption Used</span>
              <span className="font-medium">{usedPct.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(usedPct, 100)} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Card style={V2_CARD}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Generation-Skipping Transfer Tax (GSTT)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-muted-foreground">GST Exemption</div>
              <div className="text-sm font-bold">{fmtCurrency(gstTracking?.totalGstExemption || summary.gstExemption || 0)}</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-muted-foreground">GST Allocated</div>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400" data-testid="text-gst-allocated">
                {fmtCurrency(gstTracking?.totalGstAllocated || 0)}
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-muted-foreground">GST Remaining</div>
              <div className="text-sm font-bold text-green-600 dark:text-green-400" data-testid="text-gst-remaining">
                {fmtCurrency(gstTracking?.remainingGstExemption || summary.gstExemption || 0)}
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/40">
              <div className="text-xs text-muted-foreground">GST Tax Rate</div>
              <div className="text-sm font-bold">40%</div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">GST Exemption Used</span>
              <span className="font-medium">{gstUsedPct.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(gstUsedPct, 100)} className="h-2" />
          </div>

          {gstTracking?.gstGiftCount > 0 && (
            <div className="text-xs text-muted-foreground">
              {gstTracking.gstGiftCount} generation-skipping transfer{gstTracking.gstGiftCount !== 1 ? "s" : ""} recorded
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            The GST tax applies to transfers that skip a generation (e.g., grandparent to grandchild).
            Each person has a separate GST exemption that can be allocated to trusts or direct transfers.
          </p>
        </CardContent>
      </Card>

      {sunsetAlert && (
        <Card style={V2_CARD} className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              TCJA Sunset Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-3">
              When the TCJA sunsets, the estate tax exemption will revert to approximately {fmtCurrency(sunsetAlert.postSunsetExemption)},
              a reduction of {fmtCurrency(sunsetAlert.exemptionReduction)}.
            </div>
            <div className="p-3 rounded bg-amber-50 dark:bg-amber-900/20 text-sm">
              <strong>IRS "Anti-Clawback" Regulation:</strong> Gifts made using the higher exemption before the sunset
              will not be "clawed back" even if the exemption drops. This creates a use-it-or-lose-it opportunity.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GiftsTab({ gifts, onDelete, summary }: any) {
  return (
    <div className="space-y-4">
      <Card style={V2_CARD}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Gift History</CardTitle>
            <span className="text-xs text-muted-foreground">
              Annual Exclusion: {fmtCurrency(summary.annualExclusion || 18000)} per recipient
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {gifts.length === 0 ? (
            <div className="py-8 text-center">
              <Gift className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No gift history recorded.</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Recipient</th>
                    <th className="text-left p-2.5 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-right p-2.5 text-xs font-medium text-muted-foreground">Value</th>
                    <th className="text-right p-2.5 text-xs font-medium text-muted-foreground">Taxable</th>
                    <th className="text-center p-2.5 text-xs font-medium text-muted-foreground">GST</th>
                    <th className="p-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {gifts.map((gift: any) => (
                    <tr key={gift.id} className="border-b last:border-0" data-testid={`gift-row-${gift.id}`}>
                      <td className="p-2.5">{gift.giftDate}</td>
                      <td className="p-2.5">
                        <div>{gift.recipientName}</div>
                        {gift.recipientRelationship && (
                          <div className="text-xs text-muted-foreground">{gift.recipientRelationship}</div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px]">{gift.giftType}</Badge>
                      </td>
                      <td className="p-2.5 text-right font-medium">{fmtFullCurrency(parseFloat(gift.giftValue || "0"))}</td>
                      <td className="p-2.5 text-right text-amber-600 dark:text-amber-400">
                        {fmtFullCurrency(parseFloat(gift.taxableAmount || "0"))}
                      </td>
                      <td className="p-2.5 text-center">
                        {gift.gstApplicable ? (
                          <Badge variant="destructive" className="text-[10px]">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => onDelete(gift.id)}
                          data-testid={`button-delete-gift-${gift.id}`}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
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

function WealthMapTab({ trusts, clientName, totalAum, summary }: any) {
  const generations: Record<number, any[]> = {};

  trusts.forEach((trust: any) => {
    if (trust.relationships) {
      trust.relationships.forEach((rel: any) => {
        const gen = rel.generation || 0;
        if (!generations[gen]) generations[gen] = [];
        const existing = generations[gen].find((p: any) => p.name === rel.personName);
        if (existing) {
          existing.roles.push({ role: rel.role, trustName: trust.name, trustType: trust.trustType });
        } else {
          generations[gen].push({
            name: rel.personName,
            roles: [{ role: rel.role, trustName: trust.name, trustType: trust.trustType }],
          });
        }
      });
    }
  });

  if (!generations[0]) {
    generations[0] = [{ name: clientName, roles: [{ role: "grantor", trustName: "Estate", trustType: "ESTATE" }] }];
  }

  const genKeys = Object.keys(generations).map(Number).sort();
  const genLabels: Record<number, string> = { 0: "Generation 1 (Grantors)", 1: "Generation 2 (Children)", 2: "Generation 3 (Grandchildren)", 3: "Generation 4" };

  return (
    <div className="space-y-6">
      <Card style={V2_CARD}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Family Wealth Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground mb-4">
            Visualizing asset flow across generations through trust structures
          </div>

          <div className="space-y-6">
            {genKeys.map((gen) => (
              <div key={gen}>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {genLabels[gen] || `Generation ${gen + 1}`}
                </div>
                <div className="flex flex-wrap gap-3">
                  {generations[gen].map((person: any, pi: number) => (
                    <div
                      key={pi}
                      className="border rounded-lg p-3 min-w-[180px] bg-card hover:shadow-sm transition-shadow"
                      data-testid={`wealthmap-person-${gen}-${pi}`}
                    >
                      <div className="font-medium text-sm mb-1.5">{person.name}</div>
                      <div className="space-y-1">
                        {person.roles.map((r: any, ri: number) => (
                          <div key={ri} className="flex items-center gap-1.5 text-xs">
                            <Badge className={`text-[10px] ${TRUST_TYPE_COLORS[r.trustType] || "bg-gray-100"}`}>
                              {TRUST_TYPE_LABELS[r.trustType] || r.trustType}
                            </Badge>
                            <span className="text-muted-foreground">{r.role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {gen < genKeys[genKeys.length - 1] && (
                  <div className="flex justify-center my-2">
                    <div className="flex flex-col items-center">
                      <div className="w-px h-4 bg-border" />
                      <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
                      <div className="w-px h-4 bg-border" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {trusts.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Trust Structures
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {trusts.map((trust: any) => (
                  <div key={trust.id} className="flex items-center gap-2 p-2 rounded bg-muted/30 text-sm">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <Badge className={`text-[10px] ${TRUST_TYPE_COLORS[trust.trustType] || ""}`}>
                      {TRUST_TYPE_LABELS[trust.trustType] || trust.trustType}
                    </Badge>
                    <span className="font-medium truncate">{trust.name}</span>
                    <span className="text-muted-foreground ml-auto shrink-0">{fmtCurrency(parseFloat(trust.fundedValue || "0"))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card style={V2_CARD}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Estate Distribution Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/20 text-center">
              <div className="text-xs text-muted-foreground">Total Estate</div>
              <div className="text-lg font-bold">{fmtCurrency(summary.totalEstateValue || 0)}</div>
            </div>
            <div className="p-3 rounded bg-purple-50 dark:bg-purple-900/20 text-center">
              <div className="text-xs text-muted-foreground">In Trust</div>
              <div className="text-lg font-bold">{fmtCurrency(summary.totalTrustValue || 0)}</div>
              <div className="text-xs text-muted-foreground">
                {summary.totalEstateValue > 0 ? ((summary.totalTrustValue / summary.totalEstateValue) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="p-3 rounded bg-green-50 dark:bg-green-900/20 text-center">
              <div className="text-xs text-muted-foreground">Non-Trust</div>
              <div className="text-lg font-bold">{fmtCurrency((summary.totalEstateValue || 0) - (summary.totalTrustValue || 0))}</div>
              <div className="text-xs text-muted-foreground">
                {summary.totalEstateValue > 0 ? (((summary.totalEstateValue - summary.totalTrustValue) / summary.totalEstateValue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TaxAnalysisTab({ taxAnalysis, summary }: any) {
  const { estateTax, sunsetComparison, gratAnalyses, slatAnalyses, idgtAnalyses, gstTracking, exemptionTracker, strategyComparisons } = taxAnalysis || {};

  return (
    <div className="space-y-6">
      <Card style={V2_CARD}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Federal Estate Tax Computation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {estateTax && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-md bg-muted/40">
                  <div className="text-xs text-muted-foreground">Gross Estate</div>
                  <div className="text-sm font-bold" data-testid="text-tax-gross-estate">{fmtCurrency(estateTax.grossEstate)}</div>
                </div>
                <div className="p-3 rounded-md bg-muted/40">
                  <div className="text-xs text-muted-foreground">Taxable Estate</div>
                  <div className="text-sm font-bold" data-testid="text-tax-taxable-estate">{fmtCurrency(estateTax.taxableEstate)}</div>
                </div>
                <div className="p-3 rounded-md bg-muted/40">
                  <div className="text-xs text-muted-foreground">Unified Credit</div>
                  <div className="text-sm font-bold text-green-600 dark:text-green-400" data-testid="text-tax-unified-credit">{fmtCurrency(estateTax.unifiedCredit)}</div>
                </div>
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30">
                  <div className="text-xs text-muted-foreground">Net Estate Tax</div>
                  <div className="text-sm font-bold text-red-600 dark:text-red-400" data-testid="text-tax-net-estate">{fmtCurrency(estateTax.netEstateTax)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 rounded bg-muted/30 text-center">
                  <div className="text-xs text-muted-foreground">Effective Rate</div>
                  <div className="text-sm font-bold" data-testid="text-tax-effective-rate">{(estateTax.effectiveRate * 100).toFixed(2)}%</div>
                </div>
                <div className="p-2 rounded bg-muted/30 text-center">
                  <div className="text-xs text-muted-foreground">Marginal Rate</div>
                  <div className="text-sm font-bold" data-testid="text-tax-marginal-rate">{(estateTax.marginalRate * 100).toFixed(0)}%</div>
                </div>
                <div className="p-2 rounded bg-muted/30 text-center">
                  <div className="text-xs text-muted-foreground">Applicable Exclusion</div>
                  <div className="text-sm font-bold">{fmtCurrency(estateTax.applicableExclusion)}</div>
                </div>
              </div>

              {estateTax.bracketBreakdown?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Tax Bracket Breakdown</div>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-2 font-medium text-muted-foreground">Bracket</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">Amount</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">Rate</th>
                          <th className="text-right p-2 font-medium text-muted-foreground">Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estateTax.bracketBreakdown.map((b: any, i: number) => (
                          <tr key={i} className="border-b last:border-0" data-testid={`tax-bracket-row-${i}`}>
                            <td className="p-2">{b.bracket}</td>
                            <td className="p-2 text-right">{fmtCurrency(b.taxableInBracket)}</td>
                            <td className="p-2 text-right">{(b.rate * 100).toFixed(0)}%</td>
                            <td className="p-2 text-right font-medium">{fmtCurrency(b.taxOnBracket)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {sunsetComparison && (
        <Card style={V2_CARD} className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              TCJA Sunset Scenario Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Current Law (Pre-Sunset)</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Exemption</span>
                    <span className="font-medium">{fmtCurrency(sunsetComparison.currentExemption)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Net Tax</span>
                    <span className="font-bold" data-testid="text-sunset-current-tax">{fmtCurrency(sunsetComparison.currentScenario?.netEstateTax || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Effective Rate</span>
                    <span>{((sunsetComparison.currentScenario?.effectiveRate || 0) * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">Post-Sunset (2026+)</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Exemption</span>
                    <span className="font-medium">{fmtCurrency(sunsetComparison.postSunsetExemption)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Net Tax</span>
                    <span className="font-bold" data-testid="text-sunset-post-tax">{fmtCurrency(sunsetComparison.postSunsetScenario?.netEstateTax || 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Effective Rate</span>
                    <span>{((sunsetComparison.postSunsetScenario?.effectiveRate || 0) * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded bg-red-100 dark:bg-red-950/30 text-center">
                <div className="text-xs text-muted-foreground">Additional Tax Exposure</div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400" data-testid="text-sunset-additional-tax">
                  +{fmtCurrency(sunsetComparison.additionalTaxExposure)}
                </div>
              </div>
              <div className="p-3 rounded bg-amber-100 dark:bg-amber-950/30 text-center">
                <div className="text-xs text-muted-foreground">Use-It-or-Lose-It</div>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400" data-testid="text-sunset-use-lose">
                  {fmtCurrency(sunsetComparison.useItOrLoseIt)}
                </div>
              </div>
              <div className="p-3 rounded bg-muted/40 text-center">
                <div className="text-xs text-muted-foreground">Days Remaining</div>
                <div className="text-lg font-bold" data-testid="text-sunset-days">
                  {sunsetComparison.daysRemaining}
                </div>
                <Badge
                  variant={sunsetComparison.urgency === "critical" ? "destructive" : "secondary"}
                  className="text-[10px] mt-1"
                >
                  {sunsetComparison.urgency}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {gratAnalyses?.length > 0 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              GRAT Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {gratAnalyses.map((grat: any, i: number) => (
              <div key={i} className="p-4 rounded-md border" data-testid={`grat-analysis-${i}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-[10px]">GRAT</Badge>
                  <span className="text-sm font-medium">{fmtCurrency(grat.fundedValue)} | {grat.termYears}-Year Term</span>
                  {grat.isZeroedOut && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">Zeroed Out</Badge>
                  )}
                  {grat.zeroOutProbability !== undefined && (
                    <Badge variant="outline" className="text-[10px]" data-testid={`grat-zero-prob-${i}`}>
                      {(grat.zeroOutProbability * 100).toFixed(0)}% zero-out probability
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-[10px] text-muted-foreground">Annual Annuity</div>
                    <div className="text-xs font-bold">{fmtCurrency(grat.annualAnnuityPayment)}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-[10px] text-muted-foreground">Remainder Interest</div>
                    <div className="text-xs font-bold">{fmtCurrency(grat.remainderInterestValue)}</div>
                  </div>
                  <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                    <div className="text-[10px] text-muted-foreground">Projected Transfer</div>
                    <div className="text-xs font-bold text-green-600 dark:text-green-400">{fmtCurrency(grat.wealthTransferred)}</div>
                  </div>
                  <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                    <div className="text-[10px] text-muted-foreground">Gift Tax Saved</div>
                    <div className="text-xs font-bold text-green-600 dark:text-green-400">{fmtCurrency(grat.giftTaxSaved)}</div>
                  </div>
                </div>

                <div className="text-xs font-semibold text-muted-foreground mb-1.5">Growth Sensitivity</div>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-muted/30 border-b">
                        <th className="text-left p-1.5 font-medium">Growth Rate</th>
                        <th className="text-right p-1.5 font-medium">End Value</th>
                        <th className="text-right p-1.5 font-medium">Wealth Transferred</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grat.sensitivityAnalysis?.map((s: any, si: number) => (
                        <tr key={si} className={`border-b last:border-0 ${s.growthRate === grat.assumedGrowthRate ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}>
                          <td className="p-1.5">{(s.growthRate * 100).toFixed(0)}%</td>
                          <td className="p-1.5 text-right">{fmtCurrency(s.projectedEndValue)}</td>
                          <td className="p-1.5 text-right font-medium">{fmtCurrency(s.wealthTransferred)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {grat.notes?.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {grat.notes.map((note: string, ni: number) => (
                      <li key={ni} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <Info className="w-3 h-3 mt-0.5 shrink-0 text-blue-500" />
                        {note}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {slatAnalyses?.length > 0 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Scale className="w-4 h-4" />
              SLAT / IDGT Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {slatAnalyses.map((slat: any, i: number) => (
              <div key={i} className="p-4 rounded-md border" data-testid={`slat-analysis-${i}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-[10px]">SLAT</Badge>
                  <span className="text-sm font-medium">{fmtCurrency(slat.fundedValue)}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-[10px] text-muted-foreground">Estate Reduction</div>
                    <div className="text-xs font-bold">{fmtCurrency(slat.estateReduction)}</div>
                  </div>
                  <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                    <div className="text-[10px] text-muted-foreground">Tax Savings</div>
                    <div className="text-xs font-bold text-green-600 dark:text-green-400">{fmtCurrency(slat.estateTaxSavings)}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-[10px] text-muted-foreground">Exemption Used</div>
                    <div className="text-xs font-bold">{fmtCurrency(slat.exemptionUsed)}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-[10px] text-muted-foreground">Projected Value</div>
                    <div className="text-xs font-bold">{fmtCurrency(slat.projectedValueAtTerm)}</div>
                  </div>
                </div>

                {slat.reciprocalTrustWarning && (
                  <div className="p-3 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">Reciprocal Trust Doctrine Risk</div>
                        {slat.reciprocalTrustNotes?.map((note: string, ni: number) => (
                          <div key={ni} className="text-[11px] text-muted-foreground mt-0.5">{note}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {slat.notes?.length > 0 && (
                  <ul className="space-y-0.5">
                    {slat.notes.map((note: string, ni: number) => (
                      <li key={ni} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <Info className="w-3 h-3 mt-0.5 shrink-0 text-purple-500" />
                        {note}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {idgtAnalyses?.length > 0 && idgtAnalyses.map((idgt: any, i: number) => (
              <div key={i} className="p-4 rounded-md border" data-testid={`idgt-analysis-${i}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-[10px]">IDGT</Badge>
                  <span className="text-sm font-medium">{fmtCurrency(idgt.fundedValue)}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-[10px] text-muted-foreground">Note Value</div>
                    <div className="text-xs font-bold">{fmtCurrency(idgt.noteValue)}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-[10px] text-muted-foreground">Annual Interest</div>
                    <div className="text-xs font-bold">{fmtCurrency(idgt.annualInterest)}</div>
                  </div>
                  <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                    <div className="text-[10px] text-muted-foreground">Wealth Transferred</div>
                    <div className="text-xs font-bold text-green-600 dark:text-green-400">{fmtCurrency(idgt.wealthTransferred)}</div>
                  </div>
                  <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                    <div className="text-[10px] text-muted-foreground">Estate Tax Saved</div>
                    <div className="text-xs font-bold text-green-600 dark:text-green-400">{fmtCurrency(idgt.estateTaxSaved)}</div>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <div className="text-[10px] text-muted-foreground">Income Tax Cost</div>
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400">{fmtCurrency(idgt.incomeTaxOnGrowth)}</div>
                  </div>
                  <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                    <div className="text-[10px] text-muted-foreground">Net Benefit</div>
                    <div className="text-xs font-bold">{fmtCurrency(idgt.netBenefit)}</div>
                  </div>
                </div>

                {idgt.notes?.length > 0 && (
                  <ul className="space-y-0.5">
                    {idgt.notes.map((note: string, ni: number) => (
                      <li key={ni} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                        <Info className="w-3 h-3 mt-0.5 shrink-0 text-orange-500" />
                        {note}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {exemptionTracker && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Lifetime Exemption Tracker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-muted-foreground">Federal Exemption</div>
                <div className="text-sm font-bold">{fmtCurrency(exemptionTracker.federalExemption)}</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-muted-foreground">Gifts Used</div>
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{fmtCurrency(exemptionTracker.lifetimeGiftsUsed)}</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-muted-foreground">Trust Transfers</div>
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{fmtCurrency(exemptionTracker.trustTransfersUsed)}</div>
              </div>
              <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/30">
                <div className="text-xs text-muted-foreground">Remaining</div>
                <div className="text-sm font-bold text-green-600 dark:text-green-400" data-testid="text-tracker-remaining">{fmtCurrency(exemptionTracker.remainingExemption)}</div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Exemption Utilization</span>
                <span className="font-medium">{exemptionTracker.utilizationPercent.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(exemptionTracker.utilizationPercent, 100)} className="h-2" />
            </div>

            {exemptionTracker.capacityAtRisk > 0 && (
              <div className="p-3 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-red-800 dark:text-red-300">Capacity at Risk from Sunset</div>
                    <div className="text-[11px] text-muted-foreground">
                      {fmtCurrency(exemptionTracker.capacityAtRisk)} of remaining exemption capacity could be lost if TCJA sunsets.
                      Post-sunset remaining: {fmtCurrency(exemptionTracker.postSunsetRemaining)}.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {exemptionTracker.trustUsageBreakdown?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1.5">Exemption Usage by Trust</div>
                <div className="space-y-1">
                  {exemptionTracker.trustUsageBreakdown.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${TRUST_TYPE_COLORS[t.trustType] || ""}`}>
                          {TRUST_TYPE_LABELS[t.trustType] || t.trustType}
                        </Badge>
                        <span>{t.trustName}</span>
                      </div>
                      <span className="font-medium">{fmtCurrency(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {exemptionTracker.notes?.length > 0 && (
              <ul className="space-y-0.5">
                {exemptionTracker.notes.map((note: string, ni: number) => (
                  <li key={ni} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 shrink-0 text-blue-500" />
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {gstTracking && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              GST Tax Exposure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-muted-foreground">GST Exemption</div>
                <div className="text-sm font-bold">{fmtCurrency(gstTracking.totalGstExemption)}</div>
              </div>
              <div className="p-3 rounded-md bg-muted/40">
                <div className="text-xs text-muted-foreground">GST Allocated</div>
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{fmtCurrency(gstTracking.totalGstAllocated)}</div>
              </div>
              <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/30">
                <div className="text-xs text-muted-foreground">GST Remaining</div>
                <div className="text-sm font-bold text-green-600 dark:text-green-400" data-testid="text-tax-gst-remaining">{fmtCurrency(gstTracking.remainingGstExemption)}</div>
              </div>
              <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30">
                <div className="text-xs text-muted-foreground">Potential GST Tax</div>
                <div className="text-sm font-bold text-red-600 dark:text-red-400">{fmtCurrency(gstTracking.potentialGstTax)}</div>
              </div>
            </div>

            {gstTracking.dynastyTrustAllocations?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1.5">Dynasty Trust GST Allocations</div>
                {gstTracking.dynastyTrustAllocations.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs mb-1">
                    <span>{d.trustName}</span>
                    <span className="font-medium">{fmtCurrency(d.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {gstTracking.notes?.length > 0 && (
              <ul className="space-y-0.5">
                {gstTracking.notes.map((note: string, ni: number) => (
                  <li key={ni} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <Info className="w-3 h-3 mt-0.5 shrink-0 text-blue-500" />
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {strategyComparisons?.length > 0 && (
        <Card style={V2_CARD}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Trust Strategy Comparisons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-2.5 font-medium text-muted-foreground">Strategy</th>
                    <th className="text-right p-2.5 font-medium text-muted-foreground">Tax Without</th>
                    <th className="text-right p-2.5 font-medium text-muted-foreground">Tax With</th>
                    <th className="text-right p-2.5 font-medium text-muted-foreground">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {strategyComparisons.map((sc: any, i: number) => (
                    <tr key={i} className="border-b last:border-0" data-testid={`strategy-row-${i}`}>
                      <td className="p-2.5">
                        <div className="font-medium">{sc.strategy}</div>
                        <div className="text-[10px] text-muted-foreground">{sc.description}</div>
                      </td>
                      <td className="p-2.5 text-right">{fmtCurrency(sc.estateTaxWithout)}</td>
                      <td className="p-2.5 text-right">{fmtCurrency(sc.estateTaxWith)}</td>
                      <td className="p-2.5 text-right font-bold text-green-600 dark:text-green-400">{fmtCurrency(sc.savings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreateTrustDialog({ open, onClose, onSubmit, isPending }: any) {
  const [form, setForm] = useState({
    trustType: "",
    name: "",
    fundedValue: "",
    dateEstablished: "",
    jurisdiction: "",
    notes: "",
  });

  const handleSubmit = () => {
    if (!form.trustType || !form.name) return;
    onSubmit(form);
    setForm({ trustType: "", name: "", fundedValue: "", dateEstablished: "", jurisdiction: "", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Trust Structure</DialogTitle>
          <DialogDescription>Add a new trust to the estate plan</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trust-type">Trust Type</Label>
            <Select value={form.trustType} onValueChange={(v) => setForm((p) => ({ ...p, trustType: v }))}>
              <SelectTrigger id="trust-type" data-testid="select-trust-type">
                <SelectValue placeholder="Select trust type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GRAT">GRAT - Grantor Retained Annuity Trust</SelectItem>
                <SelectItem value="SLAT">SLAT - Spousal Lifetime Access Trust</SelectItem>
                <SelectItem value="QPRT">QPRT - Qualified Personal Residence Trust</SelectItem>
                <SelectItem value="ILIT">ILIT - Irrevocable Life Insurance Trust</SelectItem>
                <SelectItem value="CRT">CRT - Charitable Remainder Trust</SelectItem>
                <SelectItem value="DAF">DAF - Donor-Advised Fund</SelectItem>
                <SelectItem value="REVOCABLE">Revocable Living Trust</SelectItem>
                <SelectItem value="DYNASTY">Dynasty Trust</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trust-name">Trust Name</Label>
            <Input
              id="trust-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Smith Family GRAT 2024"
              data-testid="input-trust-name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="trust-value">Funded Value</Label>
              <Input
                id="trust-value"
                value={form.fundedValue}
                onChange={(e) => setForm((p) => ({ ...p, fundedValue: e.target.value }))}
                placeholder="e.g., 5000000"
                data-testid="input-trust-value"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trust-date">Date Established</Label>
              <Input
                id="trust-date"
                type="date"
                value={form.dateEstablished}
                onChange={(e) => setForm((p) => ({ ...p, dateEstablished: e.target.value }))}
                data-testid="input-trust-date"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trust-jurisdiction">Jurisdiction</Label>
            <Input
              id="trust-jurisdiction"
              value={form.jurisdiction}
              onChange={(e) => setForm((p) => ({ ...p, jurisdiction: e.target.value }))}
              placeholder="e.g., Delaware, Nevada, South Dakota"
              data-testid="input-trust-jurisdiction"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trust-notes">Notes</Label>
            <Textarea
              id="trust-notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
              data-testid="input-trust-notes"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-trust">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.trustType || !form.name || isPending}
            data-testid="button-submit-trust"
          >
            {isPending ? "Creating..." : "Create Trust"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const AGENT_STYLE_MAP: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  planning_triage: { label: "Planning Triage", icon: Zap, color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" },
  knowledge_retrieval: { label: "Knowledge Retrieval", icon: BookOpen, color: "text-purple-700 dark:text-purple-300", bgColor: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800" },
  report_writer: { label: "Report Writer", icon: ClipboardList, color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" },
  default: { label: "AI Agent", icon: Brain, color: "text-gray-700 dark:text-gray-300", bgColor: "bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800" },
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

interface AIRecommendationCard {
  agent: string;
  title: string;
  content: string;
  confidence: "high" | "medium" | "low";
  suggestedAction: string;
}

function resolveAgentForCard(
  trace: { primary_agent: string; secondary_agents: string[]; context?: { intent?: string } } | undefined,
  calledAgent: string | undefined,
): string {
  if (trace?.primary_agent) {
    const name = trace.primary_agent.toLowerCase().replace(/[\s-]+/g, "_");
    if (AGENT_STYLE_MAP[name]) return name;
    if (name.includes("triage") || name.includes("planning")) return "planning_triage";
    if (name.includes("knowledge") || name.includes("retrieval") || name.includes("research")) return "knowledge_retrieval";
    if (name.includes("report") || name.includes("writer") || name.includes("summary")) return "report_writer";
  }
  if (calledAgent) {
    const name = calledAgent.toLowerCase().replace(/[\s-]+/g, "_");
    if (AGENT_STYLE_MAP[name]) return name;
  }
  return "default";
}

function parseAIResponse(
  finResponse: string,
  trace?: { primary_agent: string; secondary_agents: string[]; context?: { intent?: string } },
  calledAgent?: string,
): AIRecommendationCard[] {
  const cards: AIRecommendationCard[] = [];

  const allAgents: string[] = [];
  if (trace?.primary_agent) {
    const normalized = trace.primary_agent.toLowerCase().replace(/[\s-]+/g, "_");
    allAgents.push(normalized);
  }
  if (trace?.secondary_agents?.length) {
    for (const sa of trace.secondary_agents) {
      const normalized = sa.toLowerCase().replace(/[\s-]+/g, "_");
      allAgents.push(normalized);
    }
  }

  const resolvedPrimary = resolveAgentForCard(trace, calledAgent);

  const sections = finResponse.split(/(?=#{1,3}\s)/);
  let sectionIndex = 0;

  for (const section of sections) {
    if (!section.trim()) continue;

    const titleMatch = section.match(/^#{1,3}\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : "Analysis";
    const content = section.replace(/^#{1,3}\s*.+\n?/, "").trim();

    if (!content) continue;

    const actionMatch = content.match(/(?:action|recommend|suggest|next step)[:\s]*(.+?)(?:\n|$)/i);
    const suggestedAction = actionMatch ? actionMatch[1].trim() : "Review with client";

    let confidence: "high" | "medium" | "low" = "medium";
    if (content.match(/(?:strongly recommend|critical|urgent|immediate)/i)) confidence = "high";
    if (content.match(/(?:consider|may want|optional|explore)/i)) confidence = "low";

    let agent = resolvedPrimary;
    if (allAgents.length > 0 && sectionIndex < allAgents.length) {
      const candidateAgent = allAgents[sectionIndex];
      if (AGENT_STYLE_MAP[candidateAgent]) {
        agent = candidateAgent;
      } else if (candidateAgent.includes("triage") || candidateAgent.includes("planning")) {
        agent = "planning_triage";
      } else if (candidateAgent.includes("knowledge") || candidateAgent.includes("retrieval")) {
        agent = "knowledge_retrieval";
      } else if (candidateAgent.includes("report") || candidateAgent.includes("writer")) {
        agent = "report_writer";
      }
    }

    cards.push({ agent, title, content, confidence, suggestedAction });
    sectionIndex++;
  }

  if (cards.length === 0 && finResponse.trim()) {
    cards.push({
      agent: resolvedPrimary,
      title: "Estate Planning Analysis",
      content: finResponse,
      confidence: "medium",
      suggestedAction: "Review analysis with client",
    });
  }

  return cards;
}

const ESTATE_CHAIN_AGENTS = [
  { name: "planning_triage", label: "Planning Triage" },
  { name: "knowledge_retrieval", label: "Knowledge Retrieval" },
  { name: "report_writer", label: "Report Writer" },
];

function AIEstateAnalysisTab({
  clientId,
  clientName,
  totalAum,
  trusts,
  gifts,
  summary,
  exemptions,
  sunsetAlert,
  taxAnalysis,
  aiJobId,
  setAiJobId,
}: {
  clientId: string;
  clientName: string;
  totalAum: number;
  trusts: any[];
  gifts: any[];
  summary: any;
  exemptions: any[];
  sunsetAlert: any;
  taxAnalysis: any;
  aiJobId: string | null;
  setAiJobId: (id: string | null) => void;
}) {
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
  const { status, data, error, isLoading } = useCassidyJob(aiJobId);

  const toggleCard = useCallback((idx: number) => {
    setExpandedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  const buildEstateContext = useCallback(() => {
    const trustStructures = trusts.map((t: any) => ({
      name: t.name,
      type: TRUST_TYPE_LABELS[t.trustType] || t.trustType,
      fundedValue: parseFloat(t.fundedValue || "0"),
      dateEstablished: t.dateEstablished || null,
      jurisdiction: t.jurisdiction || null,
      beneficiaries: (t.relationships || [])
        .filter((r: any) => r.role === "beneficiary")
        .map((r: any) => r.personName),
      parties: (t.relationships || []).map((r: any) => ({
        name: r.personName,
        role: r.role,
      })),
    }));

    const giftHistory = gifts.map((g: any) => ({
      recipient: g.recipientName,
      value: parseFloat(g.giftValue || "0"),
      date: g.giftDate,
      type: g.giftType,
      gstApplicable: g.gstApplicable,
    }));

    return {
      total_aum: totalAum,
      estimated_estate_value: summary?.totalEstateValue || totalAum,
      trust_structures: trustStructures,
      trust_count: trusts.length,
      total_trust_value: summary?.totalTrustValue || 0,
      gift_history: giftHistory,
      total_lifetime_gifts: summary?.totalLifetimeGifts || 0,
      remaining_exemption: summary?.remainingExemption || 0,
      current_federal_exemption: summary?.currentFederalExemption || 13610000,
      exemption_utilization_pct: summary?.exemptionUsedPercent || 0,
      sunset_alert: sunsetAlert ? {
        days_remaining: sunsetAlert.daysRemaining,
        urgency: sunsetAlert.urgency,
        exemption_reduction: sunsetAlert.exemptionReduction,
        potential_additional_tax: sunsetAlert.potentialAdditionalTax,
      } : null,
      tax_analysis_summary: taxAnalysis ? {
        net_estate_tax: taxAnalysis.estateTax?.netEstateTax || 0,
        effective_rate: taxAnalysis.estateTax?.effectiveRate || 0,
        marginal_rate: taxAnalysis.estateTax?.marginalRate || 0,
      } : null,
      beneficiary_data: trusts.flatMap((t: any) =>
        (t.relationships || []).map((r: any) => ({
          name: r.personName,
          role: r.role,
          trustName: t.name,
          generation: r.generation,
        }))
      ),
    };
  }, [totalAum, trusts, gifts, summary, sunsetAlert, taxAnalysis]);

  const estateContext = buildEstateContext();

  const handleJobStarted = useCallback((jobId: string) => {
    setAiJobId(jobId);
    setExpandedCards({});
  }, [setAiJobId]);

  const buildPrompt = useCallback((analysisType: string) => {
    const prompts: Record<string, string> = {
      full: `Run a comprehensive estate planning analysis for ${clientName}. Chain through Planning Triage (identify key risks and opportunities), Knowledge Retrieval (find relevant regulatory changes and case law), and Report Writer (produce an actionable summary report). Estate value: ${fmtCurrency(estateContext.estimated_estate_value as number)}, ${trusts.length} trust(s), remaining exemption: ${fmtCurrency(estateContext.remaining_exemption as number)}.`,
      tax_optimization: `Analyze estate tax optimization scenarios for ${clientName}. Current estimated estate tax: ${fmtCurrency((estateContext.tax_analysis_summary as any)?.net_estate_tax || 0)} at ${((((estateContext.tax_analysis_summary as any)?.effective_rate) || 0) * 100).toFixed(1)}% effective rate. Evaluate GRAT, SLAT, IDGT, and other strategies to reduce tax exposure. ${sunsetAlert ? `TCJA sunset in ${sunsetAlert.daysRemaining} days — exemption drops by ${fmtCurrency(sunsetAlert.exemptionReduction)}.` : ""}`,
      regulatory: `Identify recent and upcoming regulatory changes affecting estate planning for ${clientName}. Focus on TCJA sunset provisions, IRS guidance on trust structures, state-level estate tax changes, and any new case law affecting ${trusts.map((t: any) => TRUST_TYPE_LABELS[t.trustType] || t.trustType).join(", ")} trust types.`,
      summary_report: `Generate a comprehensive estate planning summary report for ${clientName}. Include: trust inventory and status, beneficiary cross-reference, exemption utilization analysis, recommended next steps, and key risk factors. Total estate: ${fmtCurrency(estateContext.estimated_estate_value as number)}, ${trusts.length} trust(s), ${gifts.length} lifetime gift(s).`,
    };
    return prompts[analysisType] || prompts.full;
  }, [clientName, trusts, gifts, sunsetAlert, estateContext]);

  const recommendations = data
    ? parseAIResponse(data.fin_response, data.agent_trace, data.called_agent)
    : [];

  const isAnalysisActive = isLoading && !!aiJobId;

  return (
    <div className="space-y-6" data-testid="ai-estate-analysis-tab">
      <Card style={V2_CARD} className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-purple-50/30 dark:from-blue-950/20 dark:to-purple-950/10">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/40">
              <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold" data-testid="text-ai-analysis-title">AI Estate Analysis</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multi-agent analysis chain: Planning Triage → Knowledge Retrieval → Report Writer
              </p>
            </div>
            {aiJobId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setAiJobId(null); setExpandedCards({}); }}
                data-testid="button-clear-ai-results"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <CassidyAnalysisButton
              clientId={clientId}
              clientName={clientName}
              prompt={buildPrompt("full")}
              taskType="analysis"
              clientContext={estateContext}
              metadata={{ analysis_type: "full", section: "estate_planning" }}
              chainAgents={ESTATE_CHAIN_AGENTS}
              onJobStarted={handleJobStarted}
              variant="default"
              size="sm"
              className="h-9 text-xs"
              icon={<Sparkles className="w-3 h-3 mr-1.5" />}
              label="Full Analysis"
              disabled={isAnalysisActive}
              data-testid="button-ai-full-analysis"
            />
            <CassidyAnalysisButton
              clientId={clientId}
              clientName={clientName}
              prompt={buildPrompt("tax_optimization")}
              taskType="analysis"
              clientContext={estateContext}
              metadata={{ analysis_type: "tax_optimization", section: "estate_planning" }}
              chainAgents={ESTATE_CHAIN_AGENTS}
              onJobStarted={handleJobStarted}
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              icon={<Calculator className="w-3 h-3 mr-1.5" />}
              label="Tax Scenarios"
              disabled={isAnalysisActive}
              data-testid="button-ai-tax-optimization"
            />
            <CassidyAnalysisButton
              clientId={clientId}
              clientName={clientName}
              prompt={buildPrompt("regulatory")}
              taskType="analysis"
              clientContext={estateContext}
              metadata={{ analysis_type: "regulatory", section: "estate_planning" }}
              chainAgents={ESTATE_CHAIN_AGENTS}
              onJobStarted={handleJobStarted}
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              icon={<BookOpen className="w-3 h-3 mr-1.5" />}
              label="Regulatory Changes"
              disabled={isAnalysisActive}
              data-testid="button-ai-regulatory"
            />
            <CassidyAnalysisButton
              clientId={clientId}
              clientName={clientName}
              prompt={buildPrompt("summary_report")}
              taskType="analysis"
              clientContext={estateContext}
              metadata={{ analysis_type: "summary_report", section: "estate_planning" }}
              chainAgents={ESTATE_CHAIN_AGENTS}
              onJobStarted={handleJobStarted}
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              icon={<ClipboardList className="w-3 h-3 mr-1.5" />}
              label="Summary Report"
              disabled={isAnalysisActive}
              data-testid="button-ai-summary-report"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50">
              <Landmark className="w-2.5 h-2.5" />
              Estate: {fmtCurrency(summary?.totalEstateValue || totalAum)}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50">
              <Building2 className="w-2.5 h-2.5" />
              {trusts.length} Trust{trusts.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50">
              <Shield className="w-2.5 h-2.5" />
              Exemption: {fmtCurrency(summary?.remainingExemption || 0)}
            </span>
            {sunsetAlert && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-2.5 h-2.5" />
                TCJA: {sunsetAlert.daysRemaining}d
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {aiJobId && isLoading && (
        <Card style={V2_CARD} className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20" data-testid="ai-analysis-loading">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-medium">Running AI Estate Analysis...</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Processing through Planning Triage → Knowledge Retrieval → Report Writer
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Estimated: 5-15 seconds
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {aiJobId && error && (
        <Card style={V2_CARD} className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" data-testid="ai-analysis-error">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Analysis Failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 text-xs"
              onClick={() => { setAiJobId(null); }}
              data-testid="button-retry-analysis"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {aiJobId && status === "completed" && data && recommendations.length > 0 && (
        <div className="space-y-3" data-testid="ai-analysis-results">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Analysis Results
              <Badge variant="secondary" className="text-[10px]">
                {recommendations.length} finding{recommendations.length !== 1 ? "s" : ""}
              </Badge>
            </h3>
            {data.called_agent && (
              <span className="text-[10px] text-muted-foreground">
                Agent: {data.called_agent}
              </span>
            )}
          </div>

          {recommendations.map((rec, idx) => {
            const agentInfo = AGENT_STYLE_MAP[rec.agent] || AGENT_STYLE_MAP.default;
            const AgentIcon = agentInfo.icon;
            const isExpanded = expandedCards[idx] ?? idx < 3;

            return (
              <Card
                key={idx}
                className={`border ${agentInfo.bgColor} transition-all`}
                data-testid={`ai-recommendation-card-${idx}`}
              >
                <button
                  className="w-full text-left"
                  onClick={() => toggleCard(idx)}
                  data-testid={`button-toggle-card-${idx}`}
                >
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AgentIcon className={`w-3.5 h-3.5 ${agentInfo.color}`} />
                        <span className={`text-[10px] font-semibold ${agentInfo.color}`}>
                          {agentInfo.label}
                        </span>
                        <Badge className={`text-[10px] ${CONFIDENCE_COLORS[rec.confidence]}`}>
                          {rec.confidence}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <CardTitle className="text-sm mt-1">{rec.title}</CardTitle>
                  </CardHeader>
                </button>

                {isExpanded && (
                  <CardContent className="pt-0 pb-3 px-4">
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed mb-3">
                      {rec.content}
                    </div>
                    <div className="flex items-start gap-2 p-2.5 rounded-md bg-background/60 border border-dashed">
                      <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-blue-600 shrink-0" />
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested Action</span>
                        <p className="text-xs mt-0.5">{rec.suggestedAction}</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {data.agent_trace && (
            <Card style={V2_CARD} className="bg-muted/20">
              <CardContent className="pt-3 pb-3 px-4">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Info className="w-3 h-3" />
                  <span>
                    Route: {data.agent_trace.primary_agent}
                    {data.agent_trace.secondary_agents?.length > 0 && ` → ${data.agent_trace.secondary_agents.join(" → ")}`}
                  </span>
                  {data.agent_trace.context?.intent && (
                    <>
                      <span className="mx-1">•</span>
                      <span>Intent: {data.agent_trace.context.intent}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!aiJobId && (
        <Card style={V2_CARD} className="bg-muted/20">
          <CardContent className="py-10 text-center">
            <Brain className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Run an AI analysis to get estate planning insights, tax optimization scenarios, and regulatory alerts.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              The analysis uses the client's full estate context including trusts, beneficiaries, and exemption data.
            </p>
          </CardContent>
        </Card>
      )}

      <EstateDocumentAnalyzer clientId={clientId} />
    </div>
  );
}

interface AnalysisFact {
  factIndex: number;
  factType: string;
  factLabel: string;
  factValue: string;
  normalizedValue: string | null;
  confidence: string;
  sourceSnippet: string | null;
  sourceReference: string;
  ambiguityFlag: boolean;
  status: string;
}

interface AnalysisResult {
  analysisId: string;
  documentType: string;
  summary: string;
  confidence: string;
  trustProvisions: Array<{ provisionType: string; description: string; details: string; confidence: string }>;
  beneficiaries: Array<{ name: string; relationship: string; percentage: number | null; conditions: string | null; class: string; confidence: string }>;
  successorTrustees: Array<{ name: string; role: string; order: number; conditions: string | null; confidence: string }>;
  keyConditions: Array<{ conditionType: string; description: string; trigger: string | null; confidence: string }>;
  candidateFacts: AnalysisFact[];
  totalFacts: number;
}

function EstateDocumentAnalyzer({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [factActions, setFactActions] = useState<Record<number, { action: string; factValue?: string; editorNote?: string }>>({});
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [editingFact, setEditingFact] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNote, setEditNote] = useState("");

  const analyzeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/clients/${clientId}/estate-documents/analyze`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      return res.json() as Promise<AnalysisResult>;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      setFactActions({});
      toast({ title: `Document analyzed: ${data.totalFacts} facts extracted` });
    },
    onError: (err: Error) => {
      toast({ title: "Document analysis failed", description: err.message, variant: "destructive" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!analysisResult) throw new Error("No analysis to review");
      const actions = Object.entries(factActions).map(([idx, action]) => ({
        factIndex: parseInt(idx),
        action: action.action,
        factValue: action.factValue,
        editorNote: action.editorNote,
      }));
      const res = await apiRequest("POST", `/api/clients/${clientId}/estate-documents/review`, {
        analysisId: analysisResult.analysisId,
        actions,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Review complete: ${data.approved} approved, ${data.edited} edited, ${data.rejected} rejected` });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "estate-planning"] });
      setShowReviewDialog(false);
      setAnalysisResult(null);
      setFactActions({});
    },
    onError: (err: Error) => {
      toast({ title: "Review submission failed", description: err.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      analyzeMutation.mutate(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const setFactAction = (idx: number, action: string, factValue?: string, editorNote?: string) => {
    setFactActions(prev => ({ ...prev, [idx]: { action, factValue, editorNote } }));
  };

  const startEdit = (idx: number, currentValue: string) => {
    setEditingFact(idx);
    setEditValue(currentValue);
    setEditNote("");
  };

  const confirmEdit = () => {
    if (editingFact !== null) {
      setFactAction(editingFact, "edit", editValue, editNote);
      setEditingFact(null);
      setEditValue("");
      setEditNote("");
    }
  };

  const reviewedCount = Object.keys(factActions).length;
  const totalFacts = analysisResult?.candidateFacts.length || 0;
  const allReviewed = totalFacts > 0 && reviewedCount === totalFacts;

  const CONFIDENCE_BADGE: Record<string, string> = {
    HIGH: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    LOW: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  const FACT_TYPE_ICONS: Record<string, typeof Users> = {
    estate_beneficiary: Users,
    estate_trustee: Shield,
    estate_provision: FileText,
    estate_condition: AlertTriangle,
    estate_document_type: BookOpen,
  };

  return (
    <Card style={V2_CARD} className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50/30 to-violet-50/20 dark:from-indigo-950/15 dark:to-violet-950/10" data-testid="estate-document-analyzer">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/40">
            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold" data-testid="text-ester-ai-title">Analyze Document with Ester AI</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload estate documents (trusts, wills) for automated extraction of provisions, beneficiaries, and conditions
            </p>
          </div>
          {analysisResult && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setAnalysisResult(null); setFactActions({}); }}
              data-testid="button-clear-doc-results"
            >
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>

        {!analysisResult && (
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-estate-doc-file"
            />
            <Button
              size="sm"
              className="h-9"
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzeMutation.isPending}
              data-testid="button-upload-estate-doc"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload Estate Document
                </>
              )}
            </Button>
            <span className="text-[10px] text-muted-foreground">
              Upload text files (.txt) — trust agreements, wills, POA, beneficiary designations
            </span>
          </div>
        )}

        {analyzeMutation.isPending && (
          <div className="mt-4 p-3 rounded-md bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span className="text-sm">Ester AI is analyzing the document...</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full animate-pulse" style={{ width: "70%" }} />
            </div>
          </div>
        )}

        {analysisResult && (
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-md bg-background/60 border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Analysis Complete</span>
                  <Badge className={`text-[10px] ${CONFIDENCE_BADGE[analysisResult.confidence] || ""}`}>
                    {analysisResult.confidence}
                  </Badge>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {analysisResult.documentType.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{analysisResult.summary}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/20 text-center">
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300" data-testid="text-doc-beneficiary-count">{analysisResult.beneficiaries.length}</div>
                <div className="text-[10px] text-muted-foreground">Beneficiaries</div>
              </div>
              <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-950/20 text-center">
                <div className="text-lg font-bold text-purple-700 dark:text-purple-300" data-testid="text-doc-trustee-count">{analysisResult.successorTrustees.length}</div>
                <div className="text-[10px] text-muted-foreground">Trustees</div>
              </div>
              <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-center">
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300" data-testid="text-doc-provision-count">{analysisResult.trustProvisions.length}</div>
                <div className="text-[10px] text-muted-foreground">Provisions</div>
              </div>
              <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 text-center">
                <div className="text-lg font-bold text-amber-700 dark:text-amber-300" data-testid="text-doc-condition-count">{analysisResult.keyConditions.length}</div>
                <div className="text-[10px] text-muted-foreground">Conditions</div>
              </div>
            </div>

            {analysisResult.beneficiaries.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" /> Beneficiaries
                </h4>
                <div className="space-y-1">
                  {analysisResult.beneficiaries.map((ben, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30" data-testid={`doc-beneficiary-${idx}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ben.name}</span>
                        <Badge variant="outline" className="text-[10px]">{ben.relationship}</Badge>
                        <Badge variant="outline" className="text-[10px]">{ben.class}</Badge>
                        {ben.percentage !== null && (
                          <span className="text-muted-foreground">{ben.percentage}%</span>
                        )}
                      </div>
                      <Badge className={`text-[10px] ${CONFIDENCE_BADGE[ben.confidence] || ""}`}>{ben.confidence}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.successorTrustees.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-600" /> Trustees
                </h4>
                <div className="space-y-1">
                  {analysisResult.successorTrustees.map((tr, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30" data-testid={`doc-trustee-${idx}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tr.name}</span>
                        <Badge variant="outline" className="text-[10px]">{tr.role.replace(/_/g, " ")}</Badge>
                        <span className="text-muted-foreground">Order: {tr.order}</span>
                      </div>
                      <Badge className={`text-[10px] ${CONFIDENCE_BADGE[tr.confidence] || ""}`}>{tr.confidence}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                {totalFacts} facts extracted — {reviewedCount} reviewed
              </div>
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowReviewDialog(true)}
                data-testid="button-review-estate-facts"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Review & Approve Facts
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-review-dialog-title">Review Extracted Facts</DialogTitle>
            <DialogDescription>
              Review each extracted fact before committing to the client profile. Approve, edit, or reject each item.
            </DialogDescription>
          </DialogHeader>

          {analysisResult && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>{reviewedCount} of {totalFacts} reviewed</span>
                <Progress value={totalFacts > 0 ? (reviewedCount / totalFacts) * 100 : 0} className="w-32 h-1.5" />
              </div>

              {analysisResult.candidateFacts.map((fact, idx) => {
                const action = factActions[idx];
                const FactIcon = FACT_TYPE_ICONS[fact.factType] || FileText;
                const isEditing = editingFact === idx;

                return (
                  <Card
                    key={idx}
                    className={`transition-all ${
                      action?.action === "approve" ? "border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-950/10" :
                      action?.action === "edit" ? "border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10" :
                      action?.action === "reject" ? "border-red-300 dark:border-red-700 bg-red-50/30 dark:bg-red-950/10 opacity-60" :
                      ""
                    }`}
                    data-testid={`review-fact-card-${idx}`}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <FactIcon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium">{fact.factLabel}</span>
                              <Badge className={`text-[10px] ${CONFIDENCE_BADGE[fact.confidence] || ""}`}>
                                {fact.confidence}
                              </Badge>
                              {fact.ambiguityFlag && (
                                <Badge variant="outline" className="text-[10px] text-amber-600">Ambiguous</Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                              {action?.action === "edit" && action.factValue ? action.factValue : fact.factValue}
                            </p>
                            {action?.editorNote && (
                              <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 italic">Note: {action.editorNote}</p>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="flex flex-col gap-1.5 min-w-[200px]">
                            <Textarea
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="text-xs h-16 resize-none"
                              data-testid={`input-edit-fact-${idx}`}
                            />
                            <Input
                              value={editNote}
                              onChange={e => setEditNote(e.target.value)}
                              placeholder="Optional note"
                              className="text-xs h-7"
                              data-testid={`input-edit-note-${idx}`}
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-[10px] flex-1" onClick={confirmEdit} data-testid={`button-confirm-edit-${idx}`}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingFact(null)} data-testid={`button-cancel-edit-${idx}`}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant={action?.action === "approve" ? "default" : "outline"}
                              className="h-6 w-6 p-0"
                              onClick={() => setFactAction(idx, "approve")}
                              title="Approve"
                              data-testid={`button-approve-fact-${idx}`}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant={action?.action === "edit" ? "default" : "outline"}
                              className="h-6 w-6 p-0"
                              onClick={() => startEdit(idx, fact.factValue)}
                              title="Edit"
                              data-testid={`button-edit-fact-${idx}`}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant={action?.action === "reject" ? "destructive" : "outline"}
                              className="h-6 w-6 p-0"
                              onClick={() => setFactAction(idx, "reject")}
                              title="Reject"
                              data-testid={`button-reject-fact-${idx}`}
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-xs text-muted-foreground">
                  {Object.values(factActions).filter(a => a.action === "approve").length} approved,{" "}
                  {Object.values(factActions).filter(a => a.action === "edit").length} edited,{" "}
                  {Object.values(factActions).filter(a => a.action === "reject").length} rejected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReviewDialog(false)}
                    data-testid="button-cancel-review"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => reviewMutation.mutate()}
                    disabled={!allReviewed || reviewMutation.isPending}
                    data-testid="button-commit-facts"
                  >
                    {reviewMutation.isPending ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                        Committing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Commit {Object.values(factActions).filter(a => a.action !== "reject").length} Facts
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CreateGiftDialog({ open, onClose, onSubmit, isPending }: any) {
  const [form, setForm] = useState({
    recipientName: "",
    recipientRelationship: "",
    giftDate: new Date().toISOString().split("T")[0],
    giftValue: "",
    giftType: "cash",
    annualExclusionApplied: "18000",
    taxableAmount: "0",
    gstApplicable: false,
    notes: "",
  });

  const handleSubmit = () => {
    if (!form.recipientName || !form.giftValue) return;
    const giftVal = parseFloat(form.giftValue) || 0;
    const exclusion = Math.min(parseFloat(form.annualExclusionApplied) || 18000, giftVal);
    const taxable = Math.max(0, giftVal - exclusion);
    onSubmit({
      ...form,
      annualExclusionApplied: String(exclusion),
      taxableAmount: String(taxable),
    });
    setForm({
      recipientName: "", recipientRelationship: "",
      giftDate: new Date().toISOString().split("T")[0],
      giftValue: "", giftType: "cash",
      annualExclusionApplied: "18000", taxableAmount: "0",
      gstApplicable: false, notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Gift</DialogTitle>
          <DialogDescription>Track a gift for estate and gift tax planning</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="gift-recipient">Recipient Name</Label>
              <Input
                id="gift-recipient"
                value={form.recipientName}
                onChange={(e) => setForm((p) => ({ ...p, recipientName: e.target.value }))}
                placeholder="Name"
                data-testid="input-gift-recipient"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gift-relationship">Relationship</Label>
              <Input
                id="gift-relationship"
                value={form.recipientRelationship}
                onChange={(e) => setForm((p) => ({ ...p, recipientRelationship: e.target.value }))}
                placeholder="e.g., child, grandchild"
                data-testid="input-gift-relationship"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="gift-date">Gift Date</Label>
              <Input
                id="gift-date"
                type="date"
                value={form.giftDate}
                onChange={(e) => setForm((p) => ({ ...p, giftDate: e.target.value }))}
                data-testid="input-gift-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gift-value">Gift Value ($)</Label>
              <Input
                id="gift-value"
                value={form.giftValue}
                onChange={(e) => setForm((p) => ({ ...p, giftValue: e.target.value }))}
                placeholder="e.g., 50000"
                data-testid="input-gift-value"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="gift-type">Gift Type</Label>
              <Select value={form.giftType} onValueChange={(v) => setForm((p) => ({ ...p, giftType: v }))}>
                <SelectTrigger id="gift-type" data-testid="select-gift-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="securities">Securities</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="trust_transfer">Trust Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                GST Applicable
                <input
                  id="gift-gst"
                  type="checkbox"
                  checked={form.gstApplicable}
                  onChange={(e) => setForm((p) => ({ ...p, gstApplicable: e.target.checked }))}
                  className="rounded"
                  data-testid="checkbox-gift-gst"
                />
              </Label>
              <p className="text-[10px] text-muted-foreground">Check if gift skips a generation</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gift-notes">Notes</Label>
            <Input
              id="gift-notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional notes"
              data-testid="input-gift-notes"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-gift">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.recipientName || !form.giftValue || isPending}
            data-testid="button-submit-gift"
          >
            {isPending ? "Recording..." : "Record Gift"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ESTATE_DOC_TYPES = [
  {
    key: "will",
    label: "Will / Last Testament",
    docName: "Will / Last Testament",
    icon: FileText,
    description: "Current signed will or testament",
    reviewIntervalYears: 3,
  },
  {
    key: "trust",
    label: "Revocable Trust",
    docName: "Trust Documents",
    icon: Building2,
    description: "Revocable or irrevocable trust agreements",
    reviewIntervalYears: 5,
  },
  {
    key: "poa",
    label: "Power of Attorney",
    docName: "Power of Attorney",
    icon: Scale,
    description: "Financial and healthcare power of attorney documents",
    reviewIntervalYears: 3,
  },
  {
    key: "healthcare",
    label: "Healthcare Directive",
    docName: "Healthcare Directive",
    icon: Shield,
    description: "Living will or advance healthcare directive",
    reviewIntervalYears: 3,
  },
  {
    key: "beneficiary",
    label: "Beneficiary Designations",
    docName: "Beneficiary Designations",
    icon: Users,
    description: "Current beneficiary forms for all accounts and policies",
    reviewIntervalYears: 2,
  },
];

function EstateDocumentChecklist({ clientId }: { clientId: string }) {
  const { toast } = useToast();

  const { data: clientData, isLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId],
  });

  const initChecklistMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/init-checklist`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      toast({ title: "Checklist initialized" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, received, receivedDate, notes }: { id: string; received: boolean; receivedDate?: string | null; notes?: string | null }) => {
      const res = await apiRequest("PATCH", `/api/document-checklist/${id}`, { received, receivedDate, notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const checklistItems: any[] = clientData?.documentChecklist || [];
  const estateItems = checklistItems.filter((item: any) =>
    (item.category || "").toLowerCase() === "estate planning"
  );

  const getDocStatus = (docType: typeof ESTATE_DOC_TYPES[0]) => {
    const match = estateItems.find((item: any) =>
      (item.documentName || "").toLowerCase().includes(docType.docName.toLowerCase().split(" ")[0].toLowerCase())
    );

    if (!match) return { found: false, item: null, status: "missing" as const, warning: null };

    const isReceived = match.received;
    let warning: string | null = null;

    if (isReceived && match.receivedDate) {
      const reviewDate = new Date(match.receivedDate);
      const expiryDate = new Date(reviewDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + docType.reviewIntervalYears);
      const now = new Date();

      if (now > expiryDate) {
        warning = `Review overdue — last reviewed ${match.receivedDate}`;
      } else {
        const threeMonthsBeforeExpiry = new Date(expiryDate);
        threeMonthsBeforeExpiry.setMonth(threeMonthsBeforeExpiry.getMonth() - 3);
        if (now > threeMonthsBeforeExpiry) {
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          warning = `Review due in ${daysUntilExpiry} days`;
        }
      }
    }

    return {
      found: true,
      item: match,
      status: isReceived ? ("received" as const) : ("pending" as const),
      warning,
    };
  };

  const docStatuses = ESTATE_DOC_TYPES.map((docType) => ({
    ...docType,
    ...getDocStatus(docType),
  }));

  const receivedCount = docStatuses.filter((d) => d.status === "received").length;
  const missingCount = docStatuses.filter((d) => d.status === "missing" || d.status === "pending").length;
  const warningCount = docStatuses.filter((d) => d.warning).length;
  const completionPct = Math.round((receivedCount / ESTATE_DOC_TYPES.length) * 100);

  return (
    <div className="space-y-6" data-testid="estate-document-checklist">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold" data-testid="text-doc-checklist-title">Estate Document Checklist</h3>
          <p className="text-sm text-muted-foreground">
            Track critical estate planning documents
          </p>
        </div>
        {estateItems.length === 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => initChecklistMutation.mutate()}
            disabled={initChecklistMutation.isPending}
            data-testid="button-init-checklist"
          >
            <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
            Initialize Checklist
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card style={V2_CARD}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Completion</span>
            </div>
            <div className="text-xl font-bold" data-testid="text-doc-completion">{completionPct}%</div>
            <Progress value={completionPct} className="h-1.5 mt-1" />
          </CardContent>
        </Card>

        <Card style={V2_CARD}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">On File</span>
            </div>
            <div className="text-xl font-bold text-green-600" data-testid="text-doc-received">{receivedCount}</div>
          </CardContent>
        </Card>

        <Card style={V2_CARD}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Missing</span>
            </div>
            <div className="text-xl font-bold text-red-600" data-testid="text-doc-missing">{missingCount}</div>
          </CardContent>
        </Card>

        <Card style={V2_CARD}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Review Needed</span>
            </div>
            <div className="text-xl font-bold text-amber-600" data-testid="text-doc-warnings">{warningCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card style={V2_CARD}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Document Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {docStatuses.map((doc) => {
            const IconComponent = doc.icon;
            return (
              <div
                key={doc.key}
                className={`p-4 rounded-lg border ${
                  doc.status === "received" && !doc.warning
                    ? "border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20"
                    : doc.warning
                    ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
                    : "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
                }`}
                data-testid={`doc-status-${doc.key}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      doc.status === "received" && !doc.warning
                        ? "bg-green-100 dark:bg-green-900/40"
                        : doc.warning
                        ? "bg-amber-100 dark:bg-amber-900/40"
                        : "bg-red-100 dark:bg-red-900/40"
                    }`}>
                      <IconComponent className={`w-4 h-4 ${
                        doc.status === "received" && !doc.warning
                          ? "text-green-600"
                          : doc.warning
                          ? "text-amber-600"
                          : "text-red-600"
                      }`} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{doc.label}</div>
                      <div className="text-xs text-muted-foreground">{doc.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.status === "received" ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        data-testid={`badge-doc-${doc.key}`}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        On File
                      </Badge>
                    ) : doc.status === "pending" ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                        data-testid={`badge-doc-${doc.key}`}
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        data-testid={`badge-doc-${doc.key}`}
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Missing
                      </Badge>
                    )}

                    {doc.item && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          if (doc.item) {
                            updateItemMutation.mutate({
                              id: doc.item.id,
                              received: !doc.item.received,
                              receivedDate: !doc.item.received ? new Date().toISOString().split("T")[0] : null,
                            });
                          }
                        }}
                        disabled={updateItemMutation.isPending}
                        data-testid={`button-toggle-doc-${doc.key}`}
                      >
                        {doc.item.received ? "Mark Missing" : "Mark Received"}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        toast({
                          title: "Update Requested",
                          description: `A request has been sent for an updated ${doc.label}.`,
                        });
                      }}
                      data-testid={`button-request-update-${doc.key}`}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Request Update
                    </Button>
                  </div>
                </div>

                {doc.item?.receivedDate && (
                  <div className="mt-2 ml-11 text-xs text-muted-foreground">
                    Last reviewed: {doc.item.receivedDate}
                    <span className="mx-2">·</span>
                    Review every {doc.reviewIntervalYears} year{doc.reviewIntervalYears !== 1 ? "s" : ""}
                  </div>
                )}

                {doc.warning && (
                  <div className="mt-2 ml-11 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    {doc.warning}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
