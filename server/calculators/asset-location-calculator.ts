export interface AssetHolding {
  name: string;
  ticker: string;
  marketValue: number;
  assetClass: string;
  currentAccountType: "taxable" | "traditional" | "roth";
  expectedReturn: number;
  dividendYield: number;
  turnoverRate: number;
  taxEfficiency: "high" | "medium" | "low";
}

export interface AssetLocationInput {
  holdings: AssetHolding[];
  taxableCapacity: number;
  traditionalCapacity: number;
  rothCapacity: number;
  marginalTaxRate: number;
  capitalGainsTaxRate: number;
  investmentHorizon: number;
}

export interface PlacementRecommendation {
  name: string;
  ticker: string;
  marketValue: number;
  assetClass: string;
  currentAccountType: string;
  recommendedAccountType: string;
  reason: string;
  estimatedAnnualTaxSavings: number;
  needsMove: boolean;
}

export interface AssetLocationResult {
  recommendations: PlacementRecommendation[];
  currentAllocation: {
    taxable: number;
    traditional: number;
    roth: number;
  };
  optimizedAllocation: {
    taxable: number;
    traditional: number;
    roth: number;
  };
  estimatedAnnualTaxSavings: number;
  estimatedLifetimeSavings: number;
  summary: {
    totalPortfolioValue: number;
    holdingsAnalyzed: number;
    holdingsToMove: number;
  };
  notes: string[];
}

function getOptimalAccountType(
  holding: AssetHolding,
  taxableRemaining: number,
  traditionalRemaining: number,
  rothRemaining: number,
): { type: "taxable" | "traditional" | "roth"; reason: string } {
  if (holding.taxEfficiency === "low" || holding.dividendYield > 0.03 || holding.turnoverRate > 0.5) {
    if (traditionalRemaining >= holding.marketValue) {
      return { type: "traditional", reason: "High-income asset benefits from tax deferral in Traditional account" };
    }
    if (rothRemaining >= holding.marketValue) {
      return { type: "roth", reason: "High-income asset placed in Roth for tax-free growth" };
    }
  }

  if (holding.assetClass === "bond" || holding.assetClass === "fixed_income" || holding.assetClass === "reit") {
    if (traditionalRemaining >= holding.marketValue) {
      return { type: "traditional", reason: "Fixed income/REIT income is taxed as ordinary income — best in tax-deferred" };
    }
    if (rothRemaining >= holding.marketValue) {
      return { type: "roth", reason: "Fixed income placed in Roth for tax-free distributions" };
    }
  }

  if (holding.expectedReturn > 0.10) {
    if (rothRemaining >= holding.marketValue) {
      return { type: "roth", reason: "High-growth asset maximizes value of tax-free growth in Roth" };
    }
  }

  if (holding.taxEfficiency === "high" && holding.dividendYield < 0.015) {
    if (taxableRemaining >= holding.marketValue) {
      return { type: "taxable", reason: "Tax-efficient asset with low dividends is well-suited for taxable account" };
    }
  }

  if (taxableRemaining >= holding.marketValue) {
    return { type: "taxable", reason: "Default placement in taxable account" };
  }
  if (traditionalRemaining >= holding.marketValue) {
    return { type: "traditional", reason: "Placed in Traditional due to capacity constraints" };
  }
  return { type: "roth", reason: "Placed in Roth due to capacity constraints" };
}

export function calculateAssetLocation(input: AssetLocationInput): AssetLocationResult {
  const { holdings, taxableCapacity, traditionalCapacity, rothCapacity, marginalTaxRate, capitalGainsTaxRate, investmentHorizon } = input;
  const notes: string[] = [];

  const currentAllocation = { taxable: 0, traditional: 0, roth: 0 };
  for (const h of holdings) {
    currentAllocation[h.currentAccountType] += h.marketValue;
  }

  const sorted = [...holdings].sort((a, b) => {
    const aScore = (a.dividendYield + a.turnoverRate) * (1 - (a.taxEfficiency === "high" ? 1 : a.taxEfficiency === "medium" ? 0.5 : 0));
    const bScore = (b.dividendYield + b.turnoverRate) * (1 - (b.taxEfficiency === "high" ? 1 : b.taxEfficiency === "medium" ? 0.5 : 0));
    return bScore - aScore;
  });

  let taxableRemaining = taxableCapacity;
  let traditionalRemaining = traditionalCapacity;
  let rothRemaining = rothCapacity;

  const optimizedAllocation = { taxable: 0, traditional: 0, roth: 0 };
  const recommendations: PlacementRecommendation[] = [];

  for (const holding of sorted) {
    const optimal = getOptimalAccountType(holding, taxableRemaining, traditionalRemaining, rothRemaining);

    const needsMove = optimal.type !== holding.currentAccountType;
    let annualTaxSavings = 0;
    if (needsMove) {
      const dividendIncome = holding.marketValue * holding.dividendYield;
      const turnoverGains = holding.marketValue * holding.turnoverRate * holding.expectedReturn;
      if (holding.currentAccountType === "taxable" && optimal.type !== "taxable") {
        annualTaxSavings = dividendIncome * marginalTaxRate + turnoverGains * capitalGainsTaxRate;
      } else if (holding.currentAccountType !== "taxable" && optimal.type === "taxable") {
        annualTaxSavings = -(dividendIncome * marginalTaxRate + turnoverGains * capitalGainsTaxRate);
      }
    }

    if (optimal.type === "taxable") taxableRemaining -= holding.marketValue;
    else if (optimal.type === "traditional") traditionalRemaining -= holding.marketValue;
    else rothRemaining -= holding.marketValue;

    optimizedAllocation[optimal.type] += holding.marketValue;

    recommendations.push({
      name: holding.name,
      ticker: holding.ticker,
      marketValue: holding.marketValue,
      assetClass: holding.assetClass,
      currentAccountType: holding.currentAccountType,
      recommendedAccountType: optimal.type,
      reason: optimal.reason,
      estimatedAnnualTaxSavings: Math.round(annualTaxSavings * 100) / 100,
      needsMove,
    });
  }

  const totalAnnualSavings = recommendations.reduce((s, r) => s + r.estimatedAnnualTaxSavings, 0);
  const lifetimeSavings = totalAnnualSavings * investmentHorizon;
  const holdingsToMove = recommendations.filter(r => r.needsMove).length;

  if (holdingsToMove === 0) {
    notes.push("Current asset location is already well-optimized.");
  } else {
    notes.push(`${holdingsToMove} holding(s) would benefit from relocation across account types.`);
  }

  if (totalAnnualSavings > 0) {
    notes.push(`Estimated annual tax savings of $${Math.round(totalAnnualSavings).toLocaleString()} from optimized placement.`);
  }

  notes.push("Moving assets between account types may trigger taxable events. Consult with a tax professional before executing.");
  notes.push("Analysis uses simplified tax assumptions and does not account for state taxes or AMT.");

  return {
    recommendations,
    currentAllocation,
    optimizedAllocation,
    estimatedAnnualTaxSavings: Math.round(totalAnnualSavings * 100) / 100,
    estimatedLifetimeSavings: Math.round(lifetimeSavings * 100) / 100,
    summary: {
      totalPortfolioValue: holdings.reduce((s, h) => s + h.marketValue, 0),
      holdingsAnalyzed: holdings.length,
      holdingsToMove,
    },
    notes,
  };
}
