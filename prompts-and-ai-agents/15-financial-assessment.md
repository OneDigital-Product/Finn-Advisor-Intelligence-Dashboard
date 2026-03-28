# 15-financial-assessment.md
## Function: generateAssessment

**Purpose:** Provide structured, domain-specific financial assessments using quantitative calculation engines and evidence-based scoring rubrics.

**Fiduciary Principle:** Assessment accuracy depends on rigorous quantification, not subjective judgment. Each gap must be actionable and measurable.

---

## 1. ASSESSMENT TYPE CLASSIFICATION

### 1.1 Assessment Taxonomy

| Assessment Type | Primary Question | Key Metrics | Planning Domains Affected |
|---|---|---|---|
| **Retirement Readiness** | "Can we retire on plan?" | Accumulation gap, withdrawal sustainability, inflation impact, longevity risk | Retirement, Tax, Investment |
| **Insurance Adequacy** | "Are we protected from catastrophic loss?" | Capital needs gap, income replacement ratio, coverage vs. need, underinsured risk | Life, Disability, LTC, Estate |
| **Tax Efficiency** | "Are we paying what we should?" | Tax rate optimization, bracket positioning, asset location, tax drag | Tax, Investment, Retirement |
| **Estate Completeness** | "Will wealth transfer efficiently?" | Document completeness, beneficiary alignment, tax impact, probate risk | Estate, Tax, Legal |
| **Investment Appropriateness** | "Does our portfolio fit our situation?" | Allocation drift, concentration risk, fee drag, risk-return fit | Investment, Risk, Goals |

---

## 2. DOMAIN-SPECIFIC CALCULATION ENGINES

### 2.1 Retirement Readiness Assessment

#### 2.1.1 Accumulation Gap Analysis

**Inputs:**
- Current portfolio value
- Current annual savings
- Years to retirement (or retirement age)
- Current home equity, pensions, other non-portfolio assets
- Inflation assumption (typically 2.5%)
- Investment return assumption (by asset class)

**Calculation Engine:**

```
FutureValue_Accumulated = (
  PV_PortfolioToday × (1 + returns)^years +
  AnnualSavings × [((1 + returns)^years - 1) / returns] +
  PV_OtherAssets × (1 + inflation)^years
)

RetirementTarget = (
  Annual_Spending_Need × (1 + inflation)^years
)

AccumulationGap = RetirementTarget - FutureValue_Accumulated
AccumulationGap_Percentage = AccumulationGap / RetirementTarget × 100

CONFIDENCE_INTERVAL = (
  Conservative_Case: (1 + returns_10th_percentile)^years,
  Base_Case: (1 + returns_median)^years,
  Optimistic_Case: (1 + returns_90th_percentile)^years
)
```

**Output Example:**
- Target at retirement: $1,500,000 (in today's dollars)
- Projected accumulation (base case): $1,420,000
- Gap: $80,000 (5.3%)
- Confidence interval: 90% to 110% of target
- Gap assessment: MINOR (within margin of error)

**Scoring Rubric:**
- GAP -20% to +20%: ON TRACK
- GAP -20% to -50%: MODERATE SHORTFALL (requires action)
- GAP < -50%: SIGNIFICANT SHORTFALL (requires major adjustment)
- GAP > +20%: ON TRACK (ahead of target)

#### 2.1.2 Withdrawal Sustainability Analysis

**Inputs:**
- Projected portfolio at retirement
- Annual spending requirement
- Withdrawal rate assumptions
- Life expectancy (age 95, 100, or longevity table)
- Sequence-of-returns risk

**Calculation Engine:**

```
SafeWithdrawalRate = (
  Portfolio_Value × 4% [historical safe rate]
  Adjusted for:
    - Inflation: +0.5% per year beyond inflation
    - Longevity: -0.25% per 5 years beyond age 90
    - Concentration: -0.5% if >25% in single holding
    - Income sources: -0.3% per $1000/month in guaranteed income
)

SustainabilityTest = {
  Probability_Portfolio_Lasts_to_95: [X]%
  Probability_Portfolio_Lasts_to_100: [Y]%
  Years_of_Withdrawals_Possible: [Z]
}

WithdrawalGap = (
  AnnualSpending - (Portfolio × SafeWithdrawalRate) - SocialSecurity - Pension
)

Result:
  IF WithdrawalGap <= 0: SUSTAINABLE
  IF WithdrawalGap > 0: SHORTFALL of $[X]/year
```

**Output Example:**
- Portfolio at retirement: $1,200,000
- Annual spending need: $65,000
- Safe withdrawal rate: 4.2% (adjusted for your situation) = $50,400
- Social Security + Pension: $35,000
- Total first-year income: $85,400
- Spending need: $65,000
- Result: SUSTAINABLE with $20,400 surplus

**Scoring Rubric:**
- Probability portfolio lasts to life expectancy >90%: SUSTAINABLE
- Probability 80-90%: ADEQUATE (minor adjustments may be needed)
- Probability 70-80%: AT RISK (significant adjustment needed)
- Probability <70%: UNSUSTAINABLE (major changes required)

#### 2.1.3 Social Security Optimization

**Inputs:**
- Full Retirement Age (FRA)
- Early claiming age (62) vs. Normal (FRA) vs. Delayed (70) benefits
- Life expectancy assumption
- Spousal coordination (if married)
- Other income sources

**Calculation Engine:**

```
BenefitValue_ByClaimAge = {
  Claim_at_62: FRA_Benefit × 70% (approximately),
  Claim_at_FRA: FRA_Benefit × 100%,
  Claim_at_70: FRA_Benefit × 124% (approximately)
}

BreakEvenAnalysis = {
  Age_62_vs_FRA: Approximately age 80,
  FRA_vs_70: Approximately age 80-82,
  Longevity_Impact: For each year beyond breakeven, claim-at-70 gains $[X]
}

SpouseOptimization = {
  IF married:
    Higher_earner_delays_to_70: Increases spousal benefit,
    Lower_earner_claims_at_62: Captures early filing,
    Net_gain_over_life: $[X]
}

Recommendation = {
  IF life_expectancy > 85: CLAIM_AT_70,
  IF life_expectancy 80-85: CLAIM_AT_FRA,
  IF life_expectancy < 80: CLAIM_AT_62,
  WITH spousal coordination optimization
}
```

**Output Example:**
- FRA benefit: $2,400/month at age 67
- Claim at 62: $1,680/month (30% reduction)
- Claim at 67: $2,400/month
- Claim at 70: $2,976/month (24% increase)
- Life expectancy: 90
- Years living past 90: Expected 3
- Recommendation: CLAIM AT 70 (gains $2,268/year for 3+ years)
- Spousal optimization: Spouse claims at 62, primary delays to 70
- Combined benefit advantage: $85,000+ over lifetime

---

### 2.2 Insurance Adequacy Assessment

#### 2.2.1 Capital Needs Analysis (Life Insurance)

**Inputs:**
- Age of insured
- Income (earned, investment)
- Dependents (ages, education plans)
- Current mortgage, debts
- Current life insurance
- Projected investment returns
- Inflation rate

**Calculation Engine:**

```
CapitalNeeded = {
  1. Income_Replacement_Fund:
     Annual_Spending × Years_to_Dependents_Independence,
     Discounted at investment return rate,

  2. Debt_Payoff:
     Outstanding_Mortgage +
     Outstanding_Consumer_Debt +
     Estate_Taxes_Estimated,

  3. Education_Fund:
     Number_of_Children × Cost_Per_College ×
     (1 + inflation)^years_to_college,

  4. Emergency_Fund:
     6_months_of_expenses,

  5. Funeral_and_Settlement_Costs:
     $15,000 - $25,000
}

TotalCapitalNeeded = (1) + (2) + (3) + (4) + (5)

CurrentResources = (
  Current_Life_Insurance +
  Liquid_Assets +
  Home_Equity (if sellable)
)

InsuranceGap = TotalCapitalNeeded - CurrentResources

RESULT:
  IF Gap > 0: Need $[X] MORE coverage,
  IF Gap <= 0: Adequately insured or over-insured
```

**Output Example:**
- Income replacement (20 years to independence): $800,000
- Debt payoff (mortgage + other): $250,000
- Education fund (2 kids, college in 10-12 years): $400,000
- Emergency fund (6 months): $60,000
- Funeral/settlement: $25,000
- Total needed: $1,535,000
- Current insurance: $750,000
- Other resources: $150,000
- Gap: $635,000
- Recommendation: Need additional $635,000 coverage

**Scoring Rubric:**
- Gap < 0 (over-insured): Consider reducing if premiums burdensome
- Gap 0-10% of need: ADEQUATE
- Gap 10-30% of need: MODERATE SHORTFALL (add coverage)
- Gap 30-50% of need: SIGNIFICANT SHORTFALL (increase coverage)
- Gap >50% of need: CRITICAL SHORTFALL (major gap)

#### 2.2.2 Disability Income Gap Analysis

**Inputs:**
- Current earned income
- Length of disability benefit waiting period
- Group DI benefit amount and duration
- Individual DI coverage
- Spouse's income
- Essential expenses during disability
- Length of coverage needed (to retirement)

**Calculation Engine:**

```
MonthlyIncomeNeed = (
  Essential_Monthly_Expenses +
  Dependent_Support_Needs
)

MonthlyIncomeAvailable = (
  Group_DI_Benefit_Amount +
  Individual_DI_Benefit_Amount +
  Spouse_Income +
  Investment_Income
)

MonthlyIncomeGap = MonthlyIncomeNeed - MonthlyIncomeAvailable

GapDuration = Years_to_Retirement × 12 months

TotalIncomeGap = MonthlyIncomeGap × GapDuration
IntoleranceFactor = (family_size × 2.5) to account for psychosocial impact

Result:
  IF MonthlyIncomeGap <= 0: ADEQUATE COVERAGE
  IF MonthlyIncomeGap > 0: Gap of $[X]/month for $[Y] total
```

**Output Example:**
- Essential monthly expenses: $5,000
- Spouse's income: $3,000
- Group DI benefit: $2,500/month
- Individual DI coverage: $0
- Monthly gap: $5,000 + $3,000 - $3,000 - $2,500 = -$2,500 (no gap)
- Adequacy: ADEQUATE if spouse income reliable; RECOMMEND individual coverage for safety

**Scoring Rubric:**
- Gap 0: FULLY COVERED
- Gap 1-25% of income need: MOSTLY COVERED (monitor)
- Gap 25-50% of income need: SIGNIFICANT GAP (get individual coverage)
- Gap >50% of income need: CRITICAL GAP (immediate action needed)

#### 2.2.3 Long-Term Care Exposure Analysis

**Inputs:**
- Age, health status
- Life expectancy
- Family history of LTC need
- LTC cost in your region
- Years of potential LTC need (assumption: 3 years average)
- Current LTC insurance coverage
- Liquid assets available for self-insurance

**Calculation Engine:**

```
LTCRiskExposure = {
  Probability_needing_LTC: Age-based tables (increases with age),
  Duration_of_need: 2-5 years (assume 3),
  Cost_per_year: Regional cost × (1 + inflation)^years_to_LTC,
  Total_cost_exposed: Cost_per_year × Duration
}

CostInYourRegion = (
  Assisted_Living: $54,000/year (national avg),
  Nursing_Home_Semi_Private: $108,000/year,
  Home_Care: $61,000/year
) × Region_Cost_Factor

TotalExposure = (
  Most_likely_scenario × Probability +
  High_cost_scenario × 20% probability +
  Low_cost_scenario × 20% probability
)

InsuranceCoverage = (
  Current_LTC_Insurance_Benefit × Coverage_Duration
)

SelfInsuranceCapacity = (
  Liquid_Assets +
  Home_Equity_Available
)

ExposureGap = TotalExposure - InsuranceCoverage - SelfInsuranceCapacity

ASSESSMENT:
  IF ExposureGap <= 0: Can self-insure or covered by insurance,
  IF ExposureGap > 0: Risk of $[X] gap in event of LTC need
```

**Output Example:**
- Age: 62, health: good
- LTC probability by age 90: 60%
- Expected cost (nursing home): $108,000/year × 3 years = $324,000
- Risk exposure: $324,000 × 60% = $194,400
- Current LTC insurance: $0
- Liquid assets available: $200,000
- Self-insurance capacity: $200,000
- Exposure gap: $194,400 - $200,000 = ADEQUATELY SELF-INSURED
- Recommendation: Monitor; consider LTC insurance if liquid assets decline

**Scoring Rubric:**
- Gap < 0 (covered by insurance or assets): LOW RISK
- Gap 0-25% of cost scenario: MANAGEABLE RISK (self-insurance viable)
- Gap 25-50% of cost scenario: MODERATE RISK (consider LTC insurance)
- Gap 50-100% of cost scenario: HIGH RISK (LTC insurance recommended)
- Gap >100% of cost scenario: CRITICAL RISK (LTC insurance essential)

---

### 2.3 Tax Efficiency Assessment

#### 2.3.1 Effective Tax Rate & Bracket Analysis

**Inputs:**
- Gross income (wages, self-employment, investment, other)
- Tax deductions (itemized or standard)
- Tax credits
- State tax liability
- Estimated future income in retirement

**Calculation Engine:**

```
FederalTaxableIncome = (
  Gross_Income -
  Above_the_Line_Deductions -
  Standard_Deduction_or_Itemized
)

FederalTaxLiability = (
  Apply_tax_bracket_schedule_to_FederalTaxableIncome +
  Capital_Gains_Tax +
  Net_Investment_Income_Tax_if_applicable
)

StateTaxLiability = (
  Apply_state_tax_rate_to_StateTaxableIncome
)

MarginalTaxRate = Rate at top dollar of income

EffectiveRate = (TotalTax / GrossIncome) × 100%

TaxBracketPosition = {
  Current: [Bracket]%,
  Room_to_next_bracket: $[X],
  Risk_of_exceeding_threshold: High/Medium/Low
}

Recommendation = {
  IF in_high_bracket_with_room:
    CONSIDER: Traditional 401k, IRA, HSA contributions,
  IF approaching_Medicare_IRMAA_threshold:
    AVOID: Large capital gains realization,
  IF approaching_Roth_conversion_threshold:
    CONSIDER: Roth conversions in low-income years
}
```

**Output Example:**
- Gross income: $150,000
- Standard deduction: -$13,850
- Taxable income: $136,150
- Federal tax: $19,045 (14.1% effective rate)
- Marginal rate: 22%
- State tax: $4,800
- Total tax: $23,845 (15.9% effective)
- Room to next bracket (24%): $13,850
- Recommendation: Max out 401k ($23,500) to reduce into lower bracket

#### 2.3.2 Roth Conversion Opportunity Analysis

**Inputs:**
- Current traditional IRA balance
- Current year income
- Next year projected income
- Roth conversion limits (none, but pro-rata rule applies)
- Tax rate difference between now and retirement

**Calculation Engine:**

```
ConversionAmount_Optimal = (
  Amount that fills gap to next tax bracket +
  Amount that stays below Medicare_IRMAA_threshold
)

ConversionTaxCost = (
  ConversionAmount × CurrentMarginalTaxRate
)

ConversionBenefit = (
  Future_value_of_converted_amount × growth_rate^years -
  Taxes_in_retirement_on_that_amount
) - ConversionTaxCost

ProRataRule_Impact = (
  IF traditional_IRA_balance > $100k:
    Conversion_includes_pre-tax_AND_after-tax_portions
)

Recommendation = {
  IF ConversionBenefit > 0:
    CONVERT $[X] this year,
  IF ConversionBenefit <= 0:
    SKIP conversion or convert smaller amount
}
```

**Output Example:**
- Traditional IRA balance: $250,000
- Current year income: $120,000
- Current bracket: 22%
- Room to 24% bracket: $30,000
- Optimal conversion: $30,000
- Tax cost: $30,000 × 22% = $6,600
- Benefit (20 years): Converted amount grows tax-free, saves ~$15,000 in future taxes
- Net benefit: ~$8,400 in present value
- Recommendation: CONVERT $30,000 this year

#### 2.3.3 Asset Location Optimization

**Inputs:**
- Asset balances by account type (taxable, traditional, Roth, HSA)
- Asset allocation by holding
- Tax efficiency of holdings (high turnover/dividends vs. tax-efficient)
- Expected future tax rates

**Calculation Engine:**

```
TaxEfficiencyRating = {
  High_Turnover_Stocks: 50% tax-efficient,
  Dividend_Stocks: 70% tax-efficient,
  Bonds: 10% tax-efficient (fully taxable),
  Index_Funds: 95% tax-efficient,
  Tax_Managed_Funds: 98% tax-efficient
}

OptimalLocation = {
  Taxable_Account: Index funds, growth stocks, tax-managed funds,
  Traditional_IRA: Bonds, REITs, high-dividend stocks,
  Roth_IRA: Highest_expected_growth_assets,
  HSA: Tax-efficient growth, medical expense reserve
}

TaxDragCalculation = {
  Current_drag: (Sub-optimal_assets × Tax_drag_percentage),
  Optimized_drag: (Optimal_assets × Tax_drag_percentage),
  Annual_tax_savings: Current_drag - Optimized_drag
}

Recommendation = {
  Move [AssetX] from [AccountY] to [AccountZ],
  Expected_annual_tax_savings: $[X],
  Transaction_costs: $[Y],
  Net_benefit: $[X] - $[Y]
}
```

**Output Example:**
- Current: $200k taxable bonds in taxable account (10% efficient)
- Tax drag: $200k × 4% (expected return) × 90% (tax impact) = $7,200/year tax
- Recommendation: Move bonds to traditional IRA, move index funds to taxable
- New drag: $2,000/year
- Annual tax savings: $5,200
- Recommendation: REPOSITION accounts as recommended

---

### 2.4 Estate Completeness Assessment

#### 2.4.1 Document Inventory & Completeness Score

**Inputs:**
- Existence of: Will, Trust, POA (financial), POA (healthcare), Living Will, HIPAA release
- Document dates (outdated if >5 years without major life events)
- Alignment with current situation (beneficiaries, fiduciaries)
- State compliance review

**Calculation Engine:**

```
DocumentScore = {
  Will: 20 points (required if assets > $500k),
  Trust: 20 points (required if assets > $1M or complexity),
  Financial_POA: 10 points,
  Healthcare_POA: 10 points,
  Living_Will: 10 points,
  HIPAA_Release: 5 points,
  Letter_of_Intent: 10 points,
  Beneficiary_Review: 15 points (critical, often out of date)
}

CompletionScore = (DocumentsPresent / TotalDocumentsNeeded) × 100%

OutofDatePenalty = (
  -5 points per document > 5 years old without major life events
)

BeneficiaryAlignmentScore = (
  All_beneficiaries_current_and_coordinated: 15 points,
  Some_issues: 8 points,
  Significant_misalignment: 0 points
)

FinalScore = CompletionScore + BeneficiaryAlignmentScore - OutofDatePenalty

Result:
  IF Score >= 85: STRONG,
  IF Score 70-84: ADEQUATE with gaps,
  IF Score 50-69: SIGNIFICANT GAPS,
  IF Score < 50: CRITICAL—needs attorney consultation
```

**Output Example:**
- Will: Present (20 points)
- Trust: Not present, but needed (0/20)
- Financial POA: Present (10 points)
- Healthcare POA: Not present (0/10)
- Living Will: Present (10 points)
- HIPAA: Not present (0/5)
- Beneficiary alignment: Outdated (6/15)
- Total score: 56/100
- Assessment: SIGNIFICANT GAPS
- Recommendations: (1) Create trust, (2) Update healthcare POA, (3) Update beneficiaries, (4) Complete HIPAA forms

---

### 2.5 Investment Appropriateness Assessment

#### 2.5.1 Allocation Drift Analysis

**Inputs:**
- Target allocation (strategic)
- Current allocation
- Drift tolerance band (typically ±5%)
- Time since last rebalance

**Calculation Engine:**

```
AllocationDrift = {
  Current_Allocation - Target_Allocation for each asset class
}

DriftExcess = (
  Sum of |Drift| where |Drift| > Tolerance
)

DriftTrigger = {
  IF |Drift| > Tolerance: REBALANCE,
  IF time_since_rebalance > 12 months: REBALANCE,
  IF >10% drift in any major class: URGENT_REBALANCE
}

OpportunityCost = (
  Annual_return_of_overweight_class -
  Annual_return_of_underweight_class
) × Asset_base

Recommendation = {
  REBALANCE_NOW: [details],
  Expected_rebalancing_cost: $[X],
  Expected_annual_benefit: $[Y],
  Timeline: [urgency]
}
```

**Output Example:**
- Target: 60% stocks, 40% bonds
- Current: 68% stocks, 32% bonds
- Drift: +8% stocks, -8% bonds (EXCEEDS 5% tolerance)
- Time since rebalance: 18 months
- Rebalancing need: URGENT
- Opportunity cost of drift: +1.2% return short-term, but increased risk
- Recommendation: REBALANCE now; move $80k from stocks to bonds

#### 2.5.2 Concentration Risk Assessment

**Inputs:**
- Top 10 holdings
- % of portfolio in each
- Single-stock concentration
- Sector concentration
- Correlation of holdings

**Calculation Engine:**

```
ConcentrationRisk = {
  Any_single_holding > 10%: FLAG,
  Top_5_holdings > 40%: FLAG,
  Single_sector > 30%: FLAG,
  Employer_stock_concentration: Always review
}

DiversificationScore = (
  Number_of_holdings > 30: 10 points,
  Number_of_holdings 20-30: 7 points,
  Number_of_holdings 10-20: 5 points,
  Number_of_holdings < 10: 2 points,
  Geographic_diversification: +5 points,
  Sector_balance: +5 points if no sector > 25%
)

ConcentrationRisk_Percentage = (
  Holdings > 10% / Total_portfolio_value
)

Recommendation = {
  IF concentration > 20%: REDUCE RISK,
  IF top_5 > 40%: REDUCE RISK,
  IF single_holding > 15%: REDUCE IMMEDIATELY
}
```

**Output Example:**
- Top holding: Apple stock, 18% of portfolio
- Top 5 holdings: 52% of portfolio
- Sector (Technology): 35% of portfolio
- Diversification score: 35/30 (over-concentrated)
- Risk: Concentration risk exceeds tolerance
- Recommendation: Reduce Apple to <10%, rebalance tech sector to <25%

#### 2.5.3 Fee Analysis & Drag Calculation

**Inputs:**
- Expense ratios (by fund/holding)
- Advisory fees
- Transaction costs
- Fund turnover
- Total assets under management

**Calculation Engine:**

```
TotalFeeStructure = {
  Investment_management_fee: [%],
  Expense_ratios_weighted_average: [%],
  Trading_costs_estimated: [%] (turnover × cost),
  Advisor_fee: [%],
}

TotalAnnualCost = TotalFeeStructure × Portfolio_value

FeeComparison = {
  Current_total_cost: [X]%,
  Benchmark_cost: [Y]%,
  Index_fund_cost: 0.05-0.20%,
  Fee_advantage_vs_index: [difference]%
}

AnnualFeeDrag = (
  TotalAnnualCost × Portfolio_value × 30_years
) = Lifetime_cost

Recommendation = {
  IF Cost > Benchmark_by_0.5%+: CONSIDER LOWER-COST ALTERNATIVES,
  IF Cost includes advisory + fund fees > 1.25%: EVALUATE VALUE ADDED,
  IF Turnover > 100%: REVIEW FOR TAX EFFICIENCY
}
```

**Output Example:**
- Advisor fee: 0.75%
- Average expense ratio: 0.35%
- Total annual cost: 1.10%
- Benchmark cost (similar strategy): 0.85%
- Cost disadvantage: 0.25%/year
- On $1M portfolio: $2,500/year higher cost
- Over 30 years: $75,000+ difference
- Recommendation: Review value added; if underperforming, consider lower-cost provider

---

## 3. SCORING RUBRIC WITH QUANTITATIVE THRESHOLDS

### 3.1 Master Scoring Framework

| Assessment Area | Metric | Red Flag (<50%) | Yellow Flag (50-75%) | Green (75-100%) |
|---|---|---|---|---|
| **Retirement** | Accumulation gap | >30% shortfall | 10-30% shortfall | <10% gap or surplus |
| **Retirement** | Withdrawal sustainability | <70% probability to age 95 | 70-85% probability | >85% probability |
| **Life Insurance** | Capital gap | >50% of need | 20-50% of need | <20% or 0 gap |
| **Disability** | Income replacement | <50% covered | 50-80% covered | >80% covered |
| **LTC** | Exposure gap | >100% of cost | 25-100% of cost | <25% or self-insured |
| **Tax** | Bracket room used | >90% of bracket | 70-90% of bracket | <70% (optimization opportunity) |
| **Estate** | Document completion | <50% complete | 50-85% complete | >85% complete |
| **Investment** | Allocation drift | >15% drift | 5-15% drift | <5% drift |
| **Investment** | Concentration | >30% in top 5 | 20-30% in top 5 | <20% in top 5 |
| **Investment** | Fee drag | >1.5% annual | 1.0-1.5% annual | <1.0% annual |

---

## 4. PEER COMPARISON CONTEXT

### 4.1 Demographic Percentile Positioning

**Retrieve from KB:**
- Peer group definition (age ±5 years, income ±25%, assets ±30%)
- Retirement readiness percentile (0-100%, where 50% = median)
- Insurance adequacy percentile
- Tax efficiency percentile
- Estate planning percentile
- Investment efficiency percentile

**Output Example:**
> Client retirement readiness is at the 68th percentile among peers (age 55-65, $500K-$800K portfolio). This means 68% of similar clients are in a similar or better position. Focus areas where client lags peers: Tax efficiency (45th percentile), Estate planning (52nd percentile).

---

## 5. REGULATORY VALIDATION

### 5.1 Compliance Checkpoints

**By Assessment Type:**

**Retirement:**
- RMD calculations (age 73+): Verify against IRS tables
- Medicare IRMAA exposure (>$194,500 MAGI for married): Flag if at risk
- Contribution limits: Verify no over-contributions to 401k, IRA, HSA

**Insurance:**
- Life insurance limit check: No more than 10-12× income (danger of anti-selection)
- Beneficiary designations: Ensure aligned with overall estate plan
- Policy review: Ensure not using lapsed or no-longer-needed policies

**Tax:**
- Charitable contribution limits: 50-100% AGI depending on asset type
- Capital loss carryforward: Track multi-year losses for proper use
- Passive activity loss limitations: Verify compliance

**Estate:**
- Federal estate exemption: Verify strategy aligns with current exemption ($13.61M in 2024)
- State estate tax exposure: 18 states have estate taxes—verify if applicable
- QTIP/Marital Deduction eligibility: If trust-based strategy, verify compliance

---

## 6. GAP-TO-ACTION MAPPING

### 6.1 Issue → Recommendation → Timeline

**Example Mapping:**

| Issue Identified | Severity | Recommended Action | Timeline | Owner | Success Metric |
|---|---|---|---|---|---|
| Retirement accumulation gap of 8% | LOW | Increase annual savings by $2,500 OR extend working 6 months | 90 days to implement | Client | Gap closes to <5% |
| Life insurance shortfall of $250k | MEDIUM | Purchase additional $250k term insurance, 20-year term | 30 days to apply, 60 days to fund | Client (apply) + Advisor (coordinate) | Gap fully covered |
| Allocation drift of 12% | MEDIUM | Rebalance: sell $80k stocks, buy $80k bonds | 30 days | Advisor | Drift back to <5% |
| Estate document gaps | MEDIUM-HIGH | Meet with estate attorney, create trust and healthcare POA | 60-90 days | Client (attorney) + Advisor (oversee) | 85%+ document completion score |
| Tax efficiency 25% improvement opportunity | LOW-MEDIUM | Implement asset location optimization | 60 days | Advisor | Reduce annual tax drag by $2,500 |

---

## 7. CONFIDENCE INTERVALS ON PROJECTIONS

### 7.1 Range-Based Estimates (NOT Point Forecasts)

**Methodology:**

```
Each projection includes three scenarios:
- CONSERVATIVE (10th percentile of return distribution)
- BASE CASE (median/expected value)
- OPTIMISTIC (90th percentile of return distribution)

Example:
Retirement projection at age 67:
  Conservative: $980,000 (10% probability of being lower)
  Base case: $1,250,000 (most likely)
  Optimistic: $1,620,000 (10% probability of being higher)

Client planning should use CONSERVATIVE case for critical goals,
BASE case for general planning,
OPTIMISTIC case for "stretch" goals.
```

**Output Format:**

> **Retirement Portfolio Projection (Age 67)**
>
> Conservative Case: $980,000 (10th percentile—accounts for below-average returns)
>
> Base Case: $1,250,000 (median outcome—accounts for average returns and inflation)
>
> Optimistic Case: $1,620,000 (90th percentile—assumes above-average returns)
>
> **Your retirement goal: $1,200,000**
>
> Assessment: ON TRACK in base and optimistic cases; slightly short in conservative case. Consider: (a) increasing savings, (b) extending work timeline 1-2 years, or (c) accepting slightly lower retirement spending.

---

## 8. KNOWLEDGE BASE RETRIEVAL TRIGGERS

**Retrieve BEFORE Assessment Generation:**

1. **Regulatory Reference Data**
   - KB Query: "IRS contribution limits, RMD tables, estate exemptions, IRMAA thresholds for [year]"

2. **Planning Methodologies**
   - KB Query: "Retirement analysis methodology, capital needs analysis, safe withdrawal rate studies"

3. **Risk Tolerance Standards**
   - KB Query: "Risk tolerance questionnaire results, appropriate allocation by risk profile, rebalancing guidelines"

4. **Peer Comparison Data**
   - KB Query: "Demographic cohort data for [age/income/asset range], assessment percentile benchmarks"

5. **Historical Performance Data**
   - KB Query: "Asset class returns by decade, volatility statistics, recovery timeframes, tax impact studies"

---

## 9. OUTPUT SPECIFICATION

### 9.1 Assessment Scorecard (Advisor-Facing)

```json
{
  "assessment_summary": {
    "assessment_date": "2026-03-16",
    "client_id": "CLI-12345",
    "assessment_types": ["retirement_readiness", "investment_appropriateness"],
    "overall_financial_health_score": 72
  },

  "retirement_assessment": {
    "accumulation_gap": {
      "target_at_retirement": "$1,500,000",
      "projected_value_base": "$1,420,000",
      "gap_percentage": -5.3,
      "gap_assessment": "ON TRACK",
      "confidence_range": {
        "conservative_10th": "$1,200,000",
        "base_median": "$1,420,000",
        "optimistic_90th": "$1,680,000"
      }
    },
    "withdrawal_sustainability": {
      "projected_annual_withdrawal": "$65,000",
      "safe_withdrawal_rate": 4.2,
      "portfolio_longevity_to_95": "92%",
      "portfolio_longevity_to_100": "84%",
      "assessment": "SUSTAINABLE"
    },
    "social_security_optimization": {
      "fra_benefit": "$2,400/month",
      "recommendation": "CLAIM AT 70",
      "monthly_benefit_at_70": "$2,976",
      "lifetime_value_gain": "$85,000+"
    }
  },

  "insurance_assessment": {
    "life_insurance": {
      "total_capital_needed": "$1,535,000",
      "current_coverage": "$750,000",
      "other_resources": "$150,000",
      "gap": "$635,000",
      "assessment": "SIGNIFICANT SHORTFALL",
      "recommendation": "Increase coverage by $635,000"
    },
    "disability_insurance": {
      "monthly_income_gap": "$0",
      "assessment": "ADEQUATE"
    },
    "ltc_exposure": {
      "exposure_risk": "$194,400",
      "self_insurance_capacity": "$200,000",
      "assessment": "ADEQUATELY SELF-INSURED"
    }
  },

  "investment_assessment": {
    "allocation_drift": {
      "target": "60% stocks, 40% bonds",
      "current": "68% stocks, 32% bonds",
      "drift": "+8% stocks, -8% bonds",
      "assessment": "EXCEEDS TOLERANCE",
      "recommendation": "REBALANCE NOW"
    },
    "concentration_risk": {
      "top_holding": "Apple, 18%",
      "top_5_holdings": "52%",
      "concentration_score": 35,
      "assessment": "OVER-CONCENTRATED",
      "recommendation": "Reduce Apple to <10%, diversify"
    },
    "fee_efficiency": {
      "total_annual_cost": "1.10%",
      "benchmark_cost": "0.85%",
      "annual_fee_drag": "$2,500",
      "assessment": "0.25% higher than benchmark"
    }
  },

  "tax_assessment": {
    "effective_tax_rate": "15.9%",
    "marginal_rate": "22%",
    "bracket_room": "$13,850",
    "roth_conversion_opportunity": "$30,000",
    "estimated_tax_savings": "$8,400",
    "asset_location_optimization": "Reposition $200k bonds"
  },

  "estate_assessment": {
    "document_completion_score": "56/100",
    "assessment": "SIGNIFICANT GAPS",
    "missing_documents": ["Trust", "Healthcare POA"],
    "beneficiary_alignment_issues": ["Outdated beneficiaries"],
    "recommended_actions": [
      "Create trust",
      "Update beneficiaries",
      "Create healthcare POA",
      "Complete HIPAA forms"
    ]
  },

  "gaps_and_recommendations": [
    {
      "priority": "HIGH",
      "issue": "Life insurance shortfall",
      "gap_amount": "$635,000",
      "recommended_action": "Purchase additional term insurance",
      "timeline": "30-60 days",
      "impact_if_not_addressed": "Dependents financially vulnerable"
    },
    {
      "priority": "MEDIUM",
      "issue": "Portfolio allocation drift",
      "gap_impact": "$80k equity exposure overage",
      "recommended_action": "Rebalance to target allocation",
      "timeline": "30 days",
      "impact_if_not_addressed": "Increased risk vs. plan"
    },
    {
      "priority": "MEDIUM",
      "issue": "Estate document gaps",
      "gap_impact": "No trust or healthcare POA",
      "recommended_action": "Consult estate attorney",
      "timeline": "60-90 days",
      "impact_if_not_addressed": "Probate risk, incapacity planning gaps"
    }
  ],

  "peer_comparison": {
    "retirement_readiness_percentile": 68,
    "insurance_adequacy_percentile": 42,
    "tax_efficiency_percentile": 45,
    "investment_efficiency_percentile": 55
  },

  "next_steps": {
    "immediate_actions": [
      "Apply for additional life insurance",
      "Rebalance portfolio",
      "Schedule estate attorney consultation"
    ],
    "follow_up_assessment": "6 months",
    "monitoring_frequency": "Quarterly"
  }
}
```

### 9.2 Client-Facing Summary (Plain Language)

**Example for Retirement Assessment:**

> **Your Retirement Readiness**
>
> **The Bottom Line:** You're on track to retire on schedule with adequate resources.
>
> **What We Analyzed:**
> - Current portfolio: $450,000
> - Annual savings: $25,000
> - Projected value at 67: $1,420,000 (base case)
> - Retirement goal: $1,500,000
> - Gap: Only 5% below target—this is within normal variation
>
> **Confidence Range:** We're 84% confident your portfolio will land between $1.2M and $1.68M. Even in the conservative scenario (lower returns), you'd have $1.2M—still very close to your goal.
>
> **What Makes This Work:** Your consistent savings, reasonable investment approach, and 17-year timeframe give you room for market volatility to recover.
>
> **Next Steps:** Stick to your savings plan, rebalance annually, and we'll check in on progress quarterly.

---

## 10. VALIDATION RULES

1. **Every number must have a source:** KB reference, client data, or published assumption (disclosed)
2. **Confidence intervals required:** Never single-point forecasts for long-term projections
3. **Regulatory thresholds must be checked:** Before any assessment is finalized
4. **Peer comparison contextualized:** Percentile only meaningful if demographic match is clear
5. **Gap-to-action must be specific:** Not "improve tax efficiency" but "move $200k bonds to IRA, save $5,200/year"

---

## 11. EXAMPLE ASSESSMENT

**Scenario:** 45-year-old couple, $500k portfolio, $100k annual income, goal: retire at 67

**Assessment Output:**
- Retirement readiness: ON TRACK (92% confidence at median, 84% at conservative)
- Insurance gap: $250k life insurance shortfall
- Investment allocation drift: None, rebalance annually
- Tax efficiency opportunity: $8,400/year via asset location optimization
- Estate planning: 52/100, need trust and beneficiary updates
- Overall health score: 71/100
- Top priorities: (1) Add life insurance, (2) Update estate documents, (3) Implement tax optimization

