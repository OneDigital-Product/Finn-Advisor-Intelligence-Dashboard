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

  // ─── Step 3: Reassign all demo clients from Michael → James ───
  const clientCount = await queryVal(sql`SELECT count(*) AS cnt FROM clients WHERE advisor_id = ${MICHAEL_ID}`);

  if (clientCount > 0) {
    // Safety check: verify none are SF-linked
    const sfLinked = await queryVal(sql`
      SELECT count(*) AS cnt FROM clients
      WHERE advisor_id = ${MICHAEL_ID} AND salesforce_contact_id IS NOT NULL
    `);
    if (sfLinked > 0) {
      throw new Error(`SAFETY ABORT: ${sfLinked} clients have Salesforce links. Will not move live data.`);
    }

    await db.execute(sql`UPDATE clients SET advisor_id = ${JAMES_ADVISOR_ID} WHERE advisor_id = ${MICHAEL_ID}`);
    console.log(`  ✅ Step 3: Moved ${clientCount} clients from Michael → James`);
    changes++;
  } else {
    console.log("  ⏭️  Step 3: Michael has 0 clients — already moved or never assigned");
  }

  // ─── Step 4: Reassign all advisor-scoped records ──────────────
  // These tables have an advisor_id column that must match the new owner.
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

  let totalMoved = 0;
  for (const table of advisorScopedTables) {
    try {
      const result = await db.execute(
        sql`UPDATE ${sql.raw(`"${table}"`)} SET advisor_id = ${JAMES_ADVISOR_ID} WHERE advisor_id = ${MICHAEL_ID}`
      );
      const count = (result as any).rowCount ?? (result as any).changes ?? 0;
      if (count > 0) {
        console.log(`  ✅ Step 4: ${table} — ${count} records re-scoped`);
        totalMoved += count;
      }
    } catch (err: any) {
      // Table might not have advisor_id or might not exist — skip silently
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
