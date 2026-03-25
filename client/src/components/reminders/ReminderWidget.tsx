import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import NextLink from "next/link";
import { Bell, AlertTriangle, CalendarClock, RefreshCw, Loader2, ChevronRight } from "lucide-react";

interface PendingReminder {
  profileId: string;
  clientId: string;
  clientName: string;
  profileType: string;
  entityType: string | null;
  expirationDate: string;
  daysUntilExpiration: number;
  status: "expired" | "pending";
}

export function ReminderWidget() {
  const { toast } = useToast();

  const { data: reminders = [], isLoading } = useQuery<PendingReminder[]>({
    queryKey: ["/api/reminders/pending"],
  });

  const runCheckMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reminders/check", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to run reminder check");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Reminder Check Complete",
        description: data.summary,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const expiredCount = reminders.filter((r) => r.status === "expired").length;
  const expiring30 = reminders.filter(
    (r) => r.status === "pending" && r.daysUntilExpiration <= 30
  ).length;
  const expiring60 = reminders.filter(
    (r) => r.status === "pending" && r.daysUntilExpiration > 30 && r.daysUntilExpiration <= 60
  ).length;

  const totalCount = reminders.length;

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md" data-testid="card-reminder-widget">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-orange-500/10 dark:bg-orange-400/10 flex items-center justify-center">
              <Bell className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            Profile Reminders
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2"
              onClick={() => runCheckMutation.mutate()}
              disabled={runCheckMutation.isPending}
              data-testid="button-run-reminder-check"
            >
              {runCheckMutation.isPending ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Run Check
            </Button>
            {totalCount > 0 && (
              <Badge variant="default" className="text-xs no-default-active-elevate" data-testid="badge-reminders-total">
                {totalCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-5 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : totalCount === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-reminders">
            No profiles expiring in the next 90 days.
          </p>
        ) : (
          <div className="space-y-2">
            {expiredCount > 0 && (
              <div className="flex items-center gap-2 text-sm" data-testid="text-expired-count">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {expiredCount} profile{expiredCount !== 1 ? "s" : ""} expired
                </span>
              </div>
            )}
            {expiring30 > 0 && (
              <div className="flex items-center gap-2 text-sm" data-testid="text-expiring-30">
                <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">
                  {expiring30} expiring in 30 days
                </span>
              </div>
            )}
            {expiring60 > 0 && (
              <div className="flex items-center gap-2 text-sm" data-testid="text-expiring-60">
                <CalendarClock className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400">
                  {expiring60} expiring in 60 days
                </span>
              </div>
            )}
            <div className="pt-2 border-t mt-3">
              <NextLink href="/profiles">
                <Button variant="ghost" size="sm" className="text-xs h-7 w-full justify-between" data-testid="link-view-all-profiles">
                  View All Profiles
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </NextLink>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
