import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { storage } from "@server/storage";
import { generateMeetingSummary } from "@server/openai";
import { sanitizePromptInput } from "@server/lib/prompt-sanitizer";
import { logger } from "@server/lib/logger";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { createInteractionSummary } from "@server/integrations/salesforce/queries";

export async function POST(
  request: Request, { params }: { params: Promise<{ id: string }> }
) {
  try {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const meeting = await storage.getMeeting(id);
  if (!meeting) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  if (meeting.advisorId !== session.userId) return NextResponse.json({ message: "Access denied" }, { status: 403 });
  if (meeting.status !== "completed") return NextResponse.json({ message: "Only completed meetings can be summarized" }, { status: 400 });
  if (!meeting.clientId) return NextResponse.json({ message: "No client associated" }, { status: 400 });

  const client = await storage.getClient(meeting.clientId);
  if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });

  const [hlds, accts, tasks, lifeEvts, summaryConfig] = await Promise.all([
    storage.getHoldingsByClient(client.id),
    storage.getAccountsByClient(client.id),
    storage.getTasksByClient(client.id),
    storage.getLifeEvents(client.id),
    storage.getActiveMeetingSummaryConfig(),
  ]);

  let perf: any[] = [];
  if (accts.length > 0 && accts[0].householdId) {
    perf = await storage.getPerformanceByHousehold(accts[0].householdId);
  }

  const summary = await generateMeetingSummary({
    clientName: `${client.firstName} ${client.lastName}`,
    clientInfo: client,
    meetingTitle: meeting.title,
    meetingType: meeting.type,
    meetingDate: new Date(meeting.startTime).toLocaleDateString(),
    meetingNotes: sanitizePromptInput(meeting.notes || ''),
    holdings: hlds,
    performance: perf,
    tasks: tasks.filter(t => t.status !== "completed"),
    lifeEvents: lifeEvts,
  }, summaryConfig ? { systemPrompt: summaryConfig.systemPrompt, userPromptTemplate: summaryConfig.userPromptTemplate } : null);

  let suggestedTasks: any[] = [];
  let cleanSummary = summary;
  const taskBlockMatch = summary.match(/```suggested_tasks\s*([\s\S]*?)```/);
  if (taskBlockMatch) {
    try {
      suggestedTasks = JSON.parse(taskBlockMatch[1].trim());
    } catch {}
    cleanSummary = summary.replace(/```suggested_tasks[\s\S]*?```/, '').trim();
  }

  await storage.updateMeeting(meeting.id, { transcriptSummary: cleanSummary });

  // ── Push summary to Salesforce as InteractionSummary (fire-and-forget) ──
  // Non-blocking: SF sync failure should never break the summary response.
  let sfSyncStatus = "skipped";
  if (isSalesforceEnabled()) {
    try {
      // Look up the client's SF account ID for linking
      const clientAccounts = await storage.getAccountsByClient(client.id);
      const sfAccountId = clientAccounts.find((a: any) => a.salesforceAccountId)?.salesforceAccountId;

      if (sfAccountId) {
        const sfResult = await createInteractionSummary({
          FinServ__Account__c: sfAccountId,
          Name: `Meeting Summary: ${meeting.title || "Meeting"} — ${new Date(meeting.startTime).toLocaleDateString()}`,
          FinServ__Description__c: cleanSummary.substring(0, 32000), // SF long text limit
          FinServ__DateTime__c: meeting.startTime,
        });
        sfSyncStatus = sfResult?.success ? "synced" : "failed";
        if (sfResult?.success) {
          logger.info({ meetingId: meeting.id, sfRecordId: sfResult.id }, "[Meeting Summary] Synced to Salesforce InteractionSummary");
        }
      } else {
        sfSyncStatus = "no_sf_account";
      }
    } catch (err) {
      sfSyncStatus = "error";
      logger.warn({ err, meetingId: meeting.id }, "[Meeting Summary] SF InteractionSummary push failed — summary saved locally");
    }
  }

  return NextResponse.json({ transcriptSummary: cleanSummary, suggestedTasks, sfSyncStatus });
} catch (err) {
    logger.error({ err }, "[meetings/[id]/summarize] POST failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
