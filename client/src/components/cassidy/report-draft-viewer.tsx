import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, XCircle, FileText, AlertTriangle, BookOpen,
  ListChecks, Info, BarChart3, ChevronLeft,
} from "lucide-react";

interface Props {
  draftId: string;
  onBack?: () => void;
}

function statusBadge(status: string) {
  const map: Record<string, { className: string; label: string }> = {
    draft: { className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", label: "Draft" },
    reviewed: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", label: "Reviewed" },
    approved: { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", label: "Approved" },
    sent: { className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", label: "Sent" },
    discarded: { className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", label: "Discarded" },
  };
  const s = map[status] || { className: "", label: status };
  return <Badge className={s.className} data-testid={`badge-draft-status-${status}`}>{s.label}</Badge>;
}

export function ReportDraftViewer({ draftId, onBack }: Props) {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/cassidy/report-drafts", draftId],
    queryFn: async () => {
      const res = await fetch(`/api/cassidy/report-drafts/${draftId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load draft");
      return res.json();
    },
    enabled: !!draftId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const res = await apiRequest("PATCH", `/api/cassidy/report-drafts/${draftId}`, { status });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cassidy/report-drafts", draftId] });
      queryClient.invalidateQueries({ queryKey: ["/api/cassidy/report-drafts/client"], exact: false });
      toast({ title: `Report ${vars.status}` });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const draft = data?.draft;
  if (!draft) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Draft not found or has been removed.</p>
        </CardContent>
      </Card>
    );
  }

  const sections: any[] = draft.draftSections || [];
  const sources: any[] = draft.includedSources || [];
  const assumptions: any[] = draft.assumptionNotes || [];
  const missingFlags: any[] = draft.missingInfoFlags || [];
  const confidence = draft.confidenceSummary;

  return (
    <div className="space-y-4" data-testid="report-draft-viewer">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-2" data-testid="button-draft-back">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to list
        </Button>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
        <div>
          <h2 className="text-xl font-bold" data-testid="text-draft-title">{draft.draftTitle || draft.reportName}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {statusBadge(draft.status)}
            <span>v{draft.version || 1}</span>
            {draft.wordCount && <span>{draft.wordCount} words</span>}
            <span>{draft.reportType?.replace(/_/g, " ")}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {draft.status === "draft" && (
            <>
              <Button
                size="sm"
                onClick={() => updateMutation.mutate({ status: "approved" })}
                disabled={updateMutation.isPending}
                data-testid="button-approve-draft"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => updateMutation.mutate({ status: "discarded" })}
                disabled={updateMutation.isPending}
                data-testid="button-discard-draft"
              >
                <XCircle className="w-4 h-4 mr-1" /> Discard
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Report Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draft.fullDraftText ? (
                <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap" data-testid="text-draft-content">
                  {draft.fullDraftText}
                </div>
              ) : sections.length > 0 ? (
                <div className="space-y-4" data-testid="sections-draft-content">
                  {sections.map((section: any, i: number) => (
                    <div key={i}>
                      {section.heading && (
                        <h3 className="font-semibold text-sm mb-1">{section.heading}</h3>
                      )}
                      <p className="text-sm text-foreground whitespace-pre-wrap">{section.body || section.content || JSON.stringify(section)}</p>
                      {i < sections.length - 1 && <Separator className="mt-3" />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No content available.</p>
              )}

              {missingFlags.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-medium flex items-center gap-1 text-amber-800 dark:text-amber-300 mb-2">
                    <AlertTriangle className="w-4 h-4" /> Missing Information
                  </h4>
                  <ul className="list-disc list-inside text-xs text-amber-700 dark:text-amber-400 space-y-1">
                    {missingFlags.map((flag: any, i: number) => (
                      <li key={i} data-testid={`text-missing-flag-${i}`}>
                        {typeof flag === "string" ? flag : flag.description || flag.field || JSON.stringify(flag)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {assumptions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ListChecks className="w-4 h-4" /> Assumptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {assumptions.map((a: any, i: number) => (
                    <li key={i} className="flex items-start gap-1" data-testid={`text-assumption-${i}`}>
                      <span className="text-primary mt-0.5">•</span>
                      {typeof a === "string" ? a : a.description || JSON.stringify(a)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {sources.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {sources.map((s: any, i: number) => (
                    <li key={i} data-testid={`text-source-${i}`}>
                      {typeof s === "string" ? s : s.name || s.label || JSON.stringify(s)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {confidence && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Confidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground" data-testid="text-confidence-summary">
                  {typeof confidence === "string" ? confidence : (
                    <div className="space-y-1">
                      {confidence.overall && <p><strong>Overall:</strong> {confidence.overall}</p>}
                      {confidence.details && <p>{confidence.details}</p>}
                      {confidence.score != null && <p><strong>Score:</strong> {confidence.score}/10</p>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Info className="w-4 h-4" /> Details
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>Type: {draft.reportType?.replace(/_/g, " ")}</p>
              <p>Version: {draft.version || 1}</p>
              {draft.wordCount && <p>Words: {draft.wordCount}</p>}
              <p>Created: {new Date(draft.createdAt).toLocaleDateString()}</p>
              {draft.updatedAt && <p>Updated: {new Date(draft.updatedAt).toLocaleDateString()}</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
