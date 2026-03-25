import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  userType?: "advisor" | "associate";
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string;
}

/** Session after authentication — userId is guaranteed present */
export interface AuthenticatedSession extends SessionData {
  userId: string;
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    process.env.SECRET_KEY ||
    (process.env.NODE_ENV === 'production'
      ? (() => { throw new Error('SESSION_SECRET must be set in production'); })()
      : 'complex_password_at_least_32_characters_long_for_dev'),
  cookieName: "wm-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
