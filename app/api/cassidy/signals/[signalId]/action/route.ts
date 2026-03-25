import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { detectedSignals, signalActions } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import * as investorProfileHandler from "@server/integrations/cassidy/handlers/investor-profile-handler";
import * as factFinderHandler from "@server/integrations/cassidy/handlers/fact-finder-handler";
import * as taskHandler from "@server/integrations/cassidy/handlers/task-handler";
import * as alertHandler from "@server/integrations/cassidy/handlers/alert-handler";
import * as beneficiaryHandler from "@server/integrations/cassidy/handlers/beneficiary-audit-handler";
import * as triageHandler from "@server/integrations/cassidy/handlers/planning-triage-handler";
import crypto from "crypto";
import { storage, logger, signalActionSchema } from "@server/routes/cassidy/shared";

interface SignalRecord {
  recommendedActions?: unknown;
  actionHistory?: unknown;
  [key: string]: unknown;
}

interface RecommendedAction {
  action_type?: string;
  [key: string]: unknown;
}

interface SignalActionHandler {
  validate: (signal: SignalRecord, advisorId: string) => Promise<{ valid: boolean; error?: string }>;
  execute: (signal: SignalRecord, advisorId: string) => Promise<{ success: boolean; error?: string; [key: string]: unknown }>;
}

const signalActionHandlers: Record<string, SignalActionHandler> = {
  refresh_investor_profile: investorProfileHandler,
  launch_retirement_fact_finder: factFinderHandler.retirementFinder,
  launch_business_owner_fact_finder: factFinderHandler.businessOwnerFinder,
  run_beneficiary_audit: beneficiaryHandler,
  notify_advisor: alertHandler,
  create_follow_up_task: taskHandler,
  trigger_planning_triage: triageHandler,
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ signalId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { signalId } = await params;
    const advisorId = auth.session.userId;

    const body = await request.json();
    const parsed = signalActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errors: parsed.error.errors }, { status: 400 });
    }
    const { action_type } = parsed.data;

    const [signal] = await storage.db
      .select()
      .from(detectedSignals)
      .where(and(eq(detectedSignals.id, signalId), eq(detectedSignals.advisorId, advisorId)))
      .limit(1);

    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }

    const recommendedActions = Array.isArray(signal.recommendedActions) ? (signal.recommendedActions as RecommendedAction[]) : [];
    const isValidAction = recommendedActions.some(
      (action) => action && action.action_type === action_type
    );

    if (!isValidAction) {
      return NextResponse.json({
        error: "This action is not recommended for this signal",
        valid_actions: recommendedActions.filter((a) => a?.action_type).map((a) => a.action_type),
      }, { status: 400 });
    }

    const handler = signalActionHandlers[action_type];
    if (!handler) {
      return NextResponse.json({ error: `Unknown action type: ${action_type}` }, { status: 400 });
    }

    const validation = await handler.validate(signal, advisorId);
    if (!validation.valid) {
      return NextResponse.json({
        error: validation.error || "Precondition not met for this action",
      }, { status: 400 });
    }

    const actionId = crypto.randomUUID();
    await storage.db.insert(signalActions).values({
      id: actionId,
      signalId,
      advisorId,
      actionType: action_type,
      actionTimestamp: new Date(),
      actionStatus: "pending",
      actionResult: null,
    });

    let result: { success: boolean; error?: string; [key: string]: unknown };
    try {
      result = await handler.execute(signal, advisorId);
    } catch (err) {
      logger.error({ err, action_type, signalId }, "Signal action handler error");
      result = {
        success: false,
        error: "Failed to initiate workflow. Try again.",
      };
    }

    await storage.db
      .update(signalActions)
      .set({
        actionStatus: result.success ? "success" : "failed",
        actionResult: result,
        updatedAt: new Date(),
      })
      .where(eq(signalActions.id, actionId));

    if (result.success) {
      const currentHistory = (signal.actionHistory as Array<Record<string, unknown>>) || [];
      currentHistory.push({
        action_type,
        timestamp: new Date().toISOString(),
        status: "success",
        result,
      });

      await storage.db
        .update(detectedSignals)
        .set({
          status: "actioned",
          actionTakenAt: new Date(),
          actionMetadata: result,
          actionHistory: currentHistory,
          updatedAt: new Date(),
        })
        .where(eq(detectedSignals.id, signalId));
    }

    const statusCode = result.success ? 200 : 500;
    return NextResponse.json(result, { status: statusCode });
  } catch (err) {
    logger.error({ err }, "Signal action error");
    return NextResponse.json({ error: "System error processing action" }, { status: 500 });
  }
}
