import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Check,
  Send,
  MessageSquare,
  History,
  Plus,
  ArrowRight,
  FileText,
  Loader2,
  CircleCheck,
  CircleDot,
} from "lucide-react";
import { useState } from "react";

function SourcePill({ source }: { source: string }) {
  if (source === "salesforce") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M9.14 6.27c.78-.79 1.86-1.28 3.06-1.28 1.56 0 2.9.81 3.57 2.02.6-.27 1.27-.42 1.97-.42 2.69 0 4.87 2.16 4.87 4.83 0 2.66-2.18 4.82-4.87 4.82-.34 0-.67-.04-.98-.1a3.4 3.4 0 01-2.96 1.7c-.49 0-.96-.1-1.38-.29a4.28 4.28 0 01-3.72 2.17c-2.02 0-3.72-1.38-4.18-3.24-.22.04-.44.06-.67.06C1.47 16.54 0 15.08 0 13.26c0-1.26.72-2.36 1.77-2.92A4.05 4.05 0 014.8 5.8c1.15 0 2.21.48 2.96 1.27l1.38-.8z"/></svg>
        Salesforce
      </span>
    );
  }
  return null;
}

const REVIEW_STAGES = [
  { key: "draft", label: "Draft", icon: FileText },
  { key: "submitted", label: "Submitted", icon: Send },
  { key: "under_review", label: "Under Review", icon: Clock },
  { key: "approved", label: "Approved", icon: CheckCircle2 },
];

function ReviewProgressBar({ status }: { status: string }) {
  const isChangesRequested = status === "changes_requested";
  const stages = isChangesRequested
    ? [...REVIEW_STAGES.slice(0, 3), { key: "changes_requested", label: "Changes Requested", icon: MessageSquare }]
    : REVIEW_STAGES;

  const currentIndex = stages.findIndex(s => s.key === status);

  return (
    <div className="w-full" data-testid="review-progress-bar">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted mx-8" />
        <div
          className="absolute top-4 left-0 h-0.5 mx-8 transition-all duration-500"
          style={{
            width: `calc(${(currentIndex / (stages.length - 1)) * 100}% - 4rem)`,
            background: isChangesRequested
              ? 'hsl(var(--chart-4))'
              : status === "approved"
                ? 'hsl(var(--chart-2))'
                : 'hsl(213, 72%, 31%)',
          }}
        />
        {stages.map((stage, i) => {
          const isComplete = i <= currentIndex;
          const isCurrent = i === currentIndex;
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="flex flex-col items-center z-10 relative" data-testid={`review-stage-${stage.key}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCurrent && isChangesRequested
                    ? "bg-orange-100 border-orange-400 text-orange-600 dark:bg-orange-950 dark:border-orange-500 dark:text-orange-400"
                    : isCurrent && status === "approved"
                      ? "bg-green-100 border-green-500 text-green-600 dark:bg-green-950 dark:border-green-500 dark:text-green-400"
                      : isComplete
                        ? "bg-[hsl(213,72%,31%)] border-[hsl(213,72%,31%)] text-white"
                        : "bg-background border-muted-foreground/30 text-muted-foreground/50"
                }`}
              >
                {isComplete && !isCurrent ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-[10px] mt-1.5 font-medium ${
                isCurrent ? "text-foreground" : isComplete ? "text-muted-foreground" : "text-muted-foreground/50"
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ComplianceTabProps {
  clientId: string;
  complianceItems: any[];
  clientName: string;
  isAdvisor?: boolean;
  advisorName: string;
}

export default function ComplianceTab({ clientId, complianceItems, clientName, isAdvisor, advisorName }: ComplianceTabProps) {
  const { toast } = useToast();
  const [newReviewOpen, setNewReviewOpen] = useState(false);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "compliance-reviews"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/compliance-reviews`);
      if (!res.ok) throw new Error("Failed to load reviews");
      return res.json();
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/compliance-reviews`, {
        title: reviewTitle || "Compliance Review",
        advisorNotes: reviewNotes,
        reviewItems: selectedItems,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "compliance-reviews"] });
      setNewReviewOpen(false);
      setReviewTitle("");
      setReviewNotes("");
      setSelectedItems([]);
      toast({ title: "Review created", description: "Your compliance review draft has been created." });
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string; advisorNotes?: string; reviewerNotes?: string; reviewerName?: string }) => {
      const res = await apiRequest("PATCH", `/api/compliance-reviews/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "compliance-reviews"] });
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("PATCH", `/api/compliance-items/${itemId}`, {
        status: "current",
        completedDate: new Date().toISOString().split("T")[0],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}`] });
      toast({ title: "Item updated", description: "Compliance item marked as current." });
    },
  });

  const totalItems = complianceItems.length;
  const currentItems = complianceItems.filter((i: any) => i.status === "current").length;
  const overdueItems = complianceItems.filter((i: any) => i.status === "overdue").length;
  const expiringItems = complianceItems.filter((i: any) => i.status === "expiring_soon").length;
  const pendingItems = complianceItems.filter((i: any) => i.status === "pending").length;
  const healthScore = totalItems > 0 ? Math.round((currentItems / totalItems) * 100) : 100;

  const activeReviews = reviews.filter((r: any) => !["approved", "changes_requested"].includes(r.status) || r.status === "changes_requested");
  const pastReviews = reviews.filter((r: any) => r.status === "approved");

  const healthColor = healthScore >= 80 ? "text-green-500" : healthScore >= 50 ? "text-orange-500" : "text-destructive";
  const healthBg = healthScore >= 80 ? "bg-green-500" : healthScore >= 50 ? "bg-orange-500" : "bg-destructive";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="compliance-health-score">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={healthScore >= 80 ? "hsl(var(--chart-2))" : healthScore >= 50 ? "hsl(var(--chart-3))" : "hsl(var(--destructive))"}
                  strokeWidth="3"
                  strokeDasharray={`${healthScore}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${healthColor}`}>
                {healthScore}%
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Health Score</div>
              <div className="text-xs text-muted-foreground">
                {currentItems}/{totalItems} items current
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="compliance-stat-current">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-xl font-semibold">{currentItems}</div>
              <div className="text-xs text-muted-foreground">Current</div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="compliance-stat-expiring">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
              <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-xl font-semibold">{expiringItems}</div>
              <div className="text-xs text-muted-foreground">Expiring Soon</div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="compliance-stat-overdue">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-xl font-semibold">{overdueItems + pendingItems}</div>
              <div className="text-xs text-muted-foreground">Needs Attention</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Compliance Items
              <SourcePill source="salesforce" />
            </CardTitle>
            {isAdvisor && (
              <Button size="sm" onClick={() => setNewReviewOpen(true)} data-testid="button-start-review">
                <Plus className="w-4 h-4 mr-1" />
                Start Review
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {complianceItems.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/40" data-testid={`compliance-item-${item.id}`}>
                <div className="flex items-center gap-3">
                  {item.status === "overdue" ? <AlertTriangle className="w-4 h-4 text-destructive shrink-0" /> :
                   item.status === "expiring_soon" ? <Clock className="w-4 h-4 text-chart-4 shrink-0" /> :
                   item.status === "pending" ? <CircleDot className="w-4 h-4 text-muted-foreground shrink-0" /> :
                   <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                  <div>
                    <div className="text-sm font-medium">{item.type}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {item.dueDate && <span className="text-xs text-muted-foreground">Due: {new Date(item.dueDate).toLocaleDateString()}</span>}
                  {item.completedDate && (
                    <span className="text-xs text-green-600">Completed: {new Date(item.completedDate).toLocaleDateString()}</span>
                  )}
                  <Badge
                    variant={item.status === "overdue" ? "destructive" : item.status === "current" ? "default" : "secondary"}
                    className="text-[10px] capitalize no-default-active-elevate"
                  >
                    {item.status.replace(/_/g, " ")}
                  </Badge>
                  {isAdvisor && item.status !== "current" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markCompleteMutation.mutate(item.id)}
                      disabled={markCompleteMutation.isPending}
                      data-testid={`button-mark-complete-${item.id}`}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {complianceItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No compliance items</p>
            )}
          </div>
        </CardContent>
      </Card>

      {reviewsLoading ? (
        <Card><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></Card>
      ) : (
        <>
          {reviews.filter((r: any) => r.status !== "approved").length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Active Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviews.filter((r: any) => r.status !== "approved").map((review: any) => (
                  <div key={review.id} className="border rounded-lg p-4 space-y-4" data-testid={`active-review-${review.id}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-medium text-sm" data-testid={`review-title-${review.id}`}>{review.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Created {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "—"}
                          {review.reviewerName && <span> · Reviewer: {review.reviewerName}</span>}
                        </div>
                      </div>
                      <Badge
                        variant={review.status === "changes_requested" ? "destructive" : "secondary"}
                        className="capitalize no-default-active-elevate"
                      >
                        {review.status.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    <ReviewProgressBar status={review.status} />

                    {review.advisorNotes && (
                      <div className="bg-muted/40 rounded-md p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Advisor Notes</div>
                        <div className="text-sm">{review.advisorNotes}</div>
                      </div>
                    )}

                    {review.reviewerNotes && (
                      <div className="bg-orange-50 dark:bg-orange-950/30 rounded-md p-3 border border-orange-200 dark:border-orange-800">
                        <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Reviewer Feedback</div>
                        <div className="text-sm">{review.reviewerNotes}</div>
                      </div>
                    )}

                    {review.reviewItems && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1.5">Items Under Review</div>
                        <div className="space-y-1">
                          {(() => {
                            try {
                              const ids = JSON.parse(review.reviewItems);
                              return ids.map((itemId: string) => {
                                const item = complianceItems.find((ci: any) => ci.id === itemId);
                                return item ? (
                                  <div key={itemId} className="flex items-center gap-2 text-xs py-1">
                                    <CircleCheck className="w-3 h-3 text-muted-foreground" />
                                    <span>{item.type}</span>
                                  </div>
                                ) : null;
                              });
                            } catch { return null; }
                          })()}
                        </div>
                      </div>
                    )}

                    {isAdvisor && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {review.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              updateReviewMutation.mutate({ id: review.id, status: "submitted" });
                              toast({ title: "Review submitted", description: "Your review has been submitted to the compliance team." });
                            }}
                            disabled={updateReviewMutation.isPending}
                            data-testid={`button-submit-review-${review.id}`}
                          >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            Submit for Review
                          </Button>
                        )}
                        {review.status === "submitted" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              updateReviewMutation.mutate({
                                id: review.id,
                                status: "under_review",
                                reviewerName: "Maria Santos, CCO",
                              });
                              toast({ title: "Review in progress", description: "Compliance team is now reviewing." });
                            }}
                            disabled={updateReviewMutation.isPending}
                            data-testid={`button-pickup-review-${review.id}`}
                          >
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            Simulate: Pick Up Review
                          </Button>
                        )}
                        {review.status === "under_review" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                updateReviewMutation.mutate({
                                  id: review.id,
                                  status: "approved",
                                  reviewerNotes: "All items verified and approved.",
                                  reviewerName: review.reviewerName || "Maria Santos, CCO",
                                });
                                toast({ title: "Review approved", description: "Compliance review has been approved." });
                              }}
                              disabled={updateReviewMutation.isPending}
                              data-testid={`button-approve-review-${review.id}`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Simulate: Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                updateReviewMutation.mutate({
                                  id: review.id,
                                  status: "changes_requested",
                                  reviewerNotes: "Please provide updated estate planning documents before approval.",
                                  reviewerName: review.reviewerName || "Maria Santos, CCO",
                                });
                                toast({ title: "Changes requested", description: "The reviewer has requested changes." });
                              }}
                              disabled={updateReviewMutation.isPending}
                              data-testid={`button-request-changes-${review.id}`}
                            >
                              <MessageSquare className="w-3.5 h-3.5 mr-1" />
                              Simulate: Request Changes
                            </Button>
                          </>
                        )}
                        {review.status === "changes_requested" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              updateReviewMutation.mutate({ id: review.id, status: "submitted" });
                              toast({ title: "Resubmitted", description: "Review has been resubmitted for review." });
                            }}
                            disabled={updateReviewMutation.isPending}
                            data-testid={`button-resubmit-review-${review.id}`}
                          >
                            <Send className="w-3.5 h-3.5 mr-1" />
                            Resubmit Review
                          </Button>
                        )}
                      </div>
                    )}

                    {review.events && review.events.length > 0 && (
                      <div className="border-t pt-3 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => setExpandedReviewId(expandedReviewId === review.id ? null : review.id)}
                          data-testid={`button-toggle-timeline-${review.id}`}
                        >
                          <History className="w-3 h-3 mr-1.5" />
                          {expandedReviewId === review.id ? "Hide" : "Show"} Timeline ({review.events.length} events)
                        </Button>
                        {expandedReviewId === review.id && (
                          <div className="ml-1.5 border-l-2 border-muted pl-4 space-y-3">
                            {review.events.map((evt: any, i: number) => (
                              <div key={evt.id || i} className="relative" data-testid={`timeline-event-${evt.id || i}`}>
                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-muted border-2 border-background" />
                                <div className="text-xs font-medium">{evt.description}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {evt.createdBy} · {evt.createdAt ? new Date(evt.createdAt).toLocaleDateString() : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {reviews.filter((r: any) => r.status === "approved").length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Review History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reviews.filter((r: any) => r.status === "approved").map((review: any) => (
                  <div key={review.id} className="border rounded-lg p-4 space-y-3" data-testid={`past-review-${review.id}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-medium text-sm">{review.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Approved {review.completedAt ? new Date(review.completedAt).toLocaleDateString() : ""}
                          {review.reviewerName && <span> by {review.reviewerName}</span>}
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-600 no-default-active-elevate">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Approved
                      </Badge>
                    </div>

                    <ReviewProgressBar status="approved" />

                    {review.advisorNotes && (
                      <div className="bg-muted/40 rounded-md p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Advisor Notes</div>
                        <div className="text-sm">{review.advisorNotes}</div>
                      </div>
                    )}
                    {review.reviewerNotes && (
                      <div className="bg-green-50 dark:bg-green-950/30 rounded-md p-3 border border-green-200 dark:border-green-800">
                        <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Reviewer Notes</div>
                        <div className="text-sm">{review.reviewerNotes}</div>
                      </div>
                    )}

                    {review.events && review.events.length > 0 && (
                      <div className="border-t pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => setExpandedReviewId(expandedReviewId === review.id ? null : review.id)}
                          data-testid={`button-toggle-history-timeline-${review.id}`}
                        >
                          <History className="w-3 h-3 mr-1.5" />
                          {expandedReviewId === review.id ? "Hide" : "Show"} Audit Trail ({review.events.length} events)
                        </Button>
                        {expandedReviewId === review.id && (
                          <div className="ml-1.5 border-l-2 border-muted pl-4 space-y-3">
                            {review.events.map((evt: any, i: number) => (
                              <div key={evt.id || i} className="relative">
                                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
                                <div className="text-xs font-medium">{evt.description}</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {evt.createdBy} · {evt.createdAt ? new Date(evt.createdAt).toLocaleDateString() : ""}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={newReviewOpen} onOpenChange={setNewReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start Compliance Review</DialogTitle>
            <DialogDescription>
              Create a new compliance review for {clientName}. Select items to include and add your notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Review Title</label>
              <Input
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="e.g., Q1 2026 Annual Compliance Review"
                data-testid="input-review-title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Compliance Items</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-md p-2">
                {complianceItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      if (selectedItems.includes(item.id)) {
                        setSelectedItems(selectedItems.filter(id => id !== item.id));
                      } else {
                        setSelectedItems([...selectedItems, item.id]);
                      }
                    }}
                    data-testid={`checkbox-review-item-${item.id}`}
                  >
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-sm">{item.type}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                    <Badge
                      variant={item.status === "overdue" ? "destructive" : item.status === "current" ? "default" : "secondary"}
                      className="text-[10px] capitalize no-default-active-elevate"
                    >
                      {item.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">{selectedItems.length} items selected</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Advisor Notes</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes for the compliance review team..."
                rows={3}
                data-testid="textarea-review-notes"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setNewReviewOpen(false)} data-testid="button-cancel-review">
              Cancel
            </Button>
            <Button
              onClick={() => createReviewMutation.mutate()}
              disabled={createReviewMutation.isPending || selectedItems.length === 0}
              data-testid="button-create-review"
            >
              {createReviewMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="w-4 h-4 mr-1" /> Create Draft</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
