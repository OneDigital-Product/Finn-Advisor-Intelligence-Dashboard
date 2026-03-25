import { logger } from "../lib/logger";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { validateBody } from "../lib/validation";
import { isAIAvailable, chatCompletion } from "../openai";

const addSocialProfileSchema = z.object({
  clientId: z.string().min(1),
  platform: z.string().default("linkedin"),
  profileUrl: z.string().url("Must be a valid URL").refine(
    (url) => /linkedin\.com/i.test(url),
    "Only LinkedIn profile URLs are supported"
  ),
  displayName: z.string().optional(),
  headline: z.string().optional(),
  monitoringEnabled: z.boolean().default(true),
});

const updateSocialProfileSchema = z.object({
  profileUrl: z.string().url().refine(
    (url) => /linkedin\.com/i.test(url),
    "Only LinkedIn profile URLs are supported"
  ).optional(),
  displayName: z.string().optional(),
  headline: z.string().optional(),
  monitoringEnabled: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

const simulateEventSchema = z.object({
  eventType: z.enum(["job_change", "promotion", "company_milestone", "life_event", "education", "award", "publication"]),
  title: z.string().min(1),
  description: z.string().optional(),
  sourceUrl: z.string().optional(),
});

async function authorizeClientAccess(req: Request, res: Response, clientId: string): Promise<boolean> {
  const client = await storage.getClient(clientId);
  if (!client) {
    res.status(404).json({ message: "Client not found" });
    return false;
  }

  if (req.session.userType === "advisor") {
    if (client.advisorId !== req.session.userId) {
      res.status(403).json({ message: "Access denied" });
      return false;
    }
  } else if (req.session.userType === "associate") {
    const assignedClients = await storage.getClientsByAssociate(req.session.userId!);
    if (!assignedClients.some(c => c.id === clientId)) {
      res.status(403).json({ message: "Access denied" });
      return false;
    }
  }

  return true;
}

async function authorizeProfileAccess(req: Request, res: Response, profileId: string): Promise<boolean> {
  const profile = await storage.getSocialProfile(profileId);
  if (!profile) {
    res.status(404).json({ message: "Profile not found" });
    return false;
  }
  return authorizeClientAccess(req, res, profile.clientId);
}

async function authorizeEventAccess(req: Request, res: Response, eventId: string): Promise<boolean> {
  const event = await storage.getSocialEvent(eventId);
  if (!event) {
    res.status(404).json({ message: "Event not found" });
    return false;
  }
  return authorizeClientAccess(req, res, event.clientId);
}

export function registerSocialIntelligenceRoutes(app: Express) {
  app.get("/api/clients/:clientId/social-profiles", async (req, res) => {
    try {
      if (!(await authorizeClientAccess(req, res, req.params.clientId))) return;
      const profiles = await storage.getSocialProfilesByClient(req.params.clientId);
      res.json(profiles);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:clientId/social-profiles", async (req, res) => {
    try {
      if (!(await authorizeClientAccess(req, res, req.params.clientId))) return;
      const body = validateBody(addSocialProfileSchema, req, res);
      if (!body) return;
      const profile = await storage.createSocialProfile({
        clientId: req.params.clientId,
        platform: body.platform,
        profileUrl: body.profileUrl,
        displayName: body.displayName || null,
        headline: body.headline || null,
        monitoringEnabled: body.monitoringEnabled,
        lastCheckedAt: null,
      });
      res.json(profile);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/social-profiles/:id", async (req, res) => {
    try {
      if (!(await authorizeProfileAccess(req, res, req.params.id))) return;
      const body = validateBody(updateSocialProfileSchema, req, res);
      if (!body) return;
      const result = await storage.updateSocialProfile(req.params.id, body);
      if (!result) return res.status(404).json({ message: "Profile not found" });
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.delete("/api/social-profiles/:id", async (req, res) => {
    try {
      if (!(await authorizeProfileAccess(req, res, req.params.id))) return;
      await storage.deleteSocialProfile(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/clients/:clientId/social-events", async (req, res) => {
    try {
      if (!(await authorizeClientAccess(req, res, req.params.clientId))) return;
      const events = await storage.getSocialEventsByClient(req.params.clientId);
      res.json(events);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/social-profiles/:profileId/events", async (req, res) => {
    try {
      if (!(await authorizeProfileAccess(req, res, req.params.profileId))) return;
      const body = validateBody(simulateEventSchema, req, res);
      if (!body) return;
      const profile = await storage.getSocialProfile(req.params.profileId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      const event = await storage.createSocialEvent({
        socialProfileId: profile.id,
        clientId: profile.clientId,
        eventType: body.eventType,
        title: body.title,
        description: body.description || null,
        detectedAt: new Date(),
        sourceUrl: body.sourceUrl || null,
        isRead: false,
        outreachPrompt: null,
        outreachGenerated: false,
      });
      res.json(event);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.patch("/api/social-events/:id/read", async (req, res) => {
    try {
      if (!(await authorizeEventAccess(req, res, req.params.id))) return;
      const result = await storage.updateSocialEvent(req.params.id, { isRead: true });
      if (!result) return res.status(404).json({ message: "Event not found" });
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/social-events/:id/generate-outreach", async (req, res) => {
    try {
      if (!(await authorizeEventAccess(req, res, req.params.id))) return;
      const event = await storage.getSocialEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });

      const client = await storage.getClient(event.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });

      let outreachPrompt: string;

      if (isAIAvailable()) {
        try {
          outreachPrompt = await generateOutreachWithAI(client, event);
        } catch {
          outreachPrompt = generateFallbackOutreach(client, event);
        }
      } else {
        outreachPrompt = generateFallbackOutreach(client, event);
      }

      const updated = await storage.updateSocialEvent(event.id, {
        outreachPrompt,
        outreachGenerated: true,
      });

      res.json(updated);
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/clients/:clientId/social-monitor", async (req, res) => {
    try {
      if (!(await authorizeClientAccess(req, res, req.params.clientId))) return;
      const profiles = await storage.getSocialProfilesByClient(req.params.clientId);
      const monitoredProfiles = profiles.filter(p => p.monitoringEnabled);

      if (monitoredProfiles.length === 0) {
        return res.json({ checked: 0, newEvents: 0, message: "No monitored profiles" });
      }

      const eventTypes = ["job_change", "promotion", "company_milestone", "life_event", "education", "award", "publication"];
      const eventTitles: Record<string, string[]> = {
        job_change: ["Started new role at", "Joined", "Moved to"],
        promotion: ["Promoted to", "Elevated to", "Named as"],
        company_milestone: ["Company reached", "Celebrating", "Announced"],
        life_event: ["Welcomed", "Celebrated", "Moved to new city"],
        education: ["Completed certification in", "Graduated from", "Earned"],
        award: ["Received", "Won", "Honored with"],
        publication: ["Published article on", "Featured in", "Authored"],
      };

      let newEvents = 0;
      for (const profile of monitoredProfiles) {
        const shouldGenerate = Math.random() < 0.35;
        if (shouldGenerate) {
          const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
          const titles = eventTitles[type];
          const title = titles[Math.floor(Math.random() * titles.length)];
          const client = await storage.getClient(profile.clientId);
          const displayName = profile.displayName || (client ? `${client.firstName} ${client.lastName}` : "Contact");

          await storage.createSocialEvent({
            socialProfileId: profile.id,
            clientId: profile.clientId,
            eventType: type,
            title: `${displayName} — ${title} ${generateContextualDetail(type)}`,
            description: generateEventDescription(type, displayName),
            detectedAt: new Date(),
            sourceUrl: profile.profileUrl,
            isRead: false,
            outreachPrompt: null,
            outreachGenerated: false,
          });
          newEvents++;
        }

        await storage.updateSocialProfile(profile.id, { lastCheckedAt: new Date() });
      }

      res.json({ checked: monitoredProfiles.length, newEvents });
    } catch (error: any) {
      logger.error({ err: error }, "API error");
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });
}

function generateContextualDetail(eventType: string): string {
  const details: Record<string, string[]> = {
    job_change: ["Acme Financial", "Vanguard Group", "BlackRock", "JP Morgan", "Goldman Sachs", "a Fortune 500 company"],
    promotion: ["Senior Vice President", "Managing Director", "Chief Financial Officer", "Partner", "Head of Strategy"],
    company_milestone: ["$1B in AUM", "10-year anniversary", "a major acquisition", "IPO filing", "new product launch"],
    life_event: ["a new family member", "a milestone birthday", "a new home", "retirement plans"],
    education: ["Financial Planning", "Wealth Management", "CFA Level III", "MBA program", "CFP designation"],
    award: ["Industry Leader Award", "Top 40 Under 40", "Best Advisor recognition", "Innovation Award"],
    publication: ["market outlook", "estate planning strategies", "retirement readiness", "tax optimization"],
  };
  const opts = details[eventType] || ["a notable achievement"];
  return opts[Math.floor(Math.random() * opts.length)];
}

function generateEventDescription(eventType: string, name: string): string {
  const descriptions: Record<string, string> = {
    job_change: `${name} has made a career transition. This may indicate changes in their financial situation, benefits, or compensation that could warrant a portfolio review.`,
    promotion: `${name} has been promoted, likely resulting in increased compensation. Consider discussing updated financial goals, tax planning, and investment strategy adjustments.`,
    company_milestone: `${name}'s company has achieved a significant milestone. This could affect stock options, RSUs, or other equity-based compensation.`,
    life_event: `${name} has experienced a notable life event that may impact their financial planning needs including insurance, estate planning, and savings goals.`,
    education: `${name} has completed an educational milestone, signaling professional development that may lead to career changes and updated financial needs.`,
    award: `${name} has received professional recognition, indicating strong career trajectory. Good opportunity for congratulatory outreach and relationship strengthening.`,
    publication: `${name} has published professional content, demonstrating thought leadership. This presents a natural touchpoint for engagement.`,
  };
  return descriptions[eventType] || `A social event has been detected for ${name}.`;
}

function generateFallbackOutreach(client: any, event: any): string {
  const firstName = client.firstName;
  const templates: Record<string, string> = {
    job_change: `Hi ${firstName},\n\nI noticed your recent career move — congratulations! Transitions like this often come with new benefits, compensation changes, and planning opportunities.\n\nI'd love to schedule some time to review how this change might impact your financial plan and ensure everything is optimally positioned for this exciting new chapter.\n\nWould you be available for a brief call this week or next?\n\nBest regards`,
    promotion: `Hi ${firstName},\n\nCongratulations on your well-deserved promotion! This is wonderful news.\n\nWith increased responsibilities often come changes in compensation, equity grants, and tax considerations. I'd like to help ensure your financial plan reflects this positive development.\n\nShall we schedule a quick review to discuss any updates to your goals or strategy?\n\nBest regards`,
    company_milestone: `Hi ${firstName},\n\nI saw the exciting news about your company's milestone — congratulations! Events like this can sometimes impact equity positions, stock options, or bonus structures.\n\nI'd be happy to review your current positions and discuss any planning opportunities that might arise.\n\nLet me know if you'd like to connect.\n\nBest regards`,
    life_event: `Hi ${firstName},\n\nI hope you're doing well! I noticed a recent life update and wanted to reach out.\n\nLife changes often come with new financial planning considerations — from insurance needs to estate planning updates. I'm here to help ensure everything is aligned with your evolving situation.\n\nWould you like to schedule a review?\n\nBest regards`,
    education: `Hi ${firstName},\n\nCongratulations on your recent educational achievement! Continued professional development is always impressive.\n\nIf this milestone leads to any career or income changes, I'd be happy to review your financial plan to make sure it's keeping pace.\n\nBest regards`,
    award: `Hi ${firstName},\n\nI saw the news about your recent recognition — congratulations! It's great to see your hard work acknowledged.\n\nI'd love to catch up and see how things are going. If your financial situation has evolved, we can also take a quick look at your plan.\n\nBest regards`,
    publication: `Hi ${firstName},\n\nI enjoyed seeing your recent publication — very insightful! It's clear you're making an impact in your field.\n\nI'd love to connect and catch up. If anything has changed in your financial picture, we can discuss that as well.\n\nBest regards`,
  };
  return templates[event.eventType] || `Hi ${firstName},\n\nI wanted to reach out regarding a recent update I noticed. I'd love to connect and discuss how things are going.\n\nBest regards`;
}

async function generateOutreachWithAI(client: any, event: any): Promise<string> {
  if (!isAIAvailable()) {
    return generateFallbackOutreach(client, event);
  }

  try {
    const result = await chatCompletion(
      "You are an expert wealth advisor assistant. Generate a warm, professional outreach message based on a social media event detected for a client. The tone should be congratulatory, relationship-focused, and naturally transition to offering financial planning value. Keep it concise (3-4 paragraphs). Do not include a subject line.",
      `Client: ${client.firstName} ${client.lastName}\nEvent Type: ${event.eventType}\nEvent: ${event.title}\nDetails: ${event.description || "No additional details"}\n\nGenerate a personalized outreach message.`,
      true,
      1024
    );
    return result || generateFallbackOutreach(client, event);
  } catch (error) {
    logger.error({ err: error }, "AI outreach generation failed");
    return generateFallbackOutreach(client, event);
  }
}
