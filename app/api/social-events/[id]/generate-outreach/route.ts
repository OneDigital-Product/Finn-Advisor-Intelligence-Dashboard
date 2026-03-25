import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { isAIAvailable, chatCompletion } from "@server/openai";
import { logger } from "@server/lib/logger";

function generateFallbackOutreach(client: any, event: any): string {
  const firstName = client.firstName;
  const templates: Record<string, string> = {
    job_change: `Hi ${firstName},\n\nI noticed your recent career move — congratulations! Transitions like this often come with new benefits, compensation changes, and planning opportunities.\n\nI'd love to schedule some time to review how this change might impact your financial plan.\n\nBest regards`,
    promotion: `Hi ${firstName},\n\nCongratulations on your well-deserved promotion!\n\nWith increased responsibilities often come changes in compensation, equity grants, and tax considerations. I'd like to help ensure your financial plan reflects this positive development.\n\nBest regards`,
    company_milestone: `Hi ${firstName},\n\nI saw the exciting news about your company's milestone — congratulations! Events like this can sometimes impact equity positions or bonus structures.\n\nLet me know if you'd like to connect.\n\nBest regards`,
    life_event: `Hi ${firstName},\n\nI hope you're doing well! I noticed a recent life update and wanted to reach out.\n\nLife changes often come with new financial planning considerations. I'm here to help ensure everything is aligned.\n\nBest regards`,
    education: `Hi ${firstName},\n\nCongratulations on your recent educational achievement!\n\nIf this milestone leads to any career or income changes, I'd be happy to review your financial plan.\n\nBest regards`,
    award: `Hi ${firstName},\n\nI saw the news about your recent recognition — congratulations!\n\nI'd love to catch up and see how things are going.\n\nBest regards`,
    publication: `Hi ${firstName},\n\nI enjoyed seeing your recent publication — very insightful!\n\nI'd love to connect and catch up.\n\nBest regards`,
  };
  return templates[event.eventType] || `Hi ${firstName},\n\nI wanted to reach out regarding a recent update. I'd love to connect.\n\nBest regards`;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const event = await storage.getSocialEvent(id);
    if (!event) return NextResponse.json({ message: "Event not found" }, { status: 404 });
    const client = await storage.getClient(event.clientId);
    if (!client) return NextResponse.json({ message: "Client not found" }, { status: 404 });
    if (auth.session.userType === "advisor" && client.advisorId !== auth.session.userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    let outreachPrompt: string;
    if (isAIAvailable()) {
      try {
        outreachPrompt = await chatCompletion(
          "You are an expert wealth advisor assistant. Generate a warm, professional outreach message based on a social media event detected for a client. The tone should be congratulatory and relationship-focused. Keep it concise (3-4 paragraphs). Do not include a subject line.",
          `Client: ${client.firstName} ${client.lastName}\nEvent Type: ${event.eventType}\nEvent: ${event.title}\nDetails: ${event.description || "No additional details"}\n\nGenerate a personalized outreach message.`,
          true, 1024
        );
        if (!outreachPrompt) outreachPrompt = generateFallbackOutreach(client, event);
      } catch {
        outreachPrompt = generateFallbackOutreach(client, event);
      }
    } else {
      outreachPrompt = generateFallbackOutreach(client, event);
    }

    const updated = await storage.updateSocialEvent(event.id, { outreachPrompt, outreachGenerated: true });
    return NextResponse.json(updated);
  } catch (error: any) {
    logger.error({ err: error }, "API error");
    return NextResponse.json({ message: "An error occurred." }, { status: 500 });
  }
}
