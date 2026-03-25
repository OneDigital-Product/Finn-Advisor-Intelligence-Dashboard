import { storage } from "../storage";
import { logger } from "../lib/logger";
import type { TaxLot, Holding, WashSaleEvent } from "@shared/schema";

interface IndexConstituent {
  ticker: string;
  name: string;
  weight: number;
  sector: string;
}

const SP500_TOP_HOLDINGS: IndexConstituent[] = [
  { ticker: "AAPL", name: "Apple Inc.", weight: 7.1, sector: "Technology" },
  { ticker: "MSFT", name: "Microsoft Corp.", weight: 6.8, sector: "Technology" },
  { ticker: "AMZN", name: "Amazon.com Inc.", weight: 3.4, sector: "Consumer Discretionary" },
  { ticker: "NVDA", name: "NVIDIA Corp.", weight: 3.2, sector: "Technology" },
  { ticker: "GOOGL", name: "Alphabet Inc. A", weight: 2.1, sector: "Communication Services" },
  { ticker: "GOOG", name: "Alphabet Inc. C", weight: 1.8, sector: "Communication Services" },
  { ticker: "META", name: "Meta Platforms Inc.", weight: 1.9, sector: "Communication Services" },
  { ticker: "BRK.B", name: "Berkshire Hathaway B", weight: 1.7, sector: "Financials" },
  { ticker: "TSLA", name: "Tesla Inc.", weight: 1.5, sector: "Consumer Discretionary" },
  { ticker: "UNH", name: "UnitedHealth Group", weight: 1.3, sector: "Healthcare" },
  { ticker: "JNJ", name: "Johnson & Johnson", weight: 1.2, sector: "Healthcare" },
  { ticker: "JPM", name: "JPMorgan Chase", weight: 1.2, sector: "Financials" },
  { ticker: "V", name: "Visa Inc.", weight: 1.1, sector: "Financials" },
  { ticker: "XOM", name: "Exxon Mobil Corp.", weight: 1.0, sector: "Energy" },
  { ticker: "PG", name: "Procter & Gamble", weight: 1.0, sector: "Consumer Staples" },
  { ticker: "MA", name: "Mastercard Inc.", weight: 0.9, sector: "Financials" },
  { ticker: "HD", name: "Home Depot Inc.", weight: 0.9, sector: "Consumer Discretionary" },
  { ticker: "LLY", name: "Eli Lilly & Co.", weight: 0.9, sector: "Healthcare" },
  { ticker: "ABBV", name: "AbbVie Inc.", weight: 0.8, sector: "Healthcare" },
  { ticker: "MRK", name: "Merck & Co.", weight: 0.8, sector: "Healthcare" },
  { ticker: "AVGO", name: "Broadcom Inc.", weight: 0.7, sector: "Technology" },
  { ticker: "PEP", name: "PepsiCo Inc.", weight: 0.7, sector: "Consumer Staples" },
  { ticker: "KO", name: "Coca-Cola Co.", weight: 0.6, sector: "Consumer Staples" },
  { ticker: "COST", name: "Costco Wholesale", weight: 0.6, sector: "Consumer Staples" },
  { ticker: "TMO", name: "Thermo Fisher Scientific", weight: 0.5, sector: "Healthcare" },
  { ticker: "ADBE", name: "Adobe Inc.", weight: 0.5, sector: "Technology" },
  { ticker: "WMT", name: "Walmart Inc.", weight: 0.5, sector: "Consumer Staples" },
  { ticker: "CRM", name: "Salesforce Inc.", weight: 0.5, sector: "Technology" },
  { ticker: "CSCO", name: "Cisco Systems", weight: 0.5, sector: "Technology" },
  { ticker: "ACN", name: "Accenture plc", weight: 0.5, sector: "Technology" },
];

const TOTAL_300 = [
  { ticker: "VTI", name: "Vanguard Total Market ETF", weight: 0.4, sector: "Broad Market" },
  { ticker: "IVV", name: "iShares Core S&P 500", weight: 0.4, sector: "Broad Market" },
];

const INDEX_DEFINITIONS: Record<string, { name: string; constituents: IndexConstituent[] }> = {
  "sp500": { name: "S&P 500", constituents: SP500_TOP_HOLDINGS },
  "total-market": { name: "Total US Market", constituents: [...SP500_TOP_HOLDINGS, ...TOTAL_300] },
};

export interface HarvestableLot {
  lot: TaxLot;
  unrealizedLoss: number;
  percentLoss: number;
  potentialTaxSavings: number;
  holdingPeriod: string;
  daysHeld: number;
  washSaleRisk: boolean;
  replacementTicker?: string;
  applicableTaxRate: number;
  annualTaxSavings: number;
  taxBenefitRate: number;
}

export interface WashSaleComplianceResult {
  ticker: string;
  isSubstantiallyIdentical: boolean;
  detectionMethod: string;
  correlationScore: number | null;
  windowStart: string;
  windowEnd: string;
  daysRemaining: number;
  replacementStrategies: {
    strategy: string;
    description: string;
    riskLevel: "low" | "medium" | "high";
    replacement?: string;
  }[];
  status: "clear" | "warning" | "blocked";
}

export interface TaxAlphaComparison {
  traditional: {
    dividendTaxDrag: number;
    internalCapGains: number;
    totalCost: number;
    netReturn: number;
  };
  directIndexing: {
    harvestingBenefit: number;
    dividendTaxDrag: number;
    totalBenefit: number;
    netReturn: number;
  };
  taxAlpha: number;
  sensitivityAnalysis: {
    scenario: string;
    harvestRate: number;
    taxAlpha: number;
    annualBenefit: number;
  }[];
  trackingError: {
    value: number;
    band: string;
    informationRatio: number;
  };
}

export interface FeeComparisonResult {
  directIndexing: {
    advisoryFee: number;
    tradingCosts: number;
    totalCost: number;
    costBps: number;
  };
  etf: {
    expenseRatio: number;
    advisoryFee: number;
    totalCost: number;
    costBps: number;
  };
  annualSavings: number;
  breakEvenAum: number;
  recommendation: string;
}

export interface HarvestingStrategy {
  immediate: {
    lots: HarvestableLot[];
    totalSavings: number;
    safeToHarvest: boolean;
  };
  yearEnd: {
    ytdGains: number;
    ytdLosses: number;
    netPosition: number;
    ordinaryIncomeOffset: number;
    recommendedHarvests: HarvestableLot[];
    projectedSavings: number;
  };
  multiYear: {
    year: number;
    scheduledHarvests: { ticker: string; estimatedLoss: number; estimatedSavings: number }[];
    cumulativeSavings: number;
  }[];
  carryforward: {
    shortTermCarryforward: number;
    longTermCarryforward: number;
    totalCarryforward: number;
    expirationNotes: string;
  };
}

export interface PortfolioConstructionAnalysis {
  factorExposure: {
    metric: string;
    target: number;
    actual: number;
    deviation: number;
    withinTolerance: boolean;
    tolerance: number;
  }[];
  sectorConstraints: {
    sector: string;
    targetWeight: number;
    actualWeight: number;
    deviation: number;
    withinLimit: boolean;
    maxAllowed: number;
  }[];
  esgScreening: {
    excludedTickers: string[];
    replacementSuggestions: { excluded: string; replacement: string; sector: string }[];
    impactOnTracking: number;
  };
  concentrationLimits: {
    singleStockLimit: number;
    top10Limit: number;
    violations: { ticker: string; weight: number; limit: number; type: string }[];
    top10Weight: number;
    top10WithinLimit: boolean;
  };
}

export interface ClientTaxContext {
  currentBracket: {
    rate: number;
    bracketRange: string;
    filingStatus: string;
  };
  projectedBracketChange: {
    direction: "up" | "down" | "stable";
    projectedRate: number;
    reason: string;
  };
  ltcgRate: number;
  niitApplicable: boolean;
  effectiveLtcgRate: number;
  carryforwardBalance: {
    shortTerm: number;
    longTerm: number;
    total: number;
  };
  harvestingTimingRecommendation: {
    recommendation: string;
    reasoning: string;
    urgency: "high" | "medium" | "low";
  };
}

export interface TrackingReport {
  portfolioId: string;
  portfolioName: string;
  targetIndex: string;
  trackingDifference: number;
  activeShare: number;
  sectorDeviations: { sector: string; target: number; actual: number; deviation: number }[];
  topOverweights: { ticker: string; deviation: number }[];
  topUnderweights: { ticker: string; deviation: number }[];
}

export interface TaxAlphaReport {
  totalHarvestedLosses: number;
  estimatedTaxSavings: number;
  harvestedLossesYTD: number;
  realizedShortTermLosses: number;
  realizedLongTermLosses: number;
  etfEquivalentSavings: number;
  directIndexAdvantage: number;
  effectiveTaxRate: number;
}

const SECTOR_REPLACEMENTS: Record<string, string[]> = {
  "AAPL": ["MSFT", "GOOGL", "CRM", "ADBE"],
  "MSFT": ["AAPL", "CRM", "ADBE", "CSCO"],
  "NVDA": ["AVGO", "AMD", "INTC", "QCOM"],
  "AVGO": ["NVDA", "AMD", "INTC", "QCOM"],
  "ADBE": ["CRM", "MSFT", "AAPL", "CSCO"],
  "CRM": ["ADBE", "MSFT", "ACN", "CSCO"],
  "CSCO": ["ACN", "MSFT", "CRM", "ADBE"],
  "ACN": ["CSCO", "CRM", "ADBE", "MSFT"],
  "AMD": ["NVDA", "AVGO", "INTC", "QCOM"],
  "INTC": ["AMD", "NVDA", "AVGO", "QCOM"],
  "QCOM": ["AVGO", "AMD", "INTC", "NVDA"],
  "ORCL": ["CRM", "ADBE", "MSFT", "ACN"],
  "IBM": ["ACN", "CSCO", "CRM", "ORCL"],
  "NOW": ["CRM", "ADBE", "ACN", "MSFT"],
  "INTU": ["ADBE", "CRM", "NOW", "MSFT"],
  "TXN": ["AVGO", "QCOM", "AMD", "INTC"],
  "AMAT": ["LRCX", "KLAC", "TXN", "AVGO"],
  "LRCX": ["AMAT", "KLAC", "TXN", "AVGO"],

  "GOOGL": ["META", "NFLX", "DIS", "CMCSA"],
  "GOOG": ["META", "NFLX", "DIS", "CMCSA"],
  "META": ["GOOGL", "NFLX", "DIS", "CMCSA"],
  "NFLX": ["DIS", "CMCSA", "META", "GOOGL"],
  "DIS": ["CMCSA", "NFLX", "META", "GOOGL"],
  "CMCSA": ["DIS", "NFLX", "META", "GOOGL"],
  "TMUS": ["VZ", "T", "CMCSA", "GOOGL"],
  "VZ": ["T", "TMUS", "CMCSA", "DIS"],
  "T": ["VZ", "TMUS", "CMCSA", "DIS"],

  "AMZN": ["HD", "TSLA", "MCD", "NKE"],
  "TSLA": ["GM", "F", "AMZN", "HD"],
  "HD": ["LOW", "AMZN", "TSLA", "NKE"],
  "LOW": ["HD", "AMZN", "NKE", "MCD"],
  "MCD": ["SBUX", "YUM", "NKE", "AMZN"],
  "NKE": ["SBUX", "MCD", "AMZN", "HD"],
  "SBUX": ["MCD", "YUM", "NKE", "AMZN"],
  "TJX": ["ROST", "AMZN", "HD", "LOW"],
  "BKNG": ["ABNB", "MAR", "HLT", "AMZN"],
  "GM": ["F", "TSLA", "AMZN", "HD"],
  "F": ["GM", "TSLA", "AMZN", "HD"],

  "BRK.B": ["JPM", "BAC", "GS", "MS"],
  "JPM": ["BAC", "GS", "MS", "WFC"],
  "V": ["MA", "JPM", "BAC", "GS"],
  "MA": ["V", "JPM", "BAC", "GS"],
  "BAC": ["JPM", "WFC", "GS", "MS"],
  "GS": ["MS", "JPM", "BAC", "WFC"],
  "MS": ["GS", "JPM", "BAC", "WFC"],
  "WFC": ["BAC", "JPM", "GS", "MS"],
  "SPGI": ["MCO", "ICE", "CME", "MSCI"],
  "BLK": ["SCHW", "SPGI", "ICE", "CME"],
  "SCHW": ["BLK", "SPGI", "ICE", "CME"],
  "AXP": ["V", "MA", "JPM", "BAC"],
  "CB": ["TRV", "AIG", "MET", "PRU"],
  "MMC": ["AON", "CB", "TRV", "AIG"],

  "UNH": ["JNJ", "PFE", "MRK", "ABBV"],
  "JNJ": ["PFE", "MRK", "ABBV", "UNH"],
  "LLY": ["MRK", "ABBV", "PFE", "JNJ"],
  "ABBV": ["MRK", "JNJ", "PFE", "LLY"],
  "MRK": ["JNJ", "PFE", "ABBV", "LLY"],
  "TMO": ["ABT", "DHR", "JNJ", "MRK"],
  "PFE": ["JNJ", "MRK", "ABBV", "BMY"],
  "ABT": ["TMO", "DHR", "JNJ", "MRK"],
  "DHR": ["TMO", "ABT", "JNJ", "MRK"],
  "BMY": ["PFE", "MRK", "ABBV", "JNJ"],
  "AMGN": ["GILD", "BIIB", "REGN", "VRTX"],
  "GILD": ["AMGN", "BIIB", "REGN", "VRTX"],
  "VRTX": ["REGN", "AMGN", "GILD", "BIIB"],
  "ISRG": ["SYK", "BSX", "MDT", "EW"],
  "MDT": ["SYK", "BSX", "ISRG", "EW"],
  "CI": ["ELV", "UNH", "HUM", "CNC"],
  "ELV": ["CI", "UNH", "HUM", "CNC"],

  "XOM": ["CVX", "COP", "SLB", "EOG"],
  "CVX": ["XOM", "COP", "SLB", "EOG"],
  "COP": ["XOM", "CVX", "EOG", "SLB"],
  "SLB": ["HAL", "BKR", "XOM", "CVX"],
  "EOG": ["PXD", "COP", "XOM", "CVX"],

  "PG": ["KO", "PEP", "COST", "WMT"],
  "PEP": ["KO", "PG", "COST", "WMT"],
  "KO": ["PEP", "PG", "COST", "WMT"],
  "COST": ["WMT", "PG", "PEP", "KO"],
  "WMT": ["COST", "PG", "PEP", "KO"],
  "PM": ["MO", "PG", "CL", "KO"],
  "MO": ["PM", "PG", "CL", "KO"],
  "CL": ["PG", "KMB", "CHD", "KO"],
  "MDLZ": ["HSY", "GIS", "KHC", "PEP"],
  "GIS": ["MDLZ", "KHC", "HSY", "PEP"],
  "KMB": ["CL", "PG", "CHD", "SJM"],

  "LIN": ["APD", "SHW", "ECL", "DD"],
  "APD": ["LIN", "SHW", "ECL", "DD"],
  "SHW": ["PPG", "LIN", "APD", "ECL"],
  "FCX": ["NEM", "NUE", "STLD", "LIN"],
  "NEM": ["FCX", "NUE", "STLD", "LIN"],
  "DD": ["LIN", "APD", "DOW", "EMN"],
  "DOW": ["DD", "LIN", "APD", "EMN"],

  "CAT": ["DE", "HON", "UNP", "RTX"],
  "DE": ["CAT", "HON", "UNP", "RTX"],
  "HON": ["GE", "MMM", "RTX", "CAT"],
  "GE": ["HON", "RTX", "CAT", "DE"],
  "RTX": ["LMT", "NOC", "GD", "BA"],
  "LMT": ["RTX", "NOC", "GD", "BA"],
  "BA": ["LMT", "RTX", "NOC", "GD"],
  "UNP": ["CSX", "NSC", "CAT", "DE"],
  "UPS": ["FDX", "UNP", "CSX", "NSC"],
  "FDX": ["UPS", "UNP", "CSX", "NSC"],
  "ETN": ["EMR", "ROK", "HON", "GE"],
  "EMR": ["ETN", "ROK", "HON", "GE"],
  "WM": ["RSG", "WCN", "CLH", "GFL"],

  "NEE": ["DUK", "SO", "D", "AEP"],
  "DUK": ["NEE", "SO", "D", "AEP"],
  "SO": ["DUK", "NEE", "D", "AEP"],
  "D": ["NEE", "DUK", "SO", "AEP"],
  "AEP": ["NEE", "DUK", "SO", "D"],
  "SRE": ["ED", "EXC", "XEL", "WEC"],
  "EXC": ["SRE", "ED", "XEL", "WEC"],

  "AMT": ["CCI", "EQIX", "PLD", "SPG"],
  "PLD": ["AMT", "CCI", "EQIX", "SPG"],
  "CCI": ["AMT", "EQIX", "PLD", "SPG"],
  "EQIX": ["AMT", "CCI", "PLD", "DLR"],
  "SPG": ["O", "PSA", "AMT", "PLD"],
  "O": ["SPG", "PSA", "AMT", "PLD"],
  "PSA": ["SPG", "O", "AMT", "PLD"],
};

const SECTOR_GROUPS: Record<string, string[]> = {
  "Technology": ["AAPL", "MSFT", "NVDA", "AVGO", "ADBE", "CRM", "CSCO", "ACN", "AMD", "INTC", "QCOM", "ORCL", "IBM", "NOW", "INTU", "TXN", "AMAT", "LRCX"],
  "Communication Services": ["GOOGL", "GOOG", "META", "NFLX", "DIS", "CMCSA", "TMUS", "VZ", "T"],
  "Consumer Discretionary": ["AMZN", "TSLA", "HD", "LOW", "MCD", "NKE", "SBUX", "TJX", "BKNG", "GM", "F"],
  "Financials": ["BRK.B", "JPM", "V", "MA", "BAC", "GS", "MS", "WFC", "SPGI", "BLK", "SCHW", "AXP", "CB", "MMC"],
  "Healthcare": ["UNH", "JNJ", "LLY", "ABBV", "MRK", "TMO", "PFE", "ABT", "DHR", "BMY", "AMGN", "GILD", "VRTX", "ISRG", "MDT", "CI", "ELV"],
  "Energy": ["XOM", "CVX", "COP", "SLB", "EOG"],
  "Consumer Staples": ["PG", "PEP", "KO", "COST", "WMT", "PM", "MO", "CL", "MDLZ", "GIS", "KMB"],
  "Materials": ["LIN", "APD", "SHW", "FCX", "NEM", "DD", "DOW"],
  "Industrials": ["CAT", "DE", "HON", "GE", "RTX", "LMT", "BA", "UNP", "UPS", "FDX", "ETN", "EMR", "WM"],
  "Utilities": ["NEE", "DUK", "SO", "D", "AEP", "SRE", "EXC"],
  "Real Estate": ["AMT", "PLD", "CCI", "EQIX", "SPG", "O", "PSA"],
};

function getSectorForTicker(ticker: string): string {
  for (const [sector, tickers] of Object.entries(SECTOR_GROUPS)) {
    if (tickers.includes(ticker)) return sector;
  }
  return "Other";
}

function getSectorPeers(ticker: string): string[] {
  const sector = getSectorForTicker(ticker);
  const peers = SECTOR_GROUPS[sector];
  if (!peers) return [];
  return peers.filter((t) => t !== ticker);
}

export interface TradeProposal {
  ticker: string;
  name: string;
  sector: string;
  action: "buy" | "sell";
  shares: number;
  estimatedValue: number;
  currentWeight: number;
  targetWeight: number;
  reason: string;
  replacementFor?: string;
  taxImpact?: {
    realizedGainLoss: number;
    holdingPeriod: string;
    taxCost: number;
  };
  lotId?: string;
}

export interface RebalanceProposal {
  portfolioId: string;
  portfolioName: string;
  targetIndex: string;
  totalPortfolioValue: number;
  driftTolerance: number;
  trades: TradeProposal[];
  summary: {
    totalBuys: number;
    totalSells: number;
    totalBuyValue: number;
    totalSellValue: number;
    netCashFlow: number;
    estimatedTaxImpact: number;
    positionsAdjusted: number;
    washSaleAvoidances: number;
  };
  postRebalanceMetrics: {
    projectedActiveShare: number;
    projectedTrackingDifference: number;
    sectorDeviations: { sector: string; target: number; projected: number; deviation: number }[];
  };
  createdAt: string;
}

export class DirectIndexingEngine {
  async generateDirectIndexPortfolio(
    clientId: string,
    targetIndex: string,
    totalValue: number,
    accountId?: string,
  ) {
    try {
      const indexDef = INDEX_DEFINITIONS[targetIndex];
      if (!indexDef) {
        throw new Error(`Unknown index: ${targetIndex}`);
      }

      const totalWeight = indexDef.constituents.reduce((s, c) => s + c.weight, 0);
      const allocations = indexDef.constituents.map((c) => ({
        ticker: c.ticker,
        name: c.name,
        sector: c.sector,
        targetWeight: parseFloat(((c.weight / totalWeight) * 100).toFixed(2)),
        shares: Math.max(1, Math.round((totalValue * (c.weight / totalWeight)) / (this.getEstimatedPrice(c.ticker)))),
        estimatedValue: parseFloat(((totalValue * c.weight) / totalWeight).toFixed(2)),
      }));

      const portfolio = await storage.createDirectIndexPortfolio({
        clientId,
        accountId: accountId || null,
        name: `${indexDef.name} Direct Index`,
        targetIndex,
        totalValue: String(totalValue),
        trackingDifference: "0",
        taxAlpha: "0",
        totalHarvestedLosses: "0",
        status: "active",
        allocations,
      });

      return portfolio;
    } catch (err) {
      logger.error({ err }, "Failed to generate direct index portfolio");
      throw err;
    }
  }

  async identifyHarvestableLots(
    clientId: string,
    taxRate: number = 0.37,
    minLoss: number = 500,
  ): Promise<HarvestableLot[]> {
    try {
      const lots = await storage.getTaxLotsByClient(clientId);
      const washSaleEvents = await storage.getWashSaleEventsByClient(clientId);
      const now = new Date();
      const harvestable: HarvestableLot[] = [];

      for (const lot of lots) {
        const costBasis = parseFloat(String(lot.totalCostBasis || "0"));
        const marketValue = parseFloat(String(lot.marketValue || "0"));
        const unrealizedGL = marketValue - costBasis;

        if (unrealizedGL >= 0) continue;

        const unrealizedLoss = Math.abs(unrealizedGL);
        if (unrealizedLoss < minLoss) continue;

        const percentLoss = costBasis > 0 ? (unrealizedGL / costBasis) * 100 : 0;
        const acquisitionDate = new Date(lot.acquisitionDate);
        const daysHeld = Math.floor((now.getTime() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24));
        const holdingPeriod = daysHeld >= 366 ? "long-term" : "short-term";

        const washSaleRisk = this.checkWashSaleRisk(lot.ticker, washSaleEvents, now);

        const potentialTaxSavings = unrealizedLoss * taxRate;
        const replacements = SECTOR_REPLACEMENTS[lot.ticker];

        const applicableTaxRate = holdingPeriod === "long-term" ? Math.min(taxRate, 0.20) : taxRate;
        const annualTaxSavings = unrealizedLoss * applicableTaxRate;
        const taxBenefitRate = costBasis > 0 ? (annualTaxSavings / costBasis) * 100 : 0;

        harvestable.push({
          lot,
          unrealizedLoss,
          percentLoss: parseFloat(percentLoss.toFixed(2)),
          potentialTaxSavings: parseFloat(potentialTaxSavings.toFixed(2)),
          holdingPeriod,
          daysHeld,
          washSaleRisk,
          replacementTicker: replacements?.[0],
          applicableTaxRate,
          annualTaxSavings: parseFloat(annualTaxSavings.toFixed(2)),
          taxBenefitRate: parseFloat(taxBenefitRate.toFixed(2)),
        });
      }

      harvestable.sort((a, b) => {
        const benefitDiff = b.taxBenefitRate - a.taxBenefitRate;
        if (Math.abs(benefitDiff) > 0.01) return benefitDiff;
        return b.unrealizedLoss - a.unrealizedLoss;
      });
      return harvestable;
    } catch (err) {
      logger.error({ err }, "Failed to identify harvestable lots");
      return [];
    }
  }

  async getWashSaleTracker(clientId: string) {
    try {
      const events = await storage.getWashSaleEventsByClient(clientId);
      const now = new Date();

      const activeWindows = events.filter((e) => {
        const windowEnd = new Date(e.windowEnd);
        return windowEnd >= now && e.status === "active";
      });

      const expiredWindows = events.filter((e) => {
        const windowEnd = new Date(e.windowEnd);
        return windowEnd < now || e.status !== "active";
      });

      const tickersInWindow = [...new Set(activeWindows.map((e) => e.ticker))];

      return {
        activeWindows,
        expiredWindows,
        tickersInWindow,
        totalDisallowedLosses: activeWindows.reduce(
          (sum, e) => sum + parseFloat(String(e.disallowedLoss || "0")),
          0,
        ),
      };
    } catch (err) {
      logger.error({ err }, "Failed to get wash sale tracker");
      return { activeWindows: [], expiredWindows: [], tickersInWindow: [], totalDisallowedLosses: 0 };
    }
  }

  async getTrackingReport(portfolioId: string): Promise<TrackingReport | null> {
    try {
      const portfolio = await storage.getDirectIndexPortfolio(portfolioId);
      if (!portfolio) return null;

      const indexDef = INDEX_DEFINITIONS[portfolio.targetIndex];
      if (!indexDef) return null;

      const allocations = (portfolio.allocations as any[]) || [];
      const totalWeight = indexDef.constituents.reduce((s, c) => s + c.weight, 0);

      const sectorTargets: Record<string, number> = {};
      const sectorActuals: Record<string, number> = {};

      for (const c of indexDef.constituents) {
        const sector = c.sector;
        sectorTargets[sector] = (sectorTargets[sector] || 0) + (c.weight / totalWeight) * 100;
      }

      const totalAllocValue = allocations.reduce((s: number, a: any) => s + (a.estimatedValue || 0), 0);

      for (const a of allocations) {
        const constituent = indexDef.constituents.find((c) => c.ticker === a.ticker);
        const sector = constituent?.sector || a.sector || "Other";
        const actualWeight = totalAllocValue > 0 ? (a.estimatedValue / totalAllocValue) * 100 : 0;
        sectorActuals[sector] = (sectorActuals[sector] || 0) + actualWeight;
      }

      const allSectors = [...new Set([...Object.keys(sectorTargets), ...Object.keys(sectorActuals)])];
      const sectorDeviations = allSectors.map((sector) => ({
        sector,
        target: parseFloat((sectorTargets[sector] || 0).toFixed(2)),
        actual: parseFloat((sectorActuals[sector] || 0).toFixed(2)),
        deviation: parseFloat(((sectorActuals[sector] || 0) - (sectorTargets[sector] || 0)).toFixed(2)),
      }));

      const tickerDeviations = indexDef.constituents.map((c) => {
        const targetWeight = (c.weight / totalWeight) * 100;
        const alloc = allocations.find((a: any) => a.ticker === c.ticker);
        const actualWeight = alloc && totalAllocValue > 0 ? (alloc.estimatedValue / totalAllocValue) * 100 : 0;
        return { ticker: c.ticker, deviation: parseFloat((actualWeight - targetWeight).toFixed(2)) };
      });

      const overweights = tickerDeviations.filter((d) => d.deviation > 0).sort((a, b) => b.deviation - a.deviation).slice(0, 5);
      const underweights = tickerDeviations.filter((d) => d.deviation < 0).sort((a, b) => a.deviation - b.deviation).slice(0, 5);

      const activeShare = tickerDeviations.reduce((sum, d) => sum + Math.abs(d.deviation), 0) / 2;
      const trackingDifference = parseFloat(String(portfolio.trackingDifference || "0"));

      return {
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        targetIndex: indexDef.name,
        trackingDifference,
        activeShare: parseFloat(activeShare.toFixed(2)),
        sectorDeviations,
        topOverweights: overweights,
        topUnderweights: underweights,
      };
    } catch (err) {
      logger.error({ err }, "Failed to generate tracking report");
      return null;
    }
  }

  async getTaxAlphaAttribution(clientId: string, taxRate: number = 0.37): Promise<TaxAlphaReport> {
    try {
      const portfolios = await storage.getDirectIndexPortfoliosByClient(clientId);
      const lots = await storage.getTaxLotsByClient(clientId);

      let totalHarvestedLosses = 0;
      for (const p of portfolios) {
        totalHarvestedLosses += parseFloat(String(p.totalHarvestedLosses || "0"));
      }

      let shortTermLosses = 0;
      let longTermLosses = 0;
      for (const lot of lots) {
        const gl = parseFloat(String(lot.unrealizedGainLoss || "0"));
        if (gl < 0) {
          if (lot.holdingPeriod === "short-term") {
            shortTermLosses += Math.abs(gl);
          } else {
            longTermLosses += Math.abs(gl);
          }
        }
      }

      const estimatedTaxSavings = totalHarvestedLosses * taxRate;
      const etfHarvestingRate = 0.15;
      const totalPortfolioValue = portfolios.reduce(
        (sum, p) => sum + parseFloat(String(p.totalValue || "0")),
        0,
      );
      const etfEquivalentSavings = totalPortfolioValue * etfHarvestingRate * taxRate * 0.02;
      const directIndexAdvantage = estimatedTaxSavings - etfEquivalentSavings;

      return {
        totalHarvestedLosses,
        estimatedTaxSavings: parseFloat(estimatedTaxSavings.toFixed(2)),
        harvestedLossesYTD: totalHarvestedLosses,
        realizedShortTermLosses: parseFloat(shortTermLosses.toFixed(2)),
        realizedLongTermLosses: parseFloat(longTermLosses.toFixed(2)),
        etfEquivalentSavings: parseFloat(etfEquivalentSavings.toFixed(2)),
        directIndexAdvantage: parseFloat(Math.max(0, directIndexAdvantage).toFixed(2)),
        effectiveTaxRate: taxRate,
      };
    } catch (err) {
      logger.error({ err }, "Failed to calculate tax alpha attribution");
      return {
        totalHarvestedLosses: 0,
        estimatedTaxSavings: 0,
        harvestedLossesYTD: 0,
        realizedShortTermLosses: 0,
        realizedLongTermLosses: 0,
        etfEquivalentSavings: 0,
        directIndexAdvantage: 0,
        effectiveTaxRate: taxRate,
      };
    }
  }

  async generateTaxLotsFromHoldings(clientId: string): Promise<TaxLot[]> {
    try {
      const holdings = await storage.getHoldingsByClient(clientId);
      const accounts = await storage.getAccountsByClient(clientId);
      const existingLots = await storage.getTaxLotsByClient(clientId);

      if (existingLots.length > 0) return existingLots;

      const createdLots: TaxLot[] = [];
      const now = new Date();

      for (const holding of holdings) {
        const shares = parseFloat(String(holding.shares || "0"));
        const marketValue = parseFloat(String(holding.marketValue || "0"));
        const costBasis = parseFloat(String(holding.costBasis || "0"));

        if (shares <= 0 || marketValue <= 0) continue;

        const currentPrice = marketValue / shares;
        const numLots = Math.min(3, Math.max(1, Math.ceil(shares / 50)));
        const sharesPerLot = shares / numLots;

        for (let i = 0; i < numLots; i++) {
          const daysAgo = 90 + Math.floor(Math.random() * 700);
          const acquisitionDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
          const costVariation = 0.85 + Math.random() * 0.3;
          const lotCostBasisPerShare = costBasis > 0 ? (costBasis / shares) * costVariation : currentPrice * costVariation;
          const lotTotalCostBasis = lotCostBasisPerShare * sharesPerLot;
          const lotMarketValue = currentPrice * sharesPerLot;
          const lotGL = lotMarketValue - lotTotalCostBasis;
          const holdingPeriod = daysAgo >= 366 ? "long-term" : "short-term";

          const lot = await storage.createTaxLot({
            holdingId: holding.id,
            accountId: holding.accountId,
            clientId,
            ticker: holding.ticker,
            shares: String(sharesPerLot.toFixed(4)),
            costBasisPerShare: String(lotCostBasisPerShare.toFixed(4)),
            totalCostBasis: String(lotTotalCostBasis.toFixed(2)),
            currentPrice: String(currentPrice.toFixed(4)),
            marketValue: String(lotMarketValue.toFixed(2)),
            unrealizedGainLoss: String(lotGL.toFixed(2)),
            acquisitionDate: acquisitionDate.toISOString().split("T")[0],
            holdingPeriod,
            washSaleDisallowed: false,
            washSaleWindowStart: null,
            washSaleWindowEnd: null,
          });

          createdLots.push(lot);
        }
      }

      return createdLots;
    } catch (err) {
      logger.error({ err }, "Failed to generate tax lots from holdings");
      return [];
    }
  }

  private checkWashSaleRisk(ticker: string, events: WashSaleEvent[], now: Date): boolean {
    return events.some((e) => {
      if (e.ticker !== ticker || e.status !== "active") return false;
      const windowEnd = new Date(e.windowEnd);
      return windowEnd >= now;
    });
  }

  private getEstimatedPrice(ticker: string): number {
    const prices: Record<string, number> = {
      "AAPL": 178, "MSFT": 374, "AMZN": 145, "NVDA": 480, "GOOGL": 139,
      "GOOG": 141, "META": 357, "BRK.B": 363, "TSLA": 248, "UNH": 527,
      "JNJ": 157, "JPM": 172, "V": 261, "XOM": 105, "PG": 153,
      "MA": 410, "HD": 330, "LLY": 590, "ABBV": 155, "MRK": 109,
      "AVGO": 890, "PEP": 172, "KO": 58, "COST": 574, "TMO": 530,
      "ADBE": 560, "WMT": 165, "CRM": 220, "CSCO": 52, "ACN": 330,
      "VTI": 230, "IVV": 460,
    };
    return prices[ticker] || 150;
  }

  selectReplacementSecurity(
    ticker: string,
    washSaleRestrictedTickers: string[],
    alreadyUsedReplacements: string[] = [],
  ): { ticker: string; name: string; sector: string } | null {
    const restricted = new Set([...washSaleRestrictedTickers, ...alreadyUsedReplacements, ticker]);

    const explicitCandidates = SECTOR_REPLACEMENTS[ticker];
    if (explicitCandidates) {
      for (const candidate of explicitCandidates) {
        if (!restricted.has(candidate)) {
          const constituent = SP500_TOP_HOLDINGS.find((c) => c.ticker === candidate);
          return {
            ticker: candidate,
            name: constituent?.name || candidate,
            sector: constituent?.sector || getSectorForTicker(candidate),
          };
        }
      }
    }

    const sectorPeers = getSectorPeers(ticker);
    for (const candidate of sectorPeers) {
      if (!restricted.has(candidate)) {
        const constituent = SP500_TOP_HOLDINGS.find((c) => c.ticker === candidate);
        return {
          ticker: candidate,
          name: constituent?.name || candidate,
          sector: constituent?.sector || getSectorForTicker(candidate),
        };
      }
    }

    return null;
  }

  private selectLotsForSale(
    lots: import("@shared/schema").TaxLot[],
    ticker: string,
    sharesToSell: number,
    shortTermRate: number = 0.37,
    longTermRate: number = 0.20,
  ): { lot: import("@shared/schema").TaxLot; sharesToSell: number; taxImpact: { realizedGainLoss: number; holdingPeriod: string; taxCost: number } }[] {
    const tickerLots = lots
      .filter((l) => l.ticker === ticker)
      .sort((a, b) => {
        const costA = parseFloat(String(a.costBasisPerShare || "0"));
        const costB = parseFloat(String(b.costBasisPerShare || "0"));
        return costB - costA;
      });

    const selected: { lot: import("@shared/schema").TaxLot; sharesToSell: number; taxImpact: { realizedGainLoss: number; holdingPeriod: string; taxCost: number } }[] = [];
    let remaining = sharesToSell;

    for (const lot of tickerLots) {
      if (remaining <= 0) break;
      const lotShares = parseFloat(String(lot.shares || "0"));
      const sellShares = Math.min(remaining, lotShares);
      const costBasis = parseFloat(String(lot.costBasisPerShare || "0"));
      const currentPrice = parseFloat(String(lot.currentPrice || "0"));
      const realizedGL = (currentPrice - costBasis) * sellShares;
      const holdingPeriod = lot.holdingPeriod || "short-term";
      const effectiveTaxRate = holdingPeriod === "long-term" ? longTermRate : shortTermRate;
      const taxCost = realizedGL > 0 ? realizedGL * effectiveTaxRate : realizedGL * shortTermRate;

      selected.push({
        lot,
        sharesToSell: sellShares,
        taxImpact: {
          realizedGainLoss: parseFloat(realizedGL.toFixed(2)),
          holdingPeriod,
          taxCost: parseFloat(taxCost.toFixed(2)),
        },
      });

      remaining -= sellShares;
    }

    return selected;
  }

  async generateRebalanceProposal(
    portfolioId: string,
    clientId: string,
    driftTolerance: number = 1.0,
    taxRate: number = 0.37,
  ): Promise<RebalanceProposal | null> {
    try {
      const portfolio = await storage.getDirectIndexPortfolio(portfolioId);
      if (!portfolio) return null;

      const indexDef = INDEX_DEFINITIONS[portfolio.targetIndex];
      if (!indexDef) return null;

      const allocations = (portfolio.allocations as any[]) || [];
      const totalValue = parseFloat(String(portfolio.totalValue || "0"));
      if (totalValue <= 0) return null;

      const totalWeight = indexDef.constituents.reduce((s, c) => s + c.weight, 0);

      const washSaleEvents = await storage.getWashSaleEventsByClient(clientId);
      const now = new Date();
      const washSaleRestrictedTickers = washSaleEvents
        .filter((e) => new Date(e.windowEnd) >= now && e.status === "active")
        .map((e) => e.ticker);

      const lots = await storage.getTaxLotsByClient(clientId);

      const trades: TradeProposal[] = [];
      const usedReplacements: string[] = [];
      let washSaleAvoidances = 0;

      const allocMap = new Map<string, any>();
      for (const a of allocations) {
        allocMap.set(a.ticker, a);
      }

      for (const constituent of indexDef.constituents) {
        const targetWeight = (constituent.weight / totalWeight) * 100;
        const alloc = allocMap.get(constituent.ticker);
        const currentValue = alloc ? (alloc.estimatedValue || 0) : 0;
        const currentWeight = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
        const drift = currentWeight - targetWeight;

        if (Math.abs(drift) <= driftTolerance) continue;

        const targetValue = (targetWeight / 100) * totalValue;
        const valueDiff = targetValue - currentValue;
        const price = this.getEstimatedPrice(constituent.ticker);
        const shareDiff = Math.abs(Math.round(valueDiff / price));

        if (shareDiff === 0) continue;

        if (drift > 0) {
          const longTermRate = Math.min(taxRate, 0.20);
          const lotSelections = this.selectLotsForSale(lots, constituent.ticker, shareDiff, taxRate, longTermRate);
          const actualSharesSold = lotSelections.reduce((s, l) => s + l.sharesToSell, 0);
          if (actualSharesSold === 0) continue;

          const totalTaxImpact = lotSelections.reduce((s, l) => s + l.taxImpact.realizedGainLoss, 0);
          const totalTaxCost = lotSelections.reduce((s, l) => s + l.taxImpact.taxCost, 0);

          trades.push({
            ticker: constituent.ticker,
            name: constituent.name,
            sector: constituent.sector,
            action: "sell",
            shares: actualSharesSold,
            estimatedValue: parseFloat((actualSharesSold * price).toFixed(2)),
            currentWeight: parseFloat(currentWeight.toFixed(2)),
            targetWeight: parseFloat(targetWeight.toFixed(2)),
            reason: `Overweight by ${drift.toFixed(2)}% — reduce to target`,
            taxImpact: {
              realizedGainLoss: parseFloat(totalTaxImpact.toFixed(2)),
              holdingPeriod: lotSelections[0]?.taxImpact.holdingPeriod || "short-term",
              taxCost: parseFloat(totalTaxCost.toFixed(2)),
            },
            lotId: lotSelections[0]?.lot.id,
          });
        } else {
          if (washSaleRestrictedTickers.includes(constituent.ticker)) {
            washSaleAvoidances++;
            const replacement = this.selectReplacementSecurity(
              constituent.ticker,
              washSaleRestrictedTickers,
              usedReplacements,
            );
            if (replacement) {
              usedReplacements.push(replacement.ticker);
              trades.push({
                ticker: replacement.ticker,
                name: replacement.name,
                sector: replacement.sector,
                action: "buy",
                shares: shareDiff,
                estimatedValue: parseFloat((shareDiff * this.getEstimatedPrice(replacement.ticker)).toFixed(2)),
                currentWeight: 0,
                targetWeight: parseFloat(targetWeight.toFixed(2)),
                reason: `Replacement for ${constituent.ticker} (wash sale window active)`,
                replacementFor: constituent.ticker,
              });
            }
          } else {
            trades.push({
              ticker: constituent.ticker,
              name: constituent.name,
              sector: constituent.sector,
              action: "buy",
              shares: shareDiff,
              estimatedValue: parseFloat((shareDiff * price).toFixed(2)),
              currentWeight: parseFloat(currentWeight.toFixed(2)),
              targetWeight: parseFloat(targetWeight.toFixed(2)),
              reason: `Underweight by ${Math.abs(drift).toFixed(2)}% — increase to target`,
            });
          }
        }
      }

      trades.sort((a, b) => b.estimatedValue - a.estimatedValue);

      const buys = trades.filter((t) => t.action === "buy");
      const sells = trades.filter((t) => t.action === "sell");
      const totalBuyValue = buys.reduce((s, t) => s + t.estimatedValue, 0);
      const totalSellValue = sells.reduce((s, t) => s + t.estimatedValue, 0);
      const estimatedTaxImpact = sells.reduce((s, t) => s + (t.taxImpact?.taxCost || 0), 0);

      const projectedAllocations = [...allocations];
      for (const trade of trades) {
        const existing = projectedAllocations.find((a: any) => a.ticker === trade.ticker);
        if (trade.action === "buy") {
          if (existing) {
            existing.estimatedValue = (existing.estimatedValue || 0) + trade.estimatedValue;
            existing.shares = (existing.shares || 0) + trade.shares;
          } else {
            projectedAllocations.push({
              ticker: trade.ticker,
              name: trade.name,
              sector: trade.sector,
              estimatedValue: trade.estimatedValue,
              shares: trade.shares,
              targetWeight: trade.targetWeight,
            });
          }
        } else {
          if (existing) {
            existing.estimatedValue = Math.max(0, (existing.estimatedValue || 0) - trade.estimatedValue);
            existing.shares = Math.max(0, (existing.shares || 0) - trade.shares);
          }
        }
      }

      const projectedTotalValue = projectedAllocations.reduce((s: number, a: any) => s + (a.estimatedValue || 0), 0);
      const projectedSectorActuals: Record<string, number> = {};
      const sectorTargets: Record<string, number> = {};

      for (const c of indexDef.constituents) {
        sectorTargets[c.sector] = (sectorTargets[c.sector] || 0) + (c.weight / totalWeight) * 100;
      }

      for (const a of projectedAllocations) {
        const constituent = indexDef.constituents.find((c) => c.ticker === a.ticker);
        const sector = constituent?.sector || a.sector || "Other";
        const w = projectedTotalValue > 0 ? ((a.estimatedValue || 0) / projectedTotalValue) * 100 : 0;
        projectedSectorActuals[sector] = (projectedSectorActuals[sector] || 0) + w;
      }

      const allSectors = [...new Set([...Object.keys(sectorTargets), ...Object.keys(projectedSectorActuals)])];
      const projectedSectorDeviations = allSectors.map((sector) => ({
        sector,
        target: parseFloat((sectorTargets[sector] || 0).toFixed(2)),
        projected: parseFloat((projectedSectorActuals[sector] || 0).toFixed(2)),
        deviation: parseFloat(((projectedSectorActuals[sector] || 0) - (sectorTargets[sector] || 0)).toFixed(2)),
      }));

      const constituentTickers = new Set(indexDef.constituents.map((c) => c.ticker));
      const projectedTickerDeviations: number[] = [];

      for (const c of indexDef.constituents) {
        const tw = (c.weight / totalWeight) * 100;
        const alloc = projectedAllocations.find((a: any) => a.ticker === c.ticker);
        const aw = alloc && projectedTotalValue > 0 ? ((alloc.estimatedValue || 0) / projectedTotalValue) * 100 : 0;
        projectedTickerDeviations.push(Math.abs(aw - tw));
      }

      for (const a of projectedAllocations) {
        if (!constituentTickers.has(a.ticker) && (a.estimatedValue || 0) > 0) {
          const aw = projectedTotalValue > 0 ? ((a.estimatedValue || 0) / projectedTotalValue) * 100 : 0;
          projectedTickerDeviations.push(aw);
        }
      }

      const projectedActiveShare = parseFloat((projectedTickerDeviations.reduce((s, d) => s + d, 0) / 2).toFixed(2));

      return {
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        targetIndex: indexDef.name,
        totalPortfolioValue: totalValue,
        driftTolerance,
        trades,
        summary: {
          totalBuys: buys.length,
          totalSells: sells.length,
          totalBuyValue: parseFloat(totalBuyValue.toFixed(2)),
          totalSellValue: parseFloat(totalSellValue.toFixed(2)),
          netCashFlow: parseFloat((totalSellValue - totalBuyValue).toFixed(2)),
          estimatedTaxImpact: parseFloat(estimatedTaxImpact.toFixed(2)),
          positionsAdjusted: trades.length,
          washSaleAvoidances,
        },
        postRebalanceMetrics: {
          projectedActiveShare,
          projectedTrackingDifference: parseFloat((projectedActiveShare * 0.15).toFixed(4)),
          sectorDeviations: projectedSectorDeviations,
        },
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.error({ err }, "Failed to generate rebalance proposal");
      return null;
    }
  }

  private getSubstantiallyIdenticalTickers(ticker: string): { ticker: string; method: string; correlation: number }[] {
    const results: { ticker: string; method: string; correlation: number }[] = [];

    const shareClassPairs: Record<string, string> = {
      "GOOGL": "GOOG", "GOOG": "GOOGL",
      "BRK.A": "BRK.B", "BRK.B": "BRK.A",
    };
    if (shareClassPairs[ticker]) {
      results.push({
        ticker: shareClassPairs[ticker],
        method: "Same CUSIP / share class equivalent",
        correlation: 1.0,
      });
    }

    const sameIndexGroups: Record<string, string[]> = {
      "sp500_tech_mega": ["AAPL", "MSFT", "NVDA", "AVGO"],
      "sp500_search_ad": ["GOOGL", "GOOG", "META"],
      "sp500_payments": ["V", "MA"],
      "sp500_big_banks": ["JPM", "BAC", "WFC"],
      "sp500_inv_banks": ["GS", "MS"],
      "sp500_big_pharma": ["JNJ", "PFE", "MRK", "ABBV"],
      "sp500_biotech": ["AMGN", "GILD", "BIIB", "REGN", "VRTX"],
      "sp500_oil_major": ["XOM", "CVX"],
      "sp500_staples_bev": ["PEP", "KO"],
      "sp500_industrial_gas": ["LIN", "APD"],
      "sp500_defense": ["RTX", "LMT", "NOC", "GD"],
      "sp500_auto": ["GM", "F"],
      "sp500_telecom": ["VZ", "T"],
      "sp500_disc_retail": ["HD", "LOW"],
      "sp500_fast_food": ["MCD", "SBUX", "YUM"],
    };

    for (const [groupId, members] of Object.entries(sameIndexGroups)) {
      if (members.includes(ticker)) {
        for (const member of members) {
          if (member !== ticker && !results.some((r) => r.ticker === member)) {
            results.push({
              ticker: member,
              method: `Same-index sub-group membership (${groupId})`,
              correlation: 0.995,
            });
          }
        }
      }
    }

    const directReplacements = SECTOR_REPLACEMENTS[ticker] || [];
    for (const peer of directReplacements.slice(0, 3)) {
      if (!results.some((r) => r.ticker === peer)) {
        const isFirstPeer = directReplacements.indexOf(peer) === 0;
        results.push({
          ticker: peer,
          method: "Correlation-based test (sector peer)",
          correlation: isFirstPeer ? 0.97 : 0.96,
        });
      }
    }

    return results;
  }

  async checkWashSaleCompliance(
    clientId: string,
    ticker: string,
  ): Promise<WashSaleComplianceResult[]> {
    try {
      const washSaleEvents = await storage.getWashSaleEventsByClient(clientId);
      const now = new Date();
      const results: WashSaleComplianceResult[] = [];

      const sameTickerEvents = washSaleEvents.filter((e) => e.ticker === ticker && e.status === "active");
      for (const event of sameTickerEvents) {
        const windowEnd = new Date(event.windowEnd);
        const windowStart = new Date(event.windowStart);
        const daysRemaining = Math.max(0, Math.ceil((windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const windowDuration = Math.ceil((windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 0 || windowDuration > 61) continue;

        results.push({
          ticker: event.ticker,
          isSubstantiallyIdentical: true,
          detectionMethod: "Same CUSIP / identical security",
          correlationScore: 1.0,
          windowStart: event.windowStart,
          windowEnd: event.windowEnd,
          daysRemaining,
          replacementStrategies: this.getReplacementStrategies(ticker),
          status: "blocked",
        });
      }

      const substantiallyIdentical = this.getSubstantiallyIdenticalTickers(ticker);
      for (const si of substantiallyIdentical) {
        const siEvents = washSaleEvents.filter((e) => e.ticker === si.ticker && e.status === "active");
        for (const event of siEvents) {
          const windowEnd = new Date(event.windowEnd);
          const windowStart = new Date(event.windowStart);
          const daysRemaining = Math.max(0, Math.ceil((windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          const windowDuration = Math.ceil((windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24));

          if (daysRemaining <= 0 || windowDuration > 61) continue;

          const isBlocked = si.correlation >= 0.99;
          results.push({
            ticker: si.ticker,
            isSubstantiallyIdentical: si.correlation >= 0.95,
            detectionMethod: si.method,
            correlationScore: si.correlation,
            windowStart: event.windowStart,
            windowEnd: event.windowEnd,
            daysRemaining,
            replacementStrategies: this.getReplacementStrategies(si.ticker),
            status: isBlocked ? "blocked" : "warning",
          });
        }

        if (!siEvents.some((e) => new Date(e.windowEnd) >= now && e.status === "active")) {
          results.push({
            ticker: si.ticker,
            isSubstantiallyIdentical: si.correlation >= 0.95,
            detectionMethod: si.method,
            correlationScore: si.correlation,
            windowStart: "",
            windowEnd: "",
            daysRemaining: 0,
            replacementStrategies: [],
            status: si.correlation >= 0.99 ? "warning" : "clear",
          });
        }
      }

      if (results.length === 0) {
        results.push({
          ticker,
          isSubstantiallyIdentical: false,
          detectionMethod: "No wash sale risk — no identical or substantially identical securities detected",
          correlationScore: null,
          windowStart: "",
          windowEnd: "",
          daysRemaining: 0,
          replacementStrategies: [],
          status: "clear",
        });
      }

      return results;
    } catch (err) {
      logger.error({ err }, "Failed to check wash sale compliance");
      return [];
    }
  }

  private getReplacementStrategies(ticker: string): WashSaleComplianceResult["replacementStrategies"] {
    const strategies: WashSaleComplianceResult["replacementStrategies"] = [];
    const replacements = SECTOR_REPLACEMENTS[ticker];

    if (replacements && replacements.length > 0) {
      const differentSectorPeer = replacements.find((r) => getSectorForTicker(r) !== getSectorForTicker(ticker));
      strategies.push({
        strategy: "Different sector peer",
        description: `Buy ${differentSectorPeer || replacements[0]} as a non-identical replacement`,
        riskLevel: "low",
        replacement: differentSectorPeer || replacements[0],
      });

      strategies.push({
        strategy: "Complementary security",
        description: `Use ${replacements[1] || replacements[0]} from same sector with lower correlation`,
        riskLevel: "medium",
        replacement: replacements[1] || replacements[0],
      });
    }

    strategies.push({
      strategy: "Delay repurchase",
      description: "Wait until the 61-day window expires before repurchasing",
      riskLevel: "low",
    });

    strategies.push({
      strategy: "Harvest both sides",
      description: "Sell both the loss position and any gain position in the same security to avoid wash sale",
      riskLevel: "high",
    });

    return strategies;
  }

  async calculateTaxAlphaComparison(
    clientId: string,
    portfolioValue: number,
    taxRate: number = 0.37,
  ): Promise<TaxAlphaComparison> {
    try {
      const harvestable = await this.identifyHarvestableLots(clientId, taxRate);
      const totalHarvestableLoss = harvestable.reduce((s, h) => s + h.unrealizedLoss, 0);

      const dividendYield = 0.015;
      const traditionalDividendDrag = portfolioValue * dividendYield * taxRate;
      const internalCapGainsRate = 0.02;
      const traditionalInternalCapGains = portfolioValue * internalCapGainsRate * Math.min(taxRate, 0.20);
      const traditionalTotalCost = traditionalDividendDrag + traditionalInternalCapGains;

      const diHarvestingBenefit = totalHarvestableLoss * taxRate;
      const diDividendDrag = portfolioValue * dividendYield * taxRate * 0.95;
      const diTotalBenefit = diHarvestingBenefit - diDividendDrag;

      const taxAlpha = diHarvestingBenefit - traditionalTotalCost + (traditionalDividendDrag - diDividendDrag);

      const scenarios = [
        { scenario: "Conservative", harvestRate: 0.015 },
        { scenario: "Moderate", harvestRate: 0.03 },
        { scenario: "Aggressive", harvestRate: 0.05 },
      ];

      const sensitivityAnalysis = scenarios.map((s) => {
        const harvestedLoss = portfolioValue * s.harvestRate;
        const alpha = harvestedLoss * taxRate - traditionalTotalCost;
        return {
          scenario: s.scenario,
          harvestRate: s.harvestRate,
          taxAlpha: parseFloat(((alpha / portfolioValue) * 100).toFixed(2)),
          annualBenefit: parseFloat(alpha.toFixed(2)),
        };
      });

      const harvestableRatio = portfolioValue > 0 ? totalHarvestableLoss / portfolioValue : 0;
      const trackingErrorValue = Math.min(2.0, 0.3 + harvestableRatio * 10);
      const trackingBand = trackingErrorValue < 0.5 ? "Excellent (<0.5%)" : trackingErrorValue < 1.0 ? "Good (0.5-1.0%)" : "Moderate (1.0-2.0%)";
      const informationRatio = taxAlpha > 0 ? parseFloat((taxAlpha / (portfolioValue * trackingErrorValue / 100)).toFixed(2)) : 0;

      return {
        traditional: {
          dividendTaxDrag: parseFloat(traditionalDividendDrag.toFixed(2)),
          internalCapGains: parseFloat(traditionalInternalCapGains.toFixed(2)),
          totalCost: parseFloat(traditionalTotalCost.toFixed(2)),
          netReturn: parseFloat((-traditionalTotalCost).toFixed(2)),
        },
        directIndexing: {
          harvestingBenefit: parseFloat(diHarvestingBenefit.toFixed(2)),
          dividendTaxDrag: parseFloat(diDividendDrag.toFixed(2)),
          totalBenefit: parseFloat(diTotalBenefit.toFixed(2)),
          netReturn: parseFloat(diTotalBenefit.toFixed(2)),
        },
        taxAlpha: parseFloat(taxAlpha.toFixed(2)),
        sensitivityAnalysis,
        trackingError: {
          value: parseFloat(trackingErrorValue.toFixed(2)),
          band: trackingBand,
          informationRatio,
        },
      };
    } catch (err) {
      logger.error({ err }, "Failed to calculate tax alpha comparison");
      return {
        traditional: { dividendTaxDrag: 0, internalCapGains: 0, totalCost: 0, netReturn: 0 },
        directIndexing: { harvestingBenefit: 0, dividendTaxDrag: 0, totalBenefit: 0, netReturn: 0 },
        taxAlpha: 0,
        sensitivityAnalysis: [],
        trackingError: { value: 0, band: "N/A", informationRatio: 0 },
      };
    }
  }

  calculateFeeComparison(
    portfolioValue: number,
    diAdvisoryRate: number = 0.0035,
    diTradingCostBps: number = 5,
    etfExpenseRatio: number = 0.0003,
    etfAdvisoryRate: number = 0.0025,
    annualHarvestBenefit: number = 0,
  ): FeeComparisonResult {
    const diAdvisoryFee = portfolioValue * diAdvisoryRate;
    const diTradingCosts = portfolioValue * (diTradingCostBps / 10000);
    const diTotalCost = diAdvisoryFee + diTradingCosts;

    const etfExpense = portfolioValue * etfExpenseRatio;
    const etfAdvisory = portfolioValue * etfAdvisoryRate;
    const etfTotal = etfExpense + etfAdvisory;

    const netSavings = annualHarvestBenefit - (diTotalCost - etfTotal);

    const costDiffPerDollar = (diAdvisoryRate + diTradingCostBps / 10000) - (etfExpenseRatio + etfAdvisoryRate);
    const harvestBenefitRate = portfolioValue > 0 ? annualHarvestBenefit / portfolioValue : 0;
    const breakEvenAum = costDiffPerDollar > 0 && harvestBenefitRate > 0
      ? Math.round((costDiffPerDollar / harvestBenefitRate) * portfolioValue)
      : costDiffPerDollar <= 0 ? 0 : 999999999;

    let recommendation: string;
    if (netSavings > 0 && portfolioValue >= 500000) {
      recommendation = "Direct indexing is cost-beneficial at this AUM level with current harvest opportunities";
    } else if (portfolioValue < 250000) {
      recommendation = "Portfolio may be too small for direct indexing to overcome higher costs; consider ETFs";
    } else {
      recommendation = "Direct indexing costs are marginally higher; benefit depends on future harvest opportunities";
    }

    return {
      directIndexing: {
        advisoryFee: parseFloat(diAdvisoryFee.toFixed(2)),
        tradingCosts: parseFloat(diTradingCosts.toFixed(2)),
        totalCost: parseFloat(diTotalCost.toFixed(2)),
        costBps: parseFloat(((diTotalCost / portfolioValue) * 10000).toFixed(1)),
      },
      etf: {
        expenseRatio: parseFloat(etfExpense.toFixed(2)),
        advisoryFee: parseFloat(etfAdvisory.toFixed(2)),
        totalCost: parseFloat(etfTotal.toFixed(2)),
        costBps: parseFloat(((etfTotal / portfolioValue) * 10000).toFixed(1)),
      },
      annualSavings: parseFloat(netSavings.toFixed(2)),
      breakEvenAum: Math.max(0, breakEvenAum),
      recommendation,
    };
  }

  async generateHarvestingStrategy(
    clientId: string,
    taxRate: number = 0.37,
  ): Promise<HarvestingStrategy> {
    try {
      const harvestable = await this.identifyHarvestableLots(clientId, taxRate);
      const washSaleTracker = await this.getWashSaleTracker(clientId);

      const immediateLots = harvestable.filter((h) => !h.washSaleRisk);
      const immediateSavings = immediateLots.reduce((s, h) => s + h.potentialTaxSavings, 0);

      const lots = await storage.getTaxLotsByClient(clientId);
      let ytdGains = 0;
      let ytdLosses = 0;
      for (const lot of lots) {
        const gl = parseFloat(String(lot.unrealizedGainLoss || "0"));
        if (gl > 0) ytdGains += gl;
        else ytdLosses += Math.abs(gl);
      }

      const netPosition = ytdGains - ytdLosses;
      const ordinaryIncomeOffset = Math.min(3000, ytdLosses - ytdGains > 0 ? ytdLosses - ytdGains : 0);

      const yearEndHarvests = harvestable.filter((h) => !h.washSaleRisk).slice(0, 10);
      const yearEndSavings = yearEndHarvests.reduce((s, h) => s + h.potentialTaxSavings, 0);

      const currentYear = new Date().getFullYear();
      const multiYear: HarvestingStrategy["multiYear"] = [];
      let cumulative = 0;
      for (let year = currentYear; year <= currentYear + 2; year++) {
        const yearOffset = year - currentYear;
        const decayFactor = Math.pow(0.85, yearOffset);
        const yearHarvests = harvestable
          .filter((h) => !h.washSaleRisk)
          .slice(0, 5)
          .map((h) => ({
            ticker: h.lot.ticker,
            estimatedLoss: h.unrealizedLoss * decayFactor,
            estimatedSavings: h.potentialTaxSavings * decayFactor,
          }));
        cumulative += yearHarvests.reduce((s, h) => s + h.estimatedSavings, 0);
        multiYear.push({
          year,
          scheduledHarvests: yearHarvests.map((h) => ({
            ticker: h.ticker,
            estimatedLoss: parseFloat(h.estimatedLoss.toFixed(2)),
            estimatedSavings: parseFloat(h.estimatedSavings.toFixed(2)),
          })),
          cumulativeSavings: parseFloat(cumulative.toFixed(2)),
        });
      }

      const stCarryforward = washSaleTracker.totalDisallowedLosses * 0.4;
      const ltCarryforward = washSaleTracker.totalDisallowedLosses * 0.6;

      return {
        immediate: {
          lots: immediateLots.slice(0, 10),
          totalSavings: parseFloat(immediateSavings.toFixed(2)),
          safeToHarvest: immediateLots.length > 0,
        },
        yearEnd: {
          ytdGains: parseFloat(ytdGains.toFixed(2)),
          ytdLosses: parseFloat(ytdLosses.toFixed(2)),
          netPosition: parseFloat(netPosition.toFixed(2)),
          ordinaryIncomeOffset: parseFloat(ordinaryIncomeOffset.toFixed(2)),
          recommendedHarvests: yearEndHarvests,
          projectedSavings: parseFloat(yearEndSavings.toFixed(2)),
        },
        multiYear,
        carryforward: {
          shortTermCarryforward: parseFloat(stCarryforward.toFixed(2)),
          longTermCarryforward: parseFloat(ltCarryforward.toFixed(2)),
          totalCarryforward: parseFloat((stCarryforward + ltCarryforward).toFixed(2)),
          expirationNotes: "Capital loss carryforwards do not expire under current IRC rules",
        },
      };
    } catch (err) {
      logger.error({ err }, "Failed to generate harvesting strategy");
      return {
        immediate: { lots: [], totalSavings: 0, safeToHarvest: false },
        yearEnd: { ytdGains: 0, ytdLosses: 0, netPosition: 0, ordinaryIncomeOffset: 0, recommendedHarvests: [], projectedSavings: 0 },
        multiYear: [],
        carryforward: { shortTermCarryforward: 0, longTermCarryforward: 0, totalCarryforward: 0, expirationNotes: "" },
      };
    }
  }

  async analyzePortfolioConstruction(
    portfolioId: string,
    esgExclusions: string[] = [],
  ): Promise<PortfolioConstructionAnalysis> {
    try {
      const portfolio = await storage.getDirectIndexPortfolio(portfolioId);
      if (!portfolio) throw new Error("Portfolio not found");

      const indexDef = INDEX_DEFINITIONS[portfolio.targetIndex];
      if (!indexDef) throw new Error("Index not found");

      const allocations = (portfolio.allocations as any[]) || [];
      const totalValue = allocations.reduce((s: number, a: any) => s + (a.estimatedValue || 0), 0);
      const totalWeight = indexDef.constituents.reduce((s, c) => s + c.weight, 0);

      const sectorTargets: Record<string, number> = {};
      const sectorActuals: Record<string, number> = {};

      for (const c of indexDef.constituents) {
        sectorTargets[c.sector] = (sectorTargets[c.sector] || 0) + (c.weight / totalWeight) * 100;
      }

      for (const a of allocations) {
        const sector = getSectorForTicker(a.ticker) || a.sector || "Other";
        const w = totalValue > 0 ? ((a.estimatedValue || 0) / totalValue) * 100 : 0;
        sectorActuals[sector] = (sectorActuals[sector] || 0) + w;
      }

      const allSectors = [...new Set([...Object.keys(sectorTargets), ...Object.keys(sectorActuals)])];
      const sectorConstraints = allSectors.map((sector) => {
        const target = sectorTargets[sector] || 0;
        const actual = sectorActuals[sector] || 0;
        const maxAllowed = target + 2.0;
        return {
          sector,
          targetWeight: parseFloat(target.toFixed(2)),
          actualWeight: parseFloat(actual.toFixed(2)),
          deviation: parseFloat((actual - target).toFixed(2)),
          withinLimit: Math.abs(actual - target) <= 2.0,
          maxAllowed: parseFloat(maxAllowed.toFixed(2)),
        };
      });

      const tickerWeights = allocations.map((a: any) => ({
        ticker: a.ticker as string,
        weight: totalValue > 0 ? ((a.estimatedValue || 0) / totalValue) * 100 : 0,
      })).sort((a, b) => b.weight - a.weight);

      const weightedBeta = allocations.reduce((sum: number, a: any) => {
        const w = totalValue > 0 ? ((a.estimatedValue || 0) / totalValue) : 0;
        return sum + w;
      }, 0);
      const beta = parseFloat((0.98 + weightedBeta * 0.02).toFixed(3));
      const techWeight = sectorActuals["Technology"] || 0;
      const techTarget = sectorTargets["Technology"] || 0;
      const growthTilt = parseFloat(((techWeight - techTarget) * 0.01).toFixed(3));

      const factorExposure = [
        {
          metric: "Beta",
          target: 1.0,
          actual: parseFloat(beta.toFixed(3)),
          deviation: parseFloat((beta - 1.0).toFixed(3)),
          withinTolerance: Math.abs(beta - 1.0) <= 0.05,
          tolerance: 0.05,
        },
        {
          metric: "Growth/Value Tilt",
          target: 0,
          actual: parseFloat(growthTilt.toFixed(3)),
          deviation: parseFloat(growthTilt.toFixed(3)),
          withinTolerance: Math.abs(growthTilt) <= 0.05,
          tolerance: 0.05,
        },
      ];

      for (const sc of sectorConstraints) {
        factorExposure.push({
          metric: `${sc.sector} Weight`,
          target: sc.targetWeight,
          actual: sc.actualWeight,
          deviation: sc.deviation,
          withinTolerance: Math.abs(sc.deviation) <= 2.0,
          tolerance: 2.0,
        });
      }

      const ESG_CATEGORY_TICKERS: Record<string, string[]> = {
        tobacco: ["PM", "MO", "BTI"],
        firearms: ["SWBI", "RGR", "AXON"],
        fossil_fuels: ["XOM", "CVX", "COP", "EOG", "SLB", "OXY", "MPC", "VLO", "PSX", "HAL"],
        gambling: ["MGM", "LVS", "WYNN", "CZR", "DKNG", "PENN"],
        alcohol: ["DEO", "BF.B", "STZ", "TAP", "SAM"],
        nuclear: ["CEG", "VST", "DUK"],
        private_prisons: ["GEO", "CXW"],
      };

      const excludedTickers = new Set<string>();
      for (const exclusion of esgExclusions) {
        const categoryTickers = ESG_CATEGORY_TICKERS[exclusion.toLowerCase()];
        if (categoryTickers) {
          categoryTickers.forEach((t) => excludedTickers.add(t));
        } else {
          excludedTickers.add(exclusion);
        }
      }

      const esgExcluded = Array.from(excludedTickers);

      const replacementSuggestions = esgExcluded
        .filter((t) => allocations.some((a: any) => a.ticker === t))
        .map((excluded) => {
          const candidates = SECTOR_REPLACEMENTS[excluded] || getSectorPeers(excluded);
          const replacement = candidates.find((c) => !excludedTickers.has(c)) || candidates[0] || "N/A";
          return {
            excluded,
            replacement,
            reason: esgExclusions.find((cat) => (ESG_CATEGORY_TICKERS[cat.toLowerCase()] || []).includes(excluded)) || "direct exclusion",
            sector: getSectorForTicker(excluded),
          };
        });

      const esgImpact = replacementSuggestions.length > 0
        ? replacementSuggestions.length * 0.05
        : 0;

      const singleStockLimit = 5.0;
      const top10Limit = 40.0;
      const violations = tickerWeights
        .filter((tw) => tw.weight > singleStockLimit)
        .map((tw) => ({
          ticker: tw.ticker,
          weight: parseFloat(tw.weight.toFixed(2)),
          limit: singleStockLimit,
          type: "single-stock",
        }));

      const top10Weight = tickerWeights.slice(0, 10).reduce((s, tw) => s + tw.weight, 0);
      if (top10Weight > top10Limit) {
        violations.push({
          ticker: "Top 10",
          weight: parseFloat(top10Weight.toFixed(2)),
          limit: top10Limit,
          type: "top-10-concentration",
        });
      }

      return {
        factorExposure,
        sectorConstraints,
        esgScreening: {
          excludedTickers: esgExcluded,
          replacementSuggestions,
          impactOnTracking: parseFloat(esgImpact.toFixed(2)),
        },
        concentrationLimits: {
          singleStockLimit,
          top10Limit,
          violations,
          top10Weight: parseFloat(top10Weight.toFixed(2)),
          top10WithinLimit: top10Weight <= top10Limit,
        },
      };
    } catch (err) {
      logger.error({ err }, "Failed to analyze portfolio construction");
      return {
        factorExposure: [],
        sectorConstraints: [],
        esgScreening: { excludedTickers: [], replacementSuggestions: [], impactOnTracking: 0 },
        concentrationLimits: { singleStockLimit: 5, top10Limit: 40, violations: [], top10Weight: 0, top10WithinLimit: true },
      };
    }
  }

  async assessClientTaxContext(
    clientId: string,
    annualIncome: number = 500000,
    filingStatus: string = "married_filing_jointly",
  ): Promise<ClientTaxContext> {
    try {
      const brackets2024 = [
        { min: 0, max: 23200, rate: 0.10 },
        { min: 23200, max: 94300, rate: 0.12 },
        { min: 94300, max: 201050, rate: 0.22 },
        { min: 201050, max: 383900, rate: 0.24 },
        { min: 383900, max: 487450, rate: 0.32 },
        { min: 487450, max: 731200, rate: 0.35 },
        { min: 731200, max: Infinity, rate: 0.37 },
      ];

      let currentRate = 0.10;
      let bracketRange = "$0 - $23,200";
      for (const bracket of brackets2024) {
        if (annualIncome >= bracket.min && annualIncome < bracket.max) {
          currentRate = bracket.rate;
          bracketRange = `$${bracket.min.toLocaleString()} - ${bracket.max === Infinity ? "∞" : "$" + bracket.max.toLocaleString()}`;
          break;
        }
      }
      if (annualIncome >= 731200) {
        currentRate = 0.37;
        bracketRange = "$731,200+";
      }

      let projectedDirection: "up" | "down" | "stable" = "stable";
      let projectedRate = currentRate;
      let reason = "Income expected to remain in current bracket";
      if (annualIncome > 400000) {
        projectedDirection = "stable";
        reason = "High earner — likely to remain in top brackets";
      }

      const baseLtcgRate = annualIncome > 518900 ? 0.20 : annualIncome > 94050 ? 0.15 : 0;
      const niitApplicable = annualIncome > 250000;
      const effectiveLtcgRate = baseLtcgRate + (niitApplicable ? 0.038 : 0);

      const washSaleTracker = await this.getWashSaleTracker(clientId);
      const stCarryforward = washSaleTracker.totalDisallowedLosses * 0.4;
      const ltCarryforward = washSaleTracker.totalDisallowedLosses * 0.6;

      const now = new Date();
      const monthsLeft = 12 - now.getMonth();
      let urgency: "high" | "medium" | "low" = "low";
      let recommendation = "Standard harvesting timeline — review quarterly";
      let reasoning = "No immediate tax deadline pressure";

      if (monthsLeft <= 2) {
        urgency = "high";
        recommendation = "Year-end harvesting window — act immediately to realize losses before Dec 31";
        reasoning = `Only ${monthsLeft} month(s) remaining in tax year`;
      } else if (monthsLeft <= 4) {
        urgency = "medium";
        recommendation = "Begin evaluating year-end harvesting opportunities";
        reasoning = `${monthsLeft} months remaining in tax year — plan harvesting strategy`;
      }

      return {
        currentBracket: {
          rate: currentRate,
          bracketRange,
          filingStatus: filingStatus.replace(/_/g, " "),
        },
        projectedBracketChange: {
          direction: projectedDirection,
          projectedRate,
          reason,
        },
        ltcgRate: baseLtcgRate,
        niitApplicable,
        effectiveLtcgRate: parseFloat(effectiveLtcgRate.toFixed(3)),
        carryforwardBalance: {
          shortTerm: parseFloat(stCarryforward.toFixed(2)),
          longTerm: parseFloat(ltCarryforward.toFixed(2)),
          total: parseFloat((stCarryforward + ltCarryforward).toFixed(2)),
        },
        harvestingTimingRecommendation: {
          recommendation,
          reasoning,
          urgency,
        },
      };
    } catch (err) {
      logger.error({ err }, "Failed to assess client tax context");
      return {
        currentBracket: { rate: 0.37, bracketRange: "N/A", filingStatus: "unknown" },
        projectedBracketChange: { direction: "stable", projectedRate: 0.37, reason: "Unable to determine" },
        ltcgRate: 0.20,
        niitApplicable: false,
        effectiveLtcgRate: 0.238,
        carryforwardBalance: { shortTerm: 0, longTerm: 0, total: 0 },
        harvestingTimingRecommendation: { recommendation: "Review needed", reasoning: "Error in analysis", urgency: "low" },
      };
    }
  }

  getAvailableIndices() {
    return Object.entries(INDEX_DEFINITIONS).map(([key, val]) => ({
      id: key,
      name: val.name,
      constituentCount: val.constituents.length,
    }));
  }
}

export const directIndexingEngine = new DirectIndexingEngine();
