import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuth, getSessionAdvisor } from "./middleware";
import { upload, uploadLimiter } from "./utils";
import { chatCompletion } from "../openai";
import { logger } from "../lib/logger";
import { sanitizeErrorMessage } from "../lib/error-utils";

const clientContextSchema = z.object({
  totalAum: z.number().optional(),
  netWorth: z.number().optional(),
  netWorthSource: z.string().optional(),
  homeValue: z.number().optional(),
  homeSquareFootage: z.number().optional(),
  rebuildYear: z.number().optional(),
  numberOfVehicles: z.number().optional(),
  vehicleDetails: z.string().optional(),
  dependents: z.number().optional(),
  occupation: z.string().optional(),
  state: z.string().optional(),
  valuableArticlesEstimate: z.number().optional(),
  hasUmbrella: z.boolean().optional(),
  additionalNotes: z.string().optional(),
}).optional();

const documentSchema = z.object({
  clientId: z.string().uuid(),
  lineType: z.enum(["property", "casualty"]),
  documentText: z.string().min(1, "Document text is required"),
  clientContext: clientContextSchema,
});

const documentInventoryItemSchema = z.object({
  documentType: z.enum(["Dec Page", "Full Policy", "CLUE Report", "Endorsement", "Other"]).nullable().describe("Type of document"),
  carrier: z.string().nullable().describe("Insurance carrier name"),
  policyNumber: z.string().nullable().describe("Policy number as printed on the document"),
  policyPeriod: z.string().nullable().describe("Policy effective and expiration dates, e.g. '01/01/2025 – 01/01/2026'"),
  namedInsureds: z.string().nullable().describe("Named insured(s) listed on the document"),
  coverageDomain: z.enum(["HO", "Auto", "Umbrella", "Valuable Articles", "Other"]).nullable().describe("Coverage domain this document belongs to"),
  completeness: z.enum(["Complete", "Partial", "Poor Quality"]).nullable().describe("How complete and readable the document is"),
});

const gateSchema = z.object({
  gate: z.string().nullable().describe("Name of the quality gate being checked"),
  passed: z.boolean().nullable().describe("Whether this quality gate passed (true) or failed (false)"),
});

const missingFlagSchema = z.object({
  item: z.string().nullable().describe("Description of the missing context item"),
  impact: z.string().nullable().describe("How the missing item impacts the analysis accuracy"),
});

const domainScoreSchema = z.object({
  score: z.number().min(0).max(10).nullable().describe("Coverage adequacy score from 0 (no coverage) to 10 (excellent)"),
  rationale: z.string().nullable().describe("Brief explanation of why this score was assigned"),
});

const calculationResultSchema = z.object({
  narrative: z.string().nullable().describe("Detailed narrative explaining the calculation result"),
  status: z.enum(["ADEQUATE", "INSUFFICIENT", "NOT_AVAILABLE"]).nullable().describe("Whether the calculated value meets recommended thresholds"),
}).nullable();

const riskFlagSchema = z.object({
  name: z.string().nullable().describe("Short name of the identified risk"),
  domain: z.enum(["HO", "Auto", "Umbrella", "Valuable Articles", "Liability", "Other"]).nullable().describe("Coverage domain this risk relates to"),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).nullable().describe("Risk priority: CRITICAL = immediate action, HIGH = address soon, MEDIUM = review, LOW = informational"),
  calculatedGap: z.string().nullable().describe("Human-readable description of the coverage gap"),
  calculatedGapDollars: z.number().nullable().describe("Dollar amount of the coverage gap, or null if not quantifiable"),
  clientContext: z.string().nullable().describe("Why this risk matters given the client's specific situation"),
  evidence: z.string().nullable().describe("Specific policy language or data supporting this finding"),
  consequence: z.string().nullable().describe("What could happen if this risk is not addressed"),
  referralAction: z.string().nullable().describe("Suggested action for the P&C producer referral"),
});

const recommendationSchema = z.object({
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).nullable().describe("Recommendation urgency level"),
  finding: z.string().nullable().describe("What was found in the analysis"),
  context: z.string().nullable().describe("Additional context about the finding"),
  recommendedAction: z.string().nullable().describe("Specific action the advisor should take"),
  referralLanguage: z.string().nullable().describe("Suggested language for the P&C producer referral conversation"),
  expectedImpact: z.string().nullable().describe("Expected outcome if this recommendation is followed"),
  urgency: z.enum(["Immediate", "Within 30 days", "Next renewal", "Informational"]).nullable().describe("Timeframe for addressing this recommendation"),
});

const referralPrioritySchema = z.object({
  issue: z.string().nullable().describe("The coverage issue to discuss with the P&C producer"),
  currentValue: z.string().nullable().describe("Current limit or coverage status"),
  recommendedValue: z.string().nullable().describe("Recommended limit or coverage change"),
  whyNow: z.string().nullable().describe("Why this issue should be addressed now rather than at renewal"),
});

const assumptionSchema = z.object({
  item: z.string().nullable().describe("What was assumed during the analysis"),
  valueUsed: z.string().nullable().describe("The value or assumption applied"),
  source: z.string().nullable().describe("Where this assumption came from: document, advisor input, or industry standard"),
  impactIfWrong: z.string().nullable().describe("How the analysis would change if this assumption is incorrect"),
});

const diagnosticResponseSchema = z.object({
  documentInventory: z.array(documentInventoryItemSchema).nullable().describe("List of all documents analyzed in this diagnostic"),
  clientRiskSnapshot: z.object({
    namedInsureds: z.string().nullable().describe("Primary named insured(s)"),
    properties: z.array(z.string()).nullable().describe("Property addresses found in the documents"),
    vehicles: z.array(z.string()).nullable().describe("Vehicles found in the documents (year/make/model)"),
    carriers: z.array(z.string()).nullable().describe("Insurance carriers identified"),
    estimatedNetWorth: z.number().nullable().describe("Client's estimated net worth from context or advisor input"),
    domainsCovered: z.array(z.string()).nullable().describe("Coverage domains found in the documents"),
    domainsMissing: z.array(z.string()).nullable().describe("Coverage domains that appear to be missing"),
    protectionReadiness: z.enum(["ADEQUATE", "NEEDS_ATTENTION", "AT_RISK"]).nullable().describe("Overall protection readiness assessment"),
    immediateAdvisorFocus: z.array(z.string()).nullable().describe("Top 3 issues the advisor should focus on immediately"),
  }).nullable().describe("High-level snapshot of the client's risk profile"),
  dataQualityGates: z.object({
    documentSufficiency: z.array(gateSchema).nullable().describe("Document quality checks"),
    analysisSafety: z.array(gateSchema).nullable().describe("Analysis safety checks"),
    missingContextFlags: z.array(missingFlagSchema).nullable().describe("Context items that are missing but would improve the analysis"),
  }).nullable().describe("Quality gate results indicating analysis reliability"),
  coverageDomains: z.object({
    homeowners: z.record(z.unknown()).nullable().describe("Homeowners/Dwelling coverage details"),
    auto: z.record(z.unknown()).nullable().describe("Auto coverage details per vehicle"),
    umbrella: z.record(z.unknown()).nullable().describe("Umbrella/Excess liability coverage details"),
    valuableArticles: z.record(z.unknown()).nullable().describe("Valuable articles/inland marine coverage details"),
    carrierQuality: z.array(z.record(z.unknown())).nullable().describe("Carrier quality and AM Best rating information"),
  }).nullable().describe("Structured coverage data extracted from documents"),
  calculationEngine: z.object({
    umbrellaAdequacy: calculationResultSchema.describe("Whether umbrella limit is adequate given net worth"),
    dwellingReplacementCost: calculationResultSchema.describe("Whether Coverage A meets estimated replacement cost"),
    autoLiabilityAdequacy: calculationResultSchema.describe("Whether auto liability limits are appropriate"),
    deductibleOptimization: calculationResultSchema.describe("Whether deductibles are optimized for the client's situation"),
    valuableArticlesAdequacy: calculationResultSchema.describe("Whether valuable articles coverage is sufficient"),
  }).nullable().describe("Calculation results comparing current coverage to recommended thresholds"),
  domainScores: z.object({
    homeowners: domainScoreSchema.nullable().describe("Homeowners coverage score"),
    auto: domainScoreSchema.nullable().describe("Auto coverage score"),
    umbrella: domainScoreSchema.nullable().describe("Umbrella coverage score"),
    valuableArticles: domainScoreSchema.nullable().describe("Valuable articles coverage score"),
    carrierQuality: domainScoreSchema.nullable().describe("Carrier quality score"),
    weightedOverall: z.number().nullable().describe("Weighted overall coverage adequacy score (0-10)"),
  }).nullable().describe("Coverage adequacy scores by domain"),
  riskFlags: z.array(riskFlagSchema).nullable().describe("All identified coverage risks, ordered by priority"),
  recommendations: z.array(recommendationSchema).nullable().describe("Prioritized list of recommendations for the advisor"),
  referralBrief: z.object({
    priorities: z.array(referralPrioritySchema).nullable().describe("Priority items for the P&C producer referral"),
    quoteRequests: z.array(z.string()).nullable().describe("Specific quotes to request from the P&C producer"),
    advisorNotes: z.string().nullable().describe("Notes for the advisor to use in the referral conversation"),
  }).nullable().describe("Referral brief for the P&C producer"),
  advisorReport: z.string().nullable().describe("Full narrative report written for the wealth advisor"),
  clientSummary: z.string().nullable().describe("Client-facing summary that can be shared directly"),
  assumptions: z.array(assumptionSchema).nullable().describe("Assumptions made during the analysis and their potential impact"),
  questionsToAskClient: z.array(z.string()).nullable().describe("Questions the advisor should ask the client to improve the analysis"),
});

export type DiagnosticResponse = z.infer<typeof diagnosticResponseSchema>;

async function extractTextFromBuffer(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (mimetype === "text/plain" || mimetype === "text/csv") {
    return buffer.toString("utf-8");
  }

  if (mimetype.startsWith("image/")) {
    return "[Image file uploaded — please describe the key coverage details visible in this document for analysis]";
  }

  return buffer.toString("utf-8");
}

function normalizeAnalysis(raw: string): DiagnosticResponse {
  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
  } catch {
    logger.warn("Insurance analysis returned non-JSON, wrapping as fallback");
    return {
      documentInventory: null,
      clientRiskSnapshot: {
        namedInsureds: null,
        properties: null,
        vehicles: null,
        carriers: null,
        estimatedNetWorth: null,
        domainsCovered: null,
        domainsMissing: ["All"],
        protectionReadiness: "AT_RISK",
        immediateAdvisorFocus: ["Unable to parse analysis — please re-upload documents"],
      },
      dataQualityGates: null,
      coverageDomains: null,
      calculationEngine: null,
      domainScores: null,
      riskFlags: null,
      recommendations: null,
      referralBrief: null,
      advisorReport: raw,
      clientSummary: raw,
      assumptions: null,
      questionsToAskClient: null,
    } as DiagnosticResponse;
  }

  const result = diagnosticResponseSchema.safeParse(parsed);
  if (result.success) {
    return result.data;
  }

  logger.warn({ errors: result.error.flatten() }, "Diagnostic response had validation issues, passing through with nulls for missing fields");
  const nullDefaults: Record<string, unknown> = {
    documentInventory: null,
    clientRiskSnapshot: null,
    dataQualityGates: null,
    coverageDomains: null,
    calculationEngine: null,
    domainScores: null,
    riskFlags: null,
    recommendations: null,
    referralBrief: null,
    advisorReport: null,
    clientSummary: null,
    assumptions: null,
    questionsToAskClient: null,
  };
  const merged = { ...nullDefaults, ...parsed };
  const retryResult = diagnosticResponseSchema.safeParse(merged);
  if (retryResult.success) {
    return retryResult.data;
  }

  logger.warn("Merged payload still invalid, returning nulls with available text fields");
  return {
    ...nullDefaults,
    advisorReport: typeof parsed.advisorReport === "string" ? parsed.advisorReport : null,
    clientSummary: typeof parsed.clientSummary === "string" ? parsed.clientSummary : null,
  } as DiagnosticResponse;
}

const SYSTEM_PROMPT = `You are P&C Shield, OneDigital's Personal Lines Insurance Diagnostic Engine. You operate within OneDigital Wealth Advisors. Your mission: Transform uploaded insurance documents (dec pages, full policies, CLUE reports) into comprehensive, calculation-backed diagnostic reports that help wealth advisors identify coverage gaps, drive P&C referrals, and serve clients with genuine expert analysis — not generic commentary.

The wealth advisor is NOT a P&C specialist. They use this tool to identify meaningful risks, start an intelligent conversation, and make a warm referral to a P&C producer. Every output must equip them to do exactly that.

You MUST follow the 11-step orchestrated workflow:

═══ STEP 0: DOCUMENT INTAKE & CLASSIFICATION ═══
For each uploaded document, identify: document type (Dec page / Full policy / CLUE report / Endorsement / Other), carrier name, policy number, policy period, named insured(s), coverage domain (HO / Auto / Umbrella / Valuable Articles / Other), and document completeness (Complete / Partial / Poor quality).

═══ STEP 1: CLIENT RISK SNAPSHOT ═══
Extract: Named Insured(s), Property Address(es), Vehicle(s) (year/make/model), Carrier(s), Estimated Net Worth (from context or advisor input — CRITICAL for liability analysis), Domains Covered vs Missing, Protection Readiness (Adequate / Needs Attention / At Risk), Immediate Advisor Focus (top 3 issues).

═══ STEP 2: DATA QUALITY & READINESS GATES ═══
A. Document Sufficiency: At least one policy/dec page present? Named insured(s) identifiable? Policy limits extractable? Policy period current?
B. Analysis Safety: HO Coverage A present? Auto BI liability present? Umbrella limit present if auto/HO also present? Net worth context available?
C. Missing Context: Flag but don't block — home sq footage, net worth, CLUE report, valuable articles inventory.

═══ STEP 3: COVERAGE DOMAIN EXTRACTION ═══
Extract ALL structured coverage data across five domains. Mark "NOT AVAILABLE" if not in documents.

Domain 1 — Homeowners/Dwelling: Coverage A (Dwelling), B (Other Structures), C (Personal Property), D (Loss of Use), E (Personal Liability), F (Medical Payments), All Perils Deductible, Wind/Hail Deductible, Flood/Earthquake Endorsements, Replacement Cost (Dwelling & Contents), Extended/Guaranteed Replacement Cost, Annual Premium, Inflation Guard, Water Backup, Home Business.

Domain 2 — Auto (per vehicle): Year/Make/Model, BI Per Person, BI Per Occurrence, Property Damage, UM/UIM Per Person, UM/UIM Per Occurrence, Med Pay/PIP, Collision/Comp Deductibles, Rental Reimbursement, Roadside, Gap Coverage, Annual Premium.

Domain 3 — Umbrella: Umbrella Limit, Retained Limit/SIR, Underlying Auto/HO Requirements, Whether Met, Named Insureds Covered, Rental Properties, Business Activities Exclusion, Annual Premium.

Domain 4 — Valuable Articles: Scheduled items by category (Jewelry, Fine Art, Collectibles, etc.) with limits and last appraisal dates, HO Unscheduled Sub-limit, Blanket Floater.

Domain 5 — Carrier Quality: For each carrier — AM Best Rating, Outlook, Admitted/Non-Admitted status, Standard/Non-Standard, Guaranty Fund Coverage.

═══ STEP 4: CARRIER QUALITY ASSESSMENT ═══
AM Best Rating Scale:
A++/A+ Superior = ✅ Exceeds Standard | A/A- Excellent = ✅ Meets Standard | B++/B+ Good = ⚠️ Borderline | B/B- Fair = 🔴 Below Standard | C or below = 🔴 Immediate Concern | NR = ⚠️ Cannot assess
Admitted = ✅ Standard (guaranty fund) | Non-Admitted/Surplus Lines = ⚠️ Flag (NO guaranty fund)

═══ STEP 5.5: CALCULATION ENGINE — RUN BEFORE SCORING — CRITICAL ═══
ALL calculations must complete BEFORE any domain scores or risk flags. No heuristics. Show ALL math.

CALCULATION A: UMBRELLA ADEQUACY
1. Total Liability Exposure = Net Worth (+ Future Income PV if provided)
2. Current Total Liability Stack = HO Liability (Coverage E) + Auto BI (per occurrence) + Umbrella Limit
3. Gap = Total Exposure - Total Liability Coverage (positive = underprotected)
4. Coverage-to-Exposure Ratio = Total Coverage / Total Exposure × 100%
5. Threshold: Industry best practice ≥ 100% of net worth; OneDigital standard ≥ net worth + 1 tier above
6. Underlying Requirements Check: Verify auto BI and HO liability meet umbrella's stated requirements. ⚠️ CRITICAL: If underlying requirements NOT met, umbrella may not respond to a claim.

CALCULATION B: DWELLING REPLACEMENT COST VALIDATION
1. Current Insured Value = Coverage A × (1 + Extended Replacement Cost %)
2. Estimated Rebuild Cost = sq ft × regional cost/sqft ($200-$350 standard, $350-$600+ luxury) + detached structures + site prep (10-15%) + debris removal (5%)
3. Dwelling Coverage Gap = Estimated Rebuild Cost - Effective Max Coverage
4. ITV Ratio = Coverage A / Estimated Rebuild Cost × 100%
5. Thresholds: ≥100% Adequate ✅ | 80-99% Borderline ⚠️ | <80% Coinsurance trigger 🔴
6. Inflation Guard: Compare guard rate vs 6-8% construction inflation. Calculate years until 10% underinsurance.

CALCULATION C: AUTO LIABILITY ADEQUACY
1. Current limits as split: $X/$Y/$Z
2. vs State minimums (flag if at minimum)
3. Asset-based: BI Per Occurrence should ≥ net worth (no umbrella) or meet umbrella underlying requirement
4. UM/UIM: Should equal or exceed BI limits. Gap = BI - UM/UIM.
5. Verdict: ADEQUATE / ⚠️ REVIEW / 🔴 MATERIAL CONCERN

CALCULATION D: DEDUCTIBLE OPTIMIZATION
1. HO: Current deductible, raise to next tier, estimated 5-15% savings per tier, break-even = additional risk / annual savings (flag if >5 years)
2. Flag if deductible <$2,500 for net worth >$1M: likely suboptimal
3. Wind/hail % deductible: convert to dollar amount (% × Coverage A)
4. Auto: For vehicles >5 years old or value <$8,000, check if comp/collision is cost-effective (flag if annual premium >10% of vehicle value)

CALCULATION E: VALUABLE ARTICLES ADEQUACY
1. Total scheduled value vs HO unscheduled sub-limit (typically $1,500-$5,000)
2. Appraisals >3 years old: flag as likely underinsured (jewelry/art appreciates 3-8% annually)
3. Blanket vs Scheduled assessment
4. Coverage gap = estimated total high-value property - total scheduled coverage

═══ STEP 6: DOMAIN SCORING — AFTER CALCULATIONS ONLY ═══
Scoring Rubric (calculation-backed criteria):
9-10 Excellent: All thresholds exceeded, no material gaps
7-8 Good: Minor gaps only, primary exposures covered
5-6 Adequate: Meets minimums, moderate optimization opportunities
3-4 Needs Attention: Calculated gap 10-25% of exposure
1-2 Critical: Calculated gap >25% of exposure OR compliance failure

Domain weights: Homeowners 30% | Auto 20% | Umbrella 30% | Valuable Articles 10% | Carrier Quality 10%
Weighted Overall = sum of (domain score × weight)

Protection Readiness: 7.0-10.0 ADEQUATE (green) | 4.0-6.9 NEEDS_ATTENTION (yellow) | 0.0-3.9 AT_RISK (red)

═══ STEP 7: RISK FLAG ASSIGNMENT (POST-CALCULATION ONLY) ═══
For each risk: 1) Reference the calculation 2) Quantify gap in $ or % 3) Assess vs client's net worth 4) Assign priority:
🔴 CRITICAL: Gap >25% of net worth OR underlying requirement failure
🔴 HIGH: Gap 10-25% OR AM Best below standard OR non-admitted carrier
🟡 MEDIUM: Gap 5-10% OR suboptimal deductible OR appraisal gap
🟢 LOW: Optimization opportunity, no material current gap

═══ STEP 8: RECOMMENDATIONS & REFERRAL BRIEF ═══
Each recommendation: Priority, Finding (specific gap with $ from calculations), Context (why it matters for THIS client), Recommended Action, Referral Language (exact wording for advisor), Expected Impact (quantified), Urgency.
P&C Referral Brief: Client name, carriers, total premium, top priorities with current→recommended values, quote requests, advisor notes for producer.

═══ STEP 9: ADVISOR REPORT (TECHNICAL) ═══
Sections: Document Inventory, Client Risk Snapshot, Data Quality Gates, Carrier Assessment, Calculation Audit (ALL math shown), Domain Scores with rationale, Risk Flags with calculation references, Recommendations with referral language, P&C Referral Brief, Evidence Pointer Table, Assumptions Used, Questions to Ask Client.

═══ STEP 10: CLIENT SUMMARY (PLAIN LANGUAGE) ═══
RULES — No jargon: "BI/PD"→"auto liability coverage", "ITV ratio"→"whether your home is insured for rebuild cost", "AM Best A-"→"strong financial rating", "SIR"→"amount you pay before umbrella kicks in", "Non-admitted"→"insurance company not covered by state backup fund".
No dollar gaps from calculations in client version. Use qualitative framing: "We found an opportunity to make sure your home coverage keeps pace with today's rebuild costs."
Status mapping: 7-10→Green "Looking Good" | 4-6→Yellow "Some Attention Needed" | 1-3→Red "Needs Review"

═══ STEP 11: SANITY CHECK ═══
Verify: Document inventory complete, all calculations shown with inputs/formula/result, umbrella gap calculated, dwelling ITV calculated, scores assigned AFTER calculations, risk flags have dollar gaps, carrier quality assessed, referral brief generated, client summary jargon-free.

═══ PROHIBITED SHORTCUTS ═══
- "Liability limits seem low" without calculation → MUST run Calc A
- Scoring without calculations → MUST run Step 5.5 first
- "Home may be underinsured" without math → MUST run Calc B
- UM/UIM gap without comparison → MUST run Calc C
- Carrier quality without AM Best → MUST run Step 4
- Risk flag without dollar amount → MUST quantify gap
- Deductible recommendation without break-even → MUST run Calc D
- Client summary with dollar gaps → MUST use qualitative framing only

Your response MUST be valid JSON matching this schema exactly. EVERY field must be explicitly present — use null when data is unavailable, NEVER omit a field.

RESPONSE SCHEMA (all fields nullable — return null when data is unavailable):
{
  "documentInventory": [
    {
      "documentType": "one of: Dec Page | Full Policy | CLUE Report | Endorsement | Other",
      "carrier": "string | null",
      "policyNumber": "string | null",
      "policyPeriod": "string | null",
      "namedInsureds": "string | null",
      "coverageDomain": "one of: HO | Auto | Umbrella | Valuable Articles | Other",
      "completeness": "one of: Complete | Partial | Poor Quality"
    }
  ],
  "clientRiskSnapshot": {
    "namedInsureds": "string | null",
    "properties": ["string"] or null,
    "vehicles": ["string"] or null,
    "carriers": ["string"] or null,
    "estimatedNetWorth": number or null,
    "domainsCovered": ["string"] or null,
    "domainsMissing": ["string"] or null,
    "protectionReadiness": "one of: ADEQUATE | NEEDS_ATTENTION | AT_RISK",
    "immediateAdvisorFocus": ["string"] or null
  },
  "dataQualityGates": {
    "documentSufficiency": [{"gate": "string | null", "passed": true or null}] or null,
    "analysisSafety": [{"gate": "string | null", "passed": true or null}] or null,
    "missingContextFlags": [{"item": "string | null", "impact": "string | null"}] or null
  },
  "coverageDomains": {
    "homeowners": {"coverageA": "$amount", "coverageB": "$amount", "coverageC": "$amount", "coverageD": "$amount", "coverageE": "$amount", "coverageF": "$amount", "allPerilsDeductible": "$amount", "windHailDeductible": "$amount", "floodEndorsement": "Yes/No", "earthquakeEndorsement": "Yes/No", "replacementCostDwelling": "Yes/No/ACV", "replacementCostContents": "Yes/No/ACV", "extendedReplacementCost": "Yes/No/%", "guaranteedReplacementCost": "Yes/No", "annualPremium": "$amount", "inflationGuard": "Yes/No/%", "waterBackup": "Yes/No/Limit", "homeBusiness": "Yes/No"},
    "auto": {"vehicles": [{"yearMakeModel": "string", "biPerPerson": "$amount", "biPerOccurrence": "$amount", "propertyDamage": "$amount", "umUimPerPerson": "$amount", "umUimPerOccurrence": "$amount", "medPay": "$amount", "collisionDeductible": "$amount", "compDeductible": "$amount", "rentalReimbursement": "Yes/No/$amt", "roadsideAssistance": "Yes/No", "gapCoverage": "Yes/No", "annualPremium": "$amount"}]},
    "umbrella": {"umbrellaLimit": "$amount", "retainedLimit": "$amount", "underlyingAutoReq": "string", "underlyingHoReq": "string", "underlyingRequirementsMet": "Yes/No/Unknown", "namedInsuredsCovered": ["string"], "rentalPropertiesCovered": "Yes/No/Count", "businessActivitiesExclusion": "Yes/No", "annualPremium": "$amount"},
    "valuableArticles": {"scheduledItems": [{"category": "string", "scheduled": true, "limit": "$amount", "lastAppraisal": "string", "premium": "$amount"}], "hoUnscheduledSubLimit": "$amount", "blanketFloater": "Yes/No/$amount"},
    "carrierQuality": [{"carrierName": "string", "amBestRating": "string", "amBestOutlook": "string", "admittedStatus": "string", "standardStatus": "string", "guarantyFundCoverage": "string", "claimsIssues": "string", "oneDigitalStandard": "string", "flagLevel": "string"}]
  },
  "calculationEngine": {
    "umbrellaAdequacy": {"totalExposure": number or null, "totalLiabilityCoverage": number or null, "gap": number or null, "coverageToExposureRatio": number or null, "status": "one of: ADEQUATE | INSUFFICIENT | NOT_AVAILABLE", "underlyingRequirementsMet": boolean or null, "narrative": "string with full calculation | null"},
    "dwellingReplacementCost": {"coverageA": number or null, "effectiveMaxCoverage": number or null, "estimatedRebuildCost": number or null, "dwellingCoverageGap": number or null, "insuredToValueRatio": number or null, "inflationGuardAdequate": boolean or null, "status": "one of: ADEQUATE | INSUFFICIENT | NOT_AVAILABLE", "narrative": "string with full calculation | null"},
    "autoLiabilityAdequacy": {"biPerPerson": number or null, "biPerOccurrence": number or null, "propertyDamage": number or null, "meetsUmbrellaRequirement": boolean or null, "umUimGap": number or null, "status": "one of: ADEQUATE | INSUFFICIENT | NOT_AVAILABLE", "narrative": "string with full calculation | null"},
    "deductibleOptimization": {"hoDeductible": number or null, "hoBreakEvenYears": number or null, "autoDeductibleNotes": "string | null", "hoVerdict": "string | null", "autoVerdict": "string | null", "narrative": "string with full calculation | null"},
    "valuableArticlesAdequacy": {"totalScheduledValue": number or null, "unscheduledSubLimit": number or null, "coverageGap": number or null, "appraisalsCurrent": boolean or null, "verdict": "string | null", "narrative": "string with full calculation | null"}
  },
  "domainScores": {
    "homeowners": {"score": number 1-10 or null, "rationale": "string referencing calculations | null"},
    "auto": {"score": number 1-10 or null, "rationale": "string referencing calculations | null"},
    "umbrella": {"score": number 1-10 or null, "rationale": "string referencing calculations | null"},
    "valuableArticles": {"score": number 1-10 or null, "rationale": "string referencing calculations | null"},
    "carrierQuality": {"score": number 1-10 or null, "rationale": "string referencing assessment | null"},
    "weightedOverall": number 0.0-10.0 or null
  },
  "riskFlags": [
    {
      "name": "string | null",
      "domain": "one of: HO | Auto | Umbrella | Valuable Articles | Liability | Other",
      "priority": "one of: CRITICAL | HIGH | MEDIUM | LOW",
      "calculatedGap": "string | null",
      "calculatedGapDollars": number or null,
      "clientContext": "string | null",
      "evidence": "string | null",
      "consequence": "string | null",
      "referralAction": "string | null"
    }
  ],
  "recommendations": [
    {
      "priority": "one of: CRITICAL | HIGH | MEDIUM | LOW",
      "finding": "string | null",
      "context": "string | null",
      "recommendedAction": "string | null",
      "referralLanguage": "string | null",
      "expectedImpact": "string | null",
      "urgency": "one of: Immediate | Within 30 days | Next renewal | Informational"
    }
  ],
  "referralBrief": {
    "priorities": [{"issue": "string | null", "currentValue": "string | null", "recommendedValue": "string | null", "whyNow": "string | null"}] or null,
    "quoteRequests": ["string"] or null,
    "advisorNotes": "string | null"
  },
  "advisorReport": "Full technical advisor report as markdown string | null",
  "clientSummary": "Plain language client summary (no jargon, no dollar gaps) | null",
  "assumptions": [{"item": "string | null", "valueUsed": "string | null", "source": "string | null", "impactIfWrong": "string | null"}] or null,
  "questionsToAskClient": ["string"] or null
}

CRITICAL RULES FOR NULL HANDLING:
- EVERY field must be explicitly present in the response. Never omit a field.
- Use null when data is unavailable or cannot be determined from documents.
- Set any domain to null in coverageDomains if no documents were provided for it.
- Set calculation results to null if the domain data is unavailable.
- Be thorough in extracting every coverage field visible in the documents.`;

function buildDocumentPrompt(lineType: string, documentText: string, clientContext?: z.infer<typeof clientContextSchema>) {
  const contextLines: string[] = [];
  if (clientContext) {
    if (clientContext.totalAum) contextLines.push(`- Total AUM: $${Number(clientContext.totalAum).toLocaleString()}`);
    if (clientContext.netWorth) contextLines.push(`- Estimated Net Worth: $${Number(clientContext.netWorth).toLocaleString()}`);
    if (clientContext.netWorthSource) contextLines.push(`- Net Worth Source: ${clientContext.netWorthSource}`);
    if (clientContext.homeValue) contextLines.push(`- Home Value (market): $${Number(clientContext.homeValue).toLocaleString()}`);
    if (clientContext.homeSquareFootage) contextLines.push(`- Home Square Footage: ${clientContext.homeSquareFootage} sq ft`);
    if (clientContext.rebuildYear) contextLines.push(`- Home Rebuild Year: ${clientContext.rebuildYear}`);
    if (clientContext.numberOfVehicles) contextLines.push(`- Number of Vehicles: ${clientContext.numberOfVehicles}`);
    if (clientContext.vehicleDetails) contextLines.push(`- Vehicle Details: ${clientContext.vehicleDetails}`);
    if (clientContext.dependents) contextLines.push(`- Number of Dependents: ${clientContext.dependents}`);
    if (clientContext.occupation) contextLines.push(`- Occupation: ${clientContext.occupation}`);
    if (clientContext.state) contextLines.push(`- State: ${clientContext.state}`);
    if (clientContext.valuableArticlesEstimate) contextLines.push(`- Estimated Valuable Articles: $${Number(clientContext.valuableArticlesEstimate).toLocaleString()}`);
    if (clientContext.hasUmbrella !== undefined) contextLines.push(`- Has Umbrella Policy: ${clientContext.hasUmbrella ? "Yes" : "No / Unknown"}`);
    if (clientContext.additionalNotes) contextLines.push(`- Additional Notes: ${clientContext.additionalNotes}`);
  }

  const maxDocLength = 48000;
  const truncatedText = documentText.length > maxDocLength
    ? documentText.slice(0, maxDocLength) + "\n\n[Document text truncated at " + maxDocLength + " characters — analyze all visible data above]"
    : documentText;

  return `Run the full P&C Shield 11-step diagnostic workflow on the following insurance document(s). The focus area is ${lineType === "property" ? "Property" : "Casualty/Liability"}, but analyze ALL domains present in the documents.

Client Context:
${contextLines.length > 0 ? contextLines.join("\n") : "No additional client context provided. Use assumptions and flag them."}

Document Text:
"""
${truncatedText}
"""

CRITICAL INSTRUCTIONS:
1. Execute ALL 11 steps in order. Do not skip any step.
2. Extract EVERY coverage value visible in the documents for Step 3 — fill in all fields with actual extracted values, not placeholders.
3. Run ALL five calculations (A through E) in Step 5.5 BEFORE assigning any domain scores. Show all math with actual numbers in each narrative.
4. Domain scores MUST reflect the calculation results — never default to 0 or 7. Score based on the actual gaps found.
5. Generate specific, detailed risk flags with dollar-quantified gaps from your calculations.
6. The advisorReport must be a complete, multi-section technical markdown report.
7. The clientSummary must be a complete, jargon-free plain language summary.
8. If net worth is not provided, estimate based on AUM or flag it — do NOT leave umbrella adequacy uncalculated.
9. Return the COMPLETE JSON structure with all fields populated from your analysis.`;
}

export function registerInsuranceRoutes(app: Express) {
  app.post(
    "/api/insurance/analyze-upload",
    requireAuth,
    uploadLimiter,
    upload.array("files", 5),
    async (req: Request, res: Response) => {
      try {
        const advisor = await getSessionAdvisor(req);
        if (!advisor) return res.status(401).json({ error: "Unauthorized" });

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ error: "No files uploaded" });
        }

        const lineType = req.body.lineType || "property";
        if (!["property", "casualty"].includes(lineType)) {
          return res.status(400).json({ error: "lineType must be 'property' or 'casualty'" });
        }

        let clientContext: z.infer<typeof clientContextSchema> = undefined;
        if (req.body.clientContext) {
          try {
            const raw = typeof req.body.clientContext === "string"
              ? JSON.parse(req.body.clientContext)
              : req.body.clientContext;
            clientContext = clientContextSchema.parse(raw);
          } catch {
            logger.warn("Could not parse clientContext from upload");
          }
        }

        const extractedTexts: string[] = [];
        const fileNames: string[] = [];

        for (const file of files) {
          try {
            const text = await extractTextFromBuffer(file.buffer, file.mimetype);
            extractedTexts.push(`--- ${file.originalname} ---\n${text}`);
            fileNames.push(file.originalname);
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            logger.warn({ err: errMsg, filename: file.originalname }, "Failed to extract text from file");
            extractedTexts.push(`--- ${file.originalname} ---\n[Could not extract text from this file]`);
            fileNames.push(file.originalname);
          }
        }

        const combinedText = extractedTexts.join("\n\n");

        const userPrompt = buildDocumentPrompt(lineType, combinedText, clientContext);
        const raw = await chatCompletion(SYSTEM_PROMPT, userPrompt, true, 16384);
        const analysis = normalizeAnalysis(raw);

        return res.json({
          success: true,
          lineType,
          analysis,
          filesProcessed: fileNames,
          analyzedAt: new Date().toISOString(),
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error({ err: errMsg }, "Insurance upload analysis error");
        return res.status(500).json({ error: sanitizeErrorMessage(err, "Failed to analyze insurance documents") });
      }
    }
  );

  app.post("/api/insurance/analyze-document", requireAuth, async (req: Request, res: Response) => {
    try {
      const advisor = await getSessionAdvisor(req);
      if (!advisor) return res.status(401).json({ error: "Unauthorized" });

      const parsed = documentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }

      const { lineType, documentText, clientContext } = parsed.data;
      const userPrompt = buildDocumentPrompt(lineType, documentText, clientContext);
      const raw = await chatCompletion(SYSTEM_PROMPT, userPrompt, true, 16384);
      const analysis = normalizeAnalysis(raw);

      return res.json({
        success: true,
        lineType,
        analysis,
        analyzedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err: errMsg }, "Insurance document analysis error");
      return res.status(500).json({ error: sanitizeErrorMessage(err, "Failed to analyze insurance document") });
    }
  });
}
