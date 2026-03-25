/**
 * Client Identity Classification & Resolution (Phases 1–3)
 * ─────────────────────────────────────────────────────────
 *
 * Phase 1: ID format classification + buildIdentityMeta for route responses
 * Phase 2: resolveClientIdentity() — canonical resolver
 * Phase 3: Persistent crosswalk DB access
 *
 * ID Types:
 * - salesforce-household: 15 or 18 alphanumeric chars, no dashes
 * - local-uuid: UUID v4 with dashes
 * - orion-numeric: purely numeric string
 * - unknown: does not match any known format
 *
 * Resolution Order:
 * 1. Format classification (pure, no I/O)
 * 2. Crosswalk table lookup (durable mapping)
 * 3. Enriched clients cache lookup (assistive/bootstrap only)
 * 4. Local DB client lookup (for UUID inputs)
 * 5. Honest unresolved status
 */

import { db } from "../db";
import { eq } from "drizzle-orm";
import { clientIdentityCrosswalk, clients } from "@shared/schema";
import { logger } from "./logger";

// ─────────────────────────────────────────────────────────────────────────
// Phase 1: Types & Classification (unchanged)
// ─────────────────────────────────────────────────────────────────────────

export type ClientIdType =
  | "salesforce-household"
  | "local-uuid"
  | "orion-numeric"
  | "unknown";

// Salesforce IDs: exactly 15 or 18 alphanumeric characters, no dashes
const SF_ID_RE = /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/;

// UUID v4: 8-4-4-4-12 hex with dashes
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Orion IDs: purely numeric
const NUMERIC_RE = /^\d+$/;

/**
 * Classify a client ID by its format.
 * Pure format check — does NOT verify the ID exists in any system.
 */
export function classifyClientId(id: string): ClientIdType {
  if (!id || typeof id !== "string") return "unknown";
  if (UUID_RE.test(id)) return "local-uuid";
  if (SF_ID_RE.test(id)) return "salesforce-household";
  if (NUMERIC_RE.test(id)) return "orion-numeric";
  return "unknown";
}

/**
 * Quick check: does this ID look like it could exist in Salesforce?
 */
export function looksLikeSalesforceId(id: string): boolean {
  return classifyClientId(id) === "salesforce-household";
}

/**
 * Build the _identity metadata block for API responses.
 */
export function buildIdentityMeta(
  inputId: string,
  dataPath: "live" | "local-db" | "local-db-uuid-skip" | "cache-hit",
  overrides?: {
    resolvedSfId?: string | null;
    resolvedOrionId?: string | null;
    isLiveIntegrated?: boolean;
  }
) {
  const idType = classifyClientId(inputId);
  return {
    inputId,
    idType,
    dataPath,
    isLiveIntegrated: overrides?.isLiveIntegrated ?? (dataPath === "live" || dataPath === "cache-hit"),
    resolvedSfId: overrides?.resolvedSfId ?? (idType === "salesforce-household" ? inputId : null),
    resolvedOrionId: overrides?.resolvedOrionId ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 2: Canonical Identity Resolver
// ─────────────────────────────────────────────────────────────────────────

/**
 * Identity status definitions:
 *
 * - "live-integrated": Fully cross-system mapped. Has a valid SF household ID
 *   AND at least one other linked ID (local UUID or Orion ID). The identity
 *   is operationally unified across systems.
 *
 * - "partially-mapped": Has a valid SF household ID (can drive live route
 *   resolution) but is NOT yet linked to local UUID or Orion ID. Real and
 *   useful, but not fully unified.
 *
 * - "local-only": Only exists as a local DB record. No live SF/Orion mapping.
 *
 * - "unmapped": No useful linkage established. ID may not exist in any system.
 *
 * IMPORTANT: The resolver's `isLiveIntegrated` boolean is about operational
 * routing ("can this ID drive the live SF path?"), NOT about mapping completeness.
 * An SF-format ID always has `isLiveIntegrated: true` even if the crosswalk
 * status is "partially-mapped".
 */
export type ClientIdentityStatus =
  | "live-integrated"
  | "local-only"
  | "partially-mapped"
  | "unmapped";

export type ResolutionMethod =
  | "direct"
  | "crosswalk-lookup"
  | "cache-lookup"
  | "contact-derived"
  | "heuristic"
  | "none";

export type ClientIdentityResolution = {
  inputId: string;
  inputIdType: ClientIdType;
  salesforceHouseholdId: string | null;
  localClientUuid: string | null;
  orionClientId: string | null;
  identityStatus: ClientIdentityStatus;
  resolutionMethod: ResolutionMethod;
  isLiveIntegrated: boolean;
  displayName: string | null;
  warnings?: string[];
};

/**
 * Resolve a client ID to a canonical identity with cross-system mappings.
 *
 * Resolution order:
 * 1. Format classification
 * 2. Crosswalk table (durable truth)
 * 3. Enriched clients cache (assistive — bootstrap only)
 * 4. Local DB client record (for UUID inputs)
 * 5. Honest unresolved status
 */
export async function resolveClientIdentity(
  inputId: string,
  userEmail?: string,
): Promise<ClientIdentityResolution> {
  const inputIdType = classifyClientId(inputId);

  // ── 1. SF-format ID: direct resolution ──
  if (inputIdType === "salesforce-household") {
    // Try crosswalk for additional mappings (local UUID, Orion ID)
    const xwalk = await lookupCrosswalkBySfHouseholdId(inputId);
    if (xwalk) {
      return {
        inputId,
        inputIdType,
        salesforceHouseholdId: inputId,
        localClientUuid: xwalk.localClientUuid,
        orionClientId: xwalk.orionClientId,
        identityStatus: "live-integrated",
        resolutionMethod: "crosswalk-lookup",
        isLiveIntegrated: true,
        displayName: xwalk.displayName,
      };
    }

    // No crosswalk entry yet — still directly live-integrated by format
    return {
      inputId,
      inputIdType,
      salesforceHouseholdId: inputId,
      localClientUuid: null,
      orionClientId: null,
      identityStatus: "live-integrated",
      resolutionMethod: "direct",
      isLiveIntegrated: true,
      displayName: null,
    };
  }

  // ── 2. UUID-format ID: resolve through crosswalk → cache → local DB ──
  if (inputIdType === "local-uuid") {
    // 2a. Crosswalk lookup (highest priority for UUIDs)
    const xwalk = await lookupCrosswalkByLocalUuid(inputId);
    if (xwalk && xwalk.salesforceHouseholdId) {
      return {
        inputId,
        inputIdType,
        salesforceHouseholdId: xwalk.salesforceHouseholdId,
        localClientUuid: inputId,
        orionClientId: xwalk.orionClientId,
        identityStatus: xwalk.identityStatus as ClientIdentityStatus || "live-integrated",
        resolutionMethod: "crosswalk-lookup",
        isLiveIntegrated: true,
        displayName: xwalk.displayName,
      };
    }

    // 2b. Enriched clients cache lookup (assistive only)
    // The cache is built by GET /api/clients from SF data.
    // We can search by name to bootstrap a mapping, but this is NOT authoritative.
    // Skipped here — cache lookup is deferred to Phase 4 backfill bootstrap.
    // The resolver should not depend on the volatile in-memory cache at runtime.

    // 2c. Local DB lookup — get client record for displayName and partial info
    const localClient = await lookupLocalClient(inputId);
    if (localClient) {
      const warnings: string[] = [];

      // Check if client has a salesforceContactId (partial evidence)
      if (localClient.salesforceContactId) {
        warnings.push(
          `Local client has salesforceContactId=${localClient.salesforceContactId} ` +
          `but no household mapping. Contact ID is not equivalent to Household ID.`
        );
        return {
          inputId,
          inputIdType,
          salesforceHouseholdId: null,
          localClientUuid: inputId,
          orionClientId: null,
          identityStatus: "partially-mapped",
          resolutionMethod: "none",
          isLiveIntegrated: false,
          displayName: `${localClient.firstName} ${localClient.lastName}`.trim() || null,
          warnings,
        };
      }

      // Pure local-only client
      return {
        inputId,
        inputIdType,
        salesforceHouseholdId: null,
        localClientUuid: inputId,
        orionClientId: null,
        identityStatus: "local-only",
        resolutionMethod: "none",
        isLiveIntegrated: false,
        displayName: `${localClient.firstName} ${localClient.lastName}`.trim() || null,
      };
    }

    // UUID doesn't even exist in local DB
    return {
      inputId,
      inputIdType,
      salesforceHouseholdId: null,
      localClientUuid: inputId,
      orionClientId: null,
      identityStatus: "unmapped",
      resolutionMethod: "none",
      isLiveIntegrated: false,
      displayName: null,
      warnings: ["UUID does not match any local client record"],
    };
  }

  // ── 3. Orion numeric ID: crosswalk lookup only ──
  if (inputIdType === "orion-numeric") {
    const xwalk = await lookupCrosswalkByOrionId(inputId);
    if (xwalk) {
      return {
        inputId,
        inputIdType,
        salesforceHouseholdId: xwalk.salesforceHouseholdId,
        localClientUuid: xwalk.localClientUuid,
        orionClientId: inputId,
        identityStatus: xwalk.salesforceHouseholdId ? "live-integrated" : "partially-mapped",
        resolutionMethod: "crosswalk-lookup",
        isLiveIntegrated: !!xwalk.salesforceHouseholdId,
        displayName: xwalk.displayName,
      };
    }
    return {
      inputId,
      inputIdType,
      salesforceHouseholdId: null,
      localClientUuid: null,
      orionClientId: inputId,
      identityStatus: "unmapped",
      resolutionMethod: "none",
      isLiveIntegrated: false,
      displayName: null,
    };
  }

  // ── 4. Unknown ID format ──
  return {
    inputId,
    inputIdType,
    salesforceHouseholdId: null,
    localClientUuid: null,
    orionClientId: null,
    identityStatus: "unmapped",
    resolutionMethod: "none",
    isLiveIntegrated: false,
    displayName: null,
    warnings: [`Unrecognized ID format: ${inputId.substring(0, 20)}`],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 3: Crosswalk DB Access Helpers
// ─────────────────────────────────────────────────────────────────────────

type CrosswalkRow = typeof clientIdentityCrosswalk.$inferSelect;

/** Lookup crosswalk entry by local client UUID. */
async function lookupCrosswalkByLocalUuid(uuid: string): Promise<CrosswalkRow | null> {
  try {
    const [row] = await db
      .select()
      .from(clientIdentityCrosswalk)
      .where(eq(clientIdentityCrosswalk.localClientUuid, uuid))
      .limit(1);
    return row || null;
  } catch (err) {
    logger.error({ err, uuid }, "[Client Identity] Crosswalk lookup by UUID failed");
    return null;
  }
}

/** Lookup crosswalk entry by Salesforce Household ID. */
async function lookupCrosswalkBySfHouseholdId(sfId: string): Promise<CrosswalkRow | null> {
  try {
    const [row] = await db
      .select()
      .from(clientIdentityCrosswalk)
      .where(eq(clientIdentityCrosswalk.salesforceHouseholdId, sfId))
      .limit(1);
    return row || null;
  } catch (err) {
    logger.error({ err, sfId }, "[Client Identity] Crosswalk lookup by SF household ID failed");
    return null;
  }
}

/** Lookup crosswalk entry by Orion client ID. */
async function lookupCrosswalkByOrionId(orionId: string): Promise<CrosswalkRow | null> {
  try {
    const [row] = await db
      .select()
      .from(clientIdentityCrosswalk)
      .where(eq(clientIdentityCrosswalk.orionClientId, orionId))
      .limit(1);
    return row || null;
  } catch (err) {
    logger.error({ err, orionId }, "[Client Identity] Crosswalk lookup by Orion ID failed");
    return null;
  }
}

/** Lookup local client by UUID (for displayName + salesforceContactId check). */
async function lookupLocalClient(uuid: string): Promise<{
  firstName: string;
  lastName: string;
  salesforceContactId: string | null;
} | null> {
  try {
    const [row] = await db
      .select({
        firstName: clients.firstName,
        lastName: clients.lastName,
        salesforceContactId: clients.salesforceContactId,
      })
      .from(clients)
      .where(eq(clients.id, uuid))
      .limit(1);
    return row || null;
  } catch (err) {
    logger.error({ err, uuid }, "[Client Identity] Local client lookup failed");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Crosswalk Upsert Helpers (for backfill/bootstrap)
// ─────────────────────────────────────────────────────────────────────────

export type UpsertCrosswalkInput = {
  localClientUuid?: string | null;
  salesforceHouseholdId?: string | null;
  salesforceContactId?: string | null;
  orionClientId?: string | null;
  displayName?: string | null;
  mappingSource: "exact" | "backfill" | "heuristic" | "manual";
  mappingConfidence?: number | null;
  identityStatus: ClientIdentityStatus;
};

/**
 * Upsert a crosswalk entry. Uses salesforceHouseholdId as the match key
 * (since that's the most stable external identifier). Falls back to
 * localClientUuid if no SF household ID is provided.
 *
 * Returns the upserted row ID, or null on failure.
 */
export async function upsertCrosswalkEntry(input: UpsertCrosswalkInput): Promise<string | null> {
  try {
    // Determine match key
    let existing: CrosswalkRow | null = null;

    if (input.salesforceHouseholdId) {
      existing = await lookupCrosswalkBySfHouseholdId(input.salesforceHouseholdId);
    }
    if (!existing && input.localClientUuid) {
      existing = await lookupCrosswalkByLocalUuid(input.localClientUuid);
    }

    const now = new Date();
    const values = {
      localClientUuid: input.localClientUuid || null,
      salesforceHouseholdId: input.salesforceHouseholdId || null,
      salesforceContactId: input.salesforceContactId || null,
      orionClientId: input.orionClientId || null,
      displayName: input.displayName || null,
      mappingSource: input.mappingSource,
      mappingConfidence: input.mappingConfidence != null ? String(input.mappingConfidence) : null,
      identityStatus: input.identityStatus,
      lastVerifiedAt: now,
      updatedAt: now,
    };

    if (existing) {
      // Update existing entry — merge non-null values
      await db
        .update(clientIdentityCrosswalk)
        .set(values)
        .where(eq(clientIdentityCrosswalk.id, existing.id));
      return existing.id;
    } else {
      // Insert new entry
      const [inserted] = await db
        .insert(clientIdentityCrosswalk)
        .values(values)
        .returning({ id: clientIdentityCrosswalk.id });
      return inserted?.id || null;
    }
  } catch (err) {
    logger.error({ err, input: { ...input, displayName: undefined } }, "[Client Identity] Crosswalk upsert failed");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 4: Batch Backfill from Enriched Client List
// ─────────────────────────────────────────────────────────────────────────

/**
 * Enriched client shape as built by GET /api/clients SF path.
 * The `id` field is the Salesforce Household Account ID.
 */
type EnrichedClient = {
  id: string;            // SF Household Account ID (acct.Id)
  firstName?: string;
  lastName?: string;
  sfHouseholdId?: string;
  [key: string]: any;
};

/**
 * Batch-upsert crosswalk entries from the enriched clients cache.
 * Called non-blocking after the client list cache is refreshed.
 *
 * For each live SF household:
 * - Creates/updates a crosswalk row with the SF household ID
 * - Sets identityStatus = "live-integrated" (confirmed accessible via live API)
 * - Sets mappingSource = "backfill", confidence = 0.90
 * - Does NOT link local UUIDs here (that's Part C — local client linking)
 *
 * This is idempotent and safe to call on every cache refresh.
 */
export async function backfillFromEnrichedClients(
  enrichedClients: EnrichedClient[],
): Promise<{ inserted: number; updated: number; errors: number }> {
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const client of enrichedClients) {
    const sfHouseholdId = client.sfHouseholdId || client.id;
    if (!sfHouseholdId || classifyClientId(sfHouseholdId) !== "salesforce-household") {
      continue; // Skip non-SF IDs
    }

    const displayName = [client.firstName, client.lastName].filter(Boolean).join(" ").trim() || null;

    try {
      const existing = await lookupCrosswalkBySfHouseholdId(sfHouseholdId);
      const now = new Date();

      if (existing) {
        // Refresh displayName and lastVerifiedAt.
        // Preserve identityStatus if already upgraded beyond partially-mapped
        // (e.g. by a crosswalk link or manual mapping).
        const refreshStatus = existing.localClientUuid
          ? existing.identityStatus  // already linked — keep current status
          : "partially-mapped";       // SF-only, no local link yet
        await db
          .update(clientIdentityCrosswalk)
          .set({
            displayName: displayName || existing.displayName,
            identityStatus: refreshStatus,
            lastVerifiedAt: now,
            updatedAt: now,
          })
          .where(eq(clientIdentityCrosswalk.id, existing.id));
        updated++;
      } else {
        // Insert new row — SF household only, no local UUID or Orion ID yet.
        // Status is "partially-mapped" because the row has a valid live SF
        // household but is not yet cross-system unified (no local/Orion link).
        await db
          .insert(clientIdentityCrosswalk)
          .values({
            salesforceHouseholdId: sfHouseholdId,
            displayName,
            mappingSource: "backfill",
            mappingConfidence: "0.90",
            identityStatus: "partially-mapped",
            lastVerifiedAt: now,
          });
        inserted++;
      }
    } catch (err) {
      errors++;
      // Swallow individual row errors — don't fail the whole batch
    }
  }

  logger.info(
    { inserted, updated, errors, total: enrichedClients.length },
    "[Client Identity Backfill] SF household seeding complete",
  );

  return { inserted, updated, errors };
}

/**
 * Attempt to link local client UUIDs to existing crosswalk entries
 * using cautious heuristic name matching.
 *
 * Rules:
 * - Only matches exact case-insensitive full name
 * - Only upgrades to "partially-mapped" (never "live-integrated" from name alone)
 * - mappingSource = "heuristic", mappingConfidence = 0.70
 * - Does NOT overwrite existing localClientUuid links
 */
export async function linkLocalClientsToHouseholds(): Promise<{
  linked: number;
  skipped: number;
  errors: number;
}> {
  let linked = 0;
  let skipped = 0;
  let errCount = 0;

  try {
    // Get all local clients
    const localClients = await db
      .select({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        salesforceContactId: clients.salesforceContactId,
      })
      .from(clients);

    // Get all crosswalk entries that have no local UUID linked
    const unmappedRows = await db
      .select()
      .from(clientIdentityCrosswalk)
      .where(eq(clientIdentityCrosswalk.localClientUuid, null as any));

    // Build a name→crosswalk lookup (lowercase)
    const nameMap = new Map<string, typeof unmappedRows[0]>();
    for (const row of unmappedRows) {
      if (row.displayName) {
        nameMap.set(row.displayName.toLowerCase().trim(), row);
      }
    }

    const now = new Date();

    for (const local of localClients) {
      const localName = `${local.firstName} ${local.lastName}`.toLowerCase().trim();
      const match = nameMap.get(localName);

      if (!match) {
        skipped++;
        continue;
      }

      // Don't re-link if already linked to another local client
      if (match.localClientUuid) {
        skipped++;
        continue;
      }

      try {
        await db
          .update(clientIdentityCrosswalk)
          .set({
            localClientUuid: local.id,
            salesforceContactId: local.salesforceContactId || match.salesforceContactId,
            mappingSource: "heuristic",
            mappingConfidence: "0.70",
            identityStatus: "partially-mapped",
            updatedAt: now,
          })
          .where(eq(clientIdentityCrosswalk.id, match.id));
        linked++;

        // Remove from nameMap so we don't double-link
        nameMap.delete(localName);
      } catch (err) {
        errCount++;
      }
    }
  } catch (err) {
    logger.error({ err }, "[Client Identity Backfill] Local client linking failed");
    errCount++;
  }

  logger.info(
    { linked, skipped, errors: errCount },
    "[Client Identity Backfill] Local client linking complete",
  );

  return { linked, skipped, errors: errCount };
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 6: Batch Identity Enrichment for Upstream Endpoints
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolve multiple client IDs in a single deduped batch.
 * Collects unique IDs, resolves each once, returns a Map for O(1) lookup.
 *
 * Usage:
 *   const resolutions = await batchResolveClientIdentities(clientIds, userEmail);
 *   const identity = resolutions.get(someClientId);
 */
export async function batchResolveClientIdentities(
  clientIds: (string | null | undefined)[],
  userEmail?: string,
): Promise<Map<string, ClientIdentityResolution>> {
  const results = new Map<string, ClientIdentityResolution>();

  // Dedupe and filter nulls
  const uniqueIds = [...new Set(clientIds.filter((id): id is string => !!id))];

  // Resolve each unique ID once
  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const resolution = await resolveClientIdentity(id, userEmail);
        results.set(id, resolution);
      } catch (err) {
        logger.error({ err, id }, "[Client Identity] Batch resolve failed for ID");
        // Return a safe fallback resolution
        results.set(id, {
          inputId: id,
          inputIdType: classifyClientId(id),
          salesforceHouseholdId: null,
          localClientUuid: classifyClientId(id) === "local-uuid" ? id : null,
          orionClientId: null,
          identityStatus: "unmapped",
          resolutionMethod: "none",
          isLiveIntegrated: false,
          displayName: null,
          warnings: [`Resolution failed: ${(err as Error)?.message || "unknown"}`],
        });
      }
    }),
  );

  return results;
}

/**
 * Get the best navigational ID from a resolution result.
 * Returns SF household ID if available, otherwise the original input ID.
 */
export function getNavigationalId(resolution: ClientIdentityResolution): string {
  return resolution.salesforceHouseholdId || resolution.inputId;
}
