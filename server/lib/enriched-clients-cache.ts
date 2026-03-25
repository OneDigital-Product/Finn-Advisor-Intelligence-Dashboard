/**
 * Enriched Clients Cache — module-scope persistence
 * ──────────────────────────────────────────────────
 *
 * Stores the merged SF + Orion client list in module scope, which
 * survives Next.js HMR better than globalThis (which gets cleared
 * when the route module is re-evaluated).
 *
 * The client list route writes to both globalThis AND this module.
 * On cache miss, the route checks this module as a secondary source
 * so stale real data can be served instead of falling back to seed/demo.
 *
 * TTL is enforced by the consumer, not here. This module always
 * returns whatever it has — the caller decides if it's fresh or stale.
 */

import { logger } from "./logger";

interface EnrichedClientsSnapshot {
  data: any[];
  totalAum: number;
  advisor: any;
  ts: number;
  userEmail: string;
}

// Module-scope — survives webpack HMR where globalThis may not
let _snapshot: EnrichedClientsSnapshot | null = null;

export function getEnrichedClientsSnapshot(): EnrichedClientsSnapshot | null {
  return _snapshot;
}

export function setEnrichedClientsSnapshot(val: EnrichedClientsSnapshot): void {
  _snapshot = val;
  logger.debug(
    { clients: val.data.length, userEmail: val.userEmail },
    "[Enriched Cache] Module-scope snapshot updated"
  );
}
