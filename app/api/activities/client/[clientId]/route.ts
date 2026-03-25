import { NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { sanitizeErrorMessage } from "@server/lib/error-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ error: "No advisor session" }, { status: 401 });

    const { clientId } = await params;
    const url = new URL(request.url);
    const typesStr = url.searchParams.get("types") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const result = await storage.getActivitiesByFilters({
      advisorId: advisor.id, clientId,
      type: typesStr ? typesStr.split(",")[0] : undefined,
      startDate: url.searchParams.get("startDate") || undefined,
      endDate: url.searchParams.get("endDate") || undefined,
      limit, offset,
    });

    return NextResponse.json({
      success: true, activities: result.activities, total: result.total,
      limit, offset, hasMore: offset + result.activities.length < result.total,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeErrorMessage(error, "Failed to fetch client activities") }, { status: 400 });
  }
}
