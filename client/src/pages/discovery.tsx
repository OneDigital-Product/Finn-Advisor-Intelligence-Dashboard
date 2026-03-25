import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Compass,
  Plus,
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileText,
  Users,
  Loader2,
  Trash2,
  UserPlus,
  ClipboardList,
  CheckCircle,
  Clock,
  ArrowRight,
  MessageSquare,
  Target,
  Heart,
  Shield,
  TrendingUp,
  Search,
  Mail,
  Send,
} from "lucide-react";

const CLIENT_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "couple", label: "Couple" },
  { value: "business_owner", label: "Business Owner" },
  { value: "inheritor", label: "Inheritor" },
];

const WIZARD_SECTIONS = [
  { key: "background", title: "Personal Background", icon: Users, description: "Build rapport and understand their story" },
  { key: "financial", title: "Financial Snapshot", icon: TrendingUp, description: "High-level financial picture" },
  { key: "values", title: "Values & Priorities", icon: Heart, description: "What matters most to them" },
  { key: "moneyStory", title: "Money Story", icon: MessageSquare, description: "Their relationship with money" },
  { key: "risk", title: "Risk Attitudes", icon: Shield, description: "Understanding risk comfort" },
  { key: "goals", title: "Goals Hierarchy", icon: Target, description: "Short, medium, and long-term goals" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: "secondary",
    in_progress: "default",
    questionnaire_sent: "outline",
    completed: "default",
  };
  return <Badge variant={map[status] as any || "secondary"} className="no-default-active-elevate" data-testid={`badge-status-${status}`}>{status.replace(/_/g, " ")}</Badge>;
}

export default function DiscoveryPage({ params: propParams }: { params?: { id?: string } } = {}) {
  const routeParams = useParams();
  const sessionId = propParams?.id || (routeParams?.id as string);

  if (sessionId) {
    return <DiscoverySessionDetail sessionId={sessionId} />;
  }
  return <DiscoveryDashboard />;
}

function DiscoveryDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newClientType, setNewClientType] = useState("individual");
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/discovery/sessions"],
  });

  const { data: questionnaires = [] } = useQuery<any[]>({
    queryKey: ["/api/discovery/questionnaires"],
  });

  const { data: allClientsRaw } = useQuery<any>({
    queryKey: ["/api/clients"],
  });
  // /api/clients returns { clients: [...] } when MuleSoft/pagination is active,
  // or a raw array from local DB without params. Normalize to always be an array.
  const allClients: any[] = Array.isArray(allClientsRaw) ? allClientsRaw : (allClientsRaw?.clients ?? []);

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/discovery/sessions", {
        clientType: newClientType,
        prospectName: prospectName || null,
        prospectEmail: prospectEmail || null,
        clientId: selectedClientId,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/sessions"] });
      toast({ title: "Discovery session created" });
      setNewSessionOpen(false);
      setProspectName("");
      setProspectEmail("");
      setSelectedClientId(null);
      router.push(`/discovery/${data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/discovery/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/sessions"] });
      toast({ title: "Session deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete session", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const filteredClients = allClients.filter((c: any) => {
    if (!clientSearch) return true;
    const name = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
    return name.includes(clientSearch.toLowerCase());
  });

  const activeSessions = sessions.filter((s: any) => s.status !== "completed");
  const completedSessions = sessions.filter((s: any) => s.status === "completed");

  return (
    <div className="container max-w-6xl py-6 px-4" data-testid="page-discovery">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Discovery</h1>
          <p className="text-muted-foreground mt-1">Structured discovery meeting framework for new clients</p>
        </div>
        <Button onClick={() => setNewSessionOpen(true)} data-testid="button-new-session">
          <Plus className="w-4 h-4 mr-2" /> New Session
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active-sessions">
            <Play className="w-3.5 h-3.5 mr-1" /> Active ({activeSessions.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed-sessions">
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Completed ({completedSessions.length})
          </TabsTrigger>
          <TabsTrigger value="questionnaires" data-testid="tab-questionnaires">
            <ClipboardList className="w-3.5 h-3.5 mr-1" /> Questionnaires ({questionnaires.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {sessionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : activeSessions.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Compass}
                  title="No active discovery sessions"
                  description="Discovery sessions guide your client meetings with structured questionnaires covering goals, risk tolerance, and financial situation."
                  actionLabel="Start Discovery Session"
                  actionIcon={Plus}
                  onAction={() => setNewSessionOpen(true)}
                  timeEstimate="Takes about 15-30 minutes per session"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {activeSessions.map((session: any) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onOpen={() => router.push(`/discovery/${session.id}`)}
                  onDelete={() => deleteSessionMutation.mutate(session.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedSessions.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={CheckCircle}
                  title="No completed discovery sessions yet"
                  description="Completed sessions will appear here with their summaries and action items. Start and complete a discovery session to see results."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {completedSessions.map((session: any) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onOpen={() => router.push(`/discovery/${session.id}`)}
                  onDelete={() => deleteSessionMutation.mutate(session.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="questionnaires" className="mt-4">
          <QuestionnaireManager />
        </TabsContent>
      </Tabs>

      <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Discovery Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="select-client-type">Client Type</Label>
              <Select value={newClientType} onValueChange={setNewClientType}>
                <SelectTrigger id="select-client-type" data-testid="select-client-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPES.map(ct => (
                    <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="input-prospect-name">Client Name</Label>
              <Input
                value={prospectName}
                onChange={e => setProspectName(e.target.value)}
                placeholder="Enter client name"
                id="input-prospect-name"
                data-testid="input-prospect-name"
              />
            </div>
            <div>
              <Label htmlFor="input-prospect-email">Client Email (optional)</Label>
              <Input
                value={prospectEmail}
                onChange={e => setProspectEmail(e.target.value)}
                placeholder="client@email.com"
                id="input-prospect-email"
                data-testid="input-prospect-email"
              />
            </div>
            <div>
              <Label htmlFor="input-client-search">Link to Existing Client (optional)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={clientSearch}
                  onChange={e => setClientSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="pl-8"
                  id="input-client-search"
                  data-testid="input-client-search"
                />
              </div>
              {clientSearch && (
                <div className="mt-1 max-h-32 overflow-y-auto border rounded-md">
                  {filteredClients.slice(0, 5).map((c: any) => (
                    <button
                      key={c.id}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted ${selectedClientId === c.id ? "bg-primary/10 font-medium" : ""}`}
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setProspectName(`${c.firstName} ${c.lastName}`);
                        setProspectEmail(c.email || "");
                        setClientSearch("");
                      }}
                      data-testid={`button-select-client-${c.id}`}
                    >
                      {c.firstName} {c.lastName}
                    </button>
                  ))}
                </div>
              )}
              {selectedClientId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Linked to: {allClients.find((c: any) => c.id === selectedClientId)?.firstName} {allClients.find((c: any) => c.id === selectedClientId)?.lastName}
                  <button className="ml-2 text-destructive" onClick={() => setSelectedClientId(null)}>Remove</button>
                </p>
              )}
            </div>
            <Button
              className="w-full"
              onClick={() => createSessionMutation.mutate()}
              disabled={createSessionMutation.isPending || !prospectName}
              data-testid="button-create-session"
            >
              {createSessionMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionCard({ session, onOpen, onDelete }: { session: any; onOpen: () => void; onDelete: () => void }) {
  const typeLabel = CLIENT_TYPES.find(ct => ct.value === session.clientType)?.label || session.clientType;
  return (
    <Card className="cursor-pointer hover:border-primary/30 transition-colors" data-testid={`card-session-${session.id}`}>
      <CardContent className="py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0" onClick={onOpen}>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate" data-testid={`text-session-name-${session.id}`}>
                {session.prospectName || "Unnamed Client"}
              </span>
              {statusBadge(session.status)}
              <Badge variant="outline" className="no-default-active-elevate">{typeLabel}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(session.createdAt).toLocaleDateString()}
              </span>
              {session.prospectEmail && <span>{session.prospectEmail}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={onOpen} data-testid={`button-open-session-${session.id}`}>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(); }} data-testid={`button-delete-session-${session.id}`}>
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoverySessionDetail({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("questionnaire");
  const [wizardSection, setWizardSection] = useState(0);
  const [localQResponses, setLocalQResponses] = useState<Record<string, any>>({});
  const [localWResponses, setLocalWResponses] = useState<Record<string, any>>({});
  const [initialized, setInitialized] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<string | null>(null);
  const [showFactsReview, setShowFactsReview] = useState(false);
  const [extractedFacts, setExtractedFacts] = useState<any[]>([]);
  const [factActions, setFactActions] = useState<Record<number, "approve" | "reject">>({});
  const [captureJobId, setCaptureJobId] = useState<string | null>(null);
  const [isCommittingFacts, setIsCommittingFacts] = useState(false);
  const capturePollRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: session, isLoading } = useQuery<any>({
    queryKey: ["/api/discovery/sessions", sessionId],
  });

  const { data: questionnaire } = useQuery<any>({
    queryKey: ["/api/discovery/questionnaires", session?.questionnaireId],
    enabled: !!session?.questionnaireId,
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/discovery/templates"],
  });

  useEffect(() => {
    if (session && !initialized) {
      setLocalQResponses(session.questionnaireResponses || {});
      setLocalWResponses(session.wizardResponses || {});
      setWizardSection(session.currentSection || 0);
      setInitialized(true);
    }
  }, [session, initialized]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/discovery/sessions/${sessionId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/sessions", sessionId] });
      toast({ title: "Saved" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const talkingPointsMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync({
        questionnaireResponses: localQResponses,
        wizardResponses: localWResponses,
        currentSection: wizardSection,
        status: "in_progress",
      });
      const res = await apiRequest("POST", `/api/discovery/sessions/${sessionId}/talking-points`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/sessions", sessionId] });
      toast({ title: "Talking points generated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate talking points", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const summaryMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync({
        questionnaireResponses: localQResponses,
        wizardResponses: localWResponses,
        currentSection: wizardSection,
      });
      const res = await apiRequest("POST", `/api/discovery/sessions/${sessionId}/summary`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/sessions", sessionId] });
      toast({ title: "Summary generated" });
      setActiveTab("summary");
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate summary", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/discovery/sessions/${sessionId}/create-client`);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/sessions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      const msg = data.factFinderResponseId
        ? `${data.client.firstName} ${data.client.lastName} has been added and fact finder pre-populated.`
        : `${data.client.firstName} ${data.client.lastName} has been added.`;
      toast({ title: "Client created", description: msg });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  useEffect(() => {
    return () => {
      if (capturePollRef.current) clearTimeout(capturePollRef.current);
    };
  }, []);

  const handleIntakeResult = useCallback((output: any) => {
    const facts = output?.facts || [];
    if (facts.length > 0) {
      setExtractedFacts(facts);
      const defaultActions: Record<number, "approve" | "reject"> = {};
      facts.forEach((_: any, i: number) => { defaultActions[i] = "approve"; });
      setFactActions(defaultActions);
      setShowFactsReview(true);
    } else {
      toast({ title: "No facts extracted", description: "The AI could not extract structured facts from the responses", variant: "destructive" });
    }
    setIsCapturing(false);
    setCaptureStatus(null);
  }, [toast]);

  const subscribeToIntakeJob = useCallback((jobId: string) => {
    fetch(`/api/cassidy/stream/${jobId}`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          setIsCapturing(false);
          setCaptureStatus(null);
          toast({ title: "Error", description: "Failed to check job status", variant: "destructive" });
          return;
        }

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const data = await response.json();
          if (data.status === "completed" && data.output) {
            setCaptureStatus("Extracting facts...");
            handleIntakeResult(data.output);
          } else if (data.status === "failed" || data.status === "timed_out") {
            setIsCapturing(false);
            setCaptureStatus(null);
            toast({ title: "Capture failed", description: data.error || "The AI agent failed to extract facts", variant: "destructive" });
          } else {
            capturePollRef.current = setTimeout(() => subscribeToIntakeJob(jobId), 2000);
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
                        setCaptureStatus("Extracting facts...");
                        handleIntakeResult(event.output);
                        reader.cancel();
                        return;
                      }
                      if (event.status === "failed" || event.status === "timed_out") {
                        setIsCapturing(false);
                        setCaptureStatus(null);
                        toast({ title: "Capture failed", description: event.error || "The AI agent failed to extract facts", variant: "destructive" });
                        reader.cancel();
                        return;
                      }
                    } catch {}
                  }
                }
              }
            } catch (err: any) {
              setIsCapturing(false);
              setCaptureStatus(null);
              toast({ title: "Error", description: err.message, variant: "destructive", duration: Infinity });
            }
          };
          readStream();
          return;
        }

        capturePollRef.current = setTimeout(() => subscribeToIntakeJob(jobId), 2000);
      })
      .catch((err: any) => {
        setIsCapturing(false);
        setCaptureStatus(null);
        toast({ title: "Error", description: err.message, variant: "destructive", duration: Infinity });
      });
  }, [toast, handleIntakeResult]);

  const handleCaptureWithAI = async () => {
    if (!session?.clientId) {
      toast({ title: "No client linked", description: "Link a client to this session before capturing with AI", variant: "destructive" });
      return;
    }

    const parts: string[] = [];

    if (Object.keys(localQResponses).length > 0) {
      parts.push("=== QUESTIONNAIRE RESPONSES ===");
      const questionnaireData = questionnaire || templates.find((t: any) => t.clientType === session.clientType);
      const allQuestions = (questionnaireData?.sections || []).flatMap((s: any) => s.questions || []);
      for (const [qId, answer] of Object.entries(localQResponses)) {
        if (!answer) continue;
        const q = allQuestions.find((qq: any) => qq.id === qId);
        const label = q?.label || qId;
        parts.push(`${label}: ${typeof answer === "object" ? JSON.stringify(answer) : answer}`);
      }
    }

    if (Object.keys(localWResponses).length > 0) {
      parts.push("\n=== DISCOVERY WIZARD NOTES ===");
      for (const [sKey, notes] of Object.entries(localWResponses)) {
        if (!notes) continue;
        const sectionDef = WIZARD_SECTIONS.find(ws => ws.key === sKey);
        parts.push(`\n--- ${sectionDef?.title || sKey} ---`);
        parts.push(String(notes));
      }
    }

    const rawText = parts.join("\n");
    if (rawText.length < 50) {
      toast({ title: "Not enough data", description: "Please fill in more questionnaire or wizard responses before capturing", variant: "destructive" });
      return;
    }

    setIsCapturing(true);
    setCaptureStatus("Sending to AI agent...");

    try {
      const res = await apiRequest("POST", "/api/cassidy/submit-intake", {
        input: {
          raw_text: rawText,
          input_type: "notes",
          client_id: session.clientId,
        },
      });
      const data = await res.json();
      setCaptureJobId(data.job_id);
      setCaptureStatus("AI is extracting facts...");
      capturePollRef.current = setTimeout(() => subscribeToIntakeJob(data.job_id), 2000);
    } catch (err: any) {
      setIsCapturing(false);
      setCaptureStatus(null);
      toast({ title: "Failed to start capture", description: err.message, variant: "destructive" });
    }
  };

  const [sendEmail, setSendEmail] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [showSendDialog, setShowSendDialog] = useState(false);

  const sendQuestionnaireMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/discovery/sessions/${sessionId}/send-questionnaire`, {
        email: sendEmail,
        message: sendMessage || undefined,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/sessions", sessionId] });
      toast({ title: "Questionnaire sent", description: `Sent to ${sendEmail}` });
      setShowSendDialog(false);
      setSendEmail("");
      setSendMessage("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const res = await apiRequest("POST", "/api/discovery/questionnaires", {
        name: template.name,
        clientType: template.clientType,
        sections: template.sections,
      });
      const q = await res.json();
      await apiRequest("PATCH", `/api/discovery/sessions/${sessionId}`, {
        questionnaireId: q.id,
      });
      return q;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/sessions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/questionnaires"] });
      toast({ title: "Questionnaire template applied" });
    },
  });

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-6 px-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container max-w-6xl py-6 px-4 text-center">
        <p className="text-muted-foreground">Session not found</p>
        <Button variant="link" onClick={() => router.push("/discovery")}>Back to Discovery</Button>
      </div>
    );
  }

  const matchingTemplate = templates.find((t: any) => t.clientType === session.clientType);
  const questionnaireData = questionnaire || matchingTemplate;
  const sections: any[] = questionnaireData?.sections || [];

  return (
    <div className="container max-w-6xl py-6 px-4" data-testid="page-discovery-session">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/discovery")} data-testid="button-back-discovery">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-session-title">
            {session.prospectName || "Discovery Session"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {statusBadge(session.status)}
            <Badge variant="outline" className="no-default-active-elevate">
              {CLIENT_TYPES.find(ct => ct.value === session.clientType)?.label || session.clientType}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => saveMutation.mutate({
              questionnaireResponses: localQResponses,
              wizardResponses: localWResponses,
              currentSection: wizardSection,
              status: "in_progress",
            })}
            disabled={saveMutation.isPending}
            data-testid="button-save-session"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            Save
          </Button>
          {(session.status === "draft" || session.status === "in_progress") && session.questionnaireId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSendEmail(session.prospectEmail || "");
                setShowSendDialog(true);
              }}
              data-testid="button-send-questionnaire"
            >
              <Mail className="w-4 h-4 mr-1" /> Send Questionnaire
            </Button>
          )}
          {session.clientId && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCaptureWithAI}
              disabled={isCapturing}
              data-testid="button-capture-ai"
            >
              {isCapturing ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />{captureStatus || "Capturing..."}</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1" />Capture with AI</>
              )}
            </Button>
          )}
          {session.status === "completed" && !session.clientId && (
            <Button
              size="sm"
              onClick={() => createClientMutation.mutate()}
              disabled={createClientMutation.isPending}
              data-testid="button-create-client"
            >
              {createClientMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
              Create Client
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Pre-Meeting Questionnaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="input-send-email">Client Email</Label>
              <Input
                type="email"
                value={sendEmail}
                onChange={e => setSendEmail(e.target.value)}
                placeholder="client@email.com"
                id="input-send-email"
                data-testid="input-send-email"
              />
            </div>
            <div>
              <Label htmlFor="input-send-message">Personal Message (optional)</Label>
              <Textarea
                value={sendMessage}
                onChange={e => setSendMessage(e.target.value)}
                placeholder="Add a personal note to the questionnaire invitation..."
                rows={3}
                id="input-send-message"
                data-testid="input-send-message"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => sendQuestionnaireMutation.mutate()}
              disabled={!sendEmail || sendQuestionnaireMutation.isPending}
              data-testid="button-confirm-send-questionnaire"
            >
              {sendQuestionnaireMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Send Questionnaire
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="questionnaire" data-testid="tab-questionnaire">
            <ClipboardList className="w-3.5 h-3.5 mr-1" /> Questionnaire
          </TabsTrigger>
          <TabsTrigger value="wizard" data-testid="tab-wizard">
            <Compass className="w-3.5 h-3.5 mr-1" /> Discovery Wizard
          </TabsTrigger>
          <TabsTrigger value="talking-points" data-testid="tab-talking-points">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Talking Points
          </TabsTrigger>
          <TabsTrigger value="summary" data-testid="tab-summary">
            <FileText className="w-3.5 h-3.5 mr-1" /> Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questionnaire" className="mt-4">
          {!session.questionnaireId && sections.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <h3 className="font-semibold mb-4">Select a Questionnaire Template</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a template based on the client type, or use the recommended one.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {templates.map((template: any, i: number) => (
                    <Card
                      key={i}
                      className={`cursor-pointer hover:border-primary/40 transition-colors ${template.clientType === session.clientType ? "border-primary/30 bg-primary/5" : ""}`}
                      data-testid={`card-template-${template.clientType}`}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          {template.clientType === session.clientType && (
                            <Badge variant="default" className="text-xs no-default-active-elevate">Recommended</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          {template.sections.length} sections, {template.sections.reduce((sum: number, s: any) => sum + s.questions.length, 0)} questions
                        </p>
                        <Button
                          size="sm"
                          variant={template.clientType === session.clientType ? "default" : "outline"}
                          onClick={() => useTemplateMutation.mutate(template)}
                          disabled={useTemplateMutation.isPending}
                          data-testid={`button-use-template-${template.clientType}`}
                        >
                          {useTemplateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {sections.map((section: any, sIdx: number) => (
                <Card key={sIdx} data-testid={`card-questionnaire-section-${sIdx}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {section.questions.map((q: any) => {
                      if (q.conditionalOn) {
                        const depVal = localQResponses[q.conditionalOn.questionId];
                        if (String(depVal) !== String(q.conditionalOn.value)) return null;
                      }
                      return (
                        <QuestionField
                          key={q.id}
                          question={q}
                          value={localQResponses[q.id]}
                          onChange={(val) => setLocalQResponses(prev => ({ ...prev, [q.id]: val }))}
                        />
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
              <div className="flex justify-end">
                <Button onClick={() => setActiveTab("wizard")} data-testid="button-proceed-wizard">
                  Continue to Discovery Wizard <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="wizard" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="py-4 space-y-1">
                  {WIZARD_SECTIONS.map((ws, i) => {
                    const Icon = ws.icon;
                    const hasData = !!localWResponses[ws.key];
                    return (
                      <button
                        key={ws.key}
                        onClick={() => setWizardSection(i)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                          wizardSection === i ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                        }`}
                        data-testid={`button-wizard-section-${ws.key}`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{ws.title}</span>
                        {hasData && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <WizardSectionContent
                section={WIZARD_SECTIONS[wizardSection]}
                value={localWResponses[WIZARD_SECTIONS[wizardSection].key] || ""}
                onChange={(val) => setLocalWResponses(prev => ({
                  ...prev,
                  [WIZARD_SECTIONS[wizardSection].key]: val,
                }))}
                questionnaireData={localQResponses}
                clientType={session.clientType}
              />
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  disabled={wizardSection === 0}
                  onClick={() => setWizardSection(prev => prev - 1)}
                  data-testid="button-wizard-prev"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {wizardSection + 1} of {WIZARD_SECTIONS.length}
                </span>
                {wizardSection < WIZARD_SECTIONS.length - 1 ? (
                  <Button
                    onClick={() => setWizardSection(prev => prev + 1)}
                    data-testid="button-wizard-next"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => summaryMutation.mutate()}
                    disabled={summaryMutation.isPending}
                    data-testid="button-complete-discovery"
                  >
                    {summaryMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-1" /> Complete & Generate Summary</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="talking-points" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">AI-Generated Talking Points</CardTitle>
                <Button
                  size="sm"
                  onClick={() => talkingPointsMutation.mutate()}
                  disabled={talkingPointsMutation.isPending}
                  data-testid="button-generate-talking-points"
                >
                  {talkingPointsMutation.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5 mr-1" /> Generate Talking Points</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {session.talkingPoints ? (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm bg-muted/40 rounded-md p-4" data-testid="text-talking-points">
                  {session.talkingPoints}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Fill in the questionnaire first, then generate AI-powered talking points</p>
                  <p className="text-xs mt-1">Talking points are personalized based on questionnaire responses</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <div className="space-y-4">
            {session.summary ? (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Post-Discovery Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm bg-muted/40 rounded-md p-4" data-testid="text-discovery-summary">
                      {session.summary}
                    </div>
                  </CardContent>
                </Card>

                {session.engagementPathway && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="w-4 h-4" /> Engagement Pathway
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm" data-testid="text-engagement-pathway">{session.engagementPathway}</p>
                    </CardContent>
                  </Card>
                )}

                {session.recommendedNextSteps && Array.isArray(session.recommendedNextSteps) && session.recommendedNextSteps.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" /> Recommended Next Steps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(session.recommendedNextSteps as any[]).map((step: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-md border" data-testid={`card-next-step-${i}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              step.priority === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                              step.priority === "medium" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                              "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            }`}>
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{step.title}</span>
                                <Badge variant="outline" className="text-xs no-default-active-elevate capitalize">{step.priority}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                              {step.suggestedTimeline && (
                                <p className="text-xs text-primary mt-1">{step.suggestedTimeline}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!session.clientId && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-sm">Ready to onboard?</h3>
                        <p className="text-xs text-muted-foreground">Create a client profile from this discovery session data</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => createClientMutation.mutate()}
                        disabled={createClientMutation.isPending}
                        data-testid="button-create-client-summary"
                      >
                        {createClientMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Creating...</>
                        ) : (
                          <><UserPlus className="w-4 h-4 mr-1" /> Create Client Profile</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {session.clientId && (
                  <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-900/10">
                    <CardContent className="py-4 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">Client profile created</p>
                        <Button variant="link" className="p-0 h-auto text-xs" onClick={() => router.push(`/clients/${session.clientId}`)} data-testid="link-view-client">
                          View client profile <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Complete the discovery wizard to generate a post-meeting summary</p>
                  <Button variant="link" onClick={() => setActiveTab("wizard")} className="mt-2" data-testid="button-go-to-wizard">
                    Go to Discovery Wizard
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showFactsReview} onOpenChange={setShowFactsReview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> AI-Extracted Facts Review
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The AI extracted {extractedFacts.length} facts from the discovery responses. Review and approve facts to add to the client profile.
          </p>
          <ScrollArea className="flex-1 max-h-[50vh] pr-4">
            <div className="space-y-3">
              {extractedFacts.map((fact: any, idx: number) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 transition-colors ${
                    factActions[idx] === "reject" ? "bg-muted/50 opacity-60" : "bg-card"
                  }`}
                  data-testid={`card-fact-${idx}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] no-default-active-elevate">
                          {fact.fact_type || fact.category || "general"}
                        </Badge>
                        {fact.confidence && (
                          <Badge
                            variant={fact.confidence === "HIGH" ? "default" : "secondary"}
                            className="text-[10px] no-default-active-elevate"
                          >
                            {fact.confidence}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{fact.fact_label || fact.label || fact.key}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{fact.fact_value || fact.value}</p>
                      {fact.source_snippet && (
                        <p className="text-xs text-muted-foreground mt-1 italic">Source: {fact.source_snippet}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant={factActions[idx] === "approve" ? "default" : "outline"}
                        className="h-7 px-2 text-xs"
                        onClick={() => setFactActions(prev => ({ ...prev, [idx]: "approve" }))}
                        data-testid={`button-approve-fact-${idx}`}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Keep
                      </Button>
                      <Button
                        size="sm"
                        variant={factActions[idx] === "reject" ? "destructive" : "outline"}
                        className="h-7 px-2 text-xs"
                        onClick={() => setFactActions(prev => ({ ...prev, [idx]: "reject" }))}
                        data-testid={`button-reject-fact-${idx}`}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {Object.values(factActions).filter(a => a === "approve").length} of {extractedFacts.length} facts will be kept
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFactsReview(false)} data-testid="button-cancel-facts">
                Cancel
              </Button>
              <Button
                disabled={isCommittingFacts}
                onClick={async () => {
                  if (!captureJobId) {
                    toast({ title: "Error", description: "Missing job reference", variant: "destructive" });
                    return;
                  }
                  setIsCommittingFacts(true);
                  try {
                    const actions = extractedFacts.map((_: any, idx: number) => ({
                      fact_index: idx,
                      action: factActions[idx] === "reject" ? "reject" : "approve",
                    }));
                    await apiRequest("POST", "/api/cassidy/facts/complete-review", {
                      job_id: captureJobId,
                      actions,
                    });
                    const approvedCount = actions.filter(a => a.action === "approve").length;
                    toast({
                      title: "Facts captured",
                      description: `${approvedCount} facts committed. You can now generate a profile draft from the client's profile page.`,
                    });
                    setShowFactsReview(false);
                    setExtractedFacts([]);
                    setFactActions({});
                    setCaptureJobId(null);
                  } catch (err: any) {
                    toast({ title: "Failed to save facts", description: err.message, variant: "destructive" });
                  } finally {
                    setIsCommittingFacts(false);
                  }
                }}
                data-testid="button-confirm-facts"
              >
                {isCommittingFacts ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" />Confirm {Object.values(factActions).filter(a => a === "approve").length} Facts</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WizardSectionContent({
  section,
  value,
  onChange,
  questionnaireData,
  clientType,
}: {
  section: typeof WIZARD_SECTIONS[0];
  value: string;
  onChange: (val: string) => void;
  questionnaireData: Record<string, any>;
  clientType: string;
}) {
  const Icon = section.icon;
  const prompts = getWizardPrompts(section.key, clientType);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4" /> {section.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/40 rounded-md p-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Suggested Prompts</h4>
          <ul className="space-y-1.5">
            {prompts.map((prompt, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{prompt}</span>
              </li>
            ))}
          </ul>
        </div>

        {questionnaireData && Object.keys(questionnaireData).length > 0 && section.key === "background" && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-3">
            <h4 className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">From Questionnaire</h4>
            <p className="text-xs text-muted-foreground">
              {questionnaireData.occupation && `Occupation: ${questionnaireData.occupation}. `}
              {questionnaireData.maritalStatus && `Status: ${questionnaireData.maritalStatus}. `}
              {questionnaireData.referralSource && `Referral: ${questionnaireData.referralSource}. `}
            </p>
          </div>
        )}

        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Notes from the ${section.title.toLowerCase()} discussion...`}
          className="min-h-[200px] text-sm"
          data-testid={`input-wizard-${section.key}`}
        />
      </CardContent>
    </Card>
  );
}

function getWizardPrompts(sectionKey: string, clientType: string): string[] {
  const base: Record<string, string[]> = {
    background: [
      "Tell me about yourself and your family",
      "What do you do for work? How long have you been in your field?",
      "What motivated you to reach out to us?",
      "Have you worked with a financial advisor before?",
    ],
    financial: [
      "Can you give me a high-level picture of your financial life?",
      "What are your primary sources of income?",
      "Do you have any significant debts or obligations?",
      "What does your current savings/investment picture look like?",
    ],
    values: [
      "What does financial success mean to you personally?",
      "What are the most important things in your life right now?",
      "What keeps you up at night financially?",
      "If money were no object, what would your ideal life look like?",
    ],
    moneyStory: [
      "How did your family talk about money when you were growing up?",
      "What was your first significant financial decision?",
      "What financial lessons have stuck with you over the years?",
      "How do you and your partner (if applicable) approach financial decisions?",
    ],
    risk: [
      "How would you describe your comfort level with market ups and downs?",
      "What's the worst financial loss you've experienced? How did you react?",
      "If your portfolio dropped 20% tomorrow, what would you do?",
      "How important is preserving capital vs. growing wealth?",
    ],
    goals: [
      "What are your most important goals for the next 1-3 years?",
      "Where do you see yourself in 5-10 years?",
      "What does retirement look like for you? When would you like to retire?",
      "Are there any legacy or philanthropic goals that matter to you?",
    ],
  };

  const extra: Record<string, Record<string, string[]>> = {
    couple: {
      values: ["Do you and your partner share the same financial priorities?", "How do you make financial decisions as a couple?"],
      moneyStory: ["Did you and your partner grow up with similar attitudes toward money?"],
    },
    business_owner: {
      background: ["Tell me about your business — how did it start?", "Do you have a succession plan?"],
      financial: ["How intertwined are your personal and business finances?"],
      goals: ["What's your exit strategy for the business?"],
    },
    inheritor: {
      background: ["Tell me about the inheritance you've received or expect to receive"],
      moneyStory: ["How has receiving this inheritance affected your relationship with money?"],
      values: ["Do you feel a responsibility to honor the legacy of the person who left it?"],
    },
  };

  const basePrompts = base[sectionKey] || [];
  const typeExtras = extra[clientType]?.[sectionKey] || [];
  return [...basePrompts, ...typeExtras];
}

function QuestionField({ question, value, onChange }: { question: any; value: any; onChange: (val: any) => void }) {
  const id = `q-${question.id}`;

  return (
    <div className="space-y-1.5" data-testid={`field-${question.id}`}>
      <Label htmlFor={id} className="text-sm">
        {question.label}
        {question.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {question.type === "text" && (
        <Input
          id={id}
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder={question.placeholder}
          data-testid={`input-${question.id}`}
        />
      )}
      {question.type === "textarea" && (
        <Textarea
          id={id}
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder={question.placeholder}
          className="min-h-[80px]"
          data-testid={`input-${question.id}`}
        />
      )}
      {question.type === "number" && (
        <Input
          id={id}
          type="number"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          placeholder={question.placeholder}
          data-testid={`input-${question.id}`}
        />
      )}
      {question.type === "select" && (
        <Select value={value || ""} onValueChange={onChange}>
          <SelectTrigger data-testid={`select-${question.id}`}>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {(question.options || []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {question.type === "boolean" && (
        <div className="flex items-center gap-2">
          <Switch
            id={id}
            checked={value === true || value === "true"}
            onCheckedChange={onChange}
            data-testid={`switch-${question.id}`}
          />
          <Label htmlFor={id} className="text-sm text-muted-foreground">
            {value ? "Yes" : "No"}
          </Label>
        </div>
      )}
      {question.type === "date" && (
        <Input
          id={id}
          type="date"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          data-testid={`input-${question.id}`}
        />
      )}
    </div>
  );
}

function QuestionnaireManager() {
  const { toast } = useToast();
  const { data: questionnaires = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/discovery/questionnaires"],
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/discovery/templates"],
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      const res = await apiRequest("POST", "/api/discovery/questionnaires", {
        name: template.name,
        clientType: template.clientType,
        sections: template.sections,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/questionnaires"] });
      toast({ title: "Questionnaire created from template" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create questionnaire", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/discovery/questionnaires/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discovery/questionnaires"] });
      toast({ title: "Questionnaire deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete questionnaire", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  if (isLoading) {
    return <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm mb-3">Your Questionnaires</h3>
        {questionnaires.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <ClipboardList className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No custom questionnaires yet. Create one from a template below.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {questionnaires.map((q: any) => (
              <Card key={q.id} data-testid={`card-questionnaire-${q.id}`}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{q.name}</span>
                      <Badge variant="outline" className="no-default-active-elevate capitalize">{q.clientType.replace(/_/g, " ")}</Badge>
                      {q.isActive && <Badge variant="default" className="text-xs no-default-active-elevate">Active</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(q.sections as any[])?.length || 0} sections • Created {new Date(q.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(q.id)}
                    data-testid={`button-delete-questionnaire-${q.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-3">Available Templates</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((template: any, i: number) => {
            const existing = questionnaires.find((q: any) => q.clientType === template.clientType);
            return (
              <Card key={i} data-testid={`card-template-manage-${template.clientType}`}>
                <CardContent className="py-4">
                  <h4 className="font-medium text-sm">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.sections.length} sections, {template.sections.reduce((sum: number, s: any) => sum + s.questions.length, 0)} questions
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => createFromTemplateMutation.mutate(template)}
                    disabled={createFromTemplateMutation.isPending || !!existing}
                    data-testid={`button-create-from-template-${template.clientType}`}
                  >
                    {existing ? (
                      <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Already Created</>
                    ) : (
                      <><Plus className="w-3.5 h-3.5 mr-1" /> Create From Template</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
