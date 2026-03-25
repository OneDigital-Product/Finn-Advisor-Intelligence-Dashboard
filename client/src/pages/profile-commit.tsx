import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProfileCommitWizard } from "@/components/cassidy/profile-commit-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";

export default function ProfileCommitPage({ params: propParams }: { params?: { jobId?: string } } = {}) {
  const routeParams = useParams();
  const router = useRouter();
  const jobId = propParams?.jobId || (routeParams?.jobId as string);
  const [jobData, setJobData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchJob = async () => {
      try {
        const response = await fetch(`/api/cassidy/job-output/${jobId}`, { credentials: "include" });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to load job (${response.status})`);
        }
        const data = await response.json();
        if (data.task_type !== "investor_profile_draft") {
          throw new Error("This job is not a profile draft");
        }
        if (!data.output?.question_responses?.length) {
          throw new Error("No profile draft questions found. Please generate a draft first.");
        }
        setJobData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load job data");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  if (!jobId) {
    return (
      <div className="p-6 text-center text-muted-foreground" data-testid="commit-not-found">
        <p>No job ID provided.</p>
        <Button variant="ghost" onClick={() => router.push("/intake")} data-testid="link-back-to-intake">
          Go to Intake
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading profile draft...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Alert variant="destructive" data-testid="commit-load-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push("/intake")} data-testid="button-back-to-intake">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Intake
        </Button>
      </div>
    );
  }

  const clientId = jobData.client_id;
  const profileMode = jobData.output?.profile_mode || (jobData.request_payload as any)?.input?.profile_mode || "individual";
  const answeredQuestions = (jobData.output?.question_responses || []).filter((q: any) => q.proposed_answer);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/profile-draft/${clientId}`)}
          data-testid="button-back-from-commit"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-commit-title">
            Review & Commit Profile
          </h1>
          <p className="text-muted-foreground text-sm">
            Accept or override each profile answer, then commit
          </p>
        </div>
      </div>

      <ProfileCommitWizard
        jobId={jobId!}
        clientId={clientId}
        profileMode={profileMode}
        draftQuestions={answeredQuestions}
        onComplete={() => {
          router.push("/intake");
        }}
      />
    </div>
  );
}
