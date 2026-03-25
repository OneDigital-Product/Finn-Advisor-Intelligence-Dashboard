import pg from "pg";
import { logger } from "./lib/logger";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected database pool error");
});

export const db = drizzle(pool as any, { schema });

const MAX_RETRIES = 5;

export async function ensureDbConnection(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await pool.query("SELECT 1");
      logger.info("Database connection established");
      return;
    } catch (err) {
      logger.error({ err, attempt, maxRetries: MAX_RETRIES }, "Database connection attempt failed");
      if (attempt < MAX_RETRIES) {
        const delay = 2000 * attempt;
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw new Error("Failed to connect to database after max retries");
      }
    }
  }
}
