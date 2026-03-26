/**
 * Promote James Chen to Demo Advisor
 *
 * 1. Gives james.chen@onedigital.com a real advisor-level password
 * 2. Renames fake client "James Chen" → "Marcus Tanaka" (and Lisa Chen → Lisa Tanaka)
 * 3. Reassigns all 7 demo clients + 150 advisor-scoped records from Michael → James
 * 4. Michael keeps his login but sees 0 demo clients (clean for live MuleSoft testing)
 *
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." npx tsx -e \
 *     "import { promoteDemoAdvisor } from './scripts/promote-demo-advisor'; \
 *      promoteDemoAdvisor().then(() => { console.log('Done'); process.exit(0); }) \
 *      .catch(e => { console.error(e); process.exit(1); });"
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { hashPassword } from "../server/auth";

// ── Helpers ────────────────────────────────────────────────────────
async function queryOne<T = any>(q: ReturnType<typeof sql>): Promise<T | null> {
  const result = await db.execute(q);
  const rows = (result as any).rows ?? result;
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function queryVal(q: ReturnType<typeof sql>): Promise<number> {
  const row = await queryOne(q);
  return Number(row?.cnt ?? row?.count ?? 0);
}

// ── Main ───────────────────────────────────────────────────────────
export async function promoteDemoAdvisor() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║     PROMOTE JAMES CHEN TO DEMO ADVISOR LOGIN       ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // ─── Step 0: Resolve IDs ──────────────────────────────────────
  let james = await queryOne(sql`SELECT id, password_hash FROM advisors WHERE email = 'james.chen@onedigital.com' LIMIT 1`);

  if (!james) {
    // Path A: James exists as an associate — promote to advisor using same ID
    const assoc = await queryOne(sql`SELECT id, name, email, role FROM associates WHERE email = 'james.chen@onedigital.com' LIMIT 1`);

    if (assoc) {
      console.log(`  James found in associates only (${assoc.id}, role: ${assoc.role}). Creating advisor row...`);
      const hash = hashPassword("demo2026!");
      await db.execute(sql`
        INSERT INTO advisors (id, name, email, title, password_hash, onboarding_completed)
        VALUES (${assoc.id}, ${assoc.name}, ${assoc.email}, 'Senior Wealth Advisor', ${hash}, true)
        ON CONFLICT (id) DO UPDATE SET
          password_hash = ${hash},
          title = 'Senior Wealth Advisor',
          onboarding_completed = true
      `);
      console.log(`  ✅ Step 0: Created advisor row for James Chen from associate record`);
    } else {
      // Path B: James doesn't exist anywhere — create from scratch
      console.log("  James not found in advisors or associates. Creating from scratch...");
      const hash = hashPassword("demo2026!");
      await db.execute(sql`
        INSERT INTO advisors (name, email, title, password_hash, onboarding_completed)
        VALUES ('James Chen', 'james.chen@onedigital.com', 'Senior Wealth Advisor', ${hash}, true)
      `);
      console.log(`  ✅ Step 0: Created new advisor row for James Chen`);
    }

    // Re-fetch
    james = await queryOne(sql`SELECT id, password_hash FROM advisors WHERE email = 'james.chen@onedigital.com' LIMIT 1`);
    if (!james) throw new Error("FATAL: Failed to create advisor row for James Chen.");
  }

  const JAMES_ADVISOR_ID = james.id;

  const michael = await queryOne(sql`SELECT id FROM advisors WHERE email = 'michael.gouldin@onedigital.com.uat' LIMIT 1`);
  if (!michael) {
    console.log("  ⚠️  Michael Gouldin not found — creating internal test advisor...");
    const mHash = hashPassword("admin123");
    await db.execute(sql`
      INSERT INTO advisors (name, email, title, password_hash, onboarding_completed)
      VALUES ('Michael Gouldin', 'michael.gouldin@onedigital.com.uat', 'Wealth Advisor', ${mHash}, true)
    `);
    console.log("  ✅ Step 0: Created Michael Gouldin advisor row");
  }
  const michaelRefresh = await queryOne(sql`SELECT id FROM advisors WHERE email = 'michael.gouldin@onedigital.com.uat' LIMIT 1`);
  if (!michaelRefresh) throw new Error("FATAL: Failed to create Michael Gouldin advisor row.");
  const MICHAEL_ID = michaelRefresh.id;

  console.log(`  James advisor ID:   ${JAMES_ADVISOR_ID}`);
  console.log(`  Michael advisor ID: ${MICHAEL_ID}\n`);

  let changes = 0;

  // ─── Step 1: Give James a real advisor password ───────────────
  if (!james.password_hash) {
    const hash = hashPassword("demo2026!");
    await db.execute(sql`
      UPDATE advisors SET password_hash = ${hash}, title = 'Senior Wealth Advisor'
      WHERE id = ${JAMES_ADVISOR_ID}
    `);
    console.log("  ✅ Step 1: James advisor password set (demo2026!)");
    changes++;
  } else {
    console.log("  ⏭️  Step 1: James already has a password — skipped");
  }

  // ─── Step 2: Rename fake client James Chen → Marcus Tanaka ────
  const fakeJames = await queryOne(sql`
    SELECT id, first_name FROM clients WHERE first_name = 'James' AND last_name = 'Chen' LIMIT 1
  `);
  if (fakeJames) {
    await db.execute(sql`
      UPDATE clients SET first_name = 'Marcus', last_name = 'Tanaka', email = 'marcus.tanaka@techcorp.com'
      WHERE id = ${fakeJames.id}
    `);
    console.log(`  ✅ Step 2a: Client "James Chen" → "Marcus Tanaka" (${fakeJames.id})`);
    changes++;
  } else {
    // Check if already renamed
    const marcus = await queryOne(sql`SELECT id FROM clients WHERE first_name = 'Marcus' AND last_name = 'Tanaka' LIMIT 1`);
    if (marcus) {
      console.log("  ⏭️  Step 2a: Client already renamed to Marcus Tanaka — skipped");
    } else {
      console.log("  ⚠️  Step 2a: No client named James Chen or Marcus Tanaka found");
    }
  }

  const fakeLisa = await queryOne(sql`
    SELECT id, first_name FROM clients WHERE first_name = 'Lisa' AND last_name = 'Chen' LIMIT 1
  `);
  if (fakeLisa) {
    await db.execute(sql`
      UPDATE clients SET first_name = 'Lisa', last_name = 'Tanaka', email = 'lisa.tanaka@gmail.com'
      WHERE id = ${fakeLisa.id}
    `);
    console.log(`  ✅ Step 2b: Client "Lisa Chen" → "Lisa Tanaka" (${fakeLisa.id})`);
    changes++;
  } else {
    const lisaT = await queryOne(sql`SELECT id FROM clients WHERE first_name = 'Lisa' AND last_name = 'Tanaka' LIMIT 1`);
    if (lisaT) {
      console.log("  ⏭️  Step 2b: Client already renamed to Lisa Tanaka — skipped");
    } else {
      console.log("  ⚠️  Step 2b: No client named Lisa Chen or Lisa Tanaka found");
    }
  }

  // ─── Step 3: Reassign synthetic demo clients to James ─────────
  // Detect the current owner dynamically — could be Sarah, Michael, or anyone.
  // Find all clients NOT already owned by James, that are synthetic (no SF link).
  const nonJamesClients = await queryVal(sql`
    SELECT count(*) AS cnt FROM clients
    WHERE advisor_id != ${JAMES_ADVISOR_ID}
      AND salesforce_contact_id IS NULL
      AND synced_to_salesforce = false
  `);

  if (nonJamesClients > 0) {
    // Identify which advisor(s) currently own them for logging
    const currentOwners = await db.execute(sql`
      SELECT a.name, a.email, count(*) AS cnt
      FROM clients c JOIN advisors a ON c.advisor_id = a.id
      WHERE c.advisor_id != ${JAMES_ADVISOR_ID}
        AND c.salesforce_contact_id IS NULL
        AND c.synced_to_salesforce = false
      GROUP BY a.name, a.email
    `);
    const owners = (currentOwners as any).rows ?? currentOwners;
    for (const o of owners) {
      console.log(`  📋 Step 3: Found ${o.cnt} synthetic clients owned by ${o.name} (${o.email})`);
    }

    // Safety check: double-verify none are SF-linked
    const sfLinked = await queryVal(sql`
      SELECT count(*) AS cnt FROM clients
      WHERE advisor_id != ${JAMES_ADVISOR_ID}
        AND salesforce_contact_id IS NOT NULL
        AND synced_to_salesforce = false
    `);
    if (sfLinked > 0) {
      console.log(`  ⚠️  Step 3: Skipping ${sfLinked} clients with Salesforce contact IDs`);
    }

    await db.execute(sql`
      UPDATE clients SET advisor_id = ${JAMES_ADVISOR_ID}
      WHERE advisor_id != ${JAMES_ADVISOR_ID}
        AND salesforce_contact_id IS NULL
        AND synced_to_salesforce = false
    `);
    console.log(`  ✅ Step 3: Moved ${nonJamesClients} synthetic clients → James`);
    changes++;
  } else {
    console.log("  ⏭️  Step 3: All synthetic clients already owned by James");
  }

  // ─── Step 4: Reassign advisor-scoped records ────────────────
  // Find all advisor IDs that are NOT James, and move their records to James.
  // Only move records that belong to clients James now owns.
  const advisorScopedTables = [
    "activities", "alerts", "aml_screening_results", "assessments",
    "behavioral_analyses", "calculator_runs", "cassidy_jobs",
    "charitable_accounts", "charitable_remainder_trusts",
    "compliance_items", "compliance_reviews", "conversation_turns",
    "daf_accounts", "detected_signals", "discovery_sessions",
    "edd_records", "engagement_events", "engagement_scores",
    "estate_exemptions", "exit_milestones", "fact_finder_responses",
    "flp_structures", "households", "insights", "intent_signals",
    "kyc_audit_log", "kyc_review_schedules", "kyc_risk_ratings",
    "meeting_notes", "meetings", "next_best_actions", "nigo_records",
    "pending_profile_updates", "pre_case_validations", "qcd_records",
    "report_artifacts", "tasks", "trusts", "withdrawal_requests",
    "workflow_instances",
  ];

  // Get the IDs of all clients James now owns
  const jamesClientIds = await db.execute(sql`SELECT id FROM clients WHERE advisor_id = ${JAMES_ADVISOR_ID}`);
  const clientIds = ((jamesClientIds as any).rows ?? jamesClientIds).map((r: any) => r.id);

  let totalMoved = 0;
  for (const table of advisorScopedTables) {
    try {
      // For tables with both client_id and advisor_id: update where client belongs to James but advisor_id doesn't match
      const hasClientId = await queryOne(sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = ${table} AND column_name = 'client_id' AND table_schema = 'public'
      `);

      let result;
      if (hasClientId && clientIds.length > 0) {
        // Re-scope records whose client is owned by James but advisor_id is stale
        result = await db.execute(
          sql`UPDATE ${sql.raw(`"${table}"`)} SET advisor_id = ${JAMES_ADVISOR_ID}
              WHERE advisor_id != ${JAMES_ADVISOR_ID}
                AND client_id IN (SELECT id FROM clients WHERE advisor_id = ${JAMES_ADVISOR_ID})`
        );
      } else {
        // Tables without client_id (like households): update any non-James advisor_id
        result = await db.execute(
          sql`UPDATE ${sql.raw(`"${table}"`)} SET advisor_id = ${JAMES_ADVISOR_ID}
              WHERE advisor_id != ${JAMES_ADVISOR_ID}`
        );
      }
      const count = (result as any).rowCount ?? (result as any).changes ?? 0;
      if (count > 0) {
        console.log(`  ✅ Step 4: ${table} — ${count} records re-scoped`);
        totalMoved += count;
      }
    } catch (err: any) {
      if (err?.code !== '42703' && err?.code !== '42P01') {
        console.log(`  ⚠️  Step 4: ${table} — ${err.message}`);
      }
    }
  }
  if (totalMoved > 0) {
    console.log(`  ✅ Step 4: Total advisor-scoped records re-scoped: ${totalMoved}`);
    changes++;
  } else {
    console.log("  ⏭️  Step 4: No advisor-scoped records needed re-scoping");
  }

  // ─── Step 5: Update enrichment script references ──────────────
  // The enrich-demo-data.ts resolves by name/email dynamically, so
  // Marcus Tanaka will be found as long as first_name='Marcus' AND last_name='Tanaka'.
  // We need to update that script's lookup. But since it uses dynamic resolution,
  // we just need to update the console.log message. No code change needed.

  console.log(`\n══════════════════════════════════════════════════════`);
  console.log(`  Migration complete. ${changes} change groups applied.`);
  console.log(`  ${changes === 0 ? "All changes already applied — idempotent." : ""}`);
  console.log(`══════════════════════════════════════════════════════`);
  console.log(`\n  Demo login:    james.chen@onedigital.com / demo2026!`);
  console.log(`  Internal login: michael.gouldin@onedigital.com.uat / admin123`);
  console.log(`  Demo client:   Marcus Tanaka (formerly James Chen)\n`);
}
