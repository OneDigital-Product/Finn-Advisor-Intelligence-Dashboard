import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  UserCog,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

interface PendingProfileUpdate {
  id: string;
  clientId: string;
  advisorId: string;
  sourceType: string;
  sourceId: string | null;
  lifeEvent: string;
  fieldUpdates: Record<string, string>;
  reasoning: string | null;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pending: { label: "Pending Review", variant: "outline", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
};

const FIELD_LABELS: Record<string, string> = {
  riskTolerance: "Risk Tolerance",
  occupation: "Occupation",
  employer: "Employer",
  interests: "Interests",
  status: "Client Status",
  segment: "Client Segment",
  maritalStatus: "Marital Status",
};

export function ProfileUpdatesSection({ clientId }: { clientId: string }) {
  const { toast } = useToast();

  const { data: updates = [], isLoading } = useQuery<PendingProfileUpdate[]>({
    queryKey: ["/api/clients", clientId, "profile-updates"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/profile-updates`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const pendingUpdates = updates.filter(u => u.status === "pending");
  const reviewedUpdates = updates.filter(u => u.status !== "pending");

  if (updates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="profile-updates-section">
      {pendingUpdates.length > 0 && (
        <Card style={V2_CARD} className="border-amber-200 dark:border-amber-800" data-testid="card-pending-updates">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              Profile Updates Requiring Review ({pendingUpdates.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingUpdates.map(update => (
              <ProfileUpdateCard key={update.id} update={update} />
            ))}
          </CardContent>
        </Card>
      )}

      {reviewedUpdates.length > 0 && (
        <Card style={V2_CARD} data-testid="card-reviewed-updates">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Reviewed Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reviewedUpdates.slice(0, 5).map(update => {
              const config = STATUS_CONFIG[update.status] || STATUS_CONFIG.pending;
              const Icon = config.icon;
              return (
                <div key={update.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm" data-testid={`reviewed-update-${update.id}`}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="font-medium">{update.lifeEvent}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(update.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant={config.variant} className="text-[10px]">
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ProfileUpdateCard({ update }: { update: PendingProfileUpdate }) {
  const { toast } = useToast();
  const [reviewNote, setReviewNote] = useState("");

  const reviewMutation = useMutation({
    mutationFn: (action: "approve" | "reject") =>
      apiRequest("POST", `/api/profile-updates/${update.id}/review`, { action, reviewNote }),
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", update.clientId, "profile-updates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile-updates/pending"] });
      toast({ title: action === "approve" ? "Profile update approved" : "Profile update rejected" });
    },
    onError: () => toast({ title: "Failed to review update", variant: "destructive" }),
  });

  const fieldUpdates = update.fieldUpdates as Record<string, string>;

  return (
    <div className="p-3 rounded-lg border bg-card" data-testid={`pending-update-${update.id}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-sm">{update.lifeEvent}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Detected from {update.sourceType.replace(/_/g, " ")} &middot; {new Date(update.createdAt).toLocaleDateString()}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      </div>

      {update.reasoning && (
        <p className="text-xs text-muted-foreground mb-2 italic">{update.reasoning}</p>
      )}

      <div className="space-y-1.5 mb-3">
        {Object.entries(fieldUpdates).map(([field, value]) => (
          <div key={field} className="flex items-center gap-2 text-sm" data-testid={`field-update-${field}`}>
            <span className="text-muted-foreground">{FIELD_LABELS[field] || field}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => reviewMutation.mutate("approve")}
          disabled={reviewMutation.isPending}
          className="text-xs"
          data-testid={`button-approve-${update.id}`}
        >
          {reviewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
          Approve & Apply
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => reviewMutation.mutate("reject")}
          disabled={reviewMutation.isPending}
          className="text-xs"
          data-testid={`button-reject-${update.id}`}
        >
          <XCircle className="h-3 w-3 mr-1" />
          Reject
        </Button>
      </div>
    </div>
  );
}
