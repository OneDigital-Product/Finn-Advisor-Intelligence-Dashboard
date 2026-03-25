import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, ChevronDown, ChevronUp, Save, CheckCircle, Trash2, Plus,
  ArrowLeft, StickyNote, Sparkles,
} from "lucide-react";

const REPORT_TYPES = [
  { value: "meeting_summary", label: "Meeting Summary" },
  { value: "planning_summary", label: "Planning Summary" },
  { value: "client_recap", label: "Client Recap" },
  { value: "internal_note", label: "Internal Note" },
  { value: "narrative", label: "Narrative" },
  { value: "case_consulting", label: "Case Consulting" },
  { value: "strategic_recs", label: "Strategic Recommendations" },
  { value: "financial_plan_summary", label: "Financial Plan Summary" },
];

export default function ReportEditorPage({ params: propParams }: { params?: { reportId?: string } } = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const routeParams = useParams();
  const reportId = propParams?.reportId || (routeParams?.reportId as string);

  const [localContent, setLocalContent] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [annotationInputs, setAnnotationInputs] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateInstruction, setGenerateInstruction] = useState("");
  const [generateReportType, setGenerateReportType] = useState("meeting_summary");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<string | null>(null);
  const contentVersion = useRef(0);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const pollRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: report, isLoading } = useQuery<any>({
    queryKey: ["/api/reports", reportId],
    enabled: !!reportId,
  });

  useEffect(() => {
    if (report?.reportType) {
      setGenerateReportType(report.reportType);
    }
    if (report && !generateInstruction) {
      const sections = report.content?.sections || [];
      const existingSectionNames = sections.map((s: any) => s.title).filter(Boolean);
      const existingDraftText = report.fullDraftText;
      const parts: string[] = [];
      if (report.reportName) {
        parts.push(`Report: "${report.reportName}".`);
      }
      if (existingSectionNames.length > 0) {
        parts.push(`Existing sections to build upon: ${existingSectionNames.join(", ")}.`);
      }
      if (existingDraftText) {
        const snippet = existingDraftText.slice(0, 200).replace(/\s+/g, " ").trim();
        parts.push(`Current draft begins: "${snippet}..." — expand and improve this content.`);
      } else if (sections.length > 0) {
        const sectionSummaries = sections.slice(0, 3).map((s: any) => {
          const data = s.data;
          if (typeof data === "string") return `${s.title}: ${data.slice(0, 60)}`;
          if (Array.isArray(data)) return `${s.title}: ${data.length} items`;
          return s.title;
        });
        parts.push(`Current content: ${sectionSummaries.join("; ")}.`);
      }
      parts.push("Generate a comprehensive draft covering all relevant client details.");
      const prefill = parts.join(" ");
      if (prefill.length >= 50) {
        setGenerateInstruction(prefill.slice(0, 500));
      }
    }
  }, [report]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (report?.content && !localContent) {
      setLocalContent(report.content);
      const expanded: Record<string, boolean> = {};
      report.content.sections?.forEach((s: any) => {
        expanded[s.id] = true;
      });
      setExpandedSections(expanded);
    }
  }, [report, localContent]);

  const updateMutation = useMutation({
    mutationFn: async (content: any) => {
      await apiRequest("PATCH", `/api/reports/${reportId}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports", reportId] });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/reports/${reportId}/finalize`);
    },
    onSuccess: () => {
      toast({ title: "Report finalized successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      router.push("/reports");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to finalize", description: err.message, variant: "destructive" });
    },
  });

  const applyDraftOutput = useCallback((output: any) => {
    const draftSections = output.draft_sections || [];
    const fullDraftText = output.full_draft_text || "";

    if (draftSections.length > 0) {
      const newContent = {
        sections: draftSections.map((s: any, i: number) => ({
          id: s.id || `ai-section-${i}`,
          title: s.title || `Section ${i + 1}`,
          data: s.content || s.data || s.text || s,
          annotations: [],
          visibilityOverrides: {},
        })),
      };
      setLocalContent(newContent);
      const expanded: Record<string, boolean> = {};
      newContent.sections.forEach((s: any) => { expanded[s.id] = true; });
      setExpandedSections(expanded);
      updateMutation.mutate(newContent);
    } else if (fullDraftText) {
      const newContent = {
        sections: [{
          id: "ai-draft",
          title: output.draft_title || "AI Generated Draft",
          data: fullDraftText,
          annotations: [],
          visibilityOverrides: {},
        }],
      };
      setLocalContent(newContent);
      setExpandedSections({ "ai-draft": true });
      updateMutation.mutate(newContent);
    }
  }, [updateMutation]);

  const subscribeToJob = useCallback((jobId: string) => {
    const res = fetch(`/api/cassidy/stream/${jobId}`, { credentials: "include" });
    res.then(async (response) => {
      if (!response.ok) {
        setIsGenerating(false);
        setGenerateStatus(null);
        toast({ title: "Error", description: "Failed to check job status", variant: "destructive" });
        return;
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data.status === "completed" && data.output) {
          setGenerateStatus("Populating editor...");
          applyDraftOutput(data.output);
          setIsGenerating(false);
          setGenerateStatus(null);
          toast({ title: "Draft generated", description: "AI draft has been loaded into the editor" });
        } else if (data.status === "failed" || data.status === "timed_out") {
          setIsGenerating(false);
          setGenerateStatus(null);
          toast({ title: "Generation failed", description: data.error || "The AI agent failed to generate a draft", variant: "destructive" });
        } else {
          pollRef.current = setTimeout(() => subscribeToJob(jobId), 2000);
        }
        return;
      }

      if (contentType.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let buffer = "";

        const readStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });

              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const event = JSON.parse(line.slice(6));
                    if (event.status === "completed" && event.output) {
                      setGenerateStatus("Populating editor...");
                      applyDraftOutput(event.output);
                      setIsGenerating(false);
                      setGenerateStatus(null);
                      toast({ title: "Draft generated", description: "AI draft has been loaded into the editor" });
                      reader.cancel();
                      return;
                    }
                    if (event.status === "failed" || event.status === "timed_out") {
                      setIsGenerating(false);
                      setGenerateStatus(null);
                      toast({ title: "Generation failed", description: event.error || "The AI agent failed to generate a draft", variant: "destructive" });
                      reader.cancel();
                      return;
                    }
                  } catch {}
                }
              }
            }
          } catch (err: any) {
            setIsGenerating(false);
            setGenerateStatus(null);
            toast({ title: "Error", description: err.message, variant: "destructive" });
          }
        };
        readStream();
        return;
      }

      pollRef.current = setTimeout(() => subscribeToJob(jobId), 2000);
    }).catch((err: any) => {
      setIsGenerating(false);
      setGenerateStatus(null);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    });
  }, [toast, applyDraftOutput]);

  const handleGenerateDraft = async () => {
    if (!report?.clientId) {
      toast({ title: "No client linked", description: "This report must be linked to a client to generate an AI draft", variant: "destructive" });
      return;
    }
    if (generateInstruction.length < 50) {
      toast({ title: "Instruction too short", description: "Please provide at least 50 characters of instruction", variant: "destructive" });
      return;
    }

    setShowGenerateDialog(false);
    setIsGenerating(true);
    setGenerateStatus("Submitting to AI agent...");

    try {
      const res = await apiRequest("POST", "/api/cassidy/generate-report", {
        report_type: generateReportType,
        advisor_instruction: generateInstruction,
        client_id: report.clientId,
      });
      const data = await res.json();
      setGenerateStatus("AI is drafting your report...");
      pollRef.current = setTimeout(() => subscribeToJob(data.job_id), 2000);
    } catch (err: any) {
      setIsGenerating(false);
      setGenerateStatus(null);
      toast({ title: "Failed to start generation", description: err.message, variant: "destructive" });
    }
  };

  const scheduleAutoSave = useCallback((content: any) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      setIsSaving(true);
      updateMutation.mutate(content, {
        onSuccess: () => setIsSaving(false),
        onError: (err: Error) => {
          setIsSaving(false);
          toast({ title: "Auto-save failed", description: err.message, variant: "destructive" });
        },
      });
    }, 3000);
  }, [updateMutation, toast]);

  const updateContent = useCallback((updater: (prev: any) => any) => {
    setLocalContent((prev: any) => {
      const next = updater(prev);
      contentVersion.current++;
      scheduleAutoSave(next);
      return next;
    });
  }, [scheduleAutoSave]);

  const handleToggleVisibility = useCallback((sectionId: string) => {
    updateContent((prev: any) => ({
      ...prev,
      sections: prev.sections.map((s: any) =>
        s.id === sectionId
          ? { ...s, visibilityOverrides: { hidden: !s.visibilityOverrides?.hidden } }
          : s
      ),
    }));
  }, [updateContent]);

  const handleAddAnnotation = useCallback((sectionId: string) => {
    const text = annotationInputs[sectionId]?.trim();
    if (!text) return;

    updateContent((prev: any) => ({
      ...prev,
      sections: prev.sections.map((s: any) =>
        s.id === sectionId
          ? {
              ...s,
              annotations: [
                ...(s.annotations || []),
                {
                  id: `ann-${Date.now()}`,
                  text,
                  sectionRef: sectionId,
                  addedAt: new Date().toISOString(),
                },
              ],
            }
          : s
      ),
    }));
    setAnnotationInputs((prev) => ({ ...prev, [sectionId]: "" }));
  }, [annotationInputs, updateContent]);

  const handleDeleteAnnotation = useCallback((sectionId: string, annId: string) => {
    updateContent((prev: any) => ({
      ...prev,
      sections: prev.sections.map((s: any) =>
        s.id === sectionId
          ? { ...s, annotations: (s.annotations || []).filter((a: any) => a.id !== annId) }
          : s
      ),
    }));
  }, [updateContent]);

  const handleManualSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (!localContent) return;
    setIsSaving(true);
    updateMutation.mutate(localContent, {
      onSettled: () => {
        setIsSaving(false);
        toast({ title: "Draft saved" });
      },
    });
  };

  const handleFinalize = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (localContent) {
      setIsSaving(true);
      updateMutation.mutate(localContent, {
        onSuccess: () => {
          setIsSaving(false);
          setShowFinalizeDialog(true);
        },
        onError: (err: Error) => {
          setIsSaving(false);
          toast({ title: "Failed to save before finalizing", description: err.message, variant: "destructive" });
        },
      });
    } else {
      setShowFinalizeDialog(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Report not found.</p>
        <Button variant="link" onClick={() => router.push("/reports")}>Back to Reports</Button>
      </div>
    );
  }

  if (report.status !== "draft") {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">This report has been finalized and cannot be edited.</p>
        <Button variant="link" onClick={() => router.push("/reports")}>Back to Reports</Button>
      </div>
    );
  }

  const sections = localContent?.sections || [];

  return (
    <div className="flex h-[calc(100vh-48px)]">
      <div className="w-64 shrink-0 border-r bg-card overflow-y-auto flex flex-col">
        <div className="p-4 border-b">
          <Button variant="ghost" size="sm" onClick={() => router.push("/reports")} className="mb-3 -ml-2" data-testid="button-back-reports">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Reports
          </Button>
          <h3 className="font-semibold text-sm truncate" data-testid="text-editor-report-name">{report.reportName}</h3>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px]">Draft</Badge>
            <span className="text-[10px] text-muted-foreground">v{report.version}</span>
          </div>
          {isSaving && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </div>
          )}
        </div>

        <div className="p-4 flex-1">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sections</h4>
          <div className="space-y-2">
            {sections.map((section: any) => (
              <label
                key={section.id}
                className="flex items-center gap-2 cursor-pointer text-sm"
                data-testid={`sidebar-section-${section.id}`}
              >
                <Checkbox
                  checked={!section.visibilityOverrides?.hidden}
                  onCheckedChange={() => handleToggleVisibility(section.id)}
                />
                <span className={`truncate text-xs ${section.visibilityOverrides?.hidden ? "text-muted-foreground line-through" : ""}`}>
                  {section.title}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="p-4 border-t space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowGenerateDialog(true)}
            disabled={isGenerating || !report?.clientId}
            data-testid="button-generate-draft-ai"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{generateStatus || "Generating..."}</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Generate Draft with AI</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleManualSave}
            disabled={isSaving}
            data-testid="button-save-draft"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            size="sm"
            className="w-full"
            onClick={handleFinalize}
            disabled={finalizeMutation.isPending}
            data-testid="button-finalize"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Finalize Report
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
        <div className="max-w-4xl mx-auto space-y-4">
          {sections.map((section: any) => {
            if (section.visibilityOverrides?.hidden) return null;
            const isExpanded = expandedSections[section.id];

            return (
              <Card key={section.id} data-testid={`section-card-${section.id}`}>
                <CardHeader
                  className="cursor-pointer py-4"
                  onClick={() =>
                    setExpandedSections((prev) => ({ ...prev, [section.id]: !isExpanded }))
                  }
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      {(section.annotations?.length || 0) > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          <StickyNote className="w-3 h-3 mr-1" />
                          {section.annotations.length}
                        </Badge>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    <div className="rounded-lg border bg-card p-4 overflow-x-auto">
                      {section.data ? (
                        renderSectionData(section.data)
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No data available for this section.</p>
                      )}
                    </div>

                    {section.annotations && section.annotations.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</h5>
                        {section.annotations.map((ann: any) => (
                          <div
                            key={ann.id}
                            className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3"
                            data-testid={`annotation-${ann.id}`}
                          >
                            <StickyNote className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{ann.text}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {new Date(ann.addedAt).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteAnnotation(section.id, ann.id)}
                              data-testid={`button-delete-annotation-${ann.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Textarea
                        value={annotationInputs[section.id] || ""}
                        onChange={(e) =>
                          setAnnotationInputs((prev) => ({ ...prev, [section.id]: e.target.value }))
                        }
                        placeholder="Add a note to this section..."
                        rows={2}
                        className="text-sm"
                        data-testid={`input-annotation-${section.id}`}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 self-end"
                        onClick={() => handleAddAnnotation(section.id)}
                        disabled={!annotationInputs[section.id]?.trim()}
                        data-testid={`button-add-annotation-${section.id}`}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Report</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to finalize this report? Once finalized, you won't be able to make further edits.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalizeDialog(false)} data-testid="button-cancel-finalize">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowFinalizeDialog(false);
                finalizeMutation.mutate();
              }}
              disabled={finalizeMutation.isPending}
              data-testid="button-confirm-finalize"
            >
              {finalizeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Finalize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Generate Draft with AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Report Type</Label>
              <Select value={generateReportType} onValueChange={setGenerateReportType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Advisor Instruction</Label>
              <p className="text-xs text-muted-foreground mb-1.5">
                Describe what the report should cover (minimum 50 characters)
              </p>
              <Textarea
                value={generateInstruction}
                onChange={e => setGenerateInstruction(e.target.value)}
                placeholder="e.g., Generate a comprehensive meeting summary covering the client's retirement goals, current portfolio allocation, and recommended next steps..."
                rows={4}
                className="text-sm"
                data-testid="input-generate-instruction"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {generateInstruction.length}/500
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)} data-testid="button-cancel-generate">
              Cancel
            </Button>
            <Button
              onClick={handleGenerateDraft}
              disabled={generateInstruction.length < 50 || generateInstruction.length > 500}
              data-testid="button-confirm-generate"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function renderSectionData(data: any): JSX.Element {
  if (Array.isArray(data)) {
    if (data.length === 0) return <p className="text-sm text-muted-foreground italic">No data available</p>;
    const keys = Object.keys(data[0]).filter((k) => typeof data[0][k] !== "object" || data[0][k] === null);
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {keys.map((k) => (
              <th key={k} className="text-left py-2 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                {formatKey(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any, i: number) => (
            <tr key={i} className="border-b last:border-0">
              {keys.map((k) => (
                <td key={k} className="py-2 px-3">
                  {formatValue(row[k], k)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (typeof data === "object" && data !== null) {
    const entries = Object.entries(data).filter(
      ([, v]) => typeof v !== "object" || v === null
    );
    if (entries.length === 0) return <p className="text-sm text-muted-foreground italic">No displayable data</p>;
    return (
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {entries.map(([key, val]) => (
          <div key={key}>
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{formatKey(key)}</dt>
            <dd className="mt-0.5 font-medium">{formatValue(val, key)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return <p className="text-sm">{String(data)}</p>;
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, " ")
    .trim();
}

function formatValue(val: any, key: string): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") {
    if (/balance|aum|value|amount|allocation/i.test(key)) {
      return `$${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    if (/percent|pct|percentage/i.test(key)) {
      return `${val.toFixed(2)}%`;
    }
    return val.toLocaleString();
  }
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
}
