import React, { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Eagerly loaded: Overview and Portfolio are the default tabs and render
// immediately from Tier 1/2 data. They should never show a lazy-load delay.
// ---------------------------------------------------------------------------
import TaskSidebar from "@/components/task-sidebar";
import { OverviewSection } from "./overview-section";
import { PortfolioSection } from "./portfolio-section";

// ---------------------------------------------------------------------------
// Lazy loaded: All other tab sections. Each becomes its own code chunk,
// loaded on first visit. Saves ~400-600KB from the initial bundle.
// ---------------------------------------------------------------------------
const PrepSection = React.lazy(() => import("./prep-section").then(m => ({ default: m.PrepSection })));
const ComplianceTab = React.lazy(() => import("@/components/compliance-tab"));
const ClientReportsSection = React.lazy(() => import("@/components/client-reports-section").then(m => ({ default: m.ClientReportsSection })));
const MeetingsSection = React.lazy(() => import("./meetings-section").then(m => ({ default: m.MeetingsSection })));
const DocumentsSection = React.lazy(() => import("./documents-section").then(m => ({ default: m.DocumentsSection })));
const DiagnosticsSection = React.lazy(() => import("./diagnostics-section").then(m => ({ default: m.DiagnosticsSection })));
const InsightsSection = React.lazy(() => import("./insights-section").then(m => ({ default: m.InsightsSection })));
const RetirementSection = React.lazy(() => import("./retirement-section").then(m => ({ default: m.RetirementSection })));
const GoalsSection = React.lazy(() => import("./goals-section").then(m => ({ default: m.GoalsSection })));
const EstatePlanningSection = React.lazy(() => import("./estate-planning-section").then(m => ({ default: m.EstatePlanningSection })));
const PhilanthropySection = React.lazy(() => import("./philanthropy-section").then(m => ({ default: m.PhilanthropySection })));
const TaxStrategySection = React.lazy(() => import("./tax-strategy-section").then(m => ({ default: m.TaxStrategySection })));
const DirectIndexingSection = React.lazy(() => import("./direct-indexing-section").then(m => ({ default: m.DirectIndexingSection })));
const AssetMapSection = React.lazy(() => import("./asset-map-section").then(m => ({ default: m.AssetMapSection })));
const BehavioralSection = React.lazy(() => import("./behavioral-section").then(m => ({ default: m.BehavioralSection })));
const OnboardingSection = React.lazy(() => import("./onboarding-section").then(m => ({ default: m.OnboardingSection })));
const ProfileUpdatesSection = React.lazy(() => import("./profile-updates-section").then(m => ({ default: m.ProfileUpdatesSection })));
const WithdrawalSection = React.lazy(() => import("./withdrawal-section").then(m => ({ default: m.WithdrawalSection })));
const PreCaseValidatorSection = React.lazy(() => import("./pre-case-validator-section").then(m => ({ default: m.PreCaseValidatorSection })));
const SocialIntelligenceSection = React.lazy(() => import("./social-intelligence-section").then(m => ({ default: m.SocialIntelligenceSection })));
const BusinessSuccessionSection = React.lazy(() => import("./business-succession-section").then(m => ({ default: m.BusinessSuccessionSection })));
const PhilanthropicSection = React.lazy(() => import("./philanthropic-section").then(m => ({ default: m.PhilanthropicSection })));
const PlanningIntelligenceSection = React.lazy(() => import("./planning-intelligence-section").then(m => ({ default: m.PlanningIntelligenceSection })));
const InsuranceSection = React.lazy(() => import("./insurance-section").then(m => ({ default: m.InsuranceSection })));
const AIInsightsSection = React.lazy(() => import("./ai-insights-section").then(m => ({ default: m.AIInsightsSection })));
const BeneficiaryAuditSection = React.lazy(() => import("./beneficiary-audit").then(m => ({ default: m.BeneficiaryAuditSection })));

// Tab loading skeleton — shown briefly while a lazy section loads
function TabSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-[120px] rounded-lg" />
        <Skeleton className="h-[120px] rounded-lg" />
      </div>
    </div>
  );
}

interface ClientTabsProps {
  activeSection: string;
  clientId: string;
  client: any;
  accounts: any[];
  holdings: any[];
  alternativeAssets: any[];
  transactions?: any[];
  perf: any[];
  householdMembers: any[];
  lifeEvents: any[];
  perfData: any[];
  pieData: { name: string; value: number }[];
  clientMeetings: any[];
  documents: any[];
  checklistData: any[];
  complianceItems: any[];
  totalAum: number;
  marketData: any;
  marketLoading: boolean;
  refetchMarket: () => void;
  teamMembers: any[];
  suggestedTasks: any[];
  setSuggestedTasks: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedAccountId: (id: string | null) => void;
  user: any;
  isMobile: boolean;
  // Computed aggregations from server
  riskDistribution?: any[];
  topHoldingsByValue?: any[];
  sectorExposure?: any[];
  custodianBreakdown?: any[];
  accountTypeDistribution?: any[];
  managedVsHeldAway?: any;
  // Performance & contributions from portfolio endpoint
  portfolioPerformance?: any;
  portfolioContributions?: any;
  // Salesforce CRM data
  upcomingEvents?: any[];
  staleOpportunities?: any[];
  sfFinancialGoals?: any[];
  sfTopHoldings?: any[];
  revenues?: any[];
  assetsAndLiabilities?: any[];
}

export function ClientTabs({
  activeSection,
  clientId,
  client,
  accounts,
  holdings,
  alternativeAssets,
  transactions,
  perf,
  householdMembers,
  lifeEvents,
  perfData,
  pieData,
  clientMeetings,
  documents,
  checklistData,
  complianceItems,
  totalAum,
  marketData,
  marketLoading,
  refetchMarket,
  teamMembers,
  suggestedTasks,
  setSuggestedTasks,
  setSelectedAccountId,
  user,
  isMobile,
  riskDistribution,
  topHoldingsByValue,
  sectorExposure,
  custodianBreakdown,
  accountTypeDistribution,
  managedVsHeldAway,
  portfolioPerformance,
  portfolioContributions,
  upcomingEvents,
  staleOpportunities,
  sfFinancialGoals,
  sfTopHoldings,
  revenues,
  assetsAndLiabilities,
}: ClientTabsProps) {
  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <Suspense fallback={<TabSkeleton />}>
        {activeSection === "tasks" && isMobile && (
          <div className="space-y-6">
            <TaskSidebar
              clientId={clientId}
              advisorId={user?.advisorId || user?.id || ""}
              teamMembers={teamMembers || []}
              suggestedTasks={suggestedTasks}
              onSuggestedTaskAdded={(st: any) => setSuggestedTasks(prev => prev.filter(t => t.title !== st.title))}
            />
          </div>
        )}

        {activeSection === "prep" && (
          <div className="space-y-6">
            <PrepSection clientId={clientId} />
          </div>
        )}

        {activeSection === "overview" && (
          <OverviewSection
            client={client}
            accounts={accounts}
            householdMembers={householdMembers}
            lifeEvents={lifeEvents}
            perfData={perfData}
            onAccountSelect={setSelectedAccountId}
            custodianBreakdown={custodianBreakdown}
            accountTypeDistribution={accountTypeDistribution}
            managedVsHeldAway={managedVsHeldAway}
            upcomingEvents={upcomingEvents}
            staleOpportunities={staleOpportunities}
            sfFinancialGoals={sfFinancialGoals}
            sfTopHoldings={sfTopHoldings}
            revenues={revenues}
            assetsAndLiabilities={assetsAndLiabilities}
          />
        )}

        {activeSection === "portfolio" && (
          <PortfolioSection
            clientId={clientId}
            pieData={pieData}
            perf={perf}
            holdings={holdings}
            accounts={accounts}
            alternativeAssets={alternativeAssets}
            transactions={transactions}
            marketData={marketData}
            marketLoading={marketLoading}
            refetchMarket={() => refetchMarket()}
            onAccountSelect={setSelectedAccountId}
            riskDistribution={riskDistribution}
            topHoldingsByValue={topHoldingsByValue}
            sectorExposure={sectorExposure}
            portfolioPerformance={portfolioPerformance}
            portfolioContributions={portfolioContributions}
          />
        )}

        {activeSection === "asset-map" && (
          <AssetMapSection
            client={client}
            accounts={accounts}
            holdings={holdings}
            alternativeAssets={alternativeAssets}
            householdMembers={householdMembers}
            totalAum={totalAum}
            onAccountSelect={setSelectedAccountId}
          />
        )}

        {activeSection === "meetings" && (
          <MeetingsSection
            clientId={clientId}
            clientMeetings={clientMeetings}
            onSuggestedTasks={(tasks: any[]) => setSuggestedTasks(prev => [...prev, ...tasks])}
          />
        )}

        {activeSection === "documents" && (
          <DocumentsSection
            clientId={clientId}
            clientName={`${client.firstName} ${client.lastName}`}
            documents={documents}
            checklistData={checklistData || []}
          />
        )}

        {activeSection === "compliance" && (
          <div className="space-y-6">
            <ComplianceTab
              clientId={clientId}
              complianceItems={complianceItems}
              clientName={`${client.firstName} ${client.lastName}`}
              isAdvisor={user?.type === "advisor"}
              advisorName={user?.name || ""}
            />
          </div>
        )}

        {activeSection === "reports" && (
          <ClientReportsSection clientId={clientId} clientName={`${client.firstName} ${client.lastName}`} />
        )}

        {activeSection === "retirement" && (
          <div className="space-y-6">
            <RetirementSection clientId={clientId} totalAum={totalAum} clientName={`${client.firstName} ${client.lastName}`} />
          </div>
        )}

        {activeSection === "tax-strategy" && (
          <div className="space-y-6">
            <TaxStrategySection
              clientId={clientId}
              clientName={`${client.firstName} ${client.lastName}`}
              totalAum={totalAum}
            />
          </div>
        )}

        {activeSection === "goals" && (
          <div className="space-y-6">
            <GoalsSection clientId={clientId} accounts={accounts} />
          </div>
        )}

        {activeSection === "estate" && (
          <div className="space-y-6">
            <EstatePlanningSection
              clientId={clientId}
              clientName={`${client.firstName} ${client.lastName}`}
              totalAum={totalAum}
              advisorId={user?.advisorId || user?.id || ""}
            />
          </div>
        )}

        {activeSection === "philanthropy" && (
          <div className="space-y-6">
            <PhilanthropySection
              clientId={clientId}
              clientName={`${client.firstName} ${client.lastName}`}
              advisorId={user?.advisorId || user?.id || ""}
            />
            <PhilanthropicSection
              clientId={clientId}
              clientName={`${client.firstName} ${client.lastName}`}
              totalAum={totalAum}
              advisorId={user?.advisorId || user?.id || ""}
            />
          </div>
        )}

        {activeSection === "business-succession" && (
          <div className="space-y-6">
            <BusinessSuccessionSection
              clientId={clientId}
              clientName={`${client.firstName} ${client.lastName}`}
              totalAum={totalAum}
              advisorId={user?.advisorId || user?.id || ""}
            />
          </div>
        )}

        {activeSection === "withdrawals" && (
          <div className="space-y-6">
            <WithdrawalSection clientId={clientId} accounts={accounts} />
          </div>
        )}

        {activeSection === "validator" && (
          <div className="space-y-6">
            <PreCaseValidatorSection clientId={clientId} />
          </div>
        )}

        {activeSection === "direct-indexing" && (
          <DirectIndexingSection clientId={clientId} clientName={`${client.firstName} ${client.lastName}`} totalAum={totalAum} />
        )}

        {activeSection === "intelligence" && (
          <div className="space-y-6">
            <AIInsightsSection
              clientId={clientId}
              clientName={`${client.firstName} ${client.lastName}`}
            />
            <InsightsSection clientId={clientId} />
            <DiagnosticsSection
              clientId={clientId}
              clientFirstName={client.firstName}
              clientLastName={client.lastName}
              userName={user?.name || ""}
            />
          </div>
        )}

        {activeSection === "behavioral" && (
          <BehavioralSection clientId={clientId} />
        )}

        {activeSection === "onboarding" && (
          <div className="space-y-6">
            <ProfileUpdatesSection clientId={clientId} />
            <OnboardingSection clientId={clientId} />
          </div>
        )}

        {activeSection === "social-intel" && (
          <SocialIntelligenceSection clientId={clientId} clientName={`${client.firstName} ${client.lastName}`} />
        )}

        {activeSection === "planning-intelligence" && (
          <PlanningIntelligenceSection clientId={clientId} />
        )}

        {activeSection === "insurance" && (
          <InsuranceSection
            clientId={clientId}
            clientName={`${client.firstName} ${client.lastName}`}
            totalAum={totalAum}
            client={client}
          />
        )}

        </Suspense>
      </div>

      {!isMobile && (
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-6">
            <TaskSidebar
              clientId={clientId}
              advisorId={user?.advisorId || user?.id || ""}
              teamMembers={teamMembers || []}
              suggestedTasks={suggestedTasks}
              onSuggestedTaskAdded={(st: any) => setSuggestedTasks(prev => prev.filter(t => t.title !== st.title))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
