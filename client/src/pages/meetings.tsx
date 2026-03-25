import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useMemo, useEffect } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { MeetingTasksPanel } from "@/components/task-sidebar";
import { SignalScanner } from "@/components/cassidy/signal-scanner";
import { SignalCards } from "@/components/cassidy/signal-cards";
import { useSignalScanJob } from "@/hooks/use-signal-scan-job";
import type { DetectedSignalOutput } from "@/hooks/use-signal-scan-job";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  FileText,
  Send,
  CheckSquare,
  Video,
  Phone,
  Building,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Upload,
  Plus,
  ExternalLink,
  RefreshCw,
  List,
  ListTodo,
  CalendarDays,
  User,
  Mail,
  Filter,
  Users,
  X,
  Zap,
  CheckCircle,
  AlertCircle,
  Copy,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { P } from "@/styles/tokens";
import { Serif, Mono, Lbl } from "@/components/design/typography";
import { Pill } from "@/components/design/pill";

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function MeetingTypeIcon({ location }: { location: string }) {
  if (location?.includes("Zoom") || location?.includes("Video")) return <Video className="w-4 h-4" />;
  if (location?.includes("Phone") || location?.includes("Call")) return <Phone className="w-4 h-4" />;
  return <Building className="w-4 h-4" />;
}

function MeetingNoteRecords({ meetingId }: { meetingId: string }) {
  const { toast } = useToast();
  const [newNote, setNewNote] = useState("");

  const notesQuery = useQuery<any[]>({
    queryKey: ["/api/meetings", meetingId, "notes-records"],
    queryFn: async () => {
      const res = await fetch(`/api/meetings/${meetingId}/notes-records`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/notes-records`, { noteText: newNote });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "notes-records"] });
      setNewNote("");
      toast({ title: "Note saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save note", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a meeting note..."
          className="min-h-[80px] text-sm flex-1"
          data-testid="input-note-record"
        />
      </div>
      <Button
        size="sm"
        onClick={() => createNoteMutation.mutate()}
        disabled={!newNote.trim() || createNoteMutation.isPending}
        data-testid="button-save-note-record"
      >
        {createNoteMutation.isPending ? "Saving..." : "Add Note"}
      </Button>

      {notesQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (notesQuery.data || []).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No note records yet</p>
      ) : (
        <div className="space-y-2">
          {(notesQuery.data || []).map((note: any) => (
            <div
              key={note.id}
              className="p-3 rounded-md bg-muted/40 text-sm"
              data-testid={`card-note-record-${note.id}`}
            >
              <p className="whitespace-pre-wrap">{note.noteText}</p>
              {note.summary && (
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                  <span className="font-medium">AI Summary:</span> {note.summary}
                </div>
              )}
              {note.actionItems && note.actionItems.length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">Action Items:</span>
                  <ul className="list-disc list-inside mt-0.5">
                    {note.actionItems.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-2 text-xs text-muted-foreground/60">
                {new Date(note.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MeetingDetailDialog({ meeting, onNavigateToClient }: { meeting: any; onNavigateToClient?: () => void }) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(meeting.notes || "");
  const [prepContent, setPrepContent] = useState(meeting.prepBrief || "");
  const [actionItems, setActionItems] = useState("");
  const [followUpEmail, setFollowUpEmail] = useState("");
  const [transcriptSummary, setTranscriptSummary] = useState(meeting.transcriptSummary || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const prepMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/meetings/${meeting.id}/prep`),
    onSuccess: async (res) => {
      const json = await res.json();
      setPrepContent(json.prepBrief);
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Meeting prep ready" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate meeting prep", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/meetings/${meeting.id}/notes`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Notes saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save notes", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const actionItemsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/action-items", {
      notes,
      clientName: meeting.client ? `${meeting.client.firstName} ${meeting.client.lastName}` : "Client",
    }),
    onSuccess: async (res) => {
      const json = await res.json();
      setActionItems(json.result);
    },
  });

  const followUpMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/follow-up-email", {
      clientName: meeting.client ? `${meeting.client.firstName} ${meeting.client.lastName}` : "Client",
      clientEmail: meeting.client?.email || "",
      meetingNotes: notes,
    }),
    onSuccess: async (res) => {
      const json = await res.json();
      setFollowUpEmail(json.result);
    },
  });

  const transcriptMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return fetch(`/api/meetings/${meeting.id}/transcript`, {
        method: "POST",
        body: formData,
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
      });
    },
    onSuccess: (data) => {
      setTranscriptSummary(data.summary);
      setNotes(data.meeting?.notes || notes);
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Transcript uploaded and analyzed" });
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const isPastMeeting = meeting.status === "completed" || new Date(meeting.endTime) < new Date();
  const hasContent = meeting.notes || meeting.transcriptSummary || meeting.transcriptRaw;

  const [processResult, setProcessResult] = useState<any>(null);
  const [signalJobId, setSignalJobId] = useState<string | null>(null);
  const signalScanJob = useSignalScanJob(signalJobId);

  const existingSignalsQuery = useQuery<{ signals: any[] }>({
    queryKey: ["/api/cassidy/signals", meeting.id],
    enabled: isPastMeeting,
  });

  useEffect(() => {
    if (signalScanJob.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["/api/cassidy/signals", meeting.id] });
    }
  }, [signalScanJob.status, meeting.id]);

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

  const processMeetingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meeting.id}/process`);
      return res.json();
    },
    onSuccess: (data: any) => {
      setProcessResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Meeting processed successfully", description: `${data.tasksCreated?.length || 0} tasks created` });
    },
    onError: (err: any) => {
      toast({ title: "Processing failed", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const handleTranscriptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      transcriptMutation.mutate(file);
      e.target.value = "";
    }
  };

  return (
    <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle className="text-lg">{meeting.title}</DialogTitle>
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(meeting.startTime)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
          {meeting.timezone && <span className="text-xs text-muted-foreground" data-testid="text-meeting-timezone">({meeting.timezone})</span>}
          {meeting.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{meeting.location}</span>}
          {meeting.client && (
            <NextLink
              href={`/clients/${meeting.client.id}`}
              className="flex items-center gap-1 text-foreground underline decoration-muted-foreground/40 hover:decoration-foreground cursor-pointer"
              data-testid={`link-client-${meeting.client.id}`}
              onClick={onNavigateToClient}
            >
              <User className="w-3.5 h-3.5" />
              {meeting.client.firstName} {meeting.client.lastName}
              <ExternalLink className="w-3 h-3" />
            </NextLink>
          )}
        </div>
        {meeting.description && (
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-meeting-description">{meeting.description}</p>
        )}
        {meeting.attendees && meeting.attendees.length > 0 && (
          <div className="flex items-center gap-2 mt-1 flex-wrap" data-testid="text-meeting-attendees">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            {meeting.attendees.map((a: any, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs" data-testid={`badge-attendee-${i}`}>
                {typeof a === "string" ? a : a.name || a.email}
              </Badge>
            ))}
          </div>
        )}
        {meeting.agenda && meeting.agenda.length > 0 && (
          <div className="mt-1" data-testid="text-meeting-agenda">
            <span className="text-xs font-medium text-muted-foreground">Agenda:</span>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-0.5">
              {meeting.agenda.map((item: string, i: number) => (
                <li key={i} className="text-xs">{item}</li>
              ))}
            </ul>
          </div>
        )}
      </DialogHeader>

      <ScrollArea className="flex-1 pr-4">
        <Tabs defaultValue="prep" className="space-y-4">
          <TabsList>
            <TabsTrigger value="prep" data-testid="tab-meeting-prep">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Prep
            </TabsTrigger>
            <TabsTrigger value="notes" data-testid="tab-meeting-notes">
              <FileText className="w-3.5 h-3.5 mr-1" /> Notes
            </TabsTrigger>
            <TabsTrigger value="note-records" data-testid="tab-meeting-note-records">
              <List className="w-3.5 h-3.5 mr-1" /> Records
            </TabsTrigger>
            <TabsTrigger value="follow-up" data-testid="tab-meeting-followup">
              <Send className="w-3.5 h-3.5 mr-1" /> Follow-Up
            </TabsTrigger>
            <TabsTrigger value="transcript" data-testid="tab-meeting-transcript">
              <Upload className="w-3.5 h-3.5 mr-1" /> Transcript
            </TabsTrigger>
            <TabsTrigger value="tasks" data-testid="tab-meeting-tasks">
              <ListTodo className="w-3.5 h-3.5 mr-1" /> Tasks
            </TabsTrigger>
            {isPastMeeting && (
              <TabsTrigger value="process" data-testid="tab-meeting-process">
                <Zap className="w-3.5 h-3.5 mr-1" /> Process
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="prep" className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                AI-generated meeting preparation brief
              </p>
              <Button
                size="sm"
                onClick={() => prepMutation.mutate()}
                disabled={prepMutation.isPending}
                data-testid="button-generate-prep"
              >
                {prepMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate Prep</>
                )}
              </Button>
            </div>
            {prepContent ? (
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-md bg-muted/40 whitespace-pre-wrap text-sm" data-testid="text-prep-content">
                {prepContent}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Click "Generate Prep" to create an AI-powered meeting brief</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter meeting notes here..."
              className="min-h-[200px] text-sm"
              data-testid="input-meeting-notes"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => saveNotesMutation.mutate()}
                disabled={saveNotesMutation.isPending}
                data-testid="button-save-notes"
              >
                {saveNotesMutation.isPending ? "Saving..." : "Save Notes"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => actionItemsMutation.mutate()}
                disabled={actionItemsMutation.isPending || !notes}
                data-testid="button-extract-actions"
              >
                {actionItemsMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Extracting...</>
                ) : (
                  <><CheckSquare className="w-3.5 h-3.5 mr-1.5" />Extract Action Items</>
                )}
              </Button>
            </div>
            {actionItems && (
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-md bg-muted/40 whitespace-pre-wrap text-sm" data-testid="text-action-items">
                {actionItems}
              </div>
            )}
          </TabsContent>

          <TabsContent value="note-records" className="space-y-4">
            <MeetingNoteRecords meetingId={meeting.id} />
          </TabsContent>

          <TabsContent value="follow-up" className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Generate a follow-up email based on meeting notes
              </p>
              <Button
                size="sm"
                onClick={() => followUpMutation.mutate()}
                disabled={followUpMutation.isPending || !notes}
                data-testid="button-generate-email"
              >
                {followUpMutation.isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating...</>
                ) : (
                  <><Send className="w-3.5 h-3.5 mr-1.5" />Generate Email</>
                )}
              </Button>
            </div>
            {!notes && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Save meeting notes first, then generate a follow-up email
              </p>
            )}
            {followUpEmail && (
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-md bg-muted/40 whitespace-pre-wrap text-sm" data-testid="text-followup-email">
                {followUpEmail}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transcript" className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Upload a Zoom transcript (.vtt or .txt) for AI analysis
              </p>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleTranscriptFile}
                  accept=".vtt,.txt,.csv"
                  className="hidden"
                  data-testid="input-transcript-file"
                />
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={transcriptMutation.isPending}
                  data-testid="button-upload-transcript"
                >
                  {transcriptMutation.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Analyzing...</>
                  ) : (
                    <><Upload className="w-3.5 h-3.5 mr-1.5" />Upload Transcript</>
                  )}
                </Button>
              </div>
            </div>
            {transcriptSummary ? (
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-md bg-muted/40 whitespace-pre-wrap text-sm" data-testid="text-transcript-summary">
                {transcriptSummary}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Upload className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Upload a Zoom meeting transcript to generate an AI-powered summary</p>
                <p className="text-xs mt-1">Supports .vtt (WebVTT) and .txt formats from Zoom recordings</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <MeetingTasksPanel meetingId={meeting.id} clientId={meeting.clientId} />
          </TabsContent>

          {isPastMeeting && (
            <TabsContent value="process" className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">AI Meeting Pipeline</p>
                  <p className="text-xs text-muted-foreground">
                    Summarize, extract action items, create tasks, and generate follow-up email in one step
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => processMeetingMutation.mutate()}
                  disabled={processMeetingMutation.isPending || !hasContent}
                  data-testid="button-process-meeting"
                >
                  {processMeetingMutation.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Processing...</>
                  ) : (
                    <><Zap className="w-3.5 h-3.5 mr-1.5" />Process Meeting</>
                  )}
                </Button>
              </div>

              {!hasContent && (
                <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/30">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Add notes or upload a transcript before processing</p>
                </div>
              )}

              {processMeetingMutation.isPending && (
                <div className="flex flex-col items-center justify-center py-10 border rounded-md bg-muted/30 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Processing meeting...</p>
                    <p className="text-xs text-muted-foreground mt-1">Generating summary, extracting action items, creating tasks</p>
                  </div>
                </div>
              )}

              {processResult && !processMeetingMutation.isPending && (
                <div className="space-y-4" data-testid="process-result">
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Processing complete in {(processResult.duration_ms / 1000).toFixed(1)}s</span>
                  </div>

                  <div className="border rounded-md p-3 space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Summary
                    </h4>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto" data-testid="text-process-summary">
                      {processResult.summary}
                    </div>
                  </div>

                  {processResult.actionItems?.length > 0 && (
                    <div className="border rounded-md p-3 space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-primary" /> Action Items ({processResult.actionItems.length})
                      </h4>
                      <div className="space-y-1.5">
                        {processResult.actionItems.map((item: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm" data-testid={`action-item-${i}`}>
                            <CheckCircle className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="flex-1">
                              <span>{item.description}</span>
                              <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span className="capitalize">{item.owner}</span>
                                <span>{item.priority}</span>
                                <span>{item.dueDate}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {processResult.tasksCreated?.length > 0 && (
                    <div className="border rounded-md p-3 space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-1.5">
                        <ListTodo className="w-3.5 h-3.5 text-primary" /> Tasks Created ({processResult.tasksCreated.length})
                      </h4>
                      <div className="space-y-1">
                        {processResult.tasksCreated.map((task: any, i: number) => (
                          <div key={i} className="text-sm flex items-center gap-2" data-testid={`created-task-${i}`}>
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            <span>{task.title}</span>
                            <Badge variant="outline" className="text-xs no-default-active-elevate">{task.owner}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {processResult.followUpEmail && (
                    <div className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-primary" /> Follow-Up Email
                        </h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(processResult.followUpEmail.body);
                            toast({ title: "Email copied to clipboard" });
                          }}
                          data-testid="button-copy-email"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                        </Button>
                      </div>
                      {processResult.followUpEmail.to && (
                        <p className="text-xs text-muted-foreground">To: {processResult.followUpEmail.to}</p>
                      )}
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-muted/30 rounded p-2" data-testid="text-process-email">
                        {processResult.followUpEmail.body}
                      </div>
                    </div>
                  )}

                  {processResult.salesforceSync?.status !== "skipped" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {processResult.salesforceSync?.status === "pending" ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salesforce sync in progress</>
                      ) : processResult.salesforceSync?.status === "error" ? (
                        <><AlertCircle className="w-3.5 h-3.5 text-destructive" /> Salesforce sync failed</>
                      ) : (
                        <><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Synced to Salesforce</>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t pt-4 space-y-3" data-testid="signals-section">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Meeting Signals</p>
                    <p className="text-xs text-muted-foreground">
                      Scan for life events, material changes, and workflow triggers
                    </p>
                  </div>
                  <SignalScanner
                    meetingId={meeting.id}
                    clientId={meeting.clientId}
                    hasContent={hasContent}
                    onScanStarted={(jobId) => setSignalJobId(jobId)}
                    isScanning={signalScanJob.isLoading && !!signalJobId}
                  />
                </div>

                {signalScanJob.isLoading && signalJobId && (
                  <div className="flex flex-col items-center justify-center py-6 border rounded-md bg-muted/30 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Scanning for signals...</p>
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
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground" data-testid="no-signals-yet">
                    No signals scanned yet for this meeting
                  </div>
                )}

                {signalScanJob.status === "completed" && displaySignals.length === 0 && (
                  <SignalCards
                    signals={[]}
                    noSignalSummary={signalScanJob.data?.no_signal_summary}
                  />
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </ScrollArea>
    </DialogContent>
  );
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  return days;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMeetingColor(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("review") || t.includes("quarterly")) return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
  if (t.includes("discovery")) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (t.includes("estate") || t.includes("planning")) return "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30";
  if (t.includes("tax")) return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  if (t.includes("onboarding")) return "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30";
  return "bg-primary/10 text-primary border-primary/30";
}

export default function Meetings() {
  const { data: meetings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/meetings"],
  });
  const { data: allTasks = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
  });
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [selectedDayMeetings, setSelectedDayMeetings] = useState<any[] | null>(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState<any[] | null>(null);
  const [selectedDayLabel, setSelectedDayLabel] = useState("");
  const router = useRouter();
  const [syncTime] = useState(() => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
  const [showMeetings, setShowMeetings] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  const [clientFilter, setClientFilter] = useState("all");

  const clientOptions = useMemo(() => {
    const clientMap = new Map<string, { id: string; name: string }>();
    meetings?.forEach((m: any) => {
      if (m.client) clientMap.set(m.client.id, { id: m.client.id, name: `${m.client.firstName} ${m.client.lastName}` });
    });
    allTasks.forEach((t: any) => {
      if (t.clientId && t.clientName) clientMap.set(t.clientId, { id: t.clientId, name: t.clientName });
    });
    return Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [meetings, allTasks]);

  const filteredMeetings = useMemo(() => {
    if (!showMeetings) return [];
    let result = meetings || [];
    if (clientFilter !== "all") result = result.filter((m: any) => m.client?.id === clientFilter);
    return result;
  }, [meetings, showMeetings, clientFilter]);

  const filteredTasks = useMemo(() => {
    if (!showTasks) return [];
    let result = allTasks.filter((t: any) => t.dueDate && t.status !== "completed");
    if (clientFilter !== "all") result = result.filter((t: any) => t.clientId === clientFilter);
    return result;
  }, [allTasks, showTasks, clientFilter]);

  const meetingsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredMeetings.forEach(m => {
      const key = m.startTime.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    Object.values(map).forEach(arr => arr.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [filteredMeetings]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredTasks.forEach((t: any) => {
      const key = t.dueDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [filteredTasks]);

  const monthDays = useMemo(
    () => getMonthDays(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const today = new Date();
  const todayStr = dateKey(today);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  const allMeetings = meetings || [];
  const todaysMeetings = allMeetings.filter(m => m.startTime.startsWith(todayStr));
  const upcoming = filteredMeetings.filter(m => m.startTime >= todayStr && m.status !== "completed");
  const past = filteredMeetings.filter(m => m.status === "completed");

  const hasActiveFilters = !showMeetings || !showTasks || clientFilter !== "all";
  const clearFilters = () => { setShowMeetings(true); setShowTasks(true); setClientFilter("all"); };

  const handleDayClick = (day: { date: Date; isCurrentMonth: boolean }) => {
    const key = dateKey(day.date);
    const dayMeetings = meetingsByDate[key] || [];
    const dayTasks = tasksByDate[key] || [];
    const totalItems = dayMeetings.length + dayTasks.length;
    if (totalItems === 0) return;
    if (dayMeetings.length === 1 && dayTasks.length === 0) {
      setSelectedMeeting(dayMeetings[0]);
    } else if (totalItems >= 1) {
      setSelectedDayMeetings(dayMeetings);
      setSelectedDayTasks(dayTasks);
      setSelectedDayLabel(day.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
    }
  };

  return (
    <div className="space-y-6" style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Mono style={{ fontSize: 11, color: P.lt }}>
          {todaysMeetings.length} today | {upcoming.length} upcoming | {past.length} completed
        </Mono>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: P.lt,
            background: P.odSurf, border: `1px solid ${P.odBorder}`, borderRadius: 99,
            padding: "4px 12px",
          }} data-testid="text-outlook-sync">
            <Mail style={{ width: 14, height: 14, color: "#0078D4" }} />
            <span>Outlook synced</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span>{syncTime}</span>
            <RefreshCw style={{ width: 12, height: 12, cursor: "pointer" }} data-testid="button-sync-outlook" />
          </div>
          <div style={{ display: "flex", border: `1px solid ${P.odBorder}`, borderRadius: 6, overflow: "hidden" }}>
            {[
              { mode: "calendar" as const, icon: <CalendarDays style={{ width: 14, height: 14 }} /> },
              { mode: "list" as const, icon: <List style={{ width: 14, height: 14 }} /> },
            ].map(v => (
              <button key={v.mode} onClick={() => setViewMode(v.mode)} style={{
                padding: "6px 10px", border: "none", cursor: "pointer",
                background: viewMode === v.mode ? P.odBg : "transparent",
                color: viewMode === v.mode ? P.nText : P.lt,
                display: "flex", alignItems: "center",
              }} data-testid={`button-view-${v.mode}`}>{v.icon}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: P.lt, marginRight: 4 }}>
          <Filter style={{ width: 14, height: 14 }} />
          <span>Filter:</span>
        </div>
        {[
          { active: showMeetings, toggle: () => setShowMeetings(!showMeetings), label: "Meetings", icon: <Calendar style={{ width: 12, height: 12 }} />, testId: "filter-meetings" },
          { active: showTasks, toggle: () => setShowTasks(!showTasks), label: "Tasks", icon: <CheckSquare style={{ width: 12, height: 12 }} />, testId: "filter-tasks" },
        ].map(f => (
          <button key={f.testId} onClick={f.toggle} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "4px 12px",
            borderRadius: 99, border: `1px solid ${f.active ? P.blue : P.odBorder}`,
            background: f.active ? P.bFr : "transparent",
            color: f.active ? P.blue : P.lt, fontSize: 11, fontWeight: 600, cursor: "pointer",
          }} data-testid={f.testId}>{f.icon}{f.label}</button>
        ))}
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="h-7 text-xs w-[180px]" data-testid="filter-client">
            <Users className="w-3 h-3 mr-1 shrink-0" />
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clientOptions.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <button onClick={clearFilters} style={{
            display: "flex", alignItems: "center", gap: 4, padding: "4px 10px",
            border: "none", background: "transparent", color: P.lt,
            fontSize: 11, cursor: "pointer",
          }} data-testid="filter-clear"><X style={{ width: 12, height: 12 }} />Clear</button>
        )}
      </div>

      {viewMode === "calendar" ? (
        <div style={{ borderRadius: 6, background: P.odSurf, border: `1px solid ${P.odBorder}`, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${P.odBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Button variant="outline" size="icon" onClick={prevMonth} data-testid="button-prev-month">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Serif style={{ fontSize: 16, fontWeight: 600, color: P.odT1, minWidth: 180, textAlign: "center" }} data-testid="text-current-month">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Serif>
              <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <button onClick={goToday} style={{
                padding: "4px 12px", borderRadius: 4, border: `1px solid ${P.odBorder}`,
                background: "transparent", fontSize: 11, fontWeight: 600, color: P.lt, cursor: "pointer",
              }} data-testid="button-today">Today</button>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${P.odBorder}` }}>
              {DAY_NAMES.map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: P.lt, padding: "8px 0", borderRight: `1px solid ${P.odBorder}` }}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day, idx) => {
                const key = dateKey(day.date);
                const dayMeetings = meetingsByDate[key] || [];
                const dayTasks = tasksByDate[key] || [];
                const isToday = key === todayStr;
                const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                const totalItems = dayMeetings.length + dayTasks.length;
                const maxVisible = 3;
                const visibleMeetings = dayMeetings.slice(0, maxVisible);
                const remainingSlots = maxVisible - visibleMeetings.length;
                const visibleTasks = remainingSlots > 0 ? dayTasks.slice(0, remainingSlots) : [];
                const overflow = totalItems - visibleMeetings.length - visibleTasks.length;

                return (
                  <div
                    key={idx}
                    className="hv-glow"
                    style={{
                      minHeight: 100, borderRight: `1px solid ${P.odBorder}`, borderBottom: `1px solid ${P.odBorder}`,
                      padding: 4, cursor: "pointer",
                      background: !day.isCurrentMonth ? P.odSurf2 : isWeekend ? `${P.odBorder}40` : "transparent",
                    }}
                    onClick={() => handleDayClick(day)}
                    data-testid={`cell-day-${key}`}
                  >
                    <div style={{
                      fontSize: 11, fontWeight: 600, marginBottom: 2, width: 24, height: 24,
                      display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 99,
                      background: isToday ? P.odBg : "transparent",
                      color: isToday ? "#fff" : !day.isCurrentMonth ? P.lt : P.odT2,
                    }}>
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {visibleMeetings.map((m: any) => (
                        <div
                          key={m.id}
                          style={{
                            fontSize: 10, lineHeight: 1.3, padding: "2px 4px", borderRadius: 3,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            background: m.type === "portfolio_review" ? P.bFr : m.type === "planning" ? P.gL : P.aL,
                            color: m.type === "portfolio_review" ? P.blue : m.type === "planning" ? P.grn : P.amb,
                            opacity: m.status === "completed" ? 0.6 : 1,
                            marginBottom: 2,
                          }}
                          title={`${formatTime(m.startTime)} ${m.title}${m.client ? ` — ${m.client.firstName} ${m.client.lastName}` : ""}`}
                          data-testid={`event-meeting-${m.id}`}
                        >
                          <span style={{ fontWeight: 600 }}>{formatTime(m.startTime)}</span>{" "}
                          {m.client ? `${m.client.firstName} ${m.client.lastName}` : m.title}
                        </div>
                      ))}
                      {visibleTasks.map((t: any) => (
                        <div
                          key={`task-${t.id}`}
                          style={{
                            fontSize: 10, lineHeight: 1.3, padding: "2px 4px", borderRadius: 3,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            background: `${P.blue}18`, color: P.blue,
                            fontWeight: t.priority === "high" ? 600 : 400,
                            marginBottom: 2,
                          }}
                          title={`Task: ${t.title}${t.clientName ? ` — ${t.clientName}` : ""}${t.dueDate ? ` (Due ${t.dueDate})` : ""}`}
                          data-testid={`event-task-${t.id}`}
                        >
                          <CheckSquare style={{ width: 9, height: 9, display: "inline-block", marginRight: 2, verticalAlign: -1 }} />
                          {t.clientName ? `${t.clientName.split(" ")[0]} — ` : ""}{t.title}
                        </div>
                      ))}
                      {overflow > 0 && (
                        <div style={{ fontSize: 10, color: P.lt, paddingLeft: 4, fontWeight: 600 }}>
                          +{overflow} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="upcoming">
          <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${P.odBorder}` }}>
            {[
              { id: "upcoming", l: `Upcoming (${upcoming.length})` },
              { id: "past", l: `Past (${past.length})` },
            ].map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} style={{
                padding: "8px 18px 10px", border: "none", background: "transparent",
                fontFamily: "'DM Sans'", fontSize: 12, cursor: "pointer",
              }} data-testid={`tab-${tab.id}`}>
                {tab.l}
              </TabsTrigger>
            ))}
          </div>

          <TabsContent value="upcoming">
            {upcoming.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <Calendar style={{ width: 40, height: 40, color: P.lt, margin: "0 auto 12px", opacity: 0.5 }} />
                <p style={{ fontSize: 13, color: P.lt }}>No upcoming meetings</p>
              </div>
            )}
            {upcoming.map((meeting: any, idx: number) => (
              <MeetingCard key={meeting.id} meeting={meeting} idx={idx} onClick={() => setSelectedMeeting(meeting)} />
            ))}
          </TabsContent>

          <TabsContent value="past">
            {past.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <Calendar style={{ width: 40, height: 40, color: P.lt, margin: "0 auto 12px", opacity: 0.5 }} />
                <p style={{ fontSize: 13, color: P.lt }}>No past meetings</p>
              </div>
            )}
            {past.map((meeting: any, idx: number) => (
              <MeetingCard key={meeting.id} meeting={meeting} idx={idx} onClick={() => setSelectedMeeting(meeting)} past />
            ))}
          </TabsContent>
        </Tabs>
      )}

      {selectedMeeting && (
        <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
          <MeetingDetailDialog meeting={selectedMeeting} onNavigateToClient={() => setSelectedMeeting(null)} />
        </Dialog>
      )}

      {selectedDayMeetings && (
        <Dialog open={!!selectedDayMeetings} onOpenChange={() => { setSelectedDayMeetings(null); setSelectedDayTasks(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <Serif style={{ fontSize: 16, fontWeight: 600, color: P.odT1 }} data-testid="text-day-meetings-title">{selectedDayLabel}</Serif>
            </DialogHeader>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedDayMeetings.map((m: any) => (
                <div
                  key={m.id}
                  className="hv-glow"
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: 12, borderRadius: 6, border: `1px solid ${P.odBorder}`,
                    borderLeft: `3px solid ${m.status === "completed" ? P.lt : P.blue}`,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedDayMeetings(null);
                    setSelectedDayTasks(null);
                    setSelectedMeeting(m);
                  }}
                  data-testid={`day-meeting-${m.id}`}
                >
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: P.odT2 }}>{m.title}</span>
                    <Mono style={{ fontSize: 10, color: P.lt, display: "block", marginTop: 2 }}>
                      {formatTime(m.startTime)} - {formatTime(m.endTime)}
                      {m.client && ` | ${m.client.firstName} ${m.client.lastName}`}
                    </Mono>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {m.client && (
                      <NextLink
                        href={`/clients/${m.client.id}`}
                        style={{ color: P.blue }}
                        onClick={(e: any) => {
                          e.stopPropagation();
                          setSelectedDayMeetings(null);
                          setSelectedDayTasks(null);
                        }}
                        data-testid={`link-day-client-${m.client.id}`}
                      >
                        <User style={{ width: 14, height: 14 }} />
                      </NextLink>
                    )}
                    <ChevronRight style={{ width: 14, height: 14, color: P.lt }} />
                  </div>
                </div>
              ))}
              {selectedDayTasks && selectedDayTasks.length > 0 && (
                <>
                  {selectedDayMeetings.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8 }}>
                      <div style={{ height: 1, flex: 1, background: P.odBorder }} />
                      <Lbl>Tasks Due</Lbl>
                      <div style={{ height: 1, flex: 1, background: P.odBorder }} />
                    </div>
                  )}
                  {selectedDayTasks.map((t: any) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: 12,
                        borderRadius: 6, border: `1px solid ${P.odBorder}`, borderLeft: `3px solid ${P.grn}`,
                      }}
                      data-testid={`day-task-${t.id}`}
                    >
                      <CheckSquare style={{ width: 16, height: 16, color: P.grn, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: P.odT2 }}>{t.title}</span>
                        <Mono style={{ fontSize: 10, color: P.lt, display: "block", marginTop: 2 }}>
                          {t.clientName && <><User style={{ width: 10, height: 10, display: "inline-block", marginRight: 3, verticalAlign: -1 }} />{t.clientName} · </>}
                          {t.type?.replace(/_/g, " ")} {t.priority === "high" ? " · High priority" : ""}
                        </Mono>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function MeetingCard({ meeting, idx, onClick, past }: { meeting: any; idx: number; onClick: () => void; past?: boolean }) {
  const typeColor = meeting.type === "portfolio_review" ? P.blue : meeting.type === "planning" ? P.grn : P.amb;
  const typeBg = meeting.type === "portfolio_review" ? P.bFr : meeting.type === "planning" ? P.gL : P.aL;
  const dt = new Date(meeting.startTime);

  return (
    <div
      className="animate-si hv-glow"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 20px",
        borderRadius: 6, marginBottom: 8, background: P.odSurf,
        border: `1px solid ${P.odBorder}`, cursor: "pointer",
        opacity: past ? 0.7 : 1,
        animationDelay: `${idx * 30}ms`,
      }}
      data-testid={past ? `card-meeting-past-${meeting.id}` : `card-meeting-${meeting.id}`}
    >
      <div style={{ textAlign: "center", minWidth: 50 }}>
        <Lbl>{dt.toLocaleDateString("en-US", { month: "short" })}</Lbl>
        <Serif style={{ fontSize: 24, fontWeight: 600, color: past ? P.lt : P.odT1, display: "block", lineHeight: 1.1 }}>
          {dt.getDate()}
        </Serif>
        <Mono style={{ fontSize: 10, color: P.lt }}>{dt.toLocaleDateString("en-US", { weekday: "short" })}</Mono>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: P.odT2 }}>{meeting.title}</span>
          <Pill label={meeting.type?.replace(/_/g, " ")} c={typeColor} bg={typeBg} />
          {meeting.startTime?.startsWith?.(new Date().toISOString().slice(0, 10)) && (
            <Pill label="Today" c="#fff" bg={P.blue} />
          )}
          {past && <Pill label="Completed" c={P.grn} bg={P.gL} />}
        </div>
        {meeting.client && (
          <div style={{ fontSize: 12, color: P.odT3, marginBottom: 4 }}>
            <User style={{ width: 12, height: 12, display: "inline-block", marginRight: 4, verticalAlign: -1 }} />
            {meeting.client.firstName} {meeting.client.lastName}
            {meeting.client.segment && <span style={{ color: P.lt }}> | Tier {meeting.client.segment}</span>}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Mono style={{ fontSize: 10, color: P.lt, display: "flex", alignItems: "center", gap: 4 }}>
            <Clock style={{ width: 12, height: 12 }} />
            {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
          </Mono>
          {meeting.location && (
            <Mono style={{ fontSize: 10, color: P.lt, display: "flex", alignItems: "center", gap: 4 }}>
              <MeetingTypeIcon location={meeting.location} />
              {meeting.location}
            </Mono>
          )}
          {meeting.prepBrief && <Pill label="Prep Ready" c={P.grn} bg={P.gL} dot />}
          {meeting.transcriptSummary && <Pill label="Summary" c={P.blue} bg={P.bFr} />}
        </div>
        {meeting.taskCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <Pill label={`${meeting.activeTaskCount} task${meeting.activeTaskCount !== 1 ? "s" : ""}${meeting.completedTaskCount > 0 ? ` (${meeting.completedTaskCount} done)` : ""}`} c={P.blue} bg={P.bFr} />
            {meeting.tasks?.slice(0, 2).map((t: any) => (
              <Mono key={t.id} style={{ fontSize: 10, color: P.lt, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.title}
              </Mono>
            ))}
          </div>
        )}
        {meeting.notes && (
          <div style={{ fontSize: 11, color: P.lt, marginTop: 4, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meeting.notes}</div>
        )}
      </div>
      {meeting.client && (
        <NextLink
          href={`/clients/${meeting.client.id}`}
          onClick={(e: any) => e.stopPropagation()}
          style={{ fontSize: 11, color: P.blue, textDecoration: "underline", flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }}
          data-testid={past ? `link-list-client-past-${meeting.client.id}` : `link-list-client-${meeting.client.id}`}
        >
          <User style={{ width: 12, height: 12 }} /> View
        </NextLink>
      )}
      <ChevronRight style={{ width: 16, height: 16, color: P.lt, flexShrink: 0, marginTop: 8 }} />
    </div>
  );
}
