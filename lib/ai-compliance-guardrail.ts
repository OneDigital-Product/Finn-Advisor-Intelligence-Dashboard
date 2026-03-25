import { validateAIContent } from "@server/engines/fiduciary-compliance";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";

export async function applyComplianceGuardrail(
  content: string,
  contentType: string,
  advisorId?: string,
  clientId?: string,
  clientRiskTolerance?: string
): Promise<{
  result: string;
  complianceStatus: { outcome: string; warnings: number; blocks: number };
}> {
  let validation;
  try {
    validation = await validateAIContent(content, contentType, {
      advisorId,
      clientId,
      clientRiskTolerance,
    });
  } catch (err) {
    logger.error(
      { err },
      "Compliance guardrail validation error — blocking content for safety"
    );
    return {
      result:
        "⚠️ Content validation failed. This content has been held pending compliance review. Please try again or contact your compliance officer.",
      complianceStatus: { outcome: "blocked", warnings: 0, blocks: 1 },
    };
  }

  try {
    await storage.createFiduciaryValidationLog({
      advisorId: advisorId || null,
      clientId: clientId || null,
      contentType,
      outcome: validation.outcome,
      ruleSetVersion: validation.ruleSetVersion,
      matchCount: validation.matches.length,
      warningCount: validation.warnings.length,
      blockCount: validation.blocks.length,
      matches: validation.matches as any,
      contentPreview: content.substring(0, 500),
      resolvedBy: null,
      resolvedAt: null,
      resolutionNote: null,
    });
  } catch (logErr) {
    logger.error(
      { err: logErr },
      "Failed to log fiduciary validation — validation result still enforced"
    );
  }

  const outputContent =
    validation.outcome === "blocked"
      ? validation.annotatedContent +
        "\n\n> **This content has been held for compliance review.** A compliance officer must review and approve before delivery."
      : validation.outcome === "flagged"
        ? validation.annotatedContent
        : content;

  return {
    result: outputContent,
    complianceStatus: {
      outcome: validation.outcome,
      warnings: validation.warnings.length,
      blocks: validation.blocks.length,
    },
  };
}
