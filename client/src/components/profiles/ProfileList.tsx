import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "./StatusBadge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, History, Trash2, FileText } from "lucide-react";
import type { InvestorProfile } from "@shared/schema";

interface ProfileListProps {
  onSelectProfile: (profileId: string) => void;
  onViewHistory: (profileId: string) => void;
}

export function ProfileList({ onSelectProfile, onViewHistory }: ProfileListProps) {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProfileType, setNewProfileType] = useState<string>("individual");
  const [newEntityType, setNewEntityType] = useState<string>("trust");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: clientsRaw } = useQuery<any>({
    queryKey: ["/api/clients"],
  });
  // /api/clients returns { clients: [...] } when MuleSoft/pagination is active,
  // or a raw array from local DB without params. Normalize to always be an array.
  const clients: any[] = Array.isArray(clientsRaw) ? clientsRaw : (clientsRaw?.clients ?? []);

  const { data: allProfiles = [], isLoading } = useQuery<InvestorProfile[]>({
    queryKey: ["/api/profiles", "all"],
    queryFn: async () => {
      if (!clients.length) return [];
      const results: InvestorProfile[] = [];
      for (const client of clients) {
        try {
          const res = await fetch(`/api/profiles?clientId=${client.id}`, { credentials: "include" });
          if (res.ok) {
            const profiles = await res.json();
            results.push(...profiles.map((p: any) => ({ ...p, clientName: client.name })));
          }
        } catch {}
      }
      return results;
    },
    enabled: clients.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, any> = {
        clientId: selectedClientId,
        profileType: newProfileType,
      };
      if (newProfileType === "legal_entity") {
        body.entityType = newEntityType;
      }
      const res = await apiRequest("POST", "/api/profiles", body);
      return res.json();
    },
    onSuccess: (profile) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setShowNewModal(false);
      toast({ title: "Profile Created", description: "New investor profile created as draft." });
      onSelectProfile(profile.id);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/profiles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setDeleteId(null);
      toast({ title: "Deleted", description: "Profile deleted." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredProfiles = allProfiles.filter((p: any) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-profiles-title">Investor Profiles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage investor profile questionnaires, drafts, and finalized versions.
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)} data-testid="button-new-profile">
          <Plus className="w-4 h-4 mr-2" />
          New Profile
        </Button>
      </div>

      <div className="flex gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="finalized">Finalized</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredProfiles.length} profile{filteredProfiles.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-16" />
            </Card>
          ))}
        </div>
      ) : filteredProfiles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No profiles found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a new investor profile to get started.
            </p>
            <Button onClick={() => setShowNewModal(true)} data-testid="button-new-profile-empty">
              <Plus className="w-4 h-4 mr-2" />
              New Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredProfiles.map((profile: any) => (
            <Card key={profile.id} className="hover:bg-accent/50 transition-colors" data-testid={`card-profile-${profile.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium" data-testid={`text-client-name-${profile.id}`}>
                        {profile.clientName || "Unknown Client"}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {profile.profileType === "legal_entity" && profile.entityType
                          ? profile.entityType.replace("_", " ")
                          : profile.profileType.replace("_", " ")}
                      </p>
                    </div>
                    <StatusBadge status={profile.status} />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-muted-foreground hidden sm:block">
                      <p>Created {new Date(profile.createdAt).toLocaleDateString()}</p>
                      {profile.expirationDate && (
                        <p>
                          Expires{" "}
                          {Math.ceil(
                            (new Date(profile.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                          )}{" "}
                          days
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectProfile(profile.id)}
                        data-testid={`button-edit-profile-${profile.id}`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewHistory(profile.id)}
                        data-testid={`button-history-profile-${profile.id}`}
                      >
                        <History className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteId(profile.id)}
                        data-testid={`button-delete-profile-${profile.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client</label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profile Type</label>
              <Select value={newProfileType} onValueChange={(v) => { setNewProfileType(v); }}>
                <SelectTrigger data-testid="select-profile-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="legal_entity">Legal Entity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newProfileType === "legal_entity" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Type</label>
                <Select value={newEntityType} onValueChange={setNewEntityType}>
                  <SelectTrigger data-testid="select-entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trust">Trust</SelectItem>
                    <SelectItem value="corporation">Corporation</SelectItem>
                    <SelectItem value="llc">LLC</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="foundation">Foundation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!selectedClientId || createMutation.isPending}
              data-testid="button-create-profile"
            >
              {createMutation.isPending ? "Creating..." : "Create Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to delete this profile? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
