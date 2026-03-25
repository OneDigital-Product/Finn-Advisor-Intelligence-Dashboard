// Override Express route params to always be string (matches runtime behavior).
// Without this, TypeScript infers params as string | string[] which requires
// explicit casting everywhere.
declare namespace Express {
  interface Request {
    params: Record<string, string>;
  }
}
