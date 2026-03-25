import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCassidyJob } from "@/hooks/use-cassidy-job";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, CheckCircle2, AlertCircle, BookOpen } from "lucide-react";

const REPORT_TYPES = [
  { value: "meeting_summary", label: "Meeting Summary", description: "Recap of key meeting takeaways" },
  { value: "planning_summary", label: "Planning Summary", description: "Financial planning overview" },
  { value: "client_recap", label: "Client Recap", description: "Comprehensive client situation recap" },
  { value: "internal_note", label: "Internal Note", description: "Internal advisor reference note" },
  { value: "narrative", label: "Narrative Report", description: "Detailed narrative for client" },
  { value: "case_consulting", label: "Case Consulting Brief", description: "Brief for team case review" },
  { value: "strategic_recs", label: "Strategic Recommendations", description: "Strategic planning recommendations" },
  { value: "financial_plan_summary", label: "Financial Plan Summary", description: "Summary of financial plan" },
];

interface Props {
  clientId: string;
  clientName: string;
  meetingId?: string;
  onDraftReady?: (draftId: string) => void;
}

export function ReportRequestForm({ clientId, clientName, meetingId, onDraftReady }: Props) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("");
  const [instruction, setInstruction] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: factsData } = useQuery<any>({
    queryKey: ["/api/cassidy/facts/approved", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/cassidy/facts/approved/${clientId}`, { credentials: "include" });
      if (!res.ok) return { facts: [] };
      return res.json();
    },
    enabled: !!clientId,
  });

  const approvedCount = Array.isArray(factsData?.facts) ? factsData.facts.length : 0;

  const { status: jobStatus, data: jobData, error: jobError } = useCassidyJob(jobId);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cassidy/generate-report", {
        report_type: reportType,
        advisor_instruction: instruction,
        client_id: clientId,
        meeting_id: meetingId || null,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setJobId(data.job_id);
      toast({ title: "Report generation started" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to start generation", description: err.message, variant: "destructive" });
    },
  });

  const isGenerating = jobId && (jobStatus === "pending" || jobStatus === "in_progress");
  const isCompleted = jobStatus === "completed";
  const isFailed = jobStatus === "failed" || jobStatus === "timed_out";

  if (isCompleted && jobData) {
    queryClient.invalidateQueries({ queryKey: ["/api/cassidy/report-drafts/client", clientId] });
  }

  const canSubmit = reportType && instruction.length >= 50 && instruction.length <= 500 && !submitMutation.isPending && !isGenerating;

  return (
    <Card data-testid="card-report-request-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Generate AI Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isGenerating && !isCompleted && (
          <>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>Client: <strong>{clientName}</strong></span>
              <Badge variant="outline">{approvedCount} approved facts</Badge>
              {meetingId && <Badge variant="outline">Meeting linked</Badge>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type" data-testid="select-report-type">
                  <SelectValue placeholder="Select report type..." />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((rt) => (
                    <SelectItem key={rt.value} value={rt.value} data-testid={`option-report-type-${rt.value}`}>
                      <div>
                        <span className="font-medium">{rt.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {rt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instruction">Advisor Instruction</Label>
              <Textarea
                id="instruction"
                placeholder="Describe what you'd like in this report. Include tone, emphasis areas, and any specific items to highlight or exclude... (50-500 characters)"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={4}
                data-testid="textarea-instruction"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{instruction.length < 50 ? `${50 - instruction.length} more characters needed` : "Ready"}</span>
                <span className={instruction.length > 500 ? "text-destructive" : ""}>{instruction.length}/500</span>
              </div>
            </div>

            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!canSubmit}
              className="w-full"
              data-testid="button-submit-report"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center gap-3 py-8" data-testid="status-generating">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Generating report...</p>
            <p className="text-xs text-muted-foreground">The AI agent is drafting your report. This may take a moment.</p>
          </div>
        )}

        {isCompleted && (
          <div className="flex flex-col items-center gap-3 py-8" data-testid="status-completed">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <p className="text-sm font-medium">Report draft ready!</p>
            <Button
              onClick={() => {
                setJobId(null);
                setReportType("");
                setInstruction("");
              }}
              variant="outline"
              data-testid="button-generate-another"
            >
              Generate Another Report
            </Button>
          </div>
        )}

        {isFailed && (
          <div className="flex flex-col items-center gap-3 py-6" data-testid="status-failed">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p className="text-sm font-medium">Report generation failed</p>
            <p className="text-xs text-muted-foreground">{jobError || "An unexpected error occurred"}</p>
            <Button
              onClick={() => {
                setJobId(null);
              }}
              variant="outline"
              data-testid="button-retry-report"
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
