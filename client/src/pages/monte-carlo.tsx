import { useState, useCallback, useMemo } from "react";
import { P } from "@/styles/tokens";
import { formatCurrency as fmt } from "@/lib/format";
import { Activity, TrendingUp, TrendingDown, Target, Shield, Gauge, PlayCircle, BarChart3, DollarSign, Clock, Percent, Home, GraduationCap, Briefcase, FileText, HeartPulse, Palmtree, X, Check, AlertTriangle, ChevronRight } from "lucide-react";
import { CassidyAnalysisButton } from "@/components/cassidy/cassidy-analysis-button";
import { CalculatorInterpretation } from "@/components/cassidy/calculator-interpretation";
import { InfoTip } from "@/components/info-tip";

const ASSET_CLASSES: Record<string, { mu: number; sigma: number; label: string }> = {
  "US Large Cap": { mu: 0.103, sigma: 0.161, label: "US Large Cap Equity" },
  "US Small Cap": { mu: 0.118, sigma: 0.213, label: "US Small Cap Equity" },
  "Intl Developed": { mu: 0.082, sigma: 0.171, label: "Intl Developed Equity" },
  "Emerging Markets": { mu: 0.095, sigma: 0.231, label: "Emerging Markets" },
  "US Bonds": { mu: 0.035, sigma: 0.063, label: "US Aggregate Bonds" },
  "Short-Term Bonds": { mu: 0.028, sigma: 0.031, label: "Short-Term Bonds" },
  "TIPS": { mu: 0.022, sigma: 0.058, label: "TIPS / Inflation-Protected" },
  "REITs": { mu: 0.089, sigma: 0.191, label: "Real Estate (REITs)" },
  "Private Equity": { mu: 0.138, sigma: 0.249, label: "Private Equity (est.)" },
  "Cash": { mu: 0.0475, sigma: 0.008, label: "Cash / Money Market" },
};

function gaussianRandom(mean = 0, std = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

interface SimParams {
  initialPortfolio: number;
  allocationWeights: Record<string, number>;
  inflationRate: number;
  horizonYears: number;
  cashflows: CashflowEntry[];
  taxRate: number;
  rebalanceAnnually: boolean;
  withdrawalRule: string;
  floorAmount: number;
  ceilingMultiplier: number;
  socialSecurityAge: number;
  socialSecurityAmount: number;
  rmdStartAge: number;
  currentAge: number;
  retirementAge: number;
  baseWithdrawal: number;
  bucketsEnabled: boolean;
  bucket1Months: number;
  stressTest: string | null;
}

interface SimResult {
  successRate: number;
  successCount: number;
  numScenarios: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  confidenceAge: number;
  yearlyBands: BandEntry[];
  avgFailYear: number;
  portfolioMu: number;
  portfolioSigma: number;
  medianPath: number[];
}

interface BandEntry {
  year: number;
  age: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface CashflowEntry {
  id: number;
  year: number;
  amount: number;
  type: string;
  label: string;
  taxable: boolean;
  adjustForInflation: boolean;
}

function runMonteCarloEngine(params: SimParams, numScenarios = 5000): SimResult {
  const {
    initialPortfolio, allocationWeights, inflationRate, horizonYears,
    cashflows, taxRate, withdrawalRule, floorAmount,
    ceilingMultiplier, socialSecurityAge, socialSecurityAmount,
    rmdStartAge, currentAge, retirementAge, stressTest,
  } = params;

  let portfolioMu = 0;
  let portfolioSigmaSq = 0;
  const weights = Object.entries(allocationWeights);
  weights.forEach(([cls, w]) => {
    const ac = ASSET_CLASSES[cls];
    if (ac) portfolioMu += w * ac.mu;
  });
  weights.forEach(([cls1, w1]) => {
    weights.forEach(([cls2, w2]) => {
      const ac1 = ASSET_CLASSES[cls1], ac2 = ASSET_CLASSES[cls2];
      if (!ac1 || !ac2) return;
      const corr = cls1 === cls2 ? 1.0 : (
        (cls1.includes("Bond") && cls2.includes("Bond")) ? 0.82 :
        (cls1.includes("Equity") || cls1.includes("Cap") || cls1.includes("Intl") || cls1.includes("Emerging")) &&
        (cls2.includes("Equity") || cls2.includes("Cap") || cls2.includes("Intl") || cls2.includes("Emerging")) ? 0.72 :
        (cls1.includes("Bond") || cls2.includes("Bond")) ? -0.15 :
        0.35
      );
      portfolioSigmaSq += w1 * w2 * ac1.sigma * ac2.sigma * corr;
    });
  });
  const portfolioSigma = Math.sqrt(portfolioSigmaSq);
  const baseDrift = portfolioMu - 0.5 * portfolioSigma * portfolioSigma;

  const results: { finalValue: number; failed: boolean; failYear: number | null; totalWithdrawn: number; path: number[] }[] = [];

  for (let s = 0; s < numScenarios; s++) {
    let portfolio = initialPortfolio;
    const path = [portfolio];
    let failed = false;
    let failYear: number | null = null;
    let totalWithdrawn = 0;
    let inflationFactor = 1;

    for (let yr = 1; yr <= horizonYears; yr++) {
      const age = currentAge + yr;
      const isRetired = age >= retirementAge;

      let yearDrift = baseDrift;
      let yearSigma = portfolioSigma;
      if (stressTest === "2008" && yr <= 2) {
        yearDrift += -0.12;
        yearSigma *= 1.8;
      } else if (stressTest === "sequence" && yr <= 5) {
        yearDrift += -0.08;
        yearSigma *= 1.4;
      }

      const annualReturn = Math.exp(yearDrift + yearSigma * gaussianRandom(0, 1)) - 1;
      portfolio *= (1 + annualReturn);

      let yearInflation = inflationRate;
      if (stressTest === "inflation" && yr <= 8) {
        yearInflation = 0.07 + gaussianRandom(0, 0.01);
      }
      inflationFactor *= (1 + yearInflation + gaussianRandom(0, 0.005));

      let ssIncome = 0;
      if (age >= socialSecurityAge) ssIncome = socialSecurityAmount * inflationFactor;

      let netCashflow = 0;
      cashflows.forEach(cf => {
        if (cf.year === yr) {
          const adjustedAmount = cf.adjustForInflation ? cf.amount * inflationFactor : cf.amount;
          if (cf.type === "withdrawal" || cf.type === "expense") {
            const taxImpact = cf.taxable ? adjustedAmount * taxRate : 0;
            netCashflow -= (adjustedAmount + taxImpact);
          } else {
            netCashflow += adjustedAmount;
          }
        }
      });

      let annualWithdrawal = 0;
      if (isRetired) {
        if (withdrawalRule === "fixed") {
          annualWithdrawal = params.baseWithdrawal * inflationFactor;
        } else if (withdrawalRule === "flexible") {
          const targetWithdrawal = params.baseWithdrawal * inflationFactor;
          const withdrawalRate = targetWithdrawal / portfolio;
          if (withdrawalRate > params.baseWithdrawal / initialPortfolio * 1.25) {
            annualWithdrawal = Math.max(floorAmount * inflationFactor, targetWithdrawal * 0.9);
          } else if (withdrawalRate < params.baseWithdrawal / initialPortfolio * 0.75) {
            annualWithdrawal = Math.min(ceilingMultiplier * floorAmount * inflationFactor, targetWithdrawal * 1.1);
          } else {
            annualWithdrawal = targetWithdrawal;
          }
        } else if (withdrawalRule === "floor-upside") {
          const floorAdjusted = floorAmount * inflationFactor;
          const upside = Math.max(0, portfolio * 0.04 - floorAdjusted) * 0.5;
          annualWithdrawal = floorAdjusted + upside;
        }
      }

      const rmdTable: Record<number, number> = { 73: 27.4, 74: 26.5, 75: 25.5, 76: 24.6, 77: 23.7, 78: 22.9, 79: 22.0, 80: 21.1, 85: 16.0, 90: 11.4, 95: 7.8 };
      if (withdrawalRule === "rmd" && age >= rmdStartAge) {
        const divisor = rmdTable[age] || Math.max(1, 30 - (age - 70));
        annualWithdrawal = portfolio / divisor;
      }

      const netFlow = annualWithdrawal - netCashflow - ssIncome;
      portfolio -= netFlow;
      if (netFlow > 0) totalWithdrawn += netFlow;

      if (portfolio <= 0) {
        if (!failed) { failed = true; failYear = yr; }
        portfolio = 0;
      }
      path.push(Math.max(0, portfolio));
    }

    results.push({ finalValue: portfolio, failed, failYear, totalWithdrawn, path });
  }

  const sorted = [...results].sort((a, b) => a.finalValue - b.finalValue);
  const successCount = results.filter(r => !r.failed).length;
  const successRate = successCount / numScenarios;

  const p10 = sorted[Math.floor(numScenarios * 0.10)].finalValue;
  const p25 = sorted[Math.floor(numScenarios * 0.25)].finalValue;
  const p50 = sorted[Math.floor(numScenarios * 0.50)].finalValue;
  const p75 = sorted[Math.floor(numScenarios * 0.75)].finalValue;
  const p90 = sorted[Math.floor(numScenarios * 0.90)].finalValue;

  const medianIdx = Math.floor(numScenarios * 0.50);
  const medianPath = sorted[medianIdx].path;

  let confidenceAge = currentAge + horizonYears;
  for (let i = 0; i < medianPath.length; i++) {
    if (medianPath[i] <= 0) { confidenceAge = currentAge + i; break; }
  }

  const yearlyBands: BandEntry[] = [];
  for (let yr = 0; yr <= horizonYears; yr++) {
    const yearValues = results.map(r => r.path[yr] || 0).sort((a, b) => a - b);
    yearlyBands.push({
      year: yr,
      age: currentAge + yr,
      p10: yearValues[Math.floor(numScenarios * 0.10)],
      p25: yearValues[Math.floor(numScenarios * 0.25)],
      p50: yearValues[Math.floor(numScenarios * 0.50)],
      p75: yearValues[Math.floor(numScenarios * 0.75)],
      p90: yearValues[Math.floor(numScenarios * 0.90)],
    });
  }

  const failedResults = results.filter(r => r.failed);
  const avgFailYear = failedResults.length > 0
    ? failedResults.reduce((sum, r) => sum + (r.failYear || 0), 0) / failedResults.length
    : 0;

  return {
    successRate, successCount, numScenarios,
    p10, p25, p50, p75, p90,
    confidenceAge, yearlyBands, avgFailYear,
    portfolioMu, portfolioSigma, medianPath,
  };
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function FanChart({ bands, currentAge: _ca }: { bands: BandEntry[]; currentAge: number }) {
  if (!bands || bands.length === 0) return null;

  const width = 700, height = 320;
  const pad = { top: 24, right: 24, bottom: 40, left: 72 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;

  const maxVal = Math.max(...bands.map(b => b.p90)) * 1.05;
  const minVal = 0;
  const xScale = (i: number) => (i / (bands.length - 1)) * W;
  const yScale = (v: number) => H - ((v - minVal) / (maxVal - minVal)) * H;

  const bandPath = (upperKey: keyof BandEntry, lowerKey: keyof BandEntry) => {
    const upper = bands.map((b, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(b[upperKey] as number).toFixed(1)}`).join(" ");
    const lower = [...bands].reverse().map((b, i) => `L${xScale(bands.length - 1 - i).toFixed(1)},${yScale(b[lowerKey] as number).toFixed(1)}`).join(" ");
    return `${upper} ${lower} Z`;
  };
  const linePath = (key: keyof BandEntry) => bands.map((b, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(b[key] as number).toFixed(1)}`).join(" ");

  const yTicks = 5;
  const xStep = Math.max(1, Math.floor(bands.length / 8));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }} role="img" aria-label="Monte Carlo simulation fan chart showing portfolio projection percentiles over time">
      <defs>
        <linearGradient id="fan90" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.grn} stopOpacity={0.3} />
          <stop offset="100%" stopColor={P.grn} stopOpacity={0.05} />
        </linearGradient>
        <linearGradient id="fan75" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.grn} stopOpacity={0.25} />
          <stop offset="100%" stopColor={P.grn} stopOpacity={0.08} />
        </linearGradient>
        <linearGradient id="fan25" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.amb} stopOpacity={0.3} />
          <stop offset="100%" stopColor={P.amb} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = minVal + (maxVal - minVal) * (i / yTicks);
          const y = yScale(v);
          return (
            <g key={i}>
              <line x1={0} y1={y} x2={W} y2={y} stroke={P.odSurf2} strokeWidth="1" />
              <text x={-8} y={y + 4} textAnchor="end" fill={P.nMid} fontSize="11" fontFamily="'DM Mono', monospace">{fmt(v)}</text>
            </g>
          );
        })}
        {bands.filter((_, i) => i % xStep === 0).map((b, i) => (
          <text key={i} x={xScale(i * xStep)} y={H + 20} textAnchor="middle" fill={P.nMid} fontSize="11" fontFamily="'DM Mono', monospace">{b.age}</text>
        ))}
        <path d={bandPath("p90", "p75")} fill="url(#fan90)" />
        <path d={bandPath("p75", "p50")} fill="url(#fan75)" />
        <path d={bandPath("p50", "p25")} fill={`${P.blue}22`} />
        <path d={bandPath("p25", "p10")} fill="url(#fan25)" />
        <path d={linePath("p50")} fill="none" stroke={P.blue} strokeWidth="2.5" strokeLinecap="round" />
        <path d={linePath("p90")} fill="none" stroke={P.grn} strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity={0.8} />
        <path d={linePath("p10")} fill="none" stroke={P.amb} strokeWidth="1.5" strokeDasharray="4 3" strokeOpacity={0.8} />
        <line x1={0} y1={H} x2={W} y2={H} stroke={P.odSurf} strokeWidth="1.5" />
        <text x={W / 2} y={H + 36} textAnchor="middle" fill={P.nMid} fontSize="11">Age</text>
      </g>
    </svg>
  );
}

const TABS = ["Overview", "Allocation", "Cashflows", "Scenarios", "Results"] as const;

const DEFAULT_ALLOCATION: Record<string, number> = {
  "US Large Cap": 0.40,
  "Intl Developed": 0.15,
  "US Small Cap": 0.05,
  "US Bonds": 0.30,
  "Cash": 0.10,
};

const WITHDRAWAL_RULES = [
  { id: "fixed", label: "Fixed Real", desc: "Inflation-adjusted constant withdrawal. Classic 4% rule basis." },
  { id: "flexible", label: "Guyton-Klinger", desc: "Adjusts withdrawals +/-10% based on portfolio performance guardrails." },
  { id: "floor-upside", label: "Floor + Upside", desc: "Guaranteed floor with participation in portfolio growth above it." },
  { id: "rmd", label: "RMD-Based", desc: "Required Minimum Distribution table drives withdrawal amount." },
];

const LIFECYCLE_EVENTS = [
  { id: "home", label: "Home Purchase", icon: Home, defaultAmount: 500000 },
  { id: "child", label: "College Funding", icon: GraduationCap, defaultAmount: 80000 },
  { id: "business", label: "Business Sale", icon: Briefcase, defaultAmount: 2000000 },
  { id: "inheritance", label: "Inheritance", icon: FileText, defaultAmount: 500000 },
  { id: "medical", label: "Major Medical", icon: HeartPulse, defaultAmount: 150000 },
  { id: "vacation", label: "Vacation Home", icon: Palmtree, defaultAmount: 800000 },
];

const card = {
  background: P.odSurf,
  borderRadius: 10,
  padding: 20,
  border: `1px solid ${P.odSurf2}`,
} as const;

const sectionLabel = {
  fontSize: 10,
  color: P.nMid,
  letterSpacing: 2,
  marginBottom: 12,
  textTransform: "uppercase" as const,
  fontFamily: "'DM Mono', monospace",
};

function SliderInput({ label, value, min, max, step, onChange, format, sublabel, accent = P.blue }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
  sublabel?: string; accent?: string;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ color: P.mid, fontSize: 11, letterSpacing: 0.5, fontFamily: "'DM Mono', monospace" }}>{label}</span>
        <span style={{ color: accent, fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{format(value)}</span>
      </div>
      {sublabel && <div style={{ color: P.lt, fontSize: 11, marginBottom: 5 }}>{sublabel}</div>}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        data-testid={`slider-${label.toLowerCase().replace(/\s/g, '-')}`}
        style={{ width: "100%", accentColor: accent, height: 4, cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ color: P.lt, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>{format(min)}</span>
        <span style={{ color: P.lt, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>{format(max)}</span>
      </div>
    </div>
  );
}

export default function MonteCarlo() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("Overview");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SimResult | null>(null);
  const [progress, setProgress] = useState(0);

  const [portfolio, setPortfolio] = useState(2000000);
  const [currentAge, setCurrentAge] = useState(58);
  const [retirementAge, setRetirementAge] = useState(65);
  const [lifeExpectancy, setLifeExpectancy] = useState(92);
  const [annualSpending, setAnnualSpending] = useState(120000);
  const [inflation, setInflation] = useState(0.03);
  const [taxRate, setTaxRate] = useState(0.24);
  const [withdrawalRule, setWithdrawalRule] = useState("flexible");
  const [floorAmount, setFloorAmount] = useState(80000);
  const [ceilingMultiplier, setCeilingMultiplier] = useState(1.5);
  const [ssAge, setSsAge] = useState(70);
  const [ssAmount, setSsAmount] = useState(42000);
  const [numScenarios, setNumScenarios] = useState(5000);
  const [rebalance, setRebalance] = useState(true);
  const [allocation, setAllocation] = useState(DEFAULT_ALLOCATION);
  const [cashflows, setCashflows] = useState<CashflowEntry[]>([
    { id: 1, year: 7, amount: 500000, type: "withdrawal", label: "Vacation Home", taxable: true, adjustForInflation: false },
    { id: 2, year: 12, amount: 80000, type: "withdrawal", label: "College (Child 1)", taxable: false, adjustForInflation: true },
  ]);
  const [stressTest, setStressTest] = useState<string | null>(null);

  const allocTotal = useMemo(() => Object.values(allocation).reduce((s, v) => s + v, 0), [allocation]);
  const horizonYears = lifeExpectancy - currentAge;

  const runSimulation = useCallback(async () => {
    if (Math.abs(allocTotal - 1) > 0.001) return;
    setIsRunning(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 92));
    }, 80);

    await new Promise(resolve => setTimeout(resolve, 50));

    const params: SimParams = {
      initialPortfolio: portfolio,
      allocationWeights: allocation,
      inflationRate: inflation,
      horizonYears,
      cashflows,
      taxRate,
      rebalanceAnnually: rebalance,
      withdrawalRule,
      floorAmount,
      ceilingMultiplier,
      socialSecurityAge: ssAge,
      socialSecurityAmount: ssAmount,
      rmdStartAge: 73,
      currentAge,
      retirementAge,
      baseWithdrawal: annualSpending,
      bucketsEnabled: true,
      bucket1Months: 36,
      stressTest,
    };

    const r = runMonteCarloEngine(params, numScenarios);
    clearInterval(progressInterval);
    setProgress(100);

    setTimeout(() => {
      setResults(r);
      setIsRunning(false);
      setActiveTab("Results");
    }, 300);
  }, [portfolio, allocation, inflation, horizonYears, cashflows, taxRate, rebalance, withdrawalRule, floorAmount, ceilingMultiplier, ssAge, ssAmount, currentAge, retirementAge, annualSpending, numScenarios, stressTest, allocTotal]);

  const successColor = results ? (
    results.successRate >= 0.90 ? P.grn :
    results.successRate >= 0.80 ? P.amb :
    results.successRate >= 0.70 ? P.amb : P.red
  ) : P.blue;

  const successLabel = results ? (
    results.successRate >= 0.90 ? "Strongly On Track" :
    results.successRate >= 0.80 ? "On Track with Buffer" :
    results.successRate >= 0.70 ? "Adjustment Recommended" : "Strategy Review Required"
  ) : "";

  return (
    <div style={{ background: P.odSurf2, minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{
        background: P.odBg,
        padding: "20px 28px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${P.blue}, ${P.bDk})`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Activity size={20} color={P.odSurf} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5, color: P.odSurf, fontFamily: "'Cormorant Garamond', serif" }}>
            Monte Carlo Engine
          </div>
          <div style={{ fontSize: 11, color: P.nMid, letterSpacing: 1.5, fontFamily: "'DM Mono', monospace" }}>
            LOG-NORMAL GBM &middot; CORRELATED ASSETS &middot; 4 WITHDRAWAL STRATEGIES
          </div>
        </div>
        {results && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: successColor, fontFamily: "'DM Mono', monospace" }}>{pct(results.successRate)}</div>
              <div style={{ fontSize: 11, color: successColor, opacity: 0.85 }}>{successLabel}</div>
            </div>
            <div style={{ width: 1, height: 36, background: P.odSurf2 }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: P.bHi, fontFamily: "'DM Mono', monospace" }}>Age {results.confidenceAge}</div>
              <div style={{ fontSize: 11, color: P.nMid }}>Confidence Age (P50)</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", background: P.odSurf, paddingLeft: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} data-testid={`tab-${t.toLowerCase()}`} style={{
            padding: "11px 18px", background: "none", border: "none", cursor: "pointer",
            color: activeTab === t ? P.blue : P.nMid,
            borderBottom: `2px solid ${activeTab === t ? P.blue : "transparent"}`,
            fontSize: 12, letterSpacing: 1, fontFamily: "'DM Mono', monospace", fontWeight: activeTab === t ? 700 : 400,
          }}>{t.toUpperCase()}</button>
        ))}
        <button onClick={runSimulation} disabled={isRunning || Math.abs(allocTotal - 1) > 0.001}
          data-testid="button-run-simulation"
          style={{
            marginLeft: "auto", marginRight: 20, marginTop: 7, marginBottom: 7,
            background: isRunning ? P.odSurf2 : `linear-gradient(135deg, ${P.blue}, ${P.bDk})`,
            border: `1px solid ${Math.abs(allocTotal - 1) > 0.001 ? P.red : P.blue}`,
            borderRadius: 8, padding: "8px 20px", cursor: isRunning ? "default" : "pointer",
            color: Math.abs(allocTotal - 1) > 0.001 ? P.red : P.odSurf,
            fontSize: 12, letterSpacing: 1.5, fontFamily: "'DM Mono', monospace", fontWeight: 700,
            display: "flex", alignItems: "center", gap: 6,
          }}>
          {isRunning ? (
            <><Gauge size={14} /> RUNNING {progress.toFixed(0)}%</>
          ) : (
            <><PlayCircle size={14} /> RUN {numScenarios.toLocaleString()} SCENARIOS</>
          )}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "290px 1fr", minHeight: "calc(100vh - 110px)" }}>
        <div style={{ borderRight: `1px solid ${P.odSurf2}`, padding: 20, overflowY: "auto", background: P.odSurf }}>
          <div style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Client Profile</div>
            <SliderInput label="CURRENT AGE" value={currentAge} min={30} max={80} step={1}
              onChange={setCurrentAge} format={v => `${v} yrs`} />
            <SliderInput label="RETIREMENT AGE" value={retirementAge} min={currentAge + 1} max={80} step={1}
              onChange={setRetirementAge} format={v => `${v} yrs`} accent={P.bDk} />
            <SliderInput label="LIFE EXPECTANCY" value={lifeExpectancy} min={75} max={105} step={1}
              onChange={setLifeExpectancy} format={v => `${v} yrs`} sublabel={`${horizonYears}-year planning horizon`} accent={P.grn} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Portfolio</div>
            <SliderInput label="INITIAL PORTFOLIO" value={portfolio} min={100000} max={10000000} step={50000}
              onChange={setPortfolio} format={fmt} />
            <SliderInput label="ANNUAL SPENDING" value={annualSpending} min={20000} max={500000} step={5000}
              onChange={setAnnualSpending} format={fmt} sublabel={`${pct(annualSpending / portfolio)} initial withdrawal rate`} accent={P.amb} />
            <SliderInput label="INFLATION RATE" value={inflation} min={0.01} max={0.10} step={0.005}
              onChange={setInflation} format={v => `${(v * 100).toFixed(1)}%`} accent={P.red} />
            <SliderInput label="EFFECTIVE TAX RATE" value={taxRate} min={0.10} max={0.45} step={0.01}
              onChange={setTaxRate} format={v => `${(v * 100).toFixed(0)}%`} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Social Security</div>
            <SliderInput label="SS CLAIM AGE" value={ssAge} min={62} max={70} step={1}
              onChange={setSsAge} format={v => `Age ${v}`} sublabel={ssAge === 70 ? "Maximum benefit (+32% vs FRA)" : ssAge < 67 ? "Early - reduced benefit" : "At FRA"} />
            <SliderInput label="ANNUAL SS BENEFIT" value={ssAmount} min={0} max={60000} step={1000}
              onChange={setSsAmount} format={fmt} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={sectionLabel}>Simulation</div>
            <SliderInput label="SCENARIOS" value={numScenarios} min={500} max={10000} step={500}
              onChange={setNumScenarios} format={v => v.toLocaleString()} sublabel="More = higher accuracy, slower" />
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 8 }}>
              <input type="checkbox" checked={rebalance} onChange={e => setRebalance(e.target.checked)}
                data-testid="checkbox-rebalance"
                style={{ accentColor: P.blue }} />
              <span style={{ color: P.mid, fontSize: 12 }}>Annual rebalancing</span>
            </label>
          </div>
        </div>

        <div style={{ overflowY: "auto", padding: "24px 28px" }}>
          {activeTab === "Overview" && (
            <div>
              <div style={sectionLabel}>WHAT MAKES THIS ENGINE DIFFERENT</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
                {[
                  { icon: <BarChart3 size={20} />, title: "Log-Normal GBM", desc: "Geometric Brownian Motion with correlated assets matches how real asset prices evolve.", color: P.blue },
                  { icon: <TrendingUp size={20} />, title: "Correlated Assets", desc: "Equity-bond correlation built-in. Bonds act as ballast in equity crashes.", color: P.grn },
                  { icon: <DollarSign size={20} />, title: "4 Withdrawal Rules", desc: "Fixed real, Guyton-Klinger guardrails, Floor+Upside, RMD-based strategies.", color: P.amb },
                  { icon: <Clock size={20} />, title: "Lifecycle Cashflows", desc: "Model exact years for home purchase, college, business sale, or medical events.", color: P.bDk },
                  { icon: <Activity size={20} />, title: "P10/P50/P90 Bands", desc: "Full distribution visualization. The P10 line is where the real planning conversation lives.", color: P.grn },
                  { icon: <Shield size={20} />, title: "Stress Tests", desc: "Overlay 2008 crashes, 1970s inflation, or sequence-of-returns risk on any scenario.", color: P.red },
                ].map((item, i) => (
                  <div key={i} style={{ ...card, display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ color: item.color, flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                    <div>
                      <div style={{ color: P.ink, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ color: P.mid, fontSize: 12, lineHeight: 1.6 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ ...card, marginBottom: 20 }}>
                <div style={{ color: P.blue, fontWeight: 700, marginBottom: 14, fontSize: 13 }}>Current Plan Parameters</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  {[
                    { label: "Portfolio", value: fmt(portfolio), color: P.blue },
                    { label: "Annual Spend", value: fmt(annualSpending), color: P.amb },
                    { label: "Withdrawal Rate", value: pct(annualSpending / portfolio), color: annualSpending / portfolio > 0.05 ? P.red : annualSpending / portfolio > 0.04 ? P.amb : P.grn },
                    { label: "Horizon", value: `${horizonYears} yrs`, color: P.bDk },
                    { label: "SS at Age", value: `${ssAge} / ${fmt(ssAmount)}/yr`, color: P.grn },
                    { label: "Inflation", value: pct(inflation), color: P.red },
                    { label: "Withdrawal Rule", value: WITHDRAWAL_RULES.find(r => r.id === withdrawalRule)?.label || "", color: P.mid },
                    { label: "Tax Rate", value: pct(taxRate), color: P.mid },
                  ].map((item, i) => (
                    <div key={i} style={{ background: P.odSurf2, borderRadius: 8, padding: 12 }}>
                      <div style={{ color: P.lt, fontSize: 10, letterSpacing: 1, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>{item.label.toUpperCase()}</div>
                      <div style={{ color: item.color, fontWeight: 700, fontSize: 14, fontFamily: "'DM Mono', monospace" }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card, background: P.gL, border: `1px solid ${P.grn}30`, display: "flex", alignItems: "center", gap: 12 }}>
                <PlayCircle size={20} color={P.grn} />
                <div>
                  <div style={{ color: P.grn, fontWeight: 700, fontSize: 13 }}>Ready to Run</div>
                  <div style={{ color: P.gD, fontSize: 12 }}>Configure allocation and cashflows, then click RUN {numScenarios.toLocaleString()} SCENARIOS</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Allocation" && (
            <div>
              <div style={sectionLabel}>PORTFOLIO ALLOCATION</div>
              <div style={{ ...card, marginBottom: 20, border: `1px solid ${Math.abs(allocTotal - 1) > 0.001 ? P.red + '40' : P.odSurf2}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <span style={{ color: P.mid, fontSize: 12 }}>Total Allocation</span>
                  <span style={{ color: Math.abs(allocTotal - 1) > 0.001 ? P.red : P.grn, fontWeight: 700, fontSize: 15, fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 6 }}>
                    {pct(allocTotal)} {Math.abs(allocTotal - 1) > 0.001 ? <AlertTriangle size={14} /> : <Check size={14} />}
                  </span>
                </div>
                {Object.entries(ASSET_CLASSES).map(([cls, data]) => {
                  const w = allocation[cls] || 0;
                  const barColor = cls.includes("Bond") || cls === "Cash" || cls === "TIPS" ? P.blue :
                    cls === "Private Equity" ? P.bDk : cls === "REITs" ? P.amb : P.grn;
                  return (
                    <div key={cls} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: P.dark, fontSize: 12 }}>{data.label}</span>
                        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                          <span style={{ color: P.lt, fontSize: 10, fontFamily: "'DM Mono', monospace" }}>
                            mu={pct(data.mu)} sig={pct(data.sigma)}
                          </span>
                          <span style={{ color: w > 0 ? P.ink : P.lt, fontWeight: 700, fontSize: 13, fontFamily: "'DM Mono', monospace", minWidth: 40, textAlign: "right" }}>
                            {pct(w)}
                          </span>
                        </div>
                      </div>
                      <input type="range" min={0} max={1} step={0.01} value={w}
                        data-testid={`slider-alloc-${cls.toLowerCase().replace(/\s/g, '-')}`}
                        onChange={e => setAllocation(prev => ({ ...prev, [cls]: Number(e.target.value) }))}
                        style={{ width: "100%", accentColor: barColor, height: 4, cursor: "pointer" }} />
                    </div>
                  );
                })}
              </div>

              <div style={card}>
                <div style={{ color: P.mid, fontSize: 11, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>QUICK PRESETS</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { label: "Conservative", alloc: { "US Large Cap": 0.20, "Intl Developed": 0.05, "US Bonds": 0.45, "Short-Term Bonds": 0.15, "TIPS": 0.10, "Cash": 0.05 } },
                    { label: "Moderate", alloc: { "US Large Cap": 0.40, "Intl Developed": 0.10, "US Small Cap": 0.05, "US Bonds": 0.30, "TIPS": 0.05, "Cash": 0.10 } },
                    { label: "Growth", alloc: { "US Large Cap": 0.50, "Intl Developed": 0.20, "US Small Cap": 0.10, "Emerging Markets": 0.05, "US Bonds": 0.10, "REITs": 0.05 } },
                    { label: "Endowment", alloc: { "US Large Cap": 0.30, "Intl Developed": 0.15, "US Small Cap": 0.05, "Private Equity": 0.20, "REITs": 0.10, "US Bonds": 0.15, "TIPS": 0.05 } },
                    { label: "All Equity", alloc: { "US Large Cap": 0.55, "Intl Developed": 0.20, "US Small Cap": 0.10, "Emerging Markets": 0.10, "REITs": 0.05 } },
                  ].map(preset => (
                    <button key={preset.label} onClick={() => setAllocation(preset.alloc as unknown as Record<string, number>)}
                      data-testid={`button-preset-${preset.label.toLowerCase()}`}
                      style={{
                        background: P.odSurf2, border: `1px solid ${P.odBorder}`, borderRadius: 6,
                        padding: "8px 14px", cursor: "pointer", color: P.blue,
                        fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                      }}>
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Cashflows" && (
            <div>
              <div style={sectionLabel}>LIFECYCLE CASHFLOWS</div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: P.mid, fontSize: 11, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>ADD LIFE EVENT</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {LIFECYCLE_EVENTS.map(evt => {
                    const Icon = evt.icon;
                    return (
                      <button key={evt.id} onClick={() => {
                        setCashflows(prev => [...prev, {
                          id: Date.now(),
                          year: retirementAge - currentAge + 2,
                          amount: evt.defaultAmount,
                          type: evt.id === "business" || evt.id === "inheritance" ? "income" : "withdrawal",
                          label: evt.label,
                          taxable: evt.id === "business",
                          adjustForInflation: true,
                        }]);
                      }}
                        data-testid={`button-add-${evt.id}`}
                        style={{
                          ...card, padding: "10px 14px", cursor: "pointer", display: "flex",
                          alignItems: "center", gap: 6, fontSize: 12, color: P.dark,
                        }}>
                        <Icon size={14} color={P.blue} /> {evt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {cashflows.length === 0 && (
                  <div style={{ ...card, textAlign: "center", color: P.lt, border: `1px dashed ${P.odBorder}`, padding: 28 }}>
                    No lifecycle events added. Add events above to model real planning scenarios.
                  </div>
                )}
                {cashflows.map(cf => (
                  <div key={cf.id} style={{ ...card, border: `1px solid ${cf.type === "income" ? P.grn + '30' : P.odSurf2}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <input value={cf.label} onChange={e => setCashflows(prev => prev.map(c => c.id === cf.id ? { ...c, label: e.target.value } : c))}
                        data-testid={`input-cashflow-label-${cf.id}`}
                        style={{ background: "none", border: "none", color: P.ink, fontWeight: 700, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none" }} />
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ color: cf.type === "income" ? P.grn : P.amb, fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
                          {cf.type === "income" ? "+" : "-"}{fmt(cf.amount)}
                        </span>
                        <button onClick={() => setCashflows(prev => prev.filter(c => c.id !== cf.id))}
                          data-testid={`button-remove-cashflow-${cf.id}`}
                          style={{ background: P.rL, border: `1px solid ${P.red}30`, borderRadius: 4, padding: "2px 8px", cursor: "pointer", color: P.red, fontSize: 12, display: "flex", alignItems: "center" }}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                      <div>
                        <div style={{ color: P.lt, fontSize: 10, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>YEAR FROM NOW</div>
                        <input type="number" min={1} max={horizonYears} value={cf.year}
                          onChange={e => setCashflows(prev => prev.map(c => c.id === cf.id ? { ...c, year: Number(e.target.value) } : c))}
                          style={{ background: P.odSurf2, border: `1px solid ${P.odBorder}`, borderRadius: 4, padding: "6px 8px", color: P.ink, fontFamily: "'DM Mono', monospace", fontSize: 13, width: "100%", boxSizing: "border-box" }} />
                        <div style={{ color: P.lt, fontSize: 10, marginTop: 2 }}>Age {currentAge + cf.year}</div>
                      </div>
                      <div>
                        <div style={{ color: P.lt, fontSize: 10, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>AMOUNT ($)</div>
                        <input type="number" min={0} value={cf.amount}
                          onChange={e => setCashflows(prev => prev.map(c => c.id === cf.id ? { ...c, amount: Number(e.target.value) } : c))}
                          style={{ background: P.odSurf2, border: `1px solid ${P.odBorder}`, borderRadius: 4, padding: "6px 8px", color: P.ink, fontFamily: "'DM Mono', monospace", fontSize: 13, width: "100%", boxSizing: "border-box" }} />
                      </div>
                      <div>
                        <div style={{ color: P.lt, fontSize: 10, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>TYPE</div>
                        <select value={cf.type} onChange={e => setCashflows(prev => prev.map(c => c.id === cf.id ? { ...c, type: e.target.value } : c))}
                          style={{ background: P.odSurf2, border: `1px solid ${P.odBorder}`, borderRadius: 4, padding: "6px 8px", color: P.ink, fontFamily: "'DM Mono', monospace", fontSize: 12, width: "100%", cursor: "pointer" }}>
                          <option value="withdrawal">Withdrawal</option>
                          <option value="income">Income / Windfall</option>
                          <option value="expense">One-Time Expense</option>
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end" }}>
                        <label style={{ display: "flex", gap: 6, cursor: "pointer", fontSize: 11, color: P.mid }}>
                          <input type="checkbox" checked={cf.taxable} onChange={e => setCashflows(prev => prev.map(c => c.id === cf.id ? { ...c, taxable: e.target.checked } : c))} style={{ accentColor: P.blue }} />
                          Taxable
                        </label>
                        <label style={{ display: "flex", gap: 6, cursor: "pointer", fontSize: 11, color: P.mid }}>
                          <input type="checkbox" checked={cf.adjustForInflation} onChange={e => setCashflows(prev => prev.map(c => c.id === cf.id ? { ...c, adjustForInflation: e.target.checked } : c))} style={{ accentColor: P.blue }} />
                          Inflation-Adj.
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "Scenarios" && (
            <div>
              <div style={sectionLabel}>WITHDRAWAL RULES & STRESS TESTS</div>
              <div style={{ marginBottom: 28 }}>
                <div style={{ color: P.mid, fontSize: 11, marginBottom: 14, fontFamily: "'DM Mono', monospace" }}>WITHDRAWAL STRATEGY</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {WITHDRAWAL_RULES.map(rule => (
                    <button key={rule.id} onClick={() => setWithdrawalRule(rule.id)}
                      data-testid={`button-rule-${rule.id}`}
                      style={{
                        ...card,
                        border: `1px solid ${withdrawalRule === rule.id ? P.blue : P.odSurf2}`,
                        background: withdrawalRule === rule.id ? P.bFr : P.odSurf,
                        cursor: "pointer", textAlign: "left",
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: "50%",
                          border: `2px solid ${withdrawalRule === rule.id ? P.blue : P.lt}`,
                          background: withdrawalRule === rule.id ? P.blue : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {withdrawalRule === rule.id && <Check size={10} color={P.odSurf} />}
                        </div>
                        <span style={{ color: withdrawalRule === rule.id ? P.blue : P.dark, fontWeight: 700, fontSize: 13 }}>{rule.label}</span>
                      </div>
                      <div style={{ color: P.mid, fontSize: 12, marginTop: 6, marginLeft: 24 }}>{rule.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {(withdrawalRule === "flexible" || withdrawalRule === "floor-upside") && (
                <div style={{ ...card, marginBottom: 24 }}>
                  <div style={{ color: P.mid, fontSize: 11, marginBottom: 14, fontFamily: "'DM Mono', monospace" }}>FLOOR / CEILING CONFIG</div>
                  <SliderInput label="FLOOR AMOUNT (Annual)" value={floorAmount} min={20000} max={300000} step={5000}
                    onChange={setFloorAmount} format={fmt} sublabel="Minimum guaranteed withdrawal" />
                  {withdrawalRule === "floor-upside" && (
                    <SliderInput label="CEILING MULTIPLIER" value={ceilingMultiplier} min={1.0} max={3.0} step={0.1}
                      onChange={setCeilingMultiplier} format={v => `${v.toFixed(1)}x floor`} sublabel={`Max spending = ${fmt(floorAmount * ceilingMultiplier)}/yr`} />
                  )}
                </div>
              )}

              <div>
                <div style={{ color: P.mid, fontSize: 11, marginBottom: 14, fontFamily: "'DM Mono', monospace" }}>STRESS TEST OVERLAY</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { id: null as string | null, label: "No Stress Test", desc: "Baseline simulation", color: P.blue },
                    { id: "2008", label: "2008-Style Crash", desc: "Amplified volatility, -12% additional drift first 2 years", color: P.red },
                    { id: "inflation", label: "1970s Inflation", desc: "Inflation spike to 7%, sustained for 5 years", color: P.amb },
                    { id: "sequence", label: "Sequence Risk", desc: "Poor early returns at retirement start", color: P.bDk },
                  ].map(st => (
                    <button key={String(st.id)} onClick={() => setStressTest(st.id)}
                      data-testid={`button-stress-${st.id || 'none'}`}
                      style={{
                        ...card,
                        border: `1px solid ${stressTest === st.id ? st.color : P.odSurf2}`,
                        background: stressTest === st.id ? (st.id === null ? P.bFr : st.id === "2008" ? P.rL : st.id === "inflation" ? P.aL : P.bIce) : P.odSurf,
                        cursor: "pointer", textAlign: "left",
                      }}>
                      <div style={{ color: stressTest === st.id ? st.color : P.dark, fontWeight: 700, fontSize: 12, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: "50%",
                          border: `2px solid ${stressTest === st.id ? st.color : P.lt}`,
                          background: stressTest === st.id ? st.color : "transparent",
                        }} />
                        {st.label}
                      </div>
                      <div style={{ color: P.mid, fontSize: 11, marginLeft: 20 }}>{st.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "Results" && (
            <div>
              {!results ? (
                <div style={{ textAlign: "center", padding: "80px 40px" }}>
                  <Activity size={48} color={P.lt} />
                  <div style={{ color: P.lt, fontSize: 14, marginTop: 16 }}>Configure parameters and click RUN to generate results</div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
                    {[
                      { label: "Success Rate", value: pct(results.successRate), color: successColor, sublabel: successLabel, icon: <Target size={16} />, tip: <InfoTip term="success_rate" /> },
                      { label: "Confidence Age", value: `Age ${results.confidenceAge}`, color: P.blue, sublabel: "P50 plan survives to", icon: <Clock size={16} />, tip: <InfoTip term="monte_carlo" /> },
                      { label: "Median Terminal", value: fmt(results.p50), color: P.bDk, sublabel: "Portfolio at plan end", icon: <BarChart3 size={16} />, tip: null },
                      { label: "Optimistic (P90)", value: fmt(results.p90), color: P.grn, sublabel: "Best 10% scenarios", icon: <TrendingUp size={16} />, tip: <InfoTip term="std_dev" /> },
                      { label: "Pessimistic (P10)", value: fmt(results.p10), color: P.red, sublabel: "Worst 10% scenarios", icon: <TrendingDown size={16} />, tip: null },
                    ].map((m, i) => (
                      <div key={i} data-testid={`metric-${m.label.toLowerCase().replace(/[\s()]/g, '-')}`} style={{ ...card, textAlign: "center", border: `1px solid ${m.color}25` }}>
                        <div style={{ color: m.color, marginBottom: 6 }}>{m.icon}</div>
                        <div style={{ color: m.color, fontWeight: 700, fontSize: 18, fontFamily: "'DM Mono', monospace" }}>{m.value}</div>
                        <div style={{ color: P.dark, fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>{m.label}{m.tip}</div>
                        <div style={{ color: P.lt, fontSize: 10, marginTop: 2 }}>{m.sublabel}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ ...card, marginBottom: 20, background: P.odBg, border: `1px solid ${P.odSurf2}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <div style={{ color: P.blue, fontWeight: 700, fontSize: 13 }}>Portfolio Projection - Probability Fan Chart</div>
                      <div style={{ display: "flex", gap: 16, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                        <span style={{ color: P.grn, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 2, background: P.grn, display: "inline-block", borderRadius: 1 }} /> P90</span>
                        <span style={{ color: P.blue, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 2, background: P.blue, display: "inline-block", borderRadius: 1 }} /> P50</span>
                        <span style={{ color: P.amb, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 2, background: P.amb, display: "inline-block", borderRadius: 1 }} /> P10</span>
                      </div>
                    </div>
                    <FanChart bands={results.yearlyBands} currentAge={currentAge} />
                    <div style={{ color: P.nMid, fontSize: 11, textAlign: "center", marginTop: 8, fontFamily: "'DM Mono', monospace" }}>
                      Shaded bands: P10-P25-P50-P75-P90 percentile ranges across {results.numScenarios.toLocaleString()} simulations
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={card}>
                      <div style={{ color: P.dark, fontWeight: 700, marginBottom: 14, fontSize: 13 }}>Scenario Distribution</div>
                      {[
                        { label: "Succeeded (Plan intact)", value: results.successCount, pctVal: results.successRate, color: P.grn },
                        { label: "Portfolio Depleted", value: results.numScenarios - results.successCount, pctVal: 1 - results.successRate, color: P.red },
                      ].map((row, i) => (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ color: P.mid, fontSize: 12 }}>{row.label}</span>
                            <span style={{ color: row.color, fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{row.value.toLocaleString()} ({pct(row.pctVal)})</span>
                          </div>
                          <div style={{ height: 6, background: P.odSurf2, borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${row.pctVal * 100}%`, background: row.color, borderRadius: 3, transition: "width 0.8s" }} />
                          </div>
                        </div>
                      ))}
                      {results.avgFailYear > 0 && (
                        <div style={{ color: P.lt, fontSize: 11, marginTop: 12 }}>
                          In failed scenarios, depletion occurs at avg age {Math.round(currentAge + results.avgFailYear)}
                        </div>
                      )}
                    </div>
                    <div style={card}>
                      <div style={{ color: P.dark, fontWeight: 700, marginBottom: 14, fontSize: 13 }}>Portfolio Assumptions Used</div>
                      {[
                        { label: "Expected Annual Return (mu)", value: pct(results.portfolioMu) },
                        { label: "Annual Volatility (sig)", value: pct(results.portfolioSigma) },
                        { label: "Scenarios Run", value: results.numScenarios.toLocaleString() },
                        { label: "Planning Horizon", value: `${horizonYears} years` },
                        { label: "Withdrawal Rule", value: WITHDRAWAL_RULES.find(r => r.id === withdrawalRule)?.label || "" },
                        { label: "Stress Test", value: stressTest ? stressTest : "None" },
                      ].map((row, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${P.odSurf2}` }}>
                          <span style={{ color: P.lt, fontSize: 12 }}>{row.label}</span>
                          <span style={{ color: P.ink, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <CalculatorInterpretation
                      calculatorName="Monte Carlo Simulator"
                      summary={`${(results.successRate * 100).toFixed(0)}% success rate across ${results.numScenarios.toLocaleString()} scenarios. ${results.successRate >= 0.9 ? "Plan appears well-funded." : results.successRate >= 0.75 ? "Plan has moderate risk of shortfall." : "Plan has significant shortfall risk — consider adjustments."} Median terminal value: ${fmt(results.p50)}.`}
                      metrics={[
                        { label: "Success Rate", value: `${(results.successRate * 100).toFixed(0)}%`, tooltip: "Percentage of simulated scenarios where portfolio survives through life expectancy. 90%+ is generally targeted.", status: results.successRate >= 0.9 ? "good" : results.successRate >= 0.75 ? "warning" : "critical" },
                        { label: "Median Terminal", value: fmt(results.p50), tooltip: "50th percentile ending portfolio value — half of scenarios end above this, half below.", status: results.p50 > 0 ? "good" : "critical" },
                        { label: "Worst Case (P10)", value: fmt(results.p10), tooltip: "10th percentile ending value — only 10% of scenarios end worse than this.", status: results.p10 > 0 ? "good" : "warning" },
                      ]}
                      insights={[
                        `Plan survives to age ${results.confidenceAge} with 90% confidence`,
                        `Expected portfolio return: ${(results.portfolioMu * 100).toFixed(1)}%, volatility: ${(results.portfolioSigma * 100).toFixed(1)}%`,
                      ]}
                      warnings={results.avgFailYear > 0 ? [`Average depletion occurs at year ${results.avgFailYear} (age ${Math.round(currentAge + results.avgFailYear)}) in failed scenarios`] : []}
                      actions={[
                        { label: "Budget Calculator", href: "/calculators/budget" },
                      ]}
                      inputs={{
                        initialPortfolio: portfolio,
                        currentAge,
                        retirementAge,
                        lifeExpectancy,
                        annualSpending,
                        inflationRate: inflation,
                        taxRate,
                        withdrawalRule,
                        allocation,
                        numScenarios,
                        stressTest,
                      }}
                      results={results}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
