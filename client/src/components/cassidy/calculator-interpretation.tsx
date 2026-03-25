import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Brain,
  Sparkles,
  Loader2,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useRouter } from "next/navigation";
import { P } from "@/styles/tokens";
import { TS } from "@/components/design/typography";

export interface InterpretMetric {
  label: string;
  value: string;
  tooltip: string;
  status?: "good" | "warning" | "critical";
}

export interface InterpretAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface CalculatorInterpretationProps {
  calculatorName: string;
  summary: string;
  metrics?: InterpretMetric[];
  actions?: InterpretAction[];
  results: any;
  inputs?: any;
  clientId?: string;
  insights?: string[];
  warnings?: string[];
}

const statusIcon = (status?: "good" | "warning" | "critical") => {
  if (status === "good") return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />;
  if (status === "warning") return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
  if (status === "critical") return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
  return <TrendingUp className="w-3.5 h-3.5 text-blue-500" />;
};

export function CalculatorInterpretation({
  calculatorName,
  summary,
  metrics = [],
  actions = [],
  results,
  inputs,
  clientId,
  insights = [],
  warnings = [],
}: CalculatorInterpretationProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleInterpretWithFinn = async () => {
    setLoading(true);
    try {
      const conversationId = crypto.randomUUID();
      const context = {
        calculator: calculatorName,
        summary,
        ...(inputs ? { inputs } : {}),
        outputs: results,
      };
      await apiRequest("POST", "/api/cassidy/request", {
        advisor_request: `Interpret these ${calculatorName} calculator results and provide planning recommendations.\n\nContext: ${JSON.stringify(context)}`,
        advisor_name: "Advisor",
        conversation_id: conversationId,
        client_id: clientId || null,
        source: "copilot",
        task_type: "analysis",
      });
      router.push("/copilot");
    } catch {
      router.push("/copilot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      style={{
        background: P.cream,
        border: `1px solid ${P.creamMd}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
      data-testid="calculator-interpretation-panel"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          borderBottom: expanded ? `1px solid ${P.creamMd}` : "none",
        }}
        data-testid="button-toggle-interpretation"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Lightbulb style={{ width: 16, height: 16, color: P.blue }} />
          <span style={{ fontSize: TS.body, fontWeight: 600, color: P.ink }}>
            Interpretation
          </span>
        </div>
        {expanded ? (
          <ChevronUp style={{ width: 16, height: 16, color: P.lt }} />
        ) : (
          <ChevronDown style={{ width: 16, height: 16, color: P.lt }} />
        )}
      </button>

      {expanded && (
        <CardContent style={{ padding: "16px 18px" }}>
          <p
            style={{
              fontSize: TS.supporting,
              color: P.dark,
              lineHeight: 1.6,
              marginBottom: metrics.length > 0 || insights.length > 0 ? 16 : 0,
            }}
            data-testid="text-interpretation-summary"
          >
            {summary}
          </p>

          {metrics.length > 0 && (
            <TooltipProvider>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, 1fr)`,
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {metrics.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 6,
                      background: P.creamDk,
                      border: `1px solid ${P.creamMd}`,
                    }}
                    data-testid={`metric-${i}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                      <span style={{ fontSize: TS.label, color: P.lt, textTransform: "uppercase", letterSpacing: ".04em" }}>
                        {m.label}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info style={{ width: 12, height: 12, color: P.lt, cursor: "help" }} />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[220px] text-xs">
                          {m.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {statusIcon(m.status)}
                      <span style={{ fontSize: TS.body, fontWeight: 700, color: P.dark }}>
                        {m.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
          )}

          {insights.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {insights.map((ins, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "6px 0",
                    fontSize: TS.supporting,
                    color: P.dark,
                  }}
                  data-testid={`insight-${i}`}
                >
                  <CheckCircle2 style={{ width: 14, height: 14, color: P.grn, flexShrink: 0, marginTop: 2 }} />
                  <span>{ins}</span>
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {warnings.map((w, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "6px 0",
                    fontSize: TS.supporting,
                    color: P.amb,
                  }}
                  data-testid={`warning-${i}`}
                >
                  <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Button
              onClick={handleInterpretWithFinn}
              disabled={loading}
              size="sm"
              style={{ gap: 6 }}
              data-testid="button-interpret-finn"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Brain className="w-3.5 h-3.5" />
              )}
              <Sparkles className="w-3 h-3" />
              Analyze with Finn
            </Button>

            {actions.map((a, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={a.onClick || (() => a.href && router.push(a.href))}
                style={{ gap: 4, fontSize: TS.label }}
                data-testid={`button-action-${i}`}
              >
                {a.label}
                <ArrowRight className="w-3 h-3" />
              </Button>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
