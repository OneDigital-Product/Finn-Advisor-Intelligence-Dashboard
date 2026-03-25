"use client";

import { useAuth } from "@/hooks/use-auth";
import { NavRail, NavPageTabsProvider } from "@/components/app-sidebar";
import { CommandPalette, CommandPaletteTrigger, CommandPaletteProvider } from "@/components/command-palette";
import { FeedbackWidget } from "@/components/feedback-widget";
import { DiagnosticProvider } from "@/contexts/diagnostic-context";
import { GlobalDiagnosticPanel } from "@/components/global-diagnostic-panel";
import { NpsSurvey } from "@/components/nps-survey";
import { FinnSidecar } from "@/components/finn-sidecar";
import { OnboardingWalkthrough } from "@/components/onboarding-walkthrough";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { useSSEEvents } from "@/hooks/use-sse-events";
import { P } from "@/styles/tokens";
import { triggerLogoAnimation } from "@/components/AnimatedLogo";
import { Serif } from "@/components/design/typography";
import { DataSourceBadge, type DataSourceType } from "@/components/design/data-source-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Login from "@/pages/login";
import Signup from "@/pages/signup";

function SSEProvider() {
  useSSEEvents();
  return null;
}

function StickyHeader() {
  const pathname = usePathname();
  const { user } = useAuth();

  const { title: pageTitle, source: pageSource } = useMemo(() => {
    if (pathname === "/") return { title: "My Day", source: "portfolio" as DataSourceType };
    if (pathname === "/clients") return { title: "Clients", source: "portfolio" as DataSourceType };
    if (pathname.startsWith("/clients/")) return { title: "Clients", source: "portfolio" as DataSourceType };
    if (pathname === "/meetings") return { title: "Calendar", source: "meetings" as DataSourceType };
    if (pathname === "/analytics") return { title: "Analytics", source: "portfolio" as DataSourceType };
    if (pathname === "/engagement") return { title: "Engagement", source: "insights" as DataSourceType };
    if (pathname === "/client-insights") return { title: "Client Insights", source: "insights" as DataSourceType };
    if (pathname === "/compliance") return { title: "Compliance", source: "tasks" as DataSourceType };
    if (pathname.startsWith("/admin")) return { title: "Admin", source: null };
    if (pathname === "/withdrawals") return { title: "Withdrawals", source: "portfolio" as DataSourceType };
    if (pathname === "/custodial-reporting") return { title: "Custodial Reporting", source: "portfolio" as DataSourceType };
    if (pathname === "/automations") return { title: "Automations", source: "tasks" as DataSourceType };
    if (pathname === "/copilot") return { title: "Finn Copilot", source: "fin" as DataSourceType };
    if (pathname === "/onboarding") return { title: "Onboarding", source: "tasks" as DataSourceType };
    if (pathname.startsWith("/discovery")) return { title: "Discovery", source: "insights" as DataSourceType };
    if (pathname === "/research") return { title: "Research Library", source: "insights" as DataSourceType };
    if (pathname === "/monte-carlo") return { title: "Monte Carlo Engine", source: "calcs" as DataSourceType };
    if (pathname.startsWith("/calculators") || pathname.includes("calculator")) return { title: "Calculators", source: "calcs" as DataSourceType };
    if (pathname === "/reports" || pathname.startsWith("/reports/")) return { title: "Reports", source: "portfolio" as DataSourceType };
    if (pathname === "/workflows") return { title: "Workflows", source: "tasks" as DataSourceType };
    if (pathname === "/profiles" || pathname.startsWith("/profiles/")) return { title: "Profiles", source: "portfolio" as DataSourceType };
    if (pathname === "/fact-finders" || pathname.startsWith("/fact-finders/")) return { title: "Fact Finders", source: "tasks" as DataSourceType };
    if (pathname === "/tax-strategy") return { title: "Tax Strategy", source: "calcs" as DataSourceType };
    if (pathname === "/approvals") return { title: "Approvals", source: "tasks" as DataSourceType };
    if (pathname === "/intake") return { title: "Client Intake", source: "tasks" as DataSourceType };
    if (pathname === "/review-queue") return { title: "Review Queue", source: "tasks" as DataSourceType };
    if (pathname === "/calendar") return { title: "Calendar", source: "scheduling" as DataSourceType };
    return { title: "Dashboard", source: "portfolio" as DataSourceType };
  }, [pathname]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 0",
        position: "sticky",
        top: 0,
        background: "#0f1419",
        zIndex: 20,
        borderBottom: "1px solid #2D3748",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Serif style={{ fontSize: 22, fontWeight: 600, color: "#FFFFFF" }}>{pageTitle}</Serif>
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
              background: "#00344F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 11,
              fontWeight: 600,
              color: "#FFFFFF",
            }}
          >
            {user.name?.split(" ").map((w: string) => w[0]).slice(0, 2).join("") || "?"}
          </div>
        )}
      </div>
    </div>
  );
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (user?.type === "advisor" && user.onboardingCompleted === false && pathname !== "/onboarding") {
      router.push("/onboarding");
    }
  }, [user, pathname, router]);

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  // Prevent login page flash: never show Login until auth has had time to resolve.
  // sessionStorage tracks whether user was authenticated in this browser session.
  // hydrated flag ensures we wait at least one client render cycle before deciding.
  const wasAuthenticated = useRef(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after first client render — prevents SSR/hydration mismatch
    setHydrated(true);
  }, []);

  if (typeof window !== "undefined") {
    if (user) {
      wasAuthenticated.current = true;
      try { sessionStorage.setItem("od-was-auth", "1"); } catch {}
    } else if (!wasAuthenticated.current) {
      try { wasAuthenticated.current = sessionStorage.getItem("od-was-auth") === "1"; } catch {}
    }
  }

  // Show skeleton while auth is resolving
  if (isLoading || !hydrated || user === undefined || (user === null && wasAuthenticated.current)) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0f1419" }}>
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (user === null) {
    return <Login />;
  }

  return (
    <DiagnosticProvider>
    <NavPageTabsProvider>
    <CommandPaletteProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <style>{`.grain { flex-direction: column !important; }`}</style>
      <div className="grain" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", maxWidth: "100vw", background: "#0f1419", overflow: "hidden" }}>
        <main
          id="main-content"
          onClick={() => triggerLogoAnimation("wiggle")}
          style={{
            flex: 1,
            marginLeft: 0,
            padding: "0 clamp(16px, 3vw, 40px) 48px",
            overflow: "auto",
            overflowX: "hidden",
            minWidth: 0,
          }}
        >
          <StickyHeader />
          <Breadcrumbs />
          <CommandPalette />
          <OnboardingGate>
            {children}
          </OnboardingGate>
        </main>
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
