import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Validate a request body against a Zod schema.
 * Returns parsed data or a 400 NextResponse.
 */
export function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown
): { data: z.infer<T>; error: null } | { data: null; error: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return {
      data: null,
      error: NextResponse.json(
        { message: "Validation failed", errors },
        { status: 400 }
      ),
    };
  }
  return { data: result.data, error: null };
}

// ID format patterns (same as Express middleware)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SF_ID_RE = /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/;
const NUMERIC_RE = /^\d+$/;
const SLUG_RE = /^[a-zA-Z0-9_.-]{1,128}$/;

/**
 * Validate an ID format (UUID, Salesforce, numeric, or slug).
 */
export function isValidIdFormat(value: string): boolean {
  return (
    UUID_RE.test(value) ||
    SF_ID_RE.test(value) ||
    NUMERIC_RE.test(value) ||
    SLUG_RE.test(value)
  );
}

/**
 * Validate an ID parameter from a route, returning a 400 if invalid.
 */
export function validateId(
  id: string
): { valid: true; error: null } | { valid: false; error: NextResponse } {
  if (!isValidIdFormat(id)) {
    return {
      valid: false,
      error: NextResponse.json(
        { message: "Invalid ID format" },
        { status: 400 }
      ),
    };
  }
  return { valid: true, error: null };
}
