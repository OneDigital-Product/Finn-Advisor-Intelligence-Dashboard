import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ProfileDraftFormProps {
  clientId: string;
  householdId?: string;
  onSubmit: (jobId: string, profileMode: string) => void;
}

interface ApprovedFactsInfo {
  count: number;
  high: number;
  medium: number;
  low: number;
}

export function ProfileDraftForm({ clientId, householdId, onSubmit }: ProfileDraftFormProps) {
  const [profileMode, setProfileMode] = useState<"individual" | "legal_entity">("individual");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factsInfo, setFactsInfo] = useState<ApprovedFactsInfo | null>(null);
  const [factsLoading, setFactsLoading] = useState(true);

  useEffect(() => {
    const fetchApprovedFacts = async () => {
      try {
        const response = await fetch(`/api/cassidy/facts/approved/${clientId}`, { credentials: "include" });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          setError(errData.error || `Failed to load facts (${response.status})`);
          return;
        }
        const data = await response.json();
        setFactsInfo({ count: data.count, high: data.high, medium: data.medium, low: data.low });
      } catch (err) {
        setError("Unable to connect to server. Please try again.");
      } finally {
        setFactsLoading(false);
      }
    };
    fetchApprovedFacts();
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/cassidy/submit-profile-draft", {
        client_id: clientId,
        household_id: householdId || null,
        profile_mode: profileMode,
      });
      const data = await response.json();
      onSubmit(data.job_id, profileMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit profile draft request");
      setSubmitting(false);
    }
  };

  if (factsLoading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Checking approved facts...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !factsInfo) {
    return (
      <Alert variant="destructive" data-testid="alert-facts-load-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!factsInfo || factsInfo.count === 0) {
    return (
      <Alert variant="destructive" data-testid="alert-no-approved-facts">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No approved facts found for this client. Please complete the intake and fact review process first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card data-testid="profile-draft-form-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generate Profile Draft
        </CardTitle>
        <CardDescription>
          Map {factsInfo.count} approved facts to investor profile questions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex gap-2 flex-wrap" data-testid="approved-facts-badges">
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {factsInfo.high} HIGH
          </Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
            {factsInfo.medium} MEDIUM
          </Badge>
          <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {factsInfo.low} LOW
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-profile-draft">
          <div className="space-y-2">
            <label className="text-sm font-medium">Profile Type *</label>
            <Select value={profileMode} onValueChange={(v) => setProfileMode(v as "individual" | "legal_entity")}>
              <SelectTrigger data-testid="select-profile-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual Investor</SelectItem>
                <SelectItem value="legal_entity">Legal Entity / Trust</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive" data-testid="alert-profile-draft-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={submitting} className="w-full" data-testid="button-generate-draft">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Profile Draft"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
