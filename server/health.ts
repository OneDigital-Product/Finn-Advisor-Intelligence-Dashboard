import { pool, db } from './db';
import { approvalItems, cassidyJobs, tasks, apiKeyMetadata } from '@shared/schema';
import { eq, sql, and, lt } from 'drizzle-orm';
import { logger } from "./lib/logger";
import { validateConnection as validateSalesforce, isSalesforceEnabled } from './integrations/salesforce/client';
import { validateConnection as validateOrion, isOrionEnabled } from './integrations/orion/client';
import { isCassidyAvailable } from './lib/cassidy';
import { providerRegistry } from './market-data/provider-registry';
import { checkEmailConfiguration } from "./integrations/microsoft/email";
import type { Request, Response } from 'express';

type CheckStatus = 'ok' | 'error' | 'degraded' | 'unconfigured';

interface ShallowHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: {
      status: CheckStatus;
      responseTime: number;
    };
  };
}

interface IntegrationCheck {
  status: CheckStatus;
  configured: boolean;
  responseTime?: number;
  error?: string;
}

interface MarketDataProviderCheck {
  name: string;
  status: string;
  consecutiveFailures: number;
}

interface QueueDepths {
  status: CheckStatus;
  error?: string;
  pendingApprovals: number;
  pendingCassidyJobs: number;
  overdueReminders: number;
}

interface ProcessMetrics {
  status: CheckStatus;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  eventLoopLag: number;
}

interface EmailCheck {
  status: 'ok' | 'warning';
  configured: boolean;
  transport: string | null;
  warnings: string[];
}

interface ApiKeyAgeInfo {
  keyName: string;
  integration: string;
  lastRotatedAt: string | null;
  expiresAt: string | null;
  ageDays: number;
  daysUntilExpiry: number | null;
  status: 'ok' | 'warning' | 'critical';
  message: string;
}

interface ApiKeyAgeCheck {
  status: CheckStatus;
  keys: ApiKeyAgeInfo[];
  warnings: string[];
}

interface DetailedHealthResponse extends ShallowHealthResponse {
  checks: ShallowHealthResponse['checks'] & {
    integrations: {
      salesforce: IntegrationCheck;
      orion: IntegrationCheck;
      cassidy: IntegrationCheck;
      openai: IntegrationCheck;
    };
    email: EmailCheck;
    marketDataProviders: MarketDataProviderCheck[];
    migrations: {
      status: CheckStatus;
      version: string | null;
      appliedCount: number;
    };
    process: ProcessMetrics;
    queues: QueueDepths;
    apiKeyAge: ApiKeyAgeCheck;
  };
}

interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    database: {
      status: CheckStatus;
      responseTime: number;
    };
    migrations: {
      status: CheckStatus;
      version: string | null;
      appliedCount: number;
    };
    email: EmailCheck;
  };
}

const startTime = Date.now();

const PROBE_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

async function checkDatabase(): Promise<{ status: CheckStatus; responseTime: number }> {
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    const responseTime = Date.now() - dbStart;
    return {
      status: responseTime > 100 ? 'degraded' : 'ok',
      responseTime,
    };
  } catch (err) {
    logger.error({ err }, "Health check — database failed");
    return { status: 'error', responseTime: -1 };
  }
}

async function probeSalesforce(): Promise<IntegrationCheck> {
  if (!isSalesforceEnabled()) {
    return { status: 'unconfigured', configured: false };
  }

  const probeStart = Date.now();
  const reachable = await withTimeout(validateSalesforce(), PROBE_TIMEOUT_MS, false);
  const responseTime = Date.now() - probeStart;

  if (!reachable) {
    return { status: 'error', configured: true, responseTime, error: 'Connection failed or timed out' };
  }
  return { status: 'ok', configured: true, responseTime };
}

async function probeOrion(): Promise<IntegrationCheck> {
  if (!isOrionEnabled()) {
    return { status: 'unconfigured', configured: false };
  }

  const probeStart = Date.now();
  const reachable = await withTimeout(validateOrion(), PROBE_TIMEOUT_MS, false);
  const responseTime = Date.now() - probeStart;

  if (!reachable) {
    return { status: 'error', configured: true, responseTime, error: 'Connection failed or timed out' };
  }
  return { status: 'ok', configured: true, responseTime };
}

async function probeCassidy(): Promise<IntegrationCheck> {
  if (!isCassidyAvailable()) {
    return { status: 'unconfigured', configured: false };
  }

  const webhookUrl = process.env.CASSIDY_WEBHOOK_URL;
  const targetUrl = webhookUrl || 'https://app.cassidyai.com';

  const probeStart = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    const response = await fetch(targetUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const responseTime = Date.now() - probeStart;

    if (response.ok || response.status < 500) {
      return { status: 'ok', configured: true, responseTime };
    }
    return { status: 'error', configured: true, responseTime, error: `HTTP ${response.status}` };
  } catch (err) {
    const responseTime = Date.now() - probeStart;
    return { status: 'error', configured: true, responseTime, error: 'Connection failed or timed out' };
  }
}

function checkOpenAIConfigured(): IntegrationCheck {
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  if (!hasApiKey) {
    return { status: 'unconfigured', configured: false };
  }
  return { status: 'ok', configured: true };
}

function getMarketDataProviderStatuses(): MarketDataProviderCheck[] {
  return providerRegistry.listProviders().map((p) => ({
    name: p.name,
    status: p.status,
    consecutiveFailures: p.consecutiveFailures,
  }));
}

async function measureEventLoopLag(): Promise<number> {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1e6;
      resolve(Math.round(lag * 100) / 100);
    });
  });
}

async function getQueueDepths(): Promise<QueueDepths> {
  try {
    const [approvalResult, cassidyResult, reminderResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(approvalItems)
        .where(eq(approvalItems.status, 'pending')),
      db.select({ count: sql<number>`count(*)` })
        .from(cassidyJobs)
        .where(eq(cassidyJobs.status, 'pending')),
      db.select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(
          and(
            eq(tasks.category, 'profile_reminder'),
            eq(tasks.status, 'pending'),
            lt(tasks.dueDate, new Date().toISOString().split('T')[0])
          )
        ),
    ]);

    return {
      status: 'ok',
      pendingApprovals: Number(approvalResult[0]?.count ?? 0),
      pendingCassidyJobs: Number(cassidyResult[0]?.count ?? 0),
      overdueReminders: Number(reminderResult[0]?.count ?? 0),
    };
  } catch (err) {
    logger.error({ err }, "Health check — queue depth query failed");
    return {
      status: 'error',
      error: 'Failed to query queue depths',
      pendingApprovals: -1,
      pendingCassidyJobs: -1,
      overdueReminders: -1,
    };
  }
}

async function getMigrationInfo(): Promise<{ status: CheckStatus; version: string | null; appliedCount: number }> {
  try {
    const tableCheck = await pool.query(
      `SELECT table_schema FROM information_schema.tables WHERE table_name = '__drizzle_migrations' AND table_schema IN ('public', 'drizzle') LIMIT 1`
    );

    if (tableCheck.rows.length === 0) {
      return { status: 'ok', version: 'schema-push', appliedCount: 0 };
    }

    const schema = tableCheck.rows[0].table_schema;

    const colCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = '__drizzle_migrations'`,
      [schema]
    );
    const columns = colCheck.rows.map((r: { column_name: string }) => r.column_name);
    const hasTag = columns.includes('tag');
    const hasHash = columns.includes('hash');

    const versionColumn = hasTag ? 'tag' : hasHash ? 'hash' : null;

    const migrations = await pool.query(
      `SELECT ${versionColumn ? `"${versionColumn}" as version,` : ''} created_at FROM ${schema}."__drizzle_migrations" ORDER BY created_at DESC`
    );

    if (migrations.rows.length === 0) {
      return { status: 'ok', version: null, appliedCount: 0 };
    }

    return {
      status: 'ok',
      version: versionColumn ? migrations.rows[0].version : `migration-${migrations.rows.length}`,
      appliedCount: migrations.rows.length,
    };
  } catch (err) {
    logger.error({ err }, "Health check — migration query failed");
    return { status: 'error', version: null, appliedCount: 0 };
  }
}

const KEY_AGE_WARNING_DAYS = 90;
const KEY_EXPIRY_WARNING_DAYS = 14;

async function getApiKeyAgeCheck(): Promise<ApiKeyAgeCheck> {
  try {
    const rows = await db.select().from(apiKeyMetadata);
    const now = Date.now();
    const warnings: string[] = [];
    const keys: ApiKeyAgeInfo[] = rows.map((row) => {
      const lastRotated = row.lastRotatedAt ? new Date(row.lastRotatedAt).getTime() : null;
      const ageDays = lastRotated ? Math.floor((now - lastRotated) / (1000 * 60 * 60 * 24)) : -1;
      const expiresAt = row.expiresAt ? new Date(row.expiresAt).getTime() : null;
      const daysUntilExpiry = expiresAt ? Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24)) : null;

      let status: 'ok' | 'warning' | 'critical' = 'ok';
      let message = ageDays >= 0 ? 'Key age is within acceptable range' : 'Last rotation date unknown';

      if (daysUntilExpiry !== null && daysUntilExpiry <= 0) {
        status = 'critical';
        message = `Key has expired (${Math.abs(daysUntilExpiry)} days ago)`;
        warnings.push(`${row.keyName}: ${message}`);
      } else if (daysUntilExpiry !== null && daysUntilExpiry <= KEY_EXPIRY_WARNING_DAYS) {
        status = 'warning';
        message = `Key expires in ${daysUntilExpiry} day(s)`;
        warnings.push(`${row.keyName}: ${message}`);
      } else if (ageDays >= KEY_AGE_WARNING_DAYS) {
        status = 'warning';
        message = `Key is ${ageDays} days old (rotation recommended after ${KEY_AGE_WARNING_DAYS} days)`;
        warnings.push(`${row.keyName}: ${message}`);
      } else if (ageDays < 0) {
        status = 'warning';
        message = 'Last rotation date unknown — set a rotation date to enable monitoring';
        warnings.push(`${row.keyName}: ${message}`);
      }

      return {
        keyName: row.keyName,
        integration: row.integration,
        lastRotatedAt: row.lastRotatedAt ? row.lastRotatedAt.toISOString() : null,
        expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
        ageDays,
        daysUntilExpiry,
        status,
        message,
      };
    });

    const hasCritical = keys.some((k) => k.status === 'critical');
    const hasWarning = keys.some((k) => k.status === 'warning');

    return {
      status: hasCritical ? 'error' : hasWarning ? 'degraded' : 'ok',
      keys,
      warnings,
    };
  } catch (err) {
    logger.error({ err }, "Health check — API key age query failed");
    return { status: 'degraded', keys: [], warnings: ['Failed to query API key metadata'] };
  }
}

function deriveOverallStatus(dbCheck: { status: CheckStatus }): ShallowHealthResponse['status'] {
  if (dbCheck.status === 'error') return 'unhealthy';
  if (dbCheck.status === 'degraded') return 'degraded';
  return 'healthy';
}

export async function healthCheckShallow(_req: Request, res: Response) {
  const dbCheck = await checkDatabase();

  const overallStatus = deriveOverallStatus(dbCheck);

  const response: ShallowHealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: dbCheck,
    },
  };

  res.status(overallStatus === 'unhealthy' ? 503 : 200).json(response);
}

export async function healthCheckDetailed(_req: Request, res: Response) {
  const [dbCheck, eventLoopLag, queues, salesforceCheck, orionCheck, cassidyCheck, migrationInfo, apiKeyAgeCheck] = await Promise.all([
    checkDatabase(),
    measureEventLoopLag(),
    getQueueDepths(),
    probeSalesforce(),
    probeOrion(),
    probeCassidy(),
    getMigrationInfo(),
    getApiKeyAgeCheck(),
  ]);

  const openaiCheck = checkOpenAIConfigured();
  const marketDataProviders = getMarketDataProviderStatuses();
  const emailConfig = checkEmailConfiguration();

  const mem = process.memoryUsage();

  let overallStatus = deriveOverallStatus(dbCheck);

  if (overallStatus === 'healthy' && eventLoopLag > 100) {
    overallStatus = 'degraded';
  }
  if (overallStatus === 'healthy' && queues.status === 'error') {
    overallStatus = 'degraded';
  }

  const configuredIntegrations = [salesforceCheck, orionCheck, cassidyCheck].filter(
    (c) => c.configured
  );
  if (overallStatus === 'healthy' && configuredIntegrations.some((c) => c.status === 'error')) {
    overallStatus = 'degraded';
  }

  const degradedProviders = marketDataProviders.filter((p) => p.status !== 'healthy');
  if (overallStatus === 'healthy' && degradedProviders.length === marketDataProviders.length && marketDataProviders.length > 0) {
    overallStatus = 'degraded';
  }

  if (overallStatus === 'healthy' && (apiKeyAgeCheck.status === 'error' || apiKeyAgeCheck.status === 'degraded')) {
    overallStatus = 'degraded';
  }

  const processStatus: CheckStatus = eventLoopLag > 100 ? 'degraded' : 'ok';

  const response: DetailedHealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: dbCheck,
      integrations: {
        salesforce: salesforceCheck,
        orion: orionCheck,
        cassidy: cassidyCheck,
        openai: openaiCheck,
      },
      email: {
        status: emailConfig.configured ? 'ok' : 'warning',
        configured: emailConfig.configured,
        transport: emailConfig.transport,
        warnings: emailConfig.warnings,
      },
      marketDataProviders,
      migrations: migrationInfo,
      process: {
        status: processStatus,
        memoryUsage: {
          rss: mem.rss,
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal,
          external: mem.external,
        },
        eventLoopLag,
      },
      queues,
      apiKeyAge: apiKeyAgeCheck,
    },
  };

  res.status(overallStatus === 'unhealthy' ? 503 : 200).json(response);
}

export async function healthCheckReady(_req: Request, res: Response) {
  const [dbCheck, migrationInfo] = await Promise.all([
    checkDatabase(),
    getMigrationInfo(),
  ]);

  const isReady = dbCheck.status !== 'error' && migrationInfo.status !== 'error';

  const emailConfig = checkEmailConfiguration();

  const response: ReadinessResponse = {
    status: isReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbCheck,
      migrations: migrationInfo,
      email: {
        status: emailConfig.configured ? 'ok' : 'warning',
        configured: emailConfig.configured,
        transport: emailConfig.transport,
        warnings: emailConfig.warnings,
      },
    },
  };

  res.status(isReady ? 200 : 503).json(response);
}

export const healthCheck = healthCheckShallow;
