import { db } from "../db";
import { logger } from "../lib/logger";
import { clients, accounts } from "@shared/schema";
import { eq, and, ilike, sql } from "drizzle-orm";

interface NormalizedPayload {
  accountNumber?: string;
  custodian?: string;
  clientName?: string;
  changeType?: string;
  amount?: number;
  description?: string;
  effectiveDate?: string;
  [key: string]: unknown;
}

interface MatchResult {
  matchedClientId: string | null;
  matchedAccountId: string | null;
  confidence: "high" | "medium" | "low" | "none";
}

const SCHWAB_FIELD_MAP: Record<string, string> = {
  acct_num: "accountNumber",
  account_number: "accountNumber",
  acct_no: "accountNumber",
  client_name: "clientName",
  account_name: "clientName",
  custodian_code: "custodian",
  txn_type: "changeType",
  transaction_type: "changeType",
  txn_amount: "amount",
  transaction_amount: "amount",
  txn_date: "effectiveDate",
  effective_date: "effectiveDate",
  desc: "description",
  memo: "description",
};

const FIDELITY_FIELD_MAP: Record<string, string> = {
  AccountNumber: "accountNumber",
  account_id: "accountNumber",
  AccountName: "clientName",
  investor_name: "clientName",
  Custodian: "custodian",
  TransactionType: "changeType",
  action_type: "changeType",
  Amount: "amount",
  TransactionDate: "effectiveDate",
  trade_date: "effectiveDate",
  Description: "description",
  narrative: "description",
};

const PERSHING_FIELD_MAP: Record<string, string> = {
  ACCT_NBR: "accountNumber",
  account_nbr: "accountNumber",
  ACCT_NAME: "clientName",
  registered_name: "clientName",
  CUST: "custodian",
  TXN_CD: "changeType",
  activity_code: "changeType",
  AMT: "amount",
  settle_amount: "amount",
  SETTLE_DT: "effectiveDate",
  process_date: "effectiveDate",
  DESC: "description",
  activity_desc: "description",
};

const SOURCE_FIELD_MAPS: Record<string, Record<string, string>> = {
  schwab: SCHWAB_FIELD_MAP,
  fidelity: FIDELITY_FIELD_MAP,
  pershing: PERSHING_FIELD_MAP,
};

export function normalizeCustodialPayload(source: string, rawPayload: Record<string, unknown>): NormalizedPayload {
  const fieldMap = SOURCE_FIELD_MAPS[source.toLowerCase()] || {};
  const normalized: NormalizedPayload = {};

  for (const [rawKey, rawValue] of Object.entries(rawPayload)) {
    const normalizedKey = fieldMap[rawKey] || rawKey;
    if (normalizedKey === "amount" && rawValue != null) {
      normalized[normalizedKey] = typeof rawValue === "string" ? parseFloat(rawValue) : Number(rawValue);
    } else {
      normalized[normalizedKey] = rawValue;
    }
  }

  if (!normalized.custodian) {
    normalized.custodian = source.toLowerCase();
  }

  return normalized;
}

export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(s1, s2);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export async function matchCustodialChange(
  source: string,
  normalizedPayload: NormalizedPayload
): Promise<MatchResult> {
  const { accountNumber, custodian, clientName } = normalizedPayload;

  if (accountNumber && custodian) {
    const exactMatch = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.accountNumber, accountNumber),
          ilike(accounts.custodian, custodian)
        )
      )
      .limit(1);

    if (exactMatch.length > 0) {
      logger.info({ source, accountNumber, custodian }, "Exact account+custodian match found");
      return {
        matchedClientId: exactMatch[0].clientId,
        matchedAccountId: exactMatch[0].id,
        confidence: "high",
      };
    }
  }

  if (clientName) {
    const nameParts = clientName.trim().split(/\s+/);
    let nameMatchAccounts: Array<typeof accounts.$inferSelect & { clientFirstName?: string; clientLastName?: string }> = [];

    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];

      const matchedClients = await db
        .select()
        .from(clients)
        .where(
          and(
            ilike(clients.firstName, `%${firstName}%`),
            ilike(clients.lastName, `%${lastName}%`)
          )
        )
        .limit(5);

      if (matchedClients.length > 0) {
        for (const client of matchedClients) {
          const clientAccounts = await db
            .select()
            .from(accounts)
            .where(eq(accounts.clientId, client.id));

          if (accountNumber) {
            const acctMatch = clientAccounts.find((a) => a.accountNumber === accountNumber);
            if (acctMatch) {
              logger.info({ source, clientName, accountNumber }, "Name + account number match found");
              return {
                matchedClientId: client.id,
                matchedAccountId: acctMatch.id,
                confidence: "high",
              };
            }
          }

          if (clientAccounts.length > 0) {
            nameMatchAccounts.push(
              ...clientAccounts.map((a) => ({
                ...a,
                clientFirstName: client.firstName,
                clientLastName: client.lastName,
              }))
            );
          }
        }

        if (nameMatchAccounts.length === 1) {
          return {
            matchedClientId: nameMatchAccounts[0].clientId,
            matchedAccountId: nameMatchAccounts[0].id,
            confidence: "medium",
          };
        }

        if (nameMatchAccounts.length > 1 && accountNumber) {
          const bestMatch = nameMatchAccounts.find((a) =>
            a.accountNumber.startsWith(accountNumber.substring(0, 4))
          );
          if (bestMatch) {
            return {
              matchedClientId: bestMatch.clientId,
              matchedAccountId: bestMatch.id,
              confidence: "medium",
            };
          }
        }

        if (nameMatchAccounts.length > 0) {
          return {
            matchedClientId: nameMatchAccounts[0].clientId,
            matchedAccountId: null,
            confidence: "low",
          };
        }
      }
    }
  }

  if (accountNumber) {
    const prefix = accountNumber.substring(0, Math.min(6, accountNumber.length));
    const fuzzyResults = await db
      .select()
      .from(accounts)
      .where(sql`${accounts.accountNumber} LIKE ${prefix + "%"}`)
      .limit(10);

    if (fuzzyResults.length === 1) {
      logger.info({ source, accountNumber, prefix }, "Fuzzy account prefix match found");
      return {
        matchedClientId: fuzzyResults[0].clientId,
        matchedAccountId: fuzzyResults[0].id,
        confidence: "low",
      };
    }

    if (fuzzyResults.length > 1) {
      let bestMatch = fuzzyResults[0];
      let bestSimilarity = 0;
      for (const result of fuzzyResults) {
        const sim = calculateSimilarity(accountNumber, result.accountNumber);
        if (sim > bestSimilarity) {
          bestSimilarity = sim;
          bestMatch = result;
        }
      }
      if (bestSimilarity >= 0.7) {
        logger.info({ source, accountNumber, similarity: bestSimilarity }, "Levenshtein fuzzy account match found");
        return {
          matchedClientId: bestMatch.clientId,
          matchedAccountId: bestMatch.id,
          confidence: bestSimilarity >= 0.9 ? "medium" : "low",
        };
      }
    }
  }

  logger.info({ source, normalizedPayload }, "No custodial match found");
  return {
    matchedClientId: null,
    matchedAccountId: null,
    confidence: "none",
  };
}
