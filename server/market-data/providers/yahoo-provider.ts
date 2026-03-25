import YahooFinanceModule from "yahoo-finance2";
import ParserModule from "rss-parser";
import type { StockQuote, NewsItem } from "../provider-interface";
import { ProviderCapability } from "../provider-interface";
import { BaseProvider } from "./base-provider";

const YahooFinance = (YahooFinanceModule as any).default || YahooFinanceModule;
const Parser = (ParserModule as any).default || ParserModule;

export class YahooFinanceProvider extends BaseProvider {
  private yahooFinance: any;
  private rssParser: any;

  constructor() {
    super({
      name: "Yahoo Finance",
      capabilities: [
        ProviderCapability.REAL_TIME_QUOTE,
        ProviderCapability.BATCH_QUOTES,
        ProviderCapability.NEWS,
      ],
      priority: 3,
      rateLimit: { requestsPerMinute: 100, burst: 5 },
      freeApiKey: true,
      description: "Yahoo Finance via npm package",
    });

    this.yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
    this.rssParser = new Parser();
  }

  async getQuote(ticker: string): Promise<StockQuote | null> {
    this.logRequest("getQuote", { ticker });
    if (ticker === "CASH") return null;

    try {
      const result = await this.yahooFinance.quote(ticker);
      if (!result) return null;

      return {
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
    } catch (error) {
      this.logError("getQuote", error);
      return null;
    }
  }

  async getQuotes(tickers: string[]): Promise<Map<string, StockQuote>> {
    this.logRequest("getQuotes", { count: tickers.length });
    const results = new Map<string, StockQuote>();

    for (const ticker of tickers) {
      if (ticker === "CASH") continue;
      const quote = await this.getQuote(ticker);
      if (quote) results.set(ticker, quote);
    }

    return results;
  }

  async getNews(tickers?: string[]): Promise<NewsItem[]> {
    this.logRequest("getNews", { tickers });
    const filteredTickers = (tickers ?? []).filter(t => t !== "CASH");
    const allNews: NewsItem[] = [];

    const feeds = [
      {
        url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%TICKERS%&region=US&lang=en-US",
        source: "Yahoo Finance",
      },
    ];

    const generalFeeds = [
      { url: "https://feeds.finance.yahoo.com/rss/2.0/headline?region=US&lang=en-US", source: "Yahoo Finance" },
      { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147", source: "CNBC" },
    ];

    if (filteredTickers.length > 0) {
      const tickerStr = filteredTickers.join(",");
      for (const feed of feeds) {
        try {
          const url = feed.url.replace("%TICKERS%", tickerStr);
          const parsed = await this.rssParser.parseURL(url);
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
          this.logError("getNews", error);
        }
      }
    } else {
      for (const feed of generalFeeds) {
        try {
          const parsed = await this.rssParser.parseURL(feed.url);
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
          this.logError("getNews", error);
        }
      }
    }

    return allNews
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
      .slice(0, 20);
  }
}
