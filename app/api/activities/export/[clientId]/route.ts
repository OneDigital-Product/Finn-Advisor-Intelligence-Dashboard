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
    const format = url.searchParams.get("format") || "csv";

    const result = await storage.getActivitiesByFilters({ advisorId: advisor.id, clientId });
    const acts = result.activities;

    let exportData: string;
    let contentType: string;
    let fileName: string;

    if (format === "json") {
      exportData = JSON.stringify(acts, null, 2);
      contentType = "application/json";
      fileName = `activities-${clientId}-${Date.now()}.json`;
    } else {
      const headers = ["Date", "Type", "Subject", "Description", "Duration (min)"];
      const rows = acts.map((a: any) => [a.date, a.type, a.subject, a.description || "", String(a.duration || "")]);
      exportData = [headers, ...rows].map((row: string[]) => row.map(cell => `"${cell}"`).join(",")).join("\n");
      contentType = "text/csv";
      fileName = `activities-${clientId}-${Date.now()}.csv`;
    }

    await storage.createExportHistoryRecord({
      advisorId: advisor.id, entityType: "activities", entityId: clientId,
      format, fileName, recordCount: acts.length, fileSize: exportData.length,
      exportTime: new Date(),
    });

    return new NextResponse(exportData, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: sanitizeErrorMessage(error, "Failed to export activities") }, { status: 400 });
  }
}
