import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Linkedin,
  Plus,
  Trash2,
  Eye,
  Sparkles,
  Bell,
  BellOff,
  Briefcase,
  Award,
  Building2,
  Heart,
  GraduationCap,
  Trophy,
  FileText,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Radio,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { P } from "@/styles/tokens";
import { Serif } from "@/components/design/typography";

interface SocialIntelligenceSectionProps {
  clientId: string;
  clientName: string;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  job_change: { label: "Job Change", icon: Briefcase, color: P.blue, bg: "rgba(107,143,224,.15)" },
  promotion: { label: "Promotion", icon: Award, color: P.grn, bg: "rgba(61,139,94,.15)" },
  company_milestone: { label: "Company Milestone", icon: Building2, color: P.amb, bg: "rgba(184,135,43,.15)" },
  life_event: { label: "Life Event", icon: Heart, color: P.red, bg: "rgba(196,75,75,.15)" },
  education: { label: "Education", icon: GraduationCap, color: P.bHi, bg: "rgba(138,174,240,.15)" },
  award: { label: "Award", icon: Trophy, color: P.gold, bg: "rgba(201,168,76,.15)" },
  publication: { label: "Publication", icon: FileText, color: P.mid, bg: "rgba(107,111,122,.15)" },
};

export function SocialIntelligenceSection({ clientId, clientName }: SocialIntelligenceSectionProps) {
  const { toast } = useToast();
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [profileUrl, setProfileUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulateProfileId, setSimulateProfileId] = useState("");
  const [simulateType, setSimulateType] = useState("job_change");
  const [simulateTitle, setSimulateTitle] = useState("");

  const { data: profiles, isLoading: profilesLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "social-profiles"],
    staleTime: 15 * 60 * 1000,
  });

  const { data: events, isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "social-events"],
    staleTime: 15 * 60 * 1000,
  });

  const addProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/social-profiles`, {
        clientId,
        profileUrl,
        displayName: displayName || undefined,
        platform: "linkedin",
        monitoringEnabled: true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "social-profiles"] });
      setAddProfileOpen(false);
      setProfileUrl("");
      setDisplayName("");
      toast({ title: "Profile linked", description: "Social profile has been added for monitoring." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add social profile.", variant: "destructive" });
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/social-profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "social-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "social-events"] });
      toast({ title: "Profile removed" });
    },
  });

  const toggleMonitoringMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await apiRequest("PATCH", `/api/social-profiles/${id}`, { monitoringEnabled: enabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "social-profiles"] });
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/social-monitor`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "social-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "social-profiles"] });
      toast({
        title: "Scan complete",
        description: `Checked ${data.checked} profiles, found ${data.newEvents} new events.`,
      });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiRequest("PATCH", `/api/social-events/${eventId}/read`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "social-events"] });
    },
  });

  const generateOutreachMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiRequest("POST", `/api/social-events/${eventId}/generate-outreach`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "social-events"] });
      setSelectedEvent(data);
      toast({ title: "Outreach generated", description: "AI-generated outreach prompt is ready." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate outreach.", variant: "destructive" });
    },
  });

  const simulateEventMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/social-profiles/${simulateProfileId}/events`, {
        eventType: simulateType,
        title: simulateTitle,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "social-events"] });
      setSimulateOpen(false);
      setSimulateTitle("");
      toast({ title: "Event created" });
    },
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const unreadCount = events?.filter((e: any) => !e.isRead).length || 0;

  if (profilesLoading || eventsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="section-social-intelligence">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Serif style={{ fontSize: 20, fontWeight: 600 }}>Social Intelligence</Serif>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[10px]" data-testid="badge-unread-count">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending || !profiles || profiles.length === 0}
            data-testid="button-scan-profiles"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${scanMutation.isPending ? "animate-spin" : ""}`} />
            {scanMutation.isPending ? "Scanning..." : "Scan Now"}
          </Button>
          <Button
            size="sm"
            onClick={() => setAddProfileOpen(true)}
            data-testid="button-add-profile"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Link Profile
          </Button>
        </div>
      </div>

      <div
        style={{
          borderRadius: 8,
          border: "1px solid rgba(107,143,224,.2)",
          background: "rgba(107,143,224,.04)",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Linkedin className="w-4 h-4" style={{ color: P.blue }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Linked Profiles</span>
          <span style={{ fontSize: 11, color: P.lt }}>({profiles?.length || 0})</span>
        </div>

        {(!profiles || profiles.length === 0) ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: P.lt, fontSize: 13 }}>
            <Linkedin className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No social profiles linked yet.</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>Add a LinkedIn profile URL to start monitoring social activity.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map((profile: any) => (
              <div
                key={profile.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,.04)",
                  border: "1px solid rgba(255,255,255,.06)",
                }}
                data-testid={`social-profile-${profile.id}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Linkedin className="w-4 h-4" style={{ color: "#0A66C2" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {profile.displayName || "LinkedIn Profile"}
                    </div>
                    {profile.headline && (
                      <div style={{ fontSize: 11, color: P.lt, marginTop: 1 }}>{profile.headline}</div>
                    )}
                    <a
                      href={profile.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 10, color: P.blue, textDecoration: "none", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}
                    >
                      {profile.profileUrl.substring(0, 50)}... <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {profile.lastCheckedAt && (
                    <span style={{ fontSize: 10, color: P.lt }}>
                      Last checked: {new Date(profile.lastCheckedAt).toLocaleDateString()}
                    </span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {profile.monitoringEnabled ? (
                      <Bell className="w-3.5 h-3.5" style={{ color: P.grn }} />
                    ) : (
                      <BellOff className="w-3.5 h-3.5" style={{ color: P.lt }} />
                    )}
                    <Switch
                      checked={profile.monitoringEnabled}
                      onCheckedChange={(checked) =>
                        toggleMonitoringMutation.mutate({ id: profile.id, enabled: checked })
                      }
                      data-testid={`switch-monitoring-${profile.id}`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => deleteProfileMutation.mutate(profile.id)}
                    data-testid={`button-delete-profile-${profile.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Radio className="w-4 h-4" style={{ color: P.grn }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Activity Feed</span>
          </div>
          {profiles && profiles.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (profiles.length > 0) {
                  setSimulateProfileId(profiles[0].id);
                  setSimulateOpen(true);
                }
              }}
              data-testid="button-simulate-event"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Event
            </Button>
          )}
        </div>

        {(!events || events.length === 0) ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              borderRadius: 8,
              border: "1px dashed rgba(155,159,168,.3)",
              color: P.lt,
              fontSize: 13,
            }}
          >
            <Radio className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No social events detected yet.</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>
              Link a profile and run a scan to detect social activity.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event: any) => {
              const config = EVENT_TYPE_CONFIG[event.eventType] || EVENT_TYPE_CONFIG.job_change;
              const Icon = config.icon;
              return (
                <div
                  key={event.id}
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${event.isRead ? "rgba(255,255,255,.06)" : "rgba(107,143,224,.25)"}`,
                    background: event.isRead ? "rgba(255,255,255,.02)" : "rgba(107,143,224,.06)",
                    padding: 16,
                    transition: "all .15s ease",
                  }}
                  data-testid={`social-event-${event.id}`}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: config.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: config.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                          style={{ background: config.bg, color: config.color, border: "none" }}
                        >
                          {config.label}
                        </Badge>
                        {!event.isRead && (
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: P.blue,
                              display: "inline-block",
                            }}
                          />
                        )}
                        <span style={{ fontSize: 10, color: P.lt, marginLeft: "auto" }}>
                          {new Date(event.detectedAt || event.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{event.title}</div>
                      {event.description && (
                        <div style={{ fontSize: 12, color: P.lt, lineHeight: 1.5, marginBottom: 8 }}>
                          {event.description}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 6 }}>
                        {!event.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => markReadMutation.mutate(event.id)}
                            data-testid={`button-mark-read-${event.id}`}
                          >
                            <Eye className="w-3 h-3 mr-1" /> Mark Read
                          </Button>
                        )}
                        {event.outreachGenerated && event.outreachPrompt ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setSelectedEvent(event)}
                            data-testid={`button-view-outreach-${event.id}`}
                          >
                            <Eye className="w-3 h-3 mr-1" /> View Outreach
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => generateOutreachMutation.mutate(event.id)}
                            disabled={generateOutreachMutation.isPending}
                            data-testid={`button-generate-outreach-${event.id}`}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            {generateOutreachMutation.isPending ? "Generating..." : "Generate Outreach"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={addProfileOpen} onOpenChange={setAddProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Social Profile</DialogTitle>
            <DialogDescription>
              Add a LinkedIn profile URL for {clientName} to monitor social activity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">LinkedIn Profile URL</label>
              <Input
                placeholder="https://linkedin.com/in/username"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                data-testid="input-profile-url"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name (optional)</label>
              <Input
                placeholder="John Smith"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                data-testid="input-display-name"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAddProfileOpen(false)} data-testid="button-cancel-add-profile">
              Cancel
            </Button>
            <Button
              onClick={() => addProfileMutation.mutate()}
              disabled={!profileUrl || addProfileMutation.isPending}
              data-testid="button-confirm-add-profile"
            >
              {addProfileMutation.isPending ? "Adding..." : "Link Profile"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: P.blue }} />
              AI Outreach Suggestion
            </DialogTitle>
            <DialogDescription>
              Generated outreach based on detected social event
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div style={{ padding: 12, borderRadius: 4, background: "rgba(107,143,224,.08)", border: "1px solid rgba(107,143,224,.15)" }}>
                <div style={{ fontSize: 11, color: P.blue, fontWeight: 600, marginBottom: 4 }}>Triggered by</div>
                <div style={{ fontSize: 13 }}>{selectedEvent.title}</div>
              </div>
              <div
                style={{
                  padding: 16,
                  borderRadius: 6,
                  background: "rgba(255,255,255,.03)",
                  border: "1px solid rgba(255,255,255,.08)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
                data-testid="text-outreach-prompt"
              >
                {selectedEvent.outreachPrompt}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(selectedEvent.outreachPrompt, selectedEvent.id)}
                  data-testid="button-copy-outreach"
                >
                  {copiedId === selectedEvent.id ? (
                    <><Check className="w-3.5 h-3.5 mr-1.5" /> Copied</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy to Clipboard</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={simulateOpen} onOpenChange={setSimulateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Social Event</DialogTitle>
            <DialogDescription>
              Manually add a social event for testing or record a known event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {profiles && profiles.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Profile</label>
                <Select value={simulateProfileId} onValueChange={setSimulateProfileId}>
                  <SelectTrigger data-testid="select-simulate-profile">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.displayName || p.profileUrl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Select value={simulateType} onValueChange={setSimulateType}>
                <SelectTrigger data-testid="select-simulate-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="e.g., Promoted to VP at Acme Corp"
                value={simulateTitle}
                onChange={(e) => setSimulateTitle(e.target.value)}
                data-testid="input-simulate-title"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSimulateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => simulateEventMutation.mutate()}
              disabled={!simulateTitle || !simulateProfileId || simulateEventMutation.isPending}
              data-testid="button-confirm-simulate"
            >
              {simulateEventMutation.isPending ? "Creating..." : "Add Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
