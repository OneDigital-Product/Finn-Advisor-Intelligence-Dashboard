import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, RefreshCw, Loader2, Bell,
  Calculator, Cake, Banknote, BarChart3, UserCheck, Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";

const OD = {
  medBlue: "#0078A2",
  medGreen: "#8EB935",
  orange: "#F47D20",
  lightBlue: "#4FB3CD",
  deepBlue: "#00344F",
  text1: "#FFFFFF",
  text2: "#C7D0DD",
  text3: "#94A3B8",
  border: "#2D3748",
};

function getAlertTypeIcon(alertType: string | null) {
  switch (alertType) {
    case "rmd": return <Calculator className="w-3 h-3" />;
    case "birthday": return <Cake className="w-3 h-3" />;
    case "transaction": return <Banknote className="w-3 h-3" />;
    case "rebalance": return <BarChart3 className="w-3 h-3" />;
    case "contact_cadence": return <UserCheck className="w-3 h-3" />;
    case "compliance": return <Shield className="w-3 h-3" />;
    default: return <AlertTriangle className="w-3 h-3" />;
  }
}

function getAlertTypeLabel(alertType: string | null) {
  switch (alertType) {
    case "rmd": return "RMD";
    case "birthday": return "Birthday";
    case "transaction": return "Transaction";
    case "rebalance": return "Rebalance";
    case "contact_cadence": return "Contact";
    case "compliance": return "Compliance";
    default: return "Alert";
  }
}

export function AlertsPanel({ liveCases, liveOpportunities }: { liveCases?: any[]; liveOpportunities?: any[] } = {}) {
  const { toast } = useToast();
  const [alertFilter, setAlertFilter] = useState<string | null>(null);

  const { data: alerts, isLoading } = useQuery<any[]>({
    queryKey: ["/api/alerts"],
    staleTime: Infinity, // SSE event "alert:new" invalidates this — no polling needed
    gcTime: 30 * 60 * 1000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/alerts/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/alerts/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alert dismissed", duration: 3000 });
    },
    onError: () => {
      toast({ title: "Failed to dismiss alert", variant: "destructive", duration: Infinity });
    },
  });

  const generateAlertsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/alerts/generate");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({ title: "Alerts generated", description: `${data.inserted} new alerts created` });
    },
    onError: (err: any) => {
      toast({ title: "Alert generation failed", description: err.message, variant: "destructive" });
    },
  });

  // Convert live SF cases → alert format
  const sfCaseAlerts = (liveCases || []).map((c: any) => ({
    id: c.id || `sf-case-${Math.random().toString(36).slice(2)}`,
    title: c.subject || "Open Case",
    message: `${c.accountName ? c.accountName + " · " : ""}Status: ${c.status || "Open"}`,
    alertType: "compliance",
    severity: (c.priority || "").toLowerCase() === "high" ? "critical" : "warning",
    isRead: false,
    dismissedAt: null,
    isLive: true,
  }));

  // Convert live SF stale opportunities → alert format
  const sfOppAlerts = (liveOpportunities || []).map((o: any) => ({
    id: o.id || `sf-opp-${Math.random().toString(36).slice(2)}`,
    title: o.name || "Stale Opportunity",
    message: `${o.accountName ? o.accountName + " · " : ""}Stage: ${o.stageName || "Unknown"}${o.lastActivityDate ? ` · Last activity: ${new Date(o.lastActivityDate).toLocaleDateString()}` : ""}`,
    alertType: "contact_cadence",
    severity: "warning",
    isRead: false,
    dismissedAt: null,
    isLive: true,
  }));

  const localUnread = alerts?.filter((a: any) => !a.isRead && !a.dismissedAt) || [];
  const hasLiveData = sfCaseAlerts.length > 0 || sfOppAlerts.length > 0;
  const unreadAlerts = hasLiveData ? [...sfCaseAlerts, ...sfOppAlerts, ...localUnread] : localUnread;
  const filteredAlerts = unreadAlerts.filter((a: any) => !alertFilter || a.alertType === alertFilter);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" style={{ borderRadius: 8 }} />;
  }

  return (
    <div>
      {/* Filter bar + scan button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 6px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          <button
            onClick={() => setAlertFilter(null)}
            style={{
              padding: "2px 8px", borderRadius: 99, border: "none", fontSize: 10, fontWeight: 600,
              background: alertFilter === null ? OD.deepBlue : "rgba(148,163,184,0.1)",
              color: alertFilter === null ? OD.lightBlue : OD.text3,
              cursor: "pointer",
            }}
            data-testid="filter-alert-all"
          >All</button>
          {["rmd", "birthday", "transaction", "rebalance", "contact_cadence", "compliance"].map(type => (
            <button
              key={type}
              onClick={() => setAlertFilter(type)}
              style={{
                padding: "2px 8px", borderRadius: 99, border: "none", fontSize: 10, fontWeight: 600,
                background: alertFilter === type ? OD.deepBlue : "rgba(148,163,184,0.1)",
                color: alertFilter === type ? OD.lightBlue : OD.text3,
                cursor: "pointer",
              }}
              data-testid={`filter-alert-${type}`}
            >{getAlertTypeLabel(type)}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => generateAlertsMutation.mutate()}
            disabled={generateAlertsMutation.isPending}
            style={{
              display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
              borderRadius: 4, border: `1px solid ${OD.border}`, background: "transparent",
              fontSize: 10, fontWeight: 600, color: OD.text3, cursor: "pointer",
            }}
            data-testid="button-generate-alerts"
          >
            {generateAlertsMutation.isPending ? (
              <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
            ) : (
              <RefreshCw style={{ width: 10, height: 10 }} />
            )}
            Scan
          </button>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 99,
            background: "rgba(239,68,68,0.12)", color: "#EF4444",
            fontFamily: "'JetBrains Mono', monospace",
          }} data-testid="badge-unread-alerts">
            {unreadAlerts.length}
          </span>
        </div>
      </div>

      {/* Alert items */}
      <div style={{ padding: "4px 12px 8px", maxHeight: 350, overflowY: "auto" }}>
        {filteredAlerts.map((alert: any) => (
          <div
            key={alert.id}
            style={{
              padding: "10px 12px",
              borderRadius: 6,
              marginBottom: 4,
              borderLeft: `3px solid ${alert.severity === "critical" ? "#EF4444" : alert.severity === "warning" ? OD.orange : OD.text3}`,
              background: alert.severity === "critical" ? "rgba(239,68,68,0.08)" : alert.severity === "warning" ? "rgba(244,125,32,0.08)" : "transparent",
            }}
            data-testid={`alert-${alert.id}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ color: alert.severity === "critical" ? "#EF4444" : alert.severity === "warning" ? OD.orange : OD.text3 }}>
                {getAlertTypeIcon(alert.alertType)}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: OD.text1 }}>{alert.title}</span>
            </div>
            <p style={{ fontSize: 11, color: OD.text2, lineHeight: 1.5, marginBottom: 6, margin: "0 0 6px" }}>{alert.message}</p>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => markReadMutation.mutate(alert.id)}
                style={{ fontSize: 11, fontWeight: 600, color: OD.lightBlue, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                data-testid={`button-read-${alert.id}`}
              >
                Read
              </button>
              <button
                onClick={() => dismissMutation.mutate(alert.id)}
                style={{ fontSize: 11, fontWeight: 600, color: OD.text3, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                data-testid={`button-dismiss-${alert.id}`}
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
        {filteredAlerts.length === 0 && (
          <EmptyState
            icon={Bell}
            title="No alerts"
            description="Everything looks good across your book."
          />
        )}
      </div>
    </div>
  );
}
