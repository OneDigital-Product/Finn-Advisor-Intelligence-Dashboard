import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { sanitizeErrorMessage } from "@server/lib/error-utils";
import { salesforceSyncLog } from "@shared/schema";
import { sql } from "drizzle-orm";
import { db } from "@server/db";

const MUTABLE_ACTIVITY_FIELDS = [
  "clientId", "type", "subject", "description", "date", "duration",
  "relatedEntityType", "relatedEntityId", "metadata",
];

function pickFields(body: Record<string, any>, allowed: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of allowed) {
    if (key in body) result[key] = body[key];
  }
  return result;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "No advisor session" }, { status: 401 });

    const { id } = await params;
    const activity = await storage.getActivity(id);
    if (!activity) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    if (activity.advisorId !== advisor.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    let syncLogEntry = null;
    try {
      const results = await db.select().from(salesforceSyncLog).where(sql`${salesforceSyncLog.recordId} = ${id}`);
      syncLogEntry = results[0] || null;
    } catch (_e) {}

    return NextResponse.json({ success: true, activity, syncLog: syncLogEntry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch activity") }, { status: 400 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "No advisor session" }, { status: 401 });

    const { id } = await params;
    const existing = await storage.getActivity(id);
    if (!existing) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    if (existing.advisorId !== advisor.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await request.json();
    const safeUpdates = pickFields(body, MUTABLE_ACTIVITY_FIELDS);
    const updated = await storage.updateActivity(id, { ...safeUpdates, salesforceSyncStatus: "pending" });

    await storage.createAuditLogEntry({
      action: "update", entityType: "activity", entityId: id, advisorId: advisor.id,
      oldValue: existing as any, newValue: (updated || null) as any,
      description: `Updated activity: ${existing.type} - ${existing.subject}`,
      timestamp: new Date(), status: "success",
    });

    return NextResponse.json({ success: true, activity: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeErrorMessage(error, "Failed to update activity") }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "No advisor session" }, { status: 401 });

    const { id } = await params;
    const existing = await storage.getActivity(id);
    if (!existing) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    if (existing.advisorId !== advisor.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await storage.deleteActivity(id);

    await storage.createAuditLogEntry({
      action: "delete", entityType: "activity", entityId: id, advisorId: advisor.id,
      oldValue: existing as any, description: `Deleted activity: ${existing.type} - ${existing.subject}`,
      timestamp: new Date(), status: "success",
    });

    return NextResponse.json({ success: true, message: "Activity deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeErrorMessage(error, "Failed to delete activity") }, { status: 400 });
  }
}
