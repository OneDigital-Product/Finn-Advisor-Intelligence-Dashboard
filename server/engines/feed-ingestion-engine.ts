import { createHash } from "crypto";
import { logger } from "../lib/logger";
import { storage } from "../storage";
import { ingestResearchArticle } from "./research-engine";
import type { ResearchFeed } from "@shared/schema";

interface FeedItem {
  title: string;
  link: string;
  content: string;
  pubDate?: Date;
}

function computeContentHash(content: string): string {
  return createHash("sha256").update(content.trim().toLowerCase()).digest("hex");
}

function extractText(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";
  let text = match[1];
  const cdataMatch = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdataMatch) text = cdataMatch[1];
  return text.replace(/<[^>]+>/g, "").trim();
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
  const match = xml.match(regex);
  return match ? match[1] : "";
}

function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? undefined : d;
}

function parseRssItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractText(itemXml, "title");
    const link = extractText(itemXml, "link");
    const content = extractText(itemXml, "content:encoded") || extractText(itemXml, "description");
    const pubDateStr = extractText(itemXml, "pubDate");
    if (title && (content || link)) {
      items.push({ title, link, content: content || title, pubDate: parseDate(pubDateStr) });
    }
  }
  return items;
}

function parseAtomEntries(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];
    const title = extractText(entryXml, "title");
    const link = extractAttr(entryXml, "link", "href") || extractText(entryXml, "link");
    const content = extractText(entryXml, "content") || extractText(entryXml, "summary");
    const pubDateStr = extractText(entryXml, "updated") || extractText(entryXml, "published");
    if (title && (content || link)) {
      items.push({ title, link, content: content || title, pubDate: parseDate(pubDateStr) });
    }
  }
  return items;
}

export function parseFeed(xml: string): FeedItem[] {
  if (xml.includes("<feed") && xml.includes("xmlns=\"http://www.w3.org/2005/Atom\"")) {
    return parseAtomEntries(xml);
  }
  return parseRssItems(xml);
}

function validateFeedUrl(url: string): void {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported");
  }
  const hostname = parsed.hostname.toLowerCase();
  const blocked = [
    "localhost", "127.0.0.1", "0.0.0.0", "::1",
    "169.254.169.254", "metadata.google.internal",
  ];
  if (blocked.includes(hostname) || hostname.endsWith(".local") || hostname.startsWith("10.") || hostname.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
    throw new Error("Private or reserved network addresses are not allowed");
  }
}

export async function fetchAndParseFeed(url: string): Promise<FeedItem[]> {
  validateFeedUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "OneDigital-Research-Feed-Reader/1.0",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const xml = await response.text();
    return parseFeed(xml);
  } finally {
    clearTimeout(timeout);
  }
}

async function isDuplicate(item: FeedItem): Promise<boolean> {
  if (item.link) {
    const existing = await storage.getResearchArticleByUrl(item.link);
    if (existing) return true;
  }
  const hash = computeContentHash(item.content);
  const existing = await storage.getResearchArticleByContentHash(hash);
  return !!existing;
}

export async function ingestFeedItems(feed: ResearchFeed, items: FeedItem[]): Promise<{ ingested: number; skipped: number; errors: number }> {
  let ingested = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of items) {
    try {
      if (await isDuplicate(item)) {
        skipped++;
        continue;
      }
      const contentHash = computeContentHash(item.content);
      await ingestResearchArticle({
        source: feed.name,
        sourceUrl: item.link || undefined,
        title: item.title,
        content: item.content,
        publishedAt: item.pubDate,
        contentHash,
        feedId: feed.id,
      });
      ingested++;
    } catch (err) {
      logger.error({ err, feedId: feed.id, title: item.title }, "Failed to ingest feed item");
      errors++;
    }
  }

  return { ingested, skipped, errors };
}

export async function processFeed(feed: ResearchFeed): Promise<{ ingested: number; skipped: number; errors: number }> {
  logger.info({ feedId: feed.id, name: feed.name, url: feed.url }, "[FeedIngestion] Fetching feed");
  try {
    const items = await fetchAndParseFeed(feed.url);
    const result = await ingestFeedItems(feed, items);

    await storage.updateResearchFeed(feed.id, {
      lastFetchAt: new Date(),
      lastError: null,
      errorCount: 0,
      articleCount: (feed.articleCount || 0) + result.ingested,
    });

    logger.info({ feedId: feed.id, ...result }, "[FeedIngestion] Feed processed");
    return result;
  } catch (err: any) {
    const errorMsg = err.message || "Unknown error";
    await storage.updateResearchFeed(feed.id, {
      lastFetchAt: new Date(),
      lastError: errorMsg,
      errorCount: (feed.errorCount || 0) + 1,
    });
    logger.error({ err, feedId: feed.id }, "[FeedIngestion] Feed fetch failed");
    return { ingested: 0, skipped: 0, errors: 1 };
  }
}

export async function processAllFeeds(): Promise<{ totalIngested: number; totalSkipped: number; totalErrors: number; feedsProcessed: number }> {
  const feeds = await storage.getActiveResearchFeeds();
  let totalIngested = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const feed of feeds) {
    const now = Date.now();
    const lastFetch = feed.lastFetchAt ? feed.lastFetchAt.getTime() : 0;
    const intervalMs = (feed.fetchIntervalMinutes || 360) * 60 * 1000;

    if (now - lastFetch < intervalMs) {
      continue;
    }

    const result = await processFeed(feed);
    totalIngested += result.ingested;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
  }

  return { totalIngested, totalSkipped, totalErrors, feedsProcessed: feeds.length };
}

export async function testFeedUrl(url: string): Promise<{ success: boolean; itemCount: number; sampleTitles: string[]; error?: string }> {
  try {
    const items = await fetchAndParseFeed(url);
    return {
      success: true,
      itemCount: items.length,
      sampleTitles: items.slice(0, 5).map(i => i.title),
    };
  } catch (err: any) {
    return {
      success: false,
      itemCount: 0,
      sampleTitles: [],
      error: err.message || "Failed to fetch feed",
    };
  }
}
