import { logger } from "../lib/logger";
import type { MarketDataProvider, ProviderCapability } from "./provider-interface";
import {
  StockQuote, NewsItem, HistoricalData, Fundamentals,
  InsiderTransaction, EarningsEvent, SentimentScore, Period, Interval,
  ProviderCapability as Capabilities,
} from "./provider-interface";
import { providerRegistry } from "./provider-registry";

// ---------------------------------------------------------------------------
// In-memory quote cache — prevents duplicate upstream API calls when multiple
// advisors view the same tickers. DB-backed CacheManager exists but is too
// slow for 45-second hot-path caching. This Map is process-level, evicted by
// TTL on read.
// ---------------------------------------------------------------------------
const QUOTE_CACHE_TTL = 45_000; // 45 seconds
const _quoteCache = new Map<string, { data: StockQuote; ts: number }>();

function getCachedQuote(ticker: string): StockQuote | null {
  const entry = _quoteCache.get(ticker);
  if (!entry) return null;
  if (Date.now() - entry.ts > QUOTE_CACHE_TTL) {
    _quoteCache.delete(ticker);
    return null;
  }
  return entry.data;
}

function setCachedQuote(ticker: string, data: StockQuote): void {
  _quoteCache.set(ticker, { data, ts: Date.now() });
  // Evict oldest entries if cache grows too large (>1000 tickers)
  if (_quoteCache.size > 1000) {
    const firstKey = _quoteCache.keys().next().value;
    if (firstKey) _quoteCache.delete(firstKey);
  }
}

export class MarketDataService {
  async getQuote(ticker: string): Promise<StockQuote | null> {
    // Check in-memory cache first
    const cached = getCachedQuote(ticker);
    if (cached) return cached;

    const result = await this.executeWithFailover<StockQuote | null>(
      Capabilities.REAL_TIME_QUOTE,
      async (provider) => {
        if (!provider.getQuote) throw new Error("Provider missing getQuote");
        return provider.getQuote(ticker);
      },
      null
    );
    if (result) setCachedQuote(ticker, result);
    return result;
  }

  async getQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
    // Partition tickers into cache hits and misses
    const results = new Map<string, StockQuote>();
    const uncachedTickers: string[] = [];

    for (const ticker of tickers) {
      const cached = getCachedQuote(ticker);
      if (cached) {
        results.set(ticker, cached);
      } else {
        uncachedTickers.push(ticker);
      }
    }

    // Only fetch tickers not in cache
    if (uncachedTickers.length > 0) {
      const fetched = await this.executeWithFailover<Map<string, StockQuote>>(
        Capabilities.BATCH_QUOTES,
        async (provider) => {
          if (provider.getQuotes) {
            return provider.getQuotes(uncachedTickers);
          } else if (provider.getQuote) {
            const batchResults = new Map<string, StockQuote>();
            for (const ticker of uncachedTickers) {
              const quote = await provider.getQuote(ticker);
              if (quote) batchResults.set(ticker, quote);
            }
            return batchResults;
          }
          throw new Error("Provider missing quotes capability");
        },
        new Map()
      );

      // Merge fetched results and update cache
      for (const [ticker, quote] of fetched) {
        results.set(ticker, quote);
        setCachedQuote(ticker, quote);
      }
    }

    if (uncachedTickers.length > 0) {
      logger.debug(`Quote cache: ${tickers.length - uncachedTickers.length} hits, ${uncachedTickers.length} misses`);
    }

    return results;
  }

  async getNews(tickers?: string[]): Promise<NewsItem[]> {
    return this.executeWithFailover<NewsItem[]>(
      Capabilities.NEWS,
      async (provider) => {
        if (!provider.getNews) throw new Error("Provider missing getNews");
        return provider.getNews(tickers);
      },
      []
    );
  }

  async getHistorical(
    ticker: string,
    period: Period,
    interval: Interval
  ): Promise<HistoricalData[]> {
    return this.executeWithFailover<HistoricalData[]>(
      Capabilities.HISTORICAL,
      async (provider) => {
        if (!provider.getHistorical) throw new Error("Provider missing historical");
        return provider.getHistorical(ticker, period, interval);
      },
      []
    );
  }

  async getFundamentals(ticker: string): Promise<Fundamentals | null> {
    return this.executeWithFailover<Fundamentals | null>(
      Capabilities.FUNDAMENTALS,
      async (provider) => {
        if (!provider.getFundamentals) throw new Error("Provider missing fundamentals");
        return provider.getFundamentals(ticker);
      },
      null
    );
  }

  async getInsiderTransactions(ticker: string): Promise<InsiderTransaction[]> {
    return this.executeWithFailover<InsiderTransaction[]>(
      Capabilities.INSIDER,
      async (provider) => {
        if (!provider.getInsiderTransactions) throw new Error("Provider missing insider");
        return provider.getInsiderTransactions(ticker);
      },
      []
    );
  }

  async getEarningsCalendar(from?: Date, to?: Date): Promise<EarningsEvent[]> {
    return this.executeWithFailover<EarningsEvent[]>(
      Capabilities.EARNINGS,
      async (provider) => {
        if (!provider.getEarningsCalendar) throw new Error("Provider missing earnings");
        return provider.getEarningsCalendar(from, to);
      },
      []
    );
  }

  async getSentiment(ticker: string): Promise<SentimentScore | null> {
    return this.executeWithFailover<SentimentScore | null>(
      Capabilities.SENTIMENT,
      async (provider) => {
        if (!provider.getSentiment) throw new Error("Provider missing sentiment");
        return provider.getSentiment(ticker);
      },
      null
    );
  }

  getProviderForCapability(capability: string): MarketDataProvider | null {
    return providerRegistry.getPrimaryProvider(capability as ProviderCapability);
  }

  private async executeWithFailover<T>(
    capability: ProviderCapability,
    request: (provider: MarketDataProvider) => Promise<T>,
    fallbackValue: T
  ): Promise<T> {
    const chain = providerRegistry.getProviderChain(capability);
    if (chain.length === 0) {
      logger.error(`No providers available for ${capability}`);
      return fallbackValue;
    }

    let lastError: Error | null = null;

    for (const provider of chain) {
      try {
        const meta = provider.getMetadata();
        const result = await request(provider);
        providerRegistry.recordSuccess(meta.name);
        return result;
      } catch (err) {
        lastError = err as Error;
        const meta = provider.getMetadata();
        logger.warn({ err }, `Provider failed: ${meta.name}, trying next in chain`);
        providerRegistry.recordFailure(meta.name);
      }
    }

    logger.error({ err: lastError }, `All providers failed for ${capability}`);
    return fallbackValue;
  }
}

export const marketDataService = new MarketDataService();
