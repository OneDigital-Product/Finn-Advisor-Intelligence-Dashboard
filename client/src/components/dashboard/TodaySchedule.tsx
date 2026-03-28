import { useQuery } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import NextLink from "next/link";
import { Video, Phone, Building, Calendar } from "lucide-react";

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

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function MeetingTypeIcon({ type }: { type: string }) {
  if (type.includes("Zoom") || type.includes("Video")) return <Video className="w-3.5 h-3.5" />;
  if (type.includes("Phone") || type.includes("Call")) return <Phone className="w-3.5 h-3.5" />;
  return <Building className="w-3.5 h-3.5" />;
}

/* ── Dedupe: suppress SF events that match an Outlook event ── */
function normalizeSubject(s: string): string {
  return (s || "").toLowerCase().trim().replace(/\s+/g, " ").replace(/[^\w\s]/g, "");
}

function isDuplicate(sfEvent: any, outlookEvents: any[]): boolean {
  const sfStart = new Date(sfEvent.startTime || "").getTime();
  if (isNaN(sfStart)) return false;
  const sfSubject = normalizeSubject(sfEvent.subject);
  const WINDOW_MS = 15 * 60 * 1000; // ±15 minutes

  for (const oe of outlookEvents) {
    const oeStart = new Date(oe.start || "").getTime();
    if (isNaN(oeStart)) continue;
    if (Math.abs(sfStart - oeStart) > WINDOW_MS) continue;
    // Time matches — check subject
    const oeSubject = normalizeSubject(oe.subject);
    if (sfSubject === oeSubject || sfSubject.includes(oeSubject) || oeSubject.includes(sfSubject)) {
      return true; // Duplicate — Outlook event wins
    }
  }
  return false;
}

/* ── Source pill ── */
function SourcePill({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
      border: "1px solid var(--color-border)", color: "var(--color-text-tertiary)",
      flexShrink: 0,
    }}>{label}</span>
  );
}

/* ── Component ── */

interface TodayScheduleProps {
  sfEvents?: any[];
  prepContexts?: any[];
  aiAvailable?: boolean;
  emailIndex?: Array<{ email: string; clientId: string; name: string; aum: number; segment: string }>;
}

export function TodaySchedule({ sfEvents, prepContexts, aiAvailable, emailIndex }: TodayScheduleProps = {}) {
  // Brief state: which event is expanded, the brief text, loading/error state
  const [briefState, setBriefState] = useState<{
    eventId: string | null;
    brief: string | null;
    loading: boolean;
    error: boolean;
  }>({ eventId: null, brief: null, loading: false, error: false });

  // Determine the single next imminent matched SF Event eligible for a brief
  const now = Date.now();
  const imminentWindow = 60 * 60 * 1000; // 60 minutes

  const fetchBrief = useCallback(async (eventId: string, outlookFallbackCtx?: any) => {
    // Try server-side prepContext (SF Events), then client-side fallback (Outlook)
    let ctx = (prepContexts || []).find((p: any) => p.eventId === eventId && p.matchConfidence === "exact");
    if (!ctx && outlookFallbackCtx) {
      ctx = {
        eventId,
        eventSubject: outlookFallbackCtx.subject || "",
        eventStartTime: outlookFallbackCtx.start || "",
        clientId: outlookFallbackCtx.clientContext?.clientId || null,
        clientName: (emailIndex || []).find((e: any) => e.clientId === outlookFallbackCtx.clientContext?.clientId)?.name || null,
        matchConfidence: "exact",
        aum: outlookFallbackCtx.clientContext?.aum || null,
        segment: outlookFallbackCtx.clientContext?.segment || null,
        status: null, serviceModel: null, reviewFrequency: null,
        lastReview: null, nextReview: null,
        matchedTasks: [], matchedCases: [], matchedRecentWin: null,
        _taskCountIsPartial: true, _caseCountIsPartial: true,
      };
    }
    if (!ctx) return;

    // Toggle: if already expanded for this event, collapse
    if (briefState.eventId === eventId && briefState.brief) {
      setBriefState({ eventId: null, brief: null, loading: false, error: false });
      return;
    }

    setBriefState({ eventId, brief: null, loading: true, error: false });
    try {
      const res = await fetch("/api/myday/prep-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prepContext: ctx }),
      });
      const data = await res.json();
      if (data.brief) {
        setBriefState({ eventId, brief: data.brief, loading: false, error: false });
      } else {
        setBriefState({ eventId, brief: null, loading: false, error: true });
      }
    } catch {
      setBriefState({ eventId, brief: null, loading: false, error: true });
    }
  }, [prepContexts, emailIndex, briefState.eventId, briefState.brief]);
  // Live Outlook calendar events via MuleSoft
  const { data: outlookData, isLoading } = useQuery<{ events: any[]; calendarOwner?: { entraId: string; label: string | null } }>({
    queryKey: ["/api/calendar/live"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
  const outlookEvents = outlookData?.events || [];
  const calendarOwner = outlookData?.calendarOwner;

  // Dedupe SF events against Outlook events
  const dedupedSfEvents = (sfEvents || []).filter(evt => !isDuplicate(evt, outlookEvents));
  const hasBothSources = outlookEvents.length > 0 && dedupedSfEvents.length > 0;

  // ── Outlook email → household matching (client-side, exact only) ──
  const enrichedOutlookEvents = useMemo(() => {
    if (!emailIndex || emailIndex.length === 0) return outlookEvents;
    const emailMap = new Map(emailIndex.map(e => [e.email, e]));
    return outlookEvents.map((evt: any) => {
      if (!evt.attendees || evt.attendees.length === 0) return evt;
      const matchedIds = new Set<string>();
      let matchedCtx: any = null;
      for (const att of evt.attendees) {
        const em = typeof att === "string" ? "" : (att.email || "").toLowerCase().trim();
        if (!em) continue;
        const hit = emailMap.get(em);
        if (hit) { matchedIds.add(hit.clientId); matchedCtx = hit; }
      }
      if (matchedIds.size === 1 && matchedCtx) {
        return { ...evt, clientContext: { clientId: matchedCtx.clientId, aum: matchedCtx.aum, segment: matchedCtx.segment } };
      }
      return evt;
    });
  }, [outlookEvents, emailIndex]);

  // ── V3.0 Outlook coverage instrumentation ──
  useMemo(() => {
    if (!outlookEvents.length) return;
    const withEmail = outlookEvents.filter((e: any) =>
      e.attendees?.some((a: any) => typeof a !== "string" && a.email)
    ).length;
    const matched = enrichedOutlookEvents.filter((e: any) => e.clientContext).length;
    const unmatchedWithEmail = withEmail - matched;
    console.info("[Outlook Match]", {
      totalEvents: outlookEvents.length,
      withAttendeeEmail: withEmail,
      matched,
      unmatchedWithEmail,
      indexSize: emailIndex?.length ?? 0,
    });
  }, [outlookEvents, enrichedOutlookEvents, emailIndex]);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" style={{ borderRadius: 8 }} />;
  }

  const totalEvents = outlookEvents.length + dedupedSfEvents.length;
  const summaryParts: string[] = [];
  if (outlookEvents.length > 0) summaryParts.push(`${outlookEvents.length} Outlook`);
  if (dedupedSfEvents.length > 0) summaryParts.push(`${dedupedSfEvents.length} SF`);
  const summaryText = summaryParts.length > 0 ? summaryParts.join(" + ") : "No upcoming events";

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
        {totalEvents === 0 && (
          <div style={{ padding: "12px 4px", color: OD.text3, fontSize: 13, fontStyle: "italic" }}>
            No meetings scheduled today.
          </div>
        )}

        {/* Outlook events (enriched with household context when matched) */}
        {enrichedOutlookEvents.map((evt: any, idx: number) => {
          const isNow = evt.status === "in-progress";
          const isPast = evt.status === "completed";
          return (
            <div key={evt.id || `outlook-${idx}`}>
            <div
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
                    {evt.duration && (
                      <div style={{ fontSize: 9, color: OD.text3, fontFamily: "'JetBrains Mono', monospace" }}>{formatDuration(evt.duration)}</div>
                    )}
                  </>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: OD.text1 }}>{evt.subject}</span>
                  {isNow && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                      background: "rgba(142,185,53,0.15)", color: "#8EB935", letterSpacing: ".05em",
                    }}>NOW</span>
                  )}
                </div>
                {evt.attendees && evt.attendees.length > 0 && (
                  <div style={{ fontSize: 11, color: OD.text3, marginTop: 2 }}>
                    {evt.attendees.slice(0, 3).map((a: any) => typeof a === "string" ? a : a.name || a.email).join(", ")}
                    {evt.attendees.length > 3 && ` +${evt.attendees.length - 3}`}
                  </div>
                )}
                {(evt.location || evt.meetingType) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <MeetingTypeIcon type={evt.location || evt.meetingType || ""} />
                    <span style={{ fontSize: 11, color: OD.text3 }}>{evt.location || evt.meetingType}</span>
                  </div>
                )}
                {/* Client context for matched Outlook events */}
                {evt.clientContext && (
                  <div style={{ fontSize: 11, color: OD.text3, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                    {evt.clientContext.aum > 0 && `$${(evt.clientContext.aum / 1_000_000).toFixed(1)}M`}
                    {evt.clientContext.aum > 0 && evt.clientContext.segment && " · "}
                    {evt.clientContext.segment && `Tier ${evt.clientContext.segment}`}
                  </div>
                )}
              </div>
              {/* Prep link for matched Outlook events */}
              {evt.clientContext?.clientId && (
                <NextLink
                  href={`/clients/${evt.clientContext.clientId}?tab=prep&from=myday&signal=meeting-prep&signalId=${evt.id}`}
                  style={{
                    fontSize: 10, fontWeight: 600, color: OD.lightBlue,
                    textDecoration: "none", flexShrink: 0,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  Prep →
                </NextLink>
              )}
              {/* Brief toggle for imminent matched Outlook events */}
              {(() => {
                if (!aiAvailable) return null;
                if (!evt.clientContext?.clientId) return null;
                const evtStart = new Date(evt.start).getTime();
                if (isNaN(evtStart) || evtStart - now > imminentWindow) return null;
                // Check if this is the first imminent matched event across ALL events (Outlook + SF)
                // Only show Brief if no SF event already has it
                const sfHasImminent = dedupedSfEvents.some((e: any) =>
                  e.clientContext?.clientId && new Date(e.startTime).getTime() - now <= imminentWindow
                );
                if (sfHasImminent) return null;
                const isFirstImminentOutlook = enrichedOutlookEvents.findIndex((e: any) =>
                  e.clientContext?.clientId && new Date(e.start).getTime() - now <= imminentWindow
                ) === idx;
                if (!isFirstImminentOutlook) return null;

                const isExpanded = briefState.eventId === evt.id && briefState.brief;
                const isBriefLoading = briefState.eventId === evt.id && briefState.loading;
                const isBriefError = briefState.eventId === evt.id && briefState.error;

                return (
                  <button
                    onClick={e => { e.stopPropagation(); fetchBrief(evt.id, evt); }}
                    style={{
                      fontSize: 10, fontWeight: 600, background: "none", border: "none",
                      cursor: "pointer", flexShrink: 0, padding: 0,
                      color: isBriefError ? OD.text3 : OD.lightBlue,
                    }}
                  >
                    {isBriefLoading ? "Generating..." : isBriefError ? "Brief unavailable" : isExpanded ? "Brief ▴" : "Brief ▾"}
                  </button>
                );
              })()}
              {hasBothSources && <SourcePill label="Outlook" />}
              {evt.webLink && (
                <a href={evt.webLink} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 10, color: "#0078A2", textDecoration: "none", flexShrink: 0 }}
                  onClick={e => e.stopPropagation()}>
                  Open ↗
                </a>
              )}
            </div>
            {/* Expanded brief area for matched Outlook events */}
            {briefState.eventId === evt.id && briefState.brief && (
              <div style={{
                margin: "0 16px 8px 67px",
                padding: "10px 14px",
                background: "var(--color-surface-raised)",
                borderRadius: 4,
                fontSize: 12,
                lineHeight: 1.5,
                color: OD.text2,
              }}>
                {briefState.brief}
              </div>
            )}
          </div>
          );
        })}

        {/* SF Events (deduped — only those not matching an Outlook event) */}
        {dedupedSfEvents.map((evt: any, idx: number) => (
          <div key={evt.id || `sf-evt-${idx}`}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 16px", borderRadius: 6, marginBottom: 4,
              borderLeft: `3px solid ${OD.orange}`,
              transition: "background .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(79,179,205,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ textAlign: "center", minWidth: 50 }}>
              {evt.isAllDay ? (
                <span style={{ fontSize: 10, fontWeight: 600, color: OD.text1, fontFamily: "'JetBrains Mono', monospace" }}>All Day</span>
              ) : evt.startTime ? (
                <>
                  <span style={{ fontSize: 10, fontWeight: 600, color: OD.text1, fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(evt.startTime)}</span>
                  {evt.endTime && (
                    <div style={{ fontSize: 9, color: OD.text3, fontFamily: "'JetBrains Mono', monospace" }}>
                      {(() => { const ms = new Date(evt.endTime).getTime() - new Date(evt.startTime).getTime(); return ms > 0 ? formatDuration(Math.round(ms / 60000)) : ""; })()}
                    </div>
                  )}
                </>
              ) : (
                <Calendar style={{ width: 14, height: 14, color: OD.text3, margin: "0 auto" }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: OD.text1 }}>{evt.subject}</span>
              {(evt.location || evt.type) && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <MeetingTypeIcon type={evt.location || evt.type || ""} />
                  <span style={{ fontSize: 11, color: OD.text3 }}>{evt.location || evt.type}</span>
                </div>
              )}
              {(evt.whoName || evt.whatName) && (
                <div style={{ fontSize: 11, color: OD.text3, marginTop: 2 }}>
                  {[evt.whoName, evt.whatName].filter(Boolean).join(" · ")}
                </div>
              )}
              {evt.clientContext && evt.clientContext.aum > 0 && (
                <div style={{ fontSize: 11, color: OD.text3, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  ${evt.clientContext.aum >= 1e9 ? `${(evt.clientContext.aum / 1e9).toFixed(1)}B` : evt.clientContext.aum >= 1e6 ? `${(evt.clientContext.aum / 1e6).toFixed(1)}M` : evt.clientContext.aum >= 1e3 ? `${(evt.clientContext.aum / 1e3).toFixed(0)}K` : evt.clientContext.aum.toFixed(0)}
                  {evt.clientContext.segment ? ` · Tier ${evt.clientContext.segment}` : ""}
                </div>
              )}
            </div>
            {evt.clientContext?.clientId && (
              <NextLink
                href={`/clients/${evt.clientContext.clientId}?tab=prep&from=myday&signal=meeting-prep&signalId=${evt.id}`}
                style={{
                  fontSize: 10, fontWeight: 600, color: "var(--color-brand-secondary)",
                  textDecoration: "none", flexShrink: 0,
                }}
                onClick={e => e.stopPropagation()}
              >
                Prep →
              </NextLink>
            )}
            {/* Brief toggle — only for the next imminent matched SF Event, and only when AI is available */}
            {(() => {
              if (!aiAvailable) return null;
              if (!evt.clientContext?.clientId) return null;
              const evtStart = new Date(evt.startTime).getTime();
              if (isNaN(evtStart) || evtStart - now > imminentWindow) return null;
              // Check this is the first imminent matched event
              const isFirstImminent = dedupedSfEvents.findIndex((e: any) =>
                e.clientContext?.clientId && new Date(e.startTime).getTime() - now <= imminentWindow
              ) === idx;
              if (!isFirstImminent) return null;

              const isExpanded = briefState.eventId === evt.id && briefState.brief;
              const isLoading = briefState.eventId === evt.id && briefState.loading;
              const isError = briefState.eventId === evt.id && briefState.error;

              return (
                <button
                  onClick={e => { e.stopPropagation(); fetchBrief(evt.id); }}
                  style={{
                    fontSize: 10, fontWeight: 600, background: "none", border: "none",
                    cursor: "pointer", flexShrink: 0, padding: 0,
                    color: isError ? OD.text3 : OD.lightBlue,
                  }}
                >
                  {isLoading ? "Generating..." : isError ? "Brief unavailable" : isExpanded ? "Brief ▴" : "Brief ▾"}
                </button>
              );
            })()}
            <SourcePill label="SF" />
          </div>
          {/* Expanded brief area */}
          {briefState.eventId === evt.id && briefState.brief && (
            <div style={{
              margin: "0 16px 8px 67px",
              padding: "10px 14px",
              background: "var(--color-surface-raised)",
              borderRadius: 4,
              fontSize: 12,
              lineHeight: 1.5,
              color: OD.text2,
            }}>
              {briefState.brief}
            </div>
          )}
          </div>
        ))}
      </div>
    </div>
  );
}
