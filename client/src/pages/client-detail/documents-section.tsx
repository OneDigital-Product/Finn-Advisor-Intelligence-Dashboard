import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Upload,
  Loader2,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
} from "lucide-react";
import { P } from "@/styles/tokens";
import { V2_CARD, V2_TITLE } from "@/styles/v2-tokens";

function DocumentUploadSection({ clientId, clientName }: { clientId: string; clientName: string }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState("general");
  const [parseResult, setParseResult] = useState<any>(null);
  const [rawDocText, setRawDocText] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const parseMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      setRawDocText(text);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      formData.append("applyUpdates", "false");
      return fetch(`/api/clients/${clientId}/parse-document`, {
        method: "POST",
        body: formData,
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
      });
    },
    onSuccess: (data) => {
      setParseResult(data);
      setShowPreview(true);
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      toast({ title: "Document parsed and saved" });
    },
    onError: (err: any) => {
      toast({ title: "Parse failed", description: err.message, variant: "destructive" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      return fetch(`/api/clients/${clientId}/parse-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawDocText,
          documentType,
          applyUpdates: true,
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      setShowPreview(false);
      toast({ title: "Profile updated from document" });
    },
    onError: (err: any) => {
      toast({ title: "Apply failed", description: err.message, variant: "destructive" });
    },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseMutation.mutate(file);
      e.target.value = "";
    }
  };

  return (
    <Card style={V2_CARD}>
      <CardHeader className="pb-3">
        <CardTitle className="" style={V2_TITLE}>Upload Document for AI Parsing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload a client document to automatically extract profile data, account details, and holdings using AI.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="w-[200px]" data-testid="select-document-type">
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General Document</SelectItem>
              <SelectItem value="account_statement">Account Statement</SelectItem>
              <SelectItem value="financial_plan">Financial Plan</SelectItem>
              <SelectItem value="tax_return">Tax Return</SelectItem>
              <SelectItem value="new_account_form">New Account Form</SelectItem>
              <SelectItem value="transfer_form">Transfer Form</SelectItem>
              <SelectItem value="client_profile">Client Profile/KYC</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFile}
            accept=".txt,.csv,.tsv,.json,.xml"
            className="hidden"
            data-testid="input-document-file"
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={parseMutation.isPending}
            data-testid="button-upload-document"
          >
            {parseMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Parsing...</>
            ) : (
              <><Upload className="w-3.5 h-3.5 mr-1.5" />Upload and Parse</>
            )}
          </Button>
        </div>

        {showPreview && parseResult && (
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Document Parsing Results</DialogTitle>
                <DialogDescription>
                  Review the extracted data for {clientName} before applying changes.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {Object.keys(parseResult.profileUpdates || {}).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Profile Updates</h4>
                      <div className="space-y-1">
                        {Object.entries(parseResult.profileUpdates).filter(([, v]) => v).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/40">
                            <span className="text-muted-foreground w-32 shrink-0 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="font-medium" data-testid={`parsed-${key}`}>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(parseResult.accounts || []).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Accounts Found ({parseResult.accounts.length})</h4>
                      <div className="space-y-1">
                        {parseResult.accounts.map((acct: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-muted/40 text-sm" data-testid={`parsed-account-${i}`}>
                            <span className="font-medium">{acct.accountType || "Account"}</span>
                            {acct.accountNumber && <span className="text-muted-foreground ml-2">#{acct.accountNumber}</span>}
                            {acct.balance && <span className="ml-2">${Number(acct.balance).toLocaleString()}</span>}
                            {acct.custodian && <span className="text-muted-foreground ml-2">at {acct.custodian}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(parseResult.holdings || []).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Holdings Found ({parseResult.holdings.length})</h4>
                      <div className="space-y-1">
                        {parseResult.holdings.map((h: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/40 text-sm" data-testid={`parsed-holding-${i}`}>
                            <span className="font-medium">{h.ticker}</span>
                            <span className="text-muted-foreground">{h.name}</span>
                            <span className="ml-auto">{Number(h.shares).toLocaleString()} shares</span>
                            {h.marketValue && <span className="text-muted-foreground">${Number(h.marketValue).toLocaleString()}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {parseResult.summary && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">AI Summary</h4>
                      <div className="prose prose-sm dark:prose-invert max-w-none p-3 rounded bg-muted/40 whitespace-pre-wrap text-sm" data-testid="text-parse-summary">
                        {parseResult.summary}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setShowPreview(false)} data-testid="button-cancel-apply">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => applyMutation.mutate()}
                  disabled={applyMutation.isPending}
                  data-testid="button-apply-updates"
                >
                  {applyMutation.isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Applying...</>
                  ) : (
                    <><Check className="w-3.5 h-3.5 mr-1.5" />Apply to Profile</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentChecklistSection({ clientId, checklistData }: { clientId: string; checklistData: any[] }) {
  const { toast } = useToast();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const initMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/clients/${clientId}/init-checklist`, { method: "POST" }).then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).message);
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      toast({ title: "Document checklist initialized" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, received }: { id: string; received: boolean }) =>
      apiRequest("PATCH", `/api/document-checklist/${id}`, {
        received,
        receivedDate: received ? new Date().toISOString().split("T")[0] : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
    },
  });

  if (!checklistData || checklistData.length === 0) {
    return (
      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>Document Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileText className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">No document checklist set up yet for this client.</p>
            <Button
              size="sm"
              onClick={() => initMutation.mutate()}
              disabled={initMutation.isPending}
              data-testid="button-init-checklist"
            >
              {initMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Initializing...</>
              ) : (
                <><FileText className="w-3.5 h-3.5 mr-1.5" />Initialize Checklist</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const categories = checklistData.reduce((acc: Record<string, any[]>, item: any) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const totalRequired = checklistData.filter((i: any) => i.required).length;
  const receivedRequired = checklistData.filter((i: any) => i.required && i.received).length;
  const totalReceived = checklistData.filter((i: any) => i.received).length;
  const progressPct = totalRequired > 0 ? Math.round((receivedRequired / totalRequired) * 100) : 0;

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <Card style={V2_CARD}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>Document Checklist</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground" data-testid="text-checklist-progress">
              {receivedRequired}/{totalRequired} required
            </span>
            <Badge
              variant={progressPct === 100 ? "default" : progressPct >= 75 ? "secondary" : "outline"}
              className="text-[10px]"
              data-testid="badge-checklist-pct"
            >
              {progressPct}%
            </Badge>
          </div>
        </div>
        <Progress value={progressPct} className="mt-2 h-2" data-testid="progress-checklist" />
        <p className="text-xs text-muted-foreground mt-1">
          {totalReceived} of {checklistData.length} total documents received ({checklistData.length - totalReceived} outstanding)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(categories).map(([category, items]) => {
            const catReceived = (items as any[]).filter((i) => i.received).length;
            const catTotal = (items as any[]).length;
            const isExpanded = expandedCategories[category] !== false;

            return (
              <div key={category} className="border rounded-md" data-testid={`checklist-category-${category.replace(/\s+/g, "-").toLowerCase()}`}>
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/40 transition-colors rounded-md text-left"
                  onClick={() => toggleCategory(category)}
                  data-testid={`button-toggle-${category.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    <span className="text-sm font-medium">{category}</span>
                  </div>
                  <Badge
                    variant={catReceived === catTotal ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {catReceived}/{catTotal}
                  </Badge>
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1">
                    {(items as any[]).map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-2 rounded text-sm ${item.received ? "bg-muted/20" : "bg-muted/40"}`}
                        data-testid={`checklist-item-${item.id}`}
                      >
                        <button
                          className="mt-0.5 shrink-0"
                          onClick={() => toggleMutation.mutate({ id: item.id, received: !item.received })}
                          data-testid={`button-toggle-item-${item.id}`}
                        >
                          {item.received ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${item.received ? "text-muted-foreground" : "font-medium"}`}>
                            {item.documentName}
                            {item.required && !item.received && (
                              <span className="text-destructive ml-1 text-[10px] font-normal">required</span>
                            )}
                          </div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                          )}
                          {item.notes && (
                            <div className="text-xs text-muted-foreground mt-0.5 italic">{item.notes}</div>
                          )}
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {item.documentId && (
                            <a
                              href={`/api/documents/${item.documentId}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium"
                              data-testid={`link-download-checklist-${item.id}`}
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </a>
                          )}
                          {item.receivedDate && (
                            <span className="text-[10px] text-muted-foreground">{new Date(item.receivedDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface DocumentsSectionProps {
  clientId: string;
  clientName: string;
  documents: any[];
  checklistData: any[];
}

export function DocumentsSection({ clientId, clientName, documents, checklistData }: DocumentsSectionProps) {
  return (
    <div className="space-y-6">
      <DocumentChecklistSection clientId={clientId} checklistData={checklistData || []} />
      <DocumentUploadSection clientId={clientId} clientName={clientName} />
      <Card style={V2_CARD}>
        <CardHeader className="pb-3">
          <CardTitle className=" flex items-center gap-2" style={V2_TITLE}>Documents on File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/40" data-testid={`doc-${doc.id}`}>
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <div className="text-sm font-medium">{doc.name}</div>
                    <div className="text-xs text-muted-foreground">{doc.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.uploadDate && <span className="text-xs text-muted-foreground">{new Date(doc.uploadDate).toLocaleDateString()}</span>}
                  <Badge
                    variant={doc.status === "signed" ? "default" : doc.status === "pending_signature" ? "secondary" : "outline"}
                    className="text-[10px]"
                  >
                    {doc.status.replace(/_/g, " ")}
                  </Badge>
                  {doc.hasFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`button-download-doc-${doc.id}`}
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = `/api/documents/${doc.id}/download`;
                        link.download = doc.fileName || `${doc.name}.txt`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No documents on file</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
