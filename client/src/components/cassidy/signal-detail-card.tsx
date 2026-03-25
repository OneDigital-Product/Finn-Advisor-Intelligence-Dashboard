import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertCircle,
  Info,
  Heart,
  Home,
  Briefcase,
  DollarSign,
  Users,
  Shield,
  Scale,
  Baby,
  Gem,
  TrendingUp,
  Building2,
  FileWarning,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { SignalActionButton } from "./signal-action-button";
import type { ProactiveSignal } from "@/hooks/use-proactive-signals";

interface SignalDetailCardProps {
  signals: ProactiveSignal[];
  sectionLabel: string;
  onClose?: () => void;
}

const SIGNAL_TYPE_ICONS: Record<string, typeof AlertCircle> = {
  retirement: TrendingUp,
  divorce: Scale,
  death: Heart,
  business_sale: Building2,
  business_acquisition: Briefcase,
  liquidity_event: DollarSign,
  concentrated_stock: TrendingUp,
  marriage: Gem,
  birth: Baby,
  relocation: Home,
  beneficiary_change: Users,
  trust_estate_change: Shield,
  employment_change: Briefcase,
  insurance_need: FileWarning,
  legal_entity_change: Scale,
};

const MATERIALITY_STYLES: Record<string, string> = {
  CRITICAL: "border-l-4 border-l-red-600 dark:border-l-red-500",
  IMPORTANT: "border-l-4 border-l-amber-500 dark:border-l-amber-400",
};

const CONFIDENCE_STYLES: Record<string, string> = {
  HIGH: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  LOW: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const MATERIALITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  IMPORTANT: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

function toDetectedSignalOutput(signal: ProactiveSignal) {
  return {
    id: signal.id,
    signal_type: signal.signalType,
    description: signal.description,
    confidence: signal.confidence as "HIGH" | "MEDIUM" | "LOW",
    materiality: signal.materiality as "CRITICAL" | "IMPORTANT",
    source_snippet: signal.sourceSnippet || undefined,
    date_reference: signal.dateReference || undefined,
    recommended_actions: signal.recommendedActions || undefined,
    review_required: signal.reviewRequired,
    duplicate_likelihood: signal.duplicateLikelihood || undefined,
    reasoning: signal.reasoning || undefined,
  };
}

export function SignalDetailCard({ signals, sectionLabel, onClose }: SignalDetailCardProps) {
  const sorted = [...signals].sort((a, b) => {
    const matOrder: Record<string, number> = { CRITICAL: 0, IMPORTANT: 1 };
    const matDiff = (matOrder[a.materiality] ?? 2) - (matOrder[b.materiality] ?? 2);
    if (matDiff !== 0) return matDiff;
    const confOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (confOrder[a.confidence] ?? 3) - (confOrder[b.confidence] ?? 3);
  });

  return (
    <div className="space-y-2" data-testid="signal-detail-card">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {sorted.length} Signal{sorted.length !== 1 ? "s" : ""} — {sectionLabel}
        </h4>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onClose} data-testid="button-close-signal-detail">
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      {sorted.map((signal, idx) => (
        <SignalDetailItem key={signal.id || idx} signal={signal} index={idx} />
      ))}
    </div>
  );
}

function SignalDetailItem({ signal, index }: { signal: ProactiveSignal; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = SIGNAL_TYPE_ICONS[signal.signalType] || (signal.materiality === "CRITICAL" ? AlertCircle : Info);
  const hasDetails = signal.reviewRequired || signal.duplicateLikelihood || signal.reasoning;
  const converted = toDetectedSignalOutput(signal);

  return (
    <Card className={`${MATERIALITY_STYLES[signal.materiality] || ""} overflow-hidden`} data-testid={`signal-detail-item-${index}`}>
      <CardHeader className="pb-1.5 pt-2.5 px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xs leading-snug" data-testid={`signal-detail-description-${index}`}>
                {signal.description}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge className={`text-[9px] px-1 py-0 no-default-active-elevate ${MATERIALITY_BADGE[signal.materiality] || ""}`}>
                  {signal.materiality}
                </Badge>
                <Badge className={`text-[9px] px-1 py-0 no-default-active-elevate ${CONFIDENCE_STYLES[signal.confidence] || ""}`}>
                  {signal.confidence}
                </Badge>
                <span className="text-[9px] text-muted-foreground capitalize">
                  {signal.signalType.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-2.5 space-y-1.5">
        {signal.sourceSnippet && (
          <div className="border-l-2 border-muted-foreground/30 pl-2 py-0.5 bg-muted/30 rounded-r text-[10px] italic text-muted-foreground">
            "{signal.sourceSnippet}"
          </div>
        )}

        {signal.recommendedActions && Array.isArray(signal.recommendedActions) && signal.recommendedActions.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {signal.recommendedActions.map((action: { action_type: string; description: string }, idx: number) => (
              <SignalActionButton
                key={idx}
                signal={converted}
                action={action}
              />
            ))}
          </div>
        )}

        {hasDetails && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              data-testid={`signal-detail-toggle-${index}`}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Details
            </button>
            {expanded && (
              <div className="border-t pt-1.5 space-y-1 text-[10px] text-muted-foreground">
                {signal.reviewRequired && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    <span>Review required</span>
                  </div>
                )}
                {signal.duplicateLikelihood && (
                  <p>Duplicate likelihood: <span className="font-medium">{signal.duplicateLikelihood}</span></p>
                )}
                {signal.reasoning && (
                  <p className="leading-relaxed">{signal.reasoning}</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface SignalBadgePopoverProps {
  signals: ProactiveSignal[];
  sectionLabel: string;
  children: React.ReactNode;
}

export function SignalBadgePopover({ signals, sectionLabel, children }: SignalBadgePopoverProps) {
  const [open, setOpen] = useState(false);

  if (signals.length === 0) return <>{children}</>;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start" data-testid="signal-badge-popover">
        <SignalDetailCard
          signals={signals}
          sectionLabel={sectionLabel}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
