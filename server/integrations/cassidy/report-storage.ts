import { storage } from "../../storage";
import { reportArtifacts, reportArtifactVersions } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../../lib/logger";

export async function saveDraftVersion(
  draftId: string,
  advisorId: string,
  edits: string,
  editSummary?: string
) {
  const [draft] = await storage.db
    .select()
    .from(reportArtifacts)
    .where(and(eq(reportArtifacts.id, draftId), eq(reportArtifacts.advisorId, advisorId)))
    .limit(1);

  if (!draft) throw new Error("Draft not found");
  if (draft.status === "approved") throw new Error("Cannot edit approved draft");
  if (draft.status === "discarded") throw new Error("Cannot edit discarded draft");

  const currentVersion = draft.version || 1;
  const newVersion = currentVersion + 1;

  let originalText = draft.originalDraftText || draft.fullDraftText;
  if (!originalText && draft.draftSections) {
    const sections = draft.draftSections as any[];
    if (Array.isArray(sections)) {
      originalText = sections
        .map((s: any) => {
          const heading = s.heading ? `${s.heading}\n` : "";
          const body = s.body || s.content || JSON.stringify(s);
          return `${heading}${body}`;
        })
        .join("\n\n");
    }
  }
  if (!originalText) originalText = "";

  await storage.db.insert(reportArtifactVersions).values({
    id: crypto.randomUUID(),
    artifactId: draftId,
    versionNumber: newVersion,
    draftText: edits,
    editedBy: advisorId,
    editSummary: editSummary || null,
  });

  const [updated] = await storage.db
    .update(reportArtifacts)
    .set({
      version: newVersion,
      fullDraftText: edits,
      editCount: (draft.editCount || 0) + 1,
      originalDraftText: originalText,
      updatedAt: new Date(),
    })
    .where(eq(reportArtifacts.id, draftId))
    .returning();

  logger.info({ draftId, newVersion, advisorId }, "Saved draft version");
  return updated;
}

export async function getDraftVersions(draftId: string, advisorId: string) {
  const [draft] = await storage.db
    .select()
    .from(reportArtifacts)
    .where(and(eq(reportArtifacts.id, draftId), eq(reportArtifacts.advisorId, advisorId)))
    .limit(1);

  if (!draft) throw new Error("Draft not found");

  const versions = await storage.db
    .select()
    .from(reportArtifactVersions)
    .where(eq(reportArtifactVersions.artifactId, draftId))
    .orderBy(desc(reportArtifactVersions.versionNumber));

  return versions;
}

export async function getVersionDiff(draftId: string, advisorId: string, v1: number, v2: number) {
  const [draft] = await storage.db
    .select()
    .from(reportArtifacts)
    .where(and(eq(reportArtifacts.id, draftId), eq(reportArtifacts.advisorId, advisorId)))
    .limit(1);

  if (!draft) throw new Error("Draft not found");

  let text1: string;
  let text2: string;

  if (v1 === 1 && draft.originalDraftText) {
    text1 = draft.originalDraftText;
  } else {
    const [ver1] = await storage.db
      .select()
      .from(reportArtifactVersions)
      .where(and(
        eq(reportArtifactVersions.artifactId, draftId),
        eq(reportArtifactVersions.versionNumber, v1),
      ))
      .limit(1);
    if (!ver1) throw new Error(`Version ${v1} not found`);
    text1 = ver1.draftText;
  }

  if (v2 === (draft.version || 1) && draft.fullDraftText) {
    text2 = draft.fullDraftText;
  } else {
    const [ver2] = await storage.db
      .select()
      .from(reportArtifactVersions)
      .where(and(
        eq(reportArtifactVersions.artifactId, draftId),
        eq(reportArtifactVersions.versionNumber, v2),
      ))
      .limit(1);
    if (!ver2) throw new Error(`Version ${v2} not found`);
    text2 = ver2.draftText;
  }

  const diffs = computeDiff(text1, text2);
  return { version1: v1, version2: v2, diffs };
}

export async function approveDraft(draftId: string, advisorId: string) {
  const [draft] = await storage.db
    .select()
    .from(reportArtifacts)
    .where(and(eq(reportArtifacts.id, draftId), eq(reportArtifacts.advisorId, advisorId)))
    .limit(1);

  if (!draft) throw new Error("Draft not found");
  if (draft.status === "approved") throw new Error("Draft already approved");

  const [updated] = await storage.db
    .update(reportArtifacts)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(reportArtifacts.id, draftId))
    .returning();

  logger.info({ draftId, advisorId }, "Draft approved");
  return updated;
}

export async function discardDraft(draftId: string, advisorId: string) {
  const [draft] = await storage.db
    .select()
    .from(reportArtifacts)
    .where(and(eq(reportArtifacts.id, draftId), eq(reportArtifacts.advisorId, advisorId)))
    .limit(1);

  if (!draft) throw new Error("Draft not found");
  if (draft.status === "approved") throw new Error("Cannot discard approved draft");

  await storage.db
    .update(reportArtifacts)
    .set({ status: "discarded", updatedAt: new Date() })
    .where(eq(reportArtifacts.id, draftId));

  logger.info({ draftId, advisorId }, "Draft discarded");
}

function computeDiff(text1: string, text2: string) {
  const lines1 = text1.split("\n");
  const lines2 = text2.split("\n");
  const diffs: Array<{ type: "added" | "removed" | "unchanged"; line: string; index: number }> = [];

  const maxLen = Math.max(lines1.length, lines2.length);
  for (let i = 0; i < maxLen; i++) {
    const l1 = lines1[i];
    const l2 = lines2[i];

    if (l1 === l2) {
      if (l1 !== undefined) {
        diffs.push({ type: "unchanged", line: l1, index: i });
      }
    } else {
      if (l1 !== undefined) {
        diffs.push({ type: "removed", line: l1, index: i });
      }
      if (l2 !== undefined) {
        diffs.push({ type: "added", line: l2, index: i });
      }
    }
  }

  return diffs;
}
