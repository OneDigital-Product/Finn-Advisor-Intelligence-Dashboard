import { NextResponse } from "next/server";
import { pool } from "@server/db";

export async function GET() {
  const timestamp = new Date().toISOString();

  let dbStatus = "unknown";
  try {
    await pool.query("SELECT 1");
    dbStatus = "ok";
  } catch {
    dbStatus = "error";
  }

  const status = dbStatus === "ok" ? "ok" : "degraded";

  return NextResponse.json({
    status,
    timestamp,
    db: dbStatus,
  });
}
