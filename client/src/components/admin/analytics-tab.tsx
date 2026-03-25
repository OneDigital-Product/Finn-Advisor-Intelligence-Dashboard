import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, BarChart3, TrendingUp, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { GateCard } from "@/components/gate-card";

interface LoginEvent {
  userId: string;
  userName: string;
  userEmail: string;
  userType: string;
  timestamp: string;
}

interface GateData {
  name: string;
  description: string;
  value: number | boolean;
  threshold: number;
  unit: string;
  status: string;
  progress: number;
}

interface GatesResponse {
  gates: Record<string, GateData>;
  overallStatus: string;
}

interface MetricsResponse {
  activeUsersTrend?: { date: string; count: number }[];
  npsTrend?: { date: string; nps: number }[];
  uptimeTrend?: { date: string; uptime: number }[];
}

interface Signoff {
  id: string;
  gate: string;
  signedOffBy: string;
  title: string;
  createdAt: string;
}

function AnalyticsTab() {
  const [timeRange, setTimeRange] = useState<"7" | "30" | "90">("30");
  const { data: events, isLoading } = useQuery<LoginEvent[]>({
    queryKey: ["/api/admin/login-analytics", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/login-analytics?days=${timeRange}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const allEvents = events || [];
  const totalLogins = allEvents.length;
  const uniqueUsers = new Set(allEvents.map(e => e.userId)).size;
  const advisorLogins = allEvents.filter(e => e.userType === "advisor").length;
  const associateLogins = allEvents.filter(e => e.userType === "associate").length;

  const dailyCounts: Record<string, { date: string; logins: number; advisors: number; associates: number }> = {};
  allEvents.forEach(e => {
    const day = new Date(e.timestamp).toISOString().split("T")[0];
    if (!dailyCounts[day]) dailyCounts[day] = { date: day, logins: 0, advisors: 0, associates: 0 };
    dailyCounts[day].logins++;
    if (e.userType === "advisor") dailyCounts[day].advisors++;
    else dailyCounts[day].associates++;
  });
  const chartData = Object.values(dailyCounts).sort((a, b) => a.date.localeCompare(b.date));

  const userBreakdown: Record<string, { name: string; email: string; type: string; count: number; lastLogin: string }> = {};
  allEvents.forEach(e => {
    if (!userBreakdown[e.userId]) {
      userBreakdown[e.userId] = { name: e.userName, email: e.userEmail, type: e.userType, count: 0, lastLogin: e.timestamp };
    }
    userBreakdown[e.userId].count++;
    if (new Date(e.timestamp) > new Date(userBreakdown[e.userId].lastLogin)) {
      userBreakdown[e.userId].lastLogin = e.timestamp;
    }
  });
  const userRows = Object.entries(userBreakdown)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count);

  const avgPerDay = chartData.length > 0 ? (totalLogins / chartData.length).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" data-testid="text-analytics-title">Login Analytics</h2>
        <div className="flex items-center gap-1">
          {(["7", "30", "90"] as const).map(d => (
            <Button
              key={d}
              size="sm"
              variant={timeRange === d ? "default" : "outline"}
              onClick={() => setTimeRange(d)}
              data-testid={`button-range-${d}`}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-logins">{totalLogins}</p>
                <p className="text-xs text-muted-foreground">Total Logins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-unique-users">{uniqueUsers}</p>
                <p className="text-xs text-muted-foreground">Unique Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-avg-daily">{avgPerDay}</p>
                <p className="text-xs text-muted-foreground">Avg / Day</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-advisor-vs-associate">
                  {advisorLogins} / {associateLogins}
                </p>
                <p className="text-xs text-muted-foreground">Advisors / Associates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Daily Login Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No login data recorded yet</p>
              <p className="text-xs mt-1">Login events will appear here as users sign in</p>
            </div>
          ) : (
            <ChartContainer
              config={{
                advisors: { label: "Advisors", color: "hsl(var(--chart-1))" },
                associates: { label: "Associates", color: "hsl(var(--chart-2))" },
              } satisfies ChartConfig}
              className="h-[240px] w-full"
            >
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => {
                    const d = new Date(v + "T00:00:00");
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={v => new Date(v + "T00:00:00").toLocaleDateString()}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="advisors" name="Advisors" fill="var(--color-advisors)" radius={[3, 3, 0, 0]} stackId="stack" />
                <Bar dataKey="associates" name="Associates" fill="var(--color-associates)" radius={[3, 3, 0, 0]} stackId="stack" />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Login Breakdown by User</CardTitle>
        </CardHeader>
        <CardContent>
          {userRows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No login data yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Logins</TableHead>
                  <TableHead className="text-right">Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRows.map(row => (
                  <TableRow key={row.id} data-testid={`row-login-user-${row.id}`}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize no-default-active-elevate">
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">{row.count}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(row.lastLogin).toLocaleDateString()} {new Date(row.lastLogin).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PilotDashboardTab() {
  const { toast } = useToast();
  const [signoffName, setSignoffName] = useState("");
  const [signoffTitle, setSignoffTitle] = useState("");
  const [signoffReason, setSignoffReason] = useState("");

  const { data: gatesData, isLoading: gatesLoading } = useQuery<GatesResponse>({
    queryKey: ["/api/admin/gates"],
  });

  const { data: metricsData } = useQuery<MetricsResponse>({
    queryKey: ["/api/admin/metrics"],
  });

  const { data: signoffs } = useQuery<Signoff[]>({
    queryKey: ["/api/admin/signoffs"],
  });

  const signoffMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/gates/leadership/signoff", {
        signedOffBy: signoffName,
        title: signoffTitle,
        reason: signoffReason || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Sign-off recorded", description: "Leadership approval has been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/signoffs"] });
      setSignoffName("");
      setSignoffTitle("");
      setSignoffReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to record sign-off.", variant: "destructive" });
    },
  });

  if (gatesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-60" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      </div>
    );
  }

  const gates = gatesData?.gates || {};
  const overallStatus = gatesData?.overallStatus || "in-progress";
  const gateKeys = ["participation", "satisfaction", "criticalBugs", "aiAdoption", "stability", "integrationUptime", "dataAccuracy", "leadershipSignoff"];

  return (
    <div className="space-y-6" data-testid="pilot-dashboard-tab">
      <Card className={overallStatus === "passed" ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-amber-500 bg-amber-50 dark:bg-amber-950/20"}>
        <CardContent className="p-4 flex items-center gap-3">
          {overallStatus === "passed" ? (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          )}
          <div>
            <p className="font-semibold" data-testid="text-overall-status">
              {overallStatus === "passed" ? "Ready for Expansion" : "Expansion In Progress"}
            </p>
            <p className="text-sm text-muted-foreground">
              {overallStatus === "passed"
                ? "All 8 gates have been met. The system is approved for full production rollout."
                : "Some gates have not yet been met. Continue monitoring progress."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {gateKeys.map((key) => {
          const gate = gates[key];
          if (!gate) return null;
          return (
            <GateCard
              key={key}
              name={gate.name}
              description={gate.description}
              metric={gate.unit === "approval" ? (gate.value ? "Approved" : "Pending") : `${gate.value}${gate.unit === "%" ? "%" : ""}`}
              threshold={gate.unit === "approval" ? "Required" : `${gate.threshold}${gate.unit === "%" ? "%" : ""}`}
              status={gate.status as "passed" | "at-risk" | "not-met"}
              progress={gate.progress}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Users (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {(metricsData?.activeUsersTrend?.length ?? 0) > 0 ? (
              <ChartContainer
                config={{
                  count: { label: "Active Users", color: "hsl(var(--chart-1))" },
                } satisfies ChartConfig}
                className="h-[250px] w-full"
              >
                <LineChart data={metricsData!.activeUsersTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No login data available yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">NPS Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {(metricsData?.npsTrend?.length ?? 0) > 0 ? (
              <ChartContainer
                config={{
                  nps: { label: "NPS Score", color: "hsl(var(--chart-2))" },
                } satisfies ChartConfig}
                className="h-[250px] w-full"
              >
                <LineChart data={metricsData!.npsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="nps" stroke="var(--color-nps)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No survey data available yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Uptime (60 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {(metricsData?.uptimeTrend?.length ?? 0) > 0 ? (
              <ChartContainer
                config={{
                  uptime: { label: "Uptime %", color: "hsl(var(--chart-5))" },
                } satisfies ChartConfig}
                className="h-[250px] w-full"
              >
                <LineChart data={metricsData!.uptimeTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[95, 100]} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="uptime" stroke="var(--color-uptime)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No uptime data available yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leadership Sign-off</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {signoffs && signoffs.length > 0 && (
              <div className="space-y-2 mb-4">
                {signoffs.filter((s) => s.gate === "leadership").map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950/30 p-2 rounded" data-testid={`signoff-${s.id}`}>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span><strong>{s.signedOffBy}</strong> ({s.title}) — {new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={signoffName}
                    onChange={(e) => setSignoffName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    data-testid="input-signoff-name"
                  />
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={signoffTitle}
                    onChange={(e) => setSignoffTitle(e.target.value)}
                    placeholder="e.g. CFO"
                    data-testid="input-signoff-title"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Reason (optional)</Label>
                <Textarea
                  value={signoffReason}
                  onChange={(e) => setSignoffReason(e.target.value)}
                  placeholder="Comments on approval..."
                  className="h-16 resize-none"
                  data-testid="input-signoff-reason"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => signoffMutation.mutate()}
                disabled={!signoffName || !signoffTitle || signoffMutation.isPending}
                data-testid="button-submit-signoff"
              >
                {signoffMutation.isPending ? "Submitting..." : "Approve for Expansion"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { AnalyticsTab, PilotDashboardTab };
