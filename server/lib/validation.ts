import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

export function qp(val: string | string[] | qs.ParsedQs | qs.ParsedQs[] | (string | qs.ParsedQs)[] | undefined): string {
  if (Array.isArray(val)) return String(val[0] ?? "");
  if (typeof val === "object" && val !== null) return "";
  return val ?? "";
}

import type qs from "qs";

export function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  req: Request,
  res: Response
): z.infer<T> | null {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    res.status(400).json({ message: "Validation failed", errors });
    return null;
  }
  return result.data;
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
      res.status(400).json({ message: "Invalid route parameters", errors });
      return;
    }
    next();
  };
}
