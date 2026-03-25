// TODO: AlphaVantage provider is implemented but NOT currently active in production.
// It serves as a failover behind Yahoo Finance and Finnhub REST in the provider registry.
// To activate: set ALPHA_VANTAGE_API_KEY in .env and it will auto-register.
// Rate limit: 5 calls/minute on free tier — the rateLimiter below enforces this.
// Consider upgrading to a paid tier if this becomes a primary provider.
import axios, { AxiosInstance } from "axios";
import { logger } from "../../lib/logger";
import type {
  HistoricalData,
  Fundamentals,
  Period,
  Interval,
} from "../provider-interface";
import { ProviderCapability } from "../provider-interface";
import { BaseProvider } from "./base-provider";
import { rateLimiter } from "../rate-limiter";

interface AlphaVantageTimeSeries {
  [date: string]: {
    "1. open": string;
    "2. high": string;
    "3. low": string;
    "4. close": string;
    "5. volume": string;
    "6. adjusted close"?: string;
  };
}

export class AlphaVantageProvider extends BaseProvider {
  private apiKey: string;
  private apiClient: AxiosInstance;

  constructor(apiKey: string) {
    super({
      name: "Alpha Vantage",
      capabilities: [
        ProviderCapability.HISTORICAL,
        ProviderCapability.FUNDAMENTALS,
      ],
      priority: 2,
      rateLimit: {
        requestsPerDay: 25,
        burst: 1,
        concurrency: 1,
      },
      freeApiKey: true,
      description: "Alpha Vantage historical data and fundamentals API",
      website: "https://www.alphavantage.co",
    });

    this.apiKey = apiKey;
    this.apiClient = axios.create({
      baseURL: "https://www.alphavantage.co/query",
      timeout: 15000,
    });
  }

  async getHistorical(
    ticker: string,
    period: Period,
    interval: Interval
  ): Promise<HistoricalData[]> {
    this.logRequest("getHistorical", { ticker, period, interval });

    const allowed = await rateLimiter.track("Alpha Vantage");
    if (!allowed) {
      logger.warn("Alpha Vantage daily quota exceeded");
      throw new Error("Alpha Vantage daily quota exceeded");
    }

    try {
      let functionName: string;
      if (interval === "daily") functionName = "TIME_SERIES_DAILY";
      else if (interval === "weekly") functionName = "TIME_SERIES_WEEKLY";
      else if (interval === "monthly") functionName = "TIME_SERIES_MONTHLY";
      else throw new Error(`Unsupported interval: ${interval}`);

      const response = await this.apiClient.get<any>("", {
        params: {
          function: functionName,
          symbol: ticker.toUpperCase(),
          apikey: this.apiKey,
          outputsize: "full",
        },
      });

      if (response.data["Error Message"]) {
        logger.warn({ ticker }, "Alpha Vantage error response");
        throw new Error(response.data["Error Message"]);
      }

      if (response.data["Note"]) {
        logger.warn("Alpha Vantage rate limit note received");
        throw new Error("Alpha Vantage rate limited");
      }

      const timeSeriesKey = Object.keys(response.data).find(
        k => k.startsWith("Time Series")
      );
      if (!timeSeriesKey) return [];

      const timeSeries: AlphaVantageTimeSeries = response.data[timeSeriesKey];
      const dayLimit = this.getDayLimit(period);
      const dates = Object.keys(timeSeries).sort().reverse().slice(0, dayLimit);

      return dates.map(date => ({
        date,
        open: parseFloat(timeSeries[date]["1. open"]),
        high: parseFloat(timeSeries[date]["2. high"]),
        low: parseFloat(timeSeries[date]["3. low"]),
        close: parseFloat(timeSeries[date]["4. close"]),
        volume: parseFloat(timeSeries[date]["5. volume"]),
        adjustedClose: timeSeries[date]["6. adjusted close"]
          ? parseFloat(timeSeries[date]["6. adjusted close"]!)
          : undefined,
      }));
    } catch (error) {
      this.logError("getHistorical", error);
      throw error;
    }
  }

  async getFundamentals(ticker: string): Promise<Fundamentals | null> {
    this.logRequest("getFundamentals", { ticker });

    const allowed = await rateLimiter.track("Alpha Vantage");
    if (!allowed) {
      logger.warn("Alpha Vantage daily quota exceeded for fundamentals");
      throw new Error("Alpha Vantage daily quota exceeded");
    }

    try {
      const overviewRes = await this.apiClient.get<any>("", {
        params: {
          function: "OVERVIEW",
          symbol: ticker.toUpperCase(),
          apikey: this.apiKey,
        },
      });

      const data = overviewRes.data;
      if (!data || data["Error Message"] || !data.Symbol) {
        throw new Error("Alpha Vantage overview not available");
      }

      return {
        ticker: ticker.toUpperCase(),
        sector: data.Sector || "Unknown",
        industry: data.Industry || "Unknown",
        marketCap: parseFloat(data.MarketCapitalization || "0"),
        peRatio: data.PERatio && data.PERatio !== "None" ? parseFloat(data.PERatio) : undefined,
        eps: data.EPS && data.EPS !== "None" ? parseFloat(data.EPS) : undefined,
        incomeStatement: {
          revenue: parseFloat(data.RevenueTTM || "0"),
          netIncome: parseFloat(data.NetIncomeTTM || data.EBITDA || "0"),
          operatingIncome: parseFloat(data.OperatingMarginTTM || "0"),
        },
        balanceSheet: {
          totalAssets: parseFloat(data.BookValue || "0") * parseFloat(data.SharesOutstanding || "1"),
          totalLiabilities: 0,
          equity: parseFloat(data.BookValue || "0") * parseFloat(data.SharesOutstanding || "1"),
        },
        cashFlow: undefined,
      };
    } catch (error) {
      this.logError("getFundamentals", error);
      throw error;
    }
  }

  private getDayLimit(period: Period): number {
    switch (period) {
      case "1D": return 1;
      case "5D": return 5;
      case "1M": return 21;
      case "3M": return 63;
      case "6M": return 126;
      case "1Y": return 252;
      case "5Y": return 1260;
      case "10Y": return 2520;
      case "MAX": return 5000;
      default: return 252;
    }
  }
}
