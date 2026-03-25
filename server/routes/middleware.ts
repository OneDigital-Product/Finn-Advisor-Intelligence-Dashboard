import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if ((req as any).session?.userId) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
}

export function requireAdvisor(req: Request, res: Response, next: NextFunction) {
  if ((req as any).session.userType! === "advisor") {
    return next();
  }
  res.status(403).json({ message: "Advisor access required" });
}

// ID format patterns: UUID v4, Salesforce 15/18-char, numeric (Orion), or slug-safe strings
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SF_ID_RE = /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/;
const NUMERIC_RE = /^\d+$/;
const SLUG_RE = /^[a-zA-Z0-9_.-]{1,128}$/;

export function isValidIdFormat(value: string): boolean {
  return UUID_RE.test(value) || SF_ID_RE.test(value) || NUMERIC_RE.test(value) || SLUG_RE.test(value);
}

/**
 * Register param validators on an Express app via app.param().
 * Unlike app.use() middleware, app.param() fires only when a matched
 * route contains the named parameter — so req.params is guaranteed populated.
 */
export function registerParamValidators(app: import("express").Express) {
  const idParams = ["id", "clientId", "meetingId", "advisorId", "taskId", "documentId", "accountId", "householdId"];
  for (const param of idParams) {
    app.param(param, (req: Request, res: Response, next: NextFunction, value: string) => {
      if (!isValidIdFormat(value)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      next();
    });
  }
}

// Legacy export for backwards compat (no-op as global middleware, use registerParamValidators instead)
export function validateIdParams(_req: Request, _res: Response, next: NextFunction) {
  next();
}

export async function getSessionAdvisor(req: Request) {
  const sess = (req as any).session;
  if (sess.userType! === "advisor") {
    return storage.getAdvisor(sess.userId!);
  }
  const assignedClients = await storage.getClientsByAssociate(sess.userId!);
  if (assignedClients.length > 0) {
    return storage.getAdvisor(assignedClients[0].advisorId);
  }
  return null;
}
