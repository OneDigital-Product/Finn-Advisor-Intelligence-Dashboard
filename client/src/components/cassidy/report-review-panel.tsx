import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Edit2, Save, X, CheckCircle2, Trash2, History, GitCompare,
  ChevronLeft, Loader2, FileText, BookOpen, AlertTriangle,
  ListChecks, Info, BarChart3,
} from "lucide-react";

interface Props {
  draftId: string;
  onBack?: () => void;
  onApproved?: () => void;
  onDiscarded?: () => void;
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
  return <Badge className={s.className} data-testid={`badge-review-status-${status}`}>{s.label}</Badge>;
}

export function ReportReviewPanel({ draftId, onBack, onApproved, onDiscarded }: Props) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [showDiff, setShowDiff] = useState(false);
  const [diffV1, setDiffV1] = useState<string>("");
  const [diffV2, setDiffV2] = useState<string>("");

  const { data: draftData, isLoading } = useQuery<any>({
    queryKey: ["/api/cassidy/report-drafts", draftId],
    queryFn: async () => {
      const res = await fetch(`/api/cassidy/report-drafts/${draftId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load draft");
      return res.json();
    },
    enabled: !!draftId,
  });

  const { data: versionsData, refetch: refetchVersions } = useQuery<any>({
    queryKey: ["/api/cassidy/report-drafts", draftId, "versions"],
    queryFn: async () => {
      const res = await fetch(`/api/cassidy/report-drafts/${draftId}/versions`, { credentials: "include" });
      if (!res.ok) return { versions: [] };
      return res.json();
    },
    enabled: !!draftId,
  });

  const { data: diffData, isLoading: diffLoading } = useQuery<any>({
    queryKey: ["/api/cassidy/report-drafts", draftId, "diff", diffV1, diffV2],
    queryFn: async () => {
      const res = await fetch(`/api/cassidy/report-drafts/${draftId}/diff?v1=${diffV1}&v2=${diffV2}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load diff");
      return res.json();
    },
    enabled: showDiff && !!diffV1 && !!diffV2 && diffV1 !== diffV2,
  });

  const saveVersionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cassidy/report-drafts/${draftId}/save-version`, {
        edits: editText,
        edit_summary: editSummary || undefined,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cassidy/report-drafts", draftId] });
      queryClient.invalidateQueries({ queryKey: ["/api/cassidy/report-drafts/client"], exact: false });
      refetchVersions();
      setIsEditing(false);
      setEditSummary("");
      toast({ title: "Version saved", description: `Version ${data.version} created` });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cassidy/report-drafts/${draftId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cassidy/report-drafts", draftId] });
      queryClient.invalidateQueries({ queryKey: ["/api/cassidy/report-drafts/client"], exact: false });
      toast({ title: "Draft approved" });
      onApproved?.();
    },
    onError: (err: Error) => {
      toast({ title: "Approval failed", description: err.message, variant: "destructive" });
    },
  });

  const discardMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/cassidy/report-drafts/${draftId}/discard`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cassidy/report-drafts", draftId] });
      queryClient.invalidateQueries({ queryKey: ["/api/cassidy/report-drafts/client"], exact: false });
      toast({ title: "Draft discarded" });
      onDiscarded?.();
    },
    onError: (err: Error) => {
      toast({ title: "Discard failed", description: err.message, variant: "destructive" });
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

  const draft = draftData?.draft;
  if (!draft) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Draft not found or has been removed.
        </CardContent>
      </Card>
    );
  }

  const versions: any[] = versionsData?.versions || [];
  const isLocked = draft.status === "approved" || draft.status === "discarded";
  const sections: any[] = draft.draftSections || [];
  const sources: any[] = draft.includedSources || [];
  const assumptions: any[] = draft.assumptionNotes || [];
  const missingFlags: any[] = draft.missingInfoFlags || [];
  const confidence = draft.confidenceSummary;

  const startEdit = () => {
    setEditText(draft.fullDraftText || "");
    setIsEditing(true);
    setShowDiff(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditText("");
    setEditSummary("");
  };

  const startDiff = () => {
    setShowDiff(true);
    setIsEditing(false);
    const currentV = String(draft.version || 1);
    const prevV = String(Math.max((draft.version || 1) - 1, 1));
    setDiffV2(currentV);
    setDiffV1(prevV);
  };

  return (
    <div className="space-y-4" data-testid="report-review-panel">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-2" data-testid="button-review-back">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to list
        </Button>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
        <div>
          <h2 className="text-xl font-bold" data-testid="text-review-title">{draft.draftTitle || draft.reportName}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
            {statusBadge(draft.status)}
            <span>v{draft.version || 1}</span>
            {draft.editCount > 0 && <span>{draft.editCount} edit{draft.editCount !== 1 ? "s" : ""}</span>}
            {draft.wordCount && <span>{draft.wordCount} words</span>}
            <span>{draft.reportType?.replace(/_/g, " ")}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isLocked && !isEditing && (
            <Button size="sm" variant="outline" onClick={startEdit} data-testid="button-edit-draft">
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
          )}
          {versions.length > 0 && !isEditing && (
            <Button size="sm" variant="outline" onClick={startDiff} data-testid="button-compare-versions">
              <GitCompare className="w-4 h-4 mr-1" /> Compare
            </Button>
          )}
          {!isLocked && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" disabled={approveMutation.isPending} data-testid="button-approve-draft">
                    {approveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                    Approve
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve this draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Once approved, the draft will be locked and no further edits can be made.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => approveMutation.mutate()} data-testid="button-confirm-approve">
                      Approve
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={discardMutation.isPending} data-testid="button-discard-draft">
                    {discardMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
                    Discard
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The draft will be marked as discarded. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => discardMutation.mutate()} className="bg-destructive text-destructive-foreground" data-testid="button-confirm-discard">
                      Discard
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {isEditing && (
            <Card data-testid="card-edit-mode">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Edit2 className="w-4 h-4" /> Editing Draft
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                  data-testid="textarea-edit-draft"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{editText.length} characters</span>
                  <span>{editText.split(/\s+/).filter(Boolean).length} words</span>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-summary" className="text-xs">Edit summary (optional)</Label>
                  <Input
                    id="edit-summary"
                    placeholder="Briefly describe your changes..."
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    maxLength={500}
                    data-testid="input-edit-summary"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={cancelEdit} data-testid="button-cancel-edit">
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button
                    onClick={() => saveVersionMutation.mutate()}
                    disabled={saveVersionMutation.isPending || editText.trim().length === 0}
                    data-testid="button-save-version"
                  >
                    {saveVersionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Save Version
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showDiff && (
            <Card data-testid="card-diff-view">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitCompare className="w-4 h-4" /> Version Comparison
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowDiff(false)} data-testid="button-close-diff">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3 items-center">
                  <div className="flex-1">
                    <Label className="text-xs">From version</Label>
                    <Select value={diffV1} onValueChange={setDiffV1}>
                      <SelectTrigger data-testid="select-diff-v1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {draft.originalDraftText && <SelectItem value="1">v1 (original)</SelectItem>}
                        {versions.map((v: any) => (
                          <SelectItem key={v.versionNumber} value={String(v.versionNumber)}>
                            v{v.versionNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">To version</Label>
                    <Select value={diffV2} onValueChange={setDiffV2}>
                      <SelectTrigger data-testid="select-diff-v2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((v: any) => (
                          <SelectItem key={v.versionNumber} value={String(v.versionNumber)}>
                            v{v.versionNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {diffLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : diffData?.diffs ? (
                  <div className="border rounded-md overflow-auto max-h-[400px]" data-testid="diff-output">
                    {diffData.diffs.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">No differences found</p>
                    ) : (
                      <div className="font-mono text-xs">
                        {diffData.diffs.map((d: any, i: number) => (
                          <div
                            key={i}
                            className={
                              d.type === "added"
                                ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 px-3 py-0.5"
                                : d.type === "removed"
                                ? "bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 px-3 py-0.5"
                                : "px-3 py-0.5 text-muted-foreground"
                            }
                          >
                            <span className="select-none mr-2">{d.type === "added" ? "+" : d.type === "removed" ? "-" : " "}</span>
                            {d.line}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Select two different versions to compare</p>
                )}
              </CardContent>
            </Card>
          )}

          {!isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Report Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                {draft.fullDraftText ? (
                  <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap" data-testid="text-review-content">
                    {draft.fullDraftText}
                  </div>
                ) : sections.length > 0 ? (
                  <div className="space-y-4" data-testid="sections-review-content">
                    {sections.map((section: any, i: number) => (
                      <div key={i}>
                        {section.heading && <h3 className="font-semibold text-sm mb-1">{section.heading}</h3>}
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
          )}
        </div>

        <div className="space-y-4">
          {versions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4" /> Version History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {versions.map((v: any) => (
                    <div key={v.id} className="flex items-start gap-2 text-xs border-b pb-2 last:border-0" data-testid={`version-entry-${v.versionNumber}`}>
                      <Badge variant="outline" className="text-[10px] shrink-0">v{v.versionNumber}</Badge>
                      <div className="min-w-0">
                        {v.editSummary && <p className="text-foreground truncate">{v.editSummary}</p>}
                        <p className="text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
              {draft.editCount > 0 && <p>Edits: {draft.editCount}</p>}
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
