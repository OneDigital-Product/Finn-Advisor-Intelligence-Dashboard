"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, ExternalLink } from "lucide-react";

/**
 * Outlook Calendar Widget — Live Outlook events via MuleSoft → Microsoft Graph
 *
 * Standalone widget for the My Day dashboard. Shows today's meetings
 * from the advisor's Outlook calendar with NOW badge, time formatting,
 * and click-to-open-in-Outlook links.
 *
 * Data source: GET /api/calendar/live → MuleSoft /api/v1/calendar
 */

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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getStatus(start: string, end: string): "upcoming" | "in-progress" | "completed" {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now >= s && now <= e) return "in-progress";
  if (now > e) return "completed";
  return "upcoming";
}

interface CalendarEvent {
  id: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  clientName?: string;
  meetingType?: string;
  attendees?: Array<{ name: string; email: string }>;
  webLink?: string;
}

export function OutlookCalendarWidget() {
  const { data, isLoading, error } = useQuery<{
    events: CalendarEvent[];
    calendarOwner?: { entraId: string; label: string | null };
  }>({
    queryKey: ["/api/calendar/live"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const events = data?.events || [];
  const ownerLabel = data?.calendarOwner?.label;

  if (isLoading) {
    return (
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Calendar size={14} style={{ color: OD.medBlue }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: OD.text3 }}>
            Outlook Calendar
          </span>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            height: 48, borderRadius: 6, marginBottom: 6,
            background: "rgba(0,120,162,0.04)",
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
        ))}
      </div>
    );
  }

  if (error || events.length === 0) {
    return (
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Calendar size={14} style={{ color: OD.medBlue }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: OD.text3 }}>
            Outlook Calendar
          </span>
          {ownerLabel && (
            <span style={{ fontSize: 9, fontWeight: 600, background: "rgba(0,120,162,0.08)", color: OD.medBlue, padding: "2px 7px", borderRadius: 4 }}>
              {ownerLabel}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: OD.text3, textAlign: "center", padding: "16px 0" }}>
          {error ? "Unable to load calendar" : "No meetings today"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Calendar size={14} style={{ color: OD.medBlue }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: OD.text3 }}>
          Outlook Calendar
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, background: "rgba(0,120,162,0.1)",
          color: OD.medBlue, padding: "2px 8px", borderRadius: 99,
        }}>
          {events.length}
        </span>
        {ownerLabel && (
          <span style={{ fontSize: 9, fontWeight: 600, background: "rgba(0,120,162,0.08)", color: OD.medBlue, padding: "2px 7px", borderRadius: 4, marginLeft: "auto" }}>
            {ownerLabel}
          </span>
        )}
      </div>

      {/* Events */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {events.map((evt) => {
          const status = getStatus(evt.startDateTime, evt.endDateTime);
          const isNow = status === "in-progress";
          const isPast = status === "completed";

          return (
            <div
              key={evt.id}
              style={{
                display: "flex", gap: 10, padding: "10px 8px",
                borderRadius: 6, cursor: evt.webLink ? "pointer" : "default",
                opacity: isPast ? 0.45 : 1,
                borderLeft: isNow ? `3px solid ${OD.medGreen}` : "3px solid transparent",
                background: isNow ? "rgba(142,185,53,0.05)" : "transparent",
                transition: "background 100ms",
              }}
              onClick={() => evt.webLink && window.open(evt.webLink, "_blank")}
            >
              {/* Time column */}
              <div style={{ width: 62, flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: OD.medBlue, fontVariantNumeric: "tabular-nums" }}>
                  {formatTime(evt.startDateTime)}
                </div>
                <div style={{ fontSize: 10, color: OD.text3 }}>
                  {formatTime(evt.endDateTime)}
                </div>
              </div>

              {/* Details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: OD.text1,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {evt.subject}
                  </div>
                  {isNow && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: ".05em",
                      background: OD.medGreen, color: "#fff",
                      padding: "1px 6px", borderRadius: 4, flexShrink: 0,
                    }}>
                      NOW
                    </span>
                  )}
                </div>
                {(evt.clientName || evt.location) && (
                  <div style={{ fontSize: 10, color: OD.text3, marginTop: 2 }}>
                    {evt.clientName && <span>{evt.clientName}</span>}
                    {evt.clientName && evt.location && <span> · </span>}
                    {evt.location && <span>{evt.location}</span>}
                  </div>
                )}
                {evt.attendees && evt.attendees.length > 0 && (
                  <div style={{ fontSize: 10, color: OD.text3, marginTop: 1 }}>
                    {evt.attendees.slice(0, 3).map((a) => a.name).join(", ")}
                    {evt.attendees.length > 3 && ` +${evt.attendees.length - 3}`}
                  </div>
                )}
              </div>

              {/* Open in Outlook */}
              {evt.webLink && (
                <ExternalLink size={12} style={{ color: OD.text3, flexShrink: 0, marginTop: 2 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
