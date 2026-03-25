import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Edit2, AlertTriangle, Undo } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Fact } from "@/hooks/use-intake-job";

export interface FactReviewState {
  status: "pending" | "approved" | "rejected" | "edited";
  editedValue?: string;
  editedNormalized?: string;
  editorNote?: string;
}

interface FactReviewCardProps {
  index: number;
  fact: Fact;
  reviewState: FactReviewState;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onReset: () => void;
}

function getConfidenceColor(confidence: string) {
  switch (confidence) {
    case "HIGH":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "LOW":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "";
  }
}

function formatFactType(type: string) {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function FactReviewCard({
  index,
  fact,
  reviewState,
  onApprove,
  onReject,
  onEdit,
  onReset,
}: FactReviewCardProps) {
  const statusIcon = {
    pending: null,
    approved: <Check className="h-5 w-5 text-green-600" />,
    rejected: <X className="h-5 w-5 text-red-600" />,
    edited: <Edit2 className="h-5 w-5 text-blue-600" />,
  }[reviewState.status];

  const statusLabel = {
    pending: "Not Reviewed",
    approved: "Approved",
    rejected: "Rejected",
    edited: "Edited",
  }[reviewState.status];

  const isPending = reviewState.status === "pending";

  return (
    <Card
      className={cn(
        "transition-colors",
        reviewState.status === "pending" && "border-border",
        reviewState.status === "approved" && "bg-green-50/50 border-green-300 dark:bg-green-900/10 dark:border-green-800",
        reviewState.status === "rejected" && "bg-red-50/50 border-red-300 dark:bg-red-900/10 dark:border-red-800",
        reviewState.status === "edited" && "bg-blue-50/50 border-blue-300 dark:bg-blue-900/10 dark:border-blue-800",
      )}
      data-testid={`review-card-${index}`}
    >
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">{formatFactType(fact.fact_type)}</p>
              <p className="text-sm font-semibold" data-testid={`text-review-label-${index}`}>{fact.fact_label}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={getConfidenceColor(fact.confidence)} data-testid={`badge-review-confidence-${index}`}>
                {fact.confidence}
              </Badge>
              {statusIcon && (
                <div title={statusLabel} data-testid={`icon-review-status-${index}`}>{statusIcon}</div>
              )}
            </div>
          </div>

          <div className="bg-muted/50 rounded p-3">
            <p className="text-xs text-muted-foreground mb-1">Extracted Value</p>
            <p className="text-sm font-medium" data-testid={`text-review-value-${index}`}>
              {reviewState.status === "edited" ? reviewState.editedValue || fact.fact_value : fact.fact_value}
            </p>
            {reviewState.status === "edited" && reviewState.editorNote && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2" data-testid={`text-review-note-${index}`}>
                Editor note: {reviewState.editorNote}
              </p>
            )}
          </div>

          {fact.source_snippet && (
            <div className="bg-muted/50 rounded p-3 text-xs italic text-muted-foreground">
              <p className="font-medium mb-1 text-foreground/70 not-italic">Source:</p>
              <p>"{fact.source_snippet}"</p>
              {fact.source_reference && (
                <p className="mt-1 not-italic">Ref: {fact.source_reference}</p>
              )}
            </div>
          )}

          {(fact.ambiguity_flag || fact.review_required) && (
            <div className="flex gap-2">
              {fact.ambiguity_flag && (
                <Badge variant="outline" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Ambiguous
                </Badge>
              )}
              {fact.review_required && (
                <Badge variant="outline" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Needs Review
                </Badge>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {isPending ? (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={onApprove}
                  className="flex-1"
                  data-testid={`button-approve-${index}`}
                >
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onEdit}
                  className="flex-1"
                  data-testid={`button-edit-${index}`}
                >
                  <Edit2 className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onReject}
                  className="flex-1"
                  data-testid={`button-reject-${index}`}
                >
                  <X className="h-4 w-4 mr-1" /> Reject
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={onReset}
                data-testid={`button-undo-${index}`}
              >
                <Undo className="h-4 w-4 mr-1" /> Undo
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
