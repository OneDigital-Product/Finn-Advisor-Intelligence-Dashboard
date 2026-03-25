import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { SignalDetailCard } from "./signal-detail-card";
import type { ProactiveSignal } from "@/hooks/use-proactive-signals";

const SECTION_LABELS: Record<string, string> = {
  overview: "Overview",
  meetings: "Meetings",
  portfolio: "Portfolio",
  "asset-map": "Asset Map",
  retirement: "Retirement",
  "tax-strategy": "Tax Strategy",
  goals: "Goals & Buckets",
  estate: "Estate Planning",
  "business-succession": "Business Succession",
  philanthropy: "Philanthropy",
  "philanthropy-planning": "Philanthropic Planning",
  "direct-indexing": "Direct Indexing",
  documents: "Documents",
  compliance: "Compliance",
  reports: "Reports",
  withdrawals: "Withdrawals",
  validator: "Pre-Case Check",
  insights: "Insights",
  diagnostics: "AI Assessment",
  behavioral: "Behavioral",
  "social-intel": "Social Intel",
  onboarding: "Onboarding",
  "planning-intelligence": "Planning Intel",
};

interface ProactiveSignalsBannerProps {
  signals: ProactiveSignal[];
  signalsBySection: Record<string, ProactiveSignal[]>;
  onNavigateToSection: (sectionId: string) => void;
}

export function ProactiveSignalsBanner({
  signals,
  signalsBySection,
  onNavigateToSection,
}: ProactiveSignalsBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const criticalCount = signals.filter((s) => s.materiality === "CRITICAL").length;
  const sectionsWithSignals = Object.entries(signalsBySection).filter(([, sigs]) => sigs.length > 0);

  return (
    <div
      className={`rounded-lg border ${criticalCount > 0 ? "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" : "border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"} overflow-hidden animate-in slide-in-from-top-2 duration-300`}
      data-testid="proactive-signals-banner"
    >
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
        onClick={() => setExpanded(!expanded)}
        data-testid="button-toggle-signals-banner"
      >
        <div className="flex items-center gap-2">
          <Zap className={`h-4 w-4 ${criticalCount > 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`} />
          <span className="text-sm font-medium">
            {signals.length} proactive signal{signals.length !== 1 ? "s" : ""} detected
          </span>
          {criticalCount > 0 && (
            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-[10px] px-1.5 py-0 no-default-active-elevate">
              {criticalCount} critical
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            across {sectionsWithSignals.length} section{sectionsWithSignals.length !== 1 ? "s" : ""}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-2" data-testid="signals-banner-expanded">
          {sectionsWithSignals.map(([sectionId, sectionSignals]) => (
            <div key={sectionId} className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-2 text-sm hover:text-foreground transition-colors"
                  onClick={() => setExpandedSection(expandedSection === sectionId ? null : sectionId)}
                  data-testid={`button-expand-section-signals-${sectionId}`}
                >
                  <AlertCircle className={`h-3.5 w-3.5 ${sectionSignals.some((s) => s.materiality === "CRITICAL") ? "text-red-500" : "text-amber-500"}`} />
                  <span className="font-medium">{SECTION_LABELS[sectionId] || sectionId}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 no-default-active-elevate">
                    {sectionSignals.length}
                  </Badge>
                  {expandedSection === sectionId ? (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={() => onNavigateToSection(sectionId)}
                  data-testid={`button-navigate-to-${sectionId}`}
                >
                  Go to section →
                </Button>
              </div>

              {expandedSection === sectionId && (
                <div className="pl-5">
                  <SignalDetailCard
                    signals={sectionSignals}
                    sectionLabel={SECTION_LABELS[sectionId] || sectionId}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
