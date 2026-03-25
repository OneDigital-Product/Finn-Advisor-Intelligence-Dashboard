import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info, ChevronDown, ChevronUp, Eye, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Fact, MissingField, PossibleEntity, IntakeWarning } from "@/hooks/use-intake-job";

interface FactCardsProps {
  facts: Fact[];
  missingFields: MissingField[];
  possibleEntities: PossibleEntity[];
  warnings: IntakeWarning[];
  summary: string;
}

const FACT_TYPE_ORDER = [
  "personal_identity",
  "household",
  "relationships",
  "employment",
  "business_ownership",
  "legal_entity",
  "retirement",
  "tax",
  "assets",
  "liabilities",
  "insurance",
  "estate_beneficiary",
  "life_events",
];

function formatLabel(type: string) {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getConfidenceBadgeClass(confidence: string) {
  switch (confidence) {
    case "HIGH":
      return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700";
    case "LOW":
      return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700";
    default:
      return "";
  }
}

export function FactCards({ facts, missingFields, possibleEntities, warnings, summary }: FactCardsProps) {
  const [expandedSnippets, setExpandedSnippets] = useState<Set<string>>(new Set());

  const groupedFacts = facts.reduce(
    (acc, fact) => {
      if (!acc[fact.fact_type]) acc[fact.fact_type] = [];
      acc[fact.fact_type].push(fact);
      return acc;
    },
    {} as Record<string, Fact[]>,
  );

  const sortedTypes = Object.keys(groupedFacts).sort((a, b) => {
    const ai = FACT_TYPE_ORDER.indexOf(a);
    const bi = FACT_TYPE_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const toggleSnippet = (factId: string) => {
    setExpandedSnippets((prev) => {
      const next = new Set(prev);
      if (next.has(factId)) {
        next.delete(factId);
      } else {
        next.add(factId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6" data-testid="intake-fact-cards">
      {summary && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm mb-2">Summary</h3>
            <p className="text-sm text-muted-foreground" data-testid="text-intake-summary">{summary}</p>
          </CardContent>
        </Card>
      )}

      {warnings && warnings.length > 0 && (
        <div className="space-y-2" data-testid="intake-warnings">
          <h3 className="font-semibold text-sm">Warnings & Alerts</h3>
          {warnings.map((warning, idx) => (
            <Alert key={idx} variant={warning.severity === "critical" ? "destructive" : "default"} data-testid={`alert-warning-${idx}`}>
              {warning.severity === "critical" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                <span className="font-medium">[{warning.severity.toUpperCase()}]</span> {warning.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {sortedTypes.length > 0 && (
        <div className="space-y-4" data-testid="intake-facts-grouped">
          <h3 className="font-semibold text-sm">Extracted Facts ({facts.length})</h3>
          {sortedTypes.map((type) => (
            <div key={type} data-testid={`fact-group-${type}`}>
              <div className="bg-muted px-4 py-3 rounded-t-lg border border-border">
                <h4 className="font-medium text-sm">
                  {formatLabel(type)}{" "}
                  <span className="text-muted-foreground font-normal">({groupedFacts[type].length})</span>
                </h4>
              </div>
              <div className="space-y-3 p-4 border border-t-0 border-border rounded-b-lg">
                {groupedFacts[type].map((fact, idx) => {
                  const factId = `${type}-${idx}`;
                  const isExpanded = expandedSnippets.has(factId);

                  return (
                    <div key={factId} className="border-l-4 border-muted-foreground/20 pl-4 pb-3 last:pb-0" data-testid={`fact-card-${factId}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">{fact.fact_label}</p>
                          <p className="text-sm font-medium" data-testid={`text-fact-value-${factId}`}>{fact.fact_value}</p>
                          {fact.normalized_value && fact.normalized_value !== fact.fact_value && (
                            <p className="text-xs text-muted-foreground mt-0.5">Normalized: {fact.normalized_value}</p>
                          )}
                        </div>
                        <Badge className={cn("shrink-0", getConfidenceBadgeClass(fact.confidence))} data-testid={`badge-confidence-${factId}`}>
                          {fact.confidence}
                        </Badge>
                      </div>

                      <div className="mt-2">
                        {isExpanded ? (
                          <div className="bg-muted rounded p-2 text-xs text-muted-foreground italic">
                            <p>"{fact.source_snippet}"</p>
                            <p className="mt-1 not-italic">Ref: {fact.source_reference}</p>
                            <button
                              onClick={() => toggleSnippet(factId)}
                              className="flex items-center gap-1 text-primary hover:underline cursor-pointer mt-1 not-italic"
                              data-testid={`button-collapse-snippet-${factId}`}
                            >
                              <ChevronUp className="h-3 w-3" />
                              Hide source
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleSnippet(factId)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                            data-testid={`button-expand-snippet-${factId}`}
                          >
                            <ChevronDown className="h-3 w-3" />
                            View source snippet
                          </button>
                        )}
                      </div>

                      {(fact.ambiguity_flag || fact.review_required) && (
                        <div className="mt-2 flex gap-2">
                          {fact.ambiguity_flag && (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-ambiguity-${factId}`}>
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Ambiguity
                            </Badge>
                          )}
                          {fact.review_required && (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-review-${factId}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              Needs Review
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {missingFields && missingFields.length > 0 && (
        <Alert data-testid="intake-missing-fields">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Missing Information</p>
            <ul className="text-sm space-y-1 ml-4">
              {missingFields.map((field, idx) => (
                <li key={idx}>
                  <span className="font-medium">{field.category}:</span> {field.reason}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {possibleEntities && possibleEntities.length > 0 && (
        <Card data-testid="intake-possible-entities">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm mb-3">Possible Entities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {possibleEntities.map((entity, idx) => (
                <div key={idx} className="border border-border rounded p-3" data-testid={`entity-card-${idx}`}>
                  <p className="font-medium text-sm">{entity.entity_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{entity.entity_type}</p>
                  <p className="text-xs mt-1">Role: {entity.entity_role}</p>
                  <Badge className={cn("mt-2", getConfidenceBadgeClass(entity.confidence))} variant="outline">
                    {entity.confidence}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
