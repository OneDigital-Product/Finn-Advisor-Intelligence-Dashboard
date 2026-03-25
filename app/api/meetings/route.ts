import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@lib/session";
import { getSessionAdvisor, isSalesforceUser } from "@lib/auth-helpers";
import { validateBody } from "@lib/validation";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { batchResolveClientIdentities, getNavigationalId } from "@server/lib/client-identity";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { createEvent as sfCreateEvent } from "@server/integrations/salesforce/queries";

const createMeetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  type: z.string().min(1, "Type is required"),
  clientId: z.string().nullable().optional(),
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  attendees: z.array(z.object({ name: z.string(), email: z.string() })).optional(),
  agenda: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  const advisor = await getSessionAdvisor(session);
  if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

  const allMeetings = await storage.getMeetings(advisor.id);

  // ── Batch-resolve client identities for all meetings ──
  // Dedupes client IDs, resolves each once via crosswalk/resolver,
  // then maps resolved SF household IDs onto meeting client objects.
  const clientIds = allMeetings.map((m) => m.clientId).filter(Boolean) as string[];
  const identityMap = await batchResolveClientIdentities(clientIds, session.userEmail);

  // Batch fetch all clients once (avoids N+1: was 1 query per meeting)
  const allClients = await storage.getClients(advisor.id);
  const clientMap = new Map(allClients.map(c => [c.id, c]));

  // Batch fetch all tasks for all meetings (avoids N+1: was 1 query per meeting)
  const meetingIds = allMeetings.map(m => m.id);
  const allTasks = meetingIds.length > 0 ? await storage.getTasksByMeetingIds(meetingIds) : [];
  const tasksByMeeting = new Map<string, typeof allTasks>();
  for (const task of allTasks) {
    const existing = tasksByMeeting.get(task.meetingId!) || [];
    existing.push(task);
    tasksByMeeting.set(task.meetingId!, existing);
  }

  const meetingsWithDetails = allMeetings.map((meeting) => {
    const client = meeting.clientId ? clientMap.get(meeting.clientId) || null : null;
    const meetingTasks = tasksByMeeting.get(meeting.id) || [];
    const activeTasks = meetingTasks.filter(t => t.status !== "completed");
    const completedTaskCount = meetingTasks.filter(t => t.status === "completed").length;

    // Enrich client with resolved identity
    let enrichedClient = client;
    if (client && meeting.clientId) {
      const identity = identityMap.get(meeting.clientId);
      if (identity) {
        const originalId = client.id;
        enrichedClient = {
          ...client,
          id: getNavigationalId(identity),
          _localUuid: originalId,
          _identity: identity,
        } as any;
      }
    }

    return {
      ...meeting,
      client: enrichedClient,
      taskCount: meetingTasks.length,
      activeTaskCount: activeTasks.length,
      completedTaskCount,
      tasks: activeTasks.slice(0, 3).map(t => ({ id: t.id, title: t.title, type: t.type, priority: t.priority, dueDate: t.dueDate })),
    };
  });

  return NextResponse.json(meetingsWithDetails, {
    headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" },
  });
} catch (err) {
    logger.error({ err }, "[meetings] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  try {
    const advisor = await getSessionAdvisor(session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });

    const body = await request.json();
    const validation = validateBody(createMeetingSchema, body);
    if (validation.error) return validation.error;
    const data = validation.data;

    if (data.clientId) {
      const client = await storage.getClient(data.clientId);
      if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
      if (client.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized for this client" }, { status: 403 });
    }

    const conflicts = await storage.checkMeetingConflicts(advisor.id, data.startTime, data.endTime);
    const meeting = await storage.createMeeting({
      advisorId: advisor.id,
      clientId: data.clientId || null,
      title: data.title,
      startTime: data.startTime,
      endTime: data.endTime,
      type: data.type,
      status: data.status || "scheduled",
      notes: data.notes || null,
      location: data.location || null,
      description: data.description || null,
      timezone: data.timezone || null,
      attendees: data.attendees || [],
      agenda: data.agenda || [],
    });

    // ── Sync to Salesforce as Event (fire-and-forget) ──
    let sfEventId: string | null = null;
    if (isSalesforceEnabled() && isSalesforceUser(advisor.email)) {
      try {
        const sfResult = await sfCreateEvent({
          Subject: data.title,
          StartDateTime: data.startTime,
          EndDateTime: data.endTime,
          Type: data.type === "call" ? "Call" : "Meeting",
          Location: data.location || undefined,
          Description: data.description || data.notes || undefined,
        });
        if (sfResult?.success) {
          sfEventId = sfResult.id || null;
          logger.info({ meetingId: meeting.id, sfEventId }, "[Meetings] Synced meeting to Salesforce as Event");
        }
      } catch (err) {
        logger.warn({ err, meetingId: meeting.id }, "[Meetings] SF event sync failed — meeting saved locally");
      }
    }

    return NextResponse.json({ ...meeting, sfEventId, conflicts: conflicts.length > 0 ? conflicts : undefined });
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred. Please try again later." }, { status: 500 });
  }
}
