import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  BookOpen,
  Search,
  Filter,
  ExternalLink,
  Tag,
  Calendar,
  Building2,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Rss,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Zap,
  FileText,
  Shield,
  Target,
  Users,
  MessageSquare,
  BarChart3,
  Layers,
  Bell,
  Award,
} from "lucide-react";
import { P, sc, sb } from "@/styles/tokens";
import { Serif, Mono, Lbl } from "@/components/design/typography";
import { Pill } from "@/components/design/pill";
import { useToast } from "@/hooks/use-toast";

interface ResearchArticle {
  id: string;
  source: string;
  sourceUrl: string | null;
  title: string;
  content: string;
  summary: string | null;
  keyTakeaways: string[];
  topics: string[];
  relevanceTags: string[];
  publishedAt: string | null;
  ingestedAt: string;
  aiProcessed: boolean;
  createdAt: string;
}

interface ResearchFeed {
  id: string;
  name: string;
  url: string;
  category: string | null;
  fetchIntervalMinutes: number;
  status: string;
  lastFetchAt: string | null;
  lastError: string | null;
  errorCount: number;
  articleCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ResearchBrief {
  id: string;
  articleId: string;
  classification: {
    type: string;
    credibilityScore: number;
    credibilityFactors: { factor: string; score: number; note: string }[];
    timeliness: string;
    urgencyLevel: string;
    publicationRecency: string;
  };
  executiveSummary: string;
  keyTakeaways: { point: string; evidence: string; sourceAttribution: string; quantification: string }[];
  planningDomains: { domain: string; relevanceScore: number; rationale: string }[];
  clientImpact: {
    lifeStageScores: { stage: string; score: number; mechanism: string }[];
    riskProfileScores: { profile: string; score: number; mechanism: string }[];
    overallImpactLevel: string;
  };
  actionTriggers: { action: string; targetSegment: string; rationale: string; timing: string; exampleClient: string; priority: string }[];
  talkingPoints: { segment: string; situation: string; implication: string; question: string; action: string; doNotSay: string[] }[];
  complianceReview: {
    forwardLookingStatements: { text: string; disclaimer: string }[];
    balancedPresentation: boolean;
    balanceNote: string;
    sourceAttributionVerified: boolean;
    forbiddenPhrases: { phrase: string; replacement: string }[];
    overallStatus: string;
  };
  tagTaxonomy: {
    topicTags: string[];
    assetClassTags: string[];
    relevanceTag: string;
    urgencyTag: string;
  };
  clientAlertQueue: { matchType: string; description: string; priority: string; targetSegments: string[] }[];
  generatedAt: string;
  createdAt: string;
}

const TOPIC_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  macro: { label: "Macro", color: P.blue, bg: P.bFr },
  equity: { label: "Equity", color: P.grn, bg: P.gL },
  fixed_income: { label: "Fixed Income", color: P.amb, bg: P.aL },
  alternatives: { label: "Alternatives", color: P.odBg, bg: P.odSurf2 },
  tax: { label: "Tax", color: P.red, bg: P.rL },
  estate: { label: "Estate", color: P.gold, bg: P.goldLt },
  retirement: { label: "Retirement", color: P.bDk, bg: P.bIce },
  esg: { label: "ESG", color: P.gD, bg: P.gL },
};

const DOMAIN_LABELS: Record<string, string> = {
  investment_management: "Investment Mgmt",
  retirement_planning: "Retirement",
  tax_planning: "Tax Planning",
  estate_planning: "Estate Planning",
  risk_management: "Risk Mgmt",
  cash_flow: "Cash Flow",
  education_funding: "Education",
  charitable_giving: "Charitable",
  business_planning: "Business",
};

const URGENCY_COLORS: Record<string, { color: string; bg: string }> = {
  immediate: { color: P.red, bg: P.rL },
  high: { color: P.amb, bg: P.aL },
  standard: { color: P.blue, bg: P.bFr },
  low: { color: P.lt, bg: P.odSurf2 },
  reference_only: { color: P.lt, bg: P.odSurf2 },
  urgent: { color: P.red, bg: P.rL },
};

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  high: { color: P.red, bg: P.rL },
  medium: { color: P.amb, bg: P.aL },
  low: { color: P.grn, bg: P.gL },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ScoreBar({ score, label, color }: { score: number; label: string; color?: string }) {
  const barColor = color || sc(score);
  const barBg = sb(score);
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: P.odT3 }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: barColor }}>{score}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: P.odBorder, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, borderRadius: 2, background: barColor, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function CollapsibleSection({ title, icon, children, defaultOpen = false, badge }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = icon;
  return (
    <div style={{ borderRadius: 6, border: `1px solid ${P.odBorder}`, marginBottom: 8, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "10px 14px",
          background: open ? P.odSurf : "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
        data-testid={`button-section-${title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon style={{ width: 14, height: 14, color: P.blue }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: P.odT1 }}>{title}</span>
          {badge !== undefined && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: P.bFr, color: P.blue, fontWeight: 600 }}>
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp style={{ width: 12, height: 12, color: P.lt }} /> : <ChevronDown style={{ width: 12, height: 12, color: P.lt }} />}
      </button>
      {open && <div style={{ padding: 14, borderTop: `1px solid ${P.odBorder}` }}>{children}</div>}
    </div>
  );
}

function BriefDisplay({ brief, articleTitle }: { brief: ResearchBrief; articleTitle?: string }) {
  const cls = brief.classification;
  const urgencyStyle = URGENCY_COLORS[cls?.urgencyLevel] || URGENCY_COLORS.standard;
  const complianceStatus = brief.complianceReview?.overallStatus || "clear";

  return (
    <div
      className="animate-fu"
      style={{ padding: 20, borderRadius: 8, background: P.odSurf, border: `1px solid ${P.odBorder}` }}
      data-testid={`card-brief-${brief.id}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          {articleTitle && (
            <Serif style={{ fontSize: 15, fontWeight: 600, color: P.odT1, marginBottom: 4, display: "block" }} data-testid={`text-brief-title-${brief.id}`}>
              {articleTitle}
            </Serif>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <Pill label={(cls?.type || "research").replace(/_/g, " ")} c={P.blue} bg={P.bFr} />
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: urgencyStyle.bg, color: urgencyStyle.color, fontWeight: 600, textTransform: "uppercase" }}>
              {cls?.urgencyLevel || "standard"}
            </span>
            <span style={{ fontSize: 10, color: P.lt }}>
              Credibility: <strong style={{ color: sc(cls?.credibilityScore || 0) }}>{cls?.credibilityScore || 0}/100</strong>
            </span>
            <span style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 99,
              background: complianceStatus === "clear" ? P.gL : complianceStatus === "flagged" ? P.aL : P.rL,
              color: complianceStatus === "clear" ? P.grn : complianceStatus === "flagged" ? P.amb : P.red,
              fontWeight: 600,
            }}>
              <Shield style={{ width: 8, height: 8, display: "inline", marginRight: 3 }} />
              {complianceStatus}
            </span>
          </div>
        </div>
        <Mono style={{ fontSize: 10, color: P.lt }}>{formatDate(brief.generatedAt)}</Mono>
      </div>

      {brief.executiveSummary && (
        <div style={{ padding: 12, borderRadius: 6, background: P.bFr, marginBottom: 12, borderLeft: `3px solid ${P.blue}` }}>
          <Lbl style={{ marginBottom: 4, display: "block" }}>Executive Summary</Lbl>
          <p style={{ fontSize: 12, color: P.odT2, lineHeight: 1.7, margin: 0 }} data-testid={`text-brief-summary-${brief.id}`}>
            {brief.executiveSummary}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
        {(brief.tagTaxonomy?.topicTags || []).map((tag: string) => (
          <span key={tag} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: P.bFr, color: P.blue }}>
            {tag.replace(/_/g, " ")}
          </span>
        ))}
        {(brief.tagTaxonomy?.assetClassTags || []).map((tag: string) => (
          <span key={tag} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: P.gL, color: P.grn }}>
            {tag.replace(/_/g, " ")}
          </span>
        ))}
        {brief.tagTaxonomy?.relevanceTag && (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: P.aL, color: P.amb }}>
            {brief.tagTaxonomy.relevanceTag}
          </span>
        )}
      </div>

      <CollapsibleSection title="Key Takeaways" icon={BarChart3} defaultOpen={true} badge={brief.keyTakeaways?.length}>
        {(brief.keyTakeaways || []).map((t, i: number) => (
          <div key={i} style={{ padding: 10, borderRadius: 4, background: i % 2 === 0 ? P.odSurf2 : "transparent", marginBottom: 4 }}>
            <p style={{ fontSize: 12, color: P.odT2, fontWeight: 600, marginBottom: 4 }}>{t.point}</p>
            <div style={{ display: "flex", gap: 12, fontSize: 10, color: P.odT3 }}>
              {t.evidence && <span>Evidence: {t.evidence}</span>}
              {t.quantification && t.quantification !== "qualitative" && (
                <span style={{ color: P.blue, fontWeight: 600 }}>{t.quantification}</span>
              )}
            </div>
            {t.sourceAttribution && (
              <span style={{ fontSize: 10, color: P.lt }}>Source: {t.sourceAttribution}</span>
            )}
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Planning Domain Impact" icon={Layers} badge={brief.planningDomains?.length}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {(brief.planningDomains || []).sort((a, b) => b.relevanceScore - a.relevanceScore).map((d) => (
            <div key={d.domain} style={{ padding: 8, borderRadius: 4, background: P.odSurf2 }}>
              <ScoreBar score={d.relevanceScore} label={DOMAIN_LABELS[d.domain] || d.domain.replace(/_/g, " ")} />
              <p style={{ fontSize: 10, color: P.odT3, lineHeight: 1.4, margin: 0 }}>{d.rationale}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Client Impact Assessment" icon={Users}>
        <div style={{ marginBottom: 12 }}>
          <Lbl style={{ marginBottom: 8, display: "block" }}>
            Life Stage Impact
            <span style={{
              marginLeft: 8,
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 99,
              background: brief.clientImpact?.overallImpactLevel === "high" ? P.rL : brief.clientImpact?.overallImpactLevel === "moderate" ? P.aL : P.gL,
              color: brief.clientImpact?.overallImpactLevel === "high" ? P.red : brief.clientImpact?.overallImpactLevel === "moderate" ? P.amb : P.grn,
            }}>
              {brief.clientImpact?.overallImpactLevel || "moderate"} impact
            </span>
          </Lbl>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(brief.clientImpact?.lifeStageScores || []).map((s) => (
              <div key={s.stage} style={{ padding: 8, borderRadius: 4, background: P.odSurf2 }}>
                <ScoreBar score={s.score} label={s.stage.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} />
                <p style={{ fontSize: 10, color: P.odT3, margin: 0, lineHeight: 1.4 }}>{s.mechanism}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <Lbl style={{ marginBottom: 8, display: "block" }}>Risk Profile Impact</Lbl>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {(brief.clientImpact?.riskProfileScores || []).map((s) => (
              <div key={s.profile} style={{ padding: 8, borderRadius: 4, background: P.odSurf2 }}>
                <ScoreBar score={s.score} label={s.profile.replace(/\b\w/g, (c: string) => c.toUpperCase())} />
                <p style={{ fontSize: 10, color: P.odT3, margin: 0, lineHeight: 1.4 }}>{s.mechanism}</p>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Action Triggers" icon={Target} badge={brief.actionTriggers?.length}>
        {(brief.actionTriggers || []).map((t, i: number) => {
          const pStyle = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.medium;
          return (
            <div key={i} style={{ padding: 10, borderRadius: 4, border: `1px solid ${P.odBorder}`, marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: P.odT1, margin: 0 }}>{t.action}</p>
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: pStyle.bg, color: pStyle.color, fontWeight: 600, textTransform: "uppercase", flexShrink: 0 }}>
                  {t.priority}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10, color: P.odT3 }}>
                <div><strong style={{ color: P.odT2 }}>Target:</strong> {t.targetSegment}</div>
                <div><strong style={{ color: P.odT2 }}>Timing:</strong> {t.timing}</div>
                <div style={{ gridColumn: "1 / -1" }}><strong style={{ color: P.odT2 }}>Rationale:</strong> {t.rationale}</div>
                {t.exampleClient && <div style={{ gridColumn: "1 / -1", fontStyle: "italic" }}>Example: {t.exampleClient}</div>}
              </div>
            </div>
          );
        })}
      </CollapsibleSection>

      <CollapsibleSection title="Talking Points" icon={MessageSquare} badge={brief.talkingPoints?.length}>
        {(brief.talkingPoints || []).map((tp, i: number) => (
          <div key={i} style={{ padding: 12, borderRadius: 4, border: `1px solid ${P.odBorder}`, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Pill label={tp.segment.replace(/_/g, " ")} c={P.blue} bg={P.bFr} />
            </div>
            <div style={{ display: "grid", gap: 6, fontSize: 11, color: P.odT2, lineHeight: 1.6 }}>
              <div style={{ padding: 8, borderRadius: 4, background: P.bFr, borderLeft: `3px solid ${P.blue}` }}>
                <Lbl style={{ fontSize: 10, marginBottom: 2, display: "block" }}>Situation</Lbl>
                {tp.situation}
              </div>
              <div style={{ padding: 8, borderRadius: 4, background: P.aL, borderLeft: `3px solid ${P.amb}` }}>
                <Lbl style={{ fontSize: 10, marginBottom: 2, display: "block" }}>Implication</Lbl>
                {tp.implication}
              </div>
              <div style={{ padding: 8, borderRadius: 4, background: P.gL, borderLeft: `3px solid ${P.grn}` }}>
                <Lbl style={{ fontSize: 10, marginBottom: 2, display: "block" }}>Question</Lbl>
                {tp.question}
              </div>
              <div style={{ padding: 8, borderRadius: 4, background: P.odSurf2, borderLeft: `3px solid ${P.dark}` }}>
                <Lbl style={{ fontSize: 10, marginBottom: 2, display: "block" }}>Action</Lbl>
                {tp.action}
              </div>
            </div>
            {tp.doNotSay && tp.doNotSay.length > 0 && (
              <div style={{ marginTop: 8, padding: 6, borderRadius: 4, background: P.rL, fontSize: 10, color: P.red }}>
                <strong>Do not say:</strong> {tp.doNotSay.join(" | ")}
              </div>
            )}
          </div>
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Compliance Review" icon={Shield}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, padding: 8, borderRadius: 4, background: brief.complianceReview?.balancedPresentation ? P.gL : P.aL }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                {brief.complianceReview?.balancedPresentation
                  ? <CheckCircle style={{ width: 12, height: 12, color: P.grn }} />
                  : <AlertTriangle style={{ width: 12, height: 12, color: P.amb }} />
                }
                <span style={{ fontSize: 11, fontWeight: 600, color: brief.complianceReview?.balancedPresentation ? P.grn : P.amb }}>
                  Balanced Presentation
                </span>
              </div>
              <p style={{ fontSize: 10, color: P.odT3, margin: 0 }}>{brief.complianceReview?.balanceNote}</p>
            </div>
            <div style={{ flex: 1, padding: 8, borderRadius: 4, background: brief.complianceReview?.sourceAttributionVerified ? P.gL : P.aL }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                {brief.complianceReview?.sourceAttributionVerified
                  ? <CheckCircle style={{ width: 12, height: 12, color: P.grn }} />
                  : <AlertTriangle style={{ width: 12, height: 12, color: P.amb }} />
                }
                <span style={{ fontSize: 11, fontWeight: 600, color: brief.complianceReview?.sourceAttributionVerified ? P.grn : P.amb }}>
                  Source Attribution
                </span>
              </div>
            </div>
          </div>

          {(brief.complianceReview?.forwardLookingStatements || []).length > 0 && (
            <div>
              <Lbl style={{ marginBottom: 4, display: "block" }}>Forward-Looking Statements ({brief.complianceReview.forwardLookingStatements.length})</Lbl>
              {brief.complianceReview.forwardLookingStatements.map((s, i: number) => (
                <div key={i} style={{ padding: 8, borderRadius: 4, background: P.aL, marginBottom: 4, fontSize: 10 }}>
                  <p style={{ color: P.odT2, margin: "0 0 4px 0", fontStyle: "italic" }}>"{s.text}"</p>
                  <p style={{ color: P.amb, margin: 0, fontWeight: 600 }}>{s.disclaimer}</p>
                </div>
              ))}
            </div>
          )}

          {(brief.complianceReview?.forbiddenPhrases || []).length > 0 && (
            <div>
              <Lbl style={{ marginBottom: 4, display: "block", color: P.red }}>Flagged Phrases ({brief.complianceReview.forbiddenPhrases.length})</Lbl>
              {brief.complianceReview.forbiddenPhrases.map((fp, i: number) => (
                <div key={i} style={{ padding: 6, borderRadius: 4, background: P.rL, marginBottom: 4, fontSize: 10 }}>
                  <span style={{ color: P.red, textDecoration: "line-through" }}>{fp.phrase}</span>
                  {" → "}
                  <span style={{ color: P.grn, fontWeight: 600 }}>{fp.replacement}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Client Alert Queue" icon={Bell} badge={brief.clientAlertQueue?.length}>
        {(brief.clientAlertQueue || []).map((alert, i: number) => {
          const pStyle = PRIORITY_COLORS[alert.priority] || PRIORITY_COLORS.low;
          return (
            <div key={i} style={{ padding: 10, borderRadius: 4, border: `1px solid ${P.odBorder}`, marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Pill label={alert.matchType.replace(/_/g, " ")} c={P.blue} bg={P.bFr} />
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: pStyle.bg, color: pStyle.color, fontWeight: 600, textTransform: "uppercase" }}>
                    {alert.priority}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: P.odT2, margin: "0 0 4px 0" }}>{alert.description}</p>
              {alert.targetSegments?.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {alert.targetSegments.map((seg: string) => (
                    <span key={seg} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: P.odSurf2, color: P.odT3 }}>
                      {seg.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CollapsibleSection>

      <CollapsibleSection title="Credibility Factors" icon={Award} badge={cls?.credibilityScore}>
        <div style={{ marginBottom: 8 }}>
          <ScoreBar score={cls?.credibilityScore || 0} label="Overall Credibility Score" />
        </div>
        {(cls?.credibilityFactors || []).map((f, i: number) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${P.odSurf2}` }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: P.odT2 }}>{f.factor}</span>
              <span style={{ fontSize: 10, color: P.odT3, marginLeft: 8 }}>{f.note}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: sc(f.score * 5) }}>+{f.score}</span>
          </div>
        ))}
      </CollapsibleSection>
    </div>
  );
}

function ArticleCard({
  article,
  onReprocess,
  onDelete,
  isReprocessing,
}: {
  article: ResearchArticle;
  onReprocess: (id: string) => void;
  onDelete: (id: string) => void;
  isReprocessing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const { toast } = useToast();

  const briefQuery = useQuery<ResearchBrief[]>({
    queryKey: ["/api/research", article.id, "briefs"],
    queryFn: async () => {
      const res = await fetch(`/api/research/${article.id}/briefs`);
      if (!res.ok) throw new Error("Failed to fetch briefs");
      return res.json();
    },
    enabled: showBrief,
    staleTime: 30000,
  });

  const generateBriefMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/research/${article.id}/brief`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research", article.id, "briefs"] });
      toast({ title: "Brief generated", description: "Research brief has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate research brief.", variant: "destructive", duration: Infinity });
    },
  });

  const latestBrief = briefQuery.data?.[0];
  const hasBriefs = briefQuery.data && briefQuery.data.length > 0;

  return (
    <div
      className="animate-fu"
      style={{
        padding: 20,
        borderRadius: 6,
        background: P.odSurf,
        border: `1px solid ${P.odBorder}`,
        marginBottom: 8,
      }}
      data-testid={`card-research-${article.id}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Building2 style={{ width: 14, height: 14, color: P.lt, flexShrink: 0 }} />
            <Mono style={{ fontSize: 10, color: P.lt, textTransform: "uppercase", letterSpacing: 1 }}>
              {article.source}
            </Mono>
            <span style={{ fontSize: 10, color: P.fnt }}>•</span>
            <Mono style={{ fontSize: 10, color: P.lt }}>
              <Calendar style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />
              {formatDate(article.publishedAt)}
            </Mono>
          </div>
          <Serif
            style={{ fontSize: 15, fontWeight: 600, color: P.odT1, lineHeight: 1.4, cursor: "pointer" }}
            onClick={() => setExpanded(!expanded)}
            data-testid={`text-research-title-${article.id}`}
          >
            {article.title}
          </Serif>
          {article.summary && (
            <p style={{ fontSize: 12, color: P.odT3, lineHeight: 1.6, marginTop: 8 }} data-testid={`text-research-summary-${article.id}`}>
              {article.summary}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <Button
            variant="ghost"
            size="sm"
            style={{ padding: "4px 8px", fontSize: 11 }}
            onClick={() => setShowBrief(!showBrief)}
            title="View Research Brief"
            data-testid={`button-brief-${article.id}`}
          >
            <FileText style={{ width: 14, height: 14, marginRight: 4 }} />
            Brief
          </Button>
          {article.sourceUrl && (
            <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" title="View source">
              <Button variant="ghost" size="sm" style={{ padding: 4 }} data-testid={`link-research-source-${article.id}`}>
                <ExternalLink style={{ width: 14, height: 14 }} />
              </Button>
            </a>
          )}
          <Button
            variant="ghost"
            size="sm"
            style={{ padding: 4 }}
            onClick={() => onReprocess(article.id)}
            disabled={isReprocessing}
            title="Reprocess with AI"
            data-testid={`button-reprocess-${article.id}`}
          >
            {isReprocessing ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <RefreshCw style={{ width: 14, height: 14 }} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={{ padding: 4, color: P.red }}
            onClick={() => onDelete(article.id)}
            title="Delete"
            data-testid={`button-delete-research-${article.id}`}
          >
            <Trash2 style={{ width: 14, height: 14 }} />
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
        {(article.topics || []).map((topic) => {
          const t = TOPIC_LABELS[topic] || { label: topic, color: P.lt, bg: P.odSurf2 };
          return <Pill key={topic} label={t.label} c={t.color} bg={t.bg} />;
        })}
        {(article.relevanceTags || []).slice(0, 4).map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 99,
              background: P.odSurf2,
              color: P.odT3,
            }}
          >
            <Tag style={{ width: 8, height: 8, display: "inline", marginRight: 3 }} />
            {tag.replace(/_/g, " ")}
          </span>
        ))}
        {!article.aiProcessed && (
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: P.aL, color: P.amb }}>
            Not AI-processed
          </span>
        )}
      </div>

      {showBrief && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${P.odBorder}` }}>
          {briefQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-24" />
              <Skeleton className="h-16" />
            </div>
          ) : latestBrief ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Serif style={{ fontSize: 14, fontWeight: 600, color: P.odT1 }}>Research Brief</Serif>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateBriefMutation.mutate()}
                  disabled={generateBriefMutation.isPending}
                  data-testid={`button-regenerate-brief-${article.id}`}
                >
                  {generateBriefMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                  Regenerate
                </Button>
              </div>
              <BriefDisplay brief={latestBrief} />
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 24 }}>
              <FileText style={{ width: 24, height: 24, color: P.lt, margin: "0 auto 8px" }} />
              <p style={{ fontSize: 12, color: P.odT3, marginBottom: 12 }}>No brief generated yet.</p>
              <Button
                size="sm"
                onClick={() => generateBriefMutation.mutate()}
                disabled={generateBriefMutation.isPending}
                data-testid={`button-generate-brief-${article.id}`}
              >
                {generateBriefMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileText className="w-3 h-3 mr-1" />}
                Generate Brief
              </Button>
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${P.odBorder}` }}>
          {Array.isArray(article.keyTakeaways) && article.keyTakeaways.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <Lbl style={{ marginBottom: 6, display: "block" }}>Key Takeaways</Lbl>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {(article.keyTakeaways as string[]).map((t, i) => (
                  <li key={i} style={{ fontSize: 12, color: P.odT2, lineHeight: 1.6, marginBottom: 4 }}>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <Lbl style={{ marginBottom: 6, display: "block" }}>Full Content</Lbl>
            <p style={{ fontSize: 12, color: P.odT3, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>
              {article.content}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginTop: 8,
          border: "none",
          background: "none",
          cursor: "pointer",
          fontSize: 11,
          color: P.blue,
          padding: 0,
        }}
        data-testid={`button-expand-${article.id}`}
      >
        {expanded ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
        {expanded ? "Show less" : "Show more"}
      </button>
    </div>
  );
}

function IngestForm({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const ingestMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/research/ingest", {
        title,
        source,
        sourceUrl: sourceUrl || undefined,
        content,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
      setTitle("");
      setSource("");
      setSourceUrl("");
      setContent("");
      setOpen(false);
      toast({ title: "Article ingested", description: "Research article has been processed and added." });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to ingest article.", variant: "destructive", duration: Infinity });
    },
  });

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} data-testid="button-add-research">
        <Plus style={{ width: 14, height: 14, marginRight: 4 }} />
        Add Research
      </Button>
    );
  }

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 6,
        background: P.odSurf,
        border: `1px solid ${P.odBorder}`,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Serif style={{ fontSize: 14, fontWeight: 600, color: P.odT1 }}>Add Research Article</Serif>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <Input
          placeholder="Source (e.g., J.P. Morgan)"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          data-testid="input-research-source"
        />
        <Input
          placeholder="Source URL (optional)"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          data-testid="input-research-url"
        />
      </div>
      <Input
        placeholder="Article title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ marginBottom: 8 }}
        data-testid="input-research-title"
      />
      <textarea
        placeholder="Paste article content here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{
          width: "100%",
          minHeight: 120,
          padding: 10,
          borderRadius: 6,
          border: `1px solid ${P.odBorder}`,
          fontSize: 12,
          fontFamily: "'DM Sans', sans-serif",
          resize: "vertical",
          marginBottom: 8,
          background: P.odSurf,
        }}
        data-testid="input-research-content"
      />
      <Button
        size="sm"
        onClick={() => ingestMutation.mutate()}
        disabled={!title || !source || !content || ingestMutation.isPending}
        data-testid="button-submit-research"
      >
        {ingestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
        Ingest & Process
      </Button>
    </div>
  );
}

function FeedCard({ feed }: { feed: ResearchFeed }) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/research/feeds/${feed.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/feeds"] });
      toast({ title: "Feed removed", description: `${feed.name} has been deleted.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove feed.", variant: "destructive", duration: Infinity });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/research/feeds/${feed.id}`, {
        status: feed.status === "active" ? "paused" : "active",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/feeds"] });
      toast({ title: "Feed updated", description: `Feed status changed.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update feed status.", variant: "destructive", duration: Infinity });
    },
  });

  const fetchMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/research/feeds/${feed.id}/fetch`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/feeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
      toast({ title: "Feed fetched", description: `Articles fetched from ${feed.name}.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to fetch feed.", variant: "destructive", duration: Infinity });
    },
  });

  const isHealthy = feed.status === "active" && (feed.errorCount || 0) === 0;
  const hasErrors = (feed.errorCount || 0) > 0;

  return (
    <div
      className="animate-fu"
      style={{
        padding: 16,
        borderRadius: 6,
        background: P.odSurf,
        border: `1px solid ${P.odBorder}`,
      }}
      data-testid={`card-feed-${feed.id}`}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            {isHealthy ? (
              <CheckCircle style={{ width: 12, height: 12, color: P.grn, flexShrink: 0 }} />
            ) : hasErrors ? (
              <AlertTriangle style={{ width: 12, height: 12, color: P.amb, flexShrink: 0 }} />
            ) : (
              <Pause style={{ width: 12, height: 12, color: P.lt, flexShrink: 0 }} />
            )}
            <Serif style={{ fontSize: 13, fontWeight: 600, color: P.odT1 }} data-testid={`text-feed-name-${feed.id}`}>
              {feed.name}
            </Serif>
            <span style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 99,
              background: feed.status === "active" ? P.gL : P.odSurf2,
              color: feed.status === "active" ? P.grn : P.lt,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              fontWeight: 600,
            }}>
              {feed.status}
            </span>
          </div>
          <Mono style={{ fontSize: 10, color: P.lt, wordBreak: "break-all" }}>
            {feed.url}
          </Mono>
        </div>
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <Button
            variant="ghost"
            size="sm"
            style={{ padding: 4 }}
            onClick={() => fetchMutation.mutate()}
            disabled={fetchMutation.isPending}
            title="Fetch now"
            data-testid={`button-fetch-feed-${feed.id}`}
          >
            {fetchMutation.isPending ? (
              <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />
            ) : (
              <Zap style={{ width: 13, height: 13 }} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={{ padding: 4 }}
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            title={feed.status === "active" ? "Pause" : "Resume"}
            data-testid={`button-toggle-feed-${feed.id}`}
          >
            {feed.status === "active" ? (
              <Pause style={{ width: 13, height: 13 }} />
            ) : (
              <Play style={{ width: 13, height: 13 }} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            style={{ padding: 4, color: P.red }}
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            title="Remove"
            data-testid={`button-delete-feed-${feed.id}`}
          >
            <Trash2 style={{ width: 13, height: 13 }} />
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 10 }}>
        <div>
          <span style={{ color: P.lt }}>Last fetch: </span>
          <span style={{ color: P.odT2 }}>{formatRelativeTime(feed.lastFetchAt)}</span>
        </div>
        <div>
          <span style={{ color: P.lt }}>Articles: </span>
          <span style={{ color: P.odT2 }}>{feed.articleCount || 0}</span>
        </div>
        <div>
          <span style={{ color: P.lt }}>Interval: </span>
          <span style={{ color: P.odT2 }}>{feed.fetchIntervalMinutes || 360}m</span>
        </div>
        {hasErrors && (
          <div>
            <span style={{ color: P.amb }}>Errors: {feed.errorCount}</span>
          </div>
        )}
      </div>

      {feed.lastError && (
        <div style={{
          marginTop: 8,
          padding: "6px 10px",
          borderRadius: 4,
          background: P.rL,
          fontSize: 10,
          color: P.red,
        }}>
          {feed.lastError}
        </div>
      )}

      {feed.category && (
        <div style={{ marginTop: 8 }}>
          <Pill label={feed.category} c={P.blue} bg={P.bFr} />
        </div>
      )}
    </div>
  );
}

function AddFeedForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [interval, setInterval] = useState("360");
  const [testResult, setTestResult] = useState<{ success: boolean; itemCount: number; sampleTitles: string[]; error?: string } | null>(null);
  const { toast } = useToast();

  const testMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/research/feeds/test", { url }),
    onSuccess: async (res: Response) => {
      const data = await res.json();
      setTestResult(data);
    },
    onError: () => {
      setTestResult({ success: false, itemCount: 0, sampleTitles: [], error: "Failed to test feed URL" });
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/research/feeds", {
        name,
        url,
        category: category || undefined,
        fetchIntervalMinutes: parseInt(interval) || 360,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research/feeds"] });
      toast({ title: "Feed added", description: `${name} has been added to research feeds.` });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add feed.", variant: "destructive", duration: Infinity });
    },
  });

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 6,
        background: P.odSurf,
        border: `1px solid ${P.odBorder}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Serif style={{ fontSize: 13, fontWeight: 600, color: P.odT1 }}>Add Research Feed</Serif>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <Input
          placeholder="Feed name (e.g., Fed Reserve Blog)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="input-feed-name"
        />
        <Input
          placeholder="Category (e.g., macro, equity)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          data-testid="input-feed-category"
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <Input
          placeholder="Feed URL (RSS/Atom)"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setTestResult(null); }}
          style={{ flex: 1 }}
          data-testid="input-feed-url"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => testMutation.mutate()}
          disabled={!url || testMutation.isPending}
          data-testid="button-test-feed"
        >
          {testMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Test
        </Button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <select
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          style={{
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${P.odBorder}`,
            background: P.odSurf,
            color: P.odT2,
          }}
          data-testid="select-feed-interval"
        >
          <option value="60">Every hour</option>
          <option value="180">Every 3 hours</option>
          <option value="360">Every 6 hours</option>
          <option value="720">Every 12 hours</option>
          <option value="1440">Daily</option>
        </select>
      </div>

      {testResult && (
        <div style={{
          padding: "8px 12px",
          borderRadius: 4,
          background: testResult.success ? P.gL : P.rL,
          marginBottom: 8,
          fontSize: 11,
        }}>
          {testResult.success ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: P.grn, marginBottom: 4 }}>
                <CheckCircle style={{ width: 12, height: 12 }} />
                Found {testResult.itemCount} articles
              </div>
              {testResult.sampleTitles.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {testResult.sampleTitles.map((t, i) => (
                    <li key={i} style={{ color: P.odT2, marginBottom: 2 }}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: P.red }}>
              <XCircle style={{ width: 12, height: 12 }} />
              {testResult.error || "Failed to read feed"}
            </div>
          )}
        </div>
      )}

      <Button
        size="sm"
        onClick={() => createMutation.mutate()}
        disabled={!name || !url || createMutation.isPending}
        data-testid="button-submit-feed"
      >
        {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
        Add Feed
      </Button>
    </div>
  );
}

function FeedManagement() {
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: feeds, isLoading } = useQuery<ResearchFeed[]>({
    queryKey: ["/api/research/feeds"],
  });

  return (
    <div style={{
      padding: 16,
      borderRadius: 6,
      background: P.odSurf2,
      border: `1px solid ${P.odBorder}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Rss style={{ width: 16, height: 16, color: P.amb }} />
          <Serif style={{ fontSize: 14, fontWeight: 600, color: P.odT1 }}>Research Feeds</Serif>
          {feeds && feeds.length > 0 && (
            <span style={{ fontSize: 10, color: P.lt }}>
              ({feeds.filter(f => f.status === "active").length} active)
            </span>
          )}
        </div>
        {!showAddForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
            data-testid="button-add-feed"
          >
            <Plus style={{ width: 12, height: 12, marginRight: 4 }} />
            Add Feed
          </Button>
        )}
      </div>

      {showAddForm && (
        <div style={{ marginBottom: 12 }}>
          <AddFeedForm onClose={() => setShowAddForm(false)} />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : (feeds || []).length === 0 ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Rss style={{ width: 24, height: 24, color: P.lt, margin: "0 auto 8px" }} />
          <p style={{ fontSize: 12, color: P.odT3 }}>
            No research feeds configured. Add RSS or Atom feed URLs to automatically ingest articles.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {(feeds || []).map((feed) => (
            <FeedCard key={feed.id} feed={feed} />
          ))}
        </div>
      )}
    </div>
  );
}

function BriefLibrary() {
  const [search, setSearch] = useState("");

  const { data: briefs, isLoading } = useQuery<ResearchBrief[]>({
    queryKey: ["/api/research/briefs", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/research/briefs${params.toString() ? `?${params}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: articles } = useQuery<ResearchArticle[]>({
    queryKey: ["/api/research"],
    queryFn: async () => {
      const res = await fetch("/api/research");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const articleMap = new Map((articles || []).map(a => [a.id, a]));

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: P.lt }} />
          <Input
            placeholder="Search research briefs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
            data-testid="input-search-briefs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (briefs || []).length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}` }}>
          <FileText style={{ width: 32, height: 32, color: P.lt, margin: "0 auto 12px" }} />
          <Serif style={{ fontSize: 16, fontWeight: 600, color: P.odT2, display: "block", marginBottom: 8 }}>
            No Research Briefs
          </Serif>
          <p style={{ fontSize: 12, color: P.odT3 }}>
            Generate briefs from research articles in the Articles tab. Each brief includes classification, impact scoring, talking points, and compliance review.
          </p>
        </div>
      ) : (
        (briefs || []).map((brief) => {
          const article = articleMap.get(brief.articleId);
          return (
            <BriefDisplay key={brief.id} brief={brief} articleTitle={article?.title} />
          );
        })
      )}
    </div>
  );
}

export default function Research() {
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"articles" | "briefs" | "feeds">("articles");
  const { toast } = useToast();

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (topicFilter) queryParams.set("topic", topicFilter);
  if (sourceFilter) queryParams.set("source", sourceFilter);
  const qs = queryParams.toString();

  const { data: articles, isLoading } = useQuery<ResearchArticle[]>({
    queryKey: ["/api/research", qs],
    queryFn: async () => {
      const res = await fetch(`/api/research${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: topics } = useQuery<string[]>({
    queryKey: ["/api/research/topics"],
  });

  const { data: sources } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/research/sources"],
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/research/${id}/reprocess`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
      toast({ title: "Reprocessed", description: "Article has been re-analyzed with AI." });
    },
    onError: (err: any) => {
      toast({ title: "Reprocess failed", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/research/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
      toast({ title: "Deleted", description: "Research article removed." });
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const topicCounts: Record<string, number> = {};
  (articles || []).forEach((a) => {
    (a.topics || []).forEach((t) => {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    });
  });

  const tabs = [
    { key: "articles", label: "Articles", icon: BookOpen },
    { key: "briefs", label: "Briefs", icon: FileText },
    { key: "feeds", label: "Feeds", icon: Rss },
  ] as const;

  if (isLoading && activeTab === "articles") {
    return (
      <div style={{ maxWidth: 1100 }} className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100 }} className="space-y-4">
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                fontSize: 12,
                padding: "6px 14px",
                borderRadius: "6px 6px 0 0",
                border: `1px solid ${P.odBorder}`,
                borderBottom: activeTab === tab.key ? "none" : `1px solid ${P.odBorder}`,
                background: activeTab === tab.key ? P.odSurf : "transparent",
                color: activeTab === tab.key ? P.ink : P.lt,
                cursor: "pointer",
                fontWeight: activeTab === tab.key ? 600 : 400,
              }}
              data-testid={`tab-${tab.key}`}
            >
              <Icon style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "feeds" ? (
        <FeedManagement />
      ) : activeTab === "briefs" ? (
        <BriefLibrary />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
                <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: P.lt }} />
                <Input
                  placeholder="Search research..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 32 }}
                  data-testid="input-search-research"
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Filter style={{ width: 14, height: 14, color: P.lt }} />
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: `1px solid ${P.odBorder}`,
                    background: P.odSurf,
                    color: P.odT2,
                  }}
                  data-testid="select-topic-filter"
                >
                  <option value="">All Topics</option>
                  {(topics || []).map((t) => (
                    <option key={t} value={t}>
                      {TOPIC_LABELS[t]?.label || t}
                    </option>
                  ))}
                </select>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: `1px solid ${P.odBorder}`,
                    background: P.odSurf,
                    color: P.odT2,
                  }}
                  data-testid="select-source-filter"
                >
                  <option value="">All Sources</option>
                  {(sources || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <IngestForm onSuccess={() => {}} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[
              { label: "Total Articles", value: articles?.length || 0, icon: <BookOpen style={{ width: 14, height: 14, color: P.blue }} /> },
              { label: "AI Processed", value: articles?.filter((a) => a.aiProcessed).length || 0, icon: <RefreshCw style={{ width: 14, height: 14, color: P.grn }} /> },
              { label: "Topics Covered", value: Object.keys(topicCounts).length, icon: <Tag style={{ width: 14, height: 14, color: P.amb }} /> },
              { label: "Sources", value: new Set(articles?.map((a) => a.source)).size, icon: <Building2 style={{ width: 14, height: 14, color: P.odBg }} /> },
            ].map((s, i) => (
              <div
                key={i}
                className="animate-fu"
                style={{
                  padding: 14,
                  borderRadius: 6,
                  background: P.odSurf,
                  border: `1px solid ${P.odBorder}`,
                  animationDelay: `${i * 50}ms`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Lbl>{s.label}</Lbl>
                  {s.icon}
                </div>
                <Serif style={{ fontSize: 22, fontWeight: 600, color: P.odT1, display: "block" }}>{s.value}</Serif>
              </div>
            ))}
          </div>

          {Object.keys(topicCounts).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Lbl style={{ marginRight: 4, lineHeight: "24px" }}>Topics:</Lbl>
              {Object.entries(topicCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([topic, count]) => {
                  const t = TOPIC_LABELS[topic] || { label: topic, color: P.lt, bg: P.odSurf2 };
                  const isActive = topicFilter === topic;
                  return (
                    <button
                      key={topic}
                      onClick={() => setTopicFilter(isActive ? "" : topic)}
                      style={{
                        fontSize: 11,
                        padding: "3px 10px",
                        borderRadius: 99,
                        background: isActive ? t.color : t.bg,
                        color: isActive ? "#fff" : t.color,
                        border: "none",
                        cursor: "pointer",
                        fontWeight: isActive ? 600 : 400,
                      }}
                      data-testid={`button-topic-${topic}`}
                    >
                      {t.label} ({count})
                    </button>
                  );
                })}
            </div>
          )}

          <div>
            {(articles || []).length === 0 ? (
              <div
                style={{
                  padding: 48,
                  textAlign: "center",
                  borderRadius: 6,
                  background: P.odSurf,
                  border: `1px solid ${P.odBorder}`,
                }}
              >
                <BookOpen style={{ width: 32, height: 32, color: P.lt, margin: "0 auto 12px" }} />
                <Serif style={{ fontSize: 16, fontWeight: 600, color: P.odT2, display: "block", marginBottom: 8 }}>
                  No Research Articles
                </Serif>
                <p style={{ fontSize: 12, color: P.odT3 }}>
                  Add institutional research articles to build your research library.
                  Use the "Add Research" button to paste content from JPM, Goldman, BlackRock, and other sources,
                  or set up RSS/Atom feeds in the Feeds tab for automated ingestion.
                </p>
              </div>
            ) : (
              (articles || []).map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onReprocess={(id) => reprocessMutation.mutate(id)}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  isReprocessing={reprocessMutation.isPending}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
