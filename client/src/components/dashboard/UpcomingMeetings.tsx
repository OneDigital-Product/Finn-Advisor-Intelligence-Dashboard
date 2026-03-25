import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";

const OD = {
  text1: "#FFFFFF",
  text2: "#C7D0DD",
  text3: "#94A3B8",
  border: "#2D3748",
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / (86400000));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";

  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function UpcomingMeetings() {
  const { data: allMeetings, isLoading } = useQuery<any[]>({
    queryKey: ["/api/meetings"],
    staleTime: Infinity, // Meetings are mutated via this app — mutations invalidate the cache directly
    gcTime: 30 * 60 * 1000,
  });

  const now = new Date().toISOString();
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString();
  const upcomingMeetings = allMeetings
    ?.filter(m => m.startTime > now && m.startTime <= sevenDaysLater)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 10) || [];

  const groupedByDate: Record<string, any[]> = {};
  upcomingMeetings.forEach(m => {
    const dateKey = m.startTime.split("T")[0];
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(m);
  });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" style={{ borderRadius: 8 }} />;
  }

  return (
    <div style={{ padding: "8px 12px" }}>
      {Object.keys(groupedByDate).length === 0 && (
        <p style={{ fontSize: 11, color: OD.text3, textAlign: "center", padding: "20px 0" }}>No upcoming meetings</p>
      )}
      {Object.entries(groupedByDate).map(([dateKey, meetings]) => (
        <div key={dateKey} style={{ marginBottom: 8 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: OD.text3,
            textTransform: "uppercase", letterSpacing: "0.05em",
            padding: "6px 8px 2px",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {getDateLabel(meetings[0].startTime)}
          </div>
          {meetings.map((meeting: any) => (
            <div
              key={meeting.id}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 8px",
                borderRadius: 6, cursor: "pointer",
                transition: "background .15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(79,179,205,0.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              data-testid={`upcoming-${meeting.id}`}
            >
              <span style={{
                fontSize: 10, color: OD.text3, minWidth: 54, textAlign: "center",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {formatTime(meeting.startTime)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: OD.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meeting.title}</div>
              </div>
              <ChevronRight style={{ width: 12, height: 12, color: OD.text3 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
