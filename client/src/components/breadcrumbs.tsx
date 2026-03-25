import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";

const ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  clients: "Clients",
  meetings: "Meetings",
  analytics: "Analytics",
  compliance: "Compliance",
  admin: "Settings",
  workflows: "Workflows",
  profiles: "Profiles",
  reports: "Reports",
  calculators: "Calculators",
  approvals: "Approvals",
  "fact-finders": "Fact Finders",
  intake: "Intake",
  "review-queue": "Review Queue",
  "fin-copilot": "Fin Copilot",
  discovery: "Discovery",
  withdrawals: "Withdrawals",
  "custodial-reporting": "Custodial Reporting",
  engagement: "Engagement",
  research: "Research",
  "monte-carlo": "Monte Carlo",
  onboarding: "Onboarding",
};

const CALCULATOR_LABELS: Record<string, string> = {
  rmd: "RMD Calculator",
  budget: "Budget Calculator",
  "roth-conversion": "Roth Conversion",
  "asset-location": "Asset Location",
  "tax-bracket": "Tax Bracket",
  qsbs: "QSBS Tracker",
  "concentrated-stock": "Concentrated Stock",
  "ltc-planning": "LTC Planning",
  "life-insurance-gap": "Life Insurance Gap",
};

function useClientName(clientId: string | null) {
  const { data: raw } = useQuery<any>({
    queryKey: ["/api/clients"],
    enabled: !!clientId,
  });
  const data = Array.isArray(raw) ? raw : raw?.clients || [];
  if (!clientId || !data.length) return null;
  const client = data.find((c: any) => c.id === clientId);
  return client?.name || null;
}

export function Breadcrumbs() {
  const location = usePathname();
  const segments = location.split("/").filter(Boolean);

  const clientId = segments[0] === "clients" && segments[1] ? segments[1] : null;
  const resolvedName = useClientName(clientId);

  if (segments.length === 0) return null;

  const crumbs: { label: string; href?: string }[] = [
    { label: "Home", href: "/" },
  ];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const path = "/" + segments.slice(0, i + 1).join("/");
    const isLast = i === segments.length - 1;

    if (seg === "clients" && segments[i + 1]) {
      crumbs.push({ label: "Clients", href: "/clients" });
    } else if (i > 0 && segments[i - 1] === "clients") {
      crumbs.push({ label: resolvedName || "Client", href: isLast ? undefined : path });
    } else if (seg === "calculators" && segments[i + 1]) {
      crumbs.push({ label: "Calculators", href: "/calculators" });
    } else if (i > 0 && segments[i - 1] === "calculators") {
      const calcLabel = CALCULATOR_LABELS[seg] || seg;
      crumbs.push({ label: calcLabel });
    } else if (seg === "reports" && segments[i + 1]) {
      crumbs.push({ label: "Reports", href: "/reports" });
    } else if (i > 0 && segments[i - 1] === "reports") {
      crumbs.push({ label: "Report Editor" });
    } else if (seg === "fact-finders" && segments[i + 1]) {
      crumbs.push({ label: "Fact Finders", href: "/fact-finders" });
    } else if (i > 0 && segments[i - 1] === "fact-finders") {
      crumbs.push({ label: "Fill" });
    } else {
      const label = ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
      crumbs.push({ label, href: isLast ? undefined : path });
    }
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground mb-3" data-testid="breadcrumbs">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
          {i === 0 ? (
            <NextLink href={crumb.href || "/"}>
              <span className="hover:text-foreground transition-colors cursor-pointer flex items-center gap-1">
                <Home className="w-3 h-3" />
                <span className="sr-only">Home</span>
              </span>
            </NextLink>
          ) : crumb.href ? (
            <NextLink href={crumb.href}>
              <span className="hover:text-foreground transition-colors cursor-pointer">{crumb.label}</span>
            </NextLink>
          ) : (
            <span className="text-foreground font-medium" aria-current="page">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
