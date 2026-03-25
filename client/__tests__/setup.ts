import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
  useRoute: () => [true, {}],
  useParams: () => ({}),
  Link: ({ children }: any) => children,
  Route: ({ children }: any) => children,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false, error: null }),
  useMutation: (config: any) => {
    return {
      mutate: (...args: any[]) => {
        if (config?.mutationFn) {
          const p = config.mutationFn(...args).then(
            (data: any) => { if (config?.onSuccess) config.onSuccess(data); },
            (err: any) => { if (config?.onError) config.onError(err); }
          );
          (globalThis as any).__lastMutationPromise = p;
        }
      },
      mutateAsync: (...args: any[]) => {
        if (config?.mutationFn) {
          const p = config.mutationFn(...args).then((data: any) => {
            if (config?.onSuccess) config.onSuccess(data);
            return data;
          });
          (globalThis as any).__lastMutationPromise = p;
          return p;
        }
        return Promise.resolve();
      },
      isPending: false,
      isError: false,
      error: null,
    };
  },
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: any) => children,
}));

const mockResultsByEndpoint: Record<string, any> = {
  "/api/calculators/rmd": {
    results: {
      currentYearRMD: 45000,
      rmdPercentage: 3.65,
      lifeExpectancyFactor: 27.4,
      projections: [
        { year: 2026, age: 73, rmdAmount: 43796, accountBalance: 1200000, withdrawalPercentage: 3.65, qcdAmount: 0, taxableDistribution: 43796, taxSavingsFromQCD: 0 },
        { year: 2027, age: 74, rmdAmount: 45113, accountBalance: 1190000, withdrawalPercentage: 3.79, qcdAmount: 0, taxableDistribution: 45113, taxSavingsFromQCD: 0 },
      ],
      notes: ["RMD calculated using IRS Uniform Lifetime Table"],
    },
  },
  "/api/calculators/budget": {
    results: {
      mode: "post_retirement",
      summaryByScenario: {
        "Base Case": {
          totalAnnualExpenses: 96000, totalAnnualIncome: 120000,
          requiredPortfolioWithdrawal: 0, surplus: 24000,
          safeWithdrawalRate: 0.04, status: "sustainable",
          recommendation: "On track for retirement",
          yearsUntilDepletion: null, accountBalanceAtEnd: 1200000,
        },
      },
      projections: {
        "Base Case": [
          { year: 2026, age: 65, portfolioBalance: 1500000, annualExpenses: 96000, requiredWithdrawal: 0, newBalance: 1500000 },
        ],
      },
      expenseSummary: { categories: [] },
      notes: [],
    },
  },
  "/api/calculators/roth-conversion": {
    results: {
      taxOnConversion: 24000,
      effectiveTaxRate: 0.24,
      breakevenYears: 8,
      netBenefit: 45000,
      marginalBracketBeforeConversion: 0.22,
      marginalBracketAfterConversion: 0.24,
      bracketImpact: {
        incomeBeforeConversion: 85000,
        incomeAfterConversion: 185000,
        taxBeforeConversion: 14500,
        taxAfterConversion: 38500,
        additionalTax: 24000,
      },
      projections: [
        { year: 1, age: 56, traditionalBalance: 400000, rothBalance: 100000, totalBalance: 500000 },
      ],
      notes: [],
      noConversionEndBalance: 1800000,
      withConversionEndBalance: 1845000,
    },
  },
  "/api/calculators/asset-location": {
    results: {
      recommendations: [
        { name: "S&P 500 ETF", ticker: "SPY", marketValue: 500000, currentAccountType: "taxable", recommendedAccountType: "taxable", needsMove: false, estimatedAnnualTaxSavings: 0, reason: "Tax-efficient" },
        { name: "Bond Fund", ticker: "BND", marketValue: 300000, currentAccountType: "taxable", recommendedAccountType: "traditional", needsMove: true, estimatedAnnualTaxSavings: 2500, reason: "Interest income" },
      ],
      estimatedAnnualTaxSavings: 2500,
      estimatedLifetimeSavings: 75000,
      summary: { holdingsToMove: 1, holdingsAnalyzed: 2, taxableAllocated: 500000, traditionalAllocated: 300000, rothAllocated: 200000 },
      notes: [],
    },
  },
  "/api/calculators/tax-bracket": {
    results: {
      currentYear: {
        totalTax: 21942,
        effectiveRate: 0.1463,
        marginalRate: 0.24,
        bracketHeadroom: 41425,
        bracketBreakdown: [
          { bracket: "10%", rate: 0.10, rangeMin: 0, rangeMax: 11600, taxableInBracket: 11600, taxInBracket: 1160 },
          { bracket: "12%", rate: 0.12, rangeMin: 11600, rangeMax: 47150, taxableInBracket: 35550, taxInBracket: 4266 },
          { bracket: "22%", rate: 0.22, rangeMin: 47150, rangeMax: 100525, taxableInBracket: 53375, taxInBracket: 11742 },
          { bracket: "24%", rate: 0.24, rangeMin: 100525, rangeMax: 191950, taxableInBracket: 49475, taxInBracket: 11874 },
        ],
      },
      projections: [
        { year: 1, grossIncome: 200000, taxableIncome: 185800, federalTax: 21942, totalTax: 21942, effectiveRate: 0.1097, marginalRate: 0.24 },
      ],
      notes: [],
    },
  },
  "/api/calculators/qsbs": {
    results: {
      analyses: [
        {
          companyName: "TechStartup Inc",
          ticker: "TECH",
          status: "qualified",
          costBasis: 100000,
          currentValue: 5000000,
          holdingPeriodMet: true,
          daysHeld: 1825,
          daysRemaining: 0,
          potentialExclusion: 5000000,
          estimatedTaxSavings: 1190000,
          gain: 4900000,
          unrealizedGain: 4900000,
          excludableGain: 4900000,
          milestones: [
            { label: "1-Year Hold", date: "2021-01-15", completed: true, daysAway: null },
            { label: "5-Year Hold", date: "2025-01-15", completed: true, daysAway: null },
          ],
          eligibilityIssues: [],
        },
      ],
      totalTaxSavings: 1190000,
      totalExcludableGain: 4900000,
      summary: { qualifiedCount: 1, pendingCount: 0, ineligibleCount: 0, totalPositions: 1, totalEstimatedTaxSavings: 1190000, totalExcludableGain: 4900000, qualifiedPositions: 1, pendingPositions: 0 },
      alerts: [],
      notes: ["Section 1202 exclusion applies to qualified small business stock held > 5 years"],
    },
  },
};

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn().mockImplementation((_method: string, url: string) => {
    const mockData = mockResultsByEndpoint[url] || { results: {} };
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockData),
    });
  }),
  queryClient: {
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("recharts", () => {
  const createMockComponent = (name: string) => {
    return ({ children }: any) => children || null;
  };
  return {
    ResponsiveContainer: createMockComponent("ResponsiveContainer"),
    AreaChart: createMockComponent("AreaChart"),
    Area: createMockComponent("Area"),
    LineChart: createMockComponent("LineChart"),
    Line: createMockComponent("Line"),
    BarChart: createMockComponent("BarChart"),
    Bar: createMockComponent("Bar"),
    XAxis: createMockComponent("XAxis"),
    YAxis: createMockComponent("YAxis"),
    CartesianGrid: createMockComponent("CartesianGrid"),
    Tooltip: createMockComponent("Tooltip"),
    Legend: createMockComponent("Legend"),
    RechartsTooltip: createMockComponent("RechartsTooltip"),
  };
});

vi.mock("@/lib/retirement-pdf", () => ({
  generateRetirementPDF: vi.fn(),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Element.prototype.scrollIntoView = vi.fn();

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverMock as any;
