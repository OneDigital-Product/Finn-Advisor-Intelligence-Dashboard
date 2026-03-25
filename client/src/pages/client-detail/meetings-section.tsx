import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MeetingTasksPanel } from "@/components/task-sidebar";
import { SignalScanner } from "@/components/cassidy/signal-scanner";
import { SignalCards } from "@/components/cassidy/signal-cards";
import { useSignalScanJob } from "@/hooks/use-signal-scan-job";
import type { DetectedSignalOutput } from "@/hooks/use-signal-scan-job";
import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Plus,
  Loader2,
  Check,
  ChevronRight,
  Download,
  Notebook,
  Sparkles,
  ListTodo,
  Zap,
  CheckCircle,
  CheckSquare,
  Mail,
  AlertCircle,
  Copy,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

function MeetingDetailContent({ meetingId, onSuggestedTasks }: { meetingId: string; onSuggestedTasks?: (tasks: any[]) => void }) {
  const { toast } = useToast();
  const { data: meetings } = useQuery<any[]>({
    queryKey: ["/api/meetings"],
  });
  const meeting = meetings?.find((m: any) => m.id === meetingId);
  const isPast = meeting?.status === "completed";
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [signalJobId, setSignalJobId] = useState<string | null>(null);
  const signalScanJob = useSignalScanJob(signalJobId);

  const existingSignalsQuery = useQuery<{ signals: any[] }>({
    queryKey: ["/api/cassidy/signals", meetingId],
    enabled: isPast === true,
  });

  useEffect(() => {
    if (signalScanJob.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["/api/cassidy/signals", meetingId] });
    }
  }, [signalScanJob.status, meetingId]);

  const displaySignals: DetectedSignalOutput[] =
    signalScanJob.data?.signals ||
    existingSignalsQuery.data?.signals?.map((s: any) => ({
      id: s.id,
      signal_type: s.signalType || s.signal_type,
      description: s.description,
      confidence: s.confidence,
      materiality: s.materiality,
      source_snippet: s.sourceSnippet || s.source_snippet,
      date_reference: s.dateReference || s.date_reference,
      recommended_actions: s.recommendedActions || s.recommended_actions,
      review_required: s.reviewRequired || s.review_required,
      duplicate_likelihood: s.duplicateLikelihood || s.duplicate_likelihood,
      reasoning: s.reasoning,
    })) ||
    [];

  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/notes`, { notes });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Notes saved" });
      setEditingNotes(false);
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save notes", description: err.message, variant: "destructive" });
    },
  });

  const regeneratePrepMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/prep`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Meeting prep regenerated" });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate prep", description: err.message, variant: "destructive" });
    },
  });

  const summarizeDetailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/summarize`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Meeting summary generated" });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      if (data.suggestedTasks?.length > 0 && onSuggestedTasks) {
        onSuggestedTasks(data.suggestedTasks);
      }
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate summary", description: err.message, variant: "destructive" });
    },
  });

  const [processResult, setProcessResult] = useState<any>(null);

  const processMeetingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/process`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setProcessResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Meeting processed", description: `${data.tasksCreated?.length || 0} tasks created` });
    },
    onError: (err: any) => {
      toast({ title: "Processing failed", description: err.message, variant: "destructive" });
    },
  });

  if (!meeting) {
    return <div className="py-8 text-center text-muted-foreground">Loading meeting details...</div>;
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle data-testid="text-meeting-detail-title">{meeting.title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Date:</span>
            <span className="ml-2 font-medium">{new Date(meeting.startTime).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Type:</span>
            <span className="ml-2 font-medium capitalize">{meeting.type?.replace(/_/g, " ")}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <Badge variant={meeting.status === "completed" ? "default" : "secondary"} className="ml-2">{meeting.status}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Location:</span>
            <span className="ml-2 font-medium">{meeting.location || "—"}</span>
          </div>
        </div>

        {isPast ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-primary" /> Meeting Summary
              </h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => summarizeDetailMutation.mutate()}
                disabled={summarizeDetailMutation.isPending}
                data-testid="button-summarize-detail"
              >
                {summarizeDetailMutation.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Summarizing...</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5 mr-1" /> {meeting.transcriptSummary ? "Resummarize" : "Generate Summary"}</>
                )}
              </Button>
            </div>
            {summarizeDetailMutation.isPending ? (
              <div className="flex items-center justify-center py-8 border rounded-md bg-muted/30">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Generating meeting summary...</span>
              </div>
            ) : meeting.transcriptSummary ? (
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border rounded-md p-3 bg-muted/30" data-testid="text-meeting-summary">{meeting.transcriptSummary}</div>
            ) : (
              <div className="text-center py-6 border rounded-md bg-muted/30 text-muted-foreground">
                <p className="text-sm">No summary generated yet. Click "Generate Summary" to create one.</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm flex items-center gap-1">
                <Notebook className="h-4 w-4 text-primary" /> Meeting Prep Brief
              </h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => regeneratePrepMutation.mutate()}
                disabled={regeneratePrepMutation.isPending}
                data-testid="button-regenerate-prep-detail"
              >
                {regeneratePrepMutation.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Generating...</>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5 mr-1" /> {meeting.prepBrief ? "Regenerate" : "Generate Prep"}</>
                )}
              </Button>
            </div>
            {regeneratePrepMutation.isPending ? (
              <div className="flex items-center justify-center py-8 border rounded-md bg-muted/30">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Generating meeting prep brief...</span>
              </div>
            ) : meeting.prepBrief ? (
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border rounded-md p-3 bg-muted/30" data-testid="text-meeting-prep-brief">{meeting.prepBrief}</div>
            ) : (
              <div className="text-center py-6 border rounded-md bg-muted/30 text-muted-foreground">
                <p className="text-sm">No prep brief generated yet. Click "Generate Prep" to create one.</p>
              </div>
            )}
          </div>
        )}

        {isPast && (
          <div className="border rounded-md p-3 space-y-3 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-primary" /> Process Meeting
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Summarize, create tasks, and generate follow-up email
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => processMeetingMutation.mutate()}
                disabled={processMeetingMutation.isPending || (!meeting.notes && !meeting.transcriptSummary && !meeting.transcriptRaw)}
                data-testid="button-process-meeting"
              >
                {processMeetingMutation.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Processing...</>
                ) : (
                  <><Zap className="h-3.5 w-3.5 mr-1" /> Process</>
                )}
              </Button>
            </div>

            {processMeetingMutation.isPending && (
              <div className="flex items-center justify-center py-6 border rounded-md bg-muted/30 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Running AI pipeline...</span>
              </div>
            )}

            {processResult && !processMeetingMutation.isPending && (
              <div className="space-y-3" data-testid="process-result">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete in {(processResult.duration_ms / 1000).toFixed(1)}s</span>
                </div>

                {processResult.actionItems?.length > 0 && (
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Action Items ({processResult.actionItems.length})</h5>
                    {processResult.actionItems.map((item: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm" data-testid={`action-item-${i}`}>
                        <CheckCircle className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <span>{item.description}</span>
                          <span className="text-xs text-muted-foreground ml-2">({item.owner}, {item.priority})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {processResult.tasksCreated?.length > 0 && (
                  <div className="text-sm flex items-center gap-1.5 text-muted-foreground">
                    <ListTodo className="w-3.5 h-3.5" />
                    {processResult.tasksCreated.length} task{processResult.tasksCreated.length !== 1 ? "s" : ""} created
                  </div>
                )}

                {processResult.followUpEmail && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Follow-Up Email</h5>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(processResult.followUpEmail.body);
                          toast({ title: "Email copied" });
                        }}
                        data-testid="button-copy-email"
                      >
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto bg-muted/30 rounded p-2" data-testid="text-process-email">
                      {processResult.followUpEmail.body}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {isPast && meeting.clientId && (
          <div className="border rounded-md p-3 space-y-3" data-testid="signals-section">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-primary" /> Meeting Signals
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Detect life events and material changes
                </p>
              </div>
              <SignalScanner
                meetingId={meetingId}
                clientId={meeting.clientId}
                hasContent={!!(meeting.notes || meeting.transcriptSummary || meeting.transcriptRaw)}
                onScanStarted={(jobId) => setSignalJobId(jobId)}
                isScanning={signalScanJob.isLoading && !!signalJobId}
              />
            </div>

            {signalScanJob.isLoading && signalJobId && (
              <div className="flex items-center justify-center py-4 border rounded-md bg-muted/30 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Scanning for signals...</span>
              </div>
            )}

            {signalScanJob.error && (
              <div className="text-sm text-destructive border border-destructive/30 rounded-md p-3" data-testid="signal-scan-error">
                {signalScanJob.error}
              </div>
            )}

            {displaySignals.length > 0 && (
              <SignalCards
                signals={displaySignals}
                warnings={signalScanJob.data?.warnings}
                noSignalSummary={signalScanJob.data?.no_signal_summary}
              />
            )}

            {!signalScanJob.isLoading && !signalJobId && displaySignals.length === 0 && existingSignalsQuery.isSuccess && (
              <p className="text-xs text-muted-foreground text-center py-2">No signals detected yet</p>
            )}

            {signalScanJob.status === "completed" && displaySignals.length === 0 && (
              <SignalCards
                signals={[]}
                noSignalSummary={signalScanJob.data?.no_signal_summary}
              />
            )}
          </div>
        )}

        {isPast && meeting.prepBrief && (
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-1 mb-2">
              <Notebook className="h-4 w-4 text-primary" /> Meeting Prep Brief
            </h4>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap border rounded-md p-3 bg-muted/30" data-testid="text-meeting-prep-brief">{meeting.prepBrief}</div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Notes</h4>
            {editingNotes ? (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingNotes(false)}
                  data-testid="button-cancel-edit-notes"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveNotesMutation.mutate(notesValue)}
                  disabled={saveNotesMutation.isPending}
                  data-testid="button-save-notes"
                >
                  {saveNotesMutation.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Saving...</>
                  ) : (
                    <><Check className="h-3.5 w-3.5 mr-1" /> Save</>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setNotesValue(meeting.notes || ""); setEditingNotes(true); }}
                data-testid="button-edit-notes"
              >
                <FileText className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            )}
          </div>
          {editingNotes ? (
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Add meeting notes..."
              data-testid="textarea-edit-notes"
            />
          ) : meeting.notes ? (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-meeting-notes">{meeting.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic" data-testid="text-no-notes">No notes yet. Click "Edit" to add notes.</p>
          )}
        </div>

        <MeetingTasksPanel meetingId={meetingId} clientId={meeting.clientId} />

        {meeting.transcriptRaw && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Raw Transcript</h4>
            <ScrollArea className="h-48 rounded-md border p-3">
              <pre className="text-xs whitespace-pre-wrap font-mono" data-testid="text-meeting-transcript">{meeting.transcriptRaw}</pre>
            </ScrollArea>
          </div>
        )}
      </div>
    </>
  );
}

interface MeetingsSectionProps {
  clientId: string;
  clientMeetings: any[];
  onSuggestedTasks: (tasks: any[]) => void;
}

export function MeetingsSection({ clientId, clientMeetings, onSuggestedTasks }: MeetingsSectionProps) {
  const { toast } = useToast();
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [showNewMeetingDialog, setShowNewMeetingDialog] = useState(false);
  const [newMeetingMode, setNewMeetingMode] = useState<"notes" | "transcript">("notes");
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingType, setNewMeetingType] = useState("Check-In");
  const [newMeetingDate, setNewMeetingDate] = useState(new Date().toISOString().split("T")[0]);
  const [newMeetingNotes, setNewMeetingNotes] = useState("");
  const [newMeetingLocation, setNewMeetingLocation] = useState("");
  const [generatingPrepId, setGeneratingPrepId] = useState<string | null>(null);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  function resetNewMeetingForm() {
    setShowNewMeetingDialog(false);
    setNewMeetingMode("notes");
    setTranscriptFile(null);
    setTranscriptText("");
    setNewMeetingTitle("");
    setNewMeetingType("Check-In");
    setNewMeetingDate(new Date().toISOString().split("T")[0]);
    setNewMeetingNotes("");
    setNewMeetingLocation("");
  }

  const transcriptMeetingMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (transcriptFile) {
        formData.append("file", transcriptFile);
      } else {
        formData.append("text", transcriptText);
      }
      const res = await fetch(`/api/clients/${clientId}/meetings/from-transcript`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).message);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Meeting created from transcript", description: data.meeting?.title || "Meeting logged successfully" });
      resetNewMeetingForm();
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to analyze transcript", description: err.message, variant: "destructive" });
    },
  });

  const createMeetingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/meetings", {
        clientId,
        title: newMeetingTitle,
        type: newMeetingType,
        startTime: `${newMeetingDate}T10:00:00`,
        endTime: `${newMeetingDate}T11:00:00`,
        status: "completed",
        notes: newMeetingNotes || null,
        location: newMeetingLocation || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Meeting created" });
      resetNewMeetingForm();
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create meeting", description: err.message, variant: "destructive" });
    },
  });

  const prepMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      setGeneratingPrepId(meetingId);
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/prep`);
      return res.json();
    },
    onSuccess: (_data: any, meetingId: string) => {
      toast({ title: "Meeting prep generated" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setGeneratingPrepId(null);
      setSelectedMeetingId(meetingId);
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate prep", description: err.message, variant: "destructive" });
      setGeneratingPrepId(null);
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      setSummarizingId(meetingId);
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/summarize`);
      return res.json();
    },
    onSuccess: (data: any, meetingId: string) => {
      toast({ title: "Meeting summary generated" });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setSummarizingId(null);
      setSelectedMeetingId(meetingId);
      if (data.suggestedTasks?.length > 0) {
        onSuggestedTasks(data.suggestedTasks);
      }
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate summary", description: err.message, variant: "destructive" });
      setSummarizingId(null);
    },
  });

  return (
    <div className="space-y-6">
      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>
              <Calendar className="w-4 h-4" /> Meetings
            </CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={showNewMeetingDialog} onOpenChange={(open) => open ? setShowNewMeetingDialog(true) : resetNewMeetingForm()}>
                <Button size="sm" variant="outline" onClick={() => setShowNewMeetingDialog(true)} data-testid="button-log-meeting">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Log Meeting
                </Button>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Log New Meeting</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-1 p-1 bg-muted rounded-lg">
                      <button
                        className={`flex-1 text-sm py-1.5 px-3 rounded-md transition-colors ${newMeetingMode === "notes" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
                        onClick={() => setNewMeetingMode("notes")}
                        data-testid="toggle-mode-notes"
                      >
                        <FileText className="h-3.5 w-3.5 inline mr-1" />
                        Add Notes
                      </button>
                      <button
                        className={`flex-1 text-sm py-1.5 px-3 rounded-md transition-colors ${newMeetingMode === "transcript" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
                        onClick={() => setNewMeetingMode("transcript")}
                        data-testid="toggle-mode-transcript"
                      >
                        <Sparkles className="h-3.5 w-3.5 inline mr-1" />
                        Upload Transcript
                      </button>
                    </div>

                    {newMeetingMode === "notes" ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Meeting Title</label>
                          <Input
                            value={newMeetingTitle}
                            onChange={(e) => setNewMeetingTitle(e.target.value)}
                            placeholder="e.g. Quarterly Portfolio Review"
                            data-testid="input-meeting-title"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Meeting Type</label>
                            <Select value={newMeetingType} onValueChange={setNewMeetingType}>
                              <SelectTrigger data-testid="select-meeting-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Check-In">Check-In</SelectItem>
                                <SelectItem value="Portfolio Review">Portfolio Review</SelectItem>
                                <SelectItem value="Financial Planning">Financial Planning</SelectItem>
                                <SelectItem value="Tax Planning">Tax Planning</SelectItem>
                                <SelectItem value="Estate Planning">Estate Planning</SelectItem>
                                <SelectItem value="Onboarding">Onboarding</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-sm font-medium">Date</label>
                            <Input
                              type="date"
                              value={newMeetingDate}
                              onChange={(e) => setNewMeetingDate(e.target.value)}
                              data-testid="input-meeting-date"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Location <span className="text-muted-foreground font-normal">(optional)</span></label>
                          <Input
                            value={newMeetingLocation}
                            onChange={(e) => setNewMeetingLocation(e.target.value)}
                            placeholder="e.g. Office, Zoom, Phone"
                            data-testid="input-meeting-location"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Notes</label>
                          <textarea
                            value={newMeetingNotes}
                            onChange={(e) => setNewMeetingNotes(e.target.value)}
                            placeholder="Meeting notes, discussion points, action items..."
                            rows={5}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            data-testid="input-meeting-notes"
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => createMeetingMutation.mutate()}
                          disabled={createMeetingMutation.isPending || !newMeetingTitle.trim()}
                          data-testid="button-create-meeting"
                        >
                          {createMeetingMutation.isPending ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                          ) : (
                            <><Plus className="h-4 w-4 mr-1" /> Create Meeting</>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Upload a meeting transcript file (.txt, .vtt) or paste the text below. AI will analyze the transcript and create a meeting record with a summary.
                        </p>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Upload File</label>
                          <input
                            type="file"
                            accept=".txt,.vtt,.text"
                            onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                            data-testid="input-transcript-file"
                          />
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or paste text</span></div>
                        </div>
                        <textarea
                          value={transcriptText}
                          onChange={(e) => setTranscriptText(e.target.value)}
                          placeholder="Paste meeting transcript here..."
                          rows={6}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          data-testid="input-transcript-text"
                        />
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.open("/api/sample-transcript", "_blank")} data-testid="button-download-sample-transcript">
                            <Download className="h-4 w-4 mr-1" /> Sample
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={() => transcriptMeetingMutation.mutate()}
                            disabled={transcriptMeetingMutation.isPending || (!transcriptFile && !transcriptText.trim())}
                            data-testid="button-submit-transcript"
                          >
                            {transcriptMeetingMutation.isPending ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing Transcript...</>
                            ) : (
                              <><Sparkles className="h-4 w-4 mr-1" /> Analyze & Create Meeting</>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clientMeetings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-meetings">No meetings recorded for this client yet.</p>
          ) : (
            <div className="space-y-3">
              {clientMeetings.map((meeting: any) => {
                const isPast = meeting.status === "completed";
                const meetingDate = new Date(meeting.startTime);
                const endDate = meeting.endTime ? new Date(meeting.endTime) : null;
                return (
                  <div
                    key={meeting.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover-elevate cursor-pointer"
                    onClick={() => setSelectedMeetingId(meeting.id)}
                    data-testid={`card-meeting-${meeting.id}`}
                  >
                    <div className="text-center min-w-[50px]">
                      <div className="text-xs text-muted-foreground">
                        {meetingDate.toLocaleDateString("en-US", { month: "short" })}
                      </div>
                      <div className={`text-2xl font-semibold ${isPast ? "text-muted-foreground" : ""}`}>
                        {meetingDate.getDate()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {meetingDate.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" data-testid={`text-meeting-title-${meeting.id}`}>{meeting.title}</span>
                        <Badge variant={isPast ? "secondary" : "outline"} className="text-[12px] capitalize">
                          {meeting.type?.replace(/_/g, " ")}
                        </Badge>
                        {isPast && (
                          <Badge variant="secondary" className="text-[12px]">Completed</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {meetingDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                          {endDate && ` - ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`}
                        </span>
                        {meeting.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {meeting.location}
                          </span>
                        )}
                        {meeting.prepBrief && (
                          <Badge variant="secondary" className="text-[12px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <Sparkles className="w-2.5 h-2.5 mr-0.5" /> {isPast ? "Prep" : "Prep Ready"}
                          </Badge>
                        )}
                        {meeting.transcriptSummary && (
                          <Badge variant="secondary" className="text-[12px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            <FileText className="w-2.5 h-2.5 mr-0.5" /> Summary
                          </Badge>
                        )}
                      </div>
                      {meeting.taskCount > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="text-[12px] px-1.5 py-0 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                            <ListTodo className="w-2.5 h-2.5 mr-0.5" />
                            {meeting.activeTaskCount} task{meeting.activeTaskCount !== 1 ? "s" : ""}
                            {meeting.completedTaskCount > 0 && ` (${meeting.completedTaskCount} done)`}
                          </Badge>
                          {meeting.tasks?.slice(0, 2).map((t: any) => (
                            <span key={t.id} className="text-[12px] text-muted-foreground truncate max-w-[140px]" title={t.title}>
                              • {t.title}
                            </span>
                          ))}
                          {meeting.taskCount > 2 && (
                            <span className="text-[12px] text-muted-foreground">+{meeting.taskCount - 2} more</span>
                          )}
                        </div>
                      )}
                      {meeting.notes && (
                        <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-1 italic">{meeting.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isPast ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={summarizingId === meeting.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            summarizeMutation.mutate(meeting.id);
                          }}
                          data-testid={`button-summarize-meeting-${meeting.id}`}
                        >
                          {summarizingId === meeting.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1 text-xs">{meeting.transcriptSummary ? "Resummarize" : "Summarize"}</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={generatingPrepId === meeting.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            prepMutation.mutate(meeting.id);
                          }}
                          data-testid={`button-generate-prep-${meeting.id}`}
                        >
                          {generatingPrepId === meeting.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Notebook className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1 text-xs">{meeting.prepBrief ? "Regenerate" : "Prep"}</span>
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMeetingId && (
        <Dialog open={!!selectedMeetingId} onOpenChange={() => setSelectedMeetingId(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <MeetingDetailContent meetingId={selectedMeetingId} onSuggestedTasks={onSuggestedTasks} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
