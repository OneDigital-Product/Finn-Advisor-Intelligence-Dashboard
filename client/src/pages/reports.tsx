import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  MoreVertical, Plus, Eye, Edit2, Archive, FileText, Search,
} from "lucide-react";
import { ReportTemplateSelectionModal } from "@/components/report-template-selection-modal";
import { ReportPreviewModal } from "@/components/report-preview-modal";
import { EmptyState } from "@/components/empty-state";
import { FileBarChart } from "lucide-react";

function statusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" data-testid={`badge-status-${status}`}>Draft</Badge>;
    case "final":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" data-testid={`badge-status-${status}`}>Final</Badge>;
    case "archived":
      return <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" data-testid={`badge-status-${status}`}>Archived</Badge>;
    default:
      return <Badge data-testid={`badge-status-${status}`}>{status}</Badge>;
  }
}

export default function ReportsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);

  const { data: reports = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reports"],
  });

  const { data: clientsRaw } = useQuery<any>({
    queryKey: ["/api/clients"],
  });
  // /api/clients returns { clients: [...] } when MuleSoft/pagination is active,
  // or a raw array from local DB without params. Normalize to always be an array.
  const clients: any[] = Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw?.clients ?? []);

  const archiveMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await apiRequest("PATCH", `/api/reports/${reportId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Report archived" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to archive", description: err.message, variant: "destructive" });
    },
  });

  const clientMap = new Map<string, string>();
  clients.forEach((c: any) => {
    clientMap.set(c.id, `${c.firstName} ${c.lastName}`);
  });

  const filtered = reports.filter((r: any) => {
    if (selectedStatus !== "all" && r.status !== selectedStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      const clientName = clientMap.get(r.clientId) || "";
      return (
        r.reportName.toLowerCase().includes(s) ||
        clientName.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate and manage client reports</p>
        </div>
        <Button onClick={() => setIsGenerateModalOpen(true)} data-testid="button-generate-report">
          <Plus className="w-4 h-4 mr-2" />
          Generate New Report
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-reports"
          />
        </div>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="final">Final</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FileBarChart}
              title="No reports yet"
              description="Generate your first client report to see it here."
              actionLabel="Generate Report"
              onAction={() => setIsGenerateModalOpen(true)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead className="hidden md:table-cell">Client</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Version</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((report: any) => (
                <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-report-name-${report.id}`}>{report.reportName}</div>
                    <div className="text-xs text-muted-foreground md:hidden mt-0.5">
                      {clientMap.get(report.clientId) || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {clientMap.get(report.clientId) || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{statusBadge(report.status)}</TableCell>
                  <TableCell className="hidden lg:table-cell">v{report.version}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-actions-${report.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {report.status === "draft" && (
                          <DropdownMenuItem onClick={() => router.push(`/reports/${report.id}/edit`)} data-testid={`action-edit-${report.id}`}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setPreviewReportId(report.id)} data-testid={`action-preview-${report.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        {report.status !== "archived" && (
                          <DropdownMenuItem onClick={() => archiveMutation.mutate(report.id)} data-testid={`action-archive-${report.id}`}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ReportTemplateSelectionModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onSuccess={() => {
          setIsGenerateModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
        }}
      />

      {previewReportId && (
        <ReportPreviewModal
          reportId={previewReportId}
          isOpen={!!previewReportId}
          onClose={() => setPreviewReportId(null)}
        />
      )}
    </div>
  );
}
