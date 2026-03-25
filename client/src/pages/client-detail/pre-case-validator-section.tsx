import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Play } from "lucide-react";

interface PreCaseValidatorSectionProps {
  clientId: string;
}

function ResultIcon({ result }: { result: string }) {
  switch (result) {
    case "pass": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case "flag": return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    case "fail": return <XCircle className="w-4 h-4 text-red-600" />;
    default: return <Loader2 className="w-4 h-4 animate-spin" />;
  }
}

function OverallIcon({ result }: { result: string }) {
  switch (result) {
    case "pass": return <ShieldCheck className="w-6 h-6 text-green-600" />;
    case "flag": return <ShieldAlert className="w-6 h-6 text-yellow-600" />;
    case "fail": return <ShieldX className="w-6 h-6 text-red-600" />;
    default: return <ShieldAlert className="w-6 h-6 text-muted-foreground" />;
  }
}

function resultLabel(result: string) {
  switch (result) {
    case "pass": return "Pass";
    case "flag": return "Flagged";
    case "fail": return "Failed";
    default: return "Pending";
  }
}

function resultBadgeClass(result: string) {
  switch (result) {
    case "pass": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "flag": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "fail": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default: return "bg-gray-100 text-gray-800";
  }
}

function ModuleCard({ module, defaultOpen }: { module: any; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen || false);

  return (
    <div className="border rounded-lg" data-testid={`card-module-${module.key}`}>
      <button
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-expand-${module.key}`}
      >
        <div className="flex items-center gap-2">
          <ResultIcon result={module.result} />
          <span className="font-medium text-sm">{module.name}</span>
          <Badge className={`${resultBadgeClass(module.result)} text-[10px]`}>
            {resultLabel(module.result)}
          </Badge>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t p-3 space-y-2">
          {(module.checks || []).map((check: any, i: number) => (
            <div key={i} className="flex items-start gap-2 text-sm" data-testid={`check-${module.key}-${i}`}>
              <div className="mt-0.5">
                <ResultIcon result={check.result} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium">{check.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
              </div>
            </div>
          ))}

          {module.remediation && module.remediation.length > 0 && (
            <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 rounded p-2.5 space-y-1">
              <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-200">Remediation Steps:</span>
              <ul className="list-disc list-inside text-xs text-yellow-700 dark:text-yellow-300 space-y-0.5">
                {module.remediation.map((r: string, i: number) => (
                  <li key={i} data-testid={`remediation-${module.key}-${i}`}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PreCaseValidatorSection({ clientId }: PreCaseValidatorSectionProps) {
  const { toast } = useToast();

  const { data: validations = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "validations"],
    queryFn: () => fetch(`/api/clients/${clientId}/validations`, { credentials: "include" }).then(r => r.json()),
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/validate`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "validations"] });
      toast({
        title: `Validation ${data.overallResult === "pass" ? "Passed" : data.overallResult === "flag" ? "Flagged" : "Failed"}`,
        description: `${data.modules.filter((m: any) => m.result === "pass").length}/${data.modules.length} modules passed`,
      });
    },
    onError: () => {
      toast({ title: "Validation failed", description: "Could not run pre-case checks", variant: "destructive" });
    },
  });

  const latestValidation = validations[0];
  const latestModules = latestValidation?.modules || [];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="pre-case-validator-section">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-validator-title">Pre-Case Submission Validator</h3>
          <p className="text-sm text-muted-foreground">Run validation checks before submitting a case to ensure data integrity and compliance</p>
        </div>
        <Button
          onClick={() => validateMutation.mutate()}
          disabled={validateMutation.isPending}
          size="sm"
          data-testid="button-run-validation"
        >
          {validateMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
          Run Validation
        </Button>
      </div>

      {latestValidation && (
        <div className="border rounded-lg p-4 space-y-4" data-testid="card-latest-validation">
          <div className="flex items-center gap-3">
            <OverallIcon result={latestValidation.overallResult} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Latest Validation</span>
                <Badge className={`${resultBadgeClass(latestValidation.overallResult)} text-xs`} data-testid="badge-overall-result">
                  {resultLabel(latestValidation.overallResult)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(latestValidation.createdAt).toLocaleString()} — {latestModules.length} modules checked
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {latestModules.map((m: any) => (
              <div key={m.key} className="bg-muted/30 rounded p-2 text-center" data-testid={`summary-${m.key}`}>
                <ResultIcon result={m.result} />
                <div className="text-xs font-medium mt-1">{m.name.split(" ").slice(0, 2).join(" ")}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {latestModules.map((m: any) => (
              <ModuleCard key={m.key} module={m} defaultOpen={m.result !== "pass"} />
            ))}
          </div>
        </div>
      )}

      {validations.length > 1 && (
        <div className="space-y-2" data-testid="validation-history">
          <h4 className="text-sm font-medium text-muted-foreground">Previous Validations</h4>
          {validations.slice(1).map((v: any) => (
            <div key={v.id} className="flex items-center justify-between border rounded p-2" data-testid={`history-${v.id}`}>
              <div className="flex items-center gap-2">
                <ResultIcon result={v.overallResult} />
                <span className="text-sm">{new Date(v.createdAt).toLocaleString()}</span>
              </div>
              <Badge className={`${resultBadgeClass(v.overallResult)} text-[10px]`}>
                {resultLabel(v.overallResult)}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {validations.length === 0 && (
        <div className="text-center py-12 border rounded-lg" data-testid="text-no-validations">
          <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">No validations run yet</p>
          <p className="text-xs text-muted-foreground mt-1">Run the validator to check new account, billing, data integrity, and M&A conflicts</p>
        </div>
      )}
    </div>
  );
}
