import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import NextLink from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Video,
  Phone,
  Building,
  Loader2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { P, EASE } from "@/styles/tokens";
import { Serif, Mono, Lbl } from "@/components/design/typography";
import { EmptyState } from "@/components/empty-state";

const MEETING_COLORS: Record<string, string> = {
  "Annual Review": P.blue,
  "Semi-Annual Review": P.bLo,
  "Quarterly Review": P.bDk,
  "Planning Session": P.grn,
  "Life Event": P.amb,
  "Check-In": P.gold,
  other: P.mid,
};

function getMeetingColor(type: string): string {
  return MEETING_COLORS[type] || MEETING_COLORS.other;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function MeetingTypeIcon({ location }: { location?: string | null }) {
  if (location?.includes("Zoom") || location?.includes("Video")) return <Video className="w-3 h-3" />;
  if (location?.includes("Phone") || location?.includes("Call")) return <Phone className="w-3 h-3" />;
  return <Building className="w-3 h-3" />;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

function QuickAddMeetingDialog({ open, onOpenChange, defaultDate }: { open: boolean; onOpenChange: (o: boolean) => void; defaultDate?: string }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState(defaultDate ? `${defaultDate}T09:00` : "");
  const [endTime, setEndTime] = useState(defaultDate ? `${defaultDate}T10:00` : "");
  const [type, setType] = useState("Check-In");
  const [location, setLocation] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/meetings", {
        title,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        type,
        location: location || null,
        status: "scheduled",
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Meeting scheduled", duration: 3000 });
      if (data.conflicts) {
        toast({ title: "Scheduling conflict", description: "This meeting overlaps with an existing meeting.", variant: "destructive", duration: Infinity });
      }
      onOpenChange(false);
      setTitle("");
      setStartTime("");
      setEndTime("");
      setLocation("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to create meeting", description: err.message, variant: "destructive", duration: Infinity });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-quick-add-meeting">
        <DialogHeader>
          <DialogTitle>New Meeting</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Meeting title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-meeting-title" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Lbl>Start</Lbl>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} data-testid="input-meeting-start" />
            </div>
            <div>
              <Lbl>End</Lbl>
              <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} data-testid="input-meeting-end" />
            </div>
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger data-testid="select-meeting-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Check-In">Check-In</SelectItem>
              <SelectItem value="Annual Review">Annual Review</SelectItem>
              <SelectItem value="Semi-Annual Review">Semi-Annual Review</SelectItem>
              <SelectItem value="Quarterly Review">Quarterly Review</SelectItem>
              <SelectItem value="Planning Session">Planning Session</SelectItem>
              <SelectItem value="Life Event">Life Event</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} data-testid="input-meeting-location" />
          <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!title || !startTime || !endTime || createMutation.isPending} data-testid="button-create-meeting">
            {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Meeting"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MeetingBlock({ meeting, compact = false }: { meeting: any; compact?: boolean }) {
  const color = getMeetingColor(meeting.type);
  return (
    <div
      className="hv-glow"
      style={{
        padding: compact ? "4px 8px" : "8px 12px",
        borderRadius: 6,
        borderLeft: `3px solid ${color}`,
        background: "var(--color-surface)",
        border: `1px solid ${"var(--color-border)"}`,
        borderLeftWidth: 3,
        borderLeftColor: color,
        cursor: "pointer",
        fontSize: compact ? 11 : 13,
        transition: `all .15s ${EASE}`,
        marginBottom: 4,
        overflow: "hidden",
      }}
      data-testid={`card-calendar-meeting-${meeting.id}`}
    >
      <div style={{ fontWeight: 600, color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {meeting.title}
      </div>
      {!compact && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, color: "var(--color-text-tertiary)", fontSize: 11 }}>
          <Clock className="w-3 h-3" />
          <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
          {meeting.client && (
            <>
              <User className="w-3 h-3 ml-1" />
              <span>{meeting.client.firstName} {meeting.client.lastName}</span>
            </>
          )}
        </div>
      )}
      {compact && meeting.client && (
        <div style={{ fontSize: 10, color: P.lt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {formatTime(meeting.startTime)} · {meeting.client.firstName} {meeting.client.lastName}
        </div>
      )}
    </div>
  );
}

function DayView({ date, meetings }: { date: Date; meetings: any[] }) {
  const dayKey = formatDateKey(date);
  const dayMeetings = meetings.filter(m => m.startTime.startsWith(dayKey));

  return (
    <div>
      {dayMeetings.length === 0 && (
        <EmptyState
          icon={CalendarIcon}
          title="No events scheduled"
          description="This day is free. Schedule a meeting or use the time for portfolio reviews."
          className="py-8"
        />
      )}
    <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", minHeight: "60vh" }}>
      {HOURS.map(hour => {
        const hourMeetings = dayMeetings.filter(m => {
          const h = new Date(m.startTime).getHours();
          return h === hour;
        });

        return (
          <div key={hour} style={{ display: "contents" }}>
            <div style={{
              padding: "8px 8px 8px 0",
              textAlign: "right",
              fontSize: 11,
              color: P.lt,
              borderTop: `1px solid ${"var(--color-border)"}`,
              fontFamily: "'DM Mono', monospace",
            }}>
              {hour > 12 ? hour - 12 : hour}{hour >= 12 ? "p" : "a"}
            </div>
            <div style={{
              padding: "4px 8px",
              borderTop: `1px solid ${"var(--color-border)"}`,
              minHeight: 48,
            }}>
              {hourMeetings.map(m => (
                <MeetingBlock key={m.id} meeting={m} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}

function WeekView({ weekStart, meetings }: { weekStart: Date; meetings: any[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = formatDateKey(new Date());

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
      {days.map(day => {
        const key = formatDateKey(day);
        const isToday = key === today;
        const dayMeetings = meetings.filter(m => m.startTime.startsWith(key));

        return (
          <div key={key} style={{
            minHeight: 200,
            padding: 8,
            background: isToday ? P.bFr : "var(--color-surface)",
            border: `1px solid ${isToday ? P.blue + "30" : "var(--color-border)"}`,
            borderRadius: 4,
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: P.lt,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span style={{
                fontSize: 14,
                fontWeight: isToday ? 700 : 500,
                color: isToday ? P.blue : "var(--color-text-secondary)",
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: isToday ? P.bIce : "transparent",
              }}>
                {day.getDate()}
              </span>
            </div>
            {dayMeetings.map(m => (
              <MeetingBlock key={m.id} meeting={m} compact />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ date, meetings }: { date: Date; meetings: any[] }) {
  const monthStart = getMonthStart(date);
  const daysInMonth = getDaysInMonth(date);
  const startDay = monthStart.getDay();
  const today = formatDateKey(new Date());

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(new Date(date.getFullYear(), date.getMonth(), i));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 2 }}>
        {weekDays.map(d => (
          <div key={d} style={{
            textAlign: "center",
            fontSize: 10,
            fontWeight: 600,
            color: P.lt,
            padding: "6px 0",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} style={{ minHeight: 100, background: "var(--color-surface-raised)", borderRadius: 4 }} />;
          }

          const key = formatDateKey(day);
          const isToday = key === today;
          const dayMeetings = meetings.filter(m => m.startTime.startsWith(key));

          return (
            <div key={key} style={{
              minHeight: 100,
              padding: 6,
              background: isToday ? P.bFr : "var(--color-surface)",
              border: `1px solid ${isToday ? P.blue + "30" : "var(--color-border)"}`,
              borderRadius: 4,
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: isToday ? 700 : 400,
                color: isToday ? P.blue : "var(--color-text-secondary)",
                marginBottom: 4,
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: isToday ? P.bIce : "transparent",
              }}>
                {day.getDate()}
              </div>
              {dayMeetings.slice(0, 3).map(m => (
                <MeetingBlock key={m.id} meeting={m} compact />
              ))}
              {dayMeetings.length > 3 && (
                <div style={{ fontSize: 10, color: P.blue, fontWeight: 600, paddingLeft: 4 }}>
                  +{dayMeetings.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskConveniencePanel() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"overdue" | "upcoming">("overdue");

  const overdueQuery = useQuery<any[]>({
    queryKey: ["/api/tasks/overdue"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/overdue");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const upcomingQuery = useQuery<any[]>({
    queryKey: ["/api/tasks/upcoming"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/upcoming?days=7");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("PUT", `/api/tasks/${taskId}/complete`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/overdue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/upcoming"] });
      toast({ title: data.recurring ? "Task completed, next instance created" : "Task completed" });
    },
    onError: () => {
      toast({ title: "Failed to complete task", variant: "destructive", duration: Infinity });
    },
  });

  const recurringMutation = useMutation({
    mutationFn: async ({ taskId, pattern }: { taskId: string; pattern: string }) => {
      const res = await apiRequest("POST", `/api/tasks/${taskId}/recurring`, {
        pattern,
        interval: 1,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/overdue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/upcoming"] });
      toast({ title: data.toggled === "off" ? "Recurring disabled" : "Recurring enabled (weekly)" });
    },
    onError: () => {
      toast({ title: "Failed to toggle recurring", variant: "destructive", duration: Infinity });
    },
  });

  const tasks = filter === "overdue" ? (overdueQuery.data || []) : (upcomingQuery.data || []);
  const isLoading = filter === "overdue" ? overdueQuery.isLoading : upcomingQuery.isLoading;

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${"var(--color-border)"}`,
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Serif style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Tasks</Serif>
        <div style={{ display: "flex", gap: 4, borderRadius: 6, border: `1px solid ${"var(--color-border)"}`, overflow: "hidden" }}>
          <button
            onClick={() => setFilter("overdue")}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: filter === "overdue" ? 600 : 400,
              background: filter === "overdue" ? P.rL : "var(--color-surface)",
              color: filter === "overdue" ? P.red : "var(--color-text-tertiary)",
              border: "none",
              cursor: "pointer",
            }}
            data-testid="button-filter-overdue"
          >
            <AlertCircle className="w-3 h-3 inline mr-1" />Overdue
          </button>
          <button
            onClick={() => setFilter("upcoming")}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: filter === "upcoming" ? 600 : 400,
              background: filter === "upcoming" ? P.bIce : "var(--color-surface)",
              color: filter === "upcoming" ? P.blue : "var(--color-text-tertiary)",
              border: "none",
              cursor: "pointer",
            }}
            data-testid="button-filter-upcoming"
          >
            <Clock className="w-3 h-3 inline mr-1" />Upcoming
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : tasks.length === 0 ? (
        <p style={{ fontSize: 12, color: P.lt, textAlign: "center", padding: "16px 0" }}>
          {filter === "overdue" ? "No overdue tasks" : "No upcoming tasks this week"}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {tasks.slice(0, 8).map((task: any) => (
            <div
              key={task.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 6,
                background: filter === "overdue" ? P.rL : P.bFr,
                border: `1px solid ${filter === "overdue" ? P.red + "20" : "var(--color-border)"}`,
                fontSize: 12,
              }}
              data-testid={`card-task-${task.id}`}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {task.title}
                </div>
                <div style={{ fontSize: 10, color: P.lt }}>
                  {task.dueDate && <span>Due: {task.dueDate}</span>}
                  {task.clientName && <span> · {task.clientName}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, marginLeft: 8, flexShrink: 0 }}>
                <button
                  onClick={() => completeMutation.mutate(task.id)}
                  disabled={completeMutation.isPending}
                  style={{
                    padding: "3px 6px",
                    borderRadius: 4,
                    border: `1px solid ${P.grn}40`,
                    background: P.gL,
                    color: P.grn,
                    fontSize: 10,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                  data-testid={`button-complete-task-${task.id}`}
                  title="Complete task"
                >
                  <CheckCircle className="w-3 h-3" />
                </button>
                <button
                  onClick={() => recurringMutation.mutate({ taskId: task.id, pattern: "weekly" })}
                  disabled={recurringMutation.isPending}
                  style={{
                    padding: "3px 6px",
                    borderRadius: 4,
                    border: `1px solid ${P.blue}40`,
                    background: P.bFr,
                    color: P.blue,
                    fontSize: 10,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                  data-testid={`button-recurring-task-${task.id}`}
                  title="Set weekly recurring"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { startDate, endDate } = useMemo(() => {
    if (view === "day") {
      const start = formatDateKey(currentDate);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + 1);
      return { startDate: start, endDate: formatDateKey(end) };
    } else if (view === "week") {
      const ws = getWeekStart(currentDate);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      return { startDate: formatDateKey(ws), endDate: formatDateKey(we) };
    } else {
      const ms = getMonthStart(currentDate);
      const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 1);
      return { startDate: formatDateKey(ms), endDate: formatDateKey(me) };
    }
  }, [view, currentDate]);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/calendar", view, startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/calendar?view=${view}&startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const meetings = data?.meetings || [];

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  const headerLabel = useMemo(() => {
    if (view === "day") {
      return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    } else if (view === "week") {
      const ws = getWeekStart(currentDate);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      return `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    } else {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
  }, [view, currentDate]);

  return (
    <div style={{ padding: "0 0 48px" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} data-testid="button-calendar-prev">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-calendar-today">Today</Button>
          <Button variant="outline" size="sm" onClick={() => navigate(1)} data-testid="button-calendar-next">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Serif style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }} data-testid="text-calendar-header">
            {headerLabel}
          </Serif>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex",
            borderRadius: 6,
            border: `1px solid ${"var(--color-border)"}`,
            overflow: "hidden",
          }}>
            {(["day", "week", "month"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: view === v ? 600 : 400,
                  background: view === v ? P.bIce : "var(--color-surface)",
                  color: view === v ? P.blue : "var(--color-text-tertiary)",
                  border: "none",
                  cursor: "pointer",
                  transition: `all .15s ${EASE}`,
                  textTransform: "capitalize",
                }}
                data-testid={`button-view-${v}`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setAddDialogOpen(true)} data-testid="button-add-meeting">
            <Plus className="w-4 h-4 mr-1" /> New Meeting
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton className="h-12 w-full" style={{ borderRadius: 6 }} />
          <Skeleton className="h-64 w-full" style={{ borderRadius: 6 }} />
        </div>
      ) : (
        <div
          className="animate-fu"
          style={{
            background: "var(--color-surface)",
            border: `1px solid ${"var(--color-border)"}`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          {view === "day" && <DayView date={currentDate} meetings={meetings} />}
          {view === "week" && <WeekView weekStart={getWeekStart(currentDate)} meetings={meetings} />}
          {view === "month" && <MonthView date={currentDate} meetings={meetings} />}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          fontSize: 11,
          color: P.lt,
        }}>
          {Object.entries(MEETING_COLORS).filter(([k]) => k !== "other").map(([type, color]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span>{type}</span>
            </div>
          ))}
        </div>
      </div>

      <TaskConveniencePanel />

      <QuickAddMeetingDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        defaultDate={formatDateKey(currentDate)}
      />
    </div>
  );
}
