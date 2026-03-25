/**
 * @deprecated Use server/market-data/index.ts instead.
 * This file is kept for backward compatibility reference only.
 * All functionality has been moved to the multi-provider architecture.
 */
import YahooFinanceModule from "yahoo-finance2";
import { logger } from "./lib/logger";
import ParserModule from "rss-parser";

const Parser = (ParserModule as any).default || ParserModule;
const rssParser = new Parser();
const YahooFinance = (YahooFinanceModule as any).default || YahooFinanceModule;
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface StockQuote {
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

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
  relatedTickers: string[];
}

const quoteCache = new Map<string, { data: StockQuote; expiresAt: number }>();
const newsCache = new Map<string, { data: NewsItem[]; expiresAt: number }>();

const QUOTE_TTL = 60_000;
const NEWS_TTL = 300_000;

export async function getStockQuote(ticker: string): Promise<StockQuote | null> {
  if (ticker === "CASH") return null;

  const cached = quoteCache.get(ticker);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const result = await yahooFinance.quote(ticker);
    if (!result) return null;

    const quote: StockQuote = {
      ticker,
      price: result.regularMarketPrice ?? 0,
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
      previousClose: result.regularMarketPreviousClose ?? 0,
      dayHigh: result.regularMarketDayHigh ?? 0,
      dayLow: result.regularMarketDayLow ?? 0,
      volume: result.regularMarketVolume ?? 0,
      marketCap: result.marketCap ?? null,
      fiftyTwoWeekHigh: result.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: result.fiftyTwoWeekLow ?? null,
      lastUpdated: new Date().toISOString(),
    };

    quoteCache.set(ticker, { data: quote, expiresAt: Date.now() + QUOTE_TTL });
    return quote;
  } catch (error) {
    logger.error({ err: error }, "API error");
    return null;
  }
}

export async function getMultipleQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();
  const tickersToFetch: string[] = [];

  for (const ticker of tickers) {
    if (ticker === "CASH") continue;
    const cached = quoteCache.get(ticker);
    if (cached && cached.expiresAt > Date.now()) {
      results.set(ticker, cached.data);
    } else {
      tickersToFetch.push(ticker);
    }
  }

  if (tickersToFetch.length > 0) {
    const promises = tickersToFetch.map(t => getStockQuote(t));
    const quotes = await Promise.allSettled(promises);
    quotes.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value) {
        results.set(tickersToFetch[i], result.value);
      }
    });
  }

  return results;
}

const NEWS_FEEDS = [
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%TICKERS%&region=US&lang=en-US", source: "Yahoo Finance" },
];

const GENERAL_NEWS_FEEDS = [
  { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?region=US&lang=en-US", source: "Yahoo Finance" },
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147", source: "CNBC" },
];

export async function getTickerNews(tickers: string[]): Promise<NewsItem[]> {
  const filteredTickers = tickers.filter(t => t !== "CASH");
  const cacheKey = filteredTickers.sort().join(",");

  const cached = newsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const allNews: NewsItem[] = [];
  const tickerStr = filteredTickers.join(",");

  for (const feed of NEWS_FEEDS) {
    try {
      const url = feed.url.replace("%TICKERS%", tickerStr);
      const parsed = await rssParser.parseURL(url);
      for (const item of (parsed.items || []).slice(0, 10)) {
        allNews.push({
          title: item.title || "Untitled",
          link: item.link || "",
          source: feed.source,
          pubDate: item.pubDate || new Date().toISOString(),
          snippet: (item.contentSnippet || item.content || "").substring(0, 200),
          relatedTickers: filteredTickers.filter(t =>
            (item.title || "").toUpperCase().includes(t) ||
            (item.content || "").toUpperCase().includes(t)
          ),
        });
      }
    } catch (error) {
      logger.error({ err: error }, "API error");
    }
  }

  const news = allNews
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 20);

  newsCache.set(cacheKey, { data: news, expiresAt: Date.now() + NEWS_TTL });
  return news;
}

export async function getMarketNews(): Promise<NewsItem[]> {
  const cached = newsCache.get("__general__");
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const allNews: NewsItem[] = [];

  for (const feed of GENERAL_NEWS_FEEDS) {
    try {
      const parsed = await rssParser.parseURL(feed.url);
      for (const item of (parsed.items || []).slice(0, 10)) {
        allNews.push({
          title: item.title || "Untitled",
          link: item.link || "",
          source: feed.source,
          pubDate: item.pubDate || new Date().toISOString(),
          snippet: (item.contentSnippet || item.content || "").substring(0, 200),
          relatedTickers: [],
        });
      }
    } catch (error) {
      logger.error({ err: error }, "API error");
    }
  }

  const news = allNews
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 20);

  newsCache.set("__general__", { data: news, expiresAt: Date.now() + NEWS_TTL });
  return news;
}
