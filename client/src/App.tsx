import { Switch, Route, Redirect } from "wouter";
import { useRouter, usePathname } from "next/navigation";
import { lazy, Suspense, useEffect, useRef } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavRail, NavPageTabsProvider } from "@/components/app-sidebar";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandPalette, CommandPaletteTrigger, CommandPaletteProvider } from "@/components/command-palette";
import { FeedbackWidget } from "@/components/feedback-widget";
import { DiagnosticProvider } from "@/contexts/diagnostic-context";
import { GlobalDiagnosticPanel } from "@/components/global-diagnostic-panel";
import { NpsSurvey, trackSurveyAction } from "@/components/nps-survey";
import { FinnSidecar } from "@/components/finn-sidecar";
import { OnboardingWalkthrough } from "@/components/onboarding-walkthrough";
import { ErrorBoundary } from "@/components/error-boundary";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useSSEEvents } from "@/hooks/use-sse-events";
import { P, SPRING } from "@/styles/tokens";
import { Serif } from "@/components/design/typography";
import { DataSourceBadge, type DataSourceType } from "@/components/design/data-source-badge";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import NotFound from "@/pages/not-found";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Clients = lazy(() => import("@/pages/clients"));
const ClientDetail = lazy(() => import("@/pages/client-detail"));
const Meetings = lazy(() => import("@/pages/meetings"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Compliance = lazy(() => import("@/pages/compliance"));
const AdminSettings = lazy(() => import("@/pages/admin"));
const Workflows = lazy(() => import("@/pages/workflows"));
const Onboarding = lazy(() => import("@/pages/onboarding"));
const Profiles = lazy(() => import("@/pages/profiles"));
const Reports = lazy(() => import("@/pages/reports"));
const ReportEditor = lazy(() => import("@/pages/report-editor"));
const Calculators = lazy(() => import("@/pages/calculators"));
const RMDCalculator = lazy(() => import("@/pages/rmd-calculator"));
const BudgetCalculator = lazy(() => import("@/pages/budget-calculator"));
const RothConversionCalculator = lazy(() => import("@/pages/roth-conversion-calculator"));
const AssetLocationCalculator = lazy(() => import("@/pages/asset-location-calculator"));
const TaxBracketCalculator = lazy(() => import("@/pages/tax-bracket-calculator"));
const QSBSTrackerCalculator = lazy(() => import("@/pages/qsbs-tracker-calculator"));
const ConcentratedStockCalculator = lazy(() => import("@/pages/concentrated-stock-calculator"));
const LTCPlanningCalculator = lazy(() => import("@/pages/ltc-planning-calculator"));
const LifeInsuranceGapCalculator = lazy(() => import("@/pages/life-insurance-gap-calculator"));
const Approvals = lazy(() => import("@/pages/approvals"));
const FactFinders = lazy(() => import("@/pages/fact-finders"));
const FactFinderFill = lazy(() => import("@/pages/fact-finder-fill"));
const IntakePage = lazy(() => import("@/pages/intake"));
const ReviewQueuePage = lazy(() => import("@/pages/review-queue"));
const ProfileDraftPage = lazy(() => import("@/pages/profile-draft"));
const ProfileCommitPage = lazy(() => import("@/pages/profile-commit"));
const FinCopilotPage = lazy(() => import("@/pages/fin-copilot"));
const DiscoveryPage = lazy(() => import("@/pages/discovery"));
const WithdrawalsPage = lazy(() => import("@/pages/withdrawals"));
const CustodialReporting = lazy(() => import("@/pages/custodial-reporting"));
const EngagementPage = lazy(() => import("@/pages/engagement"));
const ResearchPage = lazy(() => import("@/pages/research"));
const MonteCarloPage = lazy(() => import("@/pages/monte-carlo"));
const CalendarPage = lazy(() => import("@/pages/calendar"));
const ClientInsightsPage = lazy(() => import("@/pages/client-insights"));
const AutomationsPage = lazy(() => import("@/pages/automations"));

/** Full-page spinner for Suspense boundaries and lazy-loaded routes. Use Skeleton for inline/card-level placeholders. */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function NavigationTracker() {
  const location = usePathname();
  const prevLocation = useRef(location);

  useEffect(() => {
    if (prevLocation.current !== location) {
      trackSurveyAction();
      prevLocation.current = location;
    }
  }, [location]);

  return null;
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (user?.type === "advisor" && user.onboardingCompleted === false && location !== "/onboarding") {
      router.push("/onboarding");
    }
  }, [user, location, router]);

  return <>{children}</>;
}

function Router() {
  const { user } = useAuth();
  return (
    <Suspense fallback={<PageLoader />}>
    <OnboardingGate>
    <Switch>
      <Route path="/">{() => <ErrorBoundary><Dashboard /></ErrorBoundary>}</Route>
      <Route path="/onboarding">{() => <ErrorBoundary><Onboarding /></ErrorBoundary>}</Route>
      <Route path="/clients">{() => <ErrorBoundary><Clients /></ErrorBoundary>}</Route>
      <Route path="/clients/:id">{() => <ErrorBoundary><ClientDetail /></ErrorBoundary>}</Route>
      <Route path="/meetings">{() => <ErrorBoundary><Meetings /></ErrorBoundary>}</Route>
      <Route path="/calendar">{() => <ErrorBoundary><CalendarPage /></ErrorBoundary>}</Route>
      <Route path="/analytics">{() => <ErrorBoundary><Analytics /></ErrorBoundary>}</Route>
      <Route path="/engagement">{() => <ErrorBoundary><EngagementPage /></ErrorBoundary>}</Route>
      <Route path="/client-insights">{() => <ErrorBoundary><ClientInsightsPage /></ErrorBoundary>}</Route>
      <Route path="/compliance">{() => <ErrorBoundary><Compliance /></ErrorBoundary>}</Route>
      <Route path="/profiles">{() => <ErrorBoundary><Profiles /></ErrorBoundary>}</Route>
      <Route path="/reports/:reportId/edit">{() => <ErrorBoundary><ReportEditor /></ErrorBoundary>}</Route>
      <Route path="/reports">{() => <ErrorBoundary><Reports /></ErrorBoundary>}</Route>
      <Route path="/calculators/rmd">{() => <ErrorBoundary><RMDCalculator /></ErrorBoundary>}</Route>
      <Route path="/calculators/budget">{() => <ErrorBoundary><BudgetCalculator /></ErrorBoundary>}</Route>
      <Route path="/calculators/roth-conversion">{() => <ErrorBoundary><RothConversionCalculator /></ErrorBoundary>}</Route>
      <Route path="/calculators/asset-location">{() => <ErrorBoundary><AssetLocationCalculator /></ErrorBoundary>}</Route>
      <Route path="/calculators/tax-bracket">{() => <ErrorBoundary><TaxBracketCalculator /></ErrorBoundary>}</Route>
      <Route path="/calculators/qsbs">{() => <ErrorBoundary><QSBSTrackerCalculator /></ErrorBoundary>}</Route>
      <Route path="/calculators/concentrated-stock">{() => <ErrorBoundary><ConcentratedStockCalculator /></ErrorBoundary>}</Route>
      <Route path="/calculators/ltc-planning">{() => <ErrorBoundary><LTCPlanningCalculator /></ErrorBoundary>}</Route>
      <Route path="/calculators/life-insurance-gap">{() => <ErrorBoundary><LifeInsuranceGapCalculator /></ErrorBoundary>}</Route>
      <Route path="/calculators">{() => <ErrorBoundary><Calculators /></ErrorBoundary>}</Route>
      <Route path="/tax-strategy/roth-conversion">{() => <ErrorBoundary><RothConversionCalculator /></ErrorBoundary>}</Route>
      <Route path="/tax-strategy/asset-location">{() => <ErrorBoundary><AssetLocationCalculator /></ErrorBoundary>}</Route>
      <Route path="/tax-strategy/tax-brackets">{() => <ErrorBoundary><TaxBracketCalculator /></ErrorBoundary>}</Route>
      <Route path="/tax-strategy/qsbs">{() => <ErrorBoundary><QSBSTrackerCalculator /></ErrorBoundary>}</Route>
      <Route path="/tax-strategy">{() => <ErrorBoundary><Calculators /></ErrorBoundary>}</Route>
      <Route path="/approvals">{() => <ErrorBoundary><Approvals /></ErrorBoundary>}</Route>
      <Route path="/fact-finders/:id/fill">{() => <ErrorBoundary><FactFinderFill /></ErrorBoundary>}</Route>
      <Route path="/fact-finders">{() => <ErrorBoundary><FactFinders /></ErrorBoundary>}</Route>
      <Route path="/withdrawals">{() => <ErrorBoundary><WithdrawalsPage /></ErrorBoundary>}</Route>
      <Route path="/custodial-reporting">{() => <ErrorBoundary><CustodialReporting /></ErrorBoundary>}</Route>
      <Route path="/copilot">{() => <ErrorBoundary><FinCopilotPage /></ErrorBoundary>}</Route>
      <Route path="/intake">{() => <ErrorBoundary><IntakePage /></ErrorBoundary>}</Route>
      <Route path="/discovery/:id?">{() => <ErrorBoundary><DiscoveryPage /></ErrorBoundary>}</Route>
      <Route path="/research">{() => <ErrorBoundary><ResearchPage /></ErrorBoundary>}</Route>
      <Route path="/monte-carlo">{() => <ErrorBoundary><MonteCarloPage /></ErrorBoundary>}</Route>
      <Route path="/review/:jobId">{() => <ErrorBoundary><ReviewQueuePage /></ErrorBoundary>}</Route>
      <Route path="/profile-draft/:clientId">{() => <ErrorBoundary><ProfileDraftPage /></ErrorBoundary>}</Route>
      <Route path="/profile-commit/:jobId">{() => <ErrorBoundary><ProfileCommitPage /></ErrorBoundary>}</Route>
      <Route path="/automations">{() => <ErrorBoundary><AutomationsPage /></ErrorBoundary>}</Route>
      {user?.type === "advisor" && <Route path="/admin/workflows">{() => <ErrorBoundary><Workflows /></ErrorBoundary>}</Route>}
      {user?.type === "advisor" && <Route path="/admin/:section?">{() => <ErrorBoundary><AdminSettings /></ErrorBoundary>}</Route>}
      <Route path="/settings">{() => <Redirect to="/admin" />}</Route>
      <Route path="/workflows">{() => <Redirect to="/admin/workflows" />}</Route>
      <Route path="/login">{() => <Redirect to="/" />}</Route>
      <Route path="/signup">{() => <Redirect to="/" />}</Route>
      <Route>{() => <ErrorBoundary><NotFound /></ErrorBoundary>}</Route>
    </Switch>
    </OnboardingGate>
    </Suspense>
  );
}

function StickyHeader() {
  const location = usePathname();
  const { user } = useAuth();

  const { title: pageTitle, source: pageSource } = (() => {
    if (location === "/") return { title: "My Day", source: "portfolio" as DataSourceType };
    if (location === "/clients") return { title: "Clients", source: "portfolio" as DataSourceType };
    if (location.startsWith("/clients/")) return { title: "Clients", source: "portfolio" as DataSourceType };
    if (location === "/meetings") return { title: "Calendar", source: "meetings" as DataSourceType };
    if (location === "/analytics") return { title: "Analytics", source: "portfolio" as DataSourceType };
    if (location === "/engagement") return { title: "Engagement", source: "insights" as DataSourceType };
    if (location === "/client-insights") return { title: "Client Insights", source: "insights" as DataSourceType };
    if (location === "/compliance") return { title: "Compliance", source: "tasks" as DataSourceType };
    if (location.startsWith("/admin")) return { title: "Admin", source: null };
    if (location === "/withdrawals") return { title: "Withdrawals", source: "portfolio" as DataSourceType };
    if (location === "/custodial-reporting") return { title: "Custodial Reporting", source: "portfolio" as DataSourceType };
    if (location === "/automations") return { title: "Automations", source: "tasks" as DataSourceType };
    if (location === "/copilot") return { title: "Finn Copilot", source: "fin" as DataSourceType };
    if (location === "/onboarding") return { title: "Onboarding", source: "tasks" as DataSourceType };
    if (location.startsWith("/discovery")) return { title: "Discovery", source: "insights" as DataSourceType };
    if (location === "/research") return { title: "Research Library", source: "insights" as DataSourceType };
    if (location === "/monte-carlo") return { title: "Monte Carlo Engine", source: "calcs" as DataSourceType };
    if (location.startsWith("/calculators") || location.includes("calculator")) return { title: "Calculators", source: "calcs" as DataSourceType };
    if (location === "/reports" || location.startsWith("/reports/")) return { title: "Reports", source: "portfolio" as DataSourceType };
    if (location === "/workflows") return { title: "Workflows", source: "tasks" as DataSourceType };
    if (location === "/profiles" || location.startsWith("/profiles/")) return { title: "Profiles", source: "portfolio" as DataSourceType };
    if (location === "/fact-finders" || location.startsWith("/fact-finders/")) return { title: "Fact Finders", source: "tasks" as DataSourceType };
    if (location === "/tax-strategy") return { title: "Tax Strategy", source: "calcs" as DataSourceType };
    if (location === "/approvals") return { title: "Approvals", source: "tasks" as DataSourceType };
    if (location === "/intake") return { title: "Client Intake", source: "tasks" as DataSourceType };
    if (location === "/review-queue") return { title: "Review Queue", source: "tasks" as DataSourceType };
    if (location === "/calendar") return { title: "Calendar", source: "scheduling" as DataSourceType };
    return { title: "Dashboard", source: "portfolio" as DataSourceType };
  })();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 0",
        position: "sticky",
        top: 0,
        background: P.cream,
        zIndex: 20,
        borderBottom: `1px solid ${P.creamMd}`,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Serif style={{ fontSize: 22, fontWeight: 600, color: P.ink }}>{pageTitle}</Serif>
        {pageSource && <DataSourceBadge source={pageSource} />}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <CommandPaletteTrigger />
        {user && (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              background: P.navy,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 11,
              fontWeight: 600,
              color: P.nText,
            }}
          >
            {user.name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("") || "?"}
          </div>
        )}
      </div>
    </div>
  );
}

function SSEProvider() {
  useSSEEvents();
  return null;
}

function AppLayout() {
  return (
    <DiagnosticProvider>
    <NavPageTabsProvider>
    <CommandPaletteProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
        data-testid="link-skip-to-content"
      >
        Skip to content
      </a>
      <div className="grain" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: P.cream }}>
        <style>{`.grain { flex-direction: column !important; }`}</style>
        <NavRail />
        <main
          id="main-content"
          style={{
            flex: 1,
            marginLeft: 0,
            padding: "0 40px 48px",
            overflow: "auto",
          }}
        >
          <StickyHeader />
          <Breadcrumbs />
          <CommandPalette />
          <Router />
        </main>
        <NavigationTracker />
        <SSEProvider />
        <FeedbackWidget />
        <NpsSurvey />
        <FinnSidecar />
        <OnboardingWalkthrough />
        <GlobalDiagnosticPanel />
      </div>
    </CommandPaletteProvider>
    </NavPageTabsProvider>
    </DiagnosticProvider>
  );
}

function AuthGate() {
  const { user, isLoading } = useAuth();
  const location = usePathname();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: P.cream }}>
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (!user) {
    if (location === "/signup") {
      return <Signup />;
    }
    return <Login />;
  }

  return <AppLayout />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ErrorBoundary level="root">
            <AuthProvider>
              <AuthGate />
            </AuthProvider>
          </ErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
