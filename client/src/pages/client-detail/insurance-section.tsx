import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { NavTabs } from "@/components/design/nav-tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { P, EASE } from "@/styles/tokens";
import { TS, Lbl, Supporting } from "@/components/design/typography";
import {
  Shield,
  Home,
  Car,
  Loader2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Upload,
  FileText,
  X,
  File,
  Umbrella,
  Gem,
  Building,
  Copy,
  Check,
  Calculator,
  Flag,
  ClipboardList,
  Eye,
  Users,
  Info,
} from "lucide-react";

interface ClientData {
  occupation?: string;
  state?: string;
  [key: string]: unknown;
}

interface InsuranceSectionProps {
  clientId: string;
  clientName: string;
  totalAum: number;
  client: ClientData;
}

interface DocumentInventoryItem {
  documentType: string | null;
  carrier: string | null;
  policyNumber: string | null;
  policyPeriod: string | null;
  namedInsureds: string | null;
  coverageDomain: string | null;
  completeness: string | null;
}

interface RiskFlag {
  name: string | null;
  domain: string | null;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | null;
  calculatedGap: string | null;
  calculatedGapDollars: number | null;
  clientContext: string | null;
  evidence: string | null;
  consequence: string | null;
  referralAction: string | null;
}

interface Recommendation {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | null;
  finding: string | null;
  context: string | null;
  recommendedAction: string | null;
  referralLanguage: string | null;
  expectedImpact: string | null;
  urgency: string | null;
}

interface DomainScore {
  score: number | null;
  rationale: string | null;
}

interface ReferralBriefPriority {
  issue: string | null;
  currentValue: string | null;
  recommendedValue: string | null;
  whyNow: string | null;
}

interface Assumption {
  item: string | null;
  valueUsed: string | null;
  source: string | null;
  impactIfWrong: string | null;
}

interface CalculationResult {
  narrative: string | null;
  status?: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

interface VehicleCoverageData {
  yearMakeModel: string;
  [key: string]: string;
}

interface ScheduledItemData {
  category: string;
  scheduled: boolean;
  limit: string;
  lastAppraisal: string;
  premium: string;
}

interface CoverageDomainData {
  vehicles?: VehicleCoverageData[];
  scheduledItems?: ScheduledItemData[];
  [key: string]: string | string[] | boolean | number | VehicleCoverageData[] | ScheduledItemData[] | undefined;
}

interface CarrierQualityEntry {
  carrierName: string;
  amBestRating: string;
  amBestOutlook: string;
  admittedStatus: string;
  standardStatus: string;
  guarantyFundCoverage: string;
  claimsIssues: string;
  oneDigitalStandard: string;
  flagLevel: string;
}

type ViewMode = "results" | "advisor" | "client";
const VIEW_MODES: readonly ViewMode[] = ["results", "advisor", "client"] as const;
function isViewMode(id: string): id is ViewMode {
  return (VIEW_MODES as readonly string[]).includes(id);
}

type DomainKey = "homeowners" | "auto" | "umbrella" | "valuableArticles" | "carrierQuality";

function isCoverageDomainData(val: unknown): val is CoverageDomainData {
  return val !== null && typeof val === "object" && !Array.isArray(val);
}

function isCarrierQualityArray(val: unknown): val is CarrierQualityEntry[] {
  return Array.isArray(val) && val.every(
    (item) => typeof item === "object" && item !== null && "carrierName" in item
  );
}

interface DiagnosticResult {
  documentInventory: DocumentInventoryItem[] | null;
  clientRiskSnapshot: {
    namedInsureds: string | null;
    properties: string[] | null;
    vehicles: string[] | null;
    carriers: string[] | null;
    estimatedNetWorth: number | null;
    domainsCovered: string[] | null;
    domainsMissing: string[] | null;
    protectionReadiness: "ADEQUATE" | "NEEDS_ATTENTION" | "AT_RISK" | null;
    immediateAdvisorFocus: string[] | null;
  } | null;
  dataQualityGates: {
    documentSufficiency: Array<{ gate: string | null; passed: boolean | null }> | null;
    analysisSafety: Array<{ gate: string | null; passed: boolean | null }> | null;
    missingContextFlags: Array<{ item: string | null; impact: string | null }> | null;
  } | null;
  coverageDomains: {
    homeowners: CoverageDomainData | null;
    auto: CoverageDomainData | null;
    umbrella: CoverageDomainData | null;
    valuableArticles: CoverageDomainData | null;
    carrierQuality: CarrierQualityEntry[] | null;
  } | null;
  calculationEngine: {
    umbrellaAdequacy: CalculationResult | null;
    dwellingReplacementCost: CalculationResult | null;
    autoLiabilityAdequacy: CalculationResult | null;
    deductibleOptimization: CalculationResult | null;
    valuableArticlesAdequacy: CalculationResult | null;
  } | null;
  domainScores: {
    homeowners: DomainScore | null;
    auto: DomainScore | null;
    umbrella: DomainScore | null;
    valuableArticles: DomainScore | null;
    carrierQuality: DomainScore | null;
    weightedOverall: number | null;
  } | null;
  riskFlags: RiskFlag[] | null;
  recommendations: Recommendation[] | null;
  referralBrief: {
    priorities: ReferralBriefPriority[] | null;
    quoteRequests: string[] | null;
    advisorNotes: string | null;
  } | null;
  advisorReport: string | null;
  clientSummary: string | null;
  assumptions: Assumption[] | null;
  questionsToAskClient: string[] | null;
}

const ACCEPTED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv";

const WORKFLOW_STEPS = [
  "Document Intake & Classification",
  "Client Risk Snapshot",
  "Data Quality Gates",
  "Coverage Domain Extraction",
  "Carrier Quality Assessment",
  "Calculation Engine",
  "Domain Scoring",
  "Risk Flag Assignment",
  "Recommendations & Referral",
  "Advisor Report",
  "Client Summary",
];

const FONT = "'DM Sans', sans-serif";

const priorityColor = (p: string) => {
  if (p === "CRITICAL" || p === "HIGH") return P.red;
  if (p === "MEDIUM") return P.amb;
  return P.grn;
};
const priorityBg = (p: string) => {
  if (p === "CRITICAL" || p === "HIGH") return P.rL;
  if (p === "MEDIUM") return P.aL;
  return P.gL;
};

const readinessColor = (r: string) => r === "ADEQUATE" ? P.grn : r === "NEEDS_ATTENTION" ? P.amb : P.red;
const readinessLabel = (r: string) => r === "ADEQUATE" ? "Adequate" : r === "NEEDS_ATTENTION" ? "Needs Attention" : "At Risk";

const scoreColor = (s: number) => s >= 7 ? P.grn : s >= 4 ? P.amb : P.red;
const scoreBg = (s: number) => s >= 7 ? P.gL : s >= 4 ? P.aL : P.rL;
const scoreLabel = (s: number) => s >= 7 ? "Good" : s >= 4 ? "Needs Work" : "At Risk";

function fileIcon(name: string) {
  if (name.endsWith(".pdf")) return <FileText size={16} color={P.red} />;
  if (/\.(png|jpg|jpeg|webp)$/i.test(name)) return <File size={16} color={P.blue} />;
  return <File size={16} color={P.mid} />;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const domainIcons: Record<string, typeof Shield> = {
  homeowners: Home,
  auto: Car,
  umbrella: Umbrella,
  valuableArticles: Gem,
  carrierQuality: Building,
};

const domainLabels: Record<string, string> = {
  homeowners: "Homeowners / Dwelling",
  auto: "Auto",
  umbrella: "Umbrella / Excess Liability",
  valuableArticles: "Valuable Articles",
  carrierQuality: "Carrier Quality",
};

function ScoreGauge({ score, size = 80 }: { score: number; size?: number }) {
  const pct = Math.min(Math.max(score / 10, 0), 1);
  const radius = (size - 8) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - pct);
  const color = scoreColor(score);

  return (
    <div style={{ position: "relative", width: size, height: size / 2 + 10 }}>
      <svg width={size} height={size / 2 + 4} viewBox={`0 0 ${size} ${size / 2 + 4}`}>
        <path
          d={`M 4 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2}`}
          fill="none"
          stroke={P.odBorder}
          strokeWidth={6}
          strokeLinecap="round"
        />
        <path
          d={`M 4 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: `stroke-dashoffset 1s ${EASE}` }}
        />
      </svg>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center",
        fontFamily: FONT, fontWeight: 700, fontSize: size * 0.25, color,
      }}>
        {score.toFixed(1)}
      </div>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children, testId }: {
  title: string; icon?: typeof Shield; defaultOpen?: boolean; children: React.ReactNode; testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: P.odSurf, border: `1px solid ${P.odBorder}`, borderRadius: 8, marginBottom: 12, overflow: "hidden" }} data-testid={testId}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
        data-testid={testId ? `button-toggle-${testId}` : undefined}
      >
        {Icon && <Icon size={16} color={P.blue} />}
        <span style={{ flex: 1, fontSize: TS.supporting, fontWeight: 600, color: P.dark, fontFamily: FONT }}>
          {title}
        </span>
        {open ? <ChevronUp size={14} color={P.lt} /> : <ChevronDown size={14} color={P.lt} />}
      </button>
      {open && <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${P.odBorder}` }}>{children}</div>}
    </div>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, background: "none",
        border: `1px solid ${P.odBorder}`, borderRadius: 4, padding: "4px 10px",
        fontSize: TS.label, color: copied ? P.grn : P.mid, cursor: "pointer", fontFamily: FONT,
      }}
      data-testid="button-copy-brief"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function WorkflowStepper({ currentStep }: { currentStep: number }) {
  return (
    <div style={{ marginBottom: 24, padding: 20, background: P.odSurf, borderRadius: 10, border: `1px solid ${P.odBorder}` }} data-testid="workflow-stepper">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Loader2 size={18} color={P.blue} className="animate-spin" />
        <span style={{ fontSize: TS.body, fontWeight: 600, color: P.dark, fontFamily: FONT }}>
          Running P&C Shield Diagnostic...
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {WORKFLOW_STEPS.map((step, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: isDone ? P.grn : isActive ? P.blue : P.odBorder,
                transition: `all .3s ${EASE}`,
              }}>
                {isDone ? <Check size={12} color="white" /> :
                  isActive ? <Loader2 size={12} color="white" className="animate-spin" /> :
                    <span style={{ fontSize: 11, color: P.lt, fontWeight: 600, fontFamily: FONT }}>{i + 1}</span>
                }
              </div>
              <span style={{
                fontSize: TS.label, fontWeight: isDone || isActive ? 600 : 400,
                color: isDone ? P.grn : isActive ? P.blue : P.lt, fontFamily: FONT,
              }}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ClientContextData {
  totalAum?: number;
  netWorth?: number;
  netWorthSource?: string;
  homeValue?: number;
  homeSquareFootage?: number;
  rebuildYear?: number;
  numberOfVehicles?: number;
  vehicleDetails?: string;
  occupation?: string;
  state?: string;
  valuableArticlesEstimate?: number;
  hasUmbrella?: boolean;
  dependents?: number;
  additionalNotes?: string;
  [key: string]: string | number | boolean | undefined;
}

function ClientContextPanel({ clientContext, onChange }: {
  clientContext: ClientContextData;
  onChange: (ctx: ClientContextData) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const updateField = (field: string, value: string | number | boolean | undefined) => {
    onChange({ ...clientContext, [field]: value });
  };

  const fieldStyle = { fontSize: TS.supporting, fontFamily: FONT, padding: "6px 10px", borderRadius: 6, border: `1px solid ${P.odBorder}`, background: "white", width: "100%" } as const;
  const labelStyle = { fontSize: TS.label, fontWeight: 600, color: P.mid, fontFamily: FONT, textTransform: "uppercase" as const, letterSpacing: ".04em", display: "block", marginBottom: 4 };

  return (
    <div style={{ background: P.bFr, border: `1px solid ${P.blue}22`, borderRadius: 8, marginBottom: 16, overflow: "hidden" }} data-testid="panel-client-context">
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
        data-testid="button-toggle-context"
      >
        <Info size={14} color={P.blue} />
        <span style={{ flex: 1, fontSize: TS.supporting, fontWeight: 600, color: P.bDk, fontFamily: FONT }}>
          Client Context (optional — improves analysis accuracy)
        </span>
        {expanded ? <ChevronUp size={14} color={P.lt} /> : <ChevronDown size={14} color={P.lt} />}
      </button>
      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${P.blue}15` }}>
          <p style={{ fontSize: TS.label, color: P.lt, margin: "10px 0", fontFamily: FONT }}>
            Provide supplemental data not in the documents. Pre-populated from client records where available.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={labelStyle}>Net Worth ($)</span>
              <Input
                type="number"
                placeholder="e.g. 3200000"
                value={clientContext.netWorth || ""}
                onChange={e => updateField("netWorth", e.target.value ? Number(e.target.value) : undefined)}
                style={fieldStyle}
                data-testid="input-net-worth"
              />
            </div>
            <div>
              <span style={labelStyle}>Net Worth Source</span>
              <Input
                type="text"
                placeholder="e.g. Financial plan, client estimate"
                value={clientContext.netWorthSource || ""}
                onChange={e => updateField("netWorthSource", e.target.value || undefined)}
                style={fieldStyle}
                data-testid="input-net-worth-source"
              />
            </div>
            <div>
              <span style={labelStyle}>Home Value ($)</span>
              <Input
                type="number"
                placeholder="e.g. 850000"
                value={clientContext.homeValue || ""}
                onChange={e => updateField("homeValue", e.target.value ? Number(e.target.value) : undefined)}
                style={fieldStyle}
                data-testid="input-home-value"
              />
            </div>
            <div>
              <span style={labelStyle}>Home Sq Footage</span>
              <Input
                type="number"
                placeholder="e.g. 3500"
                value={clientContext.homeSquareFootage || ""}
                onChange={e => updateField("homeSquareFootage", e.target.value ? Number(e.target.value) : undefined)}
                style={fieldStyle}
                data-testid="input-sq-footage"
              />
            </div>
            <div>
              <span style={labelStyle}>Rebuild Year</span>
              <Input
                type="number"
                placeholder="e.g. 2020"
                value={clientContext.rebuildYear || ""}
                onChange={e => updateField("rebuildYear", e.target.value ? Number(e.target.value) : undefined)}
                style={fieldStyle}
                data-testid="input-rebuild-year"
              />
            </div>
            <div>
              <span style={labelStyle}>Number of Vehicles</span>
              <Input
                type="number"
                placeholder="e.g. 3"
                value={clientContext.numberOfVehicles || ""}
                onChange={e => updateField("numberOfVehicles", e.target.value ? Number(e.target.value) : undefined)}
                style={fieldStyle}
                data-testid="input-vehicles"
              />
            </div>
            <div>
              <span style={labelStyle}>Occupation</span>
              <Input
                type="text"
                placeholder="e.g. Attorney"
                value={clientContext.occupation || ""}
                onChange={e => updateField("occupation", e.target.value || undefined)}
                style={fieldStyle}
                data-testid="input-occupation"
              />
            </div>
            <div>
              <span style={labelStyle}>State</span>
              <Input
                type="text"
                placeholder="e.g. CA"
                value={clientContext.state || ""}
                onChange={e => updateField("state", e.target.value || undefined)}
                style={fieldStyle}
                data-testid="input-state"
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={labelStyle}>Vehicle Details</span>
              <Input
                type="text"
                placeholder="e.g. 2024 BMW X5, 2023 Tesla Model Y"
                value={clientContext.vehicleDetails || ""}
                onChange={e => updateField("vehicleDetails", e.target.value || undefined)}
                style={fieldStyle}
                data-testid="input-vehicle-details"
              />
            </div>
            <div>
              <span style={labelStyle}>Valuable Articles Estimate ($)</span>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={clientContext.valuableArticlesEstimate || ""}
                onChange={e => updateField("valuableArticlesEstimate", e.target.value ? Number(e.target.value) : undefined)}
                style={fieldStyle}
                data-testid="input-valuables"
              />
            </div>
            <div>
              <span style={labelStyle}>Dependents</span>
              <Input
                type="number"
                placeholder="e.g. 2"
                value={clientContext.dependents || ""}
                onChange={e => updateField("dependents", e.target.value ? Number(e.target.value) : undefined)}
                style={fieldStyle}
                data-testid="input-dependents"
              />
            </div>
            <div>
              <span style={labelStyle}>Has Umbrella Policy</span>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: TS.supporting, fontFamily: FONT, color: P.dark, cursor: "pointer", padding: "6px 0" }}>
                <input
                  type="checkbox"
                  checked={clientContext.hasUmbrella === true}
                  onChange={e => updateField("hasUmbrella", e.target.checked ? true : undefined)}
                  data-testid="input-has-umbrella"
                  style={{ width: 16, height: 16 }}
                />
                Yes, client has an umbrella policy
              </label>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={labelStyle}>Additional Notes</span>
              <Textarea
                placeholder="Any other context: pools, trampolines, rental properties, home-based business, etc."
                value={clientContext.additionalNotes || ""}
                onChange={e => updateField("additionalNotes", e.target.value || undefined)}
                rows={2}
                style={{ ...fieldStyle, resize: "vertical" as const }}
                data-testid="input-additional-notes"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type CalcEngineKey = "umbrellaAdequacy" | "dwellingReplacementCost" | "autoLiabilityAdequacy" | "deductibleOptimization" | "valuableArticlesAdequacy";
const domainToCalcKey: Record<DomainKey, CalcEngineKey | null> = {
  homeowners: "dwellingReplacementCost",
  auto: "autoLiabilityAdequacy",
  umbrella: "umbrellaAdequacy",
  valuableArticles: "valuableArticlesAdequacy",
  carrierQuality: null,
};

function DomainScoreCard({ domainKey, score, analysis, expanded, onToggle }: {
  domainKey: DomainKey; score: DomainScore; analysis: DiagnosticResult; expanded: boolean; onToggle: () => void;
}) {
  const Icon = domainIcons[domainKey] || Shield;
  const label = domainLabels[domainKey] || domainKey;
  const rawScore = score?.score;
  const hasScore = rawScore != null;
  const safeScore = rawScore ?? 0;
  const color = hasScore ? scoreColor(safeScore) : P.lt;
  const bg = hasScore ? scoreBg(safeScore) : P.odSurf;
  const domainRaw = analysis.coverageDomains?.[domainKey] ?? null;
  const calcKey = domainToCalcKey[domainKey];
  const calc = calcKey && analysis.calculationEngine ? analysis.calculationEngine[calcKey] : null;

  return (
    <div style={{ background: "white", border: `1px solid ${P.odBorder}`, borderRadius: 8, overflow: "hidden" }} data-testid={`card-domain-${domainKey}`}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
          background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
        data-testid={`button-toggle-domain-${domainKey}`}
      >
        <div style={{
          width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: bg,
        }}>
          <Icon size={18} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: TS.supporting, fontWeight: 600, color: P.dark, fontFamily: FONT }}>{label}</div>
          <div style={{ fontSize: TS.label, color: P.lt, fontFamily: FONT, marginTop: 2 }}>{(score?.rationale ?? "Not available").slice(0, 100)}{(score?.rationale ?? "").length > 100 ? "..." : ""}</div>
        </div>
        <div style={{ textAlign: "center", marginRight: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: FONT }}>{hasScore ? safeScore : "—"}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: "uppercase", fontFamily: FONT }}>{hasScore ? scoreLabel(safeScore) : "Pending"}</div>
        </div>
        {expanded ? <ChevronUp size={14} color={P.lt} /> : <ChevronDown size={14} color={P.lt} />}
      </button>
      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${P.odBorder}` }}>
          <p style={{ fontSize: TS.supporting, color: P.dark, lineHeight: 1.6, margin: "12px 0", fontFamily: FONT }}>{score?.rationale ?? "Not available"}</p>

          {domainRaw && domainKey !== "carrierQuality" && isCoverageDomainData(domainRaw) && (() => {
            const domain = domainRaw;
            return (
              <div style={{ marginTop: 8 }}>
                <Lbl style={{ display: "block", marginBottom: 6 }}>Extracted Coverage Data</Lbl>
                <div style={{ background: P.odSurf, borderRadius: 6, padding: 12, overflow: "auto" }}>
                  <table style={{ width: "100%", fontSize: TS.label, fontFamily: FONT, borderCollapse: "collapse" }}>
                    <tbody>
                      {Object.entries(domain).filter(([k]) => k !== "vehicles" && k !== "scheduledItems").map(([key, val]) => (
                        <tr key={key} style={{ borderBottom: `1px solid ${P.odBorder}` }}>
                          <td style={{ padding: "4px 8px", color: P.mid, fontWeight: 500, whiteSpace: "nowrap" }}>{key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</td>
                          <td style={{ padding: "4px 8px", color: P.dark, fontWeight: 600 }}>{String(val ?? "N/A")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {domain.vehicles && domain.vehicles.map((v: VehicleCoverageData, vi: number) => (
                    <div key={vi} style={{ marginTop: 8, padding: 8, background: "white", borderRadius: 4, border: `1px solid ${P.odBorder}` }}>
                      <Lbl style={{ display: "block", marginBottom: 4 }}>Vehicle {vi + 1}: {v.yearMakeModel || "Unknown"}</Lbl>
                      <table style={{ width: "100%", fontSize: TS.label, fontFamily: FONT, borderCollapse: "collapse" }}>
                        <tbody>
                          {Object.entries(v).filter(([k]) => k !== "yearMakeModel").map(([key, val]) => (
                            <tr key={key} style={{ borderBottom: `1px solid ${P.odBorder}` }}>
                              <td style={{ padding: "3px 8px", color: P.mid, fontWeight: 500 }}>{key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</td>
                              <td style={{ padding: "3px 8px", color: P.dark, fontWeight: 600 }}>{String(val ?? "N/A")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  {domain.scheduledItems && domain.scheduledItems.map((item: ScheduledItemData, si: number) => (
                    <div key={si} style={{ marginTop: 6, display: "flex", gap: 8, fontSize: TS.label, fontFamily: FONT, padding: "4px 0", borderBottom: `1px solid ${P.odBorder}` }}>
                      <span style={{ color: P.dark, fontWeight: 600 }}>{item.category}</span>
                      <span style={{ color: P.mid }}>{item.scheduled ? "Scheduled" : "Not Scheduled"}</span>
                      <span style={{ color: P.dark }}>{item.limit}</span>
                      <span style={{ color: P.lt }}>Appraisal: {item.lastAppraisal || "Unknown"}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {domainKey === "carrierQuality" && isCarrierQualityArray(domainRaw) && domainRaw.map((c, ci) => (
            <div key={ci} style={{ marginTop: 8, background: P.odSurf, borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: TS.supporting, fontWeight: 600, color: P.dark, fontFamily: FONT, marginBottom: 6 }}>{c.carrierName}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: TS.label, fontFamily: FONT }}>
                <span style={{ color: P.mid }}>AM Best: <strong style={{ color: P.dark }}>{c.amBestRating || "N/A"}</strong></span>
                <span style={{ color: P.mid }}>Outlook: <strong style={{ color: P.dark }}>{c.amBestOutlook || "N/A"}</strong></span>
                <span style={{ color: P.mid }}>Status: <strong style={{ color: P.dark }}>{c.admittedStatus || "N/A"}</strong></span>
                <span style={{ color: P.mid }}>Standard: <strong style={{ color: c.oneDigitalStandard === "Meets" ? P.grn : c.oneDigitalStandard === "Below" ? P.red : P.amb }}>{c.oneDigitalStandard || "N/A"}</strong></span>
              </div>
            </div>
          ))}

          {calc && calc.narrative && (
            <div style={{ marginTop: 12 }}>
              <Lbl style={{ display: "block", marginBottom: 6 }}>Calculation Audit</Lbl>
              <div style={{ background: "#1B1D22", borderRadius: 6, padding: 12, overflow: "auto" }}>
                <pre style={{ fontSize: TS.label, fontFamily: "'DM Mono', monospace", color: "#E2E6EF", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, lineHeight: 1.6 }}>
                  {calc.narrative}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function InsuranceSection({ clientId, clientName, totalAum, client }: InsuranceSectionProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState<DiagnosticResult | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"results" | "advisor" | "client">("results");
  const [stepProgress, setStepProgress] = useState(-1);
  const [clientContext, setClientContext] = useState<ClientContextData>({
    totalAum,
    netWorth: totalAum ? Math.round(totalAum * 1.3) : undefined,
    occupation: client?.occupation || undefined,
    state: client?.state || undefined,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const ACCEPTED_TYPES = new Set([
    "application/pdf",
    "image/png", "image/jpeg", "image/jpg", "image/webp", "image/tiff",
    "text/plain", "text/csv",
  ]);
  const ACCEPTED_EXTENSIONS = /\.(pdf|png|jpe?g|webp|tiff?|txt|csv)$/i;

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles = Array.from(newFiles).filter(f => {
      if (!ACCEPTED_TYPES.has(f.type) && !ACCEPTED_EXTENSIONS.test(f.name)) {
        toast({ title: "Unsupported file type", description: `${f.name} is not a supported document format (PDF, image, or text)`, variant: "destructive" });
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${f.name} exceeds 10 MB limit`, variant: "destructive" });
        return false;
      }
      return true;
    });
    setFiles(prev => [...prev, ...validFiles].slice(0, 5));
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

  const toggleDomain = (key: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0 && !pasteText.trim()) throw new Error("Drop files or paste document text to analyze");

      setStepProgress(0);
      const progressInterval = setInterval(() => {
        setStepProgress(prev => prev < WORKFLOW_STEPS.length - 1 ? prev + 1 : prev);
      }, 2500);

      try {
        let result;
        if (files.length > 0) {
          const formData = new FormData();
          formData.append("clientId", clientId);
          formData.append("lineType", "property");
          formData.append("clientContext", JSON.stringify(clientContext));
          files.forEach(f => formData.append("files", f));

          const res = await fetch("/api/insurance/analyze-upload", {
            method: "POST", body: formData, credentials: "include",
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || `Upload failed (${res.status})`);
          }
          result = await res.json();
        } else {
          const res = await fetch("/api/insurance/analyze-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId, lineType: "property", documentText: pasteText, clientContext }),
            credentials: "include",
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || `Analysis failed (${res.status})`);
          }
          result = await res.json();
        }
        clearInterval(progressInterval);
        setStepProgress(WORKFLOW_STEPS.length);
        return result;
      } catch (err) {
        clearInterval(progressInterval);
        throw err;
      }
    },
    onSuccess: (data: { analysis: DiagnosticResult; filesProcessed?: string[] }) => {
      setAnalysis(data.analysis);
      setProcessedFiles(data.filesProcessed ?? []);
      setExpandedDomains(new Set());
      setStepProgress(-1);
      toast({ title: "Diagnostic Complete", description: "P&C Shield analysis is ready." });
    },
    onError: (err: Error) => {
      setStepProgress(-1);
      toast({ title: "Analysis Failed", description: err.message, variant: "destructive" });
    },
  });

  const hasInput = files.length > 0 || pasteText.trim().length > 0;

  const resetAnalysis = () => {
    setAnalysis(null);
    setFiles([]);
    setPasteText("");
    setProcessedFiles([]);
    setViewMode("results");
  };

  return (
    <div style={{ maxWidth: 920 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Shield size={22} color={P.blue} />
        <span style={{ fontSize: TS.section, fontWeight: 600, color: P.ink, fontFamily: FONT }} data-testid="text-insurance-title">
          P&C Shield Insurance Diagnostic
        </span>
      </div>
      <Supporting as="p" style={{ marginBottom: 20 }} data-testid="text-insurance-subtitle">
        Drop policies, dec pages, or CLUE reports to run a comprehensive 11-step diagnostic — coverage scoring, calculation-backed risk flags, and referral-ready briefs for the P&C team.
      </Supporting>

      {analyzeMutation.isPending && stepProgress >= 0 && (
        <WorkflowStepper currentStep={stepProgress} />
      )}

      {!analysis && !analyzeMutation.isPending && (
        <div style={{ marginTop: 8 }}>
          <ClientContextPanel clientContext={clientContext} onChange={setClientContext} />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? P.blue : files.length > 0 ? P.grn + "88" : P.odBorder}`,
              borderRadius: 10, padding: files.length > 0 ? "20px" : "48px 20px",
              textAlign: "center", cursor: "pointer",
              transition: `all .25s ${EASE}`,
              background: isDragging ? P.bFr : files.length > 0 ? P.gL + "44" : P.odSurf,
            }}
            data-testid="dropzone-files"
          >
            <input
              ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff,.tif,.txt,.csv"
              style={{ display: "none" }}
              onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
              data-testid="input-file-upload"
            />
            {files.length === 0 ? (
              <>
                <Upload size={32} color={isDragging ? P.blue : P.lt} style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: TS.body, fontWeight: 600, color: P.dark, margin: "0 0 4px", fontFamily: FONT }}>
                  Drop policy documents, dec pages, or CLUE reports
                </p>
                <p style={{ fontSize: TS.supporting, color: P.lt, margin: 0, fontFamily: FONT }}>
                  PDF, images, or text files — up to 5 files, 10 MB each
                </p>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {files.map((file, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    background: "white", borderRadius: 6, border: `1px solid ${P.odBorder}`, textAlign: "left",
                  }} onClick={e => e.stopPropagation()} data-testid={`file-item-${i}`}>
                    {fileIcon(file.name)}
                    <span style={{ flex: 1, fontSize: TS.supporting, fontWeight: 500, color: P.dark, fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                    <span style={{ fontSize: TS.label, color: P.lt, fontFamily: FONT, flexShrink: 0 }}>{formatFileSize(file.size)}</span>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: P.lt, flexShrink: 0 }} data-testid={`button-remove-file-${i}`}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {files.length < 5 && (
                  <p style={{ fontSize: TS.label, color: P.lt, margin: "4px 0 0", fontFamily: FONT }}>Click or drop more files (up to {5 - files.length} more)</p>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: P.odBorder }} />
            <button onClick={() => setShowPasteArea(!showPasteArea)} style={{ background: "none", border: "none", fontSize: TS.label, color: P.lt, cursor: "pointer", fontFamily: FONT, textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 600 }} data-testid="button-toggle-paste">
              {showPasteArea ? "Hide" : "Or paste"} document text
            </button>
            <div style={{ flex: 1, height: 1, background: P.odBorder }} />
          </div>

          {showPasteArea && (
            <div style={{ marginTop: 12, background: P.odSurf, border: `1px solid ${P.odBorder}`, borderRadius: 8, padding: 14 }}>
              <Textarea
                placeholder="Paste the full text from a declarations page, policy document, or coverage summary..."
                value={pasteText} onChange={e => setPasteText(e.target.value)} rows={6} data-testid="input-paste-text"
              />
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending || !hasInput}
              style={{
                background: hasInput ? P.odBg : P.odBorder, color: hasInput ? "white" : P.lt,
                borderRadius: 6, fontFamily: FONT, opacity: analyzeMutation.isPending ? 0.7 : 1,
              }}
              data-testid="button-run-analysis"
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Shield size={16} /> Run P&C Shield Diagnostic
              </span>
            </Button>
          </div>
        </div>
      )}

      {analysis && (
        <div className="animate-fu" style={{ marginTop: 16 }}>
          <NavTabs
            tabs={[
              { id: "results", label: "Diagnostic Results" },
              { id: "advisor", label: "Advisor Report" },
              { id: "client", label: "Client Summary" },
            ]}
            active={viewMode}
            onChange={(id) => { if (isViewMode(id)) setViewMode(id); }}
          />

          {viewMode === "results" && (
            <div style={{ marginTop: 20 }}>
              {processedFiles.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                  <Lbl>Analyzed:</Lbl>
                  {processedFiles.map((f, i) => (
                    <span key={i} style={{ fontSize: TS.label, padding: "2px 8px", borderRadius: 4, background: P.bIce, color: P.bDk, fontFamily: FONT }}>{f}</span>
                  ))}
                </div>
              )}

              <CollapsibleSection title="Document Inventory" icon={FileText} testId="section-doc-inventory">
                {!analysis.documentInventory || analysis.documentInventory.length === 0 ? (
                  <p style={{ fontSize: TS.label, color: P.lt, fontFamily: FONT, margin: "10px 0 0", fontStyle: "italic" }}>No documents were classified. The analysis may be limited.</p>
                ) : (
                  <div style={{ overflow: "auto", marginTop: 8 }}>
                    <table style={{ width: "100%", fontSize: TS.label, fontFamily: FONT, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: P.odSurf2 }}>
                          {["Type", "Carrier", "Policy #", "Period", "Domain", "Completeness"].map(h => (
                            <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: P.mid, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.documentInventory.map((doc, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${P.odBorder}` }}>
                            <td style={{ padding: "6px 8px", color: P.dark, fontWeight: 500 }}>{doc.documentType ?? "Not available"}</td>
                            <td style={{ padding: "6px 8px", color: P.dark }}>{doc.carrier ?? "Not available"}</td>
                            <td style={{ padding: "6px 8px", color: P.mid, fontFamily: "'DM Mono', monospace" }}>{doc.policyNumber ?? "N/A"}</td>
                            <td style={{ padding: "6px 8px", color: P.mid }}>{doc.policyPeriod ?? "N/A"}</td>
                            <td style={{ padding: "6px 8px", color: P.bDk }}>{doc.coverageDomain ?? "N/A"}</td>
                            <td style={{ padding: "6px 8px" }}>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 99, background: doc.completeness === "Complete" ? P.gL : doc.completeness === "Partial" ? P.aL : P.rL, color: doc.completeness === "Complete" ? P.grn : doc.completeness === "Partial" ? P.amb : P.red }}>{doc.completeness ?? "Unknown"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CollapsibleSection>

              {analysis.clientRiskSnapshot ? (
              <div style={{
                background: `linear-gradient(135deg, ${P.odBg} 0%, ${P.odSurf2} 100%)`,
                borderRadius: 10, padding: 20, marginBottom: 16, color: "white",
              }} data-testid="card-risk-snapshot">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <Users size={18} color={P.bHi} />
                  <span style={{ fontSize: TS.body, fontWeight: 700, fontFamily: FONT }}>Client Risk Snapshot</span>
                  <div style={{
                    marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                    background: readinessColor(analysis.clientRiskSnapshot.protectionReadiness ?? "AT_RISK") + "33",
                    color: readinessColor(analysis.clientRiskSnapshot.protectionReadiness ?? "AT_RISK"),
                    textTransform: "uppercase", letterSpacing: ".04em", fontFamily: FONT,
                  }} data-testid="badge-readiness">
                    {analysis.clientRiskSnapshot.protectionReadiness ? readinessLabel(analysis.clientRiskSnapshot.protectionReadiness) : "Pending analysis"}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: TS.label, fontFamily: FONT }}>
                  <div><span style={{ color: P.nMid }}>Named Insured(s):</span> <span style={{ color: P.nText, fontWeight: 500 }}>{analysis.clientRiskSnapshot.namedInsureds ?? "Not available"}</span></div>
                  {analysis.clientRiskSnapshot.estimatedNetWorth && (
                    <div><span style={{ color: P.nMid }}>Est. Net Worth:</span> <span style={{ color: P.nText, fontWeight: 500 }}>${analysis.clientRiskSnapshot.estimatedNetWorth.toLocaleString()}</span></div>
                  )}
                  {(analysis.clientRiskSnapshot.properties ?? []).length > 0 && (
                    <div style={{ gridColumn: "1 / -1" }}><span style={{ color: P.nMid }}>Properties:</span> <span style={{ color: P.nText, fontWeight: 500 }}>{analysis.clientRiskSnapshot.properties!.join("; ")}</span></div>
                  )}
                  {(analysis.clientRiskSnapshot.vehicles ?? []).length > 0 && (
                    <div style={{ gridColumn: "1 / -1" }}><span style={{ color: P.nMid }}>Vehicles:</span> <span style={{ color: P.nText, fontWeight: 500 }}>{analysis.clientRiskSnapshot.vehicles!.join("; ")}</span></div>
                  )}
                  {(analysis.clientRiskSnapshot.carriers ?? []).length > 0 && (
                    <div style={{ gridColumn: "1 / -1" }}><span style={{ color: P.nMid }}>Carriers:</span> <span style={{ color: P.nText, fontWeight: 500 }}>{analysis.clientRiskSnapshot.carriers!.join(", ")}</span></div>
                  )}
                </div>
                {(analysis.clientRiskSnapshot.immediateAdvisorFocus ?? []).length > 0 && (
                  <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(255,255,255,0.06)", borderRadius: 6 }}>
                    <div style={{ fontSize: TS.label, fontWeight: 600, color: P.bHi, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".04em", fontFamily: FONT }}>Immediate Focus</div>
                    {analysis.clientRiskSnapshot.immediateAdvisorFocus!.map((f, i) => (
                      <div key={i} style={{ fontSize: TS.label, color: P.nText, lineHeight: 1.6, fontFamily: FONT, paddingLeft: 8 }}>• {f}</div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(analysis.clientRiskSnapshot.domainsCovered ?? []).map((d, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: P.grn + "33", color: P.grn, fontWeight: 600, fontFamily: FONT }}>{d}</span>
                  ))}
                  {(analysis.clientRiskSnapshot.domainsMissing ?? []).map((d, i) => (
                    <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: P.red + "33", color: "#FF9999", fontWeight: 600, fontFamily: FONT }}>Missing: {d}</span>
                  ))}
                </div>
              </div>
              ) : (
              <div style={{ background: P.odSurf, borderRadius: 10, padding: 20, marginBottom: 16, textAlign: "center" }} data-testid="card-risk-snapshot">
                <p style={{ fontSize: TS.supporting, color: P.lt, fontFamily: FONT, fontStyle: "italic" }}>Client risk snapshot not available. The AI may not have returned this section.</p>
              </div>
              )}

              {analysis.domainScores ? (() => {
                const rawOverall = analysis.domainScores.weightedOverall;
                const hasOverall = rawOverall != null;
                const overallScore = rawOverall ?? 0;
                return (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, padding: 20, background: "white", borderRadius: 10, border: `1px solid ${P.odBorder}` }} data-testid="card-overall-score">
                      <ScoreGauge score={overallScore} size={100} />
                      <div>
                        <div style={{ fontSize: TS.body, fontWeight: 700, color: hasOverall ? scoreColor(overallScore) : P.lt, fontFamily: FONT }}>
                          Weighted Overall Score: {hasOverall ? `${overallScore.toFixed(1)} / 10` : "Not available"}
                        </div>
                        <div style={{ fontSize: TS.supporting, color: P.mid, fontFamily: FONT, marginTop: 2 }}>
                          {hasOverall ? `${scoreLabel(overallScore)} — ${overallScore >= 7 ? "Coverage is materially sound" : overallScore >= 4 ? "Multiple gaps requiring attention" : "Material exposures requiring immediate action"}` : "Pending analysis"}
                        </div>
                        <div style={{ fontSize: TS.label, color: P.lt, fontFamily: FONT, marginTop: 6 }}>
                          HO: {analysis.domainScores.homeowners?.score ?? "N/A"} (30%) · Auto: {analysis.domainScores.auto?.score ?? "N/A"} (20%) · Umbrella: {analysis.domainScores.umbrella?.score ?? "N/A"} (30%) · VA: {analysis.domainScores.valuableArticles?.score ?? "N/A"} (10%) · CQ: {analysis.domainScores.carrierQuality?.score ?? "N/A"} (10%)
                        </div>
                      </div>
                    </div>

                    <Lbl style={{ display: "block", marginBottom: 10 }}>Coverage Domain Scores</Lbl>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                      {(["homeowners", "auto", "umbrella", "valuableArticles", "carrierQuality"] as const).map(key => (
                        <DomainScoreCard
                          key={key}
                          domainKey={key}
                          score={analysis.domainScores![key] ?? { score: null, rationale: null }}
                          analysis={analysis}
                          expanded={expandedDomains.has(key)}
                          onToggle={() => toggleDomain(key)}
                        />
                      ))}
                    </div>
                  </>
                );
              })() : (
                <div style={{ background: P.odSurf, borderRadius: 10, padding: 20, marginBottom: 16, textAlign: "center" }} data-testid="card-overall-score">
                  <p style={{ fontSize: TS.supporting, color: P.lt, fontFamily: FONT, fontStyle: "italic" }}>Domain scores not available. The AI may not have returned scoring data.</p>
                </div>
              )}

              <div style={{ marginBottom: 20 }} data-testid="section-risk-flags">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Flag size={16} color={P.red} />
                  <Lbl>Risk Flags</Lbl>
                  {(analysis.riskFlags ?? []).length > 0 && (
                    <span style={{ fontSize: TS.label, color: P.lt, fontFamily: FONT }}>({analysis.riskFlags!.length})</span>
                  )}
                </div>
                {!analysis.riskFlags || analysis.riskFlags.length === 0 ? (
                  <p style={{ fontSize: TS.label, color: P.lt, fontFamily: FONT, fontStyle: "italic", margin: 0 }}>No risk flags identified based on available data.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {analysis.riskFlags.map((flag, i) => (
                      <div key={i} style={{
                        background: priorityBg(flag.priority ?? "MEDIUM"), border: `1px solid ${priorityColor(flag.priority ?? "MEDIUM")}22`,
                        borderRadius: 8, padding: 14,
                      }} data-testid={`card-risk-flag-${i}`}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                            background: priorityColor(flag.priority ?? "MEDIUM") + "22", color: priorityColor(flag.priority ?? "MEDIUM"),
                            textTransform: "uppercase", fontFamily: FONT,
                          }}>{flag.priority ?? "N/A"}</span>
                          <span style={{ fontSize: TS.supporting, fontWeight: 600, color: P.dark, fontFamily: FONT }}>{flag.name ?? "Unknown Risk"}</span>
                          <span style={{ fontSize: TS.label, color: P.lt, fontFamily: FONT, marginLeft: "auto" }}>{flag.domain ?? ""}</span>
                        </div>
                        <div style={{ fontSize: TS.label, color: P.dark, lineHeight: 1.6, fontFamily: FONT }}>
                          {flag.calculatedGap && <div><strong style={{ color: P.mid }}>Gap:</strong> {flag.calculatedGap}</div>}
                          {flag.evidence && <div style={{ marginTop: 2 }}><strong style={{ color: P.mid }}>Evidence:</strong> <span style={{ fontStyle: "italic" }}>"{flag.evidence}"</span></div>}
                          {flag.consequence && <div style={{ marginTop: 2 }}><strong style={{ color: P.mid }}>If unaddressed:</strong> {flag.consequence}</div>}
                          {flag.referralAction && <div style={{ marginTop: 2 }}><strong style={{ color: P.mid }}>P&C action:</strong> {flag.referralAction}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <CollapsibleSection title="Recommendations" icon={ClipboardList} defaultOpen testId="section-recommendations">
                {!analysis.recommendations || analysis.recommendations.length === 0 ? (
                  <p style={{ fontSize: TS.label, color: P.lt, fontFamily: FONT, margin: "10px 0 0", fontStyle: "italic" }}>No specific recommendations generated. Additional documents may be needed.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                    {analysis.recommendations.map((rec, i) => (
                      <div key={i} style={{ background: "white", border: `1px solid ${P.odBorder}`, borderRadius: 6, padding: 12 }} data-testid={`card-recommendation-${i}`}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                            background: priorityBg(rec.priority ?? "MEDIUM"), color: priorityColor(rec.priority ?? "MEDIUM"),
                            textTransform: "uppercase", fontFamily: FONT,
                          }}>{rec.priority ?? "N/A"}</span>
                          <span style={{ fontSize: TS.label, color: P.lt, fontFamily: FONT }}>{rec.urgency ?? ""}</span>
                        </div>
                        <div style={{ fontSize: TS.supporting, fontWeight: 600, color: P.dark, fontFamily: FONT, marginBottom: 4 }}>{rec.finding ?? "Not available"}</div>
                        <div style={{ fontSize: TS.label, color: P.mid, lineHeight: 1.5, fontFamily: FONT }}>
                          <div>{rec.context ?? ""}</div>
                          <div style={{ marginTop: 4 }}><strong>Action:</strong> {rec.recommendedAction ?? "Not available"}</div>
                          <div style={{ marginTop: 4 }}><strong>Expected impact:</strong> {rec.expectedImpact ?? "Not available"}</div>
                          {rec.referralLanguage && (
                            <div style={{ marginTop: 6, padding: "6px 10px", background: P.bFr, borderRadius: 4, borderLeft: `3px solid ${P.blue}` }}>
                              <span style={{ fontWeight: 600, color: P.bDk }}>Referral language:</span> {rec.referralLanguage}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              {analysis.referralBrief && ((analysis.referralBrief.priorities ?? []).length > 0 || (analysis.referralBrief.quoteRequests ?? []).length > 0) && (
                <div style={{ background: P.bIce, border: `1px solid ${P.blue}22`, borderRadius: 10, padding: 16, marginBottom: 16 }} data-testid="card-referral-brief">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Shield size={16} color={P.bDk} />
                    <span style={{ fontSize: TS.supporting, fontWeight: 700, color: P.bDk, fontFamily: FONT }}>P&C Referral Brief</span>
                    <div style={{ marginLeft: "auto" }}>
                      <CopyButton text={
                        `P&C REFERRAL BRIEF\nClient: ${clientName}\n\nTOP PRIORITIES:\n${(analysis.referralBrief!.priorities ?? []).map((p, i) => `${i + 1}. ${p.issue ?? "N/A"}\n   Current: ${p.currentValue ?? "N/A"} → Recommended: ${p.recommendedValue ?? "N/A"}\n   Why now: ${p.whyNow ?? "N/A"}`).join("\n")}\n\nQUOTE REQUESTS:\n${(analysis.referralBrief!.quoteRequests ?? []).map(q => `☐ ${q}`).join("\n")}\n\nADVISOR NOTES:\n${analysis.referralBrief!.advisorNotes ?? "None"}`
                      } label="Copy Brief" />
                    </div>
                  </div>
                  {(analysis.referralBrief!.priorities ?? []).map((p, i) => (
                    <div key={i} style={{ marginBottom: 10, padding: "8px 12px", background: "white", borderRadius: 6, border: `1px solid ${P.odBorder}` }}>
                      <div style={{ fontSize: TS.supporting, fontWeight: 600, color: P.dark, fontFamily: FONT, marginBottom: 4 }}>{i + 1}. {p.issue ?? "Not available"}</div>
                      <div style={{ fontSize: TS.label, color: P.mid, fontFamily: FONT, lineHeight: 1.5 }}>
                        Current: {p.currentValue ?? "N/A"} → Recommended: {p.recommendedValue ?? "N/A"}<br />
                        Why now: {p.whyNow ?? "N/A"}
                      </div>
                    </div>
                  ))}
                  {(analysis.referralBrief!.quoteRequests ?? []).length > 0 && (
                    <div style={{ marginTop: 8, padding: "8px 12px", background: "white", borderRadius: 6 }}>
                      <Lbl style={{ display: "block", marginBottom: 6 }}>Quote Requests</Lbl>
                      {analysis.referralBrief!.quoteRequests!.map((q, i) => (
                        <div key={i} style={{ fontSize: TS.label, color: P.dark, fontFamily: FONT, paddingLeft: 4, lineHeight: 1.8 }}>☐ {q}</div>
                      ))}
                    </div>
                  )}
                  {analysis.referralBrief.advisorNotes && (
                    <div style={{ marginTop: 8, fontSize: TS.label, color: P.mid, fontFamily: FONT, fontStyle: "italic" }}>
                      {analysis.referralBrief!.advisorNotes ?? ""}
                    </div>
                  )}
                </div>
              )}

              <CollapsibleSection title="Calculation Audit" icon={Calculator} testId="section-calc-audit">
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {([
                    ["Umbrella Adequacy (Calc A)", analysis.calculationEngine?.umbrellaAdequacy ?? null],
                    ["Dwelling Replacement Cost (Calc B)", analysis.calculationEngine?.dwellingReplacementCost ?? null],
                    ["Auto Liability Adequacy (Calc C)", analysis.calculationEngine?.autoLiabilityAdequacy ?? null],
                    ["Deductible Optimization (Calc D)", analysis.calculationEngine?.deductibleOptimization ?? null],
                    ["Valuable Articles (Calc E)", analysis.calculationEngine?.valuableArticlesAdequacy ?? null],
                  ] as [string, CalculationResult | null][]).filter(([, calc]) => calc?.narrative).map(([label, calc]) => (
                    <div key={label}>
                      <Lbl style={{ display: "block", marginBottom: 4 }}>{label}</Lbl>
                      <div style={{ background: "#1B1D22", borderRadius: 6, padding: 12, overflow: "auto" }}>
                        <pre style={{ fontSize: TS.label, fontFamily: "'DM Mono', monospace", color: "#E2E6EF", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, lineHeight: 1.6 }}>
                          {calc!.narrative}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Data Quality & Missing Context" icon={AlertTriangle} testId="section-data-quality">
                {analysis.dataQualityGates ? (
                <div style={{ marginTop: 8 }}>
                  {(analysis.dataQualityGates.documentSufficiency ?? []).length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <Lbl style={{ display: "block", marginBottom: 4 }}>Document Sufficiency</Lbl>
                      {analysis.dataQualityGates.documentSufficiency!.map((g, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: TS.label, fontFamily: FONT, lineHeight: 1.8 }}>
                          {g.passed ? <CheckCircle size={12} color={P.grn} /> : <AlertCircle size={12} color={P.red} />}
                          <span style={{ color: P.dark }}>{g.gate ?? "Unknown gate"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(analysis.dataQualityGates.analysisSafety ?? []).length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <Lbl style={{ display: "block", marginBottom: 4 }}>Analysis Safety Gates</Lbl>
                      {analysis.dataQualityGates.analysisSafety!.map((g, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: TS.label, fontFamily: FONT, lineHeight: 1.8 }}>
                          {g.passed ? <CheckCircle size={12} color={P.grn} /> : <AlertCircle size={12} color={P.red} />}
                          <span style={{ color: P.dark }}>{g.gate ?? "Unknown gate"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {(analysis.dataQualityGates.missingContextFlags ?? []).length > 0 ? (
                    analysis.dataQualityGates.missingContextFlags!.map((f, i: number) => (
                      <div key={i} style={{ display: "flex", gap: 8, fontSize: TS.label, fontFamily: FONT, lineHeight: 1.6, marginBottom: 4 }}>
                        <AlertTriangle size={12} color={P.amb} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div><span style={{ color: P.dark, fontWeight: 500 }}>{f.item ?? "Unknown"}</span> — <span style={{ color: P.lt }}>{f.impact ?? "Unknown impact"}</span></div>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: TS.label, color: P.grn, fontFamily: FONT, margin: 0 }}>All context items present — no missing data flags.</p>
                  )}
                </div>
                ) : (
                  <p style={{ fontSize: TS.label, color: P.lt, fontFamily: FONT, margin: "10px 0 0", fontStyle: "italic" }}>Data quality gate results not available.</p>
                )}
              </CollapsibleSection>

              {(analysis.assumptions ?? []).length > 0 && (
                <CollapsibleSection title="Assumptions Used" icon={Info} testId="section-assumptions">
                  <div style={{ overflow: "auto", marginTop: 8 }}>
                    <table style={{ width: "100%", fontSize: TS.label, fontFamily: FONT, borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: P.odSurf2 }}>
                          {["Assumption", "Value", "Source", "Impact if Wrong"].map(h => (
                            <th key={h} style={{ padding: "5px 8px", textAlign: "left", fontWeight: 600, color: P.mid, textTransform: "uppercase", letterSpacing: ".04em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.assumptions!.map((a, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${P.odBorder}` }}>
                            <td style={{ padding: "5px 8px", color: P.dark }}>{a.item ?? "N/A"}</td>
                            <td style={{ padding: "5px 8px", color: P.dark, fontWeight: 500 }}>{a.valueUsed ?? "N/A"}</td>
                            <td style={{ padding: "5px 8px", color: P.mid }}>{a.source ?? "N/A"}</td>
                            <td style={{ padding: "5px 8px", color: P.lt }}>{a.impactIfWrong ?? "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleSection>
              )}

              {(analysis.questionsToAskClient ?? []).length > 0 && (
                <CollapsibleSection title="Questions to Ask Client" icon={Users} testId="section-questions">
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                    {analysis.questionsToAskClient!.map((q, i) => (
                      <li key={i} style={{ fontSize: TS.supporting, color: P.dark, lineHeight: 1.7, fontFamily: FONT }}>{q}</li>
                    ))}
                  </ul>
                </CollapsibleSection>
              )}
            </div>
          )}

          {viewMode === "advisor" && (
            <div style={{ marginTop: 20 }} data-testid="view-advisor-report">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Eye size={16} color={P.bDk} />
                <span style={{ fontSize: TS.body, fontWeight: 600, color: P.dark, fontFamily: FONT }}>Advisor Report (Technical)</span>
                <div style={{ marginLeft: "auto" }}>
                  <CopyButton text={analysis.advisorReport ?? ""} label="Copy Report" />
                </div>
              </div>
              <div style={{
                background: "white", border: `1px solid ${P.odBorder}`, borderRadius: 8, padding: 20,
                fontSize: TS.supporting, color: P.dark, lineHeight: 1.7, fontFamily: FONT,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {analysis.advisorReport ?? "Advisor report not available. The AI may not have generated this section."}
              </div>
            </div>
          )}

          {viewMode === "client" && (
            <div style={{ marginTop: 20 }} data-testid="view-client-summary">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Users size={16} color={P.grn} />
                <span style={{ fontSize: TS.body, fontWeight: 600, color: P.dark, fontFamily: FONT }}>Client Summary (Plain Language)</span>
                <div style={{ marginLeft: "auto" }}>
                  <CopyButton text={analysis.clientSummary ?? ""} label="Copy Summary" />
                </div>
              </div>
              <div style={{
                background: "white", border: `1px solid ${P.odBorder}`, borderRadius: 8, padding: 20,
                fontSize: TS.supporting, color: P.dark, lineHeight: 1.8, fontFamily: FONT,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {analysis.clientSummary ?? "Client summary not available. The AI may not have generated this section."}
              </div>
            </div>
          )}

          <button
            onClick={resetAnalysis}
            style={{
              display: "flex", alignItems: "center", gap: 6, marginTop: 20,
              background: "none", border: `1px solid ${P.odBorder}`, borderRadius: 6,
              padding: "8px 16px", fontSize: TS.supporting, color: P.mid,
              cursor: "pointer", fontFamily: FONT,
            }}
            data-testid="button-new-analysis"
          >
            <Upload size={14} /> Run New Diagnostic
          </button>
        </div>
      )}
    </div>
  );
}
