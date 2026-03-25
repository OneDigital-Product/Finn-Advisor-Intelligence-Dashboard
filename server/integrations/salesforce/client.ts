/**
 * API Key Rotation Procedure for Salesforce:
 * 1. Log in to Salesforce Setup > Apps > Connected Apps.
 * 2. Locate the connected app used by this integration.
 * 3. Generate a new Consumer Secret (Client Secret).
 * 4. Update SALESFORCE_CLIENT_SECRET in the environment variables.
 * 5. If using JWT Bearer flow, regenerate the certificate/key pair and upload the new certificate.
 * 6. Verify the connection via Admin > Integration Health.
 * 7. Mark the key as rotated in Admin > API Key Rotation.
 */
import { logger } from "../../lib/logger";
import { salesforceRateLimiter } from "./rate-limiter";

const SF_TOKEN_CACHE = {
  accessToken: "",
  expiresAt: 0,
};

function isSalesforceEnabled(): boolean {
  return process.env.SALESFORCE_ENABLED === "true" && !!process.env.SALESFORCE_CLIENT_ID;
}

async function getClient(): Promise<any | null> {
  if (!isSalesforceEnabled()) return null;

  const jsforceModule = await import("jsforce");
  const jsf = jsforceModule.default || jsforceModule;

  if (SF_TOKEN_CACHE.accessToken && SF_TOKEN_CACHE.expiresAt > Date.now()) {
    return new jsf.Connection({
      accessToken: SF_TOKEN_CACHE.accessToken,
      instanceUrl: process.env.SALESFORCE_INSTANCE_URL || "",
    });
  }

  const token = await refreshToken();
  if (!token) return null;

  return new jsf.Connection({
    accessToken: token,
    instanceUrl: process.env.SALESFORCE_INSTANCE_URL || "",
  });
}

async function refreshToken(): Promise<string | null> {
  if (!isSalesforceEnabled()) return null;

  try {
    const jwtModule = await import("jsonwebtoken");
    const jwt = jwtModule.default || jwtModule;

    const privateKey = process.env.SALESFORCE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!privateKey) {
      logger.error("Missing Salesforce private key");
      return null;
    }

    const claim = {
      iss: process.env.SALESFORCE_CLIENT_ID,
      sub: process.env.SALESFORCE_USERNAME || process.env.SALESFORCE_CLIENT_ID,
      aud: process.env.SALESFORCE_ENVIRONMENT === "sandbox"
        ? "https://test.salesforce.com"
        : "https://login.salesforce.com",
      exp: Math.floor(Date.now() / 1000) + 300,
    };

    const assertion = jwt.sign(claim, privateKey, { algorithm: "RS256" });

    const loginUrl = claim.aud;
    const response = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ err: errorText }, "[SF Client] Token refresh failed");
      return null;
    }

    const data = await response.json() as { access_token: string };
    SF_TOKEN_CACHE.accessToken = data.access_token;
    SF_TOKEN_CACHE.expiresAt = Date.now() + 3500 * 1000;

    return data.access_token;
  } catch (err) {
    logger.error({ err }, "API error");
    return null;
  }
}

async function validateConnection(): Promise<boolean> {
  if (!isSalesforceEnabled()) return false;

  try {
    const conn = await getClient();
    if (!conn) return false;
    await salesforceRateLimiter.waitForAvailability();
    const result = await conn.query("SELECT Id FROM Account LIMIT 1");
    return !!result;
  } catch (err) {
    logger.error({ err }, "API error");
    return false;
  }
}

export { getClient, refreshToken, validateConnection, isSalesforceEnabled };
