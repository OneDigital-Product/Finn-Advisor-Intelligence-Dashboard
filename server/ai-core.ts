import { generateText } from "ai";
import { createGateway } from "@ai-sdk/gateway";
import OpenAI from "openai";
import { logger } from "./lib/logger";
import { chat as cassidyChat, isCassidyAvailable } from "./lib/cassidy";
import { applyFiduciaryGuardrails } from "./lib/fiduciary-guardrail";

export interface HoldingData {
  ticker: string;
  name: string;
  shares: string;
  marketValue: string;
  costBasis: string | null;
  unrealizedGainLoss: string | null;
  weight: string | null;
  sector: string | null;
}

export interface PerformanceData {
  period: string;
  returnPct: string;
  benchmarkPct: string | null;
}

export interface TaskData {
  title: string;
  priority: string;
  dueDate: string | null;
  status: string;
}

export interface LifeEventData {
  eventDate: string;
  description: string;
}

export interface ComplianceItemData {
  type: string;
  status: string;
  dueDate: string | null;
}

export interface MeetingData {
  startTime: string;
  notes: string | null;
}

export interface ClientInfoData {
  firstName: string;
  lastName: string;
  email: string | null;
  riskTolerance: string | null;
  interests: string | null;
  [key: string]: unknown;
}

export interface MeetingPrepInput {
  clientName: string;
  clientInfo: ClientInfoData;
  holdings: HoldingData[];
  performance: PerformanceData[];
  recentMeetings: MeetingData[];
  tasks: TaskData[];
  lifeEvents: LifeEventData[];
  complianceItems: ComplianceItemData[];
}

export interface MeetingSummaryInput {
  clientName: string;
  clientInfo: ClientInfoData;
  meetingTitle: string;
  meetingType: string;
  meetingDate: string;
  meetingNotes: string;
  holdings: HoldingData[];
  performance: PerformanceData[];
  tasks: TaskData[];
  lifeEvents: LifeEventData[];
}

export interface TalkingPointsInput {
  clientName: string;
  clientInfo: ClientInfoData;
  holdings: HoldingData[];
}

export interface BehavioralContext {
  anxietyLevel: string;
  dominantBias: string | null;
  recentSentiment: string;
  behavioralRiskScore: number;
}

export interface ChatCompletionMeta {
  output: string;
  guardrailFlagged: boolean;
  guardrailViolations: Array<{ ruleId: string; description: string; severity: "block" | "flag" }>;
}

const GATEWAY_MODEL = "openai/gpt-4o";
const OPENAI_MODEL = "gpt-4o";

let gatewayInstance: ReturnType<typeof createGateway> | null = null;

function getGateway() {
  const key = resolveGatewayKey();
  if (!key) return null;
  if (!gatewayInstance) {
    gatewayInstance = createGateway({ apiKey: key });
  }
  return gatewayInstance;
}

let openai: OpenAI | null = null;

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.startsWith("vck_")) return null;
  if (!openai) {
    openai = new OpenAI({ apiKey: key, timeout: 30_000 });
  }
  return openai;
}

function resolveGatewayKey(): string | undefined {
  if (process.env.AI_GATEWAY_API_KEY) return process.env.AI_GATEWAY_API_KEY;
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith("vck_")) return process.env.OPENAI_API_KEY;
  return undefined;
}

function isGatewayAvailable(): boolean {
  return !!resolveGatewayKey();
}

export function isAIAvailable(): boolean {
  return isCassidyAvailable() || isGatewayAvailable() || !!process.env.OPENAI_API_KEY;
}

export function sanitizeForPrompt(input: string, maxLength = 50000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\$\{.*?\}/g, '')
    .replace(new RegExp("<!--.*?-->", "gs"), '')
    .replace(/```(?:system|assistant|user|prompt|instruction)\b/gi, '```')
    .replace(/\b(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|prompts?|rules?|context)\b/gi, '[filtered]')
    .replace(/\b(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be|switch\s+to|new\s+instruction)\b/gi, '[filtered]')
    .replace(/\[SYSTEM\]|\[INST\]|\[\/INST\]|<\|(?:im_start|im_end|system|user|assistant)\|>/gi, '[filtered]')
    .substring(0, maxLength);
}

export function sanitizeObjectStrings<T>(obj: T, maxLength = 2000): T {
  if (typeof obj === 'string') return sanitizeForPrompt(obj, maxLength) as unknown as T;
  if (Array.isArray(obj)) return obj.map(item => sanitizeObjectStrings(item, maxLength)) as unknown as T;
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeObjectStrings(value, maxLength);
    }
    return result as T;
  }
  return obj;
}

function sanitizeUserPrompt(input: string): string {
  return sanitizeForPrompt(input, 50000);
}

async function callGateway(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<string> {
  const gw = getGateway();
  if (!gw) throw new Error("Gateway not available");
  const timeoutMs = maxTokens > 8000 ? 180_000 : 60_000;
  logger.info({ model: GATEWAY_MODEL, maxTokens, timeoutMs }, "Calling Vercel AI Gateway");
  const { text } = await generateText({
    model: gw(GATEWAY_MODEL),
    system: systemPrompt,
    prompt: sanitizeForPrompt(userPrompt, 80000),
    maxTokens,
    abortSignal: AbortSignal.timeout(timeoutMs),
  } as any);
  logger.info({ responseLength: text.length }, "Vercel AI Gateway response received");
  return text;
}

async function callOpenAI(systemPrompt: string, userPrompt: string, maxTokens = 4096): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("OpenAI client not available");
  const timeoutMs = maxTokens > 8000 ? 180_000 : 60_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: sanitizeUserPrompt(userPrompt) },
      ],
      max_completion_tokens: maxTokens,
    }, { signal: controller.signal });
    return response.choices[0].message.content || "";
  } finally {
    clearTimeout(timeout);
  }
}

export async function chatCompletion(systemPrompt: string, userPrompt: string, skipGuardrails = false, maxTokens = 4096): Promise<string> {
  let rawResult: string;

  if (isCassidyAvailable()) {
    try {
      const combinedMessage = `${systemPrompt}\n\n${sanitizeUserPrompt(userPrompt)}`;
      rawResult = await cassidyChat(combinedMessage);
    } catch (cassidyError) {
      logger.warn({ err: cassidyError }, "Cassidy AI failed, attempting fallback");
      if (isGatewayAvailable()) {
        rawResult = await callGateway(systemPrompt, userPrompt, maxTokens);
      } else {
        rawResult = await callOpenAI(systemPrompt, userPrompt, maxTokens);
      }
    }
  } else if (isGatewayAvailable()) {
    rawResult = await callGateway(systemPrompt, userPrompt, maxTokens);
  } else {
    rawResult = await callOpenAI(systemPrompt, userPrompt, maxTokens);
  }

  if (!skipGuardrails) {
    const guardrailResult = applyFiduciaryGuardrails(rawResult!);
    return guardrailResult.output;
  }

  return rawResult!;
}

export async function chatCompletionWithMeta(systemPrompt: string, userPrompt: string): Promise<ChatCompletionMeta> {
  let rawResult: string;

  if (isCassidyAvailable()) {
    try {
      const combinedMessage = `${systemPrompt}\n\n${sanitizeUserPrompt(userPrompt)}`;
      rawResult = await cassidyChat(combinedMessage);
    } catch (cassidyError) {
      logger.warn({ err: cassidyError }, "Cassidy AI failed, attempting fallback");
      if (isGatewayAvailable()) {
        rawResult = await callGateway(systemPrompt, userPrompt);
      } else {
        rawResult = await callOpenAI(systemPrompt, userPrompt);
      }
    }
  } else if (isGatewayAvailable()) {
    rawResult = await callGateway(systemPrompt, userPrompt);
  } else {
    rawResult = await callOpenAI(systemPrompt, userPrompt);
  }

  const guardrailResult = applyFiduciaryGuardrails(rawResult!);
  return {
    output: guardrailResult.output,
    guardrailFlagged: guardrailResult.flagged || !guardrailResult.passed,
    guardrailViolations: guardrailResult.violations.map(v => ({
      ruleId: v.ruleId,
      description: v.description,
      severity: v.severity,
    })),
  };
}

export function buildMeetingPrepContext(data: MeetingPrepInput): Record<string, string> {
  return {
    clientName: data.clientName,
    clientInfo: JSON.stringify(data.clientInfo, null, 2),
    holdings: JSON.stringify(data.holdings.slice(0, 10), null, 2),
    performance: JSON.stringify(data.performance, null, 2),
    recentMeetings: data.recentMeetings.map(m => `${m.startTime}: ${m.notes || 'No notes'}`).join('\n'),
    tasks: data.tasks.map(t => `- ${t.title} (${t.priority}, due: ${t.dueDate})`).join('\n'),
    lifeEvents: data.lifeEvents.map(e => `- ${e.eventDate}: ${e.description}`).join('\n'),
    complianceItems: data.complianceItems.map(c => `- ${c.type}: ${c.status} (due: ${c.dueDate})`).join('\n'),
  };
}

export function sanitizePromptInput(input: string): string {
  return sanitizeForPrompt(input, 2000)
    .replace(/[{}]/g, '');
}

export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  const sanitized = Object.entries(vars).reduce<Record<string, string>>(
    (acc, [key, value]) => ({ ...acc, [key]: sanitizePromptInput(value) }),
    {}
  );
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => sanitized[key] ?? '');
}
