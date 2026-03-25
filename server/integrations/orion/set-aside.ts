import { getOrionClient, isOrionEnabled } from "./client";
import { logger } from "../../lib/logger";

export interface SetAsideRequest {
  accountId: string;
  amount: number;
  reason: string;
  frequency: string;
}

export interface SetAsideResponse {
  setAsideId: string;
  status: string;
}

export interface NwrTagResponse {
  tagId: string;
  status: string;
}

export async function createSetAside(request: SetAsideRequest): Promise<SetAsideResponse> {
  const client = getOrionClient();
  if (!client) {
    logger.warn("[Orion Set-Aside] Orion not enabled, returning mock set-aside");
    return {
      setAsideId: `mock-sa-${Date.now()}`,
      status: "created",
    };
  }

  try {
    const response = await client.post(`/accounts/${request.accountId}/set-asides`, {
      amount: request.amount,
      reason: request.reason,
      frequency: request.frequency,
    });
    return {
      setAsideId: response.data.id || response.data.setAsideId,
      status: response.data.status || "created",
    };
  } catch (err) {
    logger.error({ err }, "[Orion Set-Aside] Failed to create set-aside");
    throw new Error("Failed to create Orion set-aside request");
  }
}

export async function applyNwrTag(accountId: string): Promise<NwrTagResponse> {
  const client = getOrionClient();
  if (!client) {
    logger.warn("[Orion NWR] Orion not enabled, returning mock NWR tag");
    return {
      tagId: `mock-nwr-${Date.now()}`,
      status: "applied",
    };
  }

  try {
    const response = await client.post(`/accounts/${accountId}/tags`, {
      tagType: "NWR",
      description: "No Withdrawal/Rebalance - Pending withdrawal execution",
    });
    return {
      tagId: response.data.id || response.data.tagId,
      status: response.data.status || "applied",
    };
  } catch (err) {
    logger.error({ err }, "[Orion NWR] Failed to apply NWR tag");
    throw new Error("Failed to apply NWR tag");
  }
}

export async function removeNwrTag(accountId: string, tagId: string): Promise<boolean> {
  const client = getOrionClient();
  if (!client) {
    logger.warn("[Orion NWR] Orion not enabled, mock-removing NWR tag");
    return true;
  }

  try {
    await client.delete(`/accounts/${accountId}/tags/${tagId}`);
    return true;
  } catch (err) {
    logger.error({ err }, "[Orion NWR] Failed to remove NWR tag");
    throw new Error("Failed to remove NWR tag");
  }
}

export { isOrionEnabled };
