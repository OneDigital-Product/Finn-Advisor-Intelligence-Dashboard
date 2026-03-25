import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, FileText, Search, Trash2, Edit, BookOpen,
  ClipboardList, CheckCircle, AlertCircle, Send, X
} from "lucide-react";

interface SopDocument {
  id: string;
  title: string;
  category: string;
  description: string | null;
  content: string;
  version: string;
  status: string;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CustodialInstruction {
  id: string;
  custodian: string;
  actionType: string;
  formName: string;
  description: string | null;
  requiredFields: string[];
  requiredSignatures: string[];
  supportingDocuments: string[];
  instructions: string | null;
  processingTime: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface SopQueryResult {
  answer: string;
  sources: Array<{ documentTitle: string; category: string; chunkContent: string }>;
  confidence: string;
}

const SOP_CATEGORIES = [
  "Account Opening",
  "Account Maintenance",
  "Transfers",
  "Trading",
  "Compliance",
  "Client Onboarding",
  "Reporting",
  "Fee Management",
  "Operations",
  "General",
];

function SopDocumentsSection() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editDoc, setEditDoc] = useState<SopDocument | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "General",
    description: "",
    content: "",
    version: "1.0",
    status: "active" as "active" | "draft" | "archived",
  });

  const { data: documents = [], isLoading } = useQuery<SopDocument[]>({
    queryKey: ["/api/sop/documents"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/sop/documents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/documents"] });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: "SOP document created" });
    },
    onError: () => toast({ title: "Failed to create document", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      apiRequest("PATCH", `/api/sop/documents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/documents"] });
      setEditDoc(null);
      resetForm();
      toast({ title: "SOP document updated" });
    },
    onError: () => toast({ title: "Failed to update document", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sop/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sop/documents"] });
      toast({ title: "SOP document deleted" });
    },
    onError: () => toast({ title: "Failed to delete document", variant: "destructive" }),
  });

  const resetForm = () => {
    setFormData({ title: "", category: "General", description: "", content: "", version: "1.0", status: "active" });
  };

  const handleEdit = (doc: SopDocument) => {
    setEditDoc(doc);
    setFormData({
      title: doc.title,
      category: doc.category,
      description: doc.description || "",
      content: doc.content,
      version: doc.version,
      status: doc.status as "active" | "draft" | "archived",
    });
  };

  const handleSubmit = () => {
    if (editDoc) {
      updateMutation.mutate({ id: editDoc.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const statusColor = (s: string) => {
    if (s === "active") return "default";
    if (s === "draft") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold" data-testid="text-sop-documents-heading">SOP Documents ({documents.length})</span>
        </div>
        <Dialog open={showCreateDialog || !!editDoc} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); setEditDoc(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setShowCreateDialog(true)} data-testid="button-add-sop-document">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-sop-dialog-title">{editDoc ? "Edit SOP Document" : "Add SOP Document"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Account Transfer Procedure"
                    data-testid="input-sop-title"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                  <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v }))}>
                    <SelectTrigger data-testid="select-sop-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOP_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Version</label>
                  <Input
                    value={formData.version}
                    onChange={(e) => setFormData(p => ({ ...p, version: e.target.value }))}
                    data-testid="input-sop-version"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v as "active" | "draft" | "archived" }))}>
                    <SelectTrigger data-testid="select-sop-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief summary of this SOP..."
                  rows={2}
                  data-testid="input-sop-description"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Content</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(p => ({ ...p, content: e.target.value }))}
                  placeholder="Paste the full SOP content here..."
                  rows={12}
                  className="font-mono text-xs"
                  data-testid="input-sop-content"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditDoc(null); resetForm(); }} data-testid="button-cancel-sop">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.title || !formData.content || createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-sop"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editDoc ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading documents...</div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No SOP documents yet. Add your first document to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} data-testid={`card-sop-document-${doc.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold truncate" data-testid={`text-sop-title-${doc.id}`}>{doc.title}</span>
                      <Badge variant={statusColor(doc.status)} className="text-[10px]">{doc.status}</Badge>
                      <Badge variant="outline" className="text-[10px]">{doc.category}</Badge>
                    </div>
                    {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{doc.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span>v{doc.version}</span>
                      <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                      <span>{doc.content.length.toLocaleString()} chars</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(doc)} data-testid={`button-edit-sop-${doc.id}`}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { if (confirm("Delete this SOP document?")) deleteMutation.mutate(doc.id); }}
                      data-testid={`button-delete-sop-${doc.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CustodialInstructionsSection() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editInstr, setEditInstr] = useState<CustodialInstruction | null>(null);
  const [filterCustodian, setFilterCustodian] = useState<string>("");
  const [formData, setFormData] = useState({
    custodian: "",
    actionType: "",
    formName: "",
    description: "",
    requiredFields: [] as string[],
    requiredSignatures: [] as string[],
    supportingDocuments: [] as string[],
    instructions: "",
    processingTime: "",
    notes: "",
  });
  const [fieldInput, setFieldInput] = useState("");
  const [sigInput, setSigInput] = useState("");
  const [docInput, setDocInput] = useState("");

  const { data: instructions = [], isLoading } = useQuery<CustodialInstruction[]>({
    queryKey: ["/api/custodial-instructions", filterCustodian],
    queryFn: async () => {
      const params = filterCustodian && filterCustodian !== "__all__" ? `?custodian=${encodeURIComponent(filterCustodian)}` : "";
      const res = await fetch(`/api/custodial-instructions${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: metadata } = useQuery<{ custodians: string[]; actionTypes: string[] }>({
    queryKey: ["/api/custodial-instructions/custodians/list"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/custodial-instructions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custodial-instructions"] });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: "Custodial instruction created" });
    },
    onError: () => toast({ title: "Failed to create instruction", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      apiRequest("PATCH", `/api/custodial-instructions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custodial-instructions"] });
      setEditInstr(null);
      resetForm();
      toast({ title: "Custodial instruction updated" });
    },
    onError: () => toast({ title: "Failed to update instruction", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/custodial-instructions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custodial-instructions"] });
      toast({ title: "Custodial instruction deleted" });
    },
    onError: () => toast({ title: "Failed to delete instruction", variant: "destructive" }),
  });

  const resetForm = () => {
    setFormData({
      custodian: "", actionType: "", formName: "", description: "",
      requiredFields: [], requiredSignatures: [], supportingDocuments: [],
      instructions: "", processingTime: "", notes: "",
    });
    setFieldInput(""); setSigInput(""); setDocInput("");
  };

  const handleEdit = (instr: CustodialInstruction) => {
    setEditInstr(instr);
    setFormData({
      custodian: instr.custodian,
      actionType: instr.actionType,
      formName: instr.formName,
      description: instr.description || "",
      requiredFields: Array.isArray(instr.requiredFields) ? instr.requiredFields : [],
      requiredSignatures: Array.isArray(instr.requiredSignatures) ? instr.requiredSignatures : [],
      supportingDocuments: Array.isArray(instr.supportingDocuments) ? instr.supportingDocuments : [],
      instructions: instr.instructions || "",
      processingTime: instr.processingTime || "",
      notes: instr.notes || "",
    });
  };

  const handleSubmit = () => {
    if (editInstr) {
      updateMutation.mutate({ id: editInstr.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addToList = (field: "requiredFields" | "requiredSignatures" | "supportingDocuments", value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    setFormData(p => ({ ...p, [field]: [...p[field], value.trim()] }));
    setter("");
  };

  const removeFromList = (field: "requiredFields" | "requiredSignatures" | "supportingDocuments", index: number) => {
    setFormData(p => ({ ...p, [field]: p[field].filter((_, i) => i !== index) }));
  };

  const ListEditor = ({ label, field, input, setInput, testIdPrefix }: {
    label: string; field: "requiredFields" | "requiredSignatures" | "supportingDocuments";
    input: string; setInput: (v: string) => void; testIdPrefix: string;
  }) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <div className="flex gap-2 mb-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Add ${label.toLowerCase()}...`}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addToList(field, input, setInput); } }}
          data-testid={`input-${testIdPrefix}`}
        />
        <Button variant="outline" size="sm" onClick={() => addToList(field, input, setInput)} data-testid={`button-add-${testIdPrefix}`}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {formData[field].map((item, i) => (
          <Badge key={i} variant="secondary" className="text-[10px] gap-1">
            {item}
            <button onClick={() => removeFromList(field, i)} className="ml-0.5 hover:text-destructive">
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold" data-testid="text-custodial-instructions-heading">Custodial Instructions ({instructions.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {metadata && metadata.custodians.length > 0 && (
            <Select value={filterCustodian} onValueChange={setFilterCustodian}>
              <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="select-filter-custodian">
                <SelectValue placeholder="All custodians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All custodians</SelectItem>
                {metadata.custodians.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Dialog open={showCreateDialog || !!editInstr} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); setEditInstr(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setShowCreateDialog(true)} data-testid="button-add-custodial-instruction">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Instruction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle data-testid="text-custodial-dialog-title">{editInstr ? "Edit Custodial Instruction" : "Add Custodial Instruction"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Custodian</label>
                    <Input
                      value={formData.custodian}
                      onChange={(e) => setFormData(p => ({ ...p, custodian: e.target.value }))}
                      placeholder="e.g. Schwab"
                      data-testid="input-custodian"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Action Type</label>
                    <Input
                      value={formData.actionType}
                      onChange={(e) => setFormData(p => ({ ...p, actionType: e.target.value }))}
                      placeholder="e.g. Account Transfer"
                      data-testid="input-action-type"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Form Name</label>
                    <Input
                      value={formData.formName}
                      onChange={(e) => setFormData(p => ({ ...p, formName: e.target.value }))}
                      placeholder="e.g. Transfer of Assets Form"
                      data-testid="input-form-name"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Brief description..."
                    rows={2}
                    data-testid="input-custodial-description"
                  />
                </div>
                <ListEditor label="Required Fields" field="requiredFields" input={fieldInput} setInput={setFieldInput} testIdPrefix="required-field" />
                <ListEditor label="Required Signatures" field="requiredSignatures" input={sigInput} setInput={setSigInput} testIdPrefix="required-sig" />
                <ListEditor label="Supporting Documents" field="supportingDocuments" input={docInput} setInput={setDocInput} testIdPrefix="supporting-doc" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Instructions</label>
                  <Textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData(p => ({ ...p, instructions: e.target.value }))}
                    placeholder="Step-by-step instructions..."
                    rows={4}
                    data-testid="input-custodial-instructions"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Processing Time</label>
                    <Input
                      value={formData.processingTime}
                      onChange={(e) => setFormData(p => ({ ...p, processingTime: e.target.value }))}
                      placeholder="e.g. 3-5 business days"
                      data-testid="input-processing-time"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Additional notes..."
                      data-testid="input-custodial-notes"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditInstr(null); resetForm(); }} data-testid="button-cancel-custodial">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!formData.custodian || !formData.actionType || !formData.formName || createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-custodial"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editInstr ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading instructions...</div>
      ) : instructions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No custodial instructions yet. Add your first instruction to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {instructions.map((instr) => (
            <Card key={instr.id} data-testid={`card-custodial-instruction-${instr.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default" className="text-[10px]">{instr.custodian}</Badge>
                      <Badge variant="outline" className="text-[10px]">{instr.actionType}</Badge>
                      <span className="text-sm font-semibold" data-testid={`text-form-name-${instr.id}`}>{instr.formName}</span>
                    </div>
                    {instr.description && <p className="text-xs text-muted-foreground mt-0.5">{instr.description}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                      {(instr.requiredFields as string[]).length > 0 && (
                        <span>{(instr.requiredFields as string[]).length} required fields</span>
                      )}
                      {(instr.requiredSignatures as string[]).length > 0 && (
                        <span>{(instr.requiredSignatures as string[]).length} signatures</span>
                      )}
                      {(instr.supportingDocuments as string[]).length > 0 && (
                        <span>{(instr.supportingDocuments as string[]).length} supporting docs</span>
                      )}
                      {instr.processingTime && <span>{instr.processingTime}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(instr)} data-testid={`button-edit-custodial-${instr.id}`}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { if (confirm("Delete this instruction?")) deleteMutation.mutate(instr.id); }}
                      data-testid={`button-delete-custodial-${instr.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FormRequirementsChecker() {
  const [custodian, setCustodian] = useState("");
  const [actionType, setActionType] = useState("");

  const { data: metadata } = useQuery<{ custodians: string[]; actionTypes: string[] }>({
    queryKey: ["/api/custodial-instructions/custodians/list"],
  });

  const checkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/custodial-instructions/form-requirements", { custodian, actionType });
      return res.json();
    },
  });

  const result = checkMutation.data as { found: boolean; message?: string; requirements?: any } | undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold" data-testid="text-form-requirements-heading">Form Requirements Checker</span>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Custodian</label>
              {metadata && metadata.custodians.length > 0 ? (
                <Select value={custodian} onValueChange={setCustodian}>
                  <SelectTrigger data-testid="select-check-custodian">
                    <SelectValue placeholder="Select custodian" />
                  </SelectTrigger>
                  <SelectContent>
                    {metadata.custodians.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={custodian} onChange={(e) => setCustodian(e.target.value)} placeholder="Enter custodian name" data-testid="input-check-custodian" />
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Action Type</label>
              {metadata && metadata.actionTypes.length > 0 ? (
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger data-testid="select-check-action-type">
                    <SelectValue placeholder="Select action type" />
                  </SelectTrigger>
                  <SelectContent>
                    {metadata.actionTypes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={actionType} onChange={(e) => setActionType(e.target.value)} placeholder="Enter action type" data-testid="input-check-action-type" />
              )}
            </div>
          </div>
          <Button
            onClick={() => checkMutation.mutate()}
            disabled={!custodian || !actionType || checkMutation.isPending}
            className="w-full"
            data-testid="button-check-requirements"
          >
            {checkMutation.isPending ? "Checking..." : "Check Requirements"}
          </Button>

          {result && (
            <div className="mt-4 pt-4 border-t" data-testid="div-form-requirements-result">
              {!result.found ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  {result.message}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold">{result.requirements.formName}</span>
                  </div>
                  {result.requirements.description && (
                    <p className="text-xs text-muted-foreground">{result.requirements.description}</p>
                  )}
                  {result.requirements.requiredFields?.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold block mb-1">Required Fields:</span>
                      <div className="flex flex-wrap gap-1">
                        {result.requirements.requiredFields.map((f: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.requirements.requiredSignatures?.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold block mb-1">Required Signatures:</span>
                      <div className="flex flex-wrap gap-1">
                        {result.requirements.requiredSignatures.map((s: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.requirements.supportingDocuments?.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold block mb-1">Supporting Documents:</span>
                      <div className="flex flex-wrap gap-1">
                        {result.requirements.supportingDocuments.map((d: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{d}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.requirements.instructions && (
                    <div>
                      <span className="text-xs font-semibold block mb-1">Instructions:</span>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{result.requirements.instructions}</p>
                    </div>
                  )}
                  {result.requirements.processingTime && (
                    <div className="text-xs"><span className="font-semibold">Processing Time:</span> {result.requirements.processingTime}</div>
                  )}
                  {result.requirements.notes && (
                    <div className="text-xs"><span className="font-semibold">Notes:</span> {result.requirements.notes}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SopQuerySection() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<SopQueryResult | null>(null);

  const queryMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/sop/query", { question: q });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  const handleSubmit = () => {
    if (!question.trim()) return;
    queryMutation.mutate(question);
  };

  const confidenceColor = (c: string) => {
    if (c === "high") return "text-green-600";
    if (c === "medium") return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold" data-testid="text-sop-query-heading">SOP Knowledge Base Query</span>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about SOPs or custodial procedures..."
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              data-testid="input-sop-query"
            />
            <Button onClick={handleSubmit} disabled={!question.trim() || queryMutation.isPending} data-testid="button-sop-query-submit">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>

          {queryMutation.isPending && (
            <div className="text-sm text-muted-foreground animate-pulse">Searching knowledge base...</div>
          )}

          {result && (
            <div className="space-y-3 pt-3 border-t" data-testid="div-sop-query-result">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold">Confidence:</span>
                <Badge variant="outline" className={`text-[10px] ${confidenceColor(result.confidence)}`}>
                  {result.confidence}
                </Badge>
              </div>
              <div className="prose prose-sm max-w-none text-sm whitespace-pre-line" data-testid="text-sop-query-answer">
                {result.answer}
              </div>
              {result.sources.length > 0 && (
                <div className="pt-3 border-t">
                  <span className="text-xs font-semibold block mb-2">Sources:</span>
                  <div className="space-y-1">
                    {result.sources.map((src, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                        <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-medium">{src.documentTitle}</span>
                          <Badge variant="outline" className="text-[9px] ml-1">{src.category}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SopKnowledgeTab() {
  return (
    <Tabs defaultValue="query" className="space-y-4">
      <TabsList data-testid="tabs-sop-knowledge">
        <TabsTrigger value="query" data-testid="tab-sop-query">
          <Search className="h-3.5 w-3.5 mr-1" /> Query
        </TabsTrigger>
        <TabsTrigger value="documents" data-testid="tab-sop-documents">
          <BookOpen className="h-3.5 w-3.5 mr-1" /> SOP Documents
        </TabsTrigger>
        <TabsTrigger value="custodial" data-testid="tab-custodial-instructions">
          <ClipboardList className="h-3.5 w-3.5 mr-1" /> Custodial Instructions
        </TabsTrigger>
        <TabsTrigger value="form-check" data-testid="tab-form-requirements">
          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Form Requirements
        </TabsTrigger>
      </TabsList>

      <TabsContent value="query">
        <SopQuerySection />
      </TabsContent>
      <TabsContent value="documents">
        <SopDocumentsSection />
      </TabsContent>
      <TabsContent value="custodial">
        <CustodialInstructionsSection />
      </TabsContent>
      <TabsContent value="form-check">
        <FormRequirementsChecker />
      </TabsContent>
    </Tabs>
  );
}
