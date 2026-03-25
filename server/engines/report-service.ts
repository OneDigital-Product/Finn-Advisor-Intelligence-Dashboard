import { db } from "../db";
import { reportTemplates, reportArtifacts, clients, households } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { executeDataSource, type DataSourceContext } from "./data-sources";
import { renderReportHtml } from "./report-renderer";
import { logger } from "../lib/logger";

async function validateOwnership(advisorId: string, clientId?: string, householdId?: string): Promise<void> {
  if (clientId) {
    const [client] = await db.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.advisorId, advisorId)));
    if (!client) throw new Error("Client not found or unauthorized");
  }
  if (householdId) {
    const [household] = await db.select().from(households).where(and(eq(households.id, householdId), eq(households.advisorId, advisorId)));
    if (!household) throw new Error("Household not found or unauthorized");
  }
}

export async function generateReportArtifact(
  templateId: string,
  clientId: string | undefined,
  householdId: string | undefined,
  reportName: string,
  advisorId: string,
  visibleSections?: string[]
): Promise<any> {
  const [template] = await db
    .select()
    .from(reportTemplates)
    .where(and(eq(reportTemplates.id, templateId), eq(reportTemplates.advisorId, advisorId)));

  if (!template || !template.isActive) {
    throw new Error("Template not found or inactive");
  }

  await validateOwnership(advisorId, clientId, householdId);

  const context: DataSourceContext = { clientId: clientId || undefined, householdId: householdId || undefined, advisorId };

  const sectionsWithData = await Promise.all(
    (template.sections as any[]).map(async (section) => {
      try {
        const data = await executeDataSource(section.dataSource, context);
        return {
          ...section,
          data,
          annotations: [],
          visibilityOverrides: visibleSections
            ? { hidden: !visibleSections.includes(section.id) }
            : {},
        };
      } catch (err) {
        logger.error({ err, dataSource: section.dataSource }, "Data source execution failed");
        return {
          ...section,
          data: null,
          annotations: [],
          visibilityOverrides: {},
          error: "Data source execution failed",
        };
      }
    })
  );

  const content = {
    sections: sectionsWithData,
    generatedAt: new Date().toISOString(),
    generatedBy: advisorId,
    updatedAt: new Date().toISOString(),
    updatedBy: advisorId,
  };

  const renderedHtml = await renderReportHtml(content, reportName);

  const [artifact] = await db
    .insert(reportArtifacts)
    .values({
      templateId,
      clientId: clientId || null,
      householdId: householdId || null,
      advisorId,
      status: "draft",
      reportName,
      content,
      renderedHtml,
      createdBy: advisorId,
    })
    .returning();

  return artifact;
}

export async function updateReportDraft(
  artifactId: string,
  updates: { content?: any },
  advisorId: string
): Promise<any> {
  const [artifact] = await db
    .select()
    .from(reportArtifacts)
    .where(eq(reportArtifacts.id, artifactId));

  if (!artifact) throw new Error("Report not found");
  if (artifact.status !== "draft") throw new Error("Only draft reports can be edited");
  if (artifact.advisorId !== advisorId) throw new Error("Unauthorized");

  const existingContent = artifact.content as any;
  const updatedContent = {
    ...existingContent,
    ...updates.content,
    updatedAt: new Date().toISOString(),
    updatedBy: advisorId,
  };

  const renderedHtml = await renderReportHtml(updatedContent, artifact.reportName);

  const [updated] = await db
    .update(reportArtifacts)
    .set({ content: updatedContent, renderedHtml, updatedAt: new Date() })
    .where(eq(reportArtifacts.id, artifactId))
    .returning();

  return updated;
}

export async function finalizeReport(
  artifactId: string,
  advisorId: string
): Promise<any> {
  const [artifact] = await db
    .select()
    .from(reportArtifacts)
    .where(eq(reportArtifacts.id, artifactId));

  if (!artifact) throw new Error("Report not found");
  if (artifact.status !== "draft") throw new Error("Only draft reports can be finalized");
  if (artifact.advisorId !== advisorId) throw new Error("Unauthorized");

  const pdfUrl = `/api/reports/${artifactId}/pdf`;

  const [updated] = await db
    .update(reportArtifacts)
    .set({
      status: "final",
      pdfUrl,
      version: (artifact.version || 1) + 1,
      finalizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(reportArtifacts.id, artifactId))
    .returning();

  return updated;
}
