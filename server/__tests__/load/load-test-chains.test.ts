import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

const PARALLEL_CHAINS = 10;
const MAX_CHAIN_DEPTH = 10;
const PER_AGENT_TIMEOUT_MS = 120000;

const chainStepsStore = new Map<string, any[]>();

vi.mock("../../storage", () => {
  const mockDb = {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation((condition: any) => ({
          orderBy: vi.fn().mockImplementation(() => {
            const condStr = String(condition);
            for (const [jobId, steps] of chainStepsStore.entries()) {
              if (condStr.includes(jobId) || steps.length > 0) {
                const matching = steps.filter(() => true);
                return matching.sort((a: any, b: any) => a.chainPosition - b.chainPosition);
              }
            }
            return [];
          }),
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    })),
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((val: any) => {
        if (val.jobId && val.chainPosition !== undefined) {
          if (!chainStepsStore.has(val.jobId)) {
            chainStepsStore.set(val.jobId, []);
          }
          const step = { ...val, id: crypto.randomUUID() };
          chainStepsStore.get(val.jobId)!.push(step);
        }
        return Promise.resolve([]);
      }),
    })),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation((updates: any) => ({
        where: vi.fn().mockImplementation((condition: any) => {
          for (const [, steps] of chainStepsStore) {
            for (const step of steps) {
              const condStr = String(condition);
              if (condStr.includes(step.id)) {
                Object.assign(step, updates);
              }
            }
          }
          return Promise.resolve(undefined);
        }),
      })),
    })),
  };

  return {
    storage: { db: mockDb },
  };
});

vi.mock("../../integrations/cassidy/chain-context-builder", () => ({
  buildChainPrompt: vi.fn().mockResolvedValue({
    previousAgentOutput: "mock previous output",
    originalRequest: "mock request",
  }),
  injectContextIntoPrompt: vi.fn((prompt: string) => prompt),
}));

const mockCallCassidy = vi.fn().mockImplementation(async (payload: any) => {
  const delay = Math.floor(Math.random() * 50) + 10;
  await new Promise((r) => setTimeout(r, delay));
  return {
    status: "accepted",
    cassidy_request_id: `mock-${payload.job_id}`,
    finResponse: `Response for ${payload.job_id}`,
  };
});

vi.mock("../../integrations/cassidy/webhook-client", () => ({
  callCassidyWorkflow: mockCallCassidy,
}));

vi.mock("../../integrations/cassidy/audit-logger", () => ({
  AuditLogger: { logEvent: vi.fn().mockResolvedValue(undefined) },
  AuditEventType: {
    REQUEST_SENT: "request_sent",
    CALLBACK_RECEIVED: "callback_received",
    RESULT_RENDERED: "result_rendered",
    AGENT_RESPONDED: "agent_responded",
  },
}));

const publishedUpdates: any[] = [];

vi.mock("../../integrations/cassidy/event-bus", () => ({
  jobEventBus: {
    publishJobUpdate: vi.fn((update: any) => { publishedUpdates.push(update); }),
    subscribeToJob: vi.fn().mockReturnValue(() => {}),
    getSubscriberCount: vi.fn().mockReturnValue(0),
    getActiveJobs: vi.fn().mockReturnValue([]),
  },
}));

vi.mock("../../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

interface ChainExecutionResult {
  chainId: string;
  agentCount: number;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  completed: boolean;
  error?: string;
}

describe("Load Test: Chain Execution Concurrency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainStepsStore.clear();
    publishedUpdates.length = 0;
    mockCallCassidy.mockClear();
    process.env.CASSIDY_API_KEY = "test-api-key";
    process.env.CASSIDY_WEBHOOK_URL = "https://mock-cassidy.test/webhook";
    process.env.CALLBACK_BASE_URL = "https://mock-callback.test";
  });

  afterEach(() => {
    delete process.env.CASSIDY_API_KEY;
    delete process.env.CASSIDY_WEBHOOK_URL;
    delete process.env.CALLBACK_BASE_URL;
    vi.restoreAllMocks();
  });

  it(`should execute ${PARALLEL_CHAINS} multi-agent chains in parallel`, async () => {
    const { executeChain } = await import("../../integrations/cassidy/chain-executor");
    const results: ChainExecutionResult[] = [];

    const chainConfigs = Array.from({ length: PARALLEL_CHAINS }, (_, i) => {
      const agentCount = Math.min(3 + (i % 4), MAX_CHAIN_DEPTH);
      return {
        jobId: crypto.randomUUID(),
        advisorId: `advisor-${i}`,
        clientId: `client-${i}`,
        householdId: `household-${i}`,
        originalRequest: `Analyze portfolio for client ${i} with comprehensive review`,
        originalConversationId: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        secondaryAgents: Array.from({ length: agentCount }, (_, j) => ({
          agentName: `agent_${j + 1}_chain_${i}`,
          agentPrompt: `Process step ${j + 1} for chain ${i}: analyze and provide recommendations`,
        })),
      };
    });

    const totalExpectedAgents = chainConfigs.reduce((s, c) => s + c.secondaryAgents.length, 0);
    const overallStart = Date.now();

    const chainPromises = chainConfigs.map(async (config) => {
      const startTime = Date.now();
      try {
        await executeChain(config);
        const endTime = Date.now();
        results.push({
          chainId: config.jobId,
          agentCount: config.secondaryAgents.length,
          startTimeMs: startTime - overallStart,
          endTimeMs: endTime - overallStart,
          durationMs: endTime - startTime,
          completed: true,
        });
      } catch (err) {
        const endTime = Date.now();
        results.push({
          chainId: config.jobId,
          agentCount: config.secondaryAgents.length,
          startTimeMs: startTime - overallStart,
          endTimeMs: endTime - overallStart,
          durationMs: endTime - startTime,
          completed: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    await Promise.all(chainPromises);
    const overallDuration = Date.now() - overallStart;

    const completedChains = results.filter((r) => r.completed);
    const failedChains = results.filter((r) => !r.completed);
    const durations = results.map((r) => r.durationMs).sort((a, b) => a - b);
    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const totalAgents = results.reduce((sum, r) => sum + r.agentCount, 0);
    const webhookCallCount = mockCallCassidy.mock.calls.length;

    const chainCompleteEvents = publishedUpdates.filter((u) => u.type === "chain_complete");
    const stepUpdateEvents = publishedUpdates.filter((u) => u.type === "chain_step_update");

    console.log("\n========================================");
    console.log("LOAD TEST RESULTS: Chain Execution Concurrency");
    console.log("========================================");
    console.log(`Parallel Chains:       ${PARALLEL_CHAINS}`);
    console.log(`Completed:             ${completedChains.length}`);
    console.log(`Failed:                ${failedChains.length}`);
    console.log(`Total Agents Expected: ${totalExpectedAgents}`);
    console.log(`Webhook Calls Made:    ${webhookCallCount}`);
    console.log(`Chain Complete Events: ${chainCompleteEvents.length}`);
    console.log(`Step Update Events:    ${stepUpdateEvents.length}`);
    console.log(`Overall Duration:      ${overallDuration}ms`);
    console.log(`Avg Chain Duration:    ${avgDuration}ms`);
    console.log(`Min Chain Duration:    ${durations[0]}ms`);
    console.log(`Max Chain Duration:    ${durations[durations.length - 1]}ms`);
    console.log(`Chains/sec:            ${Math.round((PARALLEL_CHAINS / overallDuration) * 1000 * 100) / 100}`);
    console.log(`Agents/sec:            ${Math.round((totalAgents / overallDuration) * 1000 * 100) / 100}`);
    if (failedChains.length > 0) {
      console.log(`Failed Chain Errors:`);
      for (const f of failedChains.slice(0, 5)) {
        console.log(`  - ${f.chainId}: ${f.error}`);
      }
    }
    console.log("\nPer-Chain Breakdown:");
    for (const r of results) {
      console.log(`  Chain ${r.chainId.slice(0, 8)}: ${r.agentCount} agents, ${r.durationMs}ms, ${r.completed ? "OK" : "FAIL"}`);
    }
    console.log("========================================\n");

    expect(completedChains.length).toBeGreaterThanOrEqual(PARALLEL_CHAINS * 0.8);
    expect(chainCompleteEvents.length).toBe(completedChains.length);
    for (const r of completedChains) {
      expect(r.durationMs).toBeLessThan(PER_AGENT_TIMEOUT_MS * r.agentCount);
    }
  }, 120000);

  it("should enforce MAX_CHAIN_DEPTH correctly under concurrent load", async () => {
    const { executeChain, MAX_CHAIN_DEPTH: actualMax } = await import(
      "../../integrations/cassidy/chain-executor"
    );

    const oversizedChains = Array.from({ length: 5 }, (_, i) => ({
      jobId: crypto.randomUUID(),
      advisorId: `advisor-oversized-${i}`,
      clientId: `client-oversized-${i}`,
      householdId: `household-oversized-${i}`,
      originalRequest: `Oversized chain test ${i}`,
      secondaryAgents: Array.from({ length: actualMax + 5 }, (_, j) => ({
        agentName: `oversized_agent_${j}`,
        agentPrompt: `Oversized step ${j}`,
      })),
    }));

    const callCountBefore = mockCallCassidy.mock.calls.length;

    await Promise.all(oversizedChains.map((config) => executeChain(config)));

    const callCountAfter = mockCallCassidy.mock.calls.length;
    const chainErrorEvents = publishedUpdates.filter((u) => u.type === "chain_error");

    console.log("\n========================================");
    console.log("CHAIN DEPTH LIMIT TEST RESULTS");
    console.log("========================================");
    console.log(`MAX_CHAIN_DEPTH:       ${actualMax}`);
    console.log(`Oversized Chains:      ${oversizedChains.length}`);
    console.log(`Correctly Rejected:    ${chainErrorEvents.length}`);
    console.log(`Webhook Calls (should be 0): ${callCountAfter - callCountBefore}`);
    console.log("========================================\n");

    expect(chainErrorEvents.length).toBe(oversizedChains.length);
    expect(callCountAfter - callCountBefore).toBe(0);
  }, 30000);

  it("should measure memory usage during concurrent chain execution", async () => {
    const { executeChain } = await import("../../integrations/cassidy/chain-executor");

    const memBefore = process.memoryUsage();

    const configs = Array.from({ length: PARALLEL_CHAINS }, (_, i) => ({
      jobId: crypto.randomUUID(),
      advisorId: `advisor-mem-${i}`,
      clientId: `client-mem-${i}`,
      householdId: `household-mem-${i}`,
      originalRequest: `Memory test chain ${i}`,
      secondaryAgents: Array.from({ length: 5 }, (_, j) => ({
        agentName: `mem_agent_${j}_chain_${i}`,
        agentPrompt: `Memory test step ${j} for chain ${i}`,
      })),
    }));

    await Promise.all(configs.map((c) => executeChain(c)));

    const memAfter = process.memoryUsage();
    const heapDeltaMB = Math.round(
      (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024 * 100
    ) / 100;
    const rssDeltaMB = Math.round(
      (memAfter.rss - memBefore.rss) / 1024 / 1024 * 100
    ) / 100;

    console.log("\n========================================");
    console.log("MEMORY USAGE TEST RESULTS");
    console.log("========================================");
    console.log(`Chains Executed:       ${PARALLEL_CHAINS}`);
    console.log(`Total Agents:          ${configs.reduce((s, c) => s + c.secondaryAgents.length, 0)}`);
    console.log(`Heap Before:           ${Math.round(memBefore.heapUsed / 1024 / 1024)}MB`);
    console.log(`Heap After:            ${Math.round(memAfter.heapUsed / 1024 / 1024)}MB`);
    console.log(`Heap Delta:            ${heapDeltaMB}MB`);
    console.log(`RSS Delta:             ${rssDeltaMB}MB`);
    console.log("========================================\n");

    expect(heapDeltaMB).toBeLessThan(100);
  }, 120000);
});
