import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Database, Sparkles, CheckCircle2, XCircle, Shield, Server, Plug, Settings2, Code2, Eye } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDevSettings } from "@/hooks/use-dev-settings";

interface AdvisorInfo {
  name?: string;
  title?: string;
  email?: string;
  aiEnabled?: boolean;
}

interface AnalyticsInfo {
  totalClients?: number;
  capacityMetrics?: { currentClients?: number; maxCapacity?: number };
}

interface IntegrationStatus {
  enabled?: boolean;
  authenticated?: boolean;
  syncEnabled?: boolean;
  lastSync?: string;
  emailEnabled?: boolean;
  emailProvider?: string;
}

interface ProviderInfo {
  id: string;
  name: string;
  enabled: boolean;
}

interface IntegrationSettings {
  activeCRM: string;
  activePortfolio: string;
  crmProviders: ProviderInfo[];
  portfolioProviders: ProviderInfo[];
}

function SettingsTab() {
  const { toast } = useToast();
  const { settings: devSettings, toggle: toggleDev } = useDevSettings();
  const { data: advisor } = useQuery<AdvisorInfo>({ queryKey: ["/api/advisor"] });
  const { data: analytics } = useQuery<AnalyticsInfo>({ queryKey: ["/api/analytics"] });
  const { data: sfStatus } = useQuery<IntegrationStatus>({ queryKey: ["/api/integrations/salesforce/status"] });
  const { data: orionStatus } = useQuery<IntegrationStatus>({ queryKey: ["/api/integrations/orion/status"] });
  const { data: msStatus } = useQuery<IntegrationStatus>({ queryKey: ["/api/integrations/microsoft/status"] });
  const { data: zoomStatus } = useQuery<IntegrationStatus>({ queryKey: ["/api/integrations/zoom/status"] });
  const { data: integrationSettings } = useQuery<IntegrationSettings>({ queryKey: ["/api/admin/integration-settings"] });

  const updateSettings = useMutation({
    mutationFn: async (settings: { activeCRM?: string; activePortfolio?: string }) => {
      const res = await apiRequest("PUT", "/api/admin/integration-settings", settings);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integration-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/crm/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/portfolio/status"] });
      toast({ title: "Integration settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  function getStatus(data: IntegrationStatus | undefined) {
    if (!data) return "loading";
    if (!data.enabled) return "not_configured";
    if (data.authenticated) return "connected";
    return "enabled";
  }

  const integrations = [
    {
      name: "Salesforce CRM",
      status: getStatus(sfStatus),
      description: sfStatus?.enabled
        ? `Salesforce integration active. Sync enabled: ${sfStatus.syncEnabled ? "Yes" : "No"}.${sfStatus.lastSync ? ` Last sync: ${new Date(sfStatus.lastSync).toLocaleString()}` : ""}`
        : "Set SALESFORCE_ENABLED=true and configure credentials to enable CRM sync for contacts, tasks, meetings, and activities.",
      fields: "Contacts, Opportunities, Activities, Tasks, Events",
    },
    {
      name: "Orion Portfolio",
      status: getStatus(orionStatus),
      description: orionStatus?.enabled
        ? `Orion integration active.${orionStatus.lastSync ? ` Last sync: ${new Date(orionStatus.lastSync).toLocaleString()}` : ""}`
        : "Set ORION_ENABLED=true and ORION_API_KEY to enable portfolio data sync for accounts, holdings, and performance.",
      fields: "Accounts, Holdings, Performance, Transactions, Models",
    },
    {
      name: "Microsoft 365",
      status: getStatus(msStatus),
      description: msStatus?.enabled
        ? `Microsoft integration active. Email: ${msStatus.emailEnabled ? msStatus.emailProvider : "disabled"}.`
        : "Set MICROSOFT_ENABLED=true to enable Outlook calendar sync and email notifications.",
      fields: "Calendar Events, Email Notifications",
    },
    {
      name: "Zoom",
      status: getStatus(zoomStatus),
      description: zoomStatus?.enabled
        ? "Zoom integration active. Auto-create Zoom meetings and process recordings."
        : "Set ZOOM_ENABLED=true and configure Zoom credentials to enable meeting creation and recording processing.",
      fields: "Meeting Creation, Recordings, Transcripts",
    },
    {
      name: "OpenAI",
      status: advisor?.aiEnabled ? "connected" : "not_configured",
      description: advisor?.aiEnabled
        ? "AI features active: meeting prep generation, action item extraction, follow-up emails, natural language queries, and client insights."
        : "Set OPENAI_API_KEY environment variable to enable AI features. The app uses graceful fallback templates when AI is not available.",
      fields: "gpt-5 model for all AI features",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Advisor Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-semibold text-primary" data-testid="text-advisor-initials">
                    {advisor?.name?.split(" ").map((n: string) => n[0]).join("") || "SA"}
                  </span>
                </div>
                <div>
                  <div className="text-lg font-semibold" data-testid="text-advisor-name">{advisor?.name || "Advisor"}</div>
                  <div className="text-sm text-muted-foreground">{advisor?.title || "Wealth Advisor"}</div>
                  <div className="text-xs text-muted-foreground">{advisor?.email}</div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Clients</div>
                  <div className="font-semibold">{analytics?.totalClients || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Capacity</div>
                  <div className="font-semibold">
                    {analytics?.capacityMetrics?.currentClients || 0} / {analytics?.capacityMetrics?.maxCapacity || 120}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/40">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">PostgreSQL Database</span>
                </div>
                <Badge variant="default" className="text-xs no-default-active-elevate" data-testid="badge-db-status">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/40">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Express API Server</span>
                </div>
                <Badge variant="default" className="text-xs no-default-active-elevate">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Running
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">AI Features</span>
                </div>
                <Badge
                  variant={advisor?.aiEnabled ? "default" : "secondary"}
                  className="text-xs no-default-active-elevate"
                  data-testid="badge-ai-status"
                >
                  {advisor?.aiEnabled ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Active</>
                  ) : (
                    <><XCircle className="w-3 h-3 mr-1" /> Fallback Mode</>
                  )}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plug className="w-4 h-4" />
            Data Integrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {integrations.map((integration) => (
              <div key={integration.name} className="p-4 rounded-md border" data-testid={`integration-${integration.name.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{integration.name}</span>
                      <Badge
                        variant={integration.status === "connected" ? "default" : integration.status === "enabled" ? "secondary" : "outline"}
                        className="text-[10px] no-default-active-elevate"
                      >
                        {integration.status === "connected" ? "Connected" :
                         integration.status === "enabled" ? "Enabled" :
                         integration.status === "loading" ? "Loading..." :
                         "Not Configured"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{integration.description}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Data fields: </span>
                      {integration.fields}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Active Integration Providers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">CRM Platform</label>
              <Select
                value={integrationSettings?.activeCRM || "salesforce"}
                onValueChange={(value) => updateSettings.mutate({ activeCRM: value })}
                disabled={updateSettings.isPending}
              >
                <SelectTrigger className="w-full" data-testid="select-crm-provider">
                  <SelectValue placeholder="Select CRM provider" />
                </SelectTrigger>
                <SelectContent>
                  {(integrationSettings?.crmProviders || []).map((p) => (
                    <SelectItem key={p.id} value={p.id} data-testid={`option-crm-${p.id}`}>
                      <span className="flex items-center gap-2">
                        {p.name}
                        {p.enabled && (
                          <Badge variant="default" className="text-[10px] no-default-active-elevate ml-1">Configured</Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select which CRM platform to use for contact sync, task sync, and withdrawal case management.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Portfolio Management Platform</label>
              <Select
                value={integrationSettings?.activePortfolio || "orion"}
                onValueChange={(value) => updateSettings.mutate({ activePortfolio: value })}
                disabled={updateSettings.isPending}
              >
                <SelectTrigger className="w-full" data-testid="select-portfolio-provider">
                  <SelectValue placeholder="Select portfolio provider" />
                </SelectTrigger>
                <SelectContent>
                  {(integrationSettings?.portfolioProviders || []).map((p) => (
                    <SelectItem key={p.id} value={p.id} data-testid={`option-portfolio-${p.id}`}>
                      <span className="flex items-center gap-2">
                        {p.name}
                        {p.enabled && (
                          <Badge variant="default" className="text-[10px] no-default-active-elevate ml-1">Configured</Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select which portfolio platform to use for account sync, holdings, performance data, and set-aside management.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Integration Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              All integrations are production-ready and activate automatically when their environment variables are configured.
            </p>
            <div className="p-3 rounded-md bg-muted/40 space-y-2">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-foreground shrink-0">Salesforce:</span>
                <span>SALESFORCE_ENABLED, SALESFORCE_CLIENT_ID, SALESFORCE_PRIVATE_KEY, SALESFORCE_INSTANCE_URL</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-foreground shrink-0">Redtail:</span>
                <span>REDTAIL_ENABLED, REDTAIL_API_KEY, REDTAIL_USER_KEY, REDTAIL_BASE_URL</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-foreground shrink-0">Orion:</span>
                <span>ORION_ENABLED, ORION_API_KEY, ORION_BASE_URL</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-foreground shrink-0">Black Diamond:</span>
                <span>BLACK_DIAMOND_ENABLED, BLACK_DIAMOND_CLIENT_ID, BLACK_DIAMOND_CLIENT_SECRET, BLACK_DIAMOND_BASE_URL</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-foreground shrink-0">Microsoft:</span>
                <span>MICROSOFT_ENABLED, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-foreground shrink-0">Zoom:</span>
                <span>ZOOM_ENABLED, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold text-foreground shrink-0">Email:</span>
                <span>EMAIL_ENABLED, SENDGRID_API_KEY (or SMTP_ENABLED with SMTP_HOST, SMTP_USER, SMTP_PASS)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Developer Tools ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            Developer Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Diagnostic overlays for development and data debugging. These settings are stored locally and only visible to you.
            </p>
            {[
              {
                key: "showDataSources" as const,
                label: "Data Source Diagnostic",
                description: "Show a floating panel on client pages revealing which fields come from Salesforce, Orion, computed, or are empty.",
                icon: <Eye className="w-4 h-4 text-muted-foreground" />,
              },
              {
                key: "showFieldDiagnostics" as const,
                label: "Field-Level Badges",
                description: "Display inline source badges (SF / Orion / Fallback) next to every data field on client detail pages.",
                icon: <Database className="w-4 h-4 text-muted-foreground" />,
              },
            ].map(({ key, label, description, icon }) => (
              <div key={key} className="flex items-start justify-between gap-4 p-3 rounded-md border" data-testid={`devtool-${key}`}>
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">{icon}</div>
                  <div>
                    <div className="text-sm font-semibold">{label}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleDev(key)}
                  className="shrink-0 mt-0.5"
                  style={{
                    width: 40, height: 22, borderRadius: 11, border: "none",
                    background: devSettings[key]
                      ? "rgb(142,185,53)"
                      : "rgba(148,163,184,0.2)",
                    position: "relative", cursor: "pointer",
                    transition: "background .2s",
                  }}
                  data-testid={`toggle-${key}`}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: "#fff",
                    position: "absolute", top: 2,
                    left: devSettings[key] ? 20 : 2,
                    transition: "left .2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  }} />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { SettingsTab };
