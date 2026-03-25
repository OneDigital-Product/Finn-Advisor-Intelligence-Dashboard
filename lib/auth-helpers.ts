import { NextResponse } from "next/server";
import { getSession, type SessionData, type AuthenticatedSession } from "./session";
import { storage } from "@server/storage";

export { type SessionData, type AuthenticatedSession } from "./session";

/** Returns session data if authenticated, or null */
export async function getAuthSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.userId) return null;
  return session;
}

/** Returns session data or a 401 response */
export async function requireAuth(): Promise<
  | { session: AuthenticatedSession; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getSession();
  if (!session.userId) {
    return {
      session: null,
      error: NextResponse.json({ message: "Not authenticated" }, { status: 401 }),
    };
  }
  return { session: session as AuthenticatedSession, error: null };
}

/** Returns session data (advisor-only) or a 403 response */
export async function requireAdvisor(): Promise<
  | { session: AuthenticatedSession; error: null }
  | { session: null; error: NextResponse }
> {
  const auth = await requireAuth();
  if (auth.error) return auth;

  if (auth.session.userType !== "advisor") {
    return {
      session: null,
      error: NextResponse.json({ message: "Advisor access required" }, { status: 403 }),
    };
  }
  return auth;
}

/**
 * Resolve the advisor record for the current session.
 * For advisors: returns their own record.
 * For associates: returns the advisor they're assigned to via clients.
 */
export async function getSessionAdvisor(session: AuthenticatedSession | SessionData) {
  if (session.userType === "advisor") {
    return storage.getAdvisor(session.userId!);
  }
  const assignedClients = await storage.getClientsByAssociate(session.userId!);
  if (assignedClients.length > 0) {
    return storage.getAdvisor(assignedClients[0].advisorId);
  }
  return null;
}

/** Check if user email indicates a Salesforce-eligible account.
 *  UAT accounts end in `.uat`; production @onedigital.com accounts are also SF-eligible
 *  (their SF username is derived by appending `.uat` to the email). */
export function isSalesforceUser(email?: string): boolean {
  if (!email) return false;
  return email.endsWith(".uat") || email.endsWith("@onedigital.com");
}

/** Derive the Salesforce UAT username from an advisor's login email.
 *  - If email already ends in `.uat`, use as-is.
 *  - If `@onedigital.com`, append `.uat` (standard UAT convention).
 *  - Falls back to `DEFAULT_SF_USERNAME` env var. */
export function getSalesforceUsername(email: string): string {
  if (email.endsWith(".uat")) return email;
  if (email.endsWith("@onedigital.com")) return email + ".uat";
  return process.env.DEFAULT_SF_USERNAME || email;
}

// ID format patterns: UUID v4, Salesforce 15/18-char, numeric (Orion), or slug-safe strings
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SF_ID_RE = /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/;
const NUMERIC_RE = /^\d+$/;
const SLUG_RE = /^[a-zA-Z0-9_.-]{1,128}$/;

export function isValidIdFormat(value: string): boolean {
  return UUID_RE.test(value) || SF_ID_RE.test(value) || NUMERIC_RE.test(value) || SLUG_RE.test(value);
}

export function validateId(id: string): NextResponse | null {
  if (!isValidIdFormat(id)) {
    return NextResponse.json({ message: "Invalid ID format" }, { status: 400 });
  }
  return null;
}
