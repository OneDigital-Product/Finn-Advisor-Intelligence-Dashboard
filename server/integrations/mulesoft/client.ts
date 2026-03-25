import { logger } from "../../lib/logger";

const MULESOFT_CONFIG = {
  authUrl: process.env.MULESOFT_AUTH_URL || "",
  clientId: process.env.MULESOFT_CLIENT_ID || "",
  clientSecret: process.env.MULESOFT_CLIENT_SECRET || "",
  scope: process.env.MULESOFT_SCOPE || "",
  apiBaseUrl: process.env.MULESOFT_API_BASE_URL || "",
  timeout: 25000, // 25s — SF household endpoint can take 15-20s on cold start; shorter timeouts cause cascading circuit breaker failures
};

const TOKEN_CACHE: { accessToken: string; expiresAt: number } = {
  accessToken: "",
  expiresAt: 0,
};

export function isMulesoftEnabled(): boolean {
  return (
    process.env.MULESOFT_ENABLED === "true" &&
    !!MULESOFT_CONFIG.authUrl &&
    !!MULESOFT_CONFIG.clientId &&
    !!MULESOFT_CONFIG.clientSecret &&
    !!MULESOFT_CONFIG.apiBaseUrl
  );
}

export async function getAccessToken(): Promise<string | null> {
  if (TOKEN_CACHE.accessToken && TOKEN_CACHE.expiresAt > Date.now()) {
    return TOKEN_CACHE.accessToken;
  }

  if (!isMulesoftEnabled()) {
    logger.warn("[MuleSoft Client] Not enabled — missing required env vars");
    return null;
  }

  try {
    const body: Record<string, string> = {
      grant_type: "client_credentials",
      client_id: MULESOFT_CONFIG.clientId,
      client_secret: MULESOFT_CONFIG.clientSecret,
    };
    if (MULESOFT_CONFIG.scope) {
      body.scope = MULESOFT_CONFIG.scope;
    }

    const response = await fetch(MULESOFT_CONFIG.authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(MULESOFT_CONFIG.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, err: errorText },
        "[MuleSoft Client] Token acquisition failed"
      );
      return null;
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in?: number;
      token_type?: string;
    };

    const expiresInSec = data.expires_in || 3600;
    TOKEN_CACHE.accessToken = data.access_token;
    TOKEN_CACHE.expiresAt = Date.now() + (expiresInSec - 60) * 1000;

    logger.info(
      { expiresIn: expiresInSec },
      "[MuleSoft Client] Access token acquired"
    );
    return TOKEN_CACHE.accessToken;
  } catch (err) {
    logger.error({ err }, "[MuleSoft Client] Token acquisition error");
    return null;
  }
}

export function clearTokenCache(): void {
  TOKEN_CACHE.accessToken = "";
  TOKEN_CACHE.expiresAt = 0;
}

export function getApiBaseUrl(): string {
  return MULESOFT_CONFIG.apiBaseUrl;
}

export function getTimeout(): number {
  return MULESOFT_CONFIG.timeout;
}

// ---------------------------------------------------------------------------
// Circuit breaker — stops sending requests when MuleSoft is consistently failing
// States: CLOSED (normal) → OPEN (failing, reject fast) → HALF_OPEN (test one request)
// ---------------------------------------------------------------------------

const CIRCUIT_BREAKER = {
  state: "CLOSED" as "CLOSED" | "OPEN" | "HALF_OPEN",
  failures: 0,
  lastFailure: 0,
  threshold: 5,          // open after 5 consecutive failures
  resetTimeout: 30_000,  // try again after 30s
};

export function isCircuitOpen(): boolean {
  if (CIRCUIT_BREAKER.state === "CLOSED") return false;
  if (CIRCUIT_BREAKER.state === "OPEN") {
    // Check if enough time has passed to try again
    if (Date.now() - CIRCUIT_BREAKER.lastFailure > CIRCUIT_BREAKER.resetTimeout) {
      CIRCUIT_BREAKER.state = "HALF_OPEN";
      logger.info("[MuleSoft Circuit] HALF_OPEN — testing one request");
      return false;
    }
    return true;
  }
  // HALF_OPEN — allow one request through
  return false;
}

export function recordSuccess(): void {
  if (CIRCUIT_BREAKER.state !== "CLOSED") {
    logger.info("[MuleSoft Circuit] CLOSED — service recovered");
  }
  CIRCUIT_BREAKER.state = "CLOSED";
  CIRCUIT_BREAKER.failures = 0;
}

export function recordFailure(): void {
  CIRCUIT_BREAKER.failures++;
  CIRCUIT_BREAKER.lastFailure = Date.now();
  if (CIRCUIT_BREAKER.failures >= CIRCUIT_BREAKER.threshold) {
    CIRCUIT_BREAKER.state = "OPEN";
    logger.warn(
      { failures: CIRCUIT_BREAKER.failures },
      "[MuleSoft Circuit] OPEN — too many failures, rejecting requests for 30s"
    );
  }
}

export function getCircuitState(): string {
  return CIRCUIT_BREAKER.state;
}

/** Force-reset breaker to CLOSED. Used by dev tooling and on token refresh recovery. */
export function resetCircuitBreaker(): void {
  CIRCUIT_BREAKER.state = "CLOSED";
  CIRCUIT_BREAKER.failures = 0;
  CIRCUIT_BREAKER.lastFailure = 0;
  logger.info("[MuleSoft Circuit] Force-reset to CLOSED");
}

/** Expose token cache info for health-check diagnostics (no secrets leaked). */
export function getTokenInfo(): { hasToken: boolean; expiresIn: number | null } {
  if (!TOKEN_CACHE.accessToken || TOKEN_CACHE.expiresAt <= 0) {
    return { hasToken: false, expiresIn: null };
  }
  const remaining = Math.max(0, Math.round((TOKEN_CACHE.expiresAt - Date.now()) / 1000));
  return { hasToken: true, expiresIn: remaining };
}
