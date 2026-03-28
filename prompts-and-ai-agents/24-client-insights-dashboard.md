# 24-client-insights-dashboard.md
## Function: Route-level - Client Insights Dashboard

### PURPOSE
Aggregate multi-client book-of-business analytics with proactive alerts, opportunity pipelines, risk dashboards, and performance metrics. All insights backed by quantitative data and calculated metrics.

---

## CORE ARCHITECTURE

### 1. MULTI-CLIENT BOOK-OF-BUSINESS ANALYTICS

### 1.1 AUM Distribution and Concentration
```
FUNCTION: analyze_aum_distribution():

  // Understand portfolio concentration risk
  // Which clients represent largest revenue? Concentration risk?

  ADVISOR'S BOOK OF BUSINESS:

  Total AUM: $45,230,000
  Number of clients: 156

  AUM BY CLIENT (Top 20):

  Rank | Client Name        | AUM         | % of Book | Cumulative %
  ─────────────────────────────────────────────────────────────────
  1    | Smith Family Trust  | $3,200,000  | 7.07%    | 7.07%
  2    | Jones Estate       | $2,850,000  | 6.30%    | 13.37%
  3    | Tech Executive M.  | $2,100,000  | 4.64%    | 18.01%
  4    | Real Estate Corp   | $1,950,000  | 4.31%    | 22.32%
  5    | Anderson, John     | $1,750,000  | 3.87%    | 26.19%
  6    | Wilson Partnership | $1,680,000  | 3.71%    | 29.90%
  7    | Manufacturing Co.  | $1,550,000  | 3.43%    | 33.33%
  8    | Charitable Trust   | $1,420,000  | 3.14%    | 36.47%
  9    | Energy Executive   | $1,380,000  | 3.05%    | 39.52%
  10   | Investor Network   | $1,200,000  | 2.65%    | 42.17%
  11-20| [10 clients]       | $12,350,000 | 27.31%   | 69.48%
  21-50| [30 clients]       | $10,680,000 | 23.60%   | 93.08%
  51+  | [106 clients]      | $3,170,000  | 7.02%    | 100%

  CONCENTRATION ANALYSIS:

  Top 10 clients:    $20,080,000 (44.4% of total AUM)
  Top 20 clients:    $32,430,000 (71.7% of total AUM)
  Top 50 clients:    $43,110,000 (95.3% of total AUM)
  Remaining 106:     $2,120,000 (4.7% of total AUM)

  CONCENTRATION RISK ASSESSMENT:

  Metric: Herfindahl Index (HHI)
  ──────────────────────────────
  Calculation: SUM(market_share^2) for each client
  HHI = (7.07%)^2 + (6.30%)^2 + ... + (sum of small clients squared)

  If each client = 1% share: HHI = 156 × (1%)^2 = 156 (low concentration)
  If all AUM in 1 client: HHI = (100%)^2 = 10,000 (max concentration)

  This advisor's HHI: ~2,100 (moderate concentration)
  Interpretation: Book is somewhat concentrated; top 10 clients at high importance

  CONCENTRATION RISK INDICATORS:

  RED FLAGS (High Risk):
    ✗ Top 5 clients > 40% of AUM (this book: 26%)
    ✗ Top 10 clients > 60% of AUM (this book: 44%)
    ✗ Revenue concentrated in few clients (fee pressure on top 5)

  YELLOW FLAGS (Medium Risk):
    ⚠ Top 20 clients > 70% of AUM (this book: 72%) ← CONCERN
    ⚠ Single client > 5% of AUM (exists: 7.07%, 6.30%, 4.64%)
    ⚠ Loss of any top 3 would exceed retention capacity

  GREEN INDICATORS (Lower Risk):
    ✓ Bottom 100 clients represent meaningful portion (4.7% = $2.1M)
    ✓ Diversification across multiple income segments
    ✓ No single industry > 25% of book

CONCENTRATION RISK MITIGATION:

  Current plan: Target to grow book from $45M to $60M
  Strategy: Grow smaller clients ($100K-500K band) by 50%
           This dilutes top-10 concentration from 44% to 38%
           Timeline: 3 years

  Action: Develop referral program targeting mid-market (300K-750K AUM)
          Launch "growth segment" for clients age 50-60 approaching wealth phase
```

### 1.2 Revenue Concentration Risk
```
FUNCTION: analyze_revenue_concentration():

  // Understand income dependency
  // Which clients/service types drive revenue?

  ADVISOR FEE STRUCTURE:

  AUM-based fees: 0.75% average across book
  Service fees: $2,000-5,000/year per planning engagement
  Transaction fees: Variable, ~0.05% on trades

  REVENUE BY CLIENT (Top 20):

  Rank | Client          | AUM        | Annual AUM Fee | Service Fees | Total Revenue
  ────────────────────────────────────────────────────────────────────────────────
  1    | Smith Trust     | $3,200,000 | $24,000       | $5,000       | $29,000
  2    | Jones Estate    | $2,850,000 | $21,375       | $3,000       | $24,375
  3    | Tech Exec       | $2,100,000 | $15,750       | $2,000       | $17,750
  4    | Real Estate     | $1,950,000 | $14,625       | $4,000       | $18,625
  5    | Anderson        | $1,750,000 | $13,125       | $3,500       | $16,625
  [continuing through top 20]

  TOTAL REVENUE CALCULATION:

  AUM fees (45.23M × 0.75%): $339,225
  Service fees (per engagement): $182,500
  Transaction fees (est.): $22,615
  Total annual revenue: $544,340

  REVENUE CONCENTRATION:

  Top 5 clients:     $106,375 (19.5% of total revenue)
  Top 10 clients:    $153,600 (28.2% of total revenue)
  Top 20 clients:    $245,000 (45.0% of total revenue)

  REVENUE PER CLIENT (Median):

  Median client AUM:    $290,000
  Median annual revenue: $2,175/year

  Top client revenue:   $29,000 (13x median)
  Bottom 50th client:   $1,050/year (0.5x median)

REVENUE RISK ANALYSIS:

  IF top 5 clients left (lose 19.5% of revenue):
    New annual revenue: $437,000 (19.6% decline)
    Required action: Add $106K in new revenue within 12 months
    Timeline: Not realistic (would require $400M new AUM at 0.75% fee)

  MITIGATION STRATEGIES:

  Strategy 1: Increase fees for largest clients
    Action: Discuss value justification with top 5
    Potential increase: 0.85% (from 0.75%)
    Revenue impact: +$63,250/year (11.6% lift)
    Risk: Clients may perceive as unfair (implement with value communication)

  Strategy 2: Cross-sell services (grow service fees)
    Current service fee rate: ~0.4% of AUM book ($182K)
    Target: 0.6% of AUM book ($271K)
    Strategy: Increase planning engagement frequency
              Add tax/estate specialty services
    Revenue lift: +$88,500/year (16.3% lift)

  Strategy 3: Grow smaller clients (increase AUM)
    Target: Grow bottom 100 clients by 3x (from $2.1M to $6.3M)
    Revenue impact: +$34,000/year (6.3% lift)
    Timeline: 3-5 years

  RECOMMENDED APPROACH:
    Combine strategies: Modest fee increase (Strategy 1) + cross-sell (Strategy 2)
    Projected new revenue: $544K + $63K + $88K = $695K (28% increase)
    Timeline: 12-24 months
```

### 1.3 Client Segment Breakdown
```
FUNCTION: segment_clients_by_characteristics():

  // Understand client base composition
  // Which segments represent growth? Which need attention?

  SEGMENTATION BY TIER:

  Tier             | AUM Range      | Count | Total AUM | % of Book | Avg AUM/Client
  ────────────────────────────────────────────────────────────────────────────────
  Enterprise       | $2M+           | 3     | $8,150,000| 18.0%     | $2,716,667
  Wealth           | $1M-2M         | 8     | $12,000,000 | 26.5%  | $1,500,000
  Comprehensive    | $500K-1M       | 22    | $16,500,000 | 36.4%  | $750,000
  Core             | $250K-500K     | 45    | $16,750,000 | 37.0% | $372,222
  Foundational     | $100K-250K     | 52    | $8,450,000 | 18.7%   | $162,500
  Digital          | <$100K         | 26    | $1,380,000 | 3.1%    | $53,077
  Total                              | 156   | $45,230,000| 100%   | $289,936

  SEGMENTATION BY LIFE STAGE:

  Life Stage          | Count | Total AUM | Annual Revenue | Avg Revenue/Client
  ─────────────────────────────────────────────────────────────────────────
  Accumulation (25-45)| 34    | $6,200,000| $46,500        | $1,368
  Pre-Retirement (45-60)| 58 | $18,400,000| $138,000      | $2,379
  Distribution (60-75)| 52   | $15,630,000| $117,225      | $2,254
  Legacy (75+)        | 12   | $5,000,000| $37,500        | $3,125
  Unknown/Mixed       | -    | -          | -              | -

  SEGMENTATION BY AUM GROWTH:

  Growth Category     | Count | Total AUM | 1-Yr Growth | Avg Growth/Client
  ─────────────────────────────────────────────────────────────────────────
  High Growth (>10%)  | 28    | $8,500,000| +$1,105,000 | +$39,464/client
  Moderate (5-10%)    | 52    | $18,200,000| +$1,092,000| +$21,000/client
  Flat (0-5%)         | 45    | $12,530,000| +$375,900 | +$8,353/client
  Declining (<0%)     | 31    | $6,000,000| -$450,000  | -$14,516/client

  ANALYSIS:

  Growth clients (18% of book) generating most AUM growth
  Declining clients (20% of book) = retention risk
  Mid-market (36% comprehensive + core) = stable but mature
  Early-stage clients (3% digital) = highest potential growth but lowest current revenue
```

---

## 2. PROACTIVE ALERT GENERATION

### 2.1 Client Alerts Framework
```
FUNCTION: generate_proactive_alerts():

  // Identify clients who need advisor attention
  // Trigger specific actions with timelines

  ALERT CATEGORIES & TRIGGERS:

  CATEGORY 1: Approaching RMD Age
  ──────────────────────────────
  Trigger: Client age 70-73 (within 3 years of RMD requirement)
  Alert type: Tax planning

  SQL-like logic:
  ```
  SELECT client_id, client_name, birthdate, current_age,
         traditional_ira_balance, projected_rmd
  FROM clients
  WHERE current_age >= 70 AND current_age <= 73
    AND traditional_ira_balance > $250,000
  ORDER BY projected_rmd DESC
  ```

  EXAMPLE ALERTS:

  Alert #1: John Anderson, Age 71
    Trigger: Within 2 years of RMD age
    Traditional IRA: $850,000
    Projected RMD at 73: $32,075/year
    Action: Schedule RMD planning conversation
    Objective: Discuss withdrawal strategy, QCD, Roth conversions
    Timeline: Within 30 days
    Owner: Tax specialist

  Alert #2: Mary Smith, Age 70
    Trigger: At RMD planning age
    Traditional IRA: $520,000
    Projected RMD at 73: $19,621/year
    Action: Initiate Roth conversion window planning
    Objective: Model 2-3 year conversion ladder
    Timeline: Before year-end
    Owner: Senior advisor

  CATEGORY 2: Policy Renewal Dates
  ────────────────────────────────
  Trigger: Insurance policy expiration within 90 days

  EXAMPLE ALERTS:

  Alert #3: David Johnson, Age 58
    Trigger: Term life insurance expires in 60 days
    Current coverage: $500,000 term
    Issue: Renewal may be expensive (age 58 vs. 55 when purchased)
    Action: Schedule insurance review
    Objective: Assess coverage need, options for renewal or replacement
    Timeline: Within 14 days
    Owner: Insurance specialist

  CATEGORY 3: Stale Financial Plans
  ─────────────────────────────────
  Trigger: Last plan review > 12 months ago

  EXAMPLE ALERTS:

  Alert #4: Patricia Davis, Age 64
    Trigger: Financial plan last updated 18 months ago
    Plan status: Retirement timeline was age 66; now age 64
    Action: Schedule annual plan review
    Objective: Update assumptions, confirm plan on track
    Timeline: Within 45 days
    Owner: Relationship manager

  CATEGORY 4: Significant Life Events
  ───────────────────────────────────
  Trigger: Client flags major life event (marriage, inheritance, job change)

  EXAMPLE ALERTS:

  Alert #5: Sarah Chen, Age 55
    Trigger: Client inherited $800,000 from parent's estate
    Current AUM: $1,200,000
    New total: $2,000,000 (67% increase)
    Action: Schedule comprehensive review
    Objective: Rebalance portfolio, update tax strategy, review fees
    Timeline: Within 30 days
    Owner: Wealth manager

  CATEGORY 5: Portfolio Drift Exceeding Threshold
  ───────────────────────────────────────────────
  Trigger: Actual allocation drifts >5% from target

  EXAMPLE ALERTS:

  Alert #6: Michael Brown, Age 50
    Trigger: Equity allocation drifted to 72% (target 60%, threshold 65%)
    Drift reason: Market appreciation of stocks
    Drift amount: +7% above target
    Action: Schedule rebalancing discussion
    Objective: Review market conditions, determine rebalancing timing
    Timeline: Within 60 days
    Owner: Investment manager

  CATEGORY 6: Low Engagement Scores
  ────────────────────────────────
  Trigger: Engagement score < 40/100

  Engagement scoring:
    Last meeting: 12+ months ago (-15 points)
    Last plan review: >18 months ago (-15 points)
    Action items open: 3+ items not closed (-10 points)
    Meeting frequency: <2/year (-10 points)
    Responsiveness to advisor: Slow (-10 points)
    Score: 40/100 (LOW engagement)

  EXAMPLE ALERTS:

  Alert #7: Thomas Wilson, Age 68
    Trigger: Engagement score = 38/100
    Last meeting: 14 months ago
    Open action items: 2 (decision on charitable giving, retirement date)
    Action: Relationship re-engagement
    Objective: Schedule call to assess satisfaction, address concerns
    Timeline: Within 7 days (high priority)
    Owner: Relationship manager
```

### 2.2 Alert Queue Management
```
PROACTIVE ALERT QUEUE (Generated from above)

Priority | Client Name      | Alert Type            | Action Required      | Due Date | Owner
────────────────────────────────────────────────────────────────────────────────────
HIGH     | Thomas Wilson    | Low engagement        | Re-engagement call   | 3/21/26  | RM
HIGH     | Sarah Chen       | Large inheritance    | Comprehensive review | 4/10/26  | WM
MEDIUM   | Patricia Davis   | Stale plan (18mo)    | Annual plan review   | 4/15/26  | RM
MEDIUM   | John Anderson    | RMD planning (2yr)   | RMD strategy         | 4/30/26  | Tax
MEDIUM   | Michael Brown    | Portfolio drift >5%  | Rebalancing          | 5/15/26  | IM
MEDIUM   | David Johnson    | Insurance renewal    | Policy review        | 3/25/26  | Insurance
MEDIUM   | Mary Smith       | Roth conversion      | Conversion planning  | 12/31/25 | Senior
LOW      | [7 other clients]| Various              | Follow-up            | Varied   | Varied

TOTAL ALERTS: 15 active
HIGH PRIORITY: 2 (requires urgent action)
MEDIUM: 11
LOW: 2

ALERT TRACKING:

Each alert tracks:
  - Creation date
  - Due date
  - Status (open, in progress, completed, deferred)
  - Assigned owner
  - Required action
  - Expected outcome
  - Follow-up date if needed
```

---

## 3. OPPORTUNITY PIPELINE

### 3.1 Cross-Sell Opportunity Analysis
```
FUNCTION: identify_cross_sell_opportunities():

  // Which clients don't have services they should?
  // What's the revenue opportunity?

  SERVICE OFFERINGS:

  Service Category     | % of Clients Using | Revenue per Engagement
  ──────────────────────────────────────────────────────────
  Investment Mgmt      | 100%               | $3,375/year (0.75% AUM)
  Financial Planning   | 48%                | $3,000/year
  Tax Optimization    | 31%                | $2,500/year
  Estate Planning     | 39%                | $4,000/year
  Insurance Review    | 42%                | $1,500/year
  College Planning    | 18%                | $2,000/year
  Business Succession | 12%                | $5,000/year
  Charitable Planning | 8%                 | $3,000/year

  CROSS-SELL ANALYSIS:

  Metric: Service penetration rate = (# clients with service / total clients) × 100

  High penetration (easy sales, likely already done):
    ✓ Investment Management: 100%

  Medium penetration (good opportunity):
    ⚠ Financial Planning: 48% (75 clients need)
    ⚠ Estate Planning: 39% (95 clients need)
    ⚠ Insurance Review: 42% (90 clients need)

  Low penetration (growth opportunity):
    ⚠ Tax Optimization: 31% (107 clients need)
    ⚠ College Planning: 18% (128 clients need)
    ⚠ Business Succession: 12% (137 clients need)
    ⚠ Charitable Planning: 8% (143 clients need)

  REVENUE OPPORTUNITY CALCULATION:

  Service: Tax Optimization
  ─────────────────────────
  Current clients: 48 (31%)
  Current revenue: 48 × $2,500 = $120,000

  Potential clients: 156 - 48 = 108
  Potential revenue: 108 × $2,500 = $270,000

  Realistic uptake: 50% of potential (54 new clients)
  Revenue opportunity: 54 × $2,500 = $135,000
  Timeline: 18 months
  Effort: Medium (sales + execution)

  Service: Charitable Planning
  ───────────────────────────
  Current clients: 13 (8%)
  Current revenue: 13 × $3,000 = $39,000

  Potential clients: 156 - 13 = 143
  Potential revenue: 143 × $3,000 = $429,000

  Realistic uptake: 20% of potential (29 new clients)
  Revenue opportunity: 29 × $3,000 = $87,000
  Timeline: 24 months
  Effort: High (requires specialist)

CROSS-SELL PRIORITY RANKING:

  1. Tax Optimization ($135K opportunity, medium effort)
  2. College Planning ($128K opportunity, medium effort)
  3. Financial Planning ($105K opportunity, low effort)
  4. Charitable Planning ($87K opportunity, high effort)
  5. Estate Planning ($95K opportunity, medium effort)
  6. Business Succession ($80K opportunity, high effort)
  7. Insurance Review ($70K opportunity, low effort)

  TOTAL CROSS-SELL OPPORTUNITY: ~$700,000 (128% revenue growth)
  REALISTIC 3-YEAR CAPTURE: ~$350,000 (64% growth)
```

### 3.2 Referral Potential Scoring
```
FUNCTION: score_referral_generation_potential():

  // Which clients are most likely to refer?
  // Which are most valuable as referral sources?

  REFERRAL SCORING MODEL:

  Score components (0-100):
    Satisfaction score:       0-25 points
    Engagement level:         0-25 points
    Network quality:          0-25 points
    Financial capacity:       0-15 points
    Explicit referral willingness: 0-10 points

  CLIENT REFERRAL SCORES:

  Rank | Client Name       | Score | Sat. | Engage. | Network | Capacity | Willing
  ────────────────────────────────────────────────────────────────────────────
  1    | Smith Trust       | 95    | 24   | 25      | 23      | 15       | 8
  2    | Anderson, John    | 91    | 23   | 23      | 22      | 14       | 9
  3    | Jones Estate      | 88    | 22   | 22      | 20      | 12       | 12 (!)
  4    | Wilson Partnership| 85    | 20   | 24      | 21      | 12       | 8
  5    | Tech Executive    | 82    | 21   | 21      | 19      | 15       | 6
  [continuing through list]

  INTERPRETATION:

  Tier 1 (90+): ADVOCATE clients
    • Highly satisfied, deeply engaged
    • Strong networks or influence
    • Actively refer (have done already)
    Action: Maintain relationship, ask for referrals, recognize contributions
    Candidates: Smith, Anderson

  Tier 2 (80-89): PROMOTER clients
    • Satisfied, good engagement
    • Moderate network influence
    • May refer with encouragement
    Action: Build stronger relationships, ask for introductions
    Candidates: Jones Estate, Wilson, Tech Exec

  Tier 3 (70-79): POTENTIAL clients
    • Reasonable satisfaction
    • Moderate engagement
    • Unlikely to refer without prompting
    Action: Improve engagement, ask specifically for referrals
    Candidates: [various]

  Tier 4 (<70): AT RISK clients
    • Low satisfaction or engagement
    • Will not refer
    • May leave
    Action: Priority engagement to improve relationship
    Candidates: [low-engagement clients]

  REFERRAL CONVERSION RATES:

  Average referral conversion (industry): 30%
  This book estimated potential: 35% (higher quality referrals)

  Tier 1 referrals: 50% conversion (advocates are credible)
  Tier 2 referrals: 35% conversion
  Tier 3 referrals: 20% conversion

  REFERRAL REVENUE PROJECTION:

  5 Tier 1 clients, 3 referrals each:
    15 referrals × 50% conversion = 7.5 new clients
    Expected AUM: 7.5 × $400K avg = $3,000,000
    Expected revenue: $22,500/year

  15 Tier 2 clients, 2 referrals each:
    30 referrals × 35% conversion = 10.5 new clients
    Expected AUM: 10.5 × $300K avg = $3,150,000
    Expected revenue: $23,625/year

  Total referral opportunity: 18 new clients, $6.15M AUM, $46K annual revenue
  Timeline: 12-24 months

  ACTION PLAN:

  Q1: Identify and recognize top 5 referral advocates
  Q2: Request specific introductions from Tier 1-2 clients
  Q3-Q4: Nurture and convert referred prospects
  Q1 (next year): Request feedback, measure referral outcomes
```

### 3.3 Assets-Not-Held Estimation
```
FUNCTION: estimate_assets_not_held():

  // How much money do clients have outside of your management?
  // What's the revenue if captured?

  CLIENT EXAMPLE ANALYSIS:

  Client: John Anderson, Age 58
  Current AUM with us: $1,750,000
  Estate value (estimated): $3,200,000
  Assets not held with us: $1,450,000

  BREAKDOWN OF ASSETS NOT HELD:

  Employer 401(k) (still working):        $650,000
  Real estate equity (home):              $400,000
  Business interest (20% of business):    $300,000
  Cash and money market:                  $75,000
  Spouse's separate assets:               $25,000
  Total not held:                         $1,450,000

  OPPORTUNITY ANALYSIS:

  401(k) (post-retirement):
    When client retires (age 60-62): Can roll to us
    Timeline: 3-4 years
    Revenue impact: +$4,875/year (at 0.75%)

  Real estate equity:
    Unlikely to move (illiquid, primary residence)
    Not a revenue opportunity

  Business interest:
    If business is sold/valued highly: Windfall opportunity
    Contingency: Monitor business health
    Potential: +$2,250/year if eventually liquidated

  Cash and money market:
    Opportunity to consolidate into portfolio
    Current revenue impact: +$563/year
    Action: Discuss cash management strategy

  Total potential assets: $1,050,000 (650K + 300K + 100K)
  Potential annual revenue: +$7,875/year
  Timeline: 3-5 years
  Probability: 70% (401k rollover likely; business sale uncertain)

  BOOK-WIDE ASSETS-NOT-HELD:

  Aggregate AUM with us: $45,230,000
  Estimated total client estate: $78,450,000
  Assets not held: $33,220,000 (42% of client wealth)

  BREAKDOWN:

  Employer retirement plans (pre-rollover): $12,200,000
  Real estate (primary residence):         $8,400,000
  Real estate (investment property):       $4,500,000
  Spouse/family separate assets:           $3,800,000
  Business interests:                      $2,400,000
  Life insurance (cash value):             $1,200,000
  Other assets:                            $720,000

  REVENUE OPPORTUNITY:

  Realistic capture (20% of non-real-estate): $6,380,000
  Additional annual revenue: $47,850/year (8.8% of current book)
  Timeline: 3-5 years
  Primary driver: Retirement plan rollovers at client job transitions

  ACTION PLAN:

  Monitor employer plan status for all clients still employed
  Create rollover plan at retirement (track expected timing)
  Prepare IRA rollover process to streamline execution
  Document business succession planning (may lead to liquidity)
```

### 3.4 Service Upgrade Candidate Analysis
```
FUNCTION: identify_service_tier_upgrade_opportunities():

  // Which clients can afford/should move to higher-service tiers?
  // Revenue growth from tier elevation?

  CURRENT TIER DISTRIBUTION:

  Tier                | AUM Range      | Count | Annual Revenue/Client | Year 1 Gross
  ─────────────────────────────────────────────────────────────────────────────────
  Foundational        | $100K-250K     | 52    | $1,200               | $62,400
  Core                | $250K-500K     | 45    | $3,000               | $135,000
  Comprehensive       | $500K-1M       | 22    | $5,750               | $126,500
  Wealth              | $1M-2M         | 8     | $10,000              | $80,000
  Enterprise          | $2M+           | 3     | $18,000              | $54,000

  UPGRADE CANDIDATES:

  Criteria for upgrade:
    • Growth in AUM > 25% in last year (outgrew their tier)
    • Strong engagement and satisfaction
    • Expressed interest in additional services
    • Tier-appropriate net worth

  EXAMPLE CANDIDATES:

  Tier: Foundational → Core
  ───────────────────────

  Client: Susan Mitchell
    Current AUM: $248,000 (at tier boundary)
    Growth YoY: +32% ($183K starting value)
    Engagement: High (5 meetings last year)
    Satisfaction: Excellent (93/100 score)
    Current revenue: $1,440/year (0.75% AUM)
    Proposed tier: Core (5-tier service package)
    Upgraded revenue: $3,000/year
    Revenue lift: +$1,560/year (108% increase)

  Action: Schedule consultation to discuss "next-level" services
  Timing: Next quarter

  Tier: Core → Comprehensive
  ──────────────────────────

  Client: Harris Family Office
    Current AUM: $485,000
    Growth YoY: +28% ($380K starting value)
    Engagement: High (4 meetings, planning work active)
    Satisfaction: Good (85/100 score)
    Current revenue: $3,638/year (0.75% AUM)
    Proposed tier: Comprehensive (add estate, tax, charitable services)
    Upgraded revenue: $5,750/year
    Revenue lift: +$2,112/year (58% increase)
    Additional services needed: Estate plan review, charitable giving strategy

  Action: Present comprehensive tier benefits
  Timeline: Within 60 days

  BOOK-WIDE UPGRADE OPPORTUNITY:

  Foundational → Core:
    Candidates: 8 clients with AUM >$220K
    Potential revenue lift: +$9,600/year

  Core → Comprehensive:
    Candidates: 12 clients with AUM >$450K
    Potential revenue lift: +$25,400/year

  Comprehensive → Wealth:
    Candidates: 4 clients with AUM >$900K
    Potential revenue lift: +$18,200/year

  Total upgrade opportunity: $53,200/year (9.8% of current book)
  Timeline: 18 months
  Effort: Medium (service delivery, client education)

  SUCCESS FACTORS:

  1. Demonstrate value of higher-tier services (with examples)
  2. Don't make it feel like a "fee grab" (focus on service)
  3. Offer trial period or pilot engagement
  4. Link upgrade to client's stated goals/needs
```

---

## 4. RISK DASHBOARD

### 4.1 Concentration Risk Across Book
```
CONCENTRATION RISK SUMMARY:

┌─────────────────────────────────────┐
│ AUM CONCENTRATION                   │
├─────────────────────────────────────┤
│ Top 5 clients:  26.2% of book      │
│ Top 10:         44.4% of book      │
│ Top 20:         71.7% of book      │
│ Risk level:     MODERATE           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ REVENUE CONCENTRATION               │
├─────────────────────────────────────┤
│ Top 5 clients:  19.5% of revenue   │
│ Top 10:         28.2% of revenue   │
│ Top 20:         45.0% of revenue   │
│ Risk level:     MODERATE-HIGH      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ RETENTION RISK (HIGH AUM)           │
├─────────────────────────────────────┤
│ High-risk clients (AUM >$2M):      │
│  • Smith Trust ($3.2M)              │
│  • Jones Estate ($2.85M)            │
│                                     │
│ Mitigation: Quarterly reviews,      │
│ dedicated relationship management    │
└─────────────────────────────────────┘

RISK ASSESSMENT:

RED FLAGS:
  ✗ Loss of any top-3 client = >6% revenue impact
  ✗ Top 20 clients = 72% of AUM (over-concentrated)
  ✗ Limited geographic/industry diversification

YELLOW FLAGS:
  ⚠ Revenue dependent on AUM fees (limited service diversification)
  ⚠ Fee compression risk (larger clients may negotiate lower rates)

MITIGATION PLAN:

  1. Develop client retention program for top 10
  2. Increase service fee revenue (reduce AUM dependency)
  3. Grow mid-market segment (dilute top-10 concentration)
  4. Diversify across industries/geographies
```

### 4.2 Compliance Attention Needed
```
COMPLIANCE RISK ALERTS:

┌────────────────────────────────────────┐
│ SUITABILITY REVIEW NEEDED              │
├────────────────────────────────────────┤
│ Clients without current IPS:      8    │
│ % of book:                         5%  │
│ Risk level:                      HIGH  │
│ Action: Complete IPS within 30 days    │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ DISCLOSURE UPDATES REQUIRED            │
├────────────────────────────────────────┤
│ Clients with outdated fee addendum: 12 │
│ % of book:                         7.7%│
│ Risk level:               MEDIUM-HIGH  │
│ Action: Update by end of Q2            │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ AGE/CAPACITY MONITORING                │
├────────────────────────────────────────┤
│ Clients age 85+:                  12   │
│ Capacity concerns identified:      3   │
│ % of book:                         1.9%│
│ Risk level:                    MEDIUM  │
│ Action: Document capacity assessments  │
└────────────────────────────────────────┘

REMEDIATION SCHEDULE:

  Q1: Complete all missing IPS (8 clients)
  Q2: Update fee addendums (12 clients)
  Q3-Q4: Annual compliance review of all 156 clients
```

### 4.3 Client Retention Risk Signals
```
RETENTION RISK SCORING:

Factors (0-100 score):
  Engagement level (0-30):    How often meeting with client
  Satisfaction level (0-30):  Client satisfaction survey/NPS
  Service breadth (0-20):     How many services client uses
  Tenure (0-20):              How long client has been with firm

AT-RISK CLIENTS (Score < 50):

Client Name          | Score | Engagement | Satisfaction | Services | Tenure
──────────────────────────────────────────────────────────────────────
Thomas Wilson        | 38    | 15         | 18           | 10       | 15
  → Issue: Low engagement (14mo since meeting), no plan updates
  → Risk: May shop around or go dormant
  → Action: Urgent relationship re-engagement call

Patricia Chen        | 42    | 20         | 16           | 10       | 12
  → Issue: Declining satisfaction (was 88 last year, now 76)
  → Risk: Considering alternatives
  → Action: Schedule comprehensive review within 30 days

[5 other clients in 40-49 range]

RETENTION IMPROVEMENT PLAN:

  Client              | Current Engagement | Proposed Action | Timeline
  ──────────────────────────────────────────────────────────────────
  Thomas Wilson       | 1x/year            | 4x/year         | Q2 start
  Patricia Chen       | 2x/year            | 3x/year + plan  | Q1 start
  [others]            | [varied]           | [tailored]      | [varied]

Goal: Move all at-risk clients (score <50) to <60 within 6 months
      Move all at-risk clients (score <60) to >70 within 12 months
```

### 4.4 Market Sensitivity Analysis
```
FUNCTION: analyze_portfolio_market_exposure():

  // Which clients are most affected by current market conditions?

  MARKET SCENARIO: S&P 500 down 15%

  Affected clients (high equity exposure):
    Count: 48 clients with >70% equity allocation
    Total AUM: $18,500,000
    Projected portfolio impact: -$2,775,000

  Median portfolio loss per client: $57,813
  Max portfolio loss: Tech Executive (-$400,000)
  Min portfolio loss: Conservative client (-$25,000)

  STRESS SCENARIO: S&P 500 down 25%

  Affected clients:
    Count: 48 (same as above)
    Total AUM: $18,500,000
    Projected portfolio impact: -$4,625,000

  BEHAVIORAL RISK:

  Clients most likely to panic-sell:
    • 18 clients with >80% equity
    • Recent market volatility experience
    • Low engagement (may not hear advisor context)

  MITIGATION PLAN:

  1. Pre-market-decline communication
     → Send market perspective before decline occurs
     → Set expectations for volatility

  2. Rapid advisor outreach after 10%+ decline
     → High-equity clients get called within 48 hours
     → Reinforce investment thesis

  3. Rebalancing opportunity messaging
     → Frame market decline as "buy the dip"
     → Offer tactical rebalancing conversations

  ADVISOR ACTION ITEMS:

  By market decline -10%:
    Call 15 highest-risk clients (likely to panic)
    Send market commentary to full client base
    Prep talking points for advisor calls

  By market decline -15%:
    Identify any clients who want to exit
    Document discussions (compliance requirement)
    Offer strategic rebalancing

  By market recovery +5%:
    Follow-up calls to clients who expressed concerns
    Document positive outcomes of staying the course
```

---

## 5. PERFORMANCE METRICS

### 5.1 Client Satisfaction Trends
```
NPS (NET PROMOTER SCORE) ANALYSIS:

Definition:
  Question: "How likely are you to recommend [firm] to a friend?"
  Scale: 0-10
  Promoters (9-10): Likely to refer
  Passives (7-8): Neutral
  Detractors (0-6): Unlikely to refer

  NPS = (# Promoters - # Detractors) / Total respondents × 100

BOOK NPS RESULTS:

Current period: 48 (industry average: 35-45)
Prior period: 52 (trending down slightly)
6-month change: -4 (slight decline)

BREAKDOWN BY CLIENT SEGMENT:

Segment          | Respondents | Promoters | Passives | Detractors | NPS
─────────────────────────────────────────────────────────────────────
Enterprise       | 3           | 3         | 0        | 0          | 100
Wealth           | 8           | 7         | 1        | 0          | 87
Comprehensive    | 22          | 16        | 4        | 2          | 64
Core             | 45          | 25        | 15       | 5          | 44
Foundational     | 52          | 18        | 28       | 6          | 23
Digital          | 26          | 5         | 16       | 5          | -27

INTERPRETATION:

Positive:
  ✓ Enterprise segment: Perfect NPS (100) - highly satisfied
  ✓ Overall book: 48 is above industry average (strong)

Concerns:
  ✗ Digital segment: -27 (problem area, low-touch model not working)
  ✗ Foundational: 23 (low engagement affecting satisfaction)
  ✗ Declining trend: -4 points (investigate causes)

ACTION PLAN:

Digital segment improvement:
  • Increase engagement frequency (quarterly vs. annual)
  • Improve technology platform usability
  • Set NPS recovery target: -27 → 0 within 12 months

Foundational upgrade:
  • Test moving some to hybrid model (occasional advisor calls)
  • Set NPS target: 23 → 40 within 18 months
```

### 5.2 Meeting Cadence Compliance
```
MEETING FREQUENCY STANDARDS:

Tier                | Minimum Frequency | Actual (Book)
───────────────────────────────────────────────────────
Enterprise (2M+)    | 4x/year           | 4.2x/year ✓
Wealth (1-2M)       | 3x/year           | 2.8x/year ✗
Comprehensive       | 2x/year           | 1.9x/year ✗
Core                | 1.5x/year         | 1.2x/year ✗
Foundational        | 1x/year           | 0.8x/year ✗
Digital             | 0.5x/year         | 0.3x/year ✗

COMPLIANCE ANALYSIS:

Meeting cadence compliance:
  Fully compliant (≥80% of target): 43 clients (27.6%)
  Mostly compliant (60-80%):        52 clients (33.3%)
  Partially compliant (40-60%):     38 clients (24.4%)
  Non-compliant (<40%):             23 clients (14.7%)

SHORTFALL IMPACT:

Annual meetings "owed" but not delivered:
  Enterprise:       3 meetings (1 less than planned)
  Wealth:          6 meetings (8 clients × 0.2 less)
  Comprehensive:   11 meetings
  Core:            27 meetings
  Foundational:    26 meetings
  Digital:         19 meetings

  Total deficit: 92 meetings/year (not meeting standards)

ROOT CAUSE ANALYSIS:

  Limited advisor time (60-70% capacity utilized)
  Delegation to service team incomplete
  Some clients reluctant to meet (low-engagement segment)

REMEDIATION PLAN:

  Q2: Hire junior advisor or service coordinator
  Q3: Implement meeting scheduling system (automate outreach)
  Q4: Re-baseline cadence metrics; target 80% compliance
  Target: 100% compliance within 12 months
```

### 5.3 Action Item Completion Rates
```
ACTION ITEM TRACKING:

Open action items (across all clients):   142
Overdue items (past target date):          28 (19.7%)
At-risk items (due within 30 days):        34 (23.9%)
On-track items:                            80 (56.3%)

COMPLETION RATES BY CLIENT SEGMENT:

Tier          | Total Items | Overdue | Completion Rate
──────────────────────────────────────────────────
Enterprise    | 12          | 0       | 100%
Wealth        | 28          | 2       | 93%
Comprehensive | 34          | 4       | 88%
Core          | 38          | 10      | 74%
Foundational  | 22          | 8       | 64%
Digital       | 8           | 4       | 50%

ANALYSIS:

Overdue action items indicate:
  • Client procrastination (e.g., gathering documents)
  • Advisor capacity constraints
  • Unclear ownership or deadline

Most common overdue items:
  1. Document gathering (30%)
  2. Insurance applications (20%)
  3. Estate document review (18%)
  4. Tax return review (15%)
  5. Other (17%)

IMPROVEMENT PLAN:

  1. Establish "bottleneck" support for document gathering
  2. Delegate insurance applications to specialist
  3. Hire document coordinator (target: clear backlog by Q3)
  4. Automatic reminders for overdue items (system-triggered)
  5. Monthly action item review with advisors
```

### 5.4 Revenue Growth Trajectory
```
REVENUE ANALYSIS (Last 3 Years):

Year | Total Revenue | AUM-Based Fees | Service Fees | YoY Growth
─────────────────────────────────────────────────────────────
2023 | $465,200      | $330,000       | $125,000     | —
2024 | $512,300      | $362,000       | $138,000     | +10.1%
2025 | $544,340      | $375,000       | $168,000     | +6.3%

GROWTH DRIVERS:

2023-2024:
  AUM growth: $42.1M → $44.6M (+5.9%)
  Fee rate: 0.78% → 0.81% (slight increase)
  Service fees: +$13K (more planning engagements)
  Net growth: +10.1%

2024-2025:
  AUM growth: $44.6M → $45.2M (+1.3%) — SLOWING
  Fee rate: 0.81% → 0.83% (modest increase)
  Service fees: +$30K (scaling engagements)
  Net growth: +6.3% (slowing, concerning)

REVENUE FORECAST (2026):

Organic growth scenario:
  AUM: $45.2M × 1.025 (2.5% growth) = $46.34M
  Fee rate: 0.83% × 1.01 = 0.84%
  AUM fees: $38,857
  Service fees: $178,000 (continued scaling)
  Projected 2026 revenue: $566,857 (+4.1% growth)

Growth acceleration scenario (with initiatives):
  Cross-sell (Tax, Planning):    +$85,000
  Tier upgrades:                 +$53,200
  Referral inflow:               +$46,875
  Service scale:                 +$30,000
  Total additional:              +$215,075

  Projected 2026 revenue: $759,415 (+39.6% growth!) ← Stretch goal

TARGET:

  Minimum: $566,857 (organic growth)
  Realistic: $625,000-650,000 (organic + some initiatives)
  Stretch: $700,000+ (full initiative execution)

ACTION PRIORITIES:

  Q1-Q2: Launch cross-sell initiative (highest ROI)
  Q2-Q3: Tier upgrade campaign (40 candidates identified)
  Q3-Q4: Referral program formalization
  Ongoing: Service fee expansion (add specialist services)
```

---

## 6. KB RETRIEVAL TRIGGERS

**Before analysis, retrieve:**

1. **Service Catalog & Pricing** — All available services, fee structure
   - Path: /kb/services/service-catalog-with-pricing-2024.json

2. **Client Database Schema** — Account structure, relationship fields
   - Path: /kb/data-model/client-database-schema.md

3. **Compliance Requirements** — Meeting frequency standards, review requirements
   - Path: /kb/compliance/review-frequency-standards.md

4. **Planning Methodologies** — Cross-sell criteria, tier definitions
   - Path: /kb/planning-methodologies/service-tier-definitions.md

---

## 7. OUTPUT REQUIREMENTS

### 7.1 Dashboard Data Payload (JSON)
```json
{
  "analysis_date": "ISO-8601",
  "book_summary": {
    "total_clients": 156,
    "total_aum": 45230000,
    "annual_revenue": 544340,
    "nps_score": 48
  },
  "aum_concentration": {
    "top_10_percent": 44.4,
    "top_20_percent": 71.7,
    "herfindahl_index": 2100,
    "risk_level": "moderate"
  },
  "alerts": [
    {
      "client_id": "string",
      "alert_type": "approaching_rmd|policy_renewal|stale_plan|life_event|portfolio_drift|low_engagement",
      "priority": "high|medium|low",
      "action_required": "string",
      "due_date": "ISO-8601"
    }
  ],
  "opportunities": {
    "cross_sell_pipeline": {
      "service": "Tax Optimization",
      "potential_clients": 108,
      "revenue_opportunity": 270000,
      "realistic_capture_18mo": 135000
    },
    "assets_not_held": 33220000,
    "service_upgrade_candidates": 24,
    "upgrade_revenue_opportunity": 53200
  },
  "risks": {
    "concentration_alerts": ["string"],
    "compliance_gaps": 8,
    "retention_risk_clients": 5
  },
  "performance": {
    "nps_by_segment": {"enterprise": 100, "wealth": 87, ...},
    "meeting_cadence_compliance": 72.3,
    "action_item_completion_rate": 80.3,
    "revenue_growth_yoy": 6.3
  }
}
```

### 7.2 Alert Queue (Structured Table)
```
[See section 2.2 above]
```

### 7.3 Opportunity Pipeline (Summary)
```
[See section 3 above]
```

### 7.4 Risk Dashboard (Structured)
```
[See section 4 above]
```

### 7.5 Performance Metrics (Scorecard)
```
[See section 5 above]
```

---

## 8. VALIDATION GATES

Before publishing dashboard:

```
GATE 1: Data Accuracy
  ☐ AUM figures reconcile to portfolio statements
  ☐ Revenue figures reconcile to ledger
  ☐ Client counts match master list (no duplicates)
  IF not: Investigate and correct discrepancies

GATE 2: Alert Relevance
  ☐ All alerts have triggering data (not assumptions)
  ☐ Action items are specific and actionable
  ☐ Due dates are realistic and documented
  IF not: Revise or remove alerts

GATE 3: Opportunity Realism
  ☐ Cross-sell opportunities based on client needs (not just revenue)
  ☐ Asset-not-held estimates defensible
  ☐ Conversion rates realistic (not inflated)
  IF not: Adjust assumptions

GATE 4: Risk Assessment
  ☐ Concentration risk quantified with metrics
  ☐ Retention risks based on engagement data
  ☐ Compliance gaps identified with remediation plan
  IF not: Add mitigation plans before publishing
```

---

## 9. USAGE NOTES

- Update dashboard monthly (or trigger on significant events)
- Alert queue is operational tool (not planning document)
- Opportunity pipeline should feed into strategic plan
- Performance metrics track progress against annual goals
- Risk dashboard triggers corrective actions
- This prompt produces advisor-facing business intelligence
