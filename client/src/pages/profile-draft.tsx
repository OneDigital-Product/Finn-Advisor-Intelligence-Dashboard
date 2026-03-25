import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProfileDraftForm } from "@/components/cassidy/profile-draft-form";
import { ProfileDraftViewer } from "@/components/cassidy/profile-draft-viewer";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfileDraftPage({ params: propParams }: { params?: { clientId?: string } } = {}) {
  const routeParams = useParams();
  const router = useRouter();
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [profileMode, setProfileMode] = useState<string>("individual");
  const clientId = propParams?.clientId || (routeParams?.clientId as string);

  if (!clientId) {
    return (
      <div className="p-6 text-center text-muted-foreground" data-testid="profile-draft-not-found">
        <p>No client ID provided.</p>
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
          data-testid="button-back-from-draft"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-profile-draft-title">
            Investor Profile Draft
          </h1>
          <p className="text-muted-foreground text-sm">
            Map approved facts to profile questions
          </p>
        </div>
      </div>

      {!currentJobId ? (
        <div className="max-w-xl">
          <ProfileDraftForm
            clientId={clientId}
            onSubmit={(jobId, mode) => {
              setCurrentJobId(jobId);
              setProfileMode(mode);
            }}
          />
        </div>
      ) : (
        <ProfileDraftViewer
          jobId={currentJobId}
          profileMode={profileMode}
          onCommit={(jobId) => router.push(`/profile-commit/${jobId}`)}
        />
      )}
    </div>
  );
}
