import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, Shield, Activity, AlertTriangle, Clock, DollarSign, ClipboardCheck, Download } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/format";

interface AumClient {
  clientId: string;
  clientName: string;
  segment: string;
  accountCount: number;
  totalAum: number;
  estimatedRevenue: number;
}

interface AumReportData {
  clients: AumClient[];
  clientCount: number;
  segmentTotals: Record<string, { count: number; aum: number }>;
  totalAum: number;
  totalRevenue: number;
}

interface ActivityClient {
  clientId: string;
  clientName: string;
  segment: string;
  lastContact?: string;
  daysSinceContact?: number;
  activityCount: number;
  meetingCount: number;
  openTasks: number;
  engagementStatus: string;
}

interface ActivityReportData {
  clients: ActivityClient[];
  engagementBreakdown?: { active: number; recent: number; aging: number; atRisk: number };
}

interface ComplianceClient {
  clientId: string;
  clientName: string;
  segment: string;
  totalItems: number;
  current: number;
  expiringSoon: number;
  overdue: number;
  pending: number;
}

interface ComplianceReportData {
  clients: ComplianceClient[];
  summary?: { current: number; expiringSoon: number; overdue: number; pending: number; total: number };
}

interface ChecklistClient {
  clientId: string;
  clientName: string;
  segment: string;
  hasChecklist: boolean;
  totalItems: number;
  completedItems: number;
  completionPct: number;
  receivedCount: number;
  requiredTotal: number;
  requiredReceived: number;
  requiredCompletionPct: number;
  items?: { name: string; status: string }[];
}

interface ChecklistReportData {
  clients: ChecklistClient[];
  clientsWithChecklist: number;
  totalClients: number;
  avgCompletion: number;
}

function exportCsv(headers: string[], rows: string[][], filename: string) {
  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ReportsTab() {
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const reports = [
    { id: "aum-summary", title: "AUM Summary", description: "Assets under management by client and segment with estimated revenue", icon: DollarSign },
    { id: "activity", title: "Client Engagement", description: "Client contact frequency, meeting counts, and engagement status", icon: Activity },
    { id: "compliance", title: "Compliance Status", description: "Compliance item status across all clients", icon: Shield },
    { id: "document-checklist", title: "Document Checklist", description: "Document collection completion rates by client", icon: ClipboardCheck },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" data-testid="text-reports-title">Reports</h2>
        <p className="text-sm text-muted-foreground">Generate and export operational reports</p>
      </div>

      {!activeReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map(r => (
            <Card key={r.id} className="cursor-pointer transition-colors hover:bg-muted/30" onClick={() => setActiveReport(r.id)} data-testid={`card-report-${r.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <r.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{r.title}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeReport === "aum-summary" && <AumReport onBack={() => setActiveReport(null)} />}
      {activeReport === "activity" && <ActivityReport onBack={() => setActiveReport(null)} />}
      {activeReport === "compliance" && <ComplianceReport onBack={() => setActiveReport(null)} />}
      {activeReport === "document-checklist" && <ChecklistReport onBack={() => setActiveReport(null)} />}
    </div>
  );
}

function AumReport({ onBack }: { onBack: () => void }) {
  const { data, isLoading } = useQuery<AumReportData>({ queryKey: ["/api/admin/reports/aum-summary"], refetchOnMount: true });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-reports">&larr; Back</Button>
          <h3 className="text-base font-semibold">AUM Summary Report</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-export-aum"
          onClick={() => {
            if (!data?.clients) return;
            exportCsv(
              ["Client", "Segment", "Accounts", "Total AUM", "Est. Revenue"],
              data.clients.map((c) => [c.clientName, c.segment, String(c.accountCount), c.totalAum.toFixed(2), c.estimatedRevenue.toFixed(2)]),
              "aum_summary_report.csv"
            );
          }}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total AUM</div>
            <div className="text-xl font-bold mt-1" data-testid="text-total-aum">{formatCurrency(data?.totalAum || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Est. Annual Revenue</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(data?.totalRevenue || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total Clients</div>
            <div className="text-xl font-bold mt-1">{data?.clientCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Avg AUM/Client</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(data?.clientCount ? data.totalAum / data.clientCount : 0)}</div>
          </CardContent>
        </Card>
      </div>

      {data?.segmentTotals && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">AUM by Segment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.segmentTotals).sort(([a], [b]) => a.localeCompare(b)).map(([seg, val]) => (
                <div key={seg} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-[120px]">
                    <Badge variant={seg === "A" ? "default" : "secondary"} className="w-6 text-center no-default-active-elevate">{seg}</Badge>
                    <span className="text-sm">{val.count} client{val.count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex-1">
                    <Progress value={data.totalAum > 0 ? (val.aum / data.totalAum) * 100 : 0} className="h-2" />
                  </div>
                  <span className="text-sm font-medium min-w-[90px] text-right">{formatCurrency(val.aum)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead className="text-right">Total AUM</TableHead>
                <TableHead className="text-right">Est. Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.clients?.map((c) => (
                <TableRow key={c.clientId} data-testid={`row-aum-${c.clientId}`}>
                  <TableCell className="font-medium text-sm">{c.clientName}</TableCell>
                  <TableCell><Badge variant="secondary" className="no-default-active-elevate">{c.segment}</Badge></TableCell>
                  <TableCell className="text-right text-sm">{c.accountCount}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatCurrency(c.totalAum)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(c.estimatedRevenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityReport({ onBack }: { onBack: () => void }) {
  const { data, isLoading } = useQuery<ActivityReportData>({ queryKey: ["/api/admin/reports/activity"] });

  if (isLoading) return <Skeleton className="h-64" />;

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "default";
      case "recent": return "secondary";
      case "aging": return "outline";
      case "at_risk": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-reports">&larr; Back</Button>
          <h3 className="text-base font-semibold">Client Engagement Report</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-export-activity"
          onClick={() => {
            if (!data?.clients) return;
            exportCsv(
              ["Client", "Segment", "Last Contact", "Days Since", "Activities", "Meetings", "Open Tasks", "Status"],
              data.clients.map((c) => [c.clientName, c.segment, c.lastContact || "Never", String(c.daysSinceContact ?? "N/A"), String(c.activityCount), String(c.meetingCount), String(c.openTasks), c.engagementStatus]),
              "engagement_report.csv"
            );
          }}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data?.engagementBreakdown && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />Active (0-30 days)</div>
                <div className="text-xl font-bold mt-1">{data.engagementBreakdown.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5 text-blue-500" />Recent (31-60 days)</div>
                <div className="text-xl font-bold mt-1">{data.engagementBreakdown.recent}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />Aging (61-90 days)</div>
                <div className="text-xl font-bold mt-1">{data.engagementBreakdown.aging}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><XCircle className="w-3.5 h-3.5 text-destructive" />At Risk (90+ days)</div>
                <div className="text-xl font-bold mt-1">{data.engagementBreakdown.atRisk}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead className="text-right">Activities</TableHead>
                <TableHead className="text-right">Meetings</TableHead>
                <TableHead className="text-right">Open Tasks</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.clients?.map((c) => (
                <TableRow key={c.clientId} data-testid={`row-activity-${c.clientId}`}>
                  <TableCell className="font-medium text-sm">{c.clientName}</TableCell>
                  <TableCell><Badge variant="secondary" className="no-default-active-elevate">{c.segment}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.lastContact ? new Date(c.lastContact).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right text-sm">{c.daysSinceContact ?? "N/A"}</TableCell>
                  <TableCell className="text-right text-sm">{c.activityCount}</TableCell>
                  <TableCell className="text-right text-sm">{c.meetingCount}</TableCell>
                  <TableCell className="text-right text-sm">{c.openTasks}</TableCell>
                  <TableCell>
                    <Badge variant={statusColor(c.engagementStatus) as "outline"} className="text-[10px] capitalize no-default-active-elevate">
                      {c.engagementStatus.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceReport({ onBack }: { onBack: () => void }) {
  const { data, isLoading } = useQuery<ComplianceReportData>({ queryKey: ["/api/admin/reports/compliance"] });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-reports">&larr; Back</Button>
          <h3 className="text-base font-semibold">Compliance Status Report</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-export-compliance"
          onClick={() => {
            if (!data?.clients) return;
            exportCsv(
              ["Client", "Segment", "Total Items", "Current", "Expiring Soon", "Overdue", "Pending"],
              data.clients.map((c) => [c.clientName, c.segment, String(c.totalItems), String(c.current), String(c.expiringSoon), String(c.overdue), String(c.pending)]),
              "compliance_report.csv"
            );
          }}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
        </Button>
      </div>

      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" />Current</div>
              <div className="text-xl font-bold mt-1">{data.summary.current}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5 text-yellow-500" />Expiring Soon</div>
              <div className="text-xl font-bold mt-1">{data.summary.expiringSoon}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="w-3.5 h-3.5 text-destructive" />Overdue</div>
              <div className="text-xl font-bold mt-1">{data.summary.overdue}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5 text-blue-500" />Pending</div>
              <div className="text-xl font-bold mt-1">{data.summary.pending}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Expiring</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead className="text-right">Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.clients?.map((c) => (
                <TableRow key={c.clientId} data-testid={`row-compliance-${c.clientId}`}>
                  <TableCell className="font-medium text-sm">{c.clientName}</TableCell>
                  <TableCell><Badge variant="secondary" className="no-default-active-elevate">{c.segment}</Badge></TableCell>
                  <TableCell className="text-right text-sm">{c.totalItems}</TableCell>
                  <TableCell className="text-right text-sm">{c.current}</TableCell>
                  <TableCell className="text-right text-sm">{c.expiringSoon > 0 ? <span className="text-yellow-600 dark:text-yellow-400 font-medium">{c.expiringSoon}</span> : 0}</TableCell>
                  <TableCell className="text-right text-sm">{c.overdue > 0 ? <span className="text-destructive font-medium">{c.overdue}</span> : 0}</TableCell>
                  <TableCell className="text-right text-sm">{c.pending}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ChecklistReport({ onBack }: { onBack: () => void }) {
  const { data, isLoading } = useQuery<ChecklistReportData>({ queryKey: ["/api/admin/reports/document-checklist"] });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-reports">&larr; Back</Button>
          <h3 className="text-base font-semibold">Document Checklist Report</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-export-checklist"
          onClick={() => {
            if (!data?.clients) return;
            exportCsv(
              ["Client", "Segment", "Has Checklist", "Total Items", "Received", "Completion %", "Required Total", "Required Received", "Required %"],
              data.clients.map((c) => [c.clientName, c.segment, c.hasChecklist ? "Yes" : "No", String(c.totalItems), String(c.receivedCount), String(c.completionPct), String(c.requiredTotal), String(c.requiredReceived), String(c.requiredCompletionPct)]),
              "document_checklist_report.csv"
            );
          }}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Clients with Checklist</div>
            <div className="text-xl font-bold mt-1">{data?.clientsWithChecklist || 0} / {data?.totalClients || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Avg Completion</div>
            <div className="text-xl font-bold mt-1">{Math.round(data?.avgCompletion || 0)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Needs Initialization</div>
            <div className="text-xl font-bold mt-1">{(data?.totalClients || 0) - (data?.clientsWithChecklist || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead className="text-right">Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.clients?.map((c) => (
                <TableRow key={c.clientId} data-testid={`row-checklist-${c.clientId}`}>
                  <TableCell className="font-medium text-sm">{c.clientName}</TableCell>
                  <TableCell><Badge variant="secondary" className="no-default-active-elevate">{c.segment}</Badge></TableCell>
                  <TableCell>
                    {c.hasChecklist ? (
                      <Badge variant="default" className="text-[10px] no-default-active-elevate"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] no-default-active-elevate">Not Initialized</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">{c.hasChecklist ? `${c.receivedCount} / ${c.totalItems}` : "-"}</TableCell>
                  <TableCell>
                    {c.hasChecklist ? (
                      <div className="flex items-center gap-2">
                        <Progress value={c.completionPct} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground min-w-[32px] text-right">{c.completionPct}%</span>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {c.hasChecklist ? `${c.requiredReceived} / ${c.requiredTotal}` : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export { ReportsTab };
