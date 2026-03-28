# 16-life-event-detection.md
## Function: detectLifeEventsFromTranscript

**Purpose:** Identify significant life events from client communications and automatically trigger relevant planning domain assessments and service activation.

**Fiduciary Principle:** Life events fundamentally alter financial goals, cash flows, risk tolerance, and timeline. Early detection enables proactive guidance and prevents outdated planning.

---

## 1. COMPREHENSIVE LIFE EVENT TAXONOMY

### 1.1 Event Categories with Planning Impact

#### FAMILY EVENTS

| Event | Planning Domains Affected | Urgency | Action Trigger |
|-------|---------------------------|---------|----------------|
| **Marriage/Domestic Partnership** | Goals, Tax, Estate, Insurance, Retirement | HIGH | Beneficiary updates, spousal coordination, tax filing status |
| **Divorce/Separation** | Estate, Tax, Insurance, Retirement, Legal | CRITICAL | Beneficiary review (remove ex), separate planning, tax impact |
| **New Child/Grandchild** | Goals, Insurance, Estate, College Savings (529), Tax | HIGH | Guardianship plan, life insurance review, will update |
| **Adoption** | Goals, Insurance, Estate, Tax, Legal | HIGH | Same as new child + adoption documentation |
| **Death of Spouse/Parent** | Goals, Tax, Estate, Retirement, Insurance, Legal | CRITICAL | Reassess retirement, tax situation, estate distribution, beneficiaries |
| **Custody Change** | Goals, Insurance, Estate, Legal | MEDIUM | Guardianship documentation, beneficiary alignment |
| **Adult Child Transition** | Goals, Education, Insurance (term end) | MEDIUM | 529 plan conclusion, policy adjustment as dependent independence |

#### CAREER EVENTS

| Event | Planning Domains Affected | Urgency | Action Trigger |
|-------|---------------------------|---------|----------------|
| **Job Change/New Employment** | Retirement, Insurance, Benefits, Tax, Goals | HIGH | Review new benefits, 401k, HSA, stock options, tax withholding |
| **Promotion/Significant Raise** | Goals, Tax, Savings, Retirement | MEDIUM | Opportunity to increase savings, optimize withholding |
| **Layoff/Job Loss** | Goals, Tax, Insurance, Emergency Fund, Retirement | CRITICAL | Cash flow reassessment, severance planning, benefits continuation (COBRA) |
| **Retirement/Work Reduction** | Retirement, Social Security, Tax, Insurance, Goals, Cash Flow | CRITICAL | Full retirement analysis, SS optimization, Medicare coordination, cash flow plan |
| **Starting Business** | Tax, Insurance, Retirement, Legal, Goals | CRITICAL | Business structure, self-employment tax planning, SEP-IRA/Solo 401k, liability insurance |
| **Selling Business** | Tax, Estate, Goals, Investment, Retirement | CRITICAL | Concentrated position management, tax planning, liquidity event |
| **Partnership Change** | Business planning, Insurance, Legal | MEDIUM | Operating agreement review, insurance review, liability assessment |

#### FINANCIAL EVENTS

| Event | Planning Domains Affected | Urgency | Action Trigger |
|-------|---------------------------|---------|----------------|
| **Inheritance** | Estate, Tax, Goals, Investment, Retirement | HIGH | Inherited asset strategy, step-up basis planning, distribution timing |
| **Large Gift Received** | Goals, Tax, Investment, Retirement | MEDIUM | Gifting strategy, investment integration, tax planning |
| **Property Purchase** | Goals, Insurance, Tax, Estate, Retirement | HIGH | Homeowners insurance, property tax planning, HOA review, title review |
| **Property Sale** | Tax, Goals, Investment, Retirement | MEDIUM | Capital gains tax planning, real estate proceeds reinvestment |
| **Significant Lawsuit/Settlement** | Insurance, Tax, Goals, Legal | CRITICAL | Liability assessment, settlement structure, claim exposure |
| **Bankruptcy Filing/Financial Crisis** | All domains, Credit repair | CRITICAL | Immediate intervention, settlement negotiation, debt management |
| **Windfall (Lottery, Settlement)** | All domains, Investment, Tax, Goals | HIGH | Windfall management strategy, phased integration, diversification |

#### HEALTH EVENTS

| Event | Planning Domains Affected | Urgency | Action Trigger |
|-------|---------------------------|---------|----------------|
| **Major Health Diagnosis** | Insurance (LTC, DI), Estate, Goals, Retirement | CRITICAL | LTC planning, disability insurance review, estate urgency review |
| **Disability Onset** | Insurance (DI, LTC), Goals, Retirement, Cash Flow | CRITICAL | Disability benefit application, income gap assessment, retirement acceleration |
| **Recovery/Health Improvement** | Retirement timeline extension, Insurance (DI end), Goals | MEDIUM | Update disability assumptions, potential work extension |
| **Long-Term Care Need Recognition** | LTC insurance, Goals, Estate, Retirement | CRITICAL | LTC facility cost planning, asset protection, Medicaid planning |
| **Dependent Health Event** | Insurance, Goals, Cash Flow, Education | MEDIUM | Impact on caregiver work status, special needs planning |

#### EDUCATION EVENTS

| Event | Planning Domains Affected | Urgency | Action Trigger |
|-------|---------------------------|---------|----------------|
| **Child Starting College** | Goals (529 plans), Cash Flow, Tax, Insurance | HIGH | 529 distribution strategy, tax implications, financial aid impact |
| **Graduate School Entry** | Goals, Student Loans, Cash Flow, Retirement | MEDIUM | Student loan planning, career earnings impact, retirement delay assessment |
| **529 Plan Beneficiary Change** | Goals, Tax, Education | MEDIUM | Reassess plan allocation, distribution timing |
| **FAFSA/Financial Aid** | Goals, Tax, Retirement, Education | HIGH | Tax impact on financial aid, withdrawal strategy |

#### LEGAL EVENTS

| Event | Planning Domains Affected | Urgency | Action Trigger |
|-------|---------------------------|---------|----------------|
| **Will Creation/Update** | Estate, Legal, Goals, Beneficiaries | HIGH | If not completed in 2+ years or after major life event |
| **Trust Creation** | Estate, Legal, Tax, Goals | HIGH | Implications for probate, incapacity planning, tax efficiency |
| **Power of Attorney Creation** | Estate, Legal, Healthcare, Financial | MEDIUM | Both financial and healthcare POA required |
| **Guardianship Determination** | Estate, Legal, Insurance | HIGH | For minor children, required with new child or custody change |
| **Prenuptial/Postnuptial Agreement** | Estate, Legal, Tax, Goals | HIGH | If entering marriage with significant assets |

---

## 2. DETECTION CONFIDENCE SCORING

### 2.1 Three-Tier Confidence Model

#### TIER 1: CONFIRMED (90%+ Confidence)
**Criteria:** Direct, unambiguous statement by client

**Evidence Examples:**
- "We're getting married in June"
- "My mother passed away last month"
- "I just got a job offer as VP of Sales"
- "We're buying a house in Chicago"
- "My son is starting college this fall"

**Interpretation:** Treat as fact. Trigger immediate follow-up questions and service activation.

#### TIER 2: LIKELY (70-90% Confidence)
**Criteria:** Strong contextual indicators without explicit statement

**Evidence Examples:**
- "We've been house hunting for 6 months and really found something we love"
- "Things are changing at work—thinking about options"
- "The diagnosis was tougher than we expected"
- "All the kids are out of the house now"
- "My uncle's estate is in probate"

**Interpretation:** Confirm with targeted questions. Alert advisor but don't assume completed.

#### TIER 3: POSSIBLE (50-70% Confidence)
**Criteria:** Indirect references or ambiguous language

**Evidence Examples:**
- "Family situation is complicated right now"
- "Work has been stressful lately"
- "We've been thinking about our future"
- "Money's been tighter than usual"
- "Our advisor suggested some changes"

**Interpretation:** Note in file. Probe gently for clarification. Do not assume.

### 2.2 Confidence Scoring Logic

```
DETECTION_CONFIDENCE = (
  Explicitness_Score × 0.5 +
  Corroborating_Evidence × 0.3 +
  Temporal_Clarity × 0.2
)

Where:
  Explicitness = 0 (vague) to 1 (direct statement)
  Corroborating = 0 (isolated mention) to 1 (multiple references)
  Temporal = 0 (unclear timing) to 1 (clear past/present/future)

Result:
  0.90+ = CONFIRMED
  0.70-0.90 = LIKELY
  0.50-0.70 = POSSIBLE
  <0.50 = INSUFFICIENT EVIDENCE (skip)
```

---

## 3. PLANNING IMPACT ASSESSMENT

### 3.1 Domain-Event Impact Mapping

**Each event maps to:**
1. Which of 9 planning domains are affected
2. Urgency classification (how quickly action needed)
3. Financial impact quantification (if determinable)

**Example: Marriage Event**

```
PLANNING IMPACT MAP: Marriage/Domestic Partnership

Domains Affected:
  ✓ Goals (combine household goals, new shared priorities)
  ✓ Retirement (joint planning, coordination of timelines)
  ✓ Tax (filing status change, optimization opportunities)
  ✓ Insurance (spousal coverage, beneficiary updates)
  ✓ Estate (will/beneficiary/POA updates)
  ✗ College Savings (unless new stepchildren)
  ✓ Legal (prenup/postnup if applicable)

Urgency Classification: HIGH
  - Beneficiary update needed immediately
  - Tax withholding change needed before next payroll
  - Insurance beneficiary coordination critical
  - Estate documents should be updated within 60 days

Financial Impact Estimation:
  - Tax impact: Potential $2,000-$5,000/year savings from filing jointly
  - Insurance: May need additional coverage if spouse economically dependent
  - Estate: No direct cost, but legal fees $2,000-$4,000 if updating documents
```

**Impact Severity Scale:**
- IMMEDIATE: Action needed within 7 days (beneficiary changes, critical documents)
- URGENT: Action needed within 30 days (insurance review, tax withholding)
- PLANNED: Action needed within 90 days (comprehensive plan updates)
- ROUTINE: Action taken at next scheduled review (annual check-in)

---

## 4. SERVICE TRIGGER MAPPING

### 4.1 Event → Service Activation Matrix

| Life Event | Service Activation | Contact Method | Timeline | Owner |
|---|---|---|---|---|
| Marriage | Relationship review, tax planning, estate update | Schedule meeting | Within 14 days | Advisor |
| Divorce | Account separation strategy, custody assessment, beneficiary review | Phone call | ASAP | Senior advisor |
| New child | College savings plan, will update, life insurance review | Meeting or phone | Within 30 days | Advisor |
| Job change | Benefits optimization, 401k rollover (if applicable), HSA review | Email + phone | Within 7 days | Operations |
| Inheritance | Inherited asset strategy, tax planning, distribution advice | Meeting | Within 14 days | Senior advisor |
| Disability | Benefit maximization, income gap assessment, retirement re-evaluation | Phone call | IMMEDIATE | Senior advisor |
| Home purchase | Insurance coordination, property tax planning, mortgage review | Email + follow-up | Within 30 days | Advisor |
| Major health event | LTC planning, estate urgency, retirement reassessment | Phone call | IMMEDIATE | Senior advisor |
| Business sale | Concentrated position strategy, tax planning, diversification | Meeting | IMMEDIATE | Senior advisor + tax advisor |
| Retirement | Social Security optimization, withdrawal planning, Medicare coordination | Comprehensive review meeting | 60-90 days before | Senior advisor |

---

## 5. TIMELINE EXTRACTION

### 5.1 Temporal Classification

**For each event detected, determine temporal context:**

```
TIMELINE_CLASSIFICATION:

  PAST: Event has already occurred
    Sub-classification:
      Recent (within 6 months): May still require active response
      Established (6-24 months ago): Integration phase
      Historical (>2 years): Should be reflected in current plan

  PRESENT: Event is currently happening
    Sub-classification:
      In progress: Ongoing action phase
      Decision point: Choice being made now
      Implementation: Changes being implemented

  FUTURE: Event is planned/anticipated
    Sub-classification:
      Imminent (0-3 months): Preparation phase
      Planned (3-12 months): Planning phase
      Long-term (>12 months): Strategic phase
```

**Example Extraction:**

| Client Statement | Event | Timeline | Interpretation |
|---|---|---|---|
| "We're getting married in June" | Marriage | Future - Imminent | Plan engagement within 4 weeks |
| "My father just passed away" | Death in family | Past - Recent | Immediate estate/financial impact |
| "I've been thinking about retiring" | Retirement | Future - Long-term (TBD) | Need to clarify retirement age |
| "Our youngest just left for college" | Child independence | Past - Recent | Review 529 plans, insurance needs |
| "I start my new job next Monday" | Job change | Future - Imminent | Coordinate benefits review immediately |

---

## 6. FOLLOW-UP QUESTION GENERATION

### 6.1 Event-Specific Question Framework

**Purpose:** Clarify event details, confirm client goals, identify secondary impacts

**By Event Type:**

#### Marriage/Partnership
- Confirmation: "Congratulations! When is the wedding planned?"
- Spouse financial data: "Does your partner have existing investments, retirement accounts, or significant debt?"
- Goal alignment: "Are you combining finances, or keeping accounts separate?"
- Estate implications: "Do either of you have children from prior relationships?"
- Tax impact: "Will this change from filing single to married?"

#### Job Change
- New employer confirmation: "What's the new employer and role?"
- Compensation details: "What's your new base salary and does it include bonus/commission?"
- Benefits eligibility: "When do benefits begin? Does the new employer offer 401k, HSA, or pension?"
- Stock options/RSUs: "Are there equity grants? What's the vesting schedule?"
- Old benefits: "What happens to your 401k at the old company? Can you roll it?"

#### Inheritance
- Asset composition: "What types of assets are inherited? (Real estate, investments, cash, business)"
- Amount/value: "Roughly what value are we talking about?"
- Timing: "When will the inheritance be distributed?"
- Tax implications: "Is this a taxable estate or a tax-deferred IRA?"
- Distribution control: "Are you receiving a lump sum or distributions over time?"

#### Home Purchase
- Property details: "Where is the property and what's the purchase price?"
- Financing: "Are you financing? What's down payment percentage and loan term?"
- Timing: "When does the purchase close?"
- Current home: "Will you sell your current home? Any tax basis considerations?"
- Investment impact: "Will this real estate be investment property or primary residence?"

#### Major Health Event
- Type/severity: "What's the nature of the diagnosis? What's the expected impact on your work ability?"
- Treatment timeline: "How long will treatment last? Will it affect your ability to work?"
- Insurance coverage: "Is this covered by insurance? Are there out-of-pocket costs expected?"
- Family impact: "Will this require family caregiving? Any impact on spouse's work?"
- Longevity impact: "Have doctors discussed impact on life expectancy?"

#### Retirement Decision
- Timing: "When are you planning to retire? Is this firm or flexible?"
- Work status: "Will you completely stop work or transition to part-time?"
- Pension/benefits: "Are you vested in any pensions? When do benefits begin?"
- Social Security: "Have you claimed Social Security or planning to delay?"
- Healthcare: "How will you bridge to Medicare? Any special medical needs?"

---

## 7. KNOWLEDGE BASE RETRIEVAL TRIGGERS

**Retrieve BEFORE Event Detection Analysis:**

1. **Life Stage Personas**
   - KB Query: "Life stage personas, typical life events by age, planning priorities by life stage"
   - Purpose: Context for event frequency and impact assessment

2. **Planning Methodologies**
   - KB Query: "Planning procedures for [event type], standard questions, impact assessment frameworks"
   - Purpose: Standardized approach to event-triggered planning

3. **Service Catalog**
   - KB Query: "OneDigital service offerings, service triggers, engagement models, timeline expectations"
   - Purpose: Accurate service activation and communication

4. **Client History**
   - KB Query: "Previous life events for [Client ID], prior responses, documented goals"
   - Purpose: Contextualize new event against prior plan and client preferences

5. **Regulatory and Tax Impact**
   - KB Query: "Tax implications of [event type], regulatory requirements, filing deadlines"
   - Purpose: Ensure compliance-driven communication and action steps

---

## 8. OUTPUT SPECIFICATION

### 8.1 Event Detection Report (Advisor-Facing)

```json
{
  "detection_summary": {
    "transcript_date": "2026-03-16",
    "client_id": "CLI-12345",
    "total_events_detected": 2,
    "critical_events": 1,
    "immediate_action_required": true
  },

  "detected_events": [
    {
      "event_id": "EV-001",
      "event_type": "Job Change",
      "event_category": "Career",
      "confidence": {
        "score": 0.95,
        "tier": "CONFIRMED",
        "evidence": [
          "\"I start my new role as VP of Finance next Monday\"",
          "\"New employer is TechCorp, salary is $180k\""
        ]
      },

      "timeline": {
        "temporal_classification": "Imminent",
        "event_occurs": "2026-03-20 (4 days)",
        "impact_window": "Within 30 days"
      },

      "planning_impact": {
        "domains_affected": [
          "Retirement (new 401k)",
          "Insurance (benefits change)",
          "Tax (new W4 withholding)",
          "Goals (income change impact)"
        ],
        "urgency": "URGENT (30-day action window)",
        "financial_impact": "Income increase $30k/year, benefits change TBD",
        "risk_level": "Medium (benefits transition)"
      },

      "service_triggers": [
        {
          "service": "401k Rollover Consultation",
          "status": "ACTIVATE",
          "timeline": "Within 7 days",
          "responsible_party": "Operations",
          "action_description": "Coordinate old 401k rollover eligibility and new employer 401k enrollment"
        },
        {
          "service": "Tax Withholding Review",
          "status": "ACTIVATE",
          "timeline": "Within 7 days",
          "responsible_party": "Advisor",
          "action_description": "Review and update W4 withholding for new salary"
        },
        {
          "service": "Benefits Optimization",
          "status": "SCHEDULE",
          "timeline": "Within 14 days",
          "responsible_party": "Advisor",
          "action_description": "Review new employer benefits (HSA, life insurance, disability)"
        }
      ],

      "follow_up_questions": [
        "When do benefits from new employer begin? (Waiting period?)",
        "What happens to your old employer 401k? (Rollover eligible?)",
        "Does new employer offer HSA? What's the contribution limit?",
        "Is there a sign-on bonus or equity grants?",
        "Will the income change affect your overall goals and timeline?"
      ],

      "advisor_coaching_notes": "Client is transitioning jobs with significant income increase. Potential for upward goal revision. Ensure old 401k rollover is properly executed to avoid lost tax benefits. New benefits package review is critical.",

      "urgency_flag": "URGENT - coordinate rollover and new benefits enrollment within 7 days of start date"
    },

    {
      "event_id": "EV-002",
      "event_type": "Marriage",
      "event_category": "Family",
      "confidence": {
        "score": 0.92,
        "tier": "CONFIRMED",
        "evidence": [
          "\"My fiancée and I set the wedding date for next October\"",
          "\"She has her own business so we'll need to think about joint planning\""
        ]
      },

      "timeline": {
        "temporal_classification": "Planned",
        "event_occurs": "2026-10-15 (7 months)",
        "impact_window": "Within 90 days for planning"
      },

      "planning_impact": {
        "domains_affected": [
          "Goals (household consolidation)",
          "Tax (filing status change)",
          "Retirement (joint planning)",
          "Estate (beneficiary updates)",
          "Insurance (coverage coordination)"
        ],
        "urgency": "HIGH (90-day action window)",
        "financial_impact": "Potential $3,000-$5,000 annual tax savings, combined household net worth $1.8M",
        "risk_level": "Medium (estate documents need update)"
      },

      "service_triggers": [
        {
          "service": "Joint Financial Planning",
          "status": "SCHEDULE",
          "timeline": "Within 60 days",
          "responsible_party": "Senior Advisor",
          "action_description": "Combined household goal setting, consolidation strategy"
        },
        {
          "service": "Estate Document Review",
          "status": "RECOMMEND",
          "timeline": "Before wedding (90 days)",
          "responsible_party": "Attorney referral",
          "action_description": "Update wills, POA, beneficiaries post-marriage"
        },
        {
          "service": "Tax Planning",
          "status": "SCHEDULE",
          "timeline": "Within 90 days",
          "responsible_party": "Tax Advisor",
          "action_description": "Optimize joint filing, withholding, business structure for spouse"
        }
      ],

      "follow_up_questions": [
        "Does your fiancée have existing investments or retirement accounts?",
        "What's the nature of her business? Any liability concerns?",
        "Will you combine finances after marriage or keep separate?",
        "Do either of you have children or previous marriage obligations?",
        "Are you planning to change tax filing status?"
      ],

      "advisor_coaching_notes": "This is a high-net-worth marriage combining two business owners. Need comprehensive joint planning addressing: household goal prioritization, business entity coordination, estate protection, tax optimization. Schedule strategic planning meeting within 60 days.",

      "urgency_flag": "Plan action within 60 days; estate updates should be completed before wedding"
    }
  ],

  "aggregate_action_plan": {
    "immediate_actions_next_7_days": [
      "Schedule call with client to discuss job change implications",
      "Coordinate old 401k rollover process",
      "Update tax withholding (W4) for new salary",
      "Review new benefits eligibility and enrollment deadlines"
    ],
    "planned_actions_next_30_days": [
      "Schedule joint meeting with client and fiancée",
      "Conduct household financial consolidation planning",
      "Identify tax optimization opportunities"
    ],
    "planned_actions_30_90_days": [
      "Attorney referral for estate documents",
      "Comprehensive post-wedding plan update"
    ]
  },

  "risk_assessment": {
    "critical_risks": [
      "401k rollover not executed properly (tax penalties risk)",
      "Estate documents not updated before marriage (beneficiary confusion risk)"
    ],
    "monitoring_required": true,
    "escalation_recommended": false
  }
}
```

### 9.2 Client-Facing Event Summary (Email Template)

**Subject: Congratulations on Your New Job & Upcoming Wedding!**

> Dear [Client Name],
>
> We've reviewed your recent conversations and want to congratulate you on both your new role at TechCorp and your upcoming wedding to [Fiancée Name]! These are wonderful milestones.
>
> We've identified some action items to help you transition smoothly:
>
> **IMMEDIATE (Next 7 days):**
> 1. **401k Rollover** - Let's coordinate the rollover from your old employer to your new one to avoid tax penalties
> 2. **Tax Withholding** - We'll review your new W4 to optimize for your $180k salary
> 3. **New Benefits** - Confirm your new employer benefits package eligibility and deadlines
>
> **PLANNED (Next 60-90 days):**
> 1. **Joint Financial Planning** - Once you've settled into your new role, we'd like to schedule a comprehensive meeting with you and [Fiancée Name] to align your household goals
> 2. **Estate Documents** - We recommend updating your will, beneficiaries, and POA before the wedding
> 3. **Tax Optimization** - Explore how your combined household and business income can be optimized
>
> I'll reach out Monday to schedule a brief call about the job transition. Congratulations again!
>
> Best regards,
> [Advisor Name]

---

## 9. VALIDATION RULES

1. **Explicitness Required for CONFIRMED:** Direct quote from client communication
2. **Confidence Tier Must Match Evidence:** LIKELY requires 2+ corroborating indicators
3. **Timeline Must Be Clear:** If event timing unclear, mark as POSSIBLE and ask clarifying question
4. **Service Triggers Must Map to KB:** Each trigger references available OneDigital service
5. **Follow-up Questions Must Be Event-Specific:** No generic questions; tailor to event and client situation
6. **Financial Impact Estimated Only When Quantifiable:** Otherwise note as "TBD pending additional information"

---

## 10. EXAMPLE DETECTION SESSION

**Scenario:** Semi-annual review call transcript

**Client Statement (Beginning):**
> "Life's been eventful. We closed on the house last month—it's been hectic with the move. And my son just got his college acceptance letters, so we're looking at tuition in the fall. Oh, and I wanted to ask about my Social Security because I'm thinking about working only part-time starting next year."

**Detected Events:**

| Event | Confidence | Timeline | Urgency |
|-------|-----------|----------|---------|
| Property purchase (closed) | CONFIRMED (95%) | Past - Recent (1 month) | URGENT - Insurance, tax, title verification |
| Child college attendance | CONFIRMED (95%) | Future - Imminent (8 months) | HIGH - 529 plan updates, financial aid impact |
| Partial retirement/work reduction | LIKELY (80%) | Future - Planned (9 months) | HIGH - Retirement analysis, SS timing |

**Follow-up Questions Generated:**
1. "What was the purchase price and down payment? Do you have a mortgage?"
2. "Which colleges is your son considering? Any cost differences?"
3. "When next year are you thinking about the transition? Full vs. part-time?"
4. "Will part-time work be at current employer or a new opportunity?"
5. "Have you considered Social Security timing? Early, normal, or delay?"

**Service Activations:**
1. Real estate coordination (insurance, property tax)
2. 529 plan review and distribution strategy
3. Retirement analysis (partial retirement scenario)
4. Social Security optimization analysis

**Advisor Coaching:**
> "This client is at an inflection point with three significant transitions: home purchase, child through college, and work reduction. All are manageable individually but need coordinated planning. Recommend comprehensive review meeting in next 60 days to address: (1) home purchase implications (insurance, tax, expenses), (2) college funding strategy and financial aid optimization, (3) phased retirement analysis with Social Security timing. Client income will drop significantly—need to assess if part-time income covers needs or if retirement advance is realistic."

