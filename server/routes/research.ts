import type { Express } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { storage } from "../storage";
import { requireAuth, requireAdvisor, getSessionAdvisor } from "./middleware";
import {
  ingestResearchArticle,
  reprocessArticle,
  getClientRelevantResearch,
  generateResearchBrief,
  RESEARCH_TOPICS,
  RESEARCH_SOURCES,
} from "../engines/research-engine";
import { testFeedUrl, processFeed } from "../engines/feed-ingestion-engine";

const VALID_SOURCE_IDS = RESEARCH_SOURCES.map(s => s.id);

const ingestSchema = z.object({
  source: z.string().min(1).max(200),
  sourceUrl: z.string().url().max(2000).optional().or(z.literal("")),
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(100000),
  publishedAt: z.string().optional(),
});

const querySchema = z.object({
  topic: z.string().optional(),
  source: z.string().optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const feedSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().max(2000),
  category: z.string().max(100).optional().or(z.literal("")),
  fetchIntervalMinutes: z.coerce.number().int().min(15).max(10080).optional(),
  status: z.enum(["active", "paused"]).optional(),
});

const briefQuerySchema = z.object({
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export function registerResearchRoutes(app: Express) {
  app.get("/api/research", requireAuth, async (req, res) => {
    try {
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid query parameters", errors: parsed.error.issues });
      }
      const { topic, source, search, limit, offset } = parsed.data;
      const articles = await storage.getResearchArticles({ topic, source, search, limit, offset });
      res.json(articles);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch research articles");
      res.status(500).json({ message: "Failed to fetch research articles" });
    }
  });

  app.get("/api/research/topics", requireAuth, (_req, res) => {
    res.json(RESEARCH_TOPICS);
  });

  app.get("/api/research/sources", requireAuth, (_req, res) => {
    res.json(RESEARCH_SOURCES);
  });

  app.get("/api/research/feeds", requireAuth, async (_req, res) => {
    try {
      const feeds = await storage.getResearchFeeds();
      res.json(feeds);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch research feeds");
      res.status(500).json({ message: "Failed to fetch research feeds" });
    }
  });

  app.get("/api/research/feeds/:id", requireAuth, async (req, res) => {
    try {
      const feed = await storage.getResearchFeed(String(req.params.id));
      if (!feed) return res.status(404).json({ message: "Feed not found" });
      res.json(feed);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch research feed");
      res.status(500).json({ message: "Failed to fetch research feed" });
    }
  });

  app.post("/api/research/feeds", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const parsed = feedSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
      }
      const feed = await storage.createResearchFeed({
        name: parsed.data.name,
        url: parsed.data.url,
        category: parsed.data.category || null,
        fetchIntervalMinutes: parsed.data.fetchIntervalMinutes || 360,
        status: parsed.data.status || "active",
      });
      res.status(201).json(feed);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to create research feed");
      res.status(500).json({ message: "Failed to create research feed" });
    }
  });

  app.patch("/api/research/feeds/:id", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const parsed = feedSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
      }
      const feed = await storage.updateResearchFeed(String(req.params.id), parsed.data);
      if (!feed) return res.status(404).json({ message: "Feed not found" });
      res.json(feed);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to update research feed");
      res.status(500).json({ message: "Failed to update research feed" });
    }
  });

  app.delete("/api/research/feeds/:id", requireAuth, requireAdvisor, async (req, res) => {
    try {
      await storage.deleteResearchFeed(String(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to delete research feed");
      res.status(500).json({ message: "Failed to delete research feed" });
    }
  });

  app.post("/api/research/feeds/test", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const urlSchema = z.object({ url: z.string().url().max(2000) });
      const parsed = urlSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid URL", errors: parsed.error.issues });
      }
      const result = await testFeedUrl(parsed.data.url);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to test feed URL");
      res.status(500).json({ message: "Failed to test feed URL" });
    }
  });

  app.post("/api/research/feeds/:id/fetch", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const feed = await storage.getResearchFeed(String(req.params.id));
      if (!feed) return res.status(404).json({ message: "Feed not found" });
      const result = await processFeed(feed);
      res.json(result);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch feed");
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  app.get("/api/research/briefs", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ message: "Advisor not found" });
      const parsed = briefQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid query parameters", errors: parsed.error.issues });
      }
      const briefs = await storage.getResearchBriefs(advisor.id, parsed.data);
      res.json(briefs);
    } catch (error: unknown) {
      logger.error({ err: error }, "Failed to fetch research briefs");
      res.status(500).json({ message: "Failed to fetch research briefs" });
    }
  });

  app.get("/api/research/briefs/:id", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ message: "Advisor not found" });
      const brief = await storage.getResearchBrief(String(req.params.id));
      if (!brief || brief.advisorId !== advisor.id) {
        return res.status(404).json({ message: "Brief not found" });
      }
      res.json(brief);
    } catch (error: unknown) {
      logger.error({ err: error }, "Failed to fetch research brief");
      res.status(500).json({ message: "Failed to fetch research brief" });
    }
  });

  app.post("/api/research/:id/brief", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ message: "Advisor not found" });
      const brief = await generateResearchBrief(String(req.params.id), advisor.id);
      res.status(201).json(brief);
    } catch (error: unknown) {
      logger.error({ err: error }, "Failed to generate research brief");
      if (error instanceof Error && error.message === "Article not found") {
        return res.status(404).json({ message: "Article not found" });
      }
      res.status(500).json({ message: "Failed to generate research brief" });
    }
  });

  app.get("/api/research/:id/briefs", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ message: "Advisor not found" });
      const briefs = await storage.getResearchBriefsByArticle(String(req.params.id), advisor.id);
      res.json(briefs);
    } catch (error: unknown) {
      logger.error({ err: error }, "Failed to fetch article briefs");
      res.status(500).json({ message: "Failed to fetch article briefs" });
    }
  });

  app.delete("/api/research/briefs/:id", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(403).json({ message: "Advisor not found" });
      const brief = await storage.getResearchBrief(String(req.params.id));
      if (!brief || brief.advisorId !== advisor.id) {
        return res.status(404).json({ message: "Brief not found" });
      }
      await storage.deleteResearchBrief(String(req.params.id), advisor.id);
      res.json({ success: true });
    } catch (error: unknown) {
      logger.error({ err: error }, "Failed to delete research brief");
      res.status(500).json({ message: "Failed to delete research brief" });
    }
  });

  app.get("/api/research/:id", requireAuth, async (req, res) => {
    try {
      const article = await storage.getResearchArticle(String(req.params.id));
      if (!article) return res.status(404).json({ message: "Article not found" });
      res.json(article);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch research article");
      res.status(500).json({ message: "Failed to fetch research article" });
    }
  });

  app.post("/api/research/ingest", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const parsed = ingestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
      }
      const { source, sourceUrl, title, content, publishedAt } = parsed.data;
      const article = await ingestResearchArticle({
        source,
        sourceUrl: sourceUrl || undefined,
        title,
        content,
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
      });
      res.status(201).json(article);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to ingest research article");
      res.status(500).json({ message: "Failed to ingest research article" });
    }
  });

  app.post("/api/research/:id/reprocess", requireAuth, requireAdvisor, async (req, res) => {
    try {
      const article = await reprocessArticle(String(req.params.id));
      if (!article) return res.status(404).json({ message: "Article not found" });
      res.json(article);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to reprocess research article");
      res.status(500).json({ message: "Failed to reprocess research article" });
    }
  });

  app.delete("/api/research/:id", requireAuth, requireAdvisor, async (req, res) => {
    try {
      await storage.deleteResearchArticle(String(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ err: error }, "Failed to delete research article");
      res.status(500).json({ message: "Failed to delete research article" });
    }
  });

  app.get("/api/clients/:clientId/research", requireAuth, async (req, res) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ message: "Not authenticated" });

      const client = await storage.getClient(String(req.params.clientId));
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.advisorId !== advisor.id) return res.status(403).json({ message: "Access denied" });

      const articles = await getClientRelevantResearch(String(req.params.clientId));
      res.json(articles);
    } catch (error: any) {
      logger.error({ err: error }, "Failed to fetch client-relevant research");
      res.status(500).json({ message: "Failed to fetch client research" });
    }
  });
}
