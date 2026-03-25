import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAuth, getSessionAdvisor } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { db } from "@server/db";
import { factFinderDefinitions, factFinderResponses } from "@shared/schema";
import { calculateCompletionPercentage } from "@server/engines/fact-finder-renderer";
import { logger } from "@server/lib/logger";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const advisor = await getSessionAdvisor(auth.session);
    if (!advisor) return NextResponse.json({ message: "No advisor found" }, { status: 404 });
    const { id } = await params;
    const session = await storage.getDiscoverySession(id);
    if (!session) return NextResponse.json({ message: "Session not found" }, { status: 404 });
    if (session.advisorId !== advisor.id) return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    if (session.clientId) return NextResponse.json({ message: "Client already created for this session" }, { status: 400 });

    const qr = (session.questionnaireResponses || {}) as Record<string, string>;
    const wr = (session.wizardResponses || {}) as Record<string, string>;
    const nameParts = (session.prospectName || "New Client").split(" ");
    const firstName = nameParts[0] || "New";
    const lastName = nameParts.slice(1).join(" ") || "Client";

    const client = await storage.createClient({
      advisorId: advisor.id, firstName, lastName,
      email: session.prospectEmail || qr.email || null, phone: qr.phone || null,
      status: "prospect",
      segment: qr.estimatedAssets && parseInt(qr.estimatedAssets) > 1000000 ? "High Net Worth" : "Mass Affluent",
      riskTolerance: qr.riskTolerance || null, interests: qr.topPriorities || null,
      notes: session.summary || [
        `Discovery session completed on ${new Date().toLocaleDateString()}`,
        wr.background ? `Background: ${wr.background}` : '', wr.values ? `Values: ${wr.values}` : '',
        wr.goals ? `Goals: ${wr.goals}` : '', wr.risk ? `Risk: ${wr.risk}` : '',
      ].filter(Boolean).join('\n\n'),
    });

    await storage.updateDiscoverySession(session.id, { clientId: client.id });
    await storage.createActivity({
      advisorId: advisor.id, clientId: client.id, type: "meeting",
      subject: `Discovery meeting completed`,
      description: session.summary ? session.summary.substring(0, 500) : "Discovery session completed",
      date: new Date().toISOString().split("T")[0],
    });

    let factFinderResponseId: string | null = null;
    try {
      const [activeDefinition] = await db.select().from(factFinderDefinitions).where(eq(factFinderDefinitions.isActive, true)).limit(1);
      if (activeDefinition) {
        const discoveryAnswers: Record<string, string> = {};
        if (qr.firstName || firstName) discoveryAnswers["first_name"] = qr.firstName || firstName;
        if (qr.lastName || lastName) discoveryAnswers["last_name"] = qr.lastName || lastName;
        if (session.prospectEmail || qr.email) discoveryAnswers["email"] = session.prospectEmail || qr.email;
        if (qr.phone) discoveryAnswers["phone"] = qr.phone;
        if (qr.dateOfBirth) discoveryAnswers["date_of_birth"] = qr.dateOfBirth;
        if (qr.occupation) discoveryAnswers["occupation"] = qr.occupation;
        if (qr.employer) discoveryAnswers["employer"] = qr.employer;
        if (qr.maritalStatus) discoveryAnswers["marital_status"] = qr.maritalStatus;
        if (qr.annualIncome) discoveryAnswers["annual_income"] = qr.annualIncome;
        if (qr.estimatedAssets) discoveryAnswers["total_assets"] = qr.estimatedAssets;
        if (qr.riskTolerance) discoveryAnswers["risk_tolerance"] = qr.riskTolerance;
        if (qr.topPriorities) discoveryAnswers["financial_goals"] = qr.topPriorities;
        if (wr.background) discoveryAnswers["background_notes"] = wr.background;
        if (wr.financial) discoveryAnswers["financial_notes"] = wr.financial;
        if (wr.values) discoveryAnswers["values_notes"] = wr.values;
        if (wr.risk) discoveryAnswers["risk_notes"] = wr.risk;
        if (wr.goals) discoveryAnswers["goals_notes"] = wr.goals;
        if (wr.moneyStory) discoveryAnswers["money_story_notes"] = wr.moneyStory;

        const schema = activeDefinition.questionSchema as Array<{ questions: Array<{ id: string }> }>;
        const validQuestionIds = new Set<string>();
        if (Array.isArray(schema)) {
          for (const section of schema) {
            if (Array.isArray(section.questions)) {
              for (const q of section.questions) { if (q.id) validQuestionIds.add(q.id); }
            }
          }
        }
        const matchedAnswers: Record<string, string> = {};
        for (const [key, value] of Object.entries(discoveryAnswers)) {
          if (validQuestionIds.has(key)) matchedAnswers[key] = value;
        }
        const completion = Object.keys(matchedAnswers).length > 0
          ? calculateCompletionPercentage(activeDefinition.questionSchema as any, matchedAnswers) : 0;
        const [ffResponse] = await db.insert(factFinderResponses).values({
          definitionId: activeDefinition.id, clientId: client.id, advisorId: advisor.id,
          status: completion >= 100 ? "completed" : "draft", answers: matchedAnswers, completionPercentage: completion,
        }).returning();
        factFinderResponseId = ffResponse?.id || null;
      }
    } catch (ffErr) {
      logger.warn({ err: ffErr }, "Failed to auto-populate fact finder from discovery");
    }

    return NextResponse.json({ client, factFinderResponseId });
  } catch (err) {
    logger.error({ err: err }, "POST /api/discovery/sessions/:id/create-client error:");
    return NextResponse.json({ message: "Failed to create client from discovery" }, { status: 500 });
  }
}
