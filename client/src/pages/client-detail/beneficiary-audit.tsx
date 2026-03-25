import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  Shield,
  UserX,
  FileWarning,
  RefreshCw,
} from "lucide-react";

interface BeneficiaryAuditProps {
  clientId: string;
  clientName: string;
  advisorId: string;
}

export function BeneficiaryAuditSection({ clientId, clientName, advisorId }: BeneficiaryAuditProps) {
  const { toast } = useToast();
  const [isAuditing, setIsAuditing] = useState(false);

  const { data: auditData, isLoading: auditLoading } = useQuery<any>({
    queryKey: ["/api/clients", clientId, "beneficiary-audit"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/beneficiary-audit`);
      if (!res.ok) throw new Error("Failed to fetch beneficiary audit data");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 15 * 60 * 1000,
  });

  const { data: signals } = useQuery<any>({
    queryKey: ["/api/cassidy/signals/client", clientId, { days: 90 }],
    queryFn: async () => {
      const res = await fetch(`/api/cassidy/signals/client/${clientId}?days=90`);
      if (!res.ok) throw new Error("Failed to fetch signals");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 15 * 60 * 1000,
  });

  const runAuditMutation = useMutation({
    mutationFn: async () => {
      let beneficiarySignals = (signals?.signals || []).filter(
        (s: any) => s.signalType === "beneficiary_change" && s.status === "pending"
      );

      if (beneficiarySignals.length === 0) {
        await apiRequest("POST", `/api/cassidy/signals/client/${clientId}/scan`);
        const refreshRes = await fetch(`/api/cassidy/signals/client/${clientId}?days=90`);
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          beneficiarySignals = (refreshData?.signals || []).filter(
            (s: any) => s.signalType === "beneficiary_change" && s.status === "pending"
          );
        }
      }

      if (beneficiarySignals.length === 0) {
        return { message: "Signal scan complete. No beneficiary issues detected at this time." };
      }

      const signal = beneficiarySignals[0];
      const actionRes = await apiRequest("POST", `/api/cassidy/signals/${signal.id}/action`, {
        action_type: "run_beneficiary_audit",
      });
      return actionRes.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cassidy/signals/client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "beneficiary-audit"] });
      toast({ title: "Beneficiary audit initiated", description: data.message || "A task has been created for review." });
      setIsAuditing(false);
    },
    onError: () => {
      toast({ title: "Audit failed", description: "Could not run beneficiary audit. Please try again.", variant: "destructive" });
      setIsAuditing(false);
    },
  });

  if (auditLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const accountResults = auditData?.accounts || [];
  const allBeneficiaries = auditData?.allBeneficiaries || [];
  const trustData = auditData?.trusts || [];
  const docStatus = auditData?.documentStatus || {};
  const summary = auditData?.summary || {};

  const existingBeneficiarySignals = (signals?.signals || []).filter(
    (s: any) => s.signalType === "beneficiary_change"
  );

  return (
    <div className="space-y-6" data-testid="beneficiary-audit-section">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold" data-testid="text-beneficiary-audit-title">Beneficiary Audit</h3>
          <p className="text-sm text-muted-foreground">
            Review beneficiary designations across all eligible accounts
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setIsAuditing(true);
            runAuditMutation.mutate();
          }}
          disabled={runAuditMutation.isPending}
          data-testid="button-run-beneficiary-audit"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${runAuditMutation.isPending ? "animate-spin" : ""}`} />
          {runAuditMutation.isPending ? "Running..." : "Run Audit with Finn"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Eligible Accounts</span>
            </div>
            <div className="text-xl font-bold" data-testid="text-eligible-accounts-count">
              {summary.totalEligible || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Critical Issues</span>
            </div>
            <div className="text-xl font-bold text-red-600" data-testid="text-critical-count">
              {summary.criticalIssues || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <FileWarning className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Warnings</span>
            </div>
            <div className="text-xl font-bold text-amber-600" data-testid="text-warning-count">
              {summary.warnings || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Clean</span>
            </div>
            <div className="text-xl font-bold text-green-600" data-testid="text-clean-count">
              {summary.clean || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {docStatus.latestReviewDate && (
        <Card className={`border-l-4 ${docStatus.isStaleReview ? "border-l-amber-400" : "border-l-green-400"}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              {docStatus.isStaleReview ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              <span className="text-sm">
                Beneficiary designations last reviewed: <strong>{docStatus.latestReviewDate}</strong>
                {docStatus.isStaleReview && " — over 3 years ago, review recommended"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {existingBeneficiarySignals.length > 0 && (
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold">Active Beneficiary Signals</span>
            </div>
            <div className="space-y-2">
              {existingBeneficiarySignals.map((signal: any) => (
                <div
                  key={signal.id}
                  className="flex items-center justify-between p-2 rounded bg-muted/30"
                  data-testid={`signal-beneficiary-${signal.id}`}
                >
                  <div className="flex-1">
                    <div className="text-sm" data-testid={`text-signal-desc-${signal.id}`}>{signal.description}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {signal.confidence} confidence · {signal.materiality}
                    </div>
                  </div>
                  <Badge
                    variant={signal.status === "actioned" ? "default" : signal.status === "pending" ? "secondary" : "outline"}
                    className="text-[10px]"
                    data-testid={`badge-signal-status-${signal.id}`}
                  >
                    {signal.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {accountResults.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No beneficiary-eligible accounts found.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Retirement accounts (IRA, 401k, Roth), trusts, life insurance, and annuities require beneficiary designations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Account Designations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {accountResults.map((result: any) => (
              <div
                key={result.accountId}
                className={`p-4 rounded-lg border ${
                  result.conflicts.some((c: any) => c.severity === "critical")
                    ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
                    : result.conflicts.some((c: any) => c.severity === "warning")
                    ? "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
                    : "border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20"
                }`}
                data-testid={`account-audit-${result.accountId}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" data-testid={`text-account-type-${result.accountId}`}>
                      {result.accountType}
                    </span>
                    <span className="text-xs text-muted-foreground" data-testid={`text-account-number-${result.accountId}`}>
                      #{result.accountNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" data-testid={`text-account-balance-${result.accountId}`}>
                      ${parseFloat(result.balance || "0").toLocaleString()}
                    </span>
                    {result.conflicts.length === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : result.conflicts.some((c: any) => c.severity === "critical") ? (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  <span data-testid={`text-account-custodian-${result.accountId}`}>{result.custodian}</span>
                  {result.hasBeneficiaryDoc && (
                    <Badge variant="outline" className="text-[10px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Designation on file
                    </Badge>
                  )}
                  {result.lastReviewedDate && (
                    <span>Last reviewed: {result.lastReviewedDate}</span>
                  )}
                </div>

                {result.designations && result.designations.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Designated Beneficiaries:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.designations.map((d: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-background border text-xs"
                          data-testid={`designation-${result.accountId}-${i}`}
                        >
                          <Users className="w-3 h-3" />
                          <span>{d.personName}</span>
                          {d.generation !== null && d.generation !== undefined && (
                            <span className="text-muted-foreground">(Gen {d.generation})</span>
                          )}
                          {d.source && (
                            <span className="text-muted-foreground text-[10px]">via {d.source}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.conflicts.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {result.conflicts.map((conflict: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs"
                        data-testid={`conflict-${result.accountId}-${i}`}
                      >
                        {conflict.severity === "critical" ? (
                          <UserX className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                        ) : conflict.severity === "warning" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        ) : (
                          <Shield className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                        )}
                        <span
                          className={
                            conflict.severity === "critical" ? "text-red-700 dark:text-red-400" :
                            conflict.severity === "warning" ? "text-amber-700 dark:text-amber-400" :
                            "text-muted-foreground"
                          }
                          data-testid={`text-conflict-${result.accountId}-${i}`}
                        >
                          {conflict.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {allBeneficiaries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">All Beneficiaries Across Estate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allBeneficiaries.map((b: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-muted/30"
                  data-testid={`beneficiary-${i}`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium" data-testid={`text-beneficiary-name-${i}`}>
                      {b.personName}
                    </span>
                    {b.generation !== null && b.generation !== undefined && (
                      <Badge variant="outline" className="text-[10px]">
                        Gen {b.generation}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {b.trustType}
                    </Badge>
                    <span className="text-xs text-muted-foreground" data-testid={`text-beneficiary-trust-${i}`}>
                      {b.trustName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {trustData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Trust Beneficiary Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trustData.map((trust: any) => {
              if (!trust.beneficiaries || trust.beneficiaries.length === 0) return null;
              return (
                <div
                  key={trust.id}
                  className="p-3 rounded-md bg-muted/30"
                  data-testid={`trust-beneficiaries-${trust.id}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">{trust.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {trust.trustType}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trust.beneficiaries.map((b: any) => (
                      <div
                        key={b.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border text-xs"
                      >
                        <Users className="w-3 h-3" />
                        <span>{b.personName}</span>
                        {b.generation !== null && b.generation !== undefined && (
                          <span className="text-muted-foreground">(Gen {b.generation})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
