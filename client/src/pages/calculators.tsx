import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, BarChart3, ArrowRightLeft, MapPin, Receipt, Building2, Shield, PieChart, Heart, Umbrella } from "lucide-react";

const calculators = [
  {
    id: "rmd",
    name: "RMD Calculator",
    description: "Calculate Required Minimum Distributions for retirement accounts using IRS Uniform Lifetime Tables",
    icon: DollarSign,
    route: "/calculators/rmd",
    status: "available",
    category: "retirement",
  },
  {
    id: "budget",
    name: "Budget Calculator",
    description: "Plan retirement income vs. expenses with scenario analysis and withdrawal strategy",
    icon: BarChart3,
    route: "/calculators/budget",
    status: "available",
    category: "retirement",
  },
  {
    id: "roth-conversion",
    name: "Roth Conversion Optimizer",
    description: "Model multi-year Roth conversions with bracket impact, breakeven analysis, and conversion optimization",
    icon: ArrowRightLeft,
    route: "/calculators/roth-conversion",
    status: "available",
    category: "tax",
  },
  {
    id: "asset-location",
    name: "Asset Location Optimizer",
    description: "Optimize asset placement across taxable, tax-deferred, and tax-free accounts for maximum after-tax return",
    icon: MapPin,
    route: "/calculators/asset-location",
    status: "available",
    category: "tax",
  },
  {
    id: "tax-bracket",
    name: "Tax Bracket Projection",
    description: "Visualize current-year and forward brackets with income scenario sliders and marginal/effective rate display",
    icon: Receipt,
    route: "/calculators/tax-bracket",
    status: "available",
    category: "tax",
  },
  {
    id: "qsbs",
    name: "QSBS Tracker",
    description: "Track qualified small business stock positions, holding periods, and calculate Section 1202 exclusion eligibility",
    icon: Building2,
    route: "/calculators/qsbs",
    status: "available",
    category: "tax",
  },
  {
    id: "concentrated-stock",
    name: "Concentrated Stock Analyzer",
    description: "Model diversification strategies for concentrated positions: staged selling, exchange funds, hedging, and CRT options with tax impact",
    icon: PieChart,
    route: "/calculators/concentrated-stock",
    status: "available",
    category: "tax",
  },
  {
    id: "tax-strategy",
    name: "Tax Strategy Hub",
    description: "Advanced tax optimization: Roth conversions, asset location, bracket projections, QSBS tracking, and QCD modeling",
    icon: Shield,
    route: "/tax-strategy",
    status: "available",
  },
  {
    id: "monte-carlo",
    name: "Monte Carlo Simulator",
    description: "Project portfolio success rate across thousands of market scenarios with stress testing",
    icon: TrendingUp,
    route: "/monte-carlo",
    status: "available",
    category: "retirement",
  },
  {
    id: "ltc-planning",
    name: "Long-Term Care Planner",
    description: "Compare self-insure, traditional LTC, and hybrid policy scenarios with break-even analysis and probability of need",
    icon: Heart,
    route: "/calculators/ltc-planning",
    status: "available",
    category: "insurance",
  },
  {
    id: "life-insurance-gap",
    name: "Life Insurance Gap Analysis",
    description: "Calculate income replacement, estate liquidity, and education funding gaps with coverage recommendations",
    icon: Umbrella,
    route: "/calculators/life-insurance-gap",
    status: "available",
    category: "insurance",
  },
];

export default function CalculatorsPage() {
  const router = useRouter();

  const taxCalcs = calculators.filter(c => c.category === "tax");
  const retirementCalcs = calculators.filter(c => c.category === "retirement");
  const insuranceCalcs = calculators.filter(c => c.category === "insurance");

  const renderCalcCard = (calc: typeof calculators[0]) => {
    const Icon = calc.icon;
    const isAvailable = calc.status === "available";
    return (
      <Card
        key={calc.id}
        className={`transition-all ${isAvailable ? "hover:shadow-md cursor-pointer" : "opacity-60"}`}
        onClick={() => isAvailable && router.push(calc.route)}
        data-testid={`card-calculator-${calc.id}`}
      >
        <CardContent className="pt-6 pb-5 px-6">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-lg ${isAvailable ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              <Icon className="w-6 h-6" />
            </div>
            {!isAvailable && (
              <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
            )}
          </div>
          <h2 className="text-lg font-semibold mb-1.5">{calc.name}</h2>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{calc.description}</p>
          <Button
            className="w-full"
            disabled={!isAvailable}
            variant={isAvailable ? "default" : "secondary"}
            onClick={(e) => {
              e.stopPropagation();
              if (isAvailable) router.push(calc.route);
            }}
            data-testid={`button-open-${calc.id}`}
          >
            {isAvailable ? "Open Calculator" : "Coming Soon"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Financial Calculators</h1>
        <p className="text-sm text-muted-foreground mt-1">Specialized tools for tax strategy, retirement planning, insurance, and analysis</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" data-testid="text-section-tax">
          <Receipt className="w-5 h-5 text-primary" /> Tax Strategy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {taxCalcs.map(renderCalcCard)}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" data-testid="text-section-retirement">
          <DollarSign className="w-5 h-5 text-primary" /> Retirement Planning
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {retirementCalcs.map(renderCalcCard)}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" data-testid="text-section-insurance">
          <Shield className="w-5 h-5 text-primary" /> Insurance & Protection
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insuranceCalcs.map(renderCalcCard)}
        </div>
      </div>
    </div>
  );
}
