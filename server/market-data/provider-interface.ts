export enum ProviderCapability {
  REAL_TIME_QUOTE = "real_time_quote",
  BATCH_QUOTES = "batch_quotes",
  NEWS = "news",
  HISTORICAL = "historical",
  FUNDAMENTALS = "fundamentals",
  INSIDER = "insider",
  EARNINGS = "earnings",
  SENTIMENT = "sentiment",
}

export type HealthStatus = "healthy" | "degraded" | "unavailable";

export type Period = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y" | "5Y" | "10Y" | "MAX";
export type Interval = "1min" | "5min" | "15min" | "30min" | "60min" | "daily" | "weekly" | "monthly";

export interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  lastUpdated: string;
}

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
  relatedTickers: string[];
  sentiment?: SentimentScore;
}

export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}

export interface Fundamentals {
  ticker: string;
  sector: string;
  industry: string;
  marketCap: number;
  peRatio?: number;
  eps?: number;
  incomeStatement?: {
    revenue: number;
    netIncome: number;
    operatingIncome: number;
  };
  balanceSheet?: {
    totalAssets: number;
    totalLiabilities: number;
    equity: number;
  };
  cashFlow?: {
    operatingCashFlow: number;
    freeCashFlow: number;
  };
}

export interface InsiderTransaction {
  insider: string;
  title: string;
  shares: number;
  price: number;
  date: string;
  type: "buy" | "sell";
  value: number;
}

export interface EarningsEvent {
  ticker: string;
  date: string;
  eps?: number;
  revenue?: number;
  surprise?: number;
}

export interface SentimentScore {
  ticker: string;
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  source: string;
  date: string;
}

export interface RateLimitConfig {
  requestsPerMinute?: number;
  requestsPerDay?: number;
  requestsPerMonth?: number;
  burst?: number;
  concurrency?: number;
}

export interface HealthCheckMetrics {
  lastSuccess?: number;
  lastFailure?: number;
  consecutiveFailures: number;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
}

export interface ProviderMetadata {
  name: string;
  capabilities: ProviderCapability[];
  rateLimit: RateLimitConfig;
  priority: number;
  description?: string;
  website?: string;
  freeApiKey?: boolean;
}

export interface MarketDataProvider {
  getMetadata(): ProviderMetadata;
  getHealthStatus(): HealthStatus;
  setHealthStatus(status: HealthStatus): void;

  getQuote?(ticker: string): Promise<StockQuote | null>;
  getQuotes?(tickers: string[]): Promise<Map<string, StockQuote>>;
  getNews?(tickers?: string[]): Promise<NewsItem[]>;
  getHistorical?(ticker: string, period: Period, interval: Interval): Promise<HistoricalData[]>;
  getFundamentals?(ticker: string): Promise<Fundamentals | null>;
  getInsiderTransactions?(ticker: string): Promise<InsiderTransaction[]>;
  getEarningsCalendar?(from?: Date, to?: Date): Promise<EarningsEvent[]>;
  getSentiment?(ticker: string): Promise<SentimentScore | null>;
}
