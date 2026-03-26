import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { logger } from "./lib/logger";

export async function runMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set to run migrations");
  }

  const migrationPool = new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 15000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const db = drizzle(migrationPool as any);
    logger.info("Running database migrations...");
    await migrate(db, { migrationsFolder: "./migrations" });
    logger.info("Database migrations completed successfully");
  } catch (err: any) {
    if (err?.code === "42P07" || err?.code === "42701") {
      logger.warn({ err }, "Migration skipped — tables/columns already exist. Using db:push for schema sync.");
    } else {
      logger.error({ err }, "Database migration failed");
      throw err;
    }
  } finally {
    await migrationPool.end();
  }
}
