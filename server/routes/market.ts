import type { Express } from "express";
import { logger } from "../lib/logger";
import { requireAuth } from "./middleware";
import { storage } from "../storage";
import { marketDataService } from "../market-data";
import { setWebSocketClient, getWebSocketClient } from "../market-data/websocket-holder";
export { setWebSocketClient };

/** Normalize Express param to string */
function p(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v || "";
}

export function registerMarketRoutes(app: Express) {
  app.get("/api/market/quote/:ticker", requireAuth, async (req, res) => {
    try {
      const quote = await marketDataService.getQuote(p(req.params.ticker).toUpperCase());
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/market/quotes", requireAuth, async (req, res) => {
    try {
      const tickers = (req.query.tickers as string || "").split(",").filter(Boolean).map(t => t.toUpperCase());
      if (tickers.length === 0) return res.json({});
      const quotes = await marketDataService.getQuotes(tickers);
      const result: Record<string, any> = {};
      quotes.forEach((v, k) => { result[k] = v; });
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/market/news", requireAuth, async (req, res) => {
    try {
      const tickers = (req.query.tickers as string || "").split(",").filter(Boolean).map(t => t.toUpperCase());
      const news = await marketDataService.getNews(tickers.length > 0 ? tickers : undefined);
      res.json(news);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/market-data", requireAuth, async (req, res) => {
    try {
      const accounts = await storage.getAccountsByClient(p(req.params.clientId));
      const allHoldings = [];
      for (const acct of accounts) {
        const holdings = await storage.getHoldingsByAccount(acct.id);
        allHoldings.push(...holdings);
      }
      const tickers = [...new Set(allHoldings.map(h => h.ticker).filter(t => t !== "CASH"))];
      const [quotes, news] = await Promise.all([
        tickers.length > 0 ? marketDataService.getQuotes(tickers) : Promise.resolve(new Map()),
        tickers.length > 0 ? marketDataService.getNews(tickers) : marketDataService.getNews(),
      ]);
      const quotesObj: Record<string, any> = {};
      quotes.forEach((v, k) => { quotesObj[k] = v; });
      res.json({ quotes: quotesObj, news, tickers });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/market/historical/:ticker", requireAuth, async (req, res) => {
    try {
      const ticker = p(req.params.ticker).toUpperCase();
      const period = (req.query.period as string) || "1Y";
      const interval = (req.query.interval as string) || "daily";
      const data = await marketDataService.getHistorical(ticker, period as any, interval as any);
      res.json(data);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  app.get("/api/market/fundamentals/:ticker", requireAuth, async (req, res) => {
    try {
      const ticker = p(req.params.ticker).toUpperCase();
      const fundamentals = await marketDataService.getFundamentals(ticker);
      if (!fundamentals) return res.status(404).json({ message: "Not found" });
      res.json(fundamentals);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred." });
    }
  });

  app.get("/api/market/stream", requireAuth, (req, res) => {
    const tickers = (req.query.tickers as string || "").split(",").filter(Boolean).map(t => t.toUpperCase());
    if (tickers.length === 0) {
      return res.status(400).json({ message: "tickers query parameter required" });
    }

    const clientId = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(":connection established\n\n");

    const wsc = getWebSocketClient();
    if (wsc) {
      for (const ticker of tickers) {
        wsc.subscribe(clientId, ticker);
      }

      const onPriceUpdate = (ticker: string, price: number, change: number) => {
        if (tickers.includes(ticker)) {
          const quote = { ticker, price, change, lastUpdated: new Date().toISOString() };
          res.write(`data: ${JSON.stringify(quote)}\n\n`);
        }
      };

      wsc.on("priceUpdate", onPriceUpdate);

      req.on("close", () => {
        const ws = getWebSocketClient();
        if (ws) {
          ws.off("priceUpdate", onPriceUpdate);
          ws.unsubscribeAll(clientId);
        }
      });
    }

    (async () => {
      try {
        const quotes = await marketDataService.getQuotes(tickers);
        for (const quote of quotes.values()) {
          res.write(`data: ${JSON.stringify(quote)}\n\n`);
        }
      } catch (error) {
        logger.error({ err: error }, "Error sending initial SSE quotes");
      }
    })();
  });

}
