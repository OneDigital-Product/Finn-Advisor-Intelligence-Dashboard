import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, AlertTriangle, CheckCircle2, RotateCcw, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useIntakeJob } from "@/hooks/use-intake-job";
import { useRouter } from "next/navigation";
import { FactCards } from "./fact-cards";
import { apiRequest } from "@/lib/queryClient";

type SubmissionState = "idle" | "submitting" | "polling" | "success" | "error";

interface FormData {
  input_type: string;
  raw_text: string;
  client_id: string;
  household_id: string;
  meeting_date: string;
  related_entities: string;
}

const INPUT_TYPE_LABELS: Record<string, string> = {
  transcript: "Meeting Transcript",
  summary: "Summary Notes",
  dictation: "Dictation",
  notes: "Advisor Notes",
  crm_note: "CRM Note",
  jumpai: "JumpAI Output",
  email: "Email",
};

export function IntakeSubmissionForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    input_type: "",
    raw_text: "",
    client_id: "",
    household_id: "",
    meeting_date: "",
    related_entities: "",
  });
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const { data: clientsDataRaw, isLoading: clientsLoading } = useQuery<any>({
    queryKey: ["/api/clients"],
  });
  // /api/clients returns { clients: [...] } when MuleSoft/pagination is active,
  // or a raw array from local DB without params. Normalize to always be an array.
  const clientsData: any[] = Array.isArray(clientsDataRaw) ? clientsDataRaw : (clientsDataRaw?.clients ?? []);

  const { data: householdsData } = useQuery<any>({
    queryKey: ["/api/clients", formData.client_id],
    enabled: !!formData.client_id,
  });

  const intakeJob = useIntakeJob(submissionState === "polling" ? jobId : null);

  useEffect(() => {
    if (submissionState !== "polling") return;

    if (intakeJob.status === "completed" && intakeJob.data) {
      setSubmissionState("success");
    } else if (intakeJob.status === "failed" || intakeJob.status === "timed_out") {
      setSubmissionState("error");
      setError(intakeJob.error || "Processing failed");
    }
  }, [intakeJob.status, intakeJob.data, intakeJob.error, submissionState]);

  const textCharCount = formData.raw_text.length;
  const isFormValid =
    formData.raw_text.trim().length >= 50 && formData.input_type && formData.client_id && user?.id;

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "client_id") {
      setFormData((prev) => ({ ...prev, household_id: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionState("submitting");
    setError(null);

    try {
      const payload = {
        input: {
          input_type: formData.input_type,
          client_id: formData.client_id,
          household_id: formData.household_id || null,
          raw_text: formData.raw_text,
          meeting_date: formData.meeting_date || null,
          related_entities: formData.related_entities
            ? formData.related_entities.split(",").map((e) => e.trim()).filter(Boolean)
            : [],
        },
      };

      const response = await apiRequest("POST", "/api/cassidy/submit-intake", payload);
      const data = await response.json();
      setJobId(data.job_id);
      setSubmissionState("polling");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setSubmissionState("error");
    }
  };

  const handleReset = () => {
    setFormData({
      input_type: "",
      raw_text: "",
      client_id: "",
      household_id: "",
      meeting_date: "",
      related_entities: "",
    });
    setSubmissionState("idle");
    setError(null);
    setJobId(null);
  };

  const households = householdsData?.households || [];

  if (submissionState === "polling") {
    return (
      <Card data-testid="intake-loading-card">
        <CardHeader>
          <CardTitle>Processing Intake</CardTitle>
          <CardDescription>Extracting facts from your submission...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              The AI agent is analyzing the text and extracting structured facts. This typically takes 3-8 seconds.
            </p>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (submissionState === "success" && intakeJob.data) {
    return (
      <div className="space-y-4" data-testid="intake-results">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Facts Extracted Successfully</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push(`/review/${jobId}`)}
              data-testid="button-review-facts"
            >
              Review Facts
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-new-intake">
              <RotateCcw className="h-4 w-4 mr-2" />
              New Intake
            </Button>
          </div>
        </div>
        <FactCards
          facts={intakeJob.data.facts}
          missingFields={intakeJob.data.missing_fields}
          possibleEntities={intakeJob.data.possible_entities}
          warnings={intakeJob.data.warnings}
          summary={intakeJob.data.summary}
        />
      </div>
    );
  }

  return (
    <Card data-testid="intake-form-card">
      <CardHeader>
        <CardTitle>Submit for Intake Processing</CardTitle>
        <CardDescription>Extract structured facts from transcripts, meeting notes, or summaries</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-intake">
          <div className="space-y-2">
            <label className="text-sm font-medium">Input Type *</label>
            <Select value={formData.input_type} onValueChange={(v) => handleInputChange("input_type", v)}>
              <SelectTrigger data-testid="select-input-type">
                <SelectValue placeholder="Select input type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INPUT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value} data-testid={`option-input-type-${value}`}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Client *</label>
            <Select value={formData.client_id} onValueChange={(v) => handleInputChange("client_id", v)}>
              <SelectTrigger data-testid="select-client">
                <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Select client"} />
              </SelectTrigger>
              <SelectContent>
                {clientsData?.map((client: any) => (
                  <SelectItem key={client.id} value={client.id} data-testid={`option-client-${client.id}`}>
                    {client.firstName} {client.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.client_id && households.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Household (optional)</label>
              <Select value={formData.household_id} onValueChange={(v) => handleInputChange("household_id", v)}>
                <SelectTrigger data-testid="select-household">
                  <SelectValue placeholder="Select household" />
                </SelectTrigger>
                <SelectContent>
                  {households.map((hh: any) => (
                    <SelectItem key={hh.id} value={hh.id} data-testid={`option-household-${hh.id}`}>
                      {hh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Meeting Date (optional)</label>
            <input
              type="datetime-local"
              value={formData.meeting_date}
              onChange={(e) => handleInputChange("meeting_date", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-testid="input-meeting-date"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Text Content *{" "}
              <span className={cn("font-normal", textCharCount > 0 && textCharCount < 50 ? "text-amber-600" : "text-muted-foreground")}>
                ({textCharCount} characters{textCharCount < 50 ? `, ${50 - textCharCount} more needed` : ""})
              </span>
            </label>
            <Textarea
              placeholder="Paste transcript, notes, or summary here..."
              value={formData.raw_text}
              onChange={(e) => handleInputChange("raw_text", e.target.value)}
              className="min-h-[250px]"
              disabled={submissionState === "submitting"}
              data-testid="input-raw-text"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Related Entities (optional)</label>
            <Textarea
              placeholder="Comma-separated entity names (e.g., Acme Inc, John Smith's Trust)"
              value={formData.related_entities}
              onChange={(e) => handleInputChange("related_entities", e.target.value)}
              className="min-h-[60px]"
              disabled={submissionState === "submitting"}
              data-testid="input-related-entities"
            />
          </div>

          {error && (
            <Alert variant="destructive" data-testid="alert-intake-error">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={!isFormValid || submissionState === "submitting"} className="w-full" data-testid="button-submit-intake">
            {submissionState === "submitting" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit for Intake"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

