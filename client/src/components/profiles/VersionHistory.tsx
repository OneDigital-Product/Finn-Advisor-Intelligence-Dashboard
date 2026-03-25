import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Eye, Clock } from "lucide-react";

interface VersionHistoryProps {
  profileId: string;
  onBack: () => void;
}

export function VersionHistory({ profileId, onBack }: VersionHistoryProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const { data: versions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/profiles", profileId, "versions"],
  });

  const { data: versionDetail } = useQuery<any>({
    queryKey: ["/api/profiles", profileId, "versions", selectedVersionId],
    enabled: !!selectedVersionId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="button-back-from-history">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-version-history-title">Version History</h1>
          <p className="text-sm text-muted-foreground">
            View finalized versions of this profile.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-16" />
            </Card>
          ))}
        </div>
      ) : versions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No versions yet</h3>
            <p className="text-sm text-muted-foreground">
              Finalize the profile to create the first version.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {versions.map((version: any) => (
            <Card key={version.versionId} data-testid={`card-version-${version.versionNumber}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      v{version.versionNumber}
                    </div>
                    <div>
                      <p className="font-medium">Version {version.versionNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        Submitted by {version.submittedBy} on{" "}
                        {new Date(version.submittedAt).toLocaleDateString()} at{" "}
                        {new Date(version.submittedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedVersionId(version.versionId)}
                    data-testid={`button-view-version-${version.versionNumber}`}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedVersionId} onOpenChange={() => setSelectedVersionId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Version {versionDetail?.versionNumber} Details
            </DialogTitle>
          </DialogHeader>
          {versionDetail ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Submitted on {new Date(versionDetail.submittedAt).toLocaleDateString()} by {versionDetail.submittedBy}
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {Object.entries(versionDetail.answers as Record<string, any>).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-start py-1.5 border-b border-border/50" data-testid={`version-answer-${key}`}>
                    <span className="text-sm font-medium mr-4">{key}</span>
                    <span className="text-sm text-muted-foreground text-right max-w-[60%]">
                      {Array.isArray(value) ? value.join(", ") : String(value ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
