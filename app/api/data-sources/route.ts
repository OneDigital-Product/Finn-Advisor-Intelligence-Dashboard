import { NextResponse } from "next/server";
import {
  isMulesoftEnabled,
  getAccessToken,
  getCircuitState,
  getTokenInfo,
} from "@server/integrations/mulesoft/client";
import { getClientsValue, getHouseholds } from "@server/integrations/mulesoft/api";
import { logger } from "@server/lib/logger";

// ---------------------------------------------------------------------------
// GET /api/data-sources — Live connectivity health check
//
// No authentication required so it can be used for debugging & monitoring.
// No secrets are exposed — only status, latency, and counts.
// ---------------------------------------------------------------------------

interface IntegrationStatus {
  status: "ok" | "error" | "disabled";
  latency?: number | null;
  error?: string;
  [key: string]: unknown;
}

export async function GET() {
  const timestamp = new Date().toISOString();
  const activeProvider = process.env.ACTIVE_PORTFOLIO_PROVIDER || "none";
  const mulesoftEnabled = isMulesoftEnabled();

  const integrations: Record<string, Record<string, unknown>> = {};

  // ---- MuleSoft OAuth2 token test ----
  const tokenResult: Record<string, unknown> = { enabled: mulesoftEnabled };
  if (mulesoftEnabled) {
    try {
      const tokenStart = Date.now();
      const token = await getAccessToken();
      const tokenLatency = Date.now() - tokenStart;

      if (token) {
        const info = getTokenInfo();
        tokenResult.token = {
          status: "ok",
          latency: tokenLatency,
          expiresIn: info.expiresIn,
        };
      } else {
        tokenResult.token = { status: "error", error: "Token acquisition returned null" };
      }
    } catch (err: any) {
      tokenResult.token = {
        status: "error",
        error: err?.message || String(err),
      };
    }
    tokenResult.circuitBreaker = getCircuitState();
  } else {
    tokenResult.token = { status: "disabled" };
    tokenResult.circuitBreaker = "N/A";
  }
  integrations.mulesoft = tokenResult;

  // ---- Orion test (clients/value via MuleSoft proxy) ----
  const orion: IntegrationStatus = { status: "disabled" };
  if (mulesoftEnabled && (activeProvider === "mulesoft" || activeProvider === "orion")) {
    try {
      const start = Date.now();
      const clients = await getClientsValue();
      const latency = Date.now() - start;

      orion.status = "ok";
      orion.latency = latency;
      orion.clientCount = clients.length;
      // If latency is very low, data likely came from cache
      orion.cached = latency < 100;
    } catch (err: any) {
      orion.status = "error";
      orion.error = err?.message || String(err);
      orion.latency = null;
    }
  }
  integrations.orion = orion;

  // ---- Salesforce test (households via MuleSoft proxy) ----
  const salesforce: IntegrationStatus = { status: "disabled" };
  if (mulesoftEnabled) {
    try {
      const start = Date.now();
      // Use a small pageSize to minimise payload; username is required by the API.
      // We use a generic UAT username — the endpoint will return data or an auth error
      // which still proves connectivity.
      const testUsername = process.env.SALESFORCE_TEST_USERNAME || process.env.DEFAULT_SF_USERNAME || "";
      if (!testUsername) {
        salesforce.status = "error";
        salesforce.error = "No test username configured (SALESFORCE_TEST_USERNAME / DEFAULT_SF_USERNAME)";
      } else {
        const result = await getHouseholds({
          username: testUsername,
          pageSize: 1,
          offset: 0,
        });
        const latency = Date.now() - start;

        if ((result as any)._error) {
          salesforce.status = "error";
          salesforce.error = (result as any)._error;
          salesforce.latency = latency;
        } else {
          salesforce.status = "ok";
          salesforce.latency = latency;
          salesforce.householdCount = result.totalSize ?? result.householdAccounts?.length ?? 0;
          salesforce.cached = latency < 100;
        }
      }
    } catch (err: any) {
      salesforce.status = "error";
      salesforce.error = err?.message || String(err);
      salesforce.latency = null;
    }
  }
  integrations.salesforce = salesforce;

  // ---- Derive overall status ----
  const statuses = [
    integrations.mulesoft.token && (integrations.mulesoft.token as any).status,
    integrations.orion.status,
    integrations.salesforce.status,
  ].filter((s) => s && s !== "disabled");

  let overallStatus: "healthy" | "degraded" | "down" = "healthy";
  if (statuses.every((s) => s === "error")) {
    overallStatus = "down";
  } else if (statuses.some((s) => s === "error")) {
    overallStatus = "degraded";
  }

  const mode = mulesoftEnabled && overallStatus !== "down" ? "live" : "mock";

  const response = {
    status: overallStatus,
    timestamp,
    integrations,
    activeProvider,
    mode,
  };

  logger.info(
    { status: overallStatus, mode, circuitBreaker: integrations.mulesoft.circuitBreaker },
    "[Data Sources] Health check completed"
  );

  return NextResponse.json(response);
}
