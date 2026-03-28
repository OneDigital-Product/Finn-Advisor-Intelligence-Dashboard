# 22-retirement-analysis.md
## Function: Route-level - Retirement Analysis

### PURPOSE
Model multi-scenario retirement projections with comprehensive income sources, expense phases, gap analysis, tax-efficient withdrawal sequencing, and sustainability metrics. Every projection is calculated, not estimated.

---

## CORE ARCHITECTURE

### 1. MULTI-SCENARIO PROJECTION ENGINE

### 1.1 Base Case Scenario
```
BASE CASE ASSUMPTIONS:
  - Expected annual portfolio return: [Weighted average return by asset class]
  - Stated retirement age: [From client input or analysis]
  - Planned spending level: [Annual retirement budget]
  - Inflation assumption: 2.5% annual
  - Life expectancy: Age 95 (or IRS Publication 590 tables)

CALCULATION ENGINE:

FOR year IN [2024...retirement_age, ..., life_expectancy]:

  // Beginning balance
  portfolio_balance[year] = portfolio_balance[year-1] × (1 + annual_return)

  // Income sources
  social_security[year] = CALCULATE_SS(claiming_age, birth_date)
  pension[year] = CALCULATE_PENSION(vesting, election)
  part_time_work[year] = ESTIMATE_WORK_INCOME(phased_retirement)
  rental_income[year] = passive_income[year]

  total_income[year] = SS + pension + work_income + rental_income

  // Spending
  annual_spending[year] = planned_spending × (1 + inflation_rate)^(year - current_year)

  // Withdrawals needed
  if total_income[year] < annual_spending[year]:
    withdrawal_needed[year] = annual_spending[year] - total_income[year]
    portfolio_balance[year] -= withdrawal_needed[year]
  else:
    withdrawal_needed[year] = 0
    excess_income[year] = total_income[year] - annual_spending[year]
    portfolio_balance[year] += excess_income[year]

  // Terminal value at life expectancy
  if year == life_expectancy:
    terminal_value[base_case] = portfolio_balance[year]
    success_flag = (terminal_value > 0)

RESULT: Base case success rate (probability that portfolio outlasts client life)
```

### 1.2 Optimistic Scenario
```
OPTIMISTIC CASE:
  - Portfolio returns: Base case + 1.0% (market outperforms)
  - Retirement spending: Base case (no change in expectations)
  - Inflation: 2.0% (lower than base)
  - All other assumptions: Base case

// Use same calculation loop with adjusted return assumption

FOR year IN retirement_years:
  portfolio_balance[year] = portfolio_balance[year-1] × (1 + (annual_return + 1%))
  // [rest of loop identical]

RESULT: What if markets cooperate? Optimistic terminal value and success rate
```

### 1.3 Pessimistic Scenario
```
PESSIMISTIC CASE:
  - Portfolio returns: Base case - 1.0% (market underperforms)
  - Retirement spending: Base case + 0.5% (inflation higher, spending increases)
  - Inflation: 3.5% (higher than base)
  - All other assumptions: Base case

// Use same calculation loop with adjusted assumptions

FOR year IN retirement_years:
  annual_return_adjusted = annual_return - 1.0%
  inflation_adjusted = 0.035
  spending_adjusted = planned_spending × (1 + inflation_adjusted)^years

  portfolio_balance[year] = portfolio_balance[year-1] × (1 + annual_return_adjusted)
  // [withdraw adjusted spending amount]

RESULT: What if markets disappoint? Stress-test terminal value
```

### 1.4 Early Retirement Scenario
```
EARLY RETIREMENT CASE:
  - Retirement age: Client age - 2 to 5 years
  - Additional years drawing from portfolio: +2 to +5
  - Increased spending (travel, activities): +15-20%
  - Healthcare timing: Access at earlier age (higher costs)
  - Social Security: Delayed to reduce penalty

// Calculation loop extended for additional years of withdrawals

early_retirement_age = stated_retirement_age - 5  // Example: retire at 60 vs. 65

FOR year IN [current_year...early_retirement_age]:
  // Accumulation phase (unchanged)
  portfolio_balance[year] = portfolio_balance[year-1] × (1 + annual_return)

FOR year IN [early_retirement_age...life_expectancy]:
  // Extended distribution phase
  spending_early_retirement = planned_spending × 1.20 (20% higher)
  ss_penalty = CALCULATE_SS_REDUCTION(claiming_at_62_vs_FRA)
  // Example: 7% annual reduction from FRA payment amount

  social_security[year] = ss_fra_amount × (1 - ss_penalty)^(years_before_fra)
  portfolio_balance[year] = portfolio_balance[year-1] × (1 + return) - withdrawals

RESULT: Success probability for early retirement (typically lower than base)
```

### 1.5 Extended Career Scenario
```
EXTENDED CAREER CASE:
  - Retirement age: Client age + 2 to 5 years
  - Additional years of savings/earnings: +2 to +5
  - Reduced portfolio withdrawals: Later start
  - Increased Social Security: Delayed claiming benefit
  - Smaller portfolio drawdown rate needed

// Calculation loop shortened for distribution phase

extended_retirement_age = stated_retirement_age + 5  // Example: retire at 70 vs. 65

FOR year IN [current_year...extended_retirement_age]:
  // Extended accumulation phase
  if year < extended_retirement_age:
    portfolio_balance[year] = portfolio_balance[year-1] × (1 + annual_return)
    portfolio_balance[year] += annual_savings (still working)

FOR year IN [extended_retirement_age...life_expectancy]:
  // Shortened distribution phase, but higher balance
  social_security[year] = ss_fra_amount × 1.24  // +8% for each year after FRA to 70
  portfolio_balance[year] = portfolio_balance[year-1] × (1 + return) - withdrawals
  // Smaller withdrawals needed due to larger balance

RESULT: Success probability for extended career (typically higher than base)
```

### 1.6 Scenario Comparison Output
```json
{
  "scenario_analysis": [
    {
      "scenario": "base_case",
      "success_probability": 0.85,
      "terminal_value_at_95": 425000,
      "average_annual_portfolio_balance": 1200000,
      "first_year_portfolio_decline": false,
      "portfolio_depletion_age": null
    },
    {
      "scenario": "optimistic",
      "success_probability": 0.98,
      "terminal_value_at_95": 780000,
      "average_annual_portfolio_balance": 1450000,
      "first_year_portfolio_decline": false,
      "portfolio_depletion_age": null
    },
    {
      "scenario": "pessimistic",
      "success_probability": 0.62,
      "terminal_value_at_95": 95000,
      "average_annual_portfolio_balance": 850000,
      "first_year_portfolio_decline": true,
      "portfolio_depletion_age": 87
    },
    {
      "scenario": "early_retirement",
      "success_probability": 0.72,
      "terminal_value_at_95": 185000,
      "average_annual_portfolio_balance": 950000,
      "portfolio_depletion_age": 92
    },
    {
      "scenario": "extended_career",
      "success_probability": 0.94,
      "terminal_value_at_95": 625000,
      "average_annual_portfolio_balance": 1350000,
      "portfolio_depletion_age": null
    }
  ]
}
```

---

## 2. INCOME SOURCE MODELING

### 2.1 Social Security Optimization Analysis
```
FUNCTION: optimize_social_security_claiming():

  // Social Security benefit amount varies by claiming age
  // Critical analysis: When should client claim?

  client_birth_date = "1962-06-15"
  full_retirement_age = CALCULATE_FRA(birth_date)  // Born 1962: FRA = 66.6

  CLAIMING_AGE_SCENARIOS:

  FOR claiming_age IN [62, 63, 64, 65, 66.6 (FRA), 67, 68, 69, 70]:

    // Calculate Primary Insurance Amount (PIA)
    pia = CALCULATE_PIA(client_earnings_record)  // Based on highest 35 years

    // Apply claiming age reduction/increase factor
    if claiming_age < full_retirement_age:
      reduction_factor = 1 - (0.556% per month before FRA)
      monthly_benefit = pia × reduction_factor
      // Example: 62 (48 months before 66.6) = 26.7% reduction

    else if claiming_age == full_retirement_age:
      monthly_benefit = pia
      reduction_factor = 1.0

    else:  // claiming_age > FRA
      increase_factor = 1 + (0.8% per month after FRA)
      monthly_benefit = pia × increase_factor
      // Example: 70 (40 months after 66.6) = 32% increase

    annual_benefit = monthly_benefit × 12

    // Calculate lifetime value (break-even analysis)
    lifetime_value[claiming_age] = 0

    FOR age IN [claiming_age...100]:
      years_receiving = age - claiming_age
      lifetime_value[claiming_age] += (annual_benefit × (1 + inflation)^years_receiving)
      // Discount to present value using reasonable discount rate (2-3%)

  // Find optimal claiming strategy
  max_lifetime_pv = MAX(lifetime_value)
  optimal_claiming_age = claiming_age WHERE lifetime_value == max_lifetime_pv

CLAIMING AGE BREAK-EVEN TABLE:

Claiming Age | Monthly Benefit | Annual Benefit | Breakeven Age | Lifetime PV
─────────────────────────────────────────────────────────────────────────
62           | $2,300         | $27,600        | 78            | $780K
64           | $2,800         | $33,600        | 81            | $920K
66.6 (FRA)   | $3,200         | $38,400        | —             | $1,050K
68           | $3,700         | $44,400        | 80            | $1,120K
70           | $4,240         | $50,880        | 82            | $1,150K

RECOMMENDATION LOGIC:

IF life_expectancy >= 85 AND has_adequate_portfolio:
  RECOMMEND: "Delay claiming to 70" (maximize lifetime income)
  RATIONALE: "If you live past 82, monthly check is permanently higher"

ELSE IF life_expectancy < 80 OR needs_income_now:
  RECOMMEND: "Claim at 62" (maximize present value dollars)
  RATIONALE: "Earlier claiming makes sense if portfolio is tight"

ELSE IF life_expectancy 80-85 AND wants_balance:
  RECOMMEND: "Claim at FRA (66.6)" (balance)
  RATIONALE: "No reduction, reasonable growth, middle-ground timing"

COUPLES ANALYSIS (if married):
  // More complex due to spousal benefit rules under SECURE Act

  Spouse A (higher earner): Delay to 70 for maximum benefit
  Spouse B (lower earner): May claim at 62 or FRA depending on full retirement age

  // File and suspend strategy NO LONGER AVAILABLE post-SECURE Act
  // Restricted application for spousal benefits eliminated

  STRATEGY: Coordinate claiming age to maximize household income
```

### 2.2 Pension Analysis (Lump Sum vs. Annuity)
```
FUNCTION: evaluate_pension_payout_options():

  // Some clients receive traditional pension with choice of:
  // (A) Lump sum distribution today
  // (B) Monthly annuity for life
  // (C) Joint and survivor annuity (life + spouse)

  pension_lump_sum_available = $350,000 (company pension plan)
  monthly_annuity_option_single = $2,100 (for life)
  monthly_annuity_option_joint = $1,850 (life + 75% to spouse after death)

  ANALYSIS A: Take lump sum, invest in portfolio

  IF lump_sum_invested = $350,000
  AND portfolio_return = 4.5%:
    annual_income_from_lump_sum = $350,000 × 0.045 = $15,750

    // More than annuity initially, but no growth
    // Risk: Market performance affects sustainability

  ANALYSIS B: Take monthly annuity

  monthly_annuity = $2,100
  annual_income_from_annuity = $2,100 × 12 = $25,200

  // No market risk
  // No lump sum to invest
  // Guaranteed for life (inflation typically not indexed)

  BREAK-EVEN ANALYSIS:

  lump_sum_option = $350,000 invested at 4.5%

  FOR age IN [65...95]:
    years_receiving = age - 65

    value_from_lump_sum = $350,000 × (1.045^years_receiving)
    cumulative_annuity = $25,200 × years_receiving

    if age == 80:
      value_from_lump_sum = $350,000 × (1.045^15) = $706,000
      cumulative_annuity = $25,200 × 15 = $378,000
      // Lump sum ahead

    if age == 95:
      value_from_lump_sum = $350,000 × (1.045^30) = $1,420,000
      cumulative_annuity = $25,200 × 30 = $756,000
      // Lump sum significantly ahead (but client got $25,200/year for 30 years)

RECOMMENDATION CRITERIA:

TAKE LUMP SUM IF:
  ✓ Comfortable managing investments
  ✓ Portfolio is adequate to support retirement
  ✓ Health is good (expect to live into 80s)
  ✓ Seeking to leave legacy (annuity ends at death)

TAKE ANNUITY IF:
  ✓ Prefer guaranteed income and no market risk
  ✓ Concerned about investment performance
  ✓ Health issues suggest shorter life expectancy
  ✓ Want spouse protected (choose joint and survivor option)

HYBRID APPROACH:
  ✓ Take lump sum, but use immediate annuity to create guaranteed income floor
  ✓ Invest remainder of lump sum in growth portfolio
  ✓ Example: $350K lump sum → $100K immediate annuity (~$650/month)
                               → $250K invested (4.5% = $11,250/year)
                               → Total reliable income = $18,050/year + market upside
```

### 2.3 Part-Time Work Income Phase
```
FUNCTION: model_phased_retirement():

  // Some clients plan to work part-time in early retirement

  current_age = 62
  stated_retirement_age = 65

  PHASE 1: Ages 62-65 (transition years)
    Full-time employment:      Years 1-2 (age 62-63)
    Part-time work:             Years 3-3 (age 64-65)
    Planned part-time income:   $40,000/year

  PHASE 2: Ages 65-70 (semi-retirement)
    Light consulting:           $25,000/year
    OR: One day per week work:  Variable

  PHASE 3: Age 70+ (full retirement)
    No earned income

  INCOME PROJECTION:

  Year | Age | Employment Status    | Earned Income | SS Income | Portfolio Draw
  ────────────────────────────────────────────────────────────────────────────
  2024 | 62  | Full-time           | $80,000       | $0        | $0
  2025 | 63  | Full-time           | $85,000       | $0        | $0
  2026 | 64  | Part-time (40%)     | $40,000       | $0        | $5,000
  2027 | 65  | Part-time (25%)     | $30,000       | $24,000   | $8,000
  2028 | 66  | Part-time (15%)     | $18,000       | $32,000   | $12,000
  2029 | 67  | Consulting only     | $25,000       | $38,000   | $10,000
  2030 | 68  | Consulting only     | $25,000       | $42,000   | $8,000
  2031 | 69  | Consulting only     | $25,000       | $45,000   | $6,000
  2032 | 70+ | Retired              | $0            | $50,000   | $15,000

  BENEFITS OF PHASED RETIREMENT:
    ✓ Extended portfolio accumulation (delayed large withdrawals)
    ✓ Social Security delayed (larger lifetime benefit)
    ✓ Maintains engagement and purpose
    ✓ Reduced retirement duration (portfolio draws for fewer years)
```

### 2.4 Rental and Passive Income
```
CLIENT PROFILE:
  Owns rental property (single family home)
  Annual rental income (gross):     $36,000
  Annual rental expenses:           $(15,000) (property tax, insurance, maintenance)
  Net rental income:                $21,000

  Capital appreciation (est):       3% annually

RENTAL INCOME TREATMENT:

  Projected rental income (inflation adjusted):
    Year 1-10: $21,000 base × (1.025^n) = grows ~2.5%/year
    Year 11-20: Account for potential major expense (roof, HVAC)
    Year 21+: Assume property paid off (removes major expense category)

  Taxation:
    Rental income taxed as ordinary income (same rate as W-2)
    Can depreciate property ($2,000-3,000/year depending on value)
    Depreciation adds to ordinary deduction pool

  Sustainability:
    Check: Can this income be maintained?
    Risk: Tenant vacancy, major repairs, property market decline
    Mitigation: Assume vacancy factor (5% loss) and maintenance reserve (8% of income)

PROJECTIONS IN RETIREMENT PLAN:

  Base case: $21,000/year, grows 2.5% annually
  Conservative case: $18,000/year (accounts for major repair year)
  Optimistic case: $25,000/year (property appreciates faster)
```

### 2.5 Required Minimum Distributions (RMD)
```
FUNCTION: model_rmd_impact():

  // Client has $800,000 in traditional IRA
  // RMD must begin at age 73 (per SECURE 2.0 Act, 2024+)

  client_age = 62 (currently)
  current_ira_balance = $800,000
  retirement_date = 65
  rmd_start_age = 73

  YEARS BEFORE RMD (Ages 65-72):
    No required withdrawals
    Portfolio continues to grow (tax-deferred)
    Annual estimated return: 5%

  AT AGE 73 (RMD Begins):
    IRA balance at 73 = $800,000 × (1.05^11) = $1,380,000
    IRA balance at 73 (adjusted for some early withdrawals) = $1,250,000 (est.)

    Uniform Lifetime Table factor at 73 = 26.5

    RMD amount = IRA balance / life expectancy factor
    RMD = $1,250,000 / 26.5 = $47,170

    IF not withdrawn: 25% penalty on shortfall
    Penalty amount = $47,170 × 0.25 = $11,792

  ANNUAL RMD PROGRESSION:

  Age | IRA Balance (est.) | Life Expectancy Factor | RMD Amount | Tax on RMD (35%)
  ─────────────────────────────────────────────────────────────────────────────
  73  | $1,250,000        | 26.5                   | $47,170    | $16,510
  75  | $1,180,000        | 24.6                   | $48,000    | $16,800
  78  | $1,090,000        | 21.1                   | $51,660    | $18,080
  80  | $980,000          | 19.5                   | $50,260    | $17,590
  85  | $750,000          | 15.5                   | $48,400    | $16,940
  90  | $480,000          | 11.4                   | $42,100    | $14,735

  PLANNING IMPLICATION:
    RMD is MANDATORY income (can't avoid)
    RMD creates tax liability even if not needed for spending
    STRATEGY: Roth conversion (pre-age 73) to reduce RMD balance
    STRATEGY: Qualified Charitable Distribution (if charitably inclined)
```

---

## 3. EXPENSE MODELING

### 3.1 Go-Go / Slow-Go / No-Go Expense Phases
```
RETIREMENT LIFESTYLE PHASES:

PHASE 1: GO-GO (Ages 65-75)
  Lifestyle: Active, travel, entertaining
  Characteristics: Early retirement vigor, health is good
  Spending assumption: 110% of base retirement budget
  Examples of expenses: Travel, new hobbies, grandchildren activities

  Base annual budget:  $80,000
  Go-go spending:     $88,000 (110%)

PHASE 2: SLOW-GO (Ages 75-85)
  Lifestyle: Moderately active, reduced travel
  Characteristics: Health stable but slowing, one partner may decline
  Spending assumption: 90-100% of base budget (activities decrease, but costs stable)
  Examples of expenses: Maintenance costs, healthcare increases

  Slow-go spending:   $80,000 (100% of base, same nominal)

PHASE 3: NO-GO (Ages 85+)
  Lifestyle: More sedentary, in-home or facility care
  Characteristics: One or both in assisted living/nursing, healthcare intensive
  Spending assumption: 70-80% of base (less travel/entertainment) BUT +healthcare
  Examples of expenses: Long-term care facility, home health aide

  Healthcare bump:    +$30,000-50,000/year for long-term care
  No-go spending:     $70,000 (less discretionary) + $40,000 (long-term care) = $110,000

EXPENSE PROJECTION EXAMPLE:

Age | Phase    | Base Budget | Adjustment | Adjusted Spending | Annual Growth
─────────────────────────────────────────────────────────────────────────
65  | Go-go   | $80,000     | +10%       | $88,000           | $88,000 + inflation
70  | Go-go   | $80,000     | +10%       | $96,600           | +2.5% inflation
75  | Slow-go | $80,000     | —          | $96,600           | +2.5% inflation
80  | Slow-go | $80,000     | —          | $109,950          | +2.5% inflation
85  | No-go   | $80,000     | +50% (LTC) | $170,000          | +2.5% inflation
90  | No-go   | $80,000     | +50% (LTC) | $192,900          | +2.5% inflation

SENSITIVITY: Client adjusts Go-go assumption based on lifestyle
  Travel-focused client: +15% to +25%
  Home-body client: —% (base assumption)
  Grandchildren support: +$10K-20K
  Charitable giving: +$5K-15K
```

### 3.2 Healthcare Cost Escalation
```
FUNCTION: project_healthcare_costs():

  // Healthcare inflation is typically higher than general inflation

  general_inflation_rate = 2.5%
  healthcare_inflation_rate = 4.5% (historical average)

  baseline_healthcare_cost = $5,000/year (at age 65)

  AGING PHASES:

  Age | Phase      | Healthcare Cost | Inflation Rate | Projected Cost
  ─────────────────────────────────────────────────────────────────
  65  | Healthy    | $5,000          | 4.5%          | $5,000
  70  | Healthy    | $5,000          | 4.5%          | $6,530 (adjusted)
  75  | Chronic    | $8,000          | 5.0%          | $10,850
  80  | Chronic    | $12,000         | 5.0%          | $16,500
  85  | Chronic    | $18,000         | 5.0%          | $27,900
  90  | Long-term  | $40,000+        | 5.0%          | $62,000+
  95  | Long-term  | $50,000+        | 5.0%          | $80,000+

COMPONENTS OF HEALTHCARE COSTS:

  Medicare premiums:              $300-400/month ($3,600-4,800/year)
  Supplemental (Medigap):         $150-250/month ($1,800-3,000/year)
  Prescriptions:                  $1,000-3,000/year (age-dependent)
  Deductibles/copayments:         $2,000-5,000/year
  Dental/Vision (not Medicare):   $500-1,000/year
  Long-term care (age 85+):       $40,000-100,000/year

LONG-TERM CARE INTEGRATION:

  Nursing facility (2024):        $100,000-120,000/year
  Assisted living (2024):         $50,000-70,000/year
  Home health aide (daily):       $150-200/day ($54,750-73,000/year)
  Adult day care:                 $1,500-3,000/month

  PROBABILITY OF NEEDING CARE:
    Age 65: 10% probability
    Age 75: 30% probability
    Age 85: 50% probability
    Age 95: 75% probability

  PLANNING: Account for 2-3 years of long-term care (conservative)
    Cost assumption: $70,000/year × 3 years = $210,000
    OR: Plan for specific care type based on family history
```

### 3.3 One-Time Expenses
```
MAJOR LIFE EXPENSES TO BUDGET:

One-Time Expenses Often Overlooked:

  $50,000 - Home renovation (roof, HVAC, foundation)
  $40,000 - Auto replacement (2 cars over retirement)
  $25,000 - Major travel (cruise, extended international)
  $20,000 - Grandchildren education gift
  $15,000 - Elder care for parents (if applicable)
  $30,000 - Home accessibility modifications (stairs, bathrooms)
  $50,000+ - One spouse long-term care gap before Medicare

CLIENT-SPECIFIC ONE-TIME NEEDS:

  Example A: Home renovation planned at age 67
    Cost: $75,000 (kitchen, bathroom)
    Timing: Year 3 of retirement
    Funding: Portfolio withdrawal + saved amount

  Example B: Grandchildren college gifts
    Goal: $10,000 per grandchild (4 grandchildren)
    Total: $40,000 over 10 years
    Timing: Staggered over ages 65-75

  Example C: Inheritance expected
    Expected amount: $200,000 (from parent's estate)
    Probability: 80% (parent age 88 in good health)
    Timing: Uncertain (5-15 year window)

TREATMENT IN RETIREMENT PLAN:

  Option 1: Build into spending baseline
    Add $5,000-10,000/year to average spending to absorb one-time items

  Option 2: Model as specific annual withdrawals
    Year 3: Add $75,000 for home renovation
    Years 5,7,9,11: Add $10,000 for grandchild gifts

  Option 3: Maintain contingency reserve
    Keep $50,000-100,000 in accessible funds (money market)
    Draw from contingency for surprises
    Replenish from portfolio during good market years
```

---

## 4. GAP ANALYSIS WITH REMEDIATION OPTIONS

### 4.1 Retirement Success Assessment
```
FUNCTION: assess_retirement_readiness():

  // Compare retirement assets to retirement needs

  ASSETS AT RETIREMENT AGE 65:

  Portfolio value (invested):      $650,000
  Social Security (annual):        $38,400
  Pension (lump sum value):        $350,000 (or $25,200/year as annuity)
  Rental income (annual):          $21,000
  Total assets/income:             $1,059,400

  RETIREMENT NEEDS (Annual):

  Base spending:                   $80,000
  Healthcare (age 65-85):          $6,000/year (increases with age)
  One-time expenses (avg):         $5,000/year
  Gifts/legacy goal:               $10,000/year
  Total annual need:               $101,000

  SUSTAINABILITY ANALYSIS:

  Year 1 (Age 65):
    Portfolio balance:             $650,000
    Social Security:               $38,400
    Pension option A (annuity):    $25,200
    Rental income:                 $21,000
    Total income:                  $84,600

    Annual spending:               $101,000
    Shortfall:                     $(16,400)
    Portfolio withdrawal needed:   $(16,400)
    Ending portfolio:              $633,600

  THIS IS A GAP. Portfolio is being drawn at age 65 before reaching age 85.

  SUCCESS PROBABILITY (Monte Carlo):
    Probability of not running out of money by age 95: 72%
    This is BELOW the recommended 80% minimum

  GAP DIAGNOSIS:
    ✗ Social Security claimed too early (age 62, $38,400/year)
    ✗ Portfolio too small relative to spending need
    ✗ Healthcare costs increasing faster than planned
    ✗ One-time expenses strain liquidity

REMEDIATION OPTIONS (See 4.2 below)
```

### 4.2 Remediation Options and Impact Modeling
```
OPTION 1: Increase Savings Rate
────────────────────────────────

Current annual savings (through age 65):  $12,000/year
Increased savings rate:                    $18,000/year (+$6,000)

Impact:
  Current trajectory at 65:              $650,000
  With increased savings (+$6K/year×5y):$680,000 (+$30,000)
  Additional portfolio income:           $30,000 × 4.5% = $1,350/year

Gap closure: 13% of the shortfall

VERDICT: Helpful but insufficient alone


OPTION 2: Delay Retirement by N Years
──────────────────────────────────────

Current plan: Retire at 65
Delayed retirement: Retire at 67 (2 years later)

Impact:
  Additional work years (ages 65-67):    $90,000/year in income
  Additional savings:                    $50,000/year
  Total new savings:                     $100,000 (2 years × $50K)

  Portfolio growth (2 additional years):  $650,000 × (1.045^2) = $717,000

  Social Security delay benefit:
    Age 62 claiming: $38,400/year
    Age 67 claiming: $44,800/year (+17%)
    Annual increase: $6,400/year × 23 years (to 90) = $147,200 lifetime

Total impact: Portfolio $717K + Higher SS = Closes gap significantly

Gap closure: ~65% of the shortfall

VERDICT: Highly effective; modest delay helps materially


OPTION 3: Reduce Spending by $X Annually
──────────────────────────────────────────

Current planned spending:                 $101,000/year
Proposed spending reduction:              $80,000/year (-$21,000)

Impact:
  Withdrawal rate at 65:                 Down from 16.4K to 0
  Portfolio can sustain without draws:   YES (income covers spending)

  Portfolio growth accelerates:           $650,000 × (1.045) = $679,250

Gap closure: 100% of the shortfall

VERDICT: Definitive but requires lifestyle adjustment
         Can we reduce one-time expenses or baseline?


OPTION 4: Claim Social Security Later (Age 70)
───────────────────────────────────────────────

Current plan: Claim at 62 for $38,400/year
Revised plan: Claim at 70 for $53,500/year

Impact:
  Foregone SS at 62-70 (8 years):        $38,400 × 8 = $307,200
  Increased annual benefit:               $53,500 - 38,400 = $15,100/year
  Break-even age:                         82

  To bridge gap ages 62-70 (without SS):  Need portfolio to cover
  Annual shortfall (no SS, 101K spending):  $101,000
  8 years × $101,000 =                     $808,000 needed

  Current portfolio can't support this fully (only $650K)

Gap closure: 35% (must combine with other remedies)

VERDICT: Helpful for lifetime income but doesn't solve immediate gap


OPTION 5: Part-Time Work Bridge (Ages 65-70)
──────────────────────────────────────────────

Work part-time starting at 65, earn $40,000/year
  Years 65-70: $40,000/year income reduces portfolio need by 40%
  Additional portfolio accumulation (5 years):
    Base growth: $650,000 → $829,000
    Plus: $40,000 × 4.5 = $180,000 additional

  New portfolio at 70: $829,000 + $180,000 = $1,009,000

  Plus: Delay Social Security to 70
        SS at 70: $53,500/year (no early filing reduction)

  Combined: $1,009,000 portfolio + $53,500 SS + part-time work reduction
            Closes gap fully by age 70

Gap closure: 100% (phased approach)

VERDICT: Achieves goal through extended productivity


REMEDIATION RECOMMENDATION SUMMARY:

┌────────────────────────────────────────────────────────────┐
│ Recommended Multi-Step Approach:                            │
│                                                             │
│ Year 1-3 (Ages 62-65):                                     │
│   • Increase savings to $18,000/year                       │
│   • Reduce discretionary spending (one-time items)         │
│   • Result: $30K additional portfolio                      │
│                                                             │
│ Year 4-8 (Ages 65-70):                                     │
│   • Work part-time, earn $40,000/year                      │
│   • Use earnings for spending, not additional savings      │
│   • Delay Social Security claiming to 70                   │
│   • Result: Higher SS + stronger portfolio                 │
│                                                             │
│ Year 9+ (Ages 70+):                                        │
│   • Fully retired with $1.0M+ portfolio                    │
│   • $53,500/year Social Security                           │
│   • $45,000/year portfolio draw allowed                    │
│   • Total income: $98,500 + rental = $119,500            │
│   • Success probability: 82%+                             │
└────────────────────────────────────────────────────────────┘
```

---

## 5. TAX-EFFICIENT WITHDRAWAL SEQUENCING

### 5.1 Optimal Draw-Down Order
```
FUNCTION: determine_withdrawal_sequence():

  // Which account type should be drawn first?
  // Answer depends on: tax impact + longevity + legacy goals

  ACCOUNT TYPES AVAILABLE:

  Account 1: Taxable brokerage account
    Balance: $200,000
    Tax basis: $150,000
    Unrealized gain: $50,000
    Tax cost of liquidation: $50,000 × 20% (LTCG) = $10,000

  Account 2: Traditional IRA
    Balance: $300,000
    Tax cost of withdrawal: 100% (all proceeds taxable at ordinary rate)
    Withdrawal of $50,000 = $50,000 × 35% (rate) = $17,500 tax

  Account 3: Roth IRA
    Balance: $100,000
    Tax cost of withdrawal: $0 (tax-free)
    Withdrawal of $50,000 = $0 tax

  Account 4: 401(k) from employer
    Balance: $250,000
    Tax cost of withdrawal: 100% (all proceeds taxable at ordinary rate)
    Withdrawal of $50,000 = $50,000 × 35% = $17,500 tax

  WITHDRAWAL PRIORITY ALGORITHM:

  FOR each withdrawal_needed IN [year 1, year 2, ...]:

    IF roth_ira_balance > 0:
      // Tax-free withdrawals are always best
      withdraw_from = "Roth IRA"
      tax_cost = 0

    ELSE IF taxable_account_is_UNDERWATER (losses > gains):
      // Tax-loss harvesting opportunity
      withdraw_from = "Taxable with loss harvesting"
      tax_cost = NEGATIVE (loss creates tax benefit)

    ELSE IF withdrawal_in_LOW_TAX_YEAR:
      // Ordinary income room available, pull from tax-deferred
      IF effective_tax_rate < 32%:
        withdraw_from = "Traditional IRA/401k"
        tax_cost = withdrawal_amount × effective_rate

    ELSE IF approaching_RMD_AGE:
      // RMD will be forced anyway; get ahead of penalty
      IF age >= 70.5:
        withdraw_from = "Traditional IRA" (fulfill RMD)

    ELSE:  // Default
      withdraw_from = "Taxable account (non-deferred)"
      tax_cost = LTCG tax only if gains have accrued

EXAMPLE WITHDRAWAL SEQUENCING PLAN:

Year | Age | Withdrawal | From Account           | Tax Cost | Tax Rate
─────────────────────────────────────────────────────────────────────
1    | 65  | $45,000   | Roth IRA               | $0       | 0%
2    | 66  | $40,000   | Taxable (LTCG harvest) | $8,000   | 20%
3    | 67  | $48,000   | Traditional IRA        | $16,800  | 35%
4    | 68  | $50,000   | Roth IRA (if available)| $0       | 0%
5    | 69  | $50,000   | Taxable (gains)        | $10,000  | 20%
6    | 70  | $55,000   | Roth + Traditional     | $8,750   | 16% (blended)

Total 6-year withdrawals: $288,000
Total 6-year taxes: $43,550 (15% average)

vs. Sequential (all from Traditional then Taxable):
Total 6-year taxes: $54,200 (19% average)

TAX SAVINGS: $10,650 (3.7% of withdrawals)
```

### 5.2 Roth Conversion Ladder Integration
```
FUNCTION: plan_roth_conversion_strategy():

  // Convert some traditional IRA → Roth in low-income years
  // Minimize lifetime tax on retirement portfolio

  CLIENT SITUATION:

  Age 63-65: Still working, income = $80,000/year
  Age 65+: Retired, income expected to drop to $40,000-50,000
  Traditional IRA balance: $300,000
  Roth IRA balance: $50,000

  CONVERSION WINDOW ANALYSIS:

  Age 63 (high income year):
    W-2 income: $80,000
    Tax bracket: 24%
    Marginal tax rate: 24%
    Room to convert: Moderate (to stay in 24% bracket)
    Suggested conversion: $0 (income already high)

  Age 64 (high income year):
    W-2 income: $80,000
    Tax bracket: 24%
    Marginal tax rate: 24%
    Suggested conversion: $0 (income already high)

  Age 65 (transition year, work 9 months):
    W-2 income: $60,000 (9 months)
    Tax bracket: 22%
    Marginal tax rate: 22%
    Room before 24% bracket: $9,250 (married, standard deduction $27,700)
    Suggested conversion: $0 (already in sweet spot, save for next year)

  Age 66 (first full retirement year):
    W-2 income: $0
    Social Security (FRA): $32,000 (only 85% taxable = $27,200 provisional income)
    Provisional income: $27,200
    Tax bracket: 22%
    Marginal tax rate: 22%
    Room to convert in 22% bracket: $60,000 - $27,200 = $32,800

    Conversion strategy: Convert $32,800
    Tax on conversion: $32,800 × 22% = $7,216

  Age 67-70 (years 2-5 of retirement):
    Social Security: $32,000/year (85% taxable = $27,200)
    Withdraw from Roth (now available without tax)
    Annual withdrawal need: $40,000
    From Roth: $40,000 (tax-free, no tax impact)

    Continue annual conversions:
    Available room: $32,800-40,000 depending on market returns
    Annual conversion: $30,000 × 22% = $6,600 tax

  ROTH CONVERSION LADDER:

  Years | Conversion Strategy | Amount | Tax Cost | Roth Basis for Future
  ──────────────────────────────────────────────────────────────────
  1     | Low-income window   | $30,000 | $6,600   | $30,000
  2     | Low-income window   | $32,000 | $7,040   | $62,000
  3     | Moderate window     | $25,000 | $5,500   | $87,000
  4     | Tax-loss harvest yr | $20,000 | $4,400   | $107,000
  5     | Market up yr        | $15,000 | $3,300   | $122,000

  Total 5-year conversions: $122,000
  Total tax paid: $26,840 (22% average)
  Roth balance at age 70: $172,000 (original $50K + $122K converted)

  TAX BENEFIT:
    • Traditional IRA reduced to $178,000 (vs. $300,000)
    • RMD at age 73 cut by $4,200/year
    • Lifetime tax savings: ~$9,000-12,000
```

### 5.3 RMD Integration and Tax Impact
```
FUNCTION: coordinate_rmd_with_withdrawals():

  CLIENT: Age 73, traditional IRA balance $800,000

  RMD CALCULATION (IRS Uniform Lifetime Table):

  Age | IRA Balance | Life Expectancy Factor | RMD Amount
  ──────────────────────────────────────────────────
  73  | $800,000    | 26.5                   | $30,189
  74  | $770,000    | 25.5                   | $30,196
  75  | $740,000    | 24.6                   | $30,081
  76  | $710,000    | 23.7                   | $29,958

  COORDINATION WITH OTHER WITHDRAWALS:

  Annual spending need: $60,000
  RMD (mandatory): $30,189
  Supplementary withdrawal needed: $29,811

  Option A: Take RMD + additional withdrawal from traditional IRA
    Total withdrawal: $30,189 + $29,811 = $60,000
    All taxed as ordinary income: $60,000 × 35% = $21,000 tax
    After-tax income: $39,000

  Option B: Take RMD from traditional IRA, supplementary from Roth
    RMD: $30,189 (taxable at 35% = $10,566)
    Roth withdrawal: $29,811 (tax-free)
    Total income: $60,000
    Total tax: $10,566 (17.6% effective rate)
    After-tax income: $49,434

  Option C: Strategic RMD + Charitable Giving
    RMD amount: $30,189
    Use Qualified Charitable Distribution (QCD): Donate RMD to charity
    Tax impact: No ordinary income reportable (charity receives $30K)
    Supplementary withdrawal: $29,811 from Roth
    Total tax: $0 (RMD avoided through QCD)
    After-tax income: $60,000

  RECOMMENDATION: Option C (Charitable QCD)
    Benefit: Eliminate tax on RMD while supporting charity
    Requirement: Donor must be 70.5+, transfer directly to qualified charity
    Limitation: Maximum $100,000/year QCD
```

### 5.4 Medicare IRMAA Bracket Management
```
FUNCTION: monitor_medicare_irmaa_impacts():

  // Medicare premiums increase if Modified Adjusted Gross Income (MAGI) too high
  // This "tax" on high earners reduces after-tax retirement income

  CLIENT: Age 65, enrolling in Medicare

  FILING STATUS: Married, filing jointly
  MAGI threshold for Medicare IRMAA: $194,000

  SCENARIO A: No income management
    Ordinary income (SS, portfolio): $45,000
    Capital gains (taxable account): $25,000
    Total MAGI: $70,000
    Status: Below threshold, STANDARD premiums

    Medicare Part B premium (2024): $174.70/month per person
    Spouse Part B premium: $174.70/month per person
    Total annual: $4,193 for couple

  SCENARIO B: High capital gains year (poor planning)
    Ordinary income: $45,000
    Capital gains (sell appreciated stock): $155,000
    Total MAGI: $200,000
    Status: ABOVE threshold by $6,000

    IRMAA surcharge tiers (married filing jointly):
      $194,001 - $246,000: Pay 65% of standard premium premium (additional)
      Additional premium per person: $174.70 × 0.65 = $113.56/month
      Annual impact for couple: $113.56 × 12 × 2 = $2,725 EXTRA

    New annual cost: $4,193 + $2,725 = $6,918 (65% increase!)

  IMPACT: Timing of capital gains creates Medicare cost cliff

  PLANNING STRATEGY:

  Year 1 (Age 65):
    Limit capital gains to < $150,000
    MAGI stays below $194,000
    Medicare premium: Standard ($4,193)

  Year 2:
    Harvest some gains (but stay under IRMAA threshold)
    Target MAGI: $185,000
    Medicare premium: Standard

  Year 3:
    Take larger gain after age 67 (if possible, defer receipt)
    OR: Manage through staggered rebalancing
    Keep MAGI manageable

  IRMAA THRESHOLD MONITORING:

  Account for in withdrawal planning:
    MAGI = Adjusted Gross Income + 50% of Social Security + Tax-exempt interest

    Example calculation:
      W-2 income: $0
      IRA withdrawal: $30,000 (ordinary income)
      Capital gains realized: $15,000
      Social Security: $32,000
      Tax-exempt bond interest: $2,000

      MAGI = $30,000 + $15,000 + ($32,000 × 50%) + $2,000 = $49,000

    Below threshold → Standard Medicare premiums
```

---

## 6. MONTE CARLO SIMULATION & CONTEXT

### 6.1 Success Probability with Confidence Intervals
```
FUNCTION: run_monte_carlo_simulation():

  // Traditional deterministic projection gives one outcome
  // Monte Carlo runs 1,000+ iterations with varying returns

  SIMULATION SETUP:

  Number of iterations: 10,000
  Asset allocation: 60% stocks, 40% bonds
  Stock return: Mean 8%, StdDev 15%
  Bond return: Mean 4%, StdDev 6%
  Correlation: 0.3

  FOR i IN [1...10,000]:
    FOR year IN [2024...2054]:

      // Generate random returns from distribution
      stock_return[i,year] = RANDOM_NORMAL(mean=8%, stdev=15%)
      bond_return[i,year] = RANDOM_NORMAL(mean=4%, stdev=6%)

      // Calculate blended portfolio return
      portfolio_return[i,year] = (60% × stock_return) + (40% × bond_return)

      // Project portfolio balance
      balance[i,year] = balance[i,year-1] × (1 + portfolio_return[i,year])
      balance[i,year] -= withdrawals_year[i,year]

      IF balance[i,year] < 0:
        success[i] = FALSE
        failure_year[i] = year
        BREAK

  // Calculate success rate
  successful_iterations = COUNT(success[i] == TRUE)
  success_probability = successful_iterations / 10,000

  MONTE CARLO RESULTS:

  Success probability (money lasts to age 95): 82%
  Failure probability (portfolio depleted before 95): 18%

  PERCENTILE ANALYSIS:

  Percentile | Terminal Value at Age 95
  ──────────────────────────────────
  10th       | $(0) - Portfolio depleted at age 91
  25th       | $200,000
  50th       | $475,000 (median outcome)
  75th       | $850,000
  90th       | $1,200,000

  INTERPRETATION:
    • 90% of scenarios result in portfolio > $0 at age 95
    • 50% of scenarios result in > $475,000
    • Worst 10% scenarios: Portfolio depleted age 89-92
    • Worst 25% scenarios: Still have cushion

  CONFIDENCE INTERVAL:

  95% confidence interval for terminal value:
    Range: $150,000 to $1,100,000
    Interpretation: 95% likelihood portfolio falls within this range
```

### 6.2 Sequence of Returns Risk Assessment
```
FUNCTION: evaluate_sequence_of_returns_risk():

  // Early bad market returns are more damaging than late bad returns
  // Due to larger portfolio being withdrawn from

  SCENARIO A: Bad Market EARLY (Years 1-3)
  ──────────────────────────────────────────

  Starting portfolio: $650,000
  Annual spending: $45,000

  Year 1: Market return = -15% (bear market)
    Balance start: $650,000
    Return: -$97,500
    Balance after return: $552,500
    Withdrawal: -$45,000
    Balance end: $507,500

  Year 2: Market return = -10% (continuing decline)
    Balance start: $507,500
    Return: -$50,750
    Withdrawal: -$45,000
    Balance end: $411,750

  Year 3: Market return = 8% (recovery)
    Balance start: $411,750
    Return: +$33,000
    Withdrawal: -$45,000
    Balance end: $399,750

  Three-year balance: $399,750 (38% loss from start)

  SCENARIO B: Good Market EARLY (Years 1-3)
  ──────────────────────────────────────────

  Same starting $650,000, annual $45,000 spending

  Year 1: Market return = +25%
    Balance: $650,000 × 1.25 - $45,000 = $767,500

  Year 2: Market return = +15%
    Balance: $767,500 × 1.15 - $45,000 = $838,625

  Year 3: Market return = -10%
    Balance: $838,625 × 0.90 - $45,000 = $709,763

  Three-year balance: $709,763 (9% gain from start)

  COMPARISON:
    Scenario A (bad early): $399,750
    Scenario B (good early): $709,763
    Difference: $310,013 (78% impact)

  IMPLICATION:
    Sequence of returns MATTERS significantly
    Years 1-5 of retirement are critical
    Market decline in early retirement is more damaging than later

  MITIGATION STRATEGIES:
    1. Maintain cash reserves (1-2 years spending)
    2. Delay withdrawals in down markets (if possible)
    3. Rebalance counter-cyclically (buy when down)
    4. Consider lower equity allocation in early retirement
```

### 6.3 Safe Withdrawal Rate Determination
```
FUNCTION: calculate_safe_withdrawal_rate():

  // How much can be safely withdrawn from portfolio annually?

  TRADITIONAL RULE: 4% Rule
    Withdraw 4% of starting portfolio in year 1
    Increase withdrawal by inflation each year
    Historical success rate: 95% over 30-year horizon

  CLIENT ANALYSIS:

  Starting portfolio: $650,000
  Withdrawal at 4% rule: $650,000 × 4% = $26,000

  But client needs: $45,000/year
  Gap: $45,000 - $26,000 = $19,000 (need to make up from other sources)

  AVAILABLE OTHER SOURCES:

  Social Security: $38,400/year
  Rental income: $21,000/year
  Total other income: $59,400/year

  Analysis:
    Other income covers: $59,400
    Portfolio withdrawal for gap: $19,000
    Safe withdrawal rate: 19,000 / 650,000 = 2.9%

  This is CONSERVATIVE (well below 4% rule)
  Success probability: 95%+ (very high confidence)

  ADJUSTED WITHDRAWAL RATE ANALYSIS:

  Spending breakdown:
    Baseline: $80,000
    One-time: $5,000
    Healthcare: $6,000
    Gifts: $10,000
    Total: $101,000

  Less other income: $101,000 - $59,400 = $41,600 from portfolio

  Withdrawal rate: $41,600 / $650,000 = 6.4%

  This is AGGRESSIVE (above 4% rule)
  Success probability: 72% (concerning)

  RECOMMENDATION:
    Reduce spending by $10-15K/year to lower withdrawal rate to 4-5%
    OR: Find additional income source
    OR: Increase portfolio before retirement
```

---

## 7. SUSTAINABILITY METRICS

### 7.1 Portfolio Longevity & Legacy Projection
```
FUNCTION: project_portfolio_and_legacy():

  // Two outcomes: (1) Portfolio lifetime, (2) Estate value

  BASE CASE TRAJECTORY:

  Age | Portfolio Value | Annual Spending | Annual Withdrawal | Legacy at Death
  ───────────────────────────────────────────────────────────────────────
  65  | $650,000        | $101,000        | $41,600          | Portfolio alive
  70  | $680,000        | $107,000        | $48,000          | Portfolio alive
  75  | $695,000        | $113,000        | $53,000          | Portfolio alive
  80  | $650,000        | $119,000        | $60,000          | Portfolio alive
  85  | $520,000        | $170,000 (LTC)  | $110,000         | Portfolio alive
  90  | $280,000        | $170,000        | $149,000         | Portfolio alive
  95  | $45,000         | $170,000        | $125,000+        | Depleted at 98

  LONGEVITY ASSESSMENT:
    Portfolio lasts: Age 98 (28 years)
    Legacy at death: $0 (just enough to cover final years)
    Verdict: Sustainable but no legacy

  WITH ADJUSTED SPENDING:

  Age | Portfolio Value | Annual Spending | Annual Withdrawal | Legacy at Death
  ───────────────────────────────────────────────────────────────────────
  65  | $650,000        | $85,000         | $25,600          | Portfolio alive
  70  | $690,000        | $90,000         | $30,000          | Portfolio alive
  75  | $730,000        | $95,000         | $35,000          | Portfolio alive
  80  | $710,000        | $110,000 (LTC)  | $50,000          | Portfolio alive
  85  | $650,000        | $110,000        | $50,000          | Portfolio alive
  90  | $580,000        | $110,000        | $50,000          | Portfolio alive
  95  | $520,000        | $110,000        | $50,000          | Estate at death

  LONGEVITY ASSESSMENT:
    Portfolio lasts: Age 100+
    Legacy at death: $520,000 (meaningful bequest)
    Verdict: Sustainable with legacy option
```

### 7.2 Sustainable Withdrawal Rate Calculation
```
FORMULA: Sustainable Withdrawal Rate

  Safe annual withdrawal = (Portfolio Value × 4%) + (Other Income - Spending Needs)

  EXAMPLE:

  Portfolio: $650,000
  Other income: $59,400 (SS + rental)
  Annual spending: $101,000

  Method 1 (Simple 4% rule):
    Safe withdrawal = $650,000 × 4% = $26,000/year
    Other income covers: $59,400
    Total available: $85,400
    Spending need: $101,000
    GAP: $15,600 (not sustainable)

  Method 2 (Spending-based):
    Total need: $101,000
    Less other income: -$59,400
    Portfolio must provide: $41,600
    Withdrawal rate: 6.4% (aggressive, 72% success)

  Method 3 (Sustainable hybrid):
    Target success rate: 85%
    Implied withdrawal rate: 4.8%
    Portfolio draw: $650,000 × 4.8% = $31,200
    Other income: $59,400
    Total available: $90,600
    Sustainable spending: $90,600
    (Client adjusts to this level)

  RECOMMENDATION:
    Sustainable annual spending: $88,000-90,000
    This allows 85%+ success probability
    Requires $11,000-13,000 annual spending reduction
```

---

## 8. KB RETRIEVAL TRIGGERS

**Before analysis, retrieve:**

1. **Regulatory Reference (Social Security Rules)** — Claiming ages, benefit formulas
   - Path: /kb/regulatory/social-security/ss-rules-2024.md

2. **RMD Tables & Rules** — Uniform Lifetime Table, SECURE Act changes
   - Path: /kb/regulatory/tax-rules/rmd-tables-uniform-lifetime-2024.json

3. **Contribution Limits** — Retirement account maximums by type and year
   - Path: /kb/regulatory/tax-rules/contribution-limits-2024.json

4. **Planning Methodologies** — Retirement projection best practices
   - Path: /kb/planning-methodologies/retirement-projection-framework.md

5. **Client Portfolio & Income Data** — Current holdings, sources
   - Path: /clients/[CLIENT_ID]/retirement-data.json

---

## 9. OUTPUT REQUIREMENTS

### 9.1 Scenario Comparison Table (JSON)
```json
{
  "analysis_date": "ISO-8601",
  "client_id": "string",
  "scenarios": [
    {
      "scenario_name": "base_case",
      "retirement_age": 65,
      "life_expectancy": 95,
      "annual_return": 0.045,
      "inflation_rate": 0.025,
      "portfolio_at_retirement": 650000,
      "portfolio_at_85": 650000,
      "portfolio_at_95": 45000,
      "portfolio_longevity_age": 98,
      "success_probability": 0.82,
      "terminal_value": 45000
    }
  ]
}
```

### 9.2 Gap Analysis & Remediation (Structured)
```
GAP ANALYSIS SUMMARY
═══════════════════

Current Situation:
  Portfolio at retirement: $650,000
  Annual spending need: $101,000
  Other income available: $59,400
  Portfolio withdrawal needed: $41,600/year (6.4% rate)
  Success probability: 72% (BELOW 80% target)

GAP IDENTIFIED:
  $41,600 annual draw is UNSUSTAINABLE
  Portfolio depleted by age 92
  [Specific trigger: Early healthcare costs + RMD at 73]

REMEDIATION OPTIONS (Ranked by Impact):

Option 1: Delay Retirement (Age 65 → 67)
  Impact: Closes gap 65%
  Cost to client: 2 years additional work
  Benefit: Portfolio grows, SS increases
  New probability: 78% (improved but not sufficient)

Option 2: Reduce Annual Spending (101K → 85K)
  Impact: Closes gap 100%
  Cost to client: $16,000/year lifestyle adjustment
  Benefit: Sustainable 4% withdrawal rate achieved
  New probability: 86% (target met)

Option 3: Increase Savings (through 65)
  Impact: Closes gap 18%
  Cost to client: +$6,000/year savings
  Benefit: Additional $30K portfolio
  New probability: 75% (modest improvement, combine with others)

RECOMMENDED APPROACH:
  Combine Options 1 + 2:
  • Work until 67 (+$100K portfolio growth)
  • Reduce spending to $88K (-$13K/year)
  • Result: $780K portfolio, 88,000 spending, 4.5% withdrawal rate
  • New success probability: 84% (meets target)
```

### 9.3 Withdrawal Strategy & Tax Projection (Annual)
```
WITHDRAWAL PLAN - YEARS 1-10
═════════════════════════════

Year | Age | Portfolio | Annual Need | Withdrawal Sequencing        | After-Tax
     |     | Start    |             | [Account Draws]              | Income
─────────────────────────────────────────────────────────────────────────────
1    | 65  | $650K   | $101K       | Roth $45K + Taxable $40K +  | $95K
     |     |          |             | SS $38K + Rental $21K       |
2    | 66  | $680K   | $104K       | Roth $45K + Taxable $35K +  | $96K
     |     |          |             | SS $38K + Rental $21K       |
3    | 67  | $695K   | $107K       | Roth $45K + Taxable $35K +  | $97K
     |     |          |             | SS $38K + Rental $21K       |
[continuing through age 95]

PROJECTED TAXES & AFTER-TAX INCOME:
  Year 1: Gross withdrawals $104K, Federal taxes $18K, After-tax: $86K
  Year 2-5: Average after-tax: $88K/year
  Year 6-10: Average after-tax: $82K/year (RMD starts age 73)
  Overall average 30-year after-tax: $75K/year
```

---

## 10. VALIDATION GATES

Before finalizing retirement plan:

```
GATE 1: Data Completeness
  ☐ Current asset statement from all accounts (recent)
  ☐ Social Security statement (from ssa.gov)
  ☐ Pension benefit statement (if applicable)
  ☐ Client spending estimates or bank statement analysis
  ☐ Life expectancy discussed and documented
  IF not all: Flag incomplete data and request

GATE 2: Scenario Reasonableness
  ☐ Base case return assumption: 4-5% (realistic for balanced portfolio)
  ☐ Inflation assumption: 2-3.5% (conservative)
  ☐ Spending assumptions: Increasing in early years, decreasing later (realistic)
  ☐ Healthcare cost assumptions: Escalating faster than inflation (realistic)
  IF not reasonable: Adjust and document

GATE 3: Success Probability Standard
  ☐ Base case success rate: ≥ 80% (recommended minimum)
  ☐ Plan includes contingency options if probability < 80%
  ☐ Client acknowledges trade-offs (work longer vs. spend less vs. portfolio risk)
  IF success probability < 75%: Plan is HIGH RISK, requires remediation

GATE 4: Suitability & Feasibility
  ☐ Remediation options are actionable for client (e.g., can delay retirement)
  ☐ Spending assumption is realistic (client can live on projected amount)
  ☐ Tax strategy is feasible (client can coordinate with CPA)
  IF not feasible: Revise plan with realistic assumptions
```

---

## 11. NOTES FOR IMPLEMENTATION

- All projections must be calculated deterministically AND probabilistically (Monte Carlo)
- Success probability is the primary success metric; optimize to 80-85% range
- Social Security claiming strategy must be optimized for household longevity
- Tax-efficient withdrawal sequencing saves clients 15-30% over retirement
- Annual review essential; adjust assumptions as life circumstances change
- Communicate both "good case" and "bad case" scenarios transparently
