import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
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
} from "lucide-react";
import type { DetectedSignalOutput, SignalWarning } from "@/hooks/use-signal-scan-job";
import { SignalActionButton } from "./signal-action-button";

interface SignalCardsProps {
  signals: DetectedSignalOutput[];
  warnings?: SignalWarning[];
  noSignalSummary?: string;
  onActionComplete?: () => void;
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

function sortSignals(signals: DetectedSignalOutput[]): DetectedSignalOutput[] {
  const materialityOrder: Record<string, number> = { CRITICAL: 0, IMPORTANT: 1 };
  const confidenceOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

  return [...signals].sort((a, b) => {
    const matDiff = (materialityOrder[a.materiality] ?? 2) - (materialityOrder[b.materiality] ?? 2);
    if (matDiff !== 0) return matDiff;
    return (confidenceOrder[a.confidence] ?? 3) - (confidenceOrder[b.confidence] ?? 3);
  });
}

export function SignalCards({ signals, warnings, noSignalSummary, onActionComplete }: SignalCardsProps) {
  const sorted = sortSignals(signals);

  if (signals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center" data-testid="signals-empty-state">
        <Info className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">
          {noSignalSummary || "No signals detected in this meeting"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="signal-cards-list">
      {warnings && warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <Alert key={i} variant={w.severity === "critical" ? "destructive" : "default"} data-testid={`signal-warning-${i}`}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{w.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((signal, idx) => (
          <SignalCard
            key={signal.id || idx}
            signal={signal}
            onActionComplete={onActionComplete}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
}

function SignalCard({
  signal,
  onActionComplete,
  index,
}: {
  signal: DetectedSignalOutput;
  onActionComplete?: () => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const Icon = SIGNAL_TYPE_ICONS[signal.signal_type] || (signal.materiality === "CRITICAL" ? AlertCircle : Info);
  const hasDetails = signal.review_required || signal.duplicate_likelihood || signal.reasoning;

  return (
    <Card className={`${MATERIALITY_STYLES[signal.materiality] || ""} overflow-hidden`} data-testid={`signal-card-${index}`}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm leading-snug" data-testid={`signal-description-${index}`}>
                {signal.description}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <Badge className={`text-[10px] px-1.5 py-0 no-default-active-elevate ${MATERIALITY_BADGE[signal.materiality] || ""}`}>
                  {signal.materiality}
                </Badge>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {signal.signal_type.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>
          <Badge className={`text-[10px] px-1.5 py-0 shrink-0 no-default-active-elevate ${CONFIDENCE_STYLES[signal.confidence] || ""}`} data-testid={`signal-confidence-${index}`}>
            {signal.confidence}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 space-y-2">
        {signal.source_snippet && (
          <div className="border-l-2 border-muted-foreground/30 pl-3 py-1 bg-muted/30 rounded-r text-xs italic text-muted-foreground" data-testid={`signal-snippet-${index}`}>
            "{signal.source_snippet}"
          </div>
        )}

        {signal.date_reference && (
          <p className="text-[11px] text-muted-foreground" data-testid={`signal-date-${index}`}>
            Mentioned: {signal.date_reference}
          </p>
        )}

        {signal.recommended_actions && signal.recommended_actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {signal.recommended_actions.map((action, idx) => (
              <SignalActionButton
                key={idx}
                signal={signal}
                action={action}
                onActionComplete={onActionComplete}
              />
            ))}
          </div>
        )}

        {hasDetails && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 pt-1"
              data-testid={`signal-details-toggle-${index}`}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Details
            </button>

            {expanded && (
              <div className="border-t pt-2 space-y-1.5 text-[11px] text-muted-foreground" data-testid={`signal-details-${index}`}>
                {signal.review_required && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    <span>Review required</span>
                  </div>
                )}
                {signal.duplicate_likelihood && (
                  <p>Duplicate likelihood: <span className="font-medium">{signal.duplicate_likelihood}</span></p>
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
