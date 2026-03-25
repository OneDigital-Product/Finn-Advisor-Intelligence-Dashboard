import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { logger } from "@server/lib/logger";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Logout error:");
    return NextResponse.json(
      { message: "Logout failed" },
      { status: 500 }
    );
  }
}
