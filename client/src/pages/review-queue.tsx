import { useRouter, useParams } from "next/navigation";
import { FactReviewQueue } from "@/components/cassidy/fact-review-queue";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReviewQueuePage({ params: propParams }: { params?: { jobId?: string } } = {}) {
  const routeParams = useParams();
  const router = useRouter();
  const jobId = propParams?.jobId || (routeParams?.jobId as string);

  if (!jobId) {
    return (
      <div className="p-6 text-center text-muted-foreground" data-testid="review-queue-not-found">
        <p>No job ID provided. Please start from the Intake page.</p>
        <Button variant="ghost" onClick={() => router.push("/intake")} data-testid="link-back-to-intake">
          Go to Intake
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/intake")}
          data-testid="button-back-intake"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-review-title">Review Extracted Facts</h1>
          <p className="text-muted-foreground text-sm">
            Approve, reject, or edit facts before they are stored
          </p>
        </div>
      </div>

      <FactReviewQueue
        jobId={jobId}
        onComplete={(clientId) => {
          if (clientId) router.push(`/profile-draft/${clientId}`);
        }}
        onBack={() => router.push("/intake")}
      />
    </div>
  );
}
