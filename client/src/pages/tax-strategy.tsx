import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, MapPin, BarChart3, Shield, Heart, DollarSign, ArrowRight,
} from "lucide-react";

const taxTools = [
  {
    id: "roth-conversion",
    name: "Roth Conversion Analyzer",
    description: "Multi-year projection showing tax impact of conversions at various amounts, breakeven analysis, and optimal conversion ladder",
    icon: TrendingUp,
    route: "/tax-strategy/roth-conversion",
    status: "available",
    category: "Conversion",
  },
  {
    id: "asset-location",
    name: "Asset Location Optimizer",
    description: "Recommends which assets belong in which account type (taxable vs. tax-deferred vs. Roth) for maximum after-tax return",
    icon: MapPin,
    route: "/tax-strategy/asset-location",
    status: "available",
    category: "Optimization",
  },
  {
    id: "tax-brackets",
    name: "Tax Bracket Projection",
    description: "Visualizes current and projected tax brackets with income layering from different sources and what-if scenarios",
    icon: BarChart3,
    route: "/tax-strategy/tax-brackets",
    status: "available",
    category: "Planning",
  },
  {
    id: "qsbs",
    name: "QSBS Tracker",
    description: "Tracks qualified small business stock holding periods, calculates Section 1202 exclusion eligibility, and alerts on approaching milestones",
    icon: Shield,
    route: "/tax-strategy/qsbs",
    status: "available",
    category: "Tracking",
  },
  {
    id: "qcd",
    name: "QCD Modeling (via RMD)",
    description: "Qualified Charitable Distribution planning integrated with RMD calculations — model tax savings from directing RMDs to charity",
    icon: Heart,
    route: "/calculators/rmd",
    status: "available",
    category: "Charitable",
  },
  {
    id: "tax-harvesting",
    name: "Tax-Loss Harvesting",
    description: "Automated detection of tax-loss harvesting opportunities across client portfolios",
    icon: DollarSign,
    route: "/calculators",
    status: "available",
    category: "Harvesting",
  },
];

export default function TaxStrategyPage() {
  const router = useRouter();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Tax Strategy Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Advanced tax optimization tools for Roth conversions, asset location, bracket planning, and more
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {taxTools.map((tool) => {
          const Icon = tool.icon;
          const isAvailable = tool.status === "available";
          return (
            <Card
              key={tool.id}
              className={`transition-all ${isAvailable ? "hover:shadow-md cursor-pointer" : "opacity-60"}`}
              onClick={() => isAvailable && router.push(tool.route)}
              data-testid={`card-tax-tool-${tool.id}`}
            >
              <CardContent className="pt-6 pb-5 px-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2.5 rounded-lg ${isAvailable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{tool.category}</Badge>
                </div>
                <h2 className="text-lg font-semibold mb-1.5">{tool.name}</h2>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{tool.description}</p>
                <Button
                  className="w-full"
                  disabled={!isAvailable}
                  variant={isAvailable ? "default" : "secondary"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAvailable) router.push(tool.route);
                  }}
                  data-testid={`button-open-${tool.id}`}
                >
                  {isAvailable ? (
                    <>Open Tool <ArrowRight className="w-4 h-4 ml-1" /></>
                  ) : "Coming Soon"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
