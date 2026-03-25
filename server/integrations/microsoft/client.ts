import { logger } from "../../lib/logger";

export class TokenRefreshError extends Error {
  public readonly requiresReauth: boolean;

  constructor(message: string, requiresReauth: boolean) {
    super(message);
    this.name = "TokenRefreshError";
    this.requiresReauth = requiresReauth;
  }
}

export interface MicrosoftTokens {
  microsoftAccessToken: string;
  microsoftRefreshToken: string;
  microsoftTokenExpiry: number;
}

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

function isMicrosoftEnabled(): boolean {
  return (
    process.env.MICROSOFT_ENABLED === "true" &&
    !!process.env.MICROSOFT_CLIENT_ID
  );
}

async function getGraphClient(accessToken: string): Promise<any> {
  if (!isMicrosoftEnabled()) return null;

  try {
    const graphModule = await import("@microsoft/microsoft-graph-client" as any);
    const Client = graphModule.Client;

    const client = Client.init({
      authProvider: (done: (err: any, token: string | null) => void) => {
        done(null, accessToken);
      },
    });
    return client;
  } catch (err) {
    logger.error({ err }, "API error");
    return null;
  }
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  if (!isMicrosoftEnabled()) return null;

  try {
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/.default offline_access",
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      logger.error({ responseText, status: response.status }, "MS Client token refresh failed");
      return null;
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    };
  } catch (err) {
    logger.error({ err }, "API error");
    return null;
  }
}

async function ensureValidToken(
  session: Record<string, unknown>
): Promise<string> {
  const accessToken = session.microsoftAccessToken as string | undefined;
  const refreshToken = session.microsoftRefreshToken as string | undefined;
  const tokenExpiry = session.microsoftTokenExpiry as number | undefined;

  if (!accessToken) {
    throw new TokenRefreshError(
      "Not authenticated with Microsoft. Please sign in.",
      true
    );
  }

  if (tokenExpiry && Date.now() < tokenExpiry - TOKEN_EXPIRY_BUFFER_MS) {
    return accessToken;
  }

  if (!tokenExpiry && !refreshToken) {
    return accessToken;
  }

  if (!refreshToken) {
    throw new TokenRefreshError(
      "Microsoft token expired and no refresh token available. Please re-authenticate.",
      true
    );
  }

  logger.info("Microsoft access token expired or expiring soon, refreshing...");

  let refreshed: { accessToken: string; refreshToken: string; expiresIn: number } | null;
  try {
    refreshed = await refreshAccessToken(refreshToken);
  } catch (err) {
    logger.error({ err }, "Transient error during Microsoft token refresh");
    throw new TokenRefreshError(
      "Temporary error refreshing Microsoft token. Please try again.",
      false
    );
  }

  if (!refreshed) {
    throw new TokenRefreshError(
      "Microsoft refresh token is invalid or revoked. Please re-authenticate.",
      true
    );
  }

  session.microsoftAccessToken = refreshed.accessToken;
  session.microsoftRefreshToken = refreshed.refreshToken;
  session.microsoftTokenExpiry = Date.now() + refreshed.expiresIn * 1000;

  if (typeof (session as any).save === "function") {
    await new Promise<void>((resolve, reject) => {
      (session as any).save((err: Error | null) => {
        if (err) {
          logger.error({ err }, "Failed to persist refreshed Microsoft tokens to session store");
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  logger.info("Microsoft token refreshed and persisted successfully");

  return refreshed.accessToken;
}

async function validateConnection(accessToken: string): Promise<boolean> {
  if (!isMicrosoftEnabled()) return false;

  try {
    const client = await getGraphClient(accessToken);
    if (!client) return false;
    const user = await client.api("/me").get();
    return !!user.id;
  } catch (err) {
    logger.error({ err }, "API error");
    return false;
  }
}

export {
  getGraphClient,
  refreshAccessToken,
  ensureValidToken,
  validateConnection,
  isMicrosoftEnabled,
};
