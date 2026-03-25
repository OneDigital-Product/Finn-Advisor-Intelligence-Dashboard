import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, MoreVertical, Eye, Edit2, Archive, ClipboardList, BookOpen,
} from "lucide-react";
import { ReportTemplateSelectionModal } from "./report-template-selection-modal";
import { ReportPreviewModal } from "./report-preview-modal";
import { ReportRequestForm } from "./cassidy/report-request-form";
import { ReportReviewPanel } from "./cassidy/report-review-panel";

interface Props {
  clientId: string;
  clientName: string;
}

export function ClientReportsSection({ clientId, clientName }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"template" | "ai">("template");
  const [viewingDraftId, setViewingDraftId] = useState<string | null>(null);

  const { data: allReports = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/reports"],
  });

  const { data: aiDraftsData, isLoading: aiDraftsLoading } = useQuery<any>({
    queryKey: ["/api/cassidy/report-drafts/client", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/cassidy/report-drafts/client/${clientId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load AI drafts");
      return res.json();
    },
    enabled: activeTab === "ai",
  });

  const aiDrafts: any[] = aiDraftsData?.drafts || [];

  const reports = allReports.filter((r: any) => r.clientId === clientId);

  const archiveMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await apiRequest("PATCH", `/api/reports/${reportId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Report archived" });
    },
  });

  const draftCount = reports.filter((r: any) => r.status === "draft").length;
  const finalCount = reports.filter((r: any) => r.status === "final").length;

  if (viewingDraftId) {
    return (
      <div className="space-y-6">
        <ReportReviewPanel
          draftId={viewingDraftId}
          onBack={() => setViewingDraftId(null)}
          onApproved={() => {
            setViewingDraftId(null);
            queryClient.invalidateQueries({ queryKey: ["/api/cassidy/report-drafts/client", clientId] });
          }}
          onDiscarded={() => {
            setViewingDraftId(null);
            queryClient.invalidateQueries({ queryKey: ["/api/cassidy/report-drafts/client", clientId] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-client-reports-title">Reports</h2>
          <p className="text-sm text-muted-foreground">Reports generated for {clientName}</p>
        </div>
        {activeTab === "template" ? (
          <Button onClick={() => setIsGenerateModalOpen(true)} size="sm" data-testid="button-client-generate-report">
            <Plus className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        ) : null}
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "template" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("template")}
          data-testid="tab-template-reports"
        >
          <ClipboardList className="w-4 h-4 inline mr-1.5" />
          Template Reports
        </button>
        <button
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "ai" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("ai")}
          data-testid="tab-ai-reports"
        >
          <BookOpen className="w-4 h-4 inline mr-1.5" />
          AI Reports
        </button>
      </div>

      {activeTab === "template" && (
        <>
          {reports.length > 0 && (
            <div className="flex gap-4">
              <Card className="flex-1">
                <CardContent className="pt-4 pb-3 px-4 text-center">
                  <p className="text-2xl font-bold" data-testid="text-total-reports">{reports.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent className="pt-4 pb-3 px-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600" data-testid="text-draft-reports">{draftCount}</p>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent className="pt-4 pb-3 px-4 text-center">
                  <p className="text-2xl font-bold text-green-600" data-testid="text-final-reports">{finalCount}</p>
                  <p className="text-xs text-muted-foreground">Finalized</p>
                </CardContent>
              </Card>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground" data-testid="text-no-client-reports">No reports generated yet for this client.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Version</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report: any) => (
                    <TableRow key={report.id} data-testid={`row-client-report-${report.id}`}>
                      <TableCell className="font-medium">{report.reportName}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            report.status === "draft"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                              : report.status === "final"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }
                        >
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">v{report.version}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {report.status === "draft" && (
                              <DropdownMenuItem onClick={() => router.push(`/reports/${report.id}/edit`)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setPreviewReportId(report.id)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            {report.status !== "archived" && (
                              <DropdownMenuItem onClick={() => archiveMutation.mutate(report.id)}>
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
        </>
      )}

      {activeTab === "ai" && (
        <div className="space-y-6">
          <ReportRequestForm clientId={clientId} clientName={clientName} />

          {aiDraftsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : aiDrafts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI-Generated Drafts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Created</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiDrafts.map((draft: any) => (
                      <TableRow key={draft.id} data-testid={`row-ai-draft-${draft.id}`}>
                        <TableCell className="font-medium">{draft.draftTitle || draft.reportName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{draft.reportType?.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              draft.status === "draft"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                : draft.status === "approved"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }
                          >
                            {draft.status?.charAt(0).toUpperCase() + draft.status?.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {new Date(draft.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingDraftId(draft.id)}
                            data-testid={`button-view-draft-${draft.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground" data-testid="text-no-ai-drafts">No AI-generated drafts yet. Use the form above to generate one.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <ReportTemplateSelectionModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onSuccess={() => {
          setIsGenerateModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
        }}
        defaultClientId={clientId}
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
