import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWidgetConfig, type WidgetDef } from "@/hooks/use-widget-config";
import { WidgetCustomizePanel } from "@/components/widget-customize-panel";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  Heart,
  ChevronRight,
  Plus,
  Zap,
  Info,
  Building,
  Briefcase,
  Target,
  RefreshCw,
  CheckCircle,
  Clock,
  Home,
  Landmark,
  DollarSign,
} from "lucide-react";
import NextLink from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Treemap, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { SourcePill, formatCurrency, eventIcon } from "./shared";
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE, V2_LABEL, V2_ROW } from "@/styles/v2-tokens";

interface OverviewSectionProps {
  client: any;
  accounts: any[];
  householdMembers: any[];
  lifeEvents: any[];
  perfData: any[];
  onAccountSelect: (id: string) => void;
  custodianBreakdown?: { name: string; count: number; value: number }[];
  accountTypeDistribution?: { name: string; count: number; value: number }[];
  managedVsHeldAway?: { managed: { count: number; value: number }; heldAway: { count: number; value: number } };
  upcomingEvents?: any[];
  staleOpportunities?: any[];
  sfFinancialGoals?: any[];
  sfTopHoldings?: any[];
  revenues?: any[];
  assetsAndLiabilities?: any[];
}

const EVENT_TYPES = [
  "marriage", "divorce", "birth", "death", "retirement",
  "job_change", "inheritance", "home_purchase", "relocation", "health_event", "other",
];

/* ── Account Treemap helpers ─────────────────────────────────────────── */

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  Joint: "hsl(215, 70%, 55%)",
  IRA: "hsl(175, 60%, 45%)",
  "Traditional IRA": "hsl(175, 60%, 45%)",
  "Rollover IRA": "hsl(175, 55%, 50%)",
  Roth: "hsl(152, 69%, 40%)",
  "Roth IRA": "hsl(152, 69%, 40%)",
  Annuity: "hsl(42, 80%, 55%)",
  "Variable Annuity": "hsl(42, 80%, 55%)",
  "Fixed Annuity": "hsl(42, 70%, 50%)",
  Individual: "hsl(210, 83%, 49%)",
  Trust: "hsl(265, 55%, 58%)",
  "401k": "hsl(200, 65%, 40%)",
  "403b": "hsl(200, 55%, 45%)",
  SEP: "hsl(24, 100%, 55%)",
  SIMPLE: "hsl(24, 85%, 50%)",
};
const DEFAULT_ACCOUNT_COLOR = "hsl(220, 10%, 55%)";

function getAccountColor(accountType: string): string {
  if (!accountType) return DEFAULT_ACCOUNT_COLOR;
  // Try exact match first, then partial
  if (ACCOUNT_TYPE_COLORS[accountType]) return ACCOUNT_TYPE_COLORS[accountType];
  const lower = accountType.toLowerCase();
  for (const [key, color] of Object.entries(ACCOUNT_TYPE_COLORS)) {
    if (lower.includes(key.toLowerCase())) return color;
  }
  return DEFAULT_ACCOUNT_COLOR;
}

function AccountTreemapCell(props: any) {
  const { x, y, width, height, name, accountType, balance } = props;
  if (!width || !height || width < 20 || height < 16) return null;
  const fill = getAccountColor(accountType || "");
  const uid = `grad-${Math.round(x)}-${Math.round(y)}`;
  // Smaller cells get a subtler label treatment
  const isSmall = width < 90 || height < 50;
  const maxChars = Math.max(8, Math.floor(width / 7.5));
  const truncName = name && name.length > maxChars ? name.slice(0, maxChars - 1) + "…" : name;
  return (
    <g style={{ cursor: "pointer" }}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.25} />
          <stop offset="100%" stopColor={fill} stopOpacity={0.12} />
        </linearGradient>
      </defs>
      {/* Cell background — translucent gradient instead of solid fill */}
      <rect
        x={x + 1} y={y + 1} width={width - 2} height={height - 2}
        fill={`url(#${uid})`} rx={6}
        stroke={fill} strokeOpacity={0.35} strokeWidth={1}
      />
      {/* Left accent bar */}
      <rect x={x + 1} y={y + 1} width={3} height={height - 2} rx={1.5} fill={fill} fillOpacity={0.6} />
      {/* Name */}
      {width > 50 && height > 28 && (
        <text x={x + 12} y={y + (isSmall ? height / 2 - 2 : 20)}
          textAnchor="start" dominantBaseline={isSmall ? "central" : "auto"}
          fill="var(--color-text-primary, #E2E6EF)" fontSize={isSmall ? 10 : 11.5} fontWeight={500}
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          {truncName}
        </text>
      )}
      {/* Balance */}
      {width > 50 && height > 42 && balance != null && (
        <text x={x + 12} y={y + (isSmall ? height / 2 + 12 : 36)}
          textAnchor="start" dominantBaseline="auto"
          fill={fill} fillOpacity={0.9} fontSize={isSmall ? 10 : 12} fontWeight={600}
          style={{ fontFamily: "var(--font-data)" }}>
          {formatCurrency(balance)}
        </text>
      )}
    </g>
  );
}

export function OverviewSection({ client, accounts, householdMembers, lifeEvents, perfData, onAccountSelect, custodianBreakdown, accountTypeDistribution, managedVsHeldAway, upcomingEvents = [], staleOpportunities = [], sfFinancialGoals = [], sfTopHoldings = [], revenues = [], assetsAndLiabilities = [] }: OverviewSectionProps) {
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventType, setEventType] = useState("other");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [eventDescription, setEventDescription] = useState("");
  const [triggerCategoryId, setTriggerCategoryId] = useState<string>("");
  const [viewActionsEventId, setViewActionsEventId] = useState<string | null>(null);
  const { toast } = useToast();

  /* ── Account view mode (Map | List) ── */
  const lsKey = `chartPref:${client?.id}:accounts`;
  const [accountView, setAccountView] = useState<"map" | "list">(() => {
    if (typeof window === "undefined") return "map";
    return (localStorage.getItem(lsKey) as "map" | "list") || "map";
  });
  useEffect(() => {
    if (client?.id) localStorage.setItem(lsKey, accountView);
  }, [accountView, lsKey, client?.id]);

  const sortedAccounts = useMemo(
    () => accounts
      .filter((acc: any) => parseFloat(acc.balance) > 0)
      .sort((a: any, b: any) => parseFloat(b.balance) - parseFloat(a.balance)),
    [accounts],
  );

  const treemapData = useMemo(
    () => sortedAccounts.map((acc: any) => ({
      name: acc.name || acc.accountType || "Account",
      size: parseFloat(acc.balance) || 0,
      balance: parseFloat(acc.balance) || 0,
      accountType: acc.accountType || "",
      accId: acc.id,
    })),
    [sortedAccounts],
  );

  const treemapConfig = useMemo<ChartConfig>(() => {
    const cfg: ChartConfig = {};
    sortedAccounts.forEach((acc: any, i: number) => {
      cfg[`acc-${i}`] = {
        label: acc.name || acc.accountType || "Account",
        color: getAccountColor(acc.accountType || ""),
      };
    });
    return cfg;
  }, [sortedAccounts]);

  /* ── Widget Customization ── */
  const OVERVIEW_WIDGETS: WidgetDef[] = useMemo(() => [
    { id: "netWorth", label: "Net Worth Summary", description: "Balance sheet with AUM breakdown" },
    { id: "contactInfo", label: "Contact Info", description: "Name, email, phone, address" },
    { id: "clientProfile", label: "Client Profile", description: "Risk, review schedule, service model" },
    { id: "notes", label: "Notes & Interests", description: "Advisor notes and client interests" },
    { id: "accounts", label: "Accounts", description: "Treemap and list of investment accounts" },
    { id: "household", label: "Household Members", description: "Family and related contacts" },
    { id: "events", label: "Upcoming Events", description: "Calendar events from Salesforce" },
    { id: "staleOpps", label: "Stale Opportunities", description: "Aging pipeline items" },
    { id: "revenue", label: "Revenue Records", description: "Fee and revenue tracking" },
    { id: "goals", label: "Financial Goals", description: "Goal progress tracking" },
    { id: "lifeEvents", label: "Life Events", description: "Timeline of key milestones" },
  ], []);
  const widgetConfig = useWidgetConfig("client-overview", OVERVIEW_WIDGETS);
  const [showWidgetPanel, setShowWidgetPanel] = useState(false);

  const { data: triggerCategories } = useQuery<any[]>({
    queryKey: ["/api/triggers/categories"],
  });

  const { data: triggerActions } = useQuery<any[]>({
    queryKey: ["/api/triggers/actions", viewActionsEventId],
    enabled: !!viewActionsEventId,
  });

  const createLifeEvent = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/life-events", payload);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client.id] });
      setShowAddEvent(false);
      setEventDescription("");
      setEventType("other");
      setTriggerCategoryId("");
      const actionCount = data.downstreamActions?.length || 0;
      toast({
        title: "Life event recorded",
        description: actionCount > 0
          ? `${actionCount} trigger action(s) were generated.`
          : "No trigger actions matched this event.",
      });
    },
    onError: () => {
      toast({ title: "Failed to create life event", variant: "destructive" });
    },
  });
  return (
    <div className="space-y-6">
      {/* ── Widget Customize Button ── */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <WidgetCustomizePanel
          title="Overview Widgets"
          widgetConfig={widgetConfig}
          open={showWidgetPanel}
          onOpenChange={setShowWidgetPanel}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
        <div className="md:col-span-1 lg:col-span-2 space-y-4 md:space-y-5 lg:space-y-6">
          {/* Net Worth Summary — enhanced with Orion balance sheet */}
          {widgetConfig.isVisible("netWorth") && (client.totalAum > 0 || client.totalNetWorth > 0) && (
            <BalanceSheetCard client={client} />
          )}
          {/* ── Card 1: Contact ── */}
          {widgetConfig.isVisible("contactInfo") && (
          <Card style={V2_CARD}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2" style={V2_TITLE}>Contact <SourcePill source="salesforce" /></CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-base">
                {client.email && (
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate" data-testid="text-client-email">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-3 min-w-0">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    {client.phoneRaw ? (
                      <a href={`tel:${client.phoneRaw}`} className="hover:underline" style={{ color: "#0078A2" }}>
                        {client.phone}
                      </a>
                    ) : (
                      <span>{client.phone}</span>
                    )}
                    {client.phoneType && (
                      <span className="text-xs" style={{ color: "#0078A2" }}>· {client.phoneType}</span>
                    )}
                  </div>
                )}
                {(client.address || (client.city && client.state)) && (
                  <div className="flex items-center gap-3 min-w-0">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{[client.address, client.city, [client.state, client.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {client.dateOfBirth && (
                  <div className="flex items-center gap-3 min-w-0">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>DOB: {new Date(client.dateOfBirth).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}

          {/* ── Card 2: Client Profile ── */}
          {widgetConfig.isVisible("clientProfile") && (
          <Card style={V2_CARD}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2" style={V2_TITLE}>Client Profile <SourcePill source="salesforce" /></CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-base">
                {client.riskTolerance && (
                  <div className="flex items-center gap-3 min-w-0">
                    <Zap className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="capitalize">Risk: {client.riskTolerance}</span>
                    <SourcePill source="salesforce" />
                  </div>
                )}
                {client.reviewFrequency && (
                  <div className="flex items-center gap-2 min-w-0">
                    <RefreshCw className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Review: {client.reviewFrequency}</span>
                  </div>
                )}
                {client.lastReview && (
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Last Review: {new Date(client.lastReview).toLocaleDateString()}</span>
                  </div>
                )}
                {client.nextReview && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Next Review: {new Date(client.nextReview).toLocaleDateString()}</span>
                  </div>
                )}
                {client.serviceModel && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Service: {client.serviceModel}</span>
                  </div>
                )}
                {client.createdDate && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Client Since: {new Date(client.createdDate).toLocaleDateString()}</span>
                  </div>
                )}
                {/* SF-reported annual income (advisor-entered: salary, total household) */}
                {client.sfAnnualIncome > 0 && (
                  <div className="flex items-center gap-2 min-w-0">
                    <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Annual Income: {formatCurrency(client.sfAnnualIncome)}</span>
                    <span className="text-xs" style={{ color: "#0078A2" }}>· SFDC</span>
                  </div>
                )}
                {/* Orion-derived investment income (dividends, interest, distributions) */}
                {client.estimatedAnnualIncome > 0 ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Est. Investment Income: {formatCurrency(client.estimatedAnnualIncome)}</span>
                    <span className="text-xs" style={{ color: "#0078A2" }}>· Orion</span>
                  </div>
                ) : client.estimatedAnnualIncome === 0 ? null : !client.sfAnnualIncome ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground italic text-xs">Income data unavailable</span>
                  </div>
                ) : null}
                {client.nonFinancialAssets > 0 && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Home className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>Non-Financial: ${(client.nonFinancialAssets / 1e6).toFixed(1)}M</span>
                  </div>
                )}
                {client.entityType === "business" && (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">Business Entity</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}

          {/* ── Card 3: Notes & Interests ── */}
          {widgetConfig.isVisible("notes") && (client.interests || client.description || client.notes) && (
            <Card style={V2_CARD}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={V2_TITLE}>Notes & Interests</CardTitle>
              </CardHeader>
              <CardContent>
                {client.interests && (
                  <div className="flex items-start gap-2 min-w-0 text-sm mb-3">
                    <Heart className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{client.interests}</span>
                  </div>
                )}
                {client.description && (
                  <div className="p-3 rounded-md text-sm mb-3" style={V2_ROW}>
                    <span className="text-xs font-medium text-[#C7D0DD] block mb-1">Description</span>
                    {client.description}
                  </div>
                )}
                {client.notes && (
                  <div className="p-3 rounded-md text-sm" style={V2_ROW}>
                    <span className="text-xs font-medium text-[#C7D0DD] block mb-1">Advisor Notes</span>
                    {client.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {widgetConfig.isVisible("accounts") && sortedAccounts.length > 0 && (
            <Card style={V2_CARD}>
              <CardHeader className="pb-3">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <CardTitle className="flex items-center gap-2" style={V2_TITLE}>Accounts <SourcePill source="orion" /></CardTitle>
                  <div style={{ display: "flex", gap: 0, background: "var(--color-surface-overlay, rgba(255,255,255,0.06))", borderRadius: 6, overflow: "hidden" }}>
                    {(["map", "list"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setAccountView(mode)}
                        style={{
                          padding: "4px 10px",
                          fontSize: 9,
                          fontWeight: 600,
                          fontFamily: "var(--font-data)",
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                          color: accountView === mode ? "var(--color-text-primary, #fff)" : "var(--color-text-tertiary, #888)",
                          background: accountView === mode ? "var(--color-surface-raised, rgba(255,255,255,0.1))" : "transparent",
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {mode === "map" ? "Map" : "List"}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {accountView === "map" ? (
                  <ChartContainer config={treemapConfig} className="h-[260px] w-full">
                    <Treemap
                      data={treemapData}
                      dataKey="size"
                      aspectRatio={4 / 3}
                      stroke="none"
                      content={<AccountTreemapCell />}
                      onClick={(node: any) => {
                        if (node?.accId) onAccountSelect(node.accId);
                      }}
                    >
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(val) => formatCurrency(Number(val))}
                          />
                        }
                      />
                    </Treemap>
                  </ChartContainer>
                ) : (
                  <div className="space-y-1">
                    {/* Table header — visible on lg+ */}
                    <div className="hidden md:grid md:grid-cols-[1fr_120px_120px] lg:grid-cols-[1fr_160px_140px_120px_40px] gap-4 px-5 py-2 text-xs uppercase tracking-wide text-muted-foreground/50 border-b border-muted-foreground/10">
                      <span>Account</span>
                      <span className="hidden lg:block">Custodian</span>
                      <span className="text-right">Value</span>
                      <span className="text-right">Type</span>
                      <span className="hidden lg:block"></span>
                    </div>
                    {sortedAccounts.map((acc: any) => {
                      const displayName = acc.name || acc.accountType || "Account";
                      const subParts = [acc.managementStyle, acc.accountNumber ? `#${acc.accountNumber}` : ""].filter(Boolean);
                      const regType = acc.registrationType || (acc.taxStatus !== "taxable" ? acc.taxStatus : "");
                      return (
                        <div
                          key={acc.id}
                          className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px] lg:grid-cols-[1fr_160px_140px_120px_40px] items-center gap-2 md:gap-3 lg:gap-4 px-5 py-3 md:py-3.5 lg:py-4 cursor-pointer transition-colors border-b border-muted-foreground/5 hover:bg-muted/5"
                          style={V2_ROW}
                          onClick={() => onAccountSelect(acc.id)}
                          data-testid={`account-${acc.id}`}
                        >
                          <div>
                            <div className="text-base font-medium">{displayName}</div>
                            {subParts.length > 0 && (
                              <div className="text-sm text-muted-foreground mt-0.5">
                                {subParts.join(" · ")}
                              </div>
                            )}
                          </div>
                          <span className="hidden lg:block text-sm text-muted-foreground">{acc.custodian || "—"}</span>
                          <div className="text-right">
                            <div className="text-base font-semibold">{formatCurrency(parseFloat(acc.balance))}</div>
                          </div>
                          <div className="text-right">
                            {regType && <Badge variant="outline" className="text-xs">{regType}</Badge>}
                          </div>
                          <ChevronRight className="hidden lg:block h-4 w-4 text-muted-foreground ml-auto" />
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Account type color legend (Map view only) */}
                {accountView === "map" && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {Array.from(new Set(sortedAccounts.map((a: any) => a.accountType || "Other"))).map((type: string) => (
                      <span key={type} className="flex items-center gap-1.5" style={{ fontSize: 9, fontFamily: "var(--font-data)", color: "var(--color-text-secondary, #aaa)" }}>
                        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getAccountColor(type) }} />
                        {type}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Custodian / Account Type / Managed vs Held-Away breakdown */}
          {((custodianBreakdown && custodianBreakdown.length > 0) || (accountTypeDistribution && accountTypeDistribution.length > 0) || (managedVsHeldAway && (managedVsHeldAway.managed.value > 0 || managedVsHeldAway.heldAway.value > 0))) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {custodianBreakdown && custodianBreakdown.length > 0 && (
                <Card style={V2_CARD}>
                  <CardHeader className="pb-3">
                    <CardTitle style={V2_LABEL}>By Custodian</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-5 pb-5">
                    <div className="space-y-3">
                      {custodianBreakdown.map((c) => (
                        <div key={c.name} className="flex items-center justify-between">
                          <span className="text-sm truncate">{c.name}</span>
                          <span className="text-sm font-semibold">{formatCurrency(c.value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {accountTypeDistribution && accountTypeDistribution.length > 0 && (
                <Card style={V2_CARD}>
                  <CardHeader className="pb-3">
                    <CardTitle style={V2_LABEL}>By Account Type</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-5 pb-5">
                    <div className="space-y-3">
                      {accountTypeDistribution.map((t) => (
                        <div key={t.name} className="flex items-center justify-between">
                          <span className="text-sm truncate">{t.name} <span className="text-muted-foreground">({t.count})</span></span>
                          <span className="text-sm font-semibold">{formatCurrency(t.value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {managedVsHeldAway && (managedVsHeldAway.managed.value > 0 || managedVsHeldAway.heldAway.value > 0) && (
                <Card style={V2_CARD}>
                  <CardHeader className="pb-3">
                    <CardTitle style={V2_LABEL}>Managed vs Held-Away</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-5 pb-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Managed <span className="text-muted-foreground">({managedVsHeldAway.managed.count})</span></span>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatCurrency(managedVsHeldAway.managed.value)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Held-Away <span className="text-muted-foreground">({managedVsHeldAway.heldAway.count})</span></span>
                        <span className="text-sm font-semibold">{formatCurrency(managedVsHeldAway.heldAway.value)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {perfData.length > 0 ? (
            <Card style={V2_CARD}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={V2_TITLE}>Performance vs Benchmark <SourcePill source="orion" /></CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    portfolio: { label: "Portfolio", color: "hsl(var(--chart-1))" },
                    benchmark: { label: "Benchmark", color: "hsl(var(--muted))" },
                  } satisfies ChartConfig}
                  className="h-[240px] sm:h-[320px] lg:h-[400px] w-full"
                >
                  <BarChart data={perfData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value) => `${(value as number).toFixed(2)}%`} />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="portfolio" fill="var(--color-portfolio)" name="Portfolio" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="benchmark" fill="var(--color-benchmark)" name="Benchmark" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ) : (
            <Card style={V2_CARD}>
              <CardContent className="py-6">
                <div className="flex items-center gap-3 text-sm" style={{ color: P.odT3 }}>
                  <Info className="w-4 h-4 shrink-0" />
                  <span>No performance data available for this client</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {widgetConfig.isVisible("household") && householdMembers.length > 0 && (
            <Card style={V2_CARD}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={V2_TITLE}>
                  <Users className="w-4 h-4" /> Household <SourcePill source="salesforce" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {householdMembers.map((m: any) => (
                    <NextLink href={`/clients/${m.clientId || m.client?.id || m.id}`} key={m.id}>
                      <div className="flex items-start gap-4 p-3 rounded-md hover-elevate cursor-pointer" style={V2_ROW}>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {(m.firstName || m.client?.firstName)?.[0]}{(m.lastName || m.client?.lastName)?.[0]}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-medium truncate">{m.firstName || m.client?.firstName} {m.lastName || m.client?.lastName}</div>
                          <div className="text-sm text-muted-foreground">{m.relationship === "household_member" ? "Member" : m.relationship}</div>
                          {(m.email || m.birthdate || m.city) && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {m.phone && (
                                <div>
                                  {m.phoneRaw ? (
                                    <a href={`tel:${m.phoneRaw}`} className="hover:underline" style={{ color: "#0078A2" }}>{m.phone}</a>
                                  ) : m.phone}
                                  {m.phoneType && <span style={{ color: "#0078A2" }}> · {m.phoneType}</span>}
                                </div>
                              )}
                              {m.email && <div>{m.email}</div>}
                              {m.birthdate && <div>DOB: {new Date(m.birthdate).toLocaleDateString()}</div>}
                              {(m.city || m.state) && <div>{[m.city, m.state].filter(Boolean).join(", ")}</div>}
                              {m.occupation && <div>{m.occupation}</div>}
                              {m.employer && <div>at {m.employer}</div>}
                              {m.maritalStatus && <div>{m.maritalStatus}</div>}
                              {m.interests && <div>Interests: {m.interests}</div>}
                              {m.annualIncome != null && m.annualIncome > 0 && <div>Income: ${m.annualIncome.toLocaleString()}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    </NextLink>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {widgetConfig.isVisible("events") && upcomingEvents.length > 0 && (
            <Card style={V2_CARD}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={V2_TITLE}>
                  <Calendar className="w-4 h-4" /> Upcoming Events <SourcePill source="salesforce" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 5).map((evt: any) => (
                    <div key={evt.id} className="flex items-start gap-3 p-2 rounded-md" style={V2_ROW}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{evt.subject}</div>
                        <div className="text-xs text-muted-foreground">
                          {evt.isAllDayEvent ? "All Day" : evt.startDateTime ? new Date(evt.startDateTime).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
                          {!evt.isAllDayEvent && evt.endDateTime ? ` – ${new Date(evt.endDateTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : ""}
                          {evt.location ? ` · ${evt.location}` : ""}
                        </div>
                        {evt.whoName && <div className="text-xs text-muted-foreground">with {evt.whoName}</div>}
                        {evt.whatName && !evt.whoName && <div className="text-xs text-muted-foreground">{evt.whatName}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {evt.type && <Badge variant="outline" className="text-[10px]">{evt.type}</Badge>}
                        {evt.isAllDayEvent && <Badge variant="secondary" className="text-[10px]">All Day</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {widgetConfig.isVisible("staleOpps") && staleOpportunities.length > 0 && (
            <OpportunityPipelineCard
              staleOpportunities={staleOpportunities}
              clientId={client?.id}
            />
          )}

          {sfTopHoldings.length > 0 && (
            <Card style={V2_CARD}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={V2_TITLE}>
                  SF Top Holdings <SourcePill source="salesforce" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sfTopHoldings.map((h: any, i: number) => (
                    <div key={h.id || i} className="flex items-center justify-between p-2 rounded-md" style={V2_ROW}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{h.name || h.Name || "Holding"}</div>
                        <div className="text-xs text-muted-foreground">
                          {[h.ticker, h.shares ? `${Number(h.shares).toLocaleString()} shares` : ""].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <span className="text-sm font-medium shrink-0">{formatCurrency(h.marketValue || h.Amount || h.value || 0)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {widgetConfig.isVisible("revenue") && revenues.length > 0 && (
            <Card style={V2_CARD}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={V2_TITLE}>
                  Revenue Records <SourcePill source="salesforce" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {revenues.map((r: any, i: number) => (
                    <div key={r.id || i} className="flex items-center justify-between p-2 rounded-md" style={V2_ROW}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.name || r.Name || "Revenue"}</div>
                        <div className="text-xs text-muted-foreground">
                          {[r.type, r.date ? new Date(r.date).toLocaleDateString() : ""].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <span className="text-sm font-medium shrink-0">{formatCurrency(r.amount || r.Amount || r.value || 0)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {assetsAndLiabilities.length > 0 && (
            <Card style={V2_CARD}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={V2_TITLE}>
                  Assets & Liabilities <SourcePill source="salesforce" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assetsAndLiabilities.map((a: any, i: number) => (
                    <div key={a.id || a.Id || i} className="flex items-center justify-between p-2 rounded-md" style={V2_ROW}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{a.name || a.Name || "Record"}</div>
                        {(a.type || a.FinServ__AssetsAndLiabilitiesType__c || a.Type) && (
                          <div className="text-xs text-muted-foreground">{a.type || a.FinServ__AssetsAndLiabilitiesType__c || a.Type}</div>
                        )}
                      </div>
                      <span className="text-sm font-medium shrink-0">{formatCurrency(a.amount || a.FinServ__Amount__c || a.Amount || a.value || 0)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {widgetConfig.isVisible("goals") && sfFinancialGoals.length > 0 && (
            <Card style={V2_CARD}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2" style={V2_TITLE}>
                  <Target className="w-4 h-4" /> Financial Goals <SourcePill source="salesforce" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sfFinancialGoals.map((g: any, i: number) => (
                    <div key={g.id || i} className="flex items-center justify-between p-2 rounded-md" style={V2_ROW}>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{g.name || "Goal"}</div>
                        <div className="text-xs text-muted-foreground">
                          {[g.type, g.status, g.targetDate ? `Target: ${new Date(g.targetDate).toLocaleDateString()}` : ""].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        {g.targetAmount > 0 && <div className="text-sm font-medium">{formatCurrency(g.targetAmount)}</div>}
                        {(g.currentAmount || g.actualAmount) > 0 && <div className="text-xs text-muted-foreground">Actual: {formatCurrency(g.currentAmount || g.actualAmount)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * BalanceSheetCard — Enhanced Net Worth with Orion balance sheet breakdown.
 * Shows SF net worth + Orion category breakdown when available.
 * ────────────────────────────────────────────────────────────────────────── */

function BalanceSheetCard({ client }: { client: any }) {
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [bsSource, setBsSource] = useState<string>("loading");

  useEffect(() => {
    if (!client.id) return;
    fetch(`/api/clients/${client.id}/balance-sheet`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        setBalanceSheet(json.balanceSheet);
        setBsSource(json.source || "unavailable");
      })
      .catch(() => setBsSource("error"));
  }, [client.id]);

  const netWorth = balanceSheet?.netWorth || client.totalNetWorth || client.totalAum || 0;

  return (
    <Card style={V2_CARD} data-testid="balance-sheet-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2" style={V2_TITLE}>
          <Landmark className="w-4 h-4" /> Net Worth Summary
          <SourcePill source="salesforce" />
          <SourcePill source="orion" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold tracking-tight">
            {formatCurrency(netWorth)}
          </span>
          <span className="text-xs text-muted-foreground">Total Net Worth</span>
        </div>

        {/* SF-level breakdown */}
        {(client.nonFinancialAssets > 0) && (
          <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Portfolio: {formatCurrency(client.totalAum || 0)}
            </span>
            <span className="flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" />
              Non-Financial: {formatCurrency(client.nonFinancialAssets)}
            </span>
          </div>
        )}

        {/* Orion balance sheet category breakdown */}
        {balanceSheet && (balanceSheet.assets?.length > 0 || balanceSheet.liabilities?.length > 0) && (
          <div className="mt-4 pt-3 border-t space-y-3">
            {balanceSheet.assets?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                  <span>Assets by Category</span>
                  <span className="font-medium text-green-400">{formatCurrency(balanceSheet.totalAssets)}</span>
                </div>
                <div className="space-y-1">
                  {balanceSheet.assets.map((a: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{a.category}</span>
                      <span className="font-mono">{formatCurrency(a.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {balanceSheet.liabilities?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                  <span>Liabilities</span>
                  <span className="font-medium text-red-400">({formatCurrency(balanceSheet.totalLiabilities)})</span>
                </div>
                <div className="space-y-1">
                  {balanceSheet.liabilities.map((l: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{l.category}</span>
                      <span className="font-mono text-red-400">({formatCurrency(l.value)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * OpportunityPipelineCard — Chart + List view of stale opportunities.
 * Shows horizontal bars colored by urgency (days since last activity).
 * ────────────────────────────────────────────────────────────────────────── */

function urgencyColor(daysSinceActivity: number): string {
  if (daysSinceActivity >= 60) return "hsl(0, 72%, 51%)";   // red — critical
  if (daysSinceActivity >= 30) return "hsl(41, 100%, 49%)";  // amber — warning
  return "hsl(152, 69%, 40%)";                                // green — recent
}

function urgencyLabel(daysSinceActivity: number): string {
  if (daysSinceActivity >= 60) return `${daysSinceActivity}d — Critical`;
  if (daysSinceActivity >= 30) return `${daysSinceActivity}d — Aging`;
  return `${daysSinceActivity}d — Recent`;
}

function OpportunityPipelineCard({ staleOpportunities, clientId }: { staleOpportunities: any[]; clientId?: string }) {
  const lsKey = `chartPref:${clientId}:opps`;
  const [oppView, setOppView] = useState<"chart" | "list">(() => {
    if (typeof window === "undefined") return "chart";
    return (localStorage.getItem(lsKey) as "chart" | "list") || "chart";
  });
  useEffect(() => {
    if (clientId) localStorage.setItem(lsKey, oppView);
  }, [oppView, lsKey, clientId]);

  const chartData = useMemo(() => {
    const now = Date.now();
    return staleOpportunities
      .filter((opp: any) => opp.amount > 0)
      .map((opp: any) => {
        const lastAct = opp.lastActivityDate ? new Date(opp.lastActivityDate).getTime() : 0;
        const daysSince = lastAct > 0 ? Math.floor((now - lastAct) / 86_400_000) : 999;
        return {
          name: opp.name?.length > 22 ? opp.name.slice(0, 22) + "…" : opp.name || "Opp",
          fullName: opp.name,
          amount: opp.amount,
          daysSince,
          stage: opp.stageName || "Unknown",
          fill: urgencyColor(daysSince),
        };
      })
      .sort((a: any, b: any) => b.amount - a.amount)
      .slice(0, 8);
  }, [staleOpportunities]);

  const chartConfig = useMemo<ChartConfig>(() => ({
    amount: { label: "Amount", color: "hsl(41, 100%, 49%)" },
  }), []);

  return (
    <Card style={V2_CARD}>
      <CardHeader className="pb-3">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <CardTitle className="flex items-center gap-2" style={V2_TITLE}>
            <Zap className="w-4 h-4" /> Pipeline <SourcePill source="salesforce" />
          </CardTitle>
          <div style={{ display: "flex", gap: 0, background: "var(--color-surface-overlay, rgba(255,255,255,0.06))", borderRadius: 6, overflow: "hidden" }}>
            {(["chart", "list"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setOppView(mode)}
                style={{
                  padding: "4px 10px", fontSize: 9, fontWeight: 600,
                  fontFamily: "var(--font-data)", textTransform: "uppercase",
                  letterSpacing: ".04em",
                  color: oppView === mode ? "var(--color-text-primary, #fff)" : "var(--color-text-tertiary, #888)",
                  background: oppView === mode ? "var(--color-surface-raised, rgba(255,255,255,0.1))" : "transparent",
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {mode === "chart" ? "Chart" : "List"}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {oppView === "chart" && chartData.length > 0 ? (
          <>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                <XAxis type="number" tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 9, fill: "var(--color-text-tertiary, #888)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: "var(--color-text-secondary, #aaa)" }} axisLine={false} tickLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(val, _name, item) => {
                        const d = item?.payload;
                        return `${formatCurrency(Number(val))} · ${d?.stage || ""} · ${urgencyLabel(d?.daysSince ?? 0)}`;
                      }}
                    />
                  }
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {chartData.map((d: any, i: number) => (
                    <Cell key={`opp-${i}`} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            {/* Urgency legend */}
            <div className="mt-2 flex items-center gap-4">
              {[
                { label: "< 30d", color: "hsl(152, 69%, 40%)" },
                { label: "30-60d", color: "hsl(41, 100%, 49%)" },
                { label: "60d+", color: "hsl(0, 72%, 51%)" },
              ].map(({ label, color }) => (
                <span key={label} className="flex items-center gap-1.5" style={{ fontSize: 9, fontFamily: "var(--font-data)", color: "var(--color-text-secondary, #aaa)" }}>
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {staleOpportunities.map((opp: any) => (
              <div key={opp.id} className="flex items-center justify-between p-2 rounded-md" style={V2_ROW}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{opp.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {opp.stageName}{opp.probability != null ? ` (${opp.probability}%)` : ""}{opp.accountName && opp.accountName !== opp.name ? ` · ${opp.accountName}` : ""}{opp.closeDate ? ` · Close ${new Date(opp.closeDate).toLocaleDateString()}` : ""}{opp.lastActivityDate ? ` · Last activity ${new Date(opp.lastActivityDate).toLocaleDateString()}` : ""}
                  </div>
                </div>
                {opp.amount > 0 && <span className="text-sm font-medium shrink-0">{formatCurrency(opp.amount)}</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
