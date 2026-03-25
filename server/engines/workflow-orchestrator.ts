import { storage } from "../storage";
import { logger } from "../lib/logger";
import { sseEventBus } from "../lib/sse-event-bus";
import type { WorkflowDefinition, WorkflowInstance, WorkflowStepExecution, WorkflowGate } from "@shared/schema";

export interface WorkflowStepDef {
  name: string;
  type: "ai_prompt" | "human_gate" | "side_effect" | "conditional";
  promptId?: string;
  gateConfig?: {
    gateName: string;
    ownerRole: string;
    timeoutHours: number;
    actions: string[];
  };
  branchCondition?: string;
  branchTargetStep?: string;
  executor?: string;
  retryConfig?: {
    maxRetries: number;
    backoffMs: number[];
  };
}

export interface WorkflowGateDef {
  afterStep: number;
  gateName: string;
  ownerRole: string;
  timeoutHours: number;
  actions: string[];
}

export interface WorkflowBranchDef {
  afterStep: number;
  condition: string;
  targetStep: number;
  description: string;
}

export type StepExecutorFn = (
  instance: WorkflowInstance,
  stepDef: WorkflowStepDef,
  previousOutputs: Record<string, any>,
  triggerPayload: Record<string, any>
) => Promise<Record<string, any>>;

const RETRY_BACKOFF_MS = [0, 30000, 300000];

const stepExecutorRegistry: Map<string, StepExecutorFn> = new Map();

export function registerStepExecutor(name: string, fn: StepExecutorFn) {
  stepExecutorRegistry.set(name, fn);
}

export class WorkflowOrchestrator {
  async triggerWorkflow(
    definitionId: string,
    advisorId: string,
    triggerPayload: Record<string, any>,
    options?: { clientId?: string; meetingId?: string }
  ): Promise<WorkflowInstance> {
    const definition = await storage.getWorkflowDefinition_v2(definitionId);
    if (!definition) throw new Error(`Workflow definition not found: ${definitionId}`);
    if (!definition.isActive) throw new Error(`Workflow definition is not active: ${definition.name}`);

    const instance = await storage.createWorkflowInstance({
      definitionId,
      advisorId,
      clientId: options?.clientId || null,
      meetingId: options?.meetingId || null,
      status: "running",
      currentStepIndex: 0,
      triggerPayload,
      context: {},
      startedAt: new Date(),
    });

    logger.info({ instanceId: instance.id, definitionId, advisorId }, "Workflow instance created");

    this.emitEvent(advisorId, "workflow:started", {
      instanceId: instance.id,
      definitionName: definition.name,
      clientId: options?.clientId,
    });

    setImmediate(() => {
      this.executeFromStep(instance.id, 0).catch((err) => {
        logger.error({ err, instanceId: instance.id }, "Workflow execution failed");
      });
    });

    return instance;
  }

  async triggerWorkflowBySlug(
    slug: string,
    advisorId: string,
    triggerPayload: Record<string, any>,
    options?: { clientId?: string; meetingId?: string }
  ): Promise<WorkflowInstance> {
    const definition = await storage.getWorkflowDefinitionBySlug(slug);
    if (!definition) throw new Error(`Workflow definition not found with slug: ${slug}`);
    return this.triggerWorkflow(definition.id, advisorId, triggerPayload, options);
  }

  async executeFromStep(instanceId: string, startStepIndex: number): Promise<void> {
    const instance = await storage.getWorkflowInstance(instanceId);
    if (!instance) throw new Error(`Workflow instance not found: ${instanceId}`);

    if (instance.status === "cancelled" || instance.status === "paused") {
      logger.info({ instanceId, status: instance.status }, "Workflow is stopped, not executing");
      return;
    }

    const definition = await storage.getWorkflowDefinition_v2(instance.definitionId);
    if (!definition) throw new Error(`Workflow definition not found: ${instance.definitionId}`);

    const steps = (definition.steps as WorkflowStepDef[]) || [];
    const gates = (definition.gates as WorkflowGateDef[]) || [];
    const branches = (definition.branches as WorkflowBranchDef[]) || [];
    const previousOutputs = (instance.context as Record<string, any>) || {};

    for (let i = startStepIndex; i < steps.length; i++) {
      const refreshed = await storage.getWorkflowInstance(instanceId);
      if (!refreshed || refreshed.status === "cancelled" || refreshed.status === "paused") {
        logger.info({ instanceId, status: refreshed?.status }, "Workflow stopped during execution");
        return;
      }

      const stepDef = steps[i];

      await storage.updateWorkflowInstance(instanceId, { currentStepIndex: i });

      const gateConfig = gates.find((g) => g.afterStep === i - 1);
      if (gateConfig && i > 0) {
        const shouldPause = await this.handleGateCheck(instanceId, i, gateConfig, instance.advisorId, previousOutputs);
        if (shouldPause) {
          await storage.updateWorkflowInstance(instanceId, { status: "awaiting_gate" });
          this.emitEvent(instance.advisorId, "workflow:gate_waiting", {
            instanceId,
            gateName: gateConfig.gateName,
            stepIndex: i,
          });
          return;
        }
      }

      if (stepDef.type === "human_gate" && stepDef.gateConfig) {
        const shouldPause = await this.handleGateCheck(instanceId, i, stepDef.gateConfig, instance.advisorId, previousOutputs);
        if (shouldPause) {
          await storage.updateWorkflowInstance(instanceId, { status: "awaiting_gate" });
          this.emitEvent(instance.advisorId, "workflow:gate_waiting", {
            instanceId,
            gateName: stepDef.gateConfig.gateName,
            stepIndex: i,
          });
          return;
        }
        continue;
      }

      try {
        const stepOutput = await this.executeStep(instanceId, i, stepDef, previousOutputs, instance);
        previousOutputs[`step_${i}`] = stepOutput;
        previousOutputs[stepDef.name] = stepOutput;

        await storage.updateWorkflowInstance(instanceId, {
          context: previousOutputs,
          currentStepIndex: i + 1,
        });

        this.emitEvent(instance.advisorId, "workflow:step_completed", {
          instanceId,
          stepIndex: i,
          stepName: stepDef.name,
        });

        const branchRule = branches.find((b) => b.afterStep === i);
        if (branchRule) {
          const shouldBranch = this.evaluateBranchCondition(branchRule.condition, previousOutputs);
          if (shouldBranch && branchRule.targetStep !== undefined) {
            logger.info({ instanceId, branchCondition: branchRule.condition, targetStep: branchRule.targetStep }, "Branch condition met");
            await this.executeFromStep(instanceId, branchRule.targetStep);
            return;
          }
        }
      } catch (err: any) {
        logger.error({ err, instanceId, stepIndex: i, stepName: stepDef.name }, "Step execution failed");

        await storage.updateWorkflowInstance(instanceId, {
          status: "failed",
          error: err.message,
        });

        this.emitEvent(instance.advisorId, "workflow:failed", {
          instanceId,
          stepIndex: i,
          stepName: stepDef.name,
          error: err.message,
        });
        return;
      }
    }

    await storage.updateWorkflowInstance(instanceId, {
      status: "completed",
      completedAt: new Date(),
    });

    this.emitEvent(instance.advisorId, "workflow:completed", {
      instanceId,
      definitionId: instance.definitionId,
    });

    logger.info({ instanceId }, "Workflow completed");
  }

  private async executeStep(
    instanceId: string,
    stepIndex: number,
    stepDef: WorkflowStepDef,
    previousOutputs: Record<string, any>,
    instance: WorkflowInstance
  ): Promise<Record<string, any>> {
    const retryConfig = stepDef.retryConfig || { maxRetries: 3, backoffMs: RETRY_BACKOFF_MS };
    let lastError: Error | null = null;

    const stepExec = await storage.createWorkflowStepExecution({
      instanceId,
      stepIndex,
      stepName: stepDef.name,
      stepType: stepDef.type,
      status: "running",
      inputPayload: { previousOutputs: Object.keys(previousOutputs), triggerPayload: instance.triggerPayload },
      maxRetries: retryConfig.maxRetries,
      startedAt: new Date(),
    });

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const backoffMs = retryConfig.backoffMs[Math.min(attempt - 1, retryConfig.backoffMs.length - 1)] || 5000;
          logger.info({ instanceId, stepIndex, attempt, backoffMs }, "Retrying step after backoff");
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }

        const startTime = Date.now();

        const executor = stepDef.executor ? stepExecutorRegistry.get(stepDef.executor) : null;

        let result: Record<string, any>;
        if (executor) {
          result = await executor(instance, stepDef, previousOutputs, instance.triggerPayload as Record<string, any>);
        } else {
          result = { status: "completed", type: stepDef.type, name: stepDef.name };
        }

        const durationMs = Date.now() - startTime;

        await storage.updateWorkflowStepExecution(stepExec.id, {
          status: "completed",
          outputPayload: result,
          durationMs,
          retryCount: attempt,
          completedAt: new Date(),
        });

        return result;
      } catch (err: any) {
        lastError = err;
        await storage.updateWorkflowStepExecution(stepExec.id, {
          retryCount: attempt + 1,
          error: err.message,
        });
        logger.warn({ instanceId, stepIndex, attempt, error: err.message }, "Step attempt failed");
      }
    }

    await storage.updateWorkflowStepExecution(stepExec.id, {
      status: "failed",
      error: lastError?.message || "Unknown error",
      completedAt: new Date(),
    });

    throw lastError || new Error("Step failed after all retries");
  }

  private async handleGateCheck(
    instanceId: string,
    stepIndex: number,
    gateConfig: { gateName: string; ownerRole: string; timeoutHours: number; actions: string[] },
    advisorId: string,
    previousOutputs: Record<string, any>
  ): Promise<boolean> {
    const existingGates = await storage.getWorkflowGatesByInstance(instanceId);
    const existingGate = existingGates.find(
      (g) => g.gateName === gateConfig.gateName && g.status !== "rejected"
    );

    if (existingGate) {
      if (existingGate.status === "approved") {
        return false;
      }
      if (existingGate.status === "pending") {
        return true;
      }
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + gateConfig.timeoutHours);

    const stepExecs = await storage.getWorkflowStepExecutions(instanceId);
    const latestStepExec = stepExecs.find((s) => s.stepIndex === stepIndex - 1);

    await storage.createWorkflowGate({
      instanceId,
      stepExecutionId: latestStepExec?.id || null,
      gateName: gateConfig.gateName,
      gateType: "approval",
      ownerId: advisorId,
      ownerRole: gateConfig.ownerRole,
      status: "pending",
      timeoutHours: gateConfig.timeoutHours,
      payload: {
        actions: gateConfig.actions,
        stepIndex,
        previousOutputs: Object.keys(previousOutputs),
      },
      expiresAt,
    });

    this.emitEvent(advisorId, "workflow:gate_created", {
      instanceId,
      gateName: gateConfig.gateName,
      expiresAt: expiresAt.toISOString(),
    });

    return true;
  }

  async resolveGate(
    gateId: string,
    decision: "approved" | "rejected" | "request_changes",
    decisionNote?: string
  ): Promise<void> {
    const gate = await storage.getWorkflowGate(gateId);
    if (!gate) throw new Error(`Gate not found: ${gateId}`);
    if (gate.status !== "pending") throw new Error(`Gate is not pending: ${gate.status}`);

    await storage.updateWorkflowGate(gateId, {
      status: decision,
      decision,
      decisionNote: decisionNote || null,
      decidedAt: new Date(),
    });

    const instance = await storage.getWorkflowInstance(gate.instanceId);
    if (!instance) throw new Error(`Workflow instance not found: ${gate.instanceId}`);

    this.emitEvent(instance.advisorId, "workflow:gate_resolved", {
      instanceId: gate.instanceId,
      gateId,
      gateName: gate.gateName,
      decision,
    });

    if (decision === "approved") {
      await storage.updateWorkflowInstance(gate.instanceId, { status: "running" });
      const payload = gate.payload as Record<string, any>;
      const resumeStepIndex = payload?.stepIndex || instance.currentStepIndex;

      setImmediate(() => {
        this.executeFromStep(gate.instanceId, resumeStepIndex).catch((err) => {
          logger.error({ err, instanceId: gate.instanceId }, "Workflow resume after gate failed");
        });
      });
    } else if (decision === "rejected") {
      await storage.updateWorkflowInstance(gate.instanceId, {
        status: "cancelled",
        cancelledAt: new Date(),
        error: `Gate "${gate.gateName}" was rejected: ${decisionNote || "No reason provided"}`,
      });
    } else if (decision === "request_changes") {
      const payload = gate.payload as Record<string, any>;
      const gateStepIndex = payload?.stepIndex ?? instance.currentStepIndex;
      const rewindTarget = Math.max(0, gateStepIndex - 1);

      await storage.updateWorkflowGate(gate.id, {
        status: "pending",
        decision: null,
        decisionNote: decisionNote || null,
        decidedAt: null,
      });

      await storage.updateWorkflowInstance(gate.instanceId, {
        status: "running",
        currentStepIndex: rewindTarget,
      });

      logger.info({ instanceId: gate.instanceId, rewindTarget, gateName: gate.gateName }, "Gate requested changes, rewinding workflow");

      setImmediate(() => {
        this.executeFromStep(gate.instanceId, rewindTarget).catch((err) => {
          logger.error({ err, instanceId: gate.instanceId }, "Workflow rewind after request_changes failed");
        });
      });
    }
  }

  async cancelWorkflow(instanceId: string): Promise<WorkflowInstance> {
    const instance = await storage.getWorkflowInstance(instanceId);
    if (!instance) throw new Error(`Workflow instance not found: ${instanceId}`);

    const updated = await storage.updateWorkflowInstance(instanceId, {
      status: "cancelled",
      cancelledAt: new Date(),
    });

    this.emitEvent(instance.advisorId, "workflow:cancelled", { instanceId });

    return updated!;
  }

  async pauseWorkflow(instanceId: string): Promise<WorkflowInstance> {
    const instance = await storage.getWorkflowInstance(instanceId);
    if (!instance) throw new Error(`Workflow instance not found: ${instanceId}`);

    const updated = await storage.updateWorkflowInstance(instanceId, {
      status: "paused",
      pausedAt: new Date(),
    });

    this.emitEvent(instance.advisorId, "workflow:paused", { instanceId });

    return updated!;
  }

  async resumeWorkflow(instanceId: string): Promise<WorkflowInstance> {
    const instance = await storage.getWorkflowInstance(instanceId);
    if (!instance) throw new Error(`Workflow instance not found: ${instanceId}`);
    if (instance.status !== "paused") throw new Error(`Workflow is not paused: ${instance.status}`);

    const updated = await storage.updateWorkflowInstance(instanceId, {
      status: "running",
      pausedAt: null,
    });

    setImmediate(() => {
      this.executeFromStep(instanceId, instance.currentStepIndex).catch((err) => {
        logger.error({ err, instanceId }, "Workflow resume failed");
      });
    });

    this.emitEvent(instance.advisorId, "workflow:resumed", { instanceId });

    return updated!;
  }

  async checkOverdueGates(): Promise<number> {
    const overdueGates = await storage.getOverdueWorkflowGates();
    let escalated = 0;

    for (const gate of overdueGates) {
      const newLevel = gate.escalationLevel + 1;
      await storage.updateWorkflowGate(gate.id, {
        escalationLevel: newLevel,
        escalatedAt: new Date(),
        expiresAt: new Date(Date.now() + gate.timeoutHours * 60 * 60 * 1000),
      });

      const instance = await storage.getWorkflowInstance(gate.instanceId);
      if (instance) {
        this.emitEvent(instance.advisorId, "workflow:gate_escalated", {
          instanceId: gate.instanceId,
          gateId: gate.id,
          gateName: gate.gateName,
          escalationLevel: newLevel,
        });
      }

      escalated++;
    }

    if (escalated > 0) {
      logger.info({ escalated }, "Escalated overdue workflow gates");
    }

    return escalated;
  }

  private evaluateBranchCondition(condition: string, context: Record<string, any>): boolean {
    try {
      if (condition.includes("sentiment") && (condition.includes("critical") || condition.includes("behavioralRiskScore"))) {
        const sentimentStep = context["sentiment_analysis"];
        if (sentimentStep?.anxietyLevel === "critical" || sentimentStep?.behavioralRiskScore > 70) {
          return true;
        }
      }

      if (condition.includes("life_event")) {
        const actionStep = context["action_items"];
        if (actionStep?.lifeEventsDetected?.length > 0 || actionStep?.hasLifeEventTrigger === true) {
          return true;
        }
      }

      return false;
    } catch (err) {
      logger.warn({ condition, error: (err as Error).message }, "Branch condition evaluation failed");
      return false;
    }
  }

  private emitEvent(advisorId: string, eventType: string, data: Record<string, any>) {
    try {
      sseEventBus.publishToUser(advisorId, eventType as any, data);
    } catch (err) {
      logger.warn({ err, eventType }, "Failed to emit workflow SSE event");
    }
  }
}

export const workflowOrchestrator = new WorkflowOrchestrator();
