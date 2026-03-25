import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { SafeHtml } from "@/components/safe-html";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, X } from "lucide-react";

interface Props {
  reportId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportPreviewModal({ reportId, isOpen, onClose }: Props) {
  const { data: report, isLoading } = useQuery<any>({
    queryKey: ["/api/reports", reportId],
    enabled: isOpen && !!reportId,
  });

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && report?.renderedHtml) {
      printWindow.document.write(DOMPurify.sanitize(report.renderedHtml));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle data-testid="text-preview-title">{report?.reportName || "Report Preview"}</DialogTitle>
              {report && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{report.status}</Badge>
                  <span className="text-xs text-muted-foreground">v{report.version}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={!report?.renderedHtml} data-testid="button-print">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-preview">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg bg-white">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : report?.renderedHtml ? (
            <SafeHtml
              html={report.renderedHtml}
              className="p-2"
              data-testid="div-preview-content"
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No preview available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
