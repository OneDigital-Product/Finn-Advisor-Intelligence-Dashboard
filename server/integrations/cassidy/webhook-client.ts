import { generateSignature } from "./signature-verifier";
import { logger } from "../../lib/logger";

export interface CassidyWebhookResponse {
  status: string;
  cassidy_request_id: string;
  message?: string;
  error?: string;
}

export interface SubAgentRouterResponse {
  finResponse: string;
  calledMode: string;
  source: string;
  fin_response?: string;
  called_mode?: string;
  suggested_prompts?: string[];
  [key: string]: unknown;
}

export async function callCassidyWorkflow(
  payload: Record<string, any>,
  apiKey: string,
  webhookUrl: string
): Promise<CassidyWebhookResponse> {
  const body = JSON.stringify(payload);
  const bodyBuffer = Buffer.from(body);
  const signature = generateSignature(bodyBuffer, apiKey);
  const delays = [2000, 4000, 8000];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      logger.info({ attempt: attempt + 1, jobId: payload.job_id }, "Calling Cassidy webhook");

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Cassidy-Signature": signature,
          "X-Request-ID": payload.job_id || "",
          "User-Agent": "AdvisorIntelligenceSuite/1.0",
        },
        body,
      });

      if (response.ok) {
        const result = await response.json() as CassidyWebhookResponse;
        logger.info({ jobId: payload.job_id, cassidyRequestId: result.cassidy_request_id }, "Cassidy webhook success");
        return result;
      }

      if (response.status < 500 && response.status !== 408) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Cassidy returned ${response.status}: ${errorText}`);
      }

      logger.warn({ attempt: attempt + 1, status: response.status, jobId: payload.job_id }, "Cassidy webhook retryable error");
    } catch (err) {
      if (attempt < 2) {
        logger.warn({ attempt: attempt + 1, err, jobId: payload.job_id }, "Cassidy webhook attempt failed, retrying");
        await new Promise((r) => setTimeout(r, delays[attempt]));
      } else {
        logger.error({ err, jobId: payload.job_id }, "Cassidy webhook all attempts exhausted");
        throw err;
      }
    }
  }

  throw new Error("Cassidy webhook: all retry attempts exhausted");
}

export async function callSubAgentRouter(
  payload: Record<string, any>,
  apiKey: string,
  webhookUrl: string
): Promise<SubAgentRouterResponse> {
  const body = JSON.stringify(payload);
  const bodyBuffer = Buffer.from(body);
  const signature = generateSignature(bodyBuffer, apiKey);
  const delays = [2000, 4000, 8000];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      logger.info({ attempt: attempt + 1, jobId: payload.job_id, mode: payload.selected_mode }, "Calling Cassidy sub-agent router");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Cassidy-Signature": signature,
            "X-Request-ID": payload.job_id || "",
            "User-Agent": "AdvisorIntelligenceSuite/1.0",
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json() as SubAgentRouterResponse;
          logger.info({ jobId: payload.job_id, calledMode: result.calledMode || result.called_mode }, "Sub-agent router success");
          return result;
        }

        if (response.status < 500 && response.status !== 408) {
          const errorText = await response.text().catch(() => "Unknown error");
          throw new Error(`Sub-agent router returned ${response.status}: ${errorText}`);
        }

        logger.warn({ attempt: attempt + 1, status: response.status, jobId: payload.job_id }, "Sub-agent router retryable error");
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } catch (err) {
      if (attempt < 2) {
        logger.warn({ attempt: attempt + 1, err, jobId: payload.job_id }, "Sub-agent router attempt failed, retrying");
        await new Promise((r) => setTimeout(r, delays[attempt]));
      } else {
        logger.error({ err, jobId: payload.job_id }, "Sub-agent router all attempts exhausted");
        throw err;
      }
    }
  }

  throw new Error("Sub-agent router: all retry attempts exhausted");
}
