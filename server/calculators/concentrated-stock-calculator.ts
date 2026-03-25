const LONG_TERM_CAP_GAINS_RATE = 0.238;
const SHORT_TERM_MAX_RATE = 0.37;
const NIIT_RATE = 0.038;
const EXCHANGE_FUND_MIN_POSITION = 500000;
const EXCHANGE_FUND_HOLDING_PERIOD_YEARS = 7;

export interface ConcentratedStockInput {
  stockName: string;
  sharesOwned: number;
  currentPrice: number;
  costBasisPerShare: number;
  holdingPeriodMonths: number;
  totalPortfolioValue: number;
  targetAllocationPercent: number;
  annualDividendYield?: number;
  expectedAnnualReturn?: number;
  filingStatus: "single" | "married_filing_jointly";
  ordinaryIncomeRate?: number;
  stateCapGainsRate?: number;
  sellYears?: number;
}

export interface DiversificationStrategy {
  strategy: string;
  description: string;
  sharesLiquidated: number;
  proceedsBeforeTax: number;
  taxLiability: number;
  netProceeds: number;
  diversifiedAmount: number;
  remainingConcentration: number;
  timelineYears: number;
  eligible: boolean;
  eligibilityNotes: string[];
  pros: string[];
  cons: string[];
}

export interface StagedSaleSchedule {
  year: number;
  sharesToSell: number;
  proceedsBeforeTax: number;
  capitalGain: number;
  taxOnSale: number;
  netProceeds: number;
  cumulativeDiversified: number;
  remainingShares: number;
  remainingConcentration: number;
}

export interface ConcentratedStockResult {
  currentPosition: {
    marketValue: number;
    costBasis: number;
    unrealizedGain: number;
    unrealizedGainPercent: number;
    concentrationPercent: number;
    isLongTerm: boolean;
  };
  targetSharesToSell: number;
  targetProceedsNeeded: number;
  strategies: DiversificationStrategy[];
  stagedSaleSchedule: StagedSaleSchedule[];
  riskMetrics: {
    singleStockRisk: string;
    volatilityImpact: string;
    diversificationBenefit: number;
  };
  notes: string[];
}

function fmtCur(v: number): string {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function calculateConcentratedStock(input: ConcentratedStockInput): ConcentratedStockResult {
  const {
    stockName,
    sharesOwned,
    currentPrice,
    costBasisPerShare,
    holdingPeriodMonths,
    totalPortfolioValue,
    targetAllocationPercent,
    annualDividendYield = 0,
    expectedAnnualReturn = 0.08,
    filingStatus,
    ordinaryIncomeRate,
    stateCapGainsRate = 0,
    sellYears = 3,
  } = input;

  const notes: string[] = [];
  const marketValue = sharesOwned * currentPrice;
  const totalCostBasis = sharesOwned * costBasisPerShare;
  const unrealizedGain = marketValue - totalCostBasis;
  const unrealizedGainPercent = totalCostBasis > 0 ? unrealizedGain / totalCostBasis : 0;
  const concentrationPercent = totalPortfolioValue > 0 ? (marketValue / totalPortfolioValue) * 100 : 0;
  const isLongTerm = holdingPeriodMonths >= 12;

  const targetValue = totalPortfolioValue * (targetAllocationPercent / 100);
  const excessValue = Math.max(0, marketValue - targetValue);
  const targetSharesToSell = Math.ceil(excessValue / currentPrice);
  const targetProceedsNeeded = targetSharesToSell * currentPrice;

  const effectiveCapGainsRate = isLongTerm
    ? LONG_TERM_CAP_GAINS_RATE + stateCapGainsRate
    : (ordinaryIncomeRate || (filingStatus === "married_filing_jointly" ? 0.32 : 0.35)) + stateCapGainsRate;

  const strategies: DiversificationStrategy[] = [];

  const immediateSaleGain = targetSharesToSell * (currentPrice - costBasisPerShare);
  const immediateTax = Math.max(0, immediateSaleGain * effectiveCapGainsRate);
  const immediateNet = targetProceedsNeeded - immediateTax;
  strategies.push({
    strategy: "Immediate Sale",
    description: `Sell ${targetSharesToSell.toLocaleString()} shares at once and reinvest proceeds into a diversified portfolio.`,
    sharesLiquidated: targetSharesToSell,
    proceedsBeforeTax: Math.round(targetProceedsNeeded),
    taxLiability: Math.round(immediateTax),
    netProceeds: Math.round(immediateNet),
    diversifiedAmount: Math.round(immediateNet),
    remainingConcentration: totalPortfolioValue > 0
      ? Math.round(((marketValue - targetProceedsNeeded) / (totalPortfolioValue - targetProceedsNeeded + immediateNet)) * 10000) / 100
      : 0,
    timelineYears: 0,
    eligible: true,
    eligibilityNotes: [],
    pros: [
      "Immediate diversification and risk reduction",
      "Simple execution",
      "Full control over reinvestment",
    ],
    cons: [
      `Tax liability of ${fmtCur(immediateTax)} due immediately`,
      !isLongTerm ? "Short-term capital gains taxed at ordinary income rates" : "",
      "No opportunity to defer or reduce taxes",
    ].filter(Boolean),
  });

  const sharesPerYear = Math.ceil(targetSharesToSell / sellYears);
  let totalStagedTax = 0;
  let totalStagedProceeds = 0;
  for (let y = 0; y < sellYears; y++) {
    const sharesToSell = Math.min(sharesPerYear, targetSharesToSell - sharesPerYear * y);
    if (sharesToSell <= 0) break;
    const projectedPrice = currentPrice * Math.pow(1 + expectedAnnualReturn, y);
    const yearProceeds = sharesToSell * projectedPrice;
    const gainPerShare = projectedPrice - costBasisPerShare;
    const yearTax = Math.max(0, sharesToSell * gainPerShare * effectiveCapGainsRate);
    totalStagedTax += yearTax;
    totalStagedProceeds += yearProceeds;
  }
  const stagedNet = totalStagedProceeds - totalStagedTax;
  strategies.push({
    strategy: `Staged Sale (${sellYears}-Year)`,
    description: `Sell approximately ${sharesPerYear.toLocaleString()} shares per year over ${sellYears} years to spread capital gains across tax years.`,
    sharesLiquidated: targetSharesToSell,
    proceedsBeforeTax: Math.round(totalStagedProceeds),
    taxLiability: Math.round(totalStagedTax),
    netProceeds: Math.round(stagedNet),
    diversifiedAmount: Math.round(stagedNet),
    remainingConcentration: totalPortfolioValue > 0
      ? Math.round(((marketValue - targetProceedsNeeded) / totalPortfolioValue) * 10000) / 100
      : 0,
    timelineYears: sellYears,
    eligible: true,
    eligibilityNotes: [`Spreads ${fmtCur(targetProceedsNeeded)} in sales over ${sellYears} tax years`],
    pros: [
      "Spreads tax liability across multiple years",
      "May keep each year's gains in lower bracket",
      "Gradual diversification reduces timing risk",
    ],
    cons: [
      "Concentration risk persists during transition",
      "Stock price may decline during sell period",
      `Takes ${sellYears} years to fully diversify`,
    ],
  });

  const exchangeFundEligible = marketValue >= EXCHANGE_FUND_MIN_POSITION && isLongTerm;
  const exchangeFundGainDeferred = Math.max(0, unrealizedGain);
  const exchangeFundTaxDeferred = exchangeFundGainDeferred * effectiveCapGainsRate;
  strategies.push({
    strategy: "Exchange Fund (Section 721)",
    description: "Contribute shares to a diversified partnership fund in exchange for a diversified interest. Defers capital gains until the fund interest is sold.",
    sharesLiquidated: targetSharesToSell,
    proceedsBeforeTax: Math.round(marketValue),
    taxLiability: 0,
    netProceeds: Math.round(marketValue),
    diversifiedAmount: Math.round(marketValue),
    remainingConcentration: totalPortfolioValue > 0
      ? Math.round((0 / totalPortfolioValue) * 10000) / 100
      : 0,
    timelineYears: EXCHANGE_FUND_HOLDING_PERIOD_YEARS,
    eligible: exchangeFundEligible,
    eligibilityNotes: exchangeFundEligible
      ? [`Position of ${fmtCur(marketValue)} meets minimum threshold`, `${EXCHANGE_FUND_HOLDING_PERIOD_YEARS}-year holding period required`]
      : [
          marketValue < EXCHANGE_FUND_MIN_POSITION
            ? `Position of ${fmtCur(marketValue)} below ${fmtCur(EXCHANGE_FUND_MIN_POSITION)} minimum`
            : "",
          !isLongTerm ? "Must hold shares long-term (12+ months) before contributing" : "",
        ].filter(Boolean),
    pros: [
      `Defers ${fmtCur(exchangeFundTaxDeferred)} in capital gains taxes`,
      "Instant diversification via partnership interest",
      "No current tax event on contribution",
    ],
    cons: [
      `${EXCHANGE_FUND_HOLDING_PERIOD_YEARS}-year lock-up period`,
      "Limited liquidity during holding period",
      "Fund management fees typically 0.75%-1.5% annually",
      "Minimum investment requirements",
    ],
  });

  const collarCost = marketValue * 0.02;
  const putFloor = currentPrice * 0.90;
  const callCeiling = currentPrice * 1.15;
  strategies.push({
    strategy: "Protective Collar (Put + Covered Call)",
    description: `Buy a put at ~${fmtCur(putFloor)}/share and sell a call at ~${fmtCur(callCeiling)}/share to limit downside while capping upside. No immediate tax event.`,
    sharesLiquidated: 0,
    proceedsBeforeTax: 0,
    taxLiability: 0,
    netProceeds: 0,
    diversifiedAmount: 0,
    remainingConcentration: concentrationPercent,
    timelineYears: 1,
    eligible: true,
    eligibilityNotes: [`Estimated collar cost: ${fmtCur(collarCost)} annually`, `Downside protected below ${fmtCur(putFloor)}/share`],
    pros: [
      "No immediate tax event",
      `Downside protected below ${fmtCur(putFloor)}/share`,
      "Maintain ownership and voting rights",
      "Can be renewed annually",
    ],
    cons: [
      `Upside capped at ${fmtCur(callCeiling)}/share`,
      `Annual cost approximately ${fmtCur(collarCost)}`,
      "Does not actually diversify the portfolio",
      "Complex options strategy requires monitoring",
    ],
  });

  const charGain = targetSharesToSell * (currentPrice - costBasisPerShare);
  const charTaxSaved = Math.max(0, charGain * effectiveCapGainsRate);
  strategies.push({
    strategy: "Charitable Remainder Trust (CRT)",
    description: "Transfer appreciated shares to a CRT, receive an income stream for a set period, and claim a charitable deduction. Avoids immediate capital gains.",
    sharesLiquidated: targetSharesToSell,
    proceedsBeforeTax: Math.round(targetProceedsNeeded),
    taxLiability: 0,
    netProceeds: Math.round(targetProceedsNeeded * 0.05 * 20),
    diversifiedAmount: Math.round(targetProceedsNeeded),
    remainingConcentration: totalPortfolioValue > 0
      ? Math.round(((marketValue - targetProceedsNeeded) / totalPortfolioValue) * 10000) / 100
      : 0,
    timelineYears: 20,
    eligible: unrealizedGain > 100000,
    eligibilityNotes: unrealizedGain > 100000
      ? [`Unrealized gain of ${fmtCur(unrealizedGain)} makes CRT advantageous`, "Charitable intent required"]
      : ["Unrealized gain may be too small to justify CRT costs"],
    pros: [
      "No immediate capital gains tax",
      `Avoids approximately ${fmtCur(charTaxSaved)} in capital gains`,
      "Charitable deduction on contribution",
      "Income stream for life or term of years",
    ],
    cons: [
      "Irrevocable — cannot reclaim principal",
      "Income stream is taxable",
      "Setup and ongoing administration costs",
      "Remainder goes to charity, not heirs",
    ],
  });

  const stagedSaleSchedule: StagedSaleSchedule[] = [];
  let remainingShares = sharesOwned;
  let cumulativeDiversified = 0;
  for (let y = 0; y < sellYears; y++) {
    const sharesToSell = Math.min(sharesPerYear, remainingShares - (sharesOwned - targetSharesToSell));
    if (sharesToSell <= 0) break;
    const projectedPrice = currentPrice * Math.pow(1 + expectedAnnualReturn, y);
    const proceeds = sharesToSell * projectedPrice;
    const gain = sharesToSell * (projectedPrice - costBasisPerShare);
    const tax = Math.max(0, gain * effectiveCapGainsRate);
    const net = proceeds - tax;
    cumulativeDiversified += net;
    remainingShares -= sharesToSell;
    const remainingValue = remainingShares * projectedPrice;
    const portfolioAtYear = totalPortfolioValue * Math.pow(1 + 0.07, y + 1);

    stagedSaleSchedule.push({
      year: y + 1,
      sharesToSell,
      proceedsBeforeTax: Math.round(proceeds),
      capitalGain: Math.round(gain),
      taxOnSale: Math.round(tax),
      netProceeds: Math.round(net),
      cumulativeDiversified: Math.round(cumulativeDiversified),
      remainingShares,
      remainingConcentration: portfolioAtYear > 0
        ? Math.round((remainingValue / portfolioAtYear) * 10000) / 100
        : 0,
    });
  }

  if (concentrationPercent > 25) {
    notes.push(`${stockName} represents ${concentrationPercent.toFixed(1)}% of the portfolio — well above the recommended 5-10% single-stock threshold.`);
  } else if (concentrationPercent > 10) {
    notes.push(`${stockName} represents ${concentrationPercent.toFixed(1)}% of the portfolio — above the recommended 5-10% threshold.`);
  }

  if (!isLongTerm) {
    notes.push(`Holding period is ${holdingPeriodMonths} months. Short-term gains are taxed at ordinary income rates. Consider waiting for long-term treatment (12+ months).`);
  }

  if (unrealizedGainPercent > 3) {
    notes.push(`Unrealized gain of ${(unrealizedGainPercent * 100).toFixed(0)}% creates significant tax drag on diversification. Tax-deferred strategies may be advantageous.`);
  }

  if (annualDividendYield > 0.03) {
    notes.push(`Dividend yield of ${(annualDividendYield * 100).toFixed(1)}% provides income but does not reduce concentration risk.`);
  }

  notes.push("Consult with a tax advisor before executing any diversification strategy. State tax implications may vary.");
  notes.push("Exchange fund eligibility, collar pricing, and CRT terms are estimates and depend on specific fund/counterparty terms.");

  let singleStockRisk: string;
  if (concentrationPercent > 40) singleStockRisk = "Critical";
  else if (concentrationPercent > 25) singleStockRisk = "High";
  else if (concentrationPercent > 10) singleStockRisk = "Moderate";
  else singleStockRisk = "Low";

  const diversificationBenefit = Math.round(
    Math.max(0, marketValue - targetValue) * 0.15
  );

  return {
    currentPosition: {
      marketValue: Math.round(marketValue),
      costBasis: Math.round(totalCostBasis),
      unrealizedGain: Math.round(unrealizedGain),
      unrealizedGainPercent: Math.round(unrealizedGainPercent * 10000) / 100,
      concentrationPercent: Math.round(concentrationPercent * 100) / 100,
      isLongTerm,
    },
    targetSharesToSell,
    targetProceedsNeeded: Math.round(targetProceedsNeeded),
    strategies,
    stagedSaleSchedule,
    riskMetrics: {
      singleStockRisk,
      volatilityImpact: concentrationPercent > 20
        ? "Portfolio volatility is significantly elevated due to single-stock concentration"
        : "Moderate single-stock impact on portfolio volatility",
      diversificationBenefit,
    },
    notes,
  };
}
