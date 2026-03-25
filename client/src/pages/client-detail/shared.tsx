import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SignalBadgePopover } from "@/components/cassidy/signal-detail-card";
import type { ProactiveSignal } from "@/hooks/use-proactive-signals";
import { P, EASE } from "@/styles/tokens";
import {
  Calendar,
  Briefcase,
  Heart,
  AlertTriangle,
  ChevronDown,
  LayoutDashboard,
  PieChart as PieChartIcon,
  TrendingUp,
  FileText,
  Shield,
  Brain,
  ListTodo,
  ClipboardList,
  ScrollText,
  Receipt,
  Banknote,
  ShieldAlert,
  Check,
  GitBranch,
  Target,
  CircleDot,
  CircleCheck,
  Type,
  List,
  CornerDownRight,
  Map,
  Building2,
  HandHeart,
  BarChart3,
  Rocket,
  Zap,
  Search,
  Clock,
} from "lucide-react";
const salesforceLogo = "/salesforce-logo.png";
const orionLogo = "/orion_logo_no_bg.png";

export const BASE_NAV_GROUPS = [
  {
    label: "Overview",
    phase: 1,
    sections: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
    ],
  },
  {
    label: "Meetings",
    phase: 1,
    sections: [
      { id: "meetings", label: "Meetings", icon: Calendar },
    ],
  },
  {
    label: "Financial",
    phase: 1,
    sections: [
      { id: "portfolio", label: "Portfolio", icon: PieChartIcon },
      { id: "asset-map", label: "Asset Map", icon: Map },
    ],
  },
  {
    label: "Documents",
    phase: 1,
    sections: [
      { id: "documents", label: "Documents", icon: FileText },
    ],
  },
  {
    label: "Insurance",
    phase: 1,
    sections: [
      { id: "insurance", label: "P&C Review", icon: Shield },
    ],
  },
  {
    label: "Intelligence",
    phase: 1,
    sections: [
      { id: "intelligence", label: "Intelligence", icon: Brain },
    ],
  },
  {
    label: "Planning",
    sections: [
      { id: "retirement", label: "Retirement", icon: TrendingUp },
      { id: "tax-strategy", label: "Tax Strategy", icon: Receipt },
      { id: "goals", label: "Goals & Buckets", icon: Target },
      { id: "estate", label: "Estate", icon: ScrollText },
      { id: "business-succession", label: "Business Succession", icon: Building2 },
      { id: "philanthropy", label: "Philanthropy", icon: HandHeart },
      { id: "direct-indexing", label: "Direct Indexing", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    sections: [
      { id: "compliance", label: "Compliance", icon: Shield },
      { id: "reports", label: "Reports", icon: ClipboardList },
      { id: "withdrawals", label: "Withdrawals", icon: Banknote },
      { id: "validator", label: "Pre-Case Check", icon: ShieldAlert },
      { id: "onboarding", label: "Onboarding", icon: Rocket },
    ],
  },
  {
    label: "Analytics",
    sections: [
      { id: "behavioral", label: "Behavioral", icon: Heart },
      { id: "social-intel", label: "Social Intel", icon: GitBranch },
      { id: "planning-intelligence", label: "Planning Intel", icon: Zap },
    ],
  },
];

export const MOBILE_TASKS_GROUP = {
  label: "Tasks",
  sections: [
    { id: "tasks", label: "Tasks", icon: ListTodo },
  ],
};

export function ClientDetailNav({
  activeSection,
  onSectionChange,
  navGroups,
  signalCounts,
  signalsBySection,
}: {
  activeSection: string;
  onSectionChange: (s: string) => void;
  navGroups: typeof BASE_NAV_GROUPS;
  signalCounts?: Record<string, number>;
  signalsBySection?: Record<string, ProactiveSignal[]>;
}) {
  const activeGroup = navGroups.find(g => g.sections.some(s => s.id === activeSection));

  const getGroupSignalCount = (group: typeof BASE_NAV_GROUPS[0]) => {
    if (!signalCounts) return 0;
    return group.sections.reduce((sum, s) => sum + (signalCounts[s.id] || 0), 0);
  };

  const getGroupSignals = (group: typeof BASE_NAV_GROUPS[0]): ProactiveSignal[] => {
    if (!signalsBySection) return [];
    return group.sections.flatMap((s) => signalsBySection[s.id] || []);
  };

  return (
    <div className="space-y-2" data-testid="nav-client-detail">
      <div className="flex flex-wrap gap-1.5">
        {navGroups.map((group) => {
          const isActive = activeGroup?.label === group.label;
          const isSingleSection = group.sections.length === 1;
          const groupSignalCount = getGroupSignalCount(group);
          const groupSignals = getGroupSignals(group);
          const isAdminGroup = !(group as any).phase;
          return (
            <div key={group.label} className="relative">
              <Button
                variant={isActive ? "default" : "secondary"}
                size="sm"
                onClick={() => onSectionChange(group.sections[0].id)}
                data-testid={`nav-group-${group.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-full"
                style={isAdminGroup && !isActive ? { opacity: 0.6 } : undefined}
              >
                {group.label}
                {!isSingleSection && (
                  <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform ${isActive ? "rotate-180" : ""}`} />
                )}
              </Button>
              {groupSignalCount > 0 && (
                <SignalBadgePopover signals={groupSignals} sectionLabel={group.label}>
                  <span
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold px-1 shadow-sm animate-in fade-in zoom-in duration-300 cursor-pointer"
                    data-testid={`signal-badge-group-${group.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {groupSignalCount}
                  </span>
                </SignalBadgePopover>
              )}
            </div>
          );
        })}
      </div>
      {activeGroup && activeGroup.sections.length > 1 && (
        <div className="flex gap-1 pl-1" data-testid="nav-section-buttons">
          {activeGroup.sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const sectionSignalCount = signalCounts?.[section.id] || 0;
            const sectionSignals = signalsBySection?.[section.id] || [];
            return (
              <div key={section.id} className="relative">
                <Button
                  variant={isActive ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => onSectionChange(section.id)}
                  data-testid={`tab-${section.id}`}
                >
                  <Icon className="w-3.5 h-3.5 mr-1.5" />
                  {section.label}
                </Button>
                {sectionSignalCount > 0 && (
                  <SignalBadgePopover signals={sectionSignals} sectionLabel={section.label}>
                    <span
                      className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-amber-500 text-white text-[10px] font-bold px-0.5 shadow-sm animate-in fade-in zoom-in duration-300 cursor-pointer"
                      data-testid={`signal-badge-${section.id}`}
                    >
                      {sectionSignalCount}
                    </span>
                  </SignalBadgePopover>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SourcePill({ source }: { source: string }) {
  const configs: Record<string, { bg: string; logo: string | null; alt: string; label: string; imgClass: string }> = {
    salesforce: {
      bg: "bg-[#00A1E0]/10 text-[#00A1E0] dark:bg-[#00A1E0]/20 dark:text-[#7DD9F9]",
      logo: salesforceLogo,
      alt: "Salesforce",
      label: "Salesforce",
      imgClass: "w-3.5 h-2.5 object-contain",
    },
    orion: {
      bg: "bg-[#00B4E6]/10 text-[#00B4E6] dark:bg-[#00B4E6]/20 dark:text-[#7DE0F5]",
      logo: orionLogo,
      alt: "Orion",
      label: "Orion",
      imgClass: "w-2.5 h-2.5 object-contain",
    },
    "yahoo-finance": {
      bg: "bg-[#6001D2]/10 text-[#6001D2] dark:bg-[#6001D2]/20 dark:text-[#A855F7]",
      logo: null,
      alt: "Yahoo Finance",
      label: "Yahoo Finance",
      imgClass: "",
    },
  };
  const config = configs[source] ?? {
    bg: "bg-muted/10 text-muted-foreground",
    logo: null,
    alt: source,
    label: source,
    imgClass: "",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase ${config.bg}`}
      data-testid={`pill-source-${source}`}
    >
      {config.logo ? (
        <img src={config.logo} alt={config.alt} className={config.imgClass} />
      ) : (
        <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="currentColor">
          <path d="M2.87 7.384l7.06 10.492L9.72 18.4 2 7.383h.87zm4.27 0L14.2 17.876 17.46 22H15.6l-3.06-3.83L5.28 7.384h1.86zm3.17 0l2.84 4.27 6.58-4.27h-2.66l-4.6 3.07L9.73 7.384h.58zm11.06 0h-.87l-5.84 3.87 1.67 2.51L21.37 7.384z" />
        </svg>
      )}
      {config.label}
    </span>
  );
}

export { formatCurrency } from "@/lib/format";

export const COLORS = [
  "hsl(213, 72%, 35%)",
  "hsl(168, 55%, 38%)",
  "hsl(250, 45%, 50%)",
  "hsl(28, 70%, 50%)",
  "hsl(340, 55%, 45%)",
  "hsl(190, 60%, 40%)",
  "hsl(120, 40%, 45%)",
  "hsl(0, 0%, 55%)",
];

export const COLORS_THEMED: { light: string; dark: string }[] = [
  { light: "hsl(224, 85%, 49%)", dark: "hsl(24, 100%, 55%)" },
  { light: "hsl(174, 100%, 29%)", dark: "hsl(160, 72%, 45%)" },
  { light: "hsl(196, 73%, 23%)", dark: "hsl(43, 100%, 50%)" },
  { light: "hsl(269, 100%, 65%)", dark: "hsl(40, 90%, 55%)" },
  { light: "hsl(37, 100%, 49%)", dark: "hsl(330, 100%, 64%)" },
  { light: "hsl(200, 65%, 40%)", dark: "hsl(200, 65%, 55%)" },
  { light: "hsl(150, 50%, 38%)", dark: "hsl(150, 50%, 50%)" },
  { light: "hsl(0, 0%, 50%)", dark: "hsl(0, 0%, 65%)" },
];

export function eventIcon(type: string) {
  switch (type) {
    case "birthday": return <Calendar className="w-3.5 h-3.5 text-chart-4" />;
    case "retirement": return <Briefcase className="w-3.5 h-3.5 text-chart-2" />;
    case "birth": return <Heart className="w-3.5 h-3.5 text-chart-5" />;
    case "divorce": return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
    case "death": return <Heart className="w-3.5 h-3.5 text-muted-foreground" />;
    default: return <Calendar className="w-3.5 h-3.5 text-chart-1" />;
  }
}

export function getReachableSteps(steps: any[]): any[] {
  const hasIds = steps.some((s: any) => s.id);
  if (!hasIds) return steps;

  const incomingIds = new Set<string>();
  for (const st of steps) {
    for (const targetId of Object.values(st.connections || {})) {
      incomingIds.add(targetId as string);
    }
  }
  const roots = steps.filter((s: any) => !incomingIds.has(s.id));
  if (roots.length === 0) return steps;

  const reachable: any[] = [];
  const visited = new Set<string>();
  const queue = roots.map((r: any) => r.id);
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const step = steps.find((s: any) => s.id === id);
    if (!step) continue;
    reachable.push(step);
    if (step.completed && step.connections) {
      if (step.outputType === "choice" && step.response) {
        const nextId = step.connections[step.response];
        if (nextId) queue.push(nextId);
      } else {
        const nextId = step.connections["next"];
        if (nextId) queue.push(nextId);
      }
    }
  }
  return reachable;
}

export function WorkflowInstanceCard({ wf, toggleStepMutation }: { wf: any; toggleStepMutation: any }) {
  const allSteps = (wf.steps || []) as any[];
  const hasBranching = allSteps.some((s: any) => s.id && (s.outputType === "choice" || s.outputType === "freetext"));
  const visibleSteps = hasBranching ? getReachableSteps(allSteps) : allSteps;
  const completedCount = visibleSteps.filter((s: any) => s.completed).length;
  const progressPct = visibleSteps.length > 0 ? Math.round((completedCount / visibleSteps.length) * 100) : 0;
  const isCompleted = wf.status === "completed";

  const [freetextInputs, setFreetextInputs] = useState<Record<string, string>>({});

  return (
    <div className="border rounded-lg" data-testid={`workflow-instance-${wf.id}`}>
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CircleCheck className="w-5 h-5 text-green-600" />
            ) : (
              <CircleDot className="w-5 h-5 text-blue-600" />
            )}
            <div>
              <h4 className="font-medium text-sm">{wf.templateName}</h4>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span>Started {wf.startedAt}</span>
                {wf.completedAt && <span>Completed {wf.completedAt}</span>}
                {wf.assignedBy && <span>By {wf.assignedBy}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasBranching && (
              <Badge variant="outline" className="text-[10px]">
                <GitBranch className="w-3 h-3 mr-0.5" />
                Branching
              </Badge>
            )}
            <Badge
              variant={isCompleted ? "default" : "secondary"}
              className=""
              data-testid={`badge-workflow-status-${wf.id}`}
            >
              {isCompleted ? "Completed" : `${completedCount}/${visibleSteps.length}`}
            </Badge>
          </div>
        </div>
        <Progress value={progressPct} className="mt-3 h-1.5" />
      </div>
      <div className="divide-y">
        {visibleSteps.map((step: any) => {
          const i = allSteps.findIndex((s: any) => (s.id && s.id === step.id) || s === step);
          const isNextActionable = !step.completed && visibleSteps.every(
            (s: any) => s === step || s.completed || visibleSteps.indexOf(s) > visibleSteps.indexOf(step)
          );
          return (
            <div
              key={step.id || i}
              className={`p-3 ${step.completed ? "bg-muted/20" : ""}`}
              data-testid={`workflow-step-${wf.id}-${i}`}
            >
              <div className="flex items-start gap-3">
                {step.outputType === "choice" && !step.completed ? (
                  <div className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 border-purple-400 shrink-0">
                    <List className="w-3 h-3 text-purple-500" />
                  </div>
                ) : (
                  <button
                    className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
                      step.completed
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/30 hover:border-primary"
                    }`}
                    onClick={() => {
                      if (step.outputType === "freetext" && !step.completed) {
                        const text = freetextInputs[step.id || i] || "";
                        toggleStepMutation.mutate({
                          workflowId: wf.id,
                          stepIndex: i,
                          completed: true,
                          response: text || null,
                        });
                      } else {
                        toggleStepMutation.mutate({
                          workflowId: wf.id,
                          stepIndex: i,
                          completed: !step.completed,
                          response: step.completed ? null : undefined,
                        });
                      }
                    }}
                    disabled={toggleStepMutation.isPending}
                    data-testid={`button-toggle-step-${wf.id}-${i}`}
                  >
                    {step.completed && <Check className="w-3 h-3" />}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${step.completed ? "line-through text-muted-foreground" : ""}`}>
                      {step.title}
                    </span>
                    {step.outputType === "freetext" && (
                      <Type className="w-3 h-3 text-blue-500 shrink-0" />
                    )}
                    {step.outputType === "choice" && (
                      <List className="w-3 h-3 text-purple-500 shrink-0" />
                    )}
                  </div>
                  {step.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>
                  )}
                  {step.completed && step.response && (
                    <div className="mt-1.5 flex items-start gap-1.5">
                      <CornerDownRight className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">
                        {step.response}
                      </span>
                    </div>
                  )}
                  {step.completedAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Completed {step.completedAt}
                    </div>
                  )}

                  {!step.completed && step.outputType === "freetext" && (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        value={freetextInputs[step.id || i] || ""}
                        onChange={(e) =>
                          setFreetextInputs((prev) => ({ ...prev, [step.id || i]: e.target.value }))
                        }
                        placeholder="Enter response..."
                        className="h-8 text-sm flex-1 max-w-sm"
                        data-testid={`input-freetext-${wf.id}-${i}`}
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={toggleStepMutation.isPending}
                        onClick={() => {
                          toggleStepMutation.mutate({
                            workflowId: wf.id,
                            stepIndex: i,
                            completed: true,
                            response: freetextInputs[step.id || i] || null,
                          });
                        }}
                        data-testid={`button-submit-freetext-${wf.id}-${i}`}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Submit
                      </Button>
                    </div>
                  )}

                  {!step.completed && step.outputType === "choice" && (step.choices || []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(step.choices as string[]).map((choice: string, ci: number) => (
                        <Button
                          key={ci}
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={toggleStepMutation.isPending}
                          onClick={() => {
                            toggleStepMutation.mutate({
                              workflowId: wf.id,
                              stepIndex: i,
                              completed: true,
                              response: choice,
                            });
                          }}
                          data-testid={`button-choice-${wf.id}-${i}-${ci}`}
                        >
                          {choice}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground mt-0.5 shrink-0">
                  Step {step.stepNumber}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const RECENT_SECTIONS_KEY = "od-recent-sections";
const MAX_RECENT = 4;

function getRecentSections(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SECTIONS_KEY) || "[]");
  } catch { return []; }
}

function pushRecentSection(id: string) {
  const recent = getRecentSections().filter(s => s !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_SECTIONS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function ClientDetailSidebar({
  activeSection,
  onSectionChange,
  navGroups,
  signalCounts,
  signalsBySection,
}: {
  activeSection: string;
  onSectionChange: (s: string) => void;
  navGroups: typeof BASE_NAV_GROUPS;
  signalCounts?: Record<string, number>;
  signalsBySection?: Record<string, ProactiveSignal[]>;
}) {
  const [search, setSearch] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>(getRecentSections);

  const handleSelect = useCallback((id: string) => {
    onSectionChange(id);
    pushRecentSection(id);
    setRecentIds(getRecentSections());
  }, [onSectionChange]);

  const allSections = useMemo(() =>
    navGroups.flatMap(g => g.sections.map(s => ({ ...s, group: g.label }))),
    [navGroups]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return allSections.filter(s =>
      s.label.toLowerCase().includes(q) || s.group.toLowerCase().includes(q)
    );
  }, [search, allSections]);

  const recentSections = useMemo(() =>
    recentIds
      .map(id => allSections.find(s => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s && s.id !== activeSection),
    [recentIds, allSections, activeSection]
  );

  return (
    <div
      className="shrink-0"
      style={{
        width: 220,
        minWidth: 180,
        background: P.odSurf,
        borderRadius: 10,
        border: `1px solid ${P.odBorder2}`,
        padding: "12px 0",
        alignSelf: "flex-start",
        position: "sticky",
        top: 16,
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        transition: `all .2s ${EASE}`,
      }}
      data-testid="sidebar-client-detail"
    >
      <div style={{ padding: "0 12px 10px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: P.odSurf2, borderRadius: 6, padding: "6px 10px",
          border: `1px solid ${P.odBorder2}`,
        }}>
          <Search style={{ width: 13, height: 13, color: P.odT3, flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search sections..."
            style={{
              border: "none", background: "none", outline: "none",
              fontSize: 12, color: P.odT1, width: "100%",
              fontFamily: "'Inter', sans-serif",
            }}
            data-testid="input-sidebar-search"
          />
        </div>
      </div>

      {filtered ? (
        <div style={{ padding: "0 6px" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "16px 8px", textAlign: "center", fontSize: 11, color: P.odT3 }}>
              No matching sections
            </div>
          )}
          {filtered.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const count = signalCounts?.[section.id] || 0;
            return (
              <button
                key={section.id}
                onClick={() => handleSelect(section.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "7px 10px", borderRadius: 6,
                  border: "none", cursor: "pointer", textAlign: "left",
                  fontSize: 12, fontWeight: isActive ? 600 : 400,
                  fontFamily: "'Inter', sans-serif",
                  background: isActive ? "rgba(79,179,205,0.07)" : "transparent",
                  color: isActive ? P.odLBlue : P.odT2,
                  transition: `all .15s ${EASE}`,
                  position: "relative",
                }}
                data-testid={`sidebar-item-${section.id}`}
              >
                {isActive && (
                  <div style={{
                    position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                    width: 2, height: 18, borderRadius: 2, background: P.odLBlue,
                  }} />
                )}
                <Icon style={{ width: 14, height: 14, opacity: isActive ? 1 : 0.6, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{section.label}</span>
                {count > 0 && (
                  <span style={{
                    minWidth: 16, height: 16, borderRadius: 8, fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: P.odOrange, color: "#fff", padding: "0 4px",
                  }}>
                    {count}
                  </span>
                )}
                <span style={{ fontSize: 10, color: P.odT4 }}>{section.group}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          {recentSections.length > 0 && (
            <div style={{ padding: "0 6px", marginBottom: 8 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: P.odT4, textTransform: "uppercase",
                letterSpacing: ".1em", padding: "4px 10px 4px",
                display: "flex", alignItems: "center", gap: 4,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <Clock style={{ width: 10, height: 10 }} /> Recent
              </div>
              {recentSections.slice(0, 3).map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSelect(section.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      width: "100%", padding: "5px 10px", borderRadius: 6,
                      border: "none", cursor: "pointer", textAlign: "left",
                      fontSize: 11, color: P.odT3,
                      fontFamily: "'Inter', sans-serif",
                      background: "transparent",
                      transition: `all .15s ${EASE}`,
                    }}
                    data-testid={`sidebar-recent-${section.id}`}
                  >
                    <Icon style={{ width: 12, height: 12, opacity: 0.6 }} />
                    <span>{section.label}</span>
                  </button>
                );
              })}
              <div style={{ borderBottom: `1px solid ${P.odBorder2}`, margin: "6px 10px 2px" }} />
            </div>
          )}

          {navGroups.map(group => {
            const groupSignals = signalsBySection
              ? group.sections.flatMap(s => signalsBySection[s.id] || [])
              : [];
            const groupCount = signalCounts
              ? group.sections.reduce((sum, s) => sum + (signalCounts[s.id] || 0), 0)
              : 0;
            const isAdminGroup = !(group as any).phase;

            return (
              <div key={group.label} style={{ padding: "0 6px", marginBottom: 4 }}>
                {isAdminGroup && (
                  <div style={{ borderTop: `1px solid ${P.odBorder2}`, margin: "8px 10px 4px" }} />
                )}
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: isAdminGroup ? P.odT4 : P.odT4,
                  textTransform: "uppercase",
                  letterSpacing: ".1em", padding: "6px 10px 2px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  opacity: isAdminGroup ? 0.6 : 1,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <span>{group.label}</span>
                  {groupCount > 0 && (
                    <SignalBadgePopover signals={groupSignals} sectionLabel={group.label}>
                      <span
                        style={{
                          minWidth: 14, height: 14, borderRadius: 7, fontSize: 10, fontWeight: 700,
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          background: P.odOrange, color: "#fff", padding: "0 3px", cursor: "pointer",
                        }}
                        data-testid={`sidebar-signal-${group.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {groupCount}
                      </span>
                    </SignalBadgePopover>
                  )}
                </div>
                {group.sections.map(section => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  const count = signalCounts?.[section.id] || 0;
                  const sectionSignals = signalsBySection?.[section.id] || [];
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSelect(section.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", padding: "7px 10px", borderRadius: 6,
                        border: "none", cursor: "pointer", textAlign: "left",
                        fontSize: 12, fontWeight: isActive ? 600 : 400,
                        fontFamily: "'Inter', sans-serif",
                        background: isActive ? "rgba(79,179,205,0.07)" : "transparent",
                        color: isActive ? P.odLBlue : P.odT2,
                        transition: `all .15s ${EASE}`,
                        position: "relative",
                        opacity: isAdminGroup && !isActive ? 0.6 : 1,
                      }}
                      data-testid={`sidebar-item-${section.id}`}
                    >
                      {isActive && (
                        <div style={{
                          position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                          width: 2, height: 18, borderRadius: 2, background: P.odLBlue,
                        }} />
                      )}
                      <Icon style={{ width: 14, height: 14, opacity: isActive ? 1 : 0.6, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{section.label}</span>
                      {count > 0 && (
                        <SignalBadgePopover signals={sectionSignals} sectionLabel={section.label}>
                          <span
                            style={{
                              minWidth: 16, height: 16, borderRadius: 8, fontSize: 10, fontWeight: 700,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: P.odOrange, color: "#fff", padding: "0 4px", cursor: "pointer",
                            }}
                            data-testid={`sidebar-signal-${section.id}`}
                          >
                            {count}
                          </span>
                        </SignalBadgePopover>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
