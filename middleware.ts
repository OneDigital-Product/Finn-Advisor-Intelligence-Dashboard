import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "./lib/session";

// Public API routes that don't require authentication
const PUBLIC_ROUTES = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/user",
  "/api/health",
  "/api/data-sources",
  "/api/events/stream",
]);

// In-memory rate limiter for API routes
// Dev generates heavy traffic (parallel queries, SSE, HMR) — 2000/15min avoids false 429s.
// Production should use a lower limit behind a real reverse proxy (e.g. 300/15min).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = process.env.NODE_ENV === "production" ? 500 : 2000;
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /api/* routes (excluding public ones)
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Let public routes through without rate limiting
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Rate limiting for API routes (after public route bypass)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT) {
      return NextResponse.json({ message: 'Too many requests' }, { status: 429 });
    }
    entry.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
  }
  // Clean old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap) {
      if (now > val.resetAt) rateLimitMap.delete(key);
    }
  }

  // Read the iron-session cookie
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.userId) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
