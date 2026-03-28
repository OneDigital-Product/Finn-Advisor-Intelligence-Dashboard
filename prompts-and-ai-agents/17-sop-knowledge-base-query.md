# 17-sop-knowledge-base-query.md
## Function: querySopKnowledgeBase

**Purpose:** Retrieve accurate, custodian-specific Standard Operating Procedures and provide step-by-step execution guidance for operational tasks.

**Fiduciary Principle:** Operational accuracy prevents account errors, regulatory violations, and client harm. Every procedure must be precise, sourced, and up-to-date.

---

## 1. QUERY CLASSIFICATION FRAMEWORK

### 1.1 Query Type Detection

**Classify each query into one of four categories:**

| Query Type | Example | Response Structure | Urgency |
|---|---|---|---|
| **Procedural HOW-TO** | "How do I execute an account transfer at Schwab?" | Step-by-step instructions, prerequisites, timeline | MEDIUM |
| **Policy Clarification** | "What are the rules on fee-only advisory?" | Policy statement, applicability, exceptions | MEDIUM |
| **Compliance Requirement** | "Are we required to document suitability?" | Compliance rule, documentation requirement, timing | HIGH |
| **Escalation Path** | "Who do I contact if a trade fails?" | Contact person, phone/email, escalation procedure | VARIES |

### 1.2 Query Classification Logic

```
QUERY_TYPE = {
  IF contains_keywords("how", "what steps", "execute", "process"):
    RETURN "PROCEDURAL"
  IF contains_keywords("policy", "rule", "requirement", "must", "allowed"):
    RETURN "POLICY"
  IF contains_keywords("compliance", "documentation", "fiduciary", "regulatory"):
    RETURN "COMPLIANCE"
  IF contains_keywords("contact", "escalate", "issue", "problem", "failure"):
    RETURN "ESCALATION"
}
```

---

## 2. MULTI-SOURCE SOP RETRIEVAL

### 2.1 Knowledge Base Source Hierarchy

**Retrieve in this order of precedence:**

1. **Internal OneDigital Procedures**
   - KB Query: "Internal SOP for [procedure], OneDigital-specific steps"
   - Last updated date critical
   - Assumes OneDigital custody at specified custodian

2. **Custodian-Specific Instructions**
   - KB Query: "[Custodian] account transfer procedures, beneficiary update steps"
   - Custodian-specific process variations (different per institution)
   - Integration with OneDigital systems/portal

3. **Compliance Policies**
   - KB Query: "Compliance policy for [area], documentation requirements, SLA"
   - SEI and LST compliance overlays
   - Fiduciary documentation standards

4. **Regulatory Requirements**
   - KB Query: "Regulatory requirement for [area], filing deadlines, form requirements"
   - SEC, FINRA, state requirements
   - IRS filing requirements if tax-related

---

## 3. CUSTODIAN-SPECIFIC ROUTING

### 3.1 Custodian Identification

**First, identify which custodian is involved:**

```
CUSTODIAN_ID = {
  IF account_held_at("Charles Schwab", "schwab.com", "advisor.schwab.com"):
    ROUTE = "SCHWAB",
  IF account_held_at("Fidelity", "fidelity.com", "workplace.fidelity.com"):
    ROUTE = "FIDELITY",
  IF account_held_at("Vanguard", "vanguard.com", "www.vanguard.com"):
    ROUTE = "VANGUARD",
  IF account_held_at("Other"):
    ROUTE = "OTHER_CUSTODIAN"
}
```

### 3.2 Custodian-Specific Procedure Variations

#### SCHWAB (Charles Schwab)

**Portal/System:** AdviserCenter, Schwab Administrative Services

**Key Procedures:**

| Procedure | Portal Access | Approval Required | Timeline | Special Notes |
|---|---|---|---|---|
| **Account Transfer (ACAT)** | AdviserCenter > Accounts | Compliance approval for ACAT transfers out | 5-10 business days | Must include all account details (title, capacity) |
| **Beneficiary Update** | AdviserCenter > Account Settings | No approval needed (update immediately) | 1-2 business days | Can be done electronically; requires account owner ID |
| **Contribution/Withdrawal** | AdviserCenter > Actions > Fund | No approval for standard contributions | 1-3 business days | ACH vs. wire timing differs |
| **Rebalance/Trade** | AdviserCenter > Trading | UMA strategies: automated; manual: review required | 1 business day settlement | Same-day or next-day execution depending on trade time |
| **Fee Deduction** | AdviserCenter > Fee Settings | Compliance pre-approval required | Automatic monthly | Ensure AUM-based fee structure coded correctly |
| **Document/Signature Collection** | Schwab eSign portal | Electronic acceptable for most documents | 1-2 days | Some documents require wet signature (POA) |

**Schwab Specific Resources:**
- AdviserCenter Help: schwab.com/advisercenter/help
- Account Transfer Guide: schwab.com/acat-guide
- Compliance Portal: schwab.com/compliance-portal

**Common Schwab Issues & Troubleshooting:**
- ACAT rejection: Usually due to account title mismatch; verify exact name on both sides
- Fee deduction failure: Confirm AUM fee structure is active in AdviserCenter settings
- eSign rejection: Some account types require wet signature (request from Schwab)

#### FIDELITY (Fidelity Investments)

**Portal/System:** AdvisorCentral, Fidelity advisor tools

**Key Procedures:**

| Procedure | Portal Access | Approval Required | Timeline | Special Notes |
|---|---|---|---|---|
| **Account Transfer (ACAT)** | AdvisorCentral > Accounts > Transfer | Compliance review | 5-7 business days | Fidelity typically faster than Schwab; confirm receiving firm availability |
| **Beneficiary Update** | AdvisorCentral > Account Services | No approval needed | 1-2 business days | Can designate beneficiaries per account; IRA beneficiary rules differ |
| **Contribution/Withdrawal** | AdvisorCentral > Actions > Account Funding | No approval for standard contributions | 1-3 business days | MoneyLink and ACH available; wire available for large transfers |
| **Rebalance/Trade** | AdvisorCentral > Trading or UMA dashboard | UMA: automated per model; manual: trading authorization | 1 business day | Fidelity allows broader trading windows (pre/post market) |
| **Fee Deduction** | AdvisorCentral > Fee Settings > Billing | Compliance pre-approval required | Automatic (monthly/quarterly) | Ensure billing SMA account is designated |
| **Document Collection** | Fidelity DocuSign integration | Electronic acceptable | 1-2 days | Power of Attorney requires notarization at Fidelity |

**Fidelity Specific Resources:**
- AdvisorCentral Help: https://advisorcentral.fidelity.com
- ACAT Information: fidelity.com/acat
- Compliance Resources: fidelity.com/compliance

**Common Fidelity Issues & Troubleshooting:**
- Account funding delays: Confirm MoneyLink registration completed; if not, use wire
- UMA execution delays: Check model definition in UMA settings; confirm allocation percentages sum to 100%
- Fee billing errors: Verify SMA account designation; check billing frequency coding

#### VANGUARD

**Portal/System:** Vanguard Advisor Services, Portfolio Center

**Key Procedures:**

| Procedure | Portal Access | Approval Required | Timeline | Special Notes |
|---|---|---|---|---|
| **Account Transfer (ACAT)** | Vanguard Advisor Services > Account > Transfers | Compliance approval; Vanguard known for longer timelines | 10-15 business days | Vanguard can be slower; front-load timeline expectations |
| **Beneficiary Update** | Vanguard Advisor Services > Account Settings | No approval needed | 2-3 business days | Vanguard requires separate beneficiary forms for some account types |
| **Contribution/Withdrawal** | Vanguard Advisor Services > Account Funding | No approval for standard contributions | 2-3 business days | Wire or ACH; no MoneyLink available |
| **Rebalance/Trade** | Portfolio Center or Vanguard Advisor Services | Manual rebalances submitted to Vanguard; execution typically same day | 1-2 business days | No direct UMA available at Vanguard; rebalancing is manual directive |
| **Fee Deduction** | Vanguard Advisor Services > Fee Schedule | Compliance pre-approval required | Automatic (monthly) | Vanguard requires signed Fee Authorization Agreement |
| **Document Collection** | Paper or secure upload portal | Wet signature for POA; electronic for most others | 3-5 business days | POA must be notarized for Vanguard |

**Vanguard Specific Resources:**
- Vanguard Advisor Services: https://advisorservices.vanguard.com
- Account Transfer Guide: vanguard.com/acat
- Compliance: vanguard.com/compliance

**Common Vanguard Issues & Troubleshooting:**
- Slow ACAT processing: Vanguard's timelines are long; plan ahead, follow up at day 5 if not processed
- Fee deduction setup complexity: Requires signed Fee Authorization Agreement before fee deduction can activate
- Limited trading flexibility: Vanguard does not offer pre/post market trading; daily rebalancing may not be possible

#### OTHER CUSTODIANS

**For non-Schwab/Fidelity/Vanguard custodians:**

**Process:**
1. KB Query: "[Custodian Name] account procedures, SOP, customer service contact"
2. If not found in KB: Contact custodian directly for SOP documentation
3. Document procedure in internal KB for future reference
4. Note: timelines and processes vary significantly

**Example custodian query:** "We have client accounts at E*TRADE. How do we execute account transfers and beneficiary updates?"

---

## 4. STEP-BY-STEP PROCEDURE GENERATION

### 4.1 Procedure Documentation Template

**For every procedure, document:**

```
PROCEDURE_DOCUMENTATION = {
  procedure_name: [exact name],
  custodian: [custodian name],
  last_updated: [date],
  update_frequency: [annually/quarterly/as-needed],

  prerequisites: [
    "Requirement 1",
    "Requirement 2"
  ],

  required_permissions: [
    "Permission type 1 (e.g., Account Owner must authorize)",
    "Permission type 2"
  ],

  step_by_step: [
    {
      step_number: 1,
      action: "Log in to [portal]",
      detail: "Use [credential type], navigate to [location]",
      expected_result: "Authenticated to [portal]"
    },
    {
      step_number: 2,
      action: "Locate account transfer section",
      detail: "Click [location] > [sublocation]",
      expected_result: "[Screen name] appears"
    }
    // ... continue for all steps
  ],

  required_documents: [
    {
      document: "Account Transfer Form (ACAT)",
      source: "[custodian] or third party",
      delivery_method: "Paper mail or electronic",
      processing_time: "Custodian completion"
    }
  ],

  timeline: {
    best_case: "[X business days]",
    typical_case: "[X-Y business days]",
    worst_case: "[Y+ business days]",
    drivers_of_delay: ["Incomplete form submission", "Account title mismatch"]
  },

  sla: "[OneDigital SLA if applicable]",

  common_pitfalls: [
    {
      pitfall: "[Description]",
      cause: "[Why it happens]",
      prevention: "[How to avoid]"
    }
  ],

  troubleshooting: [
    {
      error: "[Error message or situation]",
      cause: "[Root cause]",
      resolution: "[Step-by-step fix]"
    }
  ],

  escalation_contact: {
    first_line: "[Custodian support phone/email]",
    second_line: "[Custodian account manager]",
    onedigital_escalation: "[OneDig internal contact]"
  }
}
```

### 4.2 Example: Account Transfer (ACAT) at Schwab

```
PROCEDURE: Account Transfer (ACAT) at Charles Schwab

PREREQUISITES:
  ✓ Receiving firm (OneDigital) has account relationship active at Schwab
  ✓ Account owner has authorized the transfer
  ✓ Account to be transferred is in compliance (no open litigation, liens, etc.)
  ✓ All pending trades must be settled before transfer initiates

REQUIRED PERMISSIONS:
  ✓ Account owner/authorized representative: Written authorization (eSign acceptable)
  ✓ Compliance review: Internal sign-off on transfer eligibility
  ✓ Receiving firm setup: OneDigital must be established as authorized contact

STEP-BY-STEP INSTRUCTIONS:

Step 1: Prepare Transfer Request
  Action: Complete Schwab Account Transfer (ACAT) form
  Detail: Obtain form from client or AdviserCenter >  Accounts > Transfer
  Expected Result: Signed ACAT form with all account details
  Time: 15 minutes to complete

Step 2: Submit Transfer Request to Schwab
  Action: Log into AdviserCenter and navigate to Accounts > Transfer > Initiate ACAT
  Detail: Enter account title exactly as appears on statement, account number, transfer type (full/partial)
  Expected Result: Transfer request submitted; confirmation number generated
  Time: 5 minutes

Step 3: Schwab Processing Begins
  Action: Monitor transfer status in AdviserCenter
  Detail: Schwab will generate ACAT notice and notify both firms
  Expected Result: ACAT status shows "In Progress" in AdviserCenter
  Time: 1-2 business days

Step 4: Receiving Firm (OneDigital) Receives Assets
  Action: Operations team receives and posts assets to new account
  Detail: Verify asset inventory matches transfer documentation
  Expected Result: Assets appear in OneDigital account; client confirms in portal
  Time: 5-10 business days from ACAT submission

Step 5: Close Schwab Account (if full transfer)
  Action: Confirm with client that all assets received; coordinate account closure
  Detail: Schwab may hold account open briefly; request closure in writing if needed
  Expected Result: Schwab account closed; confirmation received
  Time: 2-5 business days post-transfer completion

REQUIRED DOCUMENTS:
  Document: Account Transfer Form (ACAT)
  Source: Schwab or third party
  Delivery: Electronic via eSign or paper mail
  Processing: Custodian completion

TIMELINE:
  Best Case: 5 business days (all information correct, no complications)
  Typical Case: 7-10 business days
  Worst Case: 15+ business days (account title mismatch, pending transactions)

OneDigital SLA: Initiate transfer within 2 business days of client request; monitor weekly

COMMON PITFALLS:
  Pitfall 1: Account Title Mismatch
    Cause: Client account title at Schwab differs from OneDigital account title (trust, LLC, etc.)
    Prevention: Verify exact account titles on both firms' documents before submitting ACAT
    Resolution: Contact Schwab; request ACAT amendment with correct title

  Pitfall 2: Pending Trades Not Settled
    Cause: Recent trade activity still settling at source firm
    Prevention: Request client confirms no pending trades; wait for settlement if trades pending
    Resolution: Wait for settlement; resubmit ACAT once trades clear

  Pitfall 3: Account with Liens or Holds
    Cause: Court order, IRS levy, or creditor lien on account
    Prevention: Screen account prior to transfer; resolve any encumbrances
    Resolution: Contact Schwab legal; resolve lien before transfer can proceed

TROUBLESHOOTING:
  Error: "ACAT Rejected - Account Title Mismatch"
    Cause: Name on receiving form doesn't match Schwab account records exactly
    Resolution:
      1. Verify exact account title on Schwab statement
      2. Contact Schwab to confirm account registration name
      3. Resubmit ACAT with corrected title
      4. Timeline: +5 business days

  Error: "ACAT Status Stalled - Pending Clearance"
    Cause: Schwab waiting on internal compliance or receiving firm confirmation
    Resolution:
      1. Check email for any Schwab requests for information
      2. If stalled >7 days, contact Schwab directly
      3. Provide any missing documentation immediately
      4. Timeline: +3-5 business days

  Error: "Assets Transferred but Positions Liquidated"
    Cause: Some securities (fractional shares, foreign securities) cannot transfer in-kind
    Prevention: Confirm all holdings are transferable before ACAT submission
    Resolution:
      1. Accept liquidation and proceeds transfer; reinvest per strategy
      2. Or: Liquidate manually before ACAT, transfer cash (easier)
      3. Timeline: Same-day after liquidation proceeds clear

ESCALATION:
  First Line: Schwab Client Service
    Phone: 1-800-515-2157 (AdviserCenter Support)
    Email: support@advisercenter.schwab.com
    Purpose: Status checks, minor issues, documentation requests

  Second Line: Schwab Account Manager
    Contact: [Assign account manager for your firm's book]
    Purpose: Escalation on rejected/stalled transfers

  OneDigital Internal Escalation:
    Contact: [Operations Manager] if Schwab non-responsive
    Action: May escalate to firm-level relationship manager at Schwab
```

---

## 5. VERSION AWARENESS & CURRENCY

### 5.1 SOP Currency Checking

**Before providing procedure, verify:**

```
VERSION_CHECK = {
  last_updated: [date],
  update_recency: [days since last update],

  IF update_recency > 180_days:
    FLAG: "SOP may be outdated. Custodian has made changes. Recommend verification.",
    ACTION: "Contact custodian to confirm current process.",

  IF update_recency > 365_days:
    FLAG: "SOP is stale. Significant custodian changes possible.",
    ACTION: "Do not execute without direct custodian verification.",
    ESCALATE: true
}
```

**Include in Output:**

> "This procedure was last updated on [DATE]. We recommend confirming current requirements with [Custodian] as their systems and processes may have changed. As of [current date], this represents [Months] since last review."

---

## 6. COMPLIANCE OVERLAY

### 6.1 Compliance Checkpoints Per Procedure

**For every procedure, identify compliance requirements:**

| Procedure | Compliance Requirement | Documentation Needed | Approval Authority | Deadline |
|---|---|---|---|---|
| Account Transfer | ACAT compliance, Know Your Customer re-verification | Signed ACAT form, account verification | Compliance officer | Before transfer initiation |
| Beneficiary Update | Beneficiary designation compliance, tax ID verification | Beneficiary forms with SSN, relationship | Account services | Immediate |
| Fee Deduction | Fiduciary documentation, fee arrangement written agreement | Fee agreement signed by client | Compliance officer | Before fee deduction activates |
| Trade Execution | Suitability, best execution, order handling | Suitability documentation, trade ticket | Compliance/supervisor | At time of trade |
| Account Opening | AML/KYC, beneficial ownership, accredited investor (if applicable) | Account application, identity verification, AML docs | Compliance officer | Before account becomes active |

**Compliance Pre-Check Before Procedure Execution:**

```
COMPLIANCE_CHECKLIST = {
  documentation_complete: [verify yes/no],
  approvals_obtained: [verify yes/no],
  client_authorization_current: [verify yes/no],
  suitability_documented: [if applicable, verify yes/no],
  conflict_of_interest_disclosed: [if applicable, verify yes/no],
  proceed: [yes/no based on checklist]
}
```

---

## 7. CROSS-REFERENCE RELATED SOPs

### 7.1 Procedure Dependency Mapping

**Example: Account Transfer (ACAT) may require related procedures:**

- Account Transfer (ACAT) depends on:
  - Account Opening (must have receiving account ready)
  - AML/KYC documentation (new custodian may require verification)
  - Beneficiary Designation (should align with existing designations)

- Account Transfer (ACAT) may trigger:
  - Old Account Closure (post-transfer)
  - Fee Deduction Setup (new custodian fee billing)
  - Model/Strategy Implementation (portfolio rebalancing to strategy)

**Auto-Include Related SOPs:**

> "You've asked about Account Transfer. You may also need:
> - New Account Opening Procedure (for receiving firm)
> - Beneficiary Designation Update (recommend reviewing post-transfer)
> - Fee Deduction Setup (if moving to new custodian)
> Would you like details on any of these?"

---

## 8. CONFIDENCE SCORING

### 8.1 Answer Confidence Assessment

**Rate confidence of SOP answer:**

```
CONFIDENCE_SCORE = (
  Source_Authority × 0.4 +        [KB internal vs. custodian vs. inferred]
  Recency × 0.3 +                 [How current is documentation]
  Specificity × 0.2 +             [How detailed/exact]
  Custodian_Verification × 0.1    [Direct from custodian vs. inferred]
)

CONFIDENCE_TIER = {
  0.90-1.0: "Direct from custodian documentation, recent, verified",
  0.75-0.90: "From internal KB, recently updated, custodian-confirmed",
  0.60-0.75: "From internal KB, may need verification with custodian",
  <0.60: "Inferred from similar procedures, recommend custodian verification"
}
```

**Always Disclose Confidence:**

> "This procedure is HIGHLY CONFIDENT (verified against current [Custodian] documentation, updated [date]). However, [Custodian] may make changes; recommend confirming with them if unusual circumstances."

OR

> "This procedure is MODERATELY CONFIDENT (based on internal SOP, last updated [date]). As [Custodian] frequently updates processes, confirm current requirements before execution."

---

## 9. KNOWLEDGE BASE RETRIEVAL TRIGGERS

**Retrieve BEFORE SOP Query Response:**

1. **Internal OneDigital SOPs**
   - KB Query: "[Procedure] SOP, OneDigital-specific process steps, last updated date"

2. **Custodian-Specific Procedures**
   - KB Query: "[Custodian] [procedure] instructions, portal navigation, timelines"

3. **Compliance Requirements**
   - KB Query: "[Procedure] compliance requirement, documentation, approval authority"

4. **Regulatory Requirements**
   - KB Query: "[Procedure] regulatory requirement, SEC/FINRA/state rules, filing deadlines"

5. **Common Issues & Troubleshooting**
   - KB Query: "[Custodian] [procedure] common issues, rejection reasons, resolution steps"

---

## 10. OUTPUT SPECIFICATION

### 10.1 SOP Response Format (Advisor-Facing)

```json
{
  "query": "How do I execute an account transfer from Schwab to OneDigital?",
  "query_type": "PROCEDURAL",
  "custodian": "Charles Schwab",

  "answer_summary": {
    "procedure_name": "Account Transfer (ACAT)",
    "complexity": "Medium",
    "estimated_time_to_complete": "10-15 business days",
    "confidence_tier": "High (verified against current Schwab documentation)"
  },

  "prerequisites": [
    "Receiving account must be open at OneDigital",
    "Account owner must authorize transfer in writing (eSign acceptable)",
    "No pending trades or litigation against account",
    "Account title must match exactly between firms"
  ],

  "compliance_requirements": [
    "Client written authorization (ACAT form signed)",
    "Compliance review and approval (internal)",
    "AML/KYC re-verification by receiving firm (OneDigital)",
    "Beneficiary documentation review (recommended)"
  ],

  "step_by_step": [
    {
      "step": 1,
      "action": "Prepare and submit ACAT form",
      "details": "Obtain form from Schwab or AdviserCenter; enter exact account title, account number, transfer type",
      "portal_location": "AdviserCenter > Accounts > Transfer > Initiate ACAT",
      "time_estimate": "15 minutes",
      "expected_result": "ACAT submitted; confirmation number generated"
    },
    {
      "step": 2,
      "action": "Monitor transfer status",
      "details": "Check AdviserCenter daily for status updates; expect 'In Progress' status within 24 hours",
      "portal_location": "AdviserCenter > Accounts > Transfer > View Status",
      "time_estimate": "Ongoing",
      "expected_result": "Status progresses from 'Submitted' to 'In Progress' to 'Complete'"
    },
    {
      "step": 3,
      "action": "Receive assets at OneDigital",
      "details": "Operations team posts assets to client account; client can see in OneDigital portal",
      "portal_location": "N/A (handled by Operations)",
      "time_estimate": "5-10 business days from submission",
      "expected_result": "Assets appear in OneDigital account and Schwab account shows $0"
    },
    {
      "step": 4,
      "action": "Close Schwab account (if full transfer)",
      "details": "Send written request to Schwab requesting account closure",
      "portal_location": "AdviserCenter > Account Services or contact directly",
      "time_estimate": "2-5 business days",
      "expected_result": "Schwab confirms closure; account no longer accessible"
    }
  ],

  "timeline": {
    "best_case": "5 business days (all information correct, no complications)",
    "typical_case": "7-10 business days",
    "worst_case": "15+ business days (account title mismatch, pending transactions)",
    "primary_delay_drivers": [
      "Account title mismatch between firms",
      "Pending trades not yet settled",
      "Account holds or liens",
      "Receiving firm (OneDigital) processing queue"
    ]
  },

  "required_documents": [
    {
      "document": "Account Transfer Form (ACAT)",
      "source": "Charles Schwab AdviserCenter or mailed form",
      "required_information": [
        "Transferring account title (exact match to Schwab records)",
        "Transferring account number",
        "Receiving firm name (OneDigital)",
        "Receiving account number (at OneDigital)",
        "Transfer type (Full or Partial)",
        "If partial: specific positions and quantities"
      ],
      "signature_requirement": "Client signature (eSign acceptable)"
    }
  ],

  "common_pitfalls": [
    {
      "pitfall": "Account Title Mismatch",
      "description": "Title on ACAT form doesn't match Schwab account records exactly (spacing, punctuation, name order)",
      "prevention": "Print Schwab account statement and copy title character-for-character into ACAT form",
      "resolution": "Contact Schwab; request ACAT amendment with corrected title; timeline: +5 business days"
    },
    {
      "pitfall": "Pending Trades Block Transfer",
      "description": "Recent trades at Schwab haven't settled yet; Schwab blocks ACAT until settlement",
      "prevention": "Confirm with client no recent trades planned; if trades pending, wait 2-3 days for settlement",
      "resolution": "Wait for trade settlement; resubmit ACAT; timeline: +2-3 business days"
    },
    {
      "pitfall": "Non-Transferable Securities",
      "description": "Some securities (fractional shares, certain mutual funds, foreign stocks) cannot transfer in-kind",
      "prevention": "Review account holdings for transferability before ACAT submission",
      "resolution": "Schwab liquidates non-transferable positions; proceed with cash proceeds; timeline: Same-day"
    },
    {
      "pitfall": "Missing AML/KYC Documentation at OneDigital",
      "description": "OneDigital requires additional documentation (verification, beneficial ownership) before transfer completes",
      "prevention": "Ensure new account at OneDigital has all AML/KYC docs complete before transfer",
      "resolution": "Provide missing docs to OneDigital; timeline: +2-3 business days"
    }
  ],

  "troubleshooting": [
    {
      "error": "ACAT Rejected: 'Account Title Mismatch'",
      "likely_cause": "Name on transfer form doesn't match Schwab account records",
      "resolution": [
        "Step 1: Log into AdviserCenter and view account details",
        "Step 2: Copy exact account title (including trust name, LLC, etc.) from account summary",
        "Step 3: Contact Schwab ACAT support to request amendment",
        "Step 4: Resubmit ACAT with corrected title",
        "Timeline: 5 business days"
      ]
    },
    {
      "error": "ACAT Status Stuck 'In Progress' for 10+ Days",
      "likely_cause": "Schwab internal processing delay or OneDigital not confirming receipt",
      "resolution": [
        "Step 1: Check AdviserCenter for any pending requests from Schwab or OneDigital",
        "Step 2: Review email for communications from either firm",
        "Step 3: Call Schwab AdviserCenter Support: 1-800-515-2157",
        "Step 4: Provide ACAT reference number; ask for status",
        "Step 5: If OneDigital hasn't confirmed, contact OneDigital operations",
        "Timeline: 2-3 business days to resolve"
      ]
    },
    {
      "error": "Assets Received but Some Positions Liquidated Unexpectedly",
      "likely_cause": "Schwab couldn't transfer certain securities (fractional shares, non-marginable, etc.)",
      "resolution": [
        "Step 1: Review ACAT transfer details and compare to original account at Schwab",
        "Step 2: Identify which positions were liquidated (they'll be missing from OneDigital account)",
        "Step 3: Check cash balance at OneDigital (should include proceeds from liquidations)",
        "Step 4: Reinvest liquidated proceeds per client's strategy",
        "Timeline: Immediate (reinvestment execution)"
      ]
    }
  ],

  "escalation_path": {
    "first_contact": {
      "organization": "Charles Schwab AdviserCenter Support",
      "phone": "1-800-515-2157",
      "email": "support@advisercenter.schwab.com",
      "purpose": "Status checks, minor issues, basic troubleshooting",
      "hours": "Monday-Friday 6:00 AM - 10:00 PM ET"
    },
    "second_contact": {
      "organization": "Schwab Account Manager",
      "contact_method": "Assigned to your firm's book",
      "purpose": "Escalation on complex transfers, stalled processes",
      "when_to_escalate": "If first-line support cannot resolve in 24 hours"
    },
    "onedigital_escalation": {
      "contact": "[Operations Manager]",
      "purpose": "If Schwab non-responsive or OneDigital system issues",
      "when_to_escalate": "After 10 business days with no progress"
    }
  },

  "related_procedures": [
    {
      "procedure": "New Account Opening at OneDigital",
      "reason": "Prerequisite - must have receiving account ready before ACAT",
      "estimated_time": "2-3 business days"
    },
    {
      "procedure": "Beneficiary Designation Update",
      "reason": "Recommended - review beneficiary alignment post-transfer",
      "estimated_time": "1-2 business days"
    },
    {
      "procedure": "Fee Deduction Setup",
      "reason": "Post-transfer - establish billing for new custodian",
      "estimated_time": "1-2 business days"
    }
  ],

  "version_info": {
    "last_updated": "2026-02-15",
    "days_since_update": 29,
    "update_frequency": "Quarterly (Schwab changes processes regularly)",
    "currency_alert": "Current and verified against Schwab documentation as of 2026-02-15. Recommend confirming with Schwab if executing after 90 days from this update."
  }
}
```

### 10.2 Client-Facing SOP Summary (Email Template)

**Subject: Account Transfer Instructions - Schwab to OneDigital**

> Dear [Client Name],
>
> We're ready to transfer your account from Charles Schwab to OneDigital. Here's what will happen:
>
> **Timeline:** Expect the transfer to complete in 7-10 business days.
>
> **What You Need to Do:**
> 1. Sign the Account Transfer Form (ACAT) we're sending separately
> 2. Return the signed form to us or Schwab
> 3. That's it!
>
> **What Happens Next:**
> - We submit the transfer request to Schwab
> - Schwab processes it (typically 5-10 business days)
> - Your assets arrive at OneDigital
> - You'll see everything in your new OneDigital portal
> - Your Schwab account will close
>
> **Important:** Make sure we have the exact name and account number from your Schwab statement. Even small differences (like spacing or punctuation) can delay the transfer.
>
> If you have any questions, please reach out.
>
> Best regards,
> [Advisor Name]

---

## 11. VALIDATION RULES

1. **Source Authority Required:** Every procedure must cite KB source or custodian official documentation
2. **Dates Required:** Always include "last updated" date; flag if >6 months old
3. **Custodian Verification:** If procedure is inferred (not from custodian directly), flag confidence level
4. **Compliance Overlay:** All procedures must include compliance checkpoints
5. **Contact Information Current:** Verify escalation contacts before including

---

## 12. EXAMPLE QUERY SESSION

**User Query:** "What's the process for updating a beneficiary at Fidelity?"

**System Response:**

Procedure Name: Beneficiary Designation Update (Fidelity)
Custodian: Fidelity Investments
Complexity: Low
Timeline: 1-2 business days

Prerequisites:
- Account must be open at Fidelity
- Account owner authorization required (must initiate themselves or provide power of attorney)

Step-by-Step:
1. Log into AdvisorCentral with your account credentials
2. Navigate to Account > Settings > Beneficiaries
3. Click "Edit Beneficiaries"
4. Enter new beneficiary name, SSN, relationship, and allocation %
5. Ensure percentages total 100%
6. Confirm and submit
7. Fidelity sends confirmation email

Timeline: Typically 1-2 business days for update to take effect

Required Documents: None (electronic submission acceptable)

Common Issues:
- SSN mismatch: Ensure beneficiary SSN exactly matches government ID
- Percentage totals: Must sum to 100% exactly; use .01 for rounding corrections
- Capacity issues: If beneficiary is minor, may need to designate custodian

Confidence: High (verified against current Fidelity documentation, 2026-02-15)

Escalation: If issue arises, contact Fidelity at 1-800-343-3548

