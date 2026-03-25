import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import NextLink from "next/link";
import { Video, Phone, Building, Loader2, Notebook, Calendar, CalendarCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";

const OD = {
  medBlue: "var(--color-brand-primary)",
  medGreen: "var(--color-success)",
  orange: "var(--color-orange)",
  lightBlue: "var(--color-brand-secondary)",
  text1: "var(--color-text-primary)",
  text2: "var(--color-text-secondary)",
  text3: "var(--color-text-tertiary)",
  border: "var(--color-border)",
};

const borderColors = [OD.medBlue, OD.medGreen, OD.orange];

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatCurrency(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

function MeetingTypeIcon({ type }: { type: string }) {
  if (type.includes("Zoom") || type.includes("Video")) return <Video className="w-3.5 h-3.5" />;
  if (type.includes("Phone") || type.includes("Call")) return <Phone className="w-3.5 h-3.5" />;
  return <Building className="w-3.5 h-3.5" />;
}

export function TodaySchedule({ liveEventCount, liveEvents }: { liveEventCount?: number; liveEvents?: any[] } = {}) {
  const { toast } = useToast();
  const [generatingPrepId, setGeneratingPrepId] = useState<string | null>(null);

  const { data: allMeetings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/meetings"],
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

  // Live Outlook calendar events via MuleSoft — fires in parallel with local meetings
  const { data: outlookData } = useQuery<{ events: any[]; calendarOwner?: { entraId: string; label: string | null } }>({
    queryKey: ["/api/calendar/live"],
    staleTime: 5 * 60 * 1000,    // 5 min — matches server cache TTL
    gcTime: 30 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 min
    retry: 1,
  });
  const outlookEvents = outlookData?.events || [];
  const calendarOwner = outlookData?.calendarOwner;

  const prepMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      setGeneratingPrepId(meetingId);
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/prep`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Meeting prep generated" });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setGeneratingPrepId(null);
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate prep", description: err.message, variant: "destructive" });
      setGeneratingPrepId(null);
    },
  });

  const today = new Date().toISOString().split("T")[0];
  const todaysMeetings = allMeetings?.filter(m => m.startTime.startsWith(today)) || [];

  if (isLoading) {
    return <Skeleton className="h-48 w-full" style={{ borderRadius: 8 }} />;
  }

  const totalEvents = todaysMeetings.length + outlookEvents.length + (liveEvents?.length || 0);
  const summaryText = outlookEvents.length > 0
    ? `${outlookEvents.length} Outlook event${outlookEvents.length === 1 ? "" : "s"}${todaysMeetings.length > 0 ? ` + ${todaysMeetings.length} local` : ""}`
    : todaysMeetings.length > 0
      ? `${todaysMeetings.length} meeting${todaysMeetings.length === 1 ? "" : "s"}`
      : (liveEvents && liveEvents.length > 0)
        ? `${liveEvents.length} event${liveEvents.length === 1 ? "" : "s"} (SF)`
        : (liveEventCount && liveEventCount > 0)
          ? `${liveEventCount} event${liveEventCount === 1 ? "" : "s"} (SF)`
          : "No upcoming events";

  return (
    <div>
      <div style={{ padding: "6px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: OD.text3, fontFamily: "'JetBrains Mono', monospace" }}>
          {summaryText}
        </span>
        {calendarOwner && (calendarOwner.label || calendarOwner.entraId) && (
          <span style={{
            fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
            background: "rgba(0,120,162,0.1)", color: "#0078A2",
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: ".03em",
            whiteSpace: "nowrap",
          }}
            title={`Entra ID: ${calendarOwner.entraId}`}
          >
            {calendarOwner.label || calendarOwner.entraId?.slice(0, 8) + "..."}
          </span>
        )}
      </div>
      <div style={{ padding: "0 12px 8px" }}>
        {todaysMeetings.length === 0 && outlookEvents.length === 0 && (!liveEvents || liveEvents.length === 0) && (
          <EmptyState
            icon={CalendarCheck}
            title="No meetings today"
            description="Your schedule is clear — a good time to review client portfolios."
            actionLabel="View Calendar"
            onAction={() => window.location.href = "/calendar"}
          />
        )}
        {/* SF live events */}
        {todaysMeetings.length === 0 && liveEvents && liveEvents.length > 0 && liveEvents.map((evt: any, idx: number) => (
          <div
            key={evt.id || `sf-evt-${idx}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 16px",
              borderRadius: 6,
              marginBottom: 4,
              borderLeft: `3px solid ${borderColors[idx % 3]}`,
              transition: "background .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(79,179,205,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            data-testid={`card-sf-event-${evt.id || idx}`}
          >
            <div style={{ textAlign: "center", minWidth: 50 }}>
              {evt.isAllDay ? (
                <span style={{ fontSize: 10, fontWeight: 600, color: OD.text1, fontFamily: "'JetBrains Mono', monospace" }}>All Day</span>
              ) : evt.startDateTime ? (
                <>
                  <span style={{ fontSize: 10, fontWeight: 600, color: OD.text1, fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(evt.startDateTime)}</span>
                  {!evt.isAllDay && evt.endDateTime && (
                    <div style={{ fontSize: 10, color: OD.text3, fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(evt.endDateTime)}</div>
                  )}
                </>
              ) : (
                <Calendar style={{ width: 14, height: 14, color: OD.text3, margin: "0 auto" }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: OD.text1 }}>{evt.subject}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <MeetingTypeIcon type={evt.type || evt.location || ""} />
                <span style={{ fontSize: 11, color: OD.text2 }}>
                  {evt.location || evt.type || "Salesforce Event"}
                </span>
              </div>
              {(evt.whoName || evt.whatName) && (
                <div style={{ fontSize: 11, color: OD.text3, marginTop: 2 }}>
                  {[evt.whoName, evt.whatName].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          </div>
        ))}
        {/* Outlook live calendar events */}
        {outlookEvents.length > 0 && outlookEvents.map((evt: any, idx: number) => {
          const isNow = evt.status === "in-progress";
          const isPast = evt.status === "completed";
          return (
            <div
              key={evt.id || `outlook-${idx}`}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 16px", borderRadius: 6, marginBottom: 4,
                borderLeft: `3px solid ${isNow ? "#8EB935" : isPast ? OD.border : OD.medBlue}`,
                opacity: isPast ? 0.5 : 1,
                transition: "background .15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(79,179,205,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ textAlign: "center", minWidth: 50 }}>
                {evt.isAllDay ? (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#0078A2", fontFamily: "'JetBrains Mono', monospace" }}>All Day</span>
                ) : (
                  <>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#0078A2", fontFamily: "'JetBrains Mono', monospace" }}>{evt.startFormatted}</span>
                    <div style={{ fontSize: 10, color: OD.text3, fontFamily: "'JetBrains Mono', monospace" }}>{evt.endFormatted}</div>
                  </>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#25282A" }}>{evt.subject}</span>
                  {isNow && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      background: "rgba(142,185,53,0.15)", color: "#8EB935", letterSpacing: ".05em",
                    }}>NOW</span>
                  )}
                </div>
                {evt.clientName && (
                  <div style={{ fontSize: 11, color: OD.text2, marginTop: 2 }}>{evt.clientName}</div>
                )}
                {evt.attendees && evt.attendees.length > 0 && (
                  <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                    {evt.attendees.slice(0, 3).join(", ")}
                    {evt.attendees.length > 3 && ` +${evt.attendees.length - 3}`}
                  </div>
                )}
                {(evt.location || evt.meetingType) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <MeetingTypeIcon type={evt.location || evt.meetingType || ""} />
                    <span style={{ fontSize: 11, color: "#6B7280" }}>{evt.location || evt.meetingType}</span>
                  </div>
                )}
              </div>
              {evt.webLink && (
                <a href={evt.webLink} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 10, color: "#0078A2", textDecoration: "none" }}
                  onClick={e => e.stopPropagation()}>
                  Open ↗
                </a>
              )}
            </div>
          );
        })}
        {/* Local meetings from the meetings API */}
        {todaysMeetings.map((meeting: any, idx: number) => (
          <div
            key={meeting.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 16px",
              borderRadius: 6,
              marginBottom: 4,
              borderLeft: `3px solid ${borderColors[idx % 3]}`,
              cursor: "pointer",
              transition: "background .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(79,179,205,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            data-testid={`card-meeting-${meeting.id}`}
          >
            <div style={{ textAlign: "center", minWidth: 50 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: OD.text1, fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(meeting.startTime)}</span>
              <div style={{ fontSize: 10, color: OD.text3, fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(meeting.endTime)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NextLink href={meeting.clientId ? `/clients/${meeting.clientId}` : "#"}>
                <span style={{ fontSize: 12, fontWeight: 600, color: OD.text1 }}>{meeting.title}</span>
              </NextLink>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <MeetingTypeIcon type={meeting.location || ""} />
                <span style={{ fontSize: 11, color: OD.text2 }}>{meeting.location}</span>
              </div>
              {meeting.client && (
                <div style={{ fontSize: 11, color: OD.text3, marginTop: 2 }}>
                  AUM: {formatCurrency(meeting.client.totalAum || 0)} · Segment: {meeting.client.segment}
                </div>
              )}
            </div>
            <button
              disabled={generatingPrepId === meeting.id}
              onClick={(e) => {
                e.stopPropagation();
                prepMutation.mutate(meeting.id);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "5px 10px",
                borderRadius: 4, border: `1px solid ${OD.border}`, background: "transparent",
                fontSize: 10, fontWeight: 600, color: OD.text3, cursor: "pointer",
                transition: "all .15s",
              }}
              data-testid={`button-prep-${meeting.id}`}
            >
              {generatingPrepId === meeting.id ? (
                <><Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> Generating</>
              ) : (
                <><Notebook style={{ width: 12, height: 12 }} /> Prep</>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
