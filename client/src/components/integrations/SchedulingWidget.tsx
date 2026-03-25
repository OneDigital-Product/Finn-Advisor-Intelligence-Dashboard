import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock } from "lucide-react";

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function SchedulingWidget() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard"],
  });

  const meetings: Meeting[] = data?.todaysMeetings || [];

  return (
    <Card data-testid="scheduling-widget">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Scheduling
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : meetings.length === 0 ? (
          <p className="text-xs text-muted-foreground" data-testid="text-no-meetings">
            No upcoming meetings
          </p>
        ) : (
          <div className="space-y-2">
            {meetings.slice(0, 5).map((meeting) => (
              <div
                key={meeting.id}
                className="flex items-center gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                data-testid={`scheduling-meeting-${meeting.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{meeting.title}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTime(meeting.startTime)}
                    {meeting.location && <span className="ml-1">· {meeting.location}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
