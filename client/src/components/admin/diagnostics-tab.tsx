import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SafeHtml } from "@/components/safe-html";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Sparkles, Pencil, Save, Trash2, Eye, Notebook, ClipboardList, FileSearch, Stethoscope } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

interface DiagnosticConfig {
  id: string;
  name: string;
  analysisPrompt: string;
  htmlTemplate: string;
  isActive: boolean;
  updatedAt?: string;
}

interface PromptConfig {
  id: string;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  isActive: boolean;
  updatedAt?: string;
}

function DiagnosticsTab() {
  const { data: configs, isLoading } = useQuery<DiagnosticConfig[]>({ queryKey: ["/api/admin/diagnostic-configs"] });
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formTemplate, setFormTemplate] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/admin/diagnostic-configs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/diagnostic-configs"] });
      toast({ title: "Assessment configuration created" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiRequest("PATCH", `/api/admin/diagnostic-configs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/diagnostic-configs"] });
      toast({ title: "Configuration updated" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/diagnostic-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/diagnostic-configs"] });
      toast({ title: "Configuration deleted" });
    },
  });

  function resetForm() {
    setEditingId(null);
    setFormName("");
    setFormPrompt("");
    setFormTemplate("");
    setFormActive(true);
  }

  function startEdit(config: DiagnosticConfig) {
    setEditingId(config.id);
    setFormName(config.name);
    setFormPrompt(config.analysisPrompt);
    setFormTemplate(config.htmlTemplate);
    setFormActive(config.isActive);
  }

  function handleSave() {
    const data: Record<string, unknown> = { name: formName, analysisPrompt: formPrompt, htmlTemplate: formTemplate, isActive: formActive };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  }

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              {editingId ? "Edit Configuration" : "New Configuration"}
            </CardTitle>
            {editingId && (
              <Button variant="outline" size="sm" onClick={resetForm} data-testid="button-cancel-edit">
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Configuration Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Comprehensive Financial Assessment"
                data-testid="input-config-name"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded"
                  data-testid="checkbox-config-active"
                />
                <span className="text-sm">Set as Active</span>
              </label>
            </div>
          </div>

          <div>
            <Label>Analysis Prompt (System Prompt for AI)</Label>
            <p className="text-xs text-muted-foreground mb-1">
              This prompt instructs the AI on how to analyze client data and what JSON structure to return.
              The client's full financial data (accounts, holdings, performance, tasks, etc.) is automatically appended.
            </p>
            <Textarea
              value={formPrompt}
              onChange={(e) => setFormPrompt(e.target.value)}
              rows={12}
              className="font-mono text-xs"
              placeholder="Enter the system prompt that will be sent to the AI model..."
              data-testid="textarea-analysis-prompt"
            />
          </div>

          <div>
            <Label>HTML Report Template</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Use {"{{field.path}}"} for values, {"{{#each array}}...{{/each}}"} for arrays, {"{{#list array}}{{this}}{{/list}}"} for string arrays.
            </p>
            <Textarea
              value={formTemplate}
              onChange={(e) => setFormTemplate(e.target.value)}
              rows={12}
              className="font-mono text-xs"
              placeholder="Enter the HTML template with merge fields..."
              data-testid="textarea-html-template"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!formName || !formPrompt || !formTemplate || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-config"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {editingId ? "Update Configuration" : "Create Configuration"}
            </Button>
            {formTemplate && (
              <Button
                variant="outline"
                onClick={() => {
                  setPreviewHtml(formTemplate);
                  setShowPreview(true);
                }}
                data-testid="button-preview-template"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Preview Template
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {configs && configs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id} data-testid={`row-config-${config.id}`}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <Badge variant={config.isActive ? "default" : "secondary"} className="no-default-active-elevate">
                        {config.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {config.updatedAt ? new Date(config.updatedAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(config)} data-testid={`button-edit-config-${config.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Delete this configuration?")) deleteMutation.mutate(config.id);
                          }}
                          data-testid={`button-delete-config-${config.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[900px] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>Raw template with merge field placeholders shown</DialogDescription>
          </DialogHeader>
          <SafeHtml html={previewHtml} />
        </DialogContent>
      </Dialog>

    </div>
  );
}


function PromptConfigEditor({ type, apiBase, queryKey, icon: Icon, title, description, mergeFieldsHint, namePlaceholder, systemPlaceholder, userPlaceholder, testIdPrefix }: {
  type: string;
  apiBase: string;
  queryKey: string;
  icon: LucideIcon;
  title: string;
  description: string;
  mergeFieldsHint: string;
  namePlaceholder: string;
  systemPlaceholder: string;
  userPlaceholder: string;
  testIdPrefix: string;
}) {
  const { data: configs, isLoading } = useQuery<PromptConfig[]>({ queryKey: [queryKey] });
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userTemplate, setUserTemplate] = useState("");
  const [active, setActive] = useState(true);

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", apiBase, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: `${title} configuration created` });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiRequest("PATCH", `${apiBase}/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: "Configuration updated" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `${apiBase}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: "Configuration deleted" });
    },
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setSystemPrompt("");
    setUserTemplate("");
    setActive(true);
  }

  function startEdit(config: PromptConfig) {
    setEditingId(config.id);
    setName(config.name);
    setSystemPrompt(config.systemPrompt);
    setUserTemplate(config.userPromptTemplate);
    setActive(config.isActive);
  }

  function handleSave() {
    const data = { name, systemPrompt, userPromptTemplate: userTemplate, isActive: active };
    if (editingId) {
      updateMut.mutate({ id: editingId, data });
    } else {
      createMut.mutate(data);
    }
  }

  if (isLoading) return <Skeleton className="h-32" />;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          {description} Available merge fields: <code className="text-xs bg-muted px-1 py-0.5 rounded">{mergeFieldsHint}</code>
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {editingId ? `Edit ${title} Config` : `New ${title} Config`}
            </CardTitle>
            {editingId && (
              <Button variant="outline" size="sm" onClick={resetForm} data-testid={`button-cancel-${testIdPrefix}-edit`}>
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Configuration Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={namePlaceholder}
                data-testid={`input-${testIdPrefix}-name`}
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded"
                  data-testid={`input-${testIdPrefix}-active`}
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>
          <div>
            <Label>System Prompt</Label>
            <p className="text-xs text-muted-foreground mb-1">
              Sets the AI's role and tone for this prompt type.
            </p>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="font-mono text-xs"
              placeholder={systemPlaceholder}
              data-testid={`textarea-${testIdPrefix}-system-prompt`}
            />
          </div>
          <div>
            <Label>User Prompt Template</Label>
            <p className="text-xs text-muted-foreground mb-1">
              The user message template. Data is injected via merge fields.
            </p>
            <Textarea
              value={userTemplate}
              onChange={(e) => setUserTemplate(e.target.value)}
              rows={12}
              className="font-mono text-xs"
              placeholder={userPlaceholder}
              data-testid={`textarea-${testIdPrefix}-user-template`}
            />
          </div>
          <Button onClick={handleSave} disabled={!name || !systemPrompt || !userTemplate || createMut.isPending || updateMut.isPending} data-testid={`button-save-${testIdPrefix}`}>
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {editingId ? "Update" : "Create"} Configuration
          </Button>
        </CardContent>
      </Card>

      {configs && configs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Saved Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id} data-testid={`row-${testIdPrefix}-${config.id}`}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell>
                      <Badge variant={config.isActive ? "default" : "secondary"} className="no-default-active-elevate">
                        {config.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {config.updatedAt ? new Date(config.updatedAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(config)} data-testid={`button-edit-${testIdPrefix}-${config.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete this ${title.toLowerCase()} configuration?`)) deleteMut.mutate(config.id);
                          }}
                          data-testid={`button-delete-${testIdPrefix}-${config.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PromptsAndTemplatesTab() {
  const [activeSection, setActiveSection] = useState<"prep" | "summary" | "docclass">("prep");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          Prompts & Templates
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure the AI prompts used for meeting prep briefs, meeting summaries, and document classification.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          className={`text-sm py-1.5 px-4 rounded-md transition-colors flex items-center gap-1.5 ${activeSection === "prep" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
          onClick={() => setActiveSection("prep")}
          data-testid="toggle-prompts-prep"
        >
          <Notebook className="w-3.5 h-3.5" />
          Meeting Prep
        </button>
        <button
          className={`text-sm py-1.5 px-4 rounded-md transition-colors flex items-center gap-1.5 ${activeSection === "summary" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
          onClick={() => setActiveSection("summary")}
          data-testid="toggle-prompts-summary"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Meeting Summary
        </button>
        <button
          className={`text-sm py-1.5 px-4 rounded-md transition-colors flex items-center gap-1.5 ${activeSection === "docclass" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
          onClick={() => setActiveSection("docclass")}
          data-testid="toggle-prompts-docclass"
        >
          <FileSearch className="w-3.5 h-3.5" />
          Doc Classification
        </button>
      </div>

      {activeSection === "prep" && (
        <PromptConfigEditor
          type="prep"
          apiBase="/api/admin/meeting-prep-configs"
          queryKey="/api/admin/meeting-prep-configs"
          icon={Notebook}
          title="Meeting Prep"
          description="Configure the AI prompt used to generate meeting preparation briefs."
          mergeFieldsHint="{{clientName}}, {{clientInfo}}, {{holdings}}, {{performance}}, {{recentMeetings}}, {{tasks}}, {{lifeEvents}}, {{complianceItems}}"
          namePlaceholder="e.g., Standard Meeting Prep"
          systemPlaceholder="You are an expert wealth advisor assistant..."
          userPlaceholder={"Generate a meeting prep brief for {{clientName}}...\n\nClient Information:\n{{clientInfo}}\n\nHoldings:\n{{holdings}}"}
          testIdPrefix="mp"
        />
      )}
      {activeSection === "summary" && (
        <PromptConfigEditor
          type="summary"
          apiBase="/api/admin/meeting-summary-configs"
          queryKey="/api/admin/meeting-summary-configs"
          icon={ClipboardList}
          title="Meeting Summary"
          description="Configure the AI prompt used to summarize completed meetings."
          mergeFieldsHint="{{clientName}}, {{clientInfo}}, {{meetingTitle}}, {{meetingType}}, {{meetingDate}}, {{meetingNotes}}, {{holdings}}, {{performance}}, {{tasks}}, {{lifeEvents}}"
          namePlaceholder="e.g., Standard Meeting Summary"
          systemPlaceholder="You are an expert wealth advisor assistant. Generate a comprehensive summary of a completed client meeting..."
          userPlaceholder={"Summarize the following completed meeting with {{clientName}}...\n\nMeeting Title: {{meetingTitle}}\nMeeting Notes: {{meetingNotes}}\n\nClient Information:\n{{clientInfo}}"}
          testIdPrefix="ms"
        />
      )}
      {activeSection === "docclass" && (
        <PromptConfigEditor
          type="docclass"
          apiBase="/api/admin/doc-classification-configs"
          queryKey="/api/admin/doc-classification-configs"
          icon={FileSearch}
          title="Document Classification"
          description="Configure how AI classifies uploaded documents to auto-check items in the document checklist."
          mergeFieldsHint="{{fileName}}, {{documentType}}, {{fileContent}}, {{clientName}}, {{checklistItems}}"
          namePlaceholder="e.g., Standard Document Classifier"
          systemPlaceholder="You are a document classification assistant for a wealth management firm..."
          userPlaceholder={"Classify the following document:\nFilename: {{fileName}}\nType: {{documentType}}\n\nContent:\n{{fileContent}}\n\nClient: {{clientName}}\n\nChecklist items:\n{{checklistItems}}"}
          testIdPrefix="dc"
        />
      )}
    </div>
  );
}

export { DiagnosticsTab, PromptsAndTemplatesTab };
