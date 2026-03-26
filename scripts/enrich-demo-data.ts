/**
 * Demo Data Enrichment Script
 *
 * Fills gaps in James Chen's demo profile so stakeholders can navigate
 * every product surface. Idempotent — safe to re-run.
 *
 * Usage:
 *   DATABASE_URL="postgres://..." npx tsx -e \
 *     "import { enrichDemoData } from './scripts/enrich-demo-data'; \
 *      enrichDemoData().then(() => { console.log('Done'); process.exit(0); }) \
 *      .catch(e => { console.error(e); process.exit(1); });"
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

// ── Constants ──────────────────────────────────────────────────────
const JAMES_ID = "9d694e23-c972-4094-8b50-f34c12d5a278";
const ADVISOR_ID = "63924ff0-2f61-447e-856b-55e5ebf6872a"; // Michael Gouldin
const LISA_ID = "a7c31558-7f93-42a8-a9d1-2a1e28d372ea";   // Lisa Chen (spouse)

// Existing trust IDs (from seed)
const FAMILY_TRUST_ID = "6480e522-f87a-42e9-81e9-c0e7c543b05b";
const GRAT_ID = "d4de554e-0ca3-49e7-8179-85dbd1f2ca03";

// Existing account IDs
const INDIVIDUAL_ACCT = "9e29665d-87e0-46c2-ab2a-ccb1b3684370";
const ROLLOVER_ACCT = "dc33d68b-ac3b-4313-8154-867aefff836c";

// Existing social profile ID
const SOCIAL_PROFILE_ID = "a7ebd6ce-d3b1-4a6b-883e-ec48a15a33a3";

// Deterministic IDs for idempotency
const BIZ_TECHCORP_ID = "demo-biz-techcorp-001";
const BIZ_REALESTATE_ID = "demo-biz-realestate-002";
const FLP_ID = "demo-flp-chen-001";
const CRT_ID = "demo-crt-chen-001";
const QCD_ID = "demo-qcd-chen-001";
const SOCIAL_EVENT_1_ID = "demo-social-evt-001";
const SOCIAL_EVENT_2_ID = "demo-social-evt-002";
const PROFILE_UPDATE_ID = "demo-profile-upd-001";

// ── Helpers ────────────────────────────────────────────────────────
async function rowExists(table: string, id: string): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT EXISTS (SELECT 1 FROM ${sql.raw(`"${table}"`)} WHERE id = ${id}) AS exists`
  );
  const rows = (result as any).rows ?? result;
  return Array.isArray(rows) && rows.length > 0 && rows[0].exists === true;
}

// ── Main ───────────────────────────────────────────────────────────
export async function enrichDemoData() {
  console.log("Starting demo data enrichment for James Chen...");
  let added = 0;

  // ─── 1. Business Entities (0 → 2) ─────────────────────────────
  if (!(await rowExists("business_entities", BIZ_TECHCORP_ID))) {
    await db.execute(sql`
      INSERT INTO business_entities (id, client_id, name, entity_type, industry, ownership_percentage, estimated_value, annual_revenue, annual_ebitda, employee_count, founded_date, key_people, status, notes)
      VALUES (
        ${BIZ_TECHCORP_ID}, ${JAMES_ID},
        'TechCorp Solutions Inc.',
        'c_corporation',
        'Enterprise SaaS',
        28.50,
        4200000.00,
        12500000.00,
        2800000.00,
        85,
        '2018-03-15',
        ${JSON.stringify([
          { name: "James Chen", role: "CTO", ownership: 28.5 },
          { name: "David Park", role: "CEO", ownership: 35.0 },
          { name: "Maria Santos", role: "COO", ownership: 15.0 }
        ])},
        'active',
        'Co-founded 2018. James serves as CTO with 28.5% equity stake. Series B completed Q3 2024. Exploring potential exit or secondary sale within 3-5 years.'
      )
    `);
    console.log("  ✅ business_entities: TechCorp Solutions");
    added++;
  }

  if (!(await rowExists("business_entities", BIZ_REALESTATE_ID))) {
    await db.execute(sql`
      INSERT INTO business_entities (id, client_id, name, entity_type, industry, ownership_percentage, estimated_value, annual_revenue, employee_count, founded_date, key_people, status, notes)
      VALUES (
        ${BIZ_REALESTATE_ID}, ${JAMES_ID},
        'Chen Family Properties LLC',
        'llc',
        'Real Estate',
        100.00,
        1850000.00,
        96000.00,
        0,
        '2021-08-01',
        ${JSON.stringify([
          { name: "James Chen", role: "Managing Member", ownership: 100.0 }
        ])},
        'active',
        'Holds 3 rental properties in Bay Area. Annual rental income ~$96,000. Considering FLP conversion for estate planning discount.'
      )
    `);
    console.log("  ✅ business_entities: Chen Family Properties LLC");
    added++;
  }

  // ─── 2. Trust Relationships (0 → 4) ───────────────────────────
  // Check by trust_id + role combo to avoid duplicates
  const existingRels = await db.execute(sql`
    SELECT count(*) AS cnt FROM trust_relationships WHERE trust_id IN (${FAMILY_TRUST_ID}, ${GRAT_ID})
  `);
  const relCount = Number((existingRels as any).rows?.[0]?.cnt ?? (existingRels as any)[0]?.cnt ?? 0);

  if (relCount === 0) {
    await db.execute(sql`
      INSERT INTO trust_relationships (id, trust_id, person_name, person_client_id, role, generation, notes)
      VALUES
        ('demo-tr-001', ${FAMILY_TRUST_ID}, 'James Chen', ${JAMES_ID}, 'grantor', 0, 'Co-grantor and primary trustee'),
        ('demo-tr-002', ${FAMILY_TRUST_ID}, 'Lisa Chen', ${LISA_ID}, 'co-trustee', 0, 'Co-grantor and co-trustee'),
        ('demo-tr-003', ${FAMILY_TRUST_ID}, 'Emily Chen', NULL, 'beneficiary', 1, 'Daughter, age 14. Distribution at age 25 or upon completion of graduate degree.'),
        ('demo-tr-004', ${GRAT_ID}, 'Emily Chen', NULL, 'remainder_beneficiary', 1, 'Remainder beneficiary of GRAT upon annuity term expiration in 2027.')
      ON CONFLICT (id) DO NOTHING
    `);
    console.log("  ✅ trust_relationships: 4 roles (grantor, co-trustee, 2 beneficiaries)");
    added += 4;
  }

  // ─── 3. FLP Structure (0 → 1) ─────────────────────────────────
  if (!(await rowExists("flp_structures", FLP_ID))) {
    await db.execute(sql`
      INSERT INTO flp_structures (id, client_id, advisor_id, name, total_value, general_partner_pct, limited_partner_pct, lack_of_control_discount, lack_of_marketability_discount, combined_discount, discounted_value, ownership_details, status)
      VALUES (
        ${FLP_ID}, ${JAMES_ID}, ${ADVISOR_ID},
        'Chen Family Properties FLP',
        1850000.00,
        1.00,
        99.00,
        0.3000,
        0.2000,
        0.4400,
        1036000.00,
        ${JSON.stringify([
          { member: "James Chen", role: "General Partner", percentage: 1.0 },
          { member: "Lisa Chen", role: "Limited Partner", percentage: 49.5 },
          { member: "Emily Chen", role: "Limited Partner", percentage: 49.5 }
        ])},
        'active'
      )
    `);
    console.log("  ✅ flp_structures: Chen Family Properties FLP ($1.85M → $1.04M discounted)");
    added++;
  }

  // ─── 4. Charitable Remainder Trust (0 → 1) ────────────────────
  if (!(await rowExists("charitable_remainder_trusts", CRT_ID))) {
    await db.execute(sql`
      INSERT INTO charitable_remainder_trusts (id, client_id, advisor_id, trust_name, crt_type, funded_value, current_value, payout_rate, term_years, charitable_beneficiary, income_beneficiary, projected_annual_income, charitable_deduction)
      VALUES (
        ${CRT_ID}, ${JAMES_ID}, ${ADVISOR_ID},
        'Chen Family CRUT',
        'unitrust',
        500000.00,
        542000.00,
        0.0500,
        20,
        'Bay Area Community Foundation',
        'James & Lisa Chen',
        27100.00,
        185000.00
      )
    `);
    console.log("  ✅ charitable_remainder_trusts: Chen Family CRUT ($500K funded, 5% payout)");
    added++;
  }

  // ─── 5. QCD Record (0 → 1) ────────────────────────────────────
  if (!(await rowExists("qcd_records", QCD_ID))) {
    await db.execute(sql`
      INSERT INTO qcd_records (id, client_id, advisor_id, ira_account_id, charity_name, amount, distribution_date, tax_year, rmd_satisfied, tax_savings_estimate, status, notes)
      VALUES (
        ${QCD_ID}, ${JAMES_ID}, ${ADVISOR_ID},
        ${ROLLOVER_ACCT},
        'Silicon Valley Community Foundation',
        25000.00,
        '2025-11-15',
        2025,
        25000.00,
        8750.00,
        'completed',
        'QCD from 401(k) rollover IRA to satisfy partial RMD obligation. Saved $8,750 in estimated federal income tax vs. standard distribution.'
      )
    `);
    console.log("  ✅ qcd_records: $25K QCD to Silicon Valley Community Foundation");
    added++;
  }

  // ─── 6. Social Events (0 → 2) ─────────────────────────────────
  if (!(await rowExists("social_events", SOCIAL_EVENT_1_ID))) {
    await db.execute(sql`
      INSERT INTO social_events (id, social_profile_id, client_id, event_type, title, description, detected_at, source_url, is_read, outreach_prompt, outreach_generated)
      VALUES (
        ${SOCIAL_EVENT_1_ID}, ${SOCIAL_PROFILE_ID}, ${JAMES_ID},
        'promotion',
        'Promoted to Chief Technology Officer',
        'James Chen has been promoted from VP of Engineering to CTO at TechCorp Solutions. This may indicate increased compensation, new equity grants, and potential changes in retirement planning needs.',
        NOW() - INTERVAL '12 days',
        'https://linkedin.com/in/jameschen/activity/promotion-2025',
        false,
        'Congratulations on the CTO promotion! This is a great opportunity to revisit your equity compensation strategy and explore whether the new role triggers any changes in your deferred compensation plan.',
        true
      )
    `);
    console.log("  ✅ social_events: CTO promotion detected");
    added++;
  }

  if (!(await rowExists("social_events", SOCIAL_EVENT_2_ID))) {
    await db.execute(sql`
      INSERT INTO social_events (id, social_profile_id, client_id, event_type, title, description, detected_at, source_url, is_read, outreach_prompt, outreach_generated)
      VALUES (
        ${SOCIAL_EVENT_2_ID}, ${SOCIAL_PROFILE_ID}, ${JAMES_ID},
        'board_appointment',
        'Appointed to Board of Bay Area Tech Alliance',
        'James Chen has been appointed to the board of directors of the Bay Area Tech Alliance, a nonprofit industry consortium. This may create new philanthropic planning opportunities and affect his liability profile.',
        NOW() - INTERVAL '5 days',
        'https://linkedin.com/in/jameschen/activity/board-2025',
        false,
        'I noticed your board appointment at the Bay Area Tech Alliance — congratulations! Let us discuss whether you need additional D&O coverage and how this aligns with your philanthropic goals.',
        true
      )
    `);
    console.log("  ✅ social_events: Board appointment detected");
    added++;
  }

  // ─── 7. Pending Profile Update (0 → 1) ────────────────────────
  if (!(await rowExists("pending_profile_updates", PROFILE_UPDATE_ID))) {
    await db.execute(sql`
      INSERT INTO pending_profile_updates (id, client_id, advisor_id, source_type, source_id, life_event, field_updates, reasoning, status)
      VALUES (
        ${PROFILE_UPDATE_ID}, ${JAMES_ID}, ${ADVISOR_ID},
        'social_signal',
        ${SOCIAL_EVENT_1_ID},
        'Career advancement',
        ${JSON.stringify({
          occupation: { from: "VP Engineering", to: "Chief Technology Officer" },
          employer: { from: "TechCorp Solutions", to: "TechCorp Solutions" },
          estimated_income_change: "+$75,000-$120,000 (base + equity refresh)"
        })},
        'LinkedIn activity detected CTO promotion at TechCorp Solutions. Title change confirmed by multiple connections. Recommend updating occupation field and scheduling compensation review meeting.',
        'pending'
      )
    `);
    console.log("  ✅ pending_profile_updates: CTO promotion → suggested field update");
    added++;
  }

  console.log(`\nEnrichment complete. ${added} records added (${added === 0 ? "all already existed — idempotent" : "new"}).`);
}
