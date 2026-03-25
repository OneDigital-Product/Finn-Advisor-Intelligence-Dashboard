import { db } from "../db";
import { clients, accounts, holdings } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { marketDataService } from "./market-data-service";
import { logger } from "../lib/logger";

export class PrefetchEngine {
  private prefetchIntervals: Map<string, NodeJS.Timeout> = new Map();

  async prefetchClientPortfolios(advisorId: string): Promise<void> {
    try {
      logger.info(`Prefetching portfolios for advisor ${advisorId}`);

      const allClients = await db
        .select()
        .from(clients)
        .where(eq(clients.advisorId, advisorId));

      const allTickers = new Set<string>();

      for (const client of allClients) {
        const accts = await db
          .select()
          .from(accounts)
          .where(eq(accounts.clientId, client.id));

        for (const acct of accts) {
          const hlds = await db
            .select()
            .from(holdings)
            .where(eq(holdings.accountId, acct.id));

          hlds.forEach(h => {
            if (h.ticker && h.ticker !== "CASH") {
              allTickers.add(h.ticker.toUpperCase());
            }
          });
        }
      }

      if (allTickers.size > 0) {
        logger.info(`Prefetching ${allTickers.size} quotes`);
        await marketDataService.getQuotes(Array.from(allTickers));
      }
    } catch (error) {
      logger.error({ err: error }, "Portfolio prefetch failed");
    }
  }

  async prefetchClientData(clientId: string): Promise<void> {
    try {
      const accts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.clientId, clientId));

      const tickers = new Set<string>();
      for (const acct of accts) {
        const hlds = await db
          .select()
          .from(holdings)
          .where(eq(holdings.accountId, acct.id));

        hlds.forEach(h => {
          if (h.ticker && h.ticker !== "CASH") {
            tickers.add(h.ticker.toUpperCase());
          }
        });
      }

      if (tickers.size > 0) {
        await Promise.all([
          marketDataService.getQuotes(Array.from(tickers)),
          marketDataService.getNews(Array.from(tickers)),
        ]);
      }
    } catch (error) {
      logger.error({ err: error }, "Client prefetch failed");
    }
  }

  startDailyEarningsRefresh(): void {
    const scheduleNextRun = () => {
      const now = new Date();
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(6, 0, 0, 0);

      const delay = next.getTime() - now.getTime();
      const timeout = setTimeout(async () => {
        try {
          logger.info("Running daily earnings prefetch");
          await marketDataService.getEarningsCalendar(
            new Date(),
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          );
        } catch (error) {
          logger.error({ err: error }, "Earnings prefetch failed");
        }
        scheduleNextRun();
      }, delay);

      this.prefetchIntervals.set("earnings", timeout);
    };

    scheduleNextRun();
  }

  startHourlyQuoteRefresh(): void {
    const refresh = async () => {
      try {
        logger.debug("Hourly quote refresh");
        const popularTickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];
        await marketDataService.getQuotes(popularTickers);
      } catch (error) {
        logger.warn({ err: error }, "Hourly refresh failed");
      }
    };

    refresh();

    const interval = setInterval(refresh, 60 * 60 * 1000);
    this.prefetchIntervals.set("quotes", interval);
  }

  stop(): void {
    for (const interval of this.prefetchIntervals.values()) {
      clearInterval(interval);
    }
    this.prefetchIntervals.clear();
  }
}

export const prefetchEngine = new PrefetchEngine();
