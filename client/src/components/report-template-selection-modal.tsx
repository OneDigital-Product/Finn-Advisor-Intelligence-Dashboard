import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, FileText, TrendingUp, Calendar, ShieldCheck, ChevronRight, ChevronLeft,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultClientId?: string;
}

const templateIcons: Record<string, any> = {
  client_summary: FileText,
  retirement_planning: TrendingUp,
  meeting_recap: Calendar,
  planning_review: ShieldCheck,
};

export function ReportTemplateSelectionModal({ isOpen, onClose, onSuccess, defaultClientId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>(defaultClientId || "");
  const [reportName, setReportName] = useState("");
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({});

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/report-templates"],
    enabled: isOpen,
  });

  const { data: clientsRaw } = useQuery<any>({
    queryKey: ["/api/clients"],
    enabled: isOpen,
  });
  // /api/clients returns { clients: [...] } when MuleSoft/pagination is active,
  // or a raw array from local DB without params. Normalize to always be an array.
  const clients: any[] = Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw?.clients ?? []);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const selectedSections = Object.entries(visibleSections)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const res = await apiRequest("POST", "/api/reports", {
        templateId: selectedTemplate,
        clientId: selectedClient || undefined,
        reportName: reportName || `Report - ${new Date().toLocaleDateString()}`,
        visibleSections: selectedSections.length > 0 ? selectedSections : undefined,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Report generated successfully" });
      onSuccess();
      router.push(`/reports/${data.id}/edit`);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to generate report", description: err.message, variant: "destructive" });
    },
  });

  const selectedTemplateObj = templates.find((t: any) => t.id === selectedTemplate);

  const handleNext = () => {
    if (step === 2 && selectedTemplateObj) {
      const sections: Record<string, boolean> = {};
      (selectedTemplateObj.sections as any[]).forEach((s: any) => {
        sections[s.id] = true;
      });
      setVisibleSections(sections);
    }
    setStep(step + 1);
  };

  const handleClose = () => {
    setStep(1);
    setSelectedTemplate(null);
    setSelectedClient(defaultClientId || "");
    setReportName("");
    setVisibleSections({});
    onClose();
  };

  const selectedClientObj = clients.find((c: any) => c.id === selectedClient);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle data-testid="text-modal-title">
            {step === 1 && "Select Report Template"}
            {step === 2 && "Select Client & Name"}
            {step === 3 && "Choose Visible Sections"}
          </DialogTitle>
          <div className="flex items-center gap-2 pt-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="py-4 min-h-[250px]">
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((template: any) => {
                const Icon = templateIcons[template.templateType] || FileText;
                const isSelected = selectedTemplate === template.id;
                return (
                  <Card
                    key={template.id}
                    className={`p-4 cursor-pointer border-2 transition-all hover:shadow-sm ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:border-muted-foreground/20"
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                    data-testid={`card-template-${template.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-2">
                          {(template.sections as any[])?.length || 0} sections
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium mb-2 block">Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Report Name</Label>
                <Input
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder={`${selectedTemplateObj?.name || "Report"} - ${selectedClientObj ? `${selectedClientObj.firstName} ${selectedClientObj.lastName}` : "Client"}`}
                  data-testid="input-report-name"
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank to auto-generate</p>
              </div>
            </div>
          )}

          {step === 3 && selectedTemplateObj && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Select which sections to include in the report.</p>
              {(selectedTemplateObj.sections as any[]).map((section: any) => (
                <label
                  key={section.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  data-testid={`checkbox-section-${section.id}`}
                >
                  <Checkbox
                    checked={visibleSections[section.id] !== false}
                    onCheckedChange={(checked) =>
                      setVisibleSections({ ...visibleSections, [section.id]: !!checked })
                    }
                  />
                  <div>
                    <span className="text-sm font-medium">{section.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">{section.dataSource}</span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
            Cancel
          </Button>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} data-testid="button-back">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={step === 1 && !selectedTemplate}
              data-testid="button-next"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-generate"
            >
              {generateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Generate Report
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
