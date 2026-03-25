import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Calendar, Copy, ExternalLink, Unplug, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { CalendlyConfigModal } from "./CalendlyConfigModal";

interface CalendlyEventType {
  id: string;
  name: string;
  slug: string;
  bookingUrl: string;
  durationMinutes: number;
  description?: string;
  active: boolean;
}

export function CalendlyWidget() {
  const { toast } = useToast();
  const [showConfig, setShowConfig] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: status } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/integrations/calendly/status"],
  });

  const { data: events = [], isLoading, error } = useQuery<CalendlyEventType[]>({
    queryKey: ["/api/integrations/calendly/event-types"],
    enabled: !!status?.connected,
    retry: false,
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/integrations/calendly/config"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/calendly/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/calendly/event-types"] });
      toast({ title: "Calendly disconnected" });
    },
    onError: () => {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    },
  });

  const copyLink = async (bookingUrl: string, eventId: string) => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopiedId(eventId);
      toast({ title: "Link copied to clipboard!" });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const isConnected = status?.connected && !error;

  return (
    <>
      <Card data-testid="calendly-widget">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Scheduling
            {isConnected && (
              <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                Connected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {!status?.connected ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Connect Calendly to share scheduling links with clients.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => setShowConfig(true)}
                data-testid="button-connect-calendly"
              >
                <Calendar className="w-3 h-3 mr-1.5" />
                Connect Calendly
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : error ? (
            <div className="space-y-2">
              <p className="text-xs text-destructive">
                Unable to fetch events. Token may be invalid.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => setShowConfig(true)}
                data-testid="button-reconnect-calendly"
              >
                Reconnect
              </Button>
            </div>
          ) : events.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No active event types found in your Calendly account.
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                  data-testid={`calendly-event-${event.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{event.name}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />
                      {event.durationMinutes} min
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyLink(event.bookingUrl, event.id)}
                      title="Copy link"
                      data-testid={`button-copy-link-${event.id}`}
                    >
                      {copiedId === event.id ? (
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      asChild
                      data-testid={`button-open-link-${event.id}`}
                    >
                      <a href={event.bookingUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-xs text-destructive hover:text-destructive"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
                data-testid="button-disconnect-calendly"
              >
                {disconnectMutation.isPending ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Unplug className="w-3 h-3 mr-1" />
                )}
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <CalendlyConfigModal open={showConfig} onOpenChange={setShowConfig} />
    </>
  );
}
