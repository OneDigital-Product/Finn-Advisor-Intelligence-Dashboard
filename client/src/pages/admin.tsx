import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";
import { FlagsPanel } from "@/components/admin/flags-panel";
import { UsersTab } from "@/components/admin/users-tab";
import { ReportsTab } from "@/components/admin/reports-tab";
import { SettingsTab } from "@/components/admin/settings-tab";
import { DiagnosticsTab, PromptsAndTemplatesTab } from "@/components/admin/diagnostics-tab";
import { AnalyticsTab, PilotDashboardTab } from "@/components/admin/analytics-tab";
import { PilotFeedbackTab, ApprovalRulesTab, IntegrationHealthTab, ReminderSettingsTab, CassidyAuditTab, TriggerCategoriesTab, ApiKeyRotationTab } from "@/components/admin/operations-tab";
import { SopKnowledgeTab } from "@/components/admin/sop-knowledge-tab";
import { P } from "@/styles/tokens";
import { Lbl } from "@/components/design/typography";

const sectionTitles: Record<string, { title: string; description: string }> = {
  users: { title: "Users", description: "Manage wealth advisors and team members" },
  reports: { title: "Reports", description: "Generate and export operational reports" },
  analytics: { title: "Login Analytics", description: "Track advisor and associate login activity" },
  assessment: { title: "AI Assessment", description: "Configure AI-powered financial assessment templates" },
  prompts: { title: "Prompts & Templates", description: "Fine-tune AI prompts for advisor workflows" },
  featureflags: { title: "Feature Flags", description: "Toggle features and integrations for gradual rollout" },
  pilotfeedback: { title: "Pilot Feedback", description: "View and manage feedback from pilot users" },
  "pilot-dashboard": { title: "Pilot Dashboard", description: "Monitor expansion gates and pilot metrics" },
  settings: { title: "Settings", description: "System health, integrations, and configuration" },
  "approval-rules": { title: "Approval Rules", description: "Configure approval routing, SLA, and auto-approve conditions" },
  integrations: { title: "Integration Health", description: "Monitor connected systems and data sources" },
  reminders: { title: "Reminder Settings", description: "Configure notification windows for deadlines and reviews" },
  "cassidy-audit": { title: "Cassidy Audit", description: "Search and review Cassidy AI workflow audit trails" },
  triggers: { title: "Trigger Categories", description: "Manage life event trigger categories and automation rules" },
  "sop-knowledge": { title: "SOP Knowledge Base", description: "Manage SOPs, custodial instructions, and query the knowledge base" },
  "api-keys": { title: "API Key Rotation", description: "Monitor API key age and manage rotation schedules" },
};

export default function AdminSettings({ params: propParams }: { params?: { section?: string } } = {}) {
  const routerParams = useParams<{ section?: string }>();
  const params = propParams?.section ? propParams : routerParams;
  const section = params.section || "users";

  const { isLoading } = useQuery<Record<string, unknown>>({
    queryKey: ["/api/advisor"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-60" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const meta = sectionTitles[section] || sectionTitles.users;

  return (
    <div className="space-y-6" style={{ maxWidth: 1100 }}>
      <div>
        <Lbl style={{ color: P.mid }}>{meta.description}</Lbl>
      </div>

      {section === "users" && <UsersTab />}
      {section === "reports" && <ReportsTab />}
      {section === "analytics" && <AnalyticsTab />}
      {section === "assessment" && <DiagnosticsTab />}
      {section === "prompts" && <PromptsAndTemplatesTab />}
      {section === "featureflags" && <FlagsPanel />}
      {section === "pilotfeedback" && <PilotFeedbackTab />}
      {section === "pilot-dashboard" && <PilotDashboardTab />}
      {section === "settings" && <SettingsTab />}
      {section === "approval-rules" && <ApprovalRulesTab />}
      {section === "integrations" && <IntegrationHealthTab />}
      {section === "reminders" && <ReminderSettingsTab />}
      {section === "cassidy-audit" && <CassidyAuditTab />}
      {section === "triggers" && <TriggerCategoriesTab />}
      {section === "sop-knowledge" && <SopKnowledgeTab />}
      {section === "api-keys" && <ApiKeyRotationTab />}
    </div>
  );
}
