import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil } from "lucide-react";
import { useState, useEffect } from "react";

interface AdvisorRecord {
  id: string;
  name: string;
  email: string;
  title: string;
  phone?: string;
  clientCount: number;
  totalAum: number;
}

import { formatCurrency } from "@/lib/format";

function AdvisorFormDialog({
  open,
  onOpenChange,
  advisor,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  advisor?: AdvisorRecord | null;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(advisor?.name || "");
  const [email, setEmail] = useState(advisor?.email || "");
  const [title, setTitle] = useState(advisor?.title || "");
  const [phone, setPhone] = useState(advisor?.phone || "");

  useEffect(() => {
    if (open) {
      setName(advisor?.name || "");
      setEmail(advisor?.email || "");
      setTitle(advisor?.title || "");
      setPhone(advisor?.phone || "");
    }
  }, [open, advisor]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (advisor) {
        return apiRequest("PATCH", `/api/admin/advisors/${advisor.id}`, { name, email, title, phone });
      }
      return apiRequest("POST", "/api/admin/advisors", { name, email, title, phone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/advisors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/advisor"] });
      onOpenChange(false);
      toast({ title: advisor ? "Advisor updated" : "Advisor created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{advisor ? "Edit Advisor" : "Add Advisor"}</DialogTitle>
          <DialogDescription>
            {advisor ? "Update the advisor's details below." : "Fill in the details for the new advisor."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="adv-name">Full Name</Label>
            <Input id="adv-name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" data-testid="input-advisor-name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adv-email">Email</Label>
            <Input id="adv-email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@onedigital.com" data-testid="input-advisor-email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adv-title">Title</Label>
            <Input id="adv-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Senior Wealth Advisor" data-testid="input-advisor-title" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adv-phone">Phone</Label>
            <Input id="adv-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(404) 555-0100" data-testid="input-advisor-phone" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-advisor">Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name || !email || !title} data-testid="button-save-advisor">
              {mutation.isPending ? "Saving..." : advisor ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UsersTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<AdvisorRecord | null>(null);

  const { data: advisors, isLoading } = useQuery<AdvisorRecord[]>({
    queryKey: ["/api/admin/advisors"],
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-32" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-users-title">Advisors</h2>
          <p className="text-sm text-muted-foreground">{advisors?.length || 0} advisor{(advisors?.length || 0) !== 1 ? "s" : ""} in the system</p>
        </div>
        <Button size="sm" onClick={() => { setEditingAdvisor(null); setShowForm(true); }} data-testid="button-add-advisor">
          <Plus className="w-3.5 h-3.5 mr-1.5" />Add Advisor
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="text-right">AUM</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {advisors?.map((adv) => (
                <TableRow key={adv.id} data-testid={`row-advisor-${adv.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {adv.name?.split(" ").map((n: string) => n[0]).join("") || "?"}
                        </span>
                      </div>
                      <span className="font-medium text-sm">{adv.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{adv.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{adv.email}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{adv.clientCount}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatCurrency(adv.totalAum)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingAdvisor(adv); setShowForm(true); }}
                      data-testid={`button-edit-advisor-${adv.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!advisors || advisors.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No advisors found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdvisorFormDialog open={showForm} onOpenChange={setShowForm} advisor={editingAdvisor} />
    </div>
  );
}

export { UsersTab, formatCurrency };
