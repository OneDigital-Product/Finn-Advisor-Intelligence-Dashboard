import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  FileText,
  Plus,
  Play,
  Eye,
  Clock,
  CheckCircle2,
  Send,
  Search,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FactFinders() {
  const router = useRouter();
  const [launchOpen, setLaunchOpen] = useState(false);
  const [selectedDef, setSelectedDef] = useState<any>(null);
  const [clientSearch, setClientSearch] = useState("");
  const { toast } = useToast();

  const { data: definitions = [], isLoading: defsLoading } = useQuery<any[]>({
    queryKey: ["/api/fact-finders"],
  });

  const { data: responses = [], isLoading: responsesLoading } = useQuery<any[]>({
    queryKey: ["/api/fact-finder-responses"],
  });

  const { data: allClientsRaw } = useQuery<any>({
    queryKey: ["/api/clients"],
  });
  // /api/clients returns { clients: [...] } when MuleSoft/pagination is active,
  // or a raw array from local DB without params. Normalize to always be an array.
  const allClients: any[] = Array.isArray(allClientsRaw) ? allClientsRaw : (allClientsRaw?.clients ?? []);

  const createMutation = useMutation({
    mutationFn: async (data: { definitionId: string; clientId: string }) => {
      const res = await apiRequest("POST", "/api/fact-finder-responses", data);
      return await res.json();
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fact-finder-responses"] });
      toast({ title: "Fact finder started" });
      setLaunchOpen(false);
      router.push(`/fact-finders/${data.id}/fill`);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filteredClients = allClients.filter((c: any) => {
    if (!clientSearch) return true;
    const fullName = `${c.firstName || ""} ${c.lastName || ""}`.toLowerCase();
    return fullName.includes(clientSearch.toLowerCase());
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary" className="no-default-active-elevate"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case "submitted":
        return <Badge className="bg-blue-600 no-default-active-elevate"><Send className="w-3 h-3 mr-1" />Submitted</Badge>;
      case "reviewed":
        return <Badge className="bg-emerald-600 no-default-active-elevate"><CheckCircle2 className="w-3 h-3 mr-1" />Reviewed</Badge>;
      default:
        return <Badge variant="outline" className="no-default-active-elevate">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Fact Finders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Launch and manage client fact-finding questionnaires</p>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            Templates ({definitions.length})
          </TabsTrigger>
          <TabsTrigger value="responses" data-testid="tab-responses">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Responses ({responses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          {defsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : definitions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No fact finder templates available yet</p>
                <p className="text-xs text-muted-foreground mt-1">Templates will appear here once configured</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {definitions.map((def: any) => {
                const qCount = (def.questionSchema as any[])?.length || 0;
                const sections = [...new Set((def.questionSchema as any[])?.map((q: any) => q.section) || [])];
                return (
                  <Card key={def.id} className="hover-elevate cursor-pointer" data-testid={`card-definition-${def.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] capitalize no-default-active-elevate">{def.category}</Badge>
                      </div>
                      <CardTitle className="text-sm mt-2">{def.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {def.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{def.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{sections.length} section{sections.length !== 1 ? "s" : ""}</span>
                        <span>{qCount} question{qCount !== 1 ? "s" : ""}</span>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => { setSelectedDef(def); setLaunchOpen(true); }}
                        data-testid={`button-launch-${def.id}`}
                      >
                        <Play className="w-3.5 h-3.5 mr-1" />
                        Launch for Client
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="responses" className="mt-4">
          {responsesLoading ? (
            <Skeleton className="h-64" />
          ) : responses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No fact finder responses yet</p>
                <p className="text-xs text-muted-foreground mt-1">Launch a fact finder from the Templates tab to get started</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((resp: any) => (
                      <TableRow key={resp.id} data-testid={`row-response-${resp.id}`}>
                        <TableCell className="font-medium">{resp.definitionName || "—"}</TableCell>
                        <TableCell>{resp.clientName || "—"}</TableCell>
                        <TableCell>{statusBadge(resp.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={resp.completionPercentage || 0} className="w-20 h-2" />
                            <span className="text-xs text-muted-foreground">{resp.completionPercentage || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {resp.startedAt ? new Date(resp.startedAt).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {resp.status === "draft" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/fact-finders/${resp.id}/fill`)}
                              data-testid={`button-continue-${resp.id}`}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Continue
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/fact-finders/${resp.id}/fill`)}
                              data-testid={`button-view-${resp.id}`}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={launchOpen} onOpenChange={setLaunchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Launch: {selectedDef?.name}</DialogTitle>
            <DialogDescription>Select a client to begin this fact finder questionnaire.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-8"
                data-testid="input-client-search"
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredClients.map((client: any) => (
                <Button
                  key={client.id}
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => createMutation.mutate({ definitionId: selectedDef?.id, clientId: client.id })}
                  disabled={createMutation.isPending}
                  data-testid={`button-select-client-${client.id}`}
                >
                  {client.firstName} {client.lastName}
                </Button>
              ))}
              {filteredClients.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No clients found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
