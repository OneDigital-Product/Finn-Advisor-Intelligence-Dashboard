import axios, { AxiosInstance } from "axios";
import { logger } from "../../lib/logger";
import type {
  StockQuote,
  NewsItem,
  SentimentScore,
  EarningsEvent,
  InsiderTransaction,
} from "../provider-interface";
import { ProviderCapability } from "../provider-interface";
import { BaseProvider } from "./base-provider";

interface FinnhubQuoteResponse {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
  v: number;
}

interface FinnhubNewsResponse {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  symbol: string;
  url: string;
  sentiment?: number;
}

interface FinnhubEarningsResponse {
  earningsCalendar: Array<{
    actual?: number;
    date: string;
    estimate?: number;
    quarter: number;
    surprise?: number;
    surprisePercent?: number;
    symbol: string;
    year: number;
  }>;
}

interface FinnhubInsiderResponse {
  data: Array<{
    change: number;
    filingDate: string;
    name: string;
    position: string;
    price?: number;
    share: number;
    symbol: string;
    transactionDate: string;
    transactionPrice: number;
    transactionType: string;
    url: string;
  }>;
}

interface FinnhubProfileResponse {
  country: string;
  currency: string;
  description: string;
  estimateCurrency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  logo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  ticker: string;
  weburl: string;
}

export class FinnhubProvider extends BaseProvider {
  private apiKey: string;
  private apiClient: AxiosInstance;

  constructor(apiKey: string) {
    super({
      name: "Finnhub",
      capabilities: [
        ProviderCapability.REAL_TIME_QUOTE,
        ProviderCapability.BATCH_QUOTES,
        ProviderCapability.NEWS,
        ProviderCapability.SENTIMENT,
        ProviderCapability.EARNINGS,
        ProviderCapability.INSIDER,
      ],
      priority: 1,
      rateLimit: {
        requestsPerMinute: 60,
        burst: 10,
        concurrency: 5,
      },
      freeApiKey: true,
      description: "Finnhub real-time financial data API",
      website: "https://finnhub.io",
    });

    this.apiKey = apiKey;
    this.apiClient = axios.create({
      baseURL: "https://finnhub.io/api/v1",
      timeout: 10000,
    });
  }

  async getQuote(ticker: string): Promise<StockQuote | null> {
    this.logRequest("getQuote", { ticker });
    if (ticker === "CASH") return null;

    try {
      const response = await this.apiClient.get<FinnhubQuoteResponse>("/quote", {
        params: { symbol: ticker.toUpperCase(), token: this.apiKey },
      });

      const data = response.data;
      if (!data.c || data.c === 0) {
        logger.warn({ ticker }, "Finnhub returned zero price");
        return null;
      }

      return {
        ticker: ticker.toUpperCase(),
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        previousClose: data.pc,
        dayHigh: data.h,
        dayLow: data.l,
        volume: data.v,
        marketCap: null,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      this.logError("getQuote", error);
      throw error;
    }
  }

  async getQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
    this.logRequest("getQuotes", { count: tickers.length });
    const results = new Map<string, StockQuote>();

    for (const ticker of tickers) {
      if (ticker === "CASH") continue;
      try {
        const quote = await this.getQuote(ticker);
        if (quote) results.set(ticker, quote);
      } catch (error) {
        logger.warn({ ticker }, "Error fetching individual Finnhub quote");
      }
    }

    return results;
  }

  async getNews(tickers?: string[]): Promise<NewsItem[]> {
    this.logRequest("getNews", { tickers });
    const allNews: NewsItem[] = [];

    try {
      if (tickers && tickers.length > 0) {
        for (const ticker of tickers) {
          if (ticker === "CASH") continue;
          try {
            const response = await this.apiClient.get<FinnhubNewsResponse[]>("/company-news", {
              params: {
                symbol: ticker.toUpperCase(),
                from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                to: new Date().toISOString().split("T")[0],
                token: this.apiKey,
              },
            });

            allNews.push(
              ...response.data.slice(0, 5).map((item) => ({
                title: item.headline,
                link: item.url,
                source: item.source,
                pubDate: new Date(item.datetime * 1000).toISOString(),
                snippet: item.summary?.substring(0, 200) || "",
                relatedTickers: [ticker.toUpperCase()],
                sentiment: {
                  ticker: ticker.toUpperCase(),
                  sentiment: item.sentiment
                    ? item.sentiment > 0.1 ? ("positive" as const) : item.sentiment < -0.1 ? ("negative" as const) : ("neutral" as const)
                    : ("neutral" as const),
                  score: item.sentiment ?? 0,
                  source: "Finnhub",
                  date: new Date(item.datetime * 1000).toISOString(),
                },
              }))
            );
          } catch (error) {
            logger.warn({ ticker }, "Error fetching Finnhub news for ticker");
          }
        }
      } else {
        try {
          const response = await this.apiClient.get<FinnhubNewsResponse[]>("/news", {
            params: { category: "general", token: this.apiKey },
          });

          allNews.push(
            ...response.data.slice(0, 20).map((item) => ({
              title: item.headline,
              link: item.url,
              source: item.source,
              pubDate: new Date(item.datetime * 1000).toISOString(),
              snippet: item.summary?.substring(0, 200) || "",
              relatedTickers: item.related ? item.related.split(",").filter(Boolean) : [],
            }))
          );
        } catch (error) {
          logger.warn("Error fetching Finnhub general news");
          throw error;
        }
      }
    } catch (error) {
      this.logError("getNews", error);
      throw error;
    }

    return allNews
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 20);
  }

  async getSentiment(ticker: string): Promise<SentimentScore | null> {
    this.logRequest("getSentiment", { ticker });

    try {
      const response = await this.apiClient.get<FinnhubNewsResponse[]>("/company-news", {
        params: {
          symbol: ticker.toUpperCase(),
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          to: new Date().toISOString().split("T")[0],
          token: this.apiKey,
        },
      });

      if (response.data.length === 0) return null;

      const sentiments = response.data
        .map((item) => item.sentiment ?? 0)
        .filter((s) => s !== 0);

      const avgSentiment = sentiments.length > 0
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
        : 0;

      return {
        ticker: ticker.toUpperCase(),
        sentiment: avgSentiment > 0.1 ? "positive" : avgSentiment < -0.1 ? "negative" : "neutral",
        score: avgSentiment,
        source: "Finnhub",
        date: new Date().toISOString(),
      };
    } catch (error) {
      this.logError("getSentiment", error);
      throw error;
    }
  }

  async getEarningsCalendar(from?: Date, to?: Date): Promise<EarningsEvent[]> {
    this.logRequest("getEarningsCalendar", { from, to });

    try {
      const fromDate = from ?? new Date();
      const toDate = to ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

      const response = await this.apiClient.get<FinnhubEarningsResponse>("/calendar/earnings", {
        params: {
          from: fromDate.toISOString().split("T")[0],
          to: toDate.toISOString().split("T")[0],
          token: this.apiKey,
        },
      });

      const earnings = response.data.earningsCalendar || [];
      return earnings.map((item) => ({
        ticker: item.symbol,
        date: item.date,
        eps: item.actual,
        revenue: undefined,
        surprise: item.surprisePercent,
      }));
    } catch (error) {
      this.logError("getEarningsCalendar", error);
      throw error;
    }
  }

  async getInsiderTransactions(ticker: string): Promise<InsiderTransaction[]> {
    this.logRequest("getInsiderTransactions", { ticker });

    try {
      const response = await this.apiClient.get<FinnhubInsiderResponse>("/stock/insider-transactions", {
        params: { symbol: ticker.toUpperCase(), token: this.apiKey },
      });

      const transactions = response.data.data || [];
      return transactions
        .slice(0, 20)
        .map((item) => ({
          insider: item.name,
          title: item.position || "Unknown",
          shares: item.share,
          price: item.transactionPrice,
          date: item.transactionDate,
          type: (item.transactionType?.toLowerCase().includes("sell") ? "sell" : "buy") as "buy" | "sell",
          value: item.share * (item.transactionPrice || 0),
        }));
    } catch (error) {
      this.logError("getInsiderTransactions", error);
      throw error;
    }
  }

  async getCompanyProfile(ticker: string): Promise<any> {
    this.logRequest("getCompanyProfile", { ticker });

    try {
      const response = await this.apiClient.get<FinnhubProfileResponse>("/stock/profile2", {
        params: { symbol: ticker.toUpperCase(), token: this.apiKey },
      });

      return {
        ticker: response.data.ticker,
        name: response.data.name,
        sector: response.data.finnhubIndustry,
        industry: response.data.finnhubIndustry,
        marketCap: response.data.marketCapitalization,
        country: response.data.country,
        website: response.data.weburl,
      };
    } catch (error) {
      this.logError("getCompanyProfile", error);
      return null;
    }
  }
}
