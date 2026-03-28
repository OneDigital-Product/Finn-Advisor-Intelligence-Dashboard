# 23-withdrawal-analysis.md
## Function: Route-level - Withdrawal Analysis

### PURPOSE
Develop comprehensive year-by-year withdrawal plans with tax optimization, dynamic adjustment protocols, and multi-strategy comparison. Every withdrawal recommendation is backed by tax calculations and account-level detail.

---

## CORE ARCHITECTURE

### 1. WITHDRAWAL SEQUENCING OPTIMIZATION

### 1.1 Account Draw-Down Priority Modeling
```
FUNCTION: determine_optimal_withdrawal_sequence():

  // Which account(s) to draw from in each year?
  // Maximize tax efficiency and portfolio longevity

  CLIENT ACCOUNTS:

  Account 1: Taxable Brokerage
    Balance: $200,000
    Cost basis: $140,000
    Unrealized gain: $60,000 ($60K taxable if liquidated)
    If liquidated immediately: Tax on gain = $60,000 × 20% = $12,000

  Account 2: Traditional IRA
    Balance: $300,000
    Tax basis: $0 (pre-tax contributions)
    If withdrawn: 100% taxable as ordinary income
    If withdrawn $50,000: Tax = $50,000 × 35% = $17,500

  Account 3: Roth IRA
    Balance: $100,000
    Tax basis: $100,000 (after-tax contributions)
    Earnings: $25,000
    If withdrawn: No tax (both contributions and earnings, if post-59.5 and 5-year rule met)

  Account 4: 401(k) (employer)
    Balance: $250,000
    Tax basis: $0 (pre-tax)
    If withdrawn: 100% taxable
    If withdrawn $50,000: Tax = $50,000 × 35% = $17,500

  ANNUAL WITHDRAWAL LOGIC:

  FOR each_year IN [retirement]:

    annual_cash_need = planned_spending - other_income_sources

    IF annual_cash_need == $45,000:

      // Step 1: Draw from most tax-efficient source first
      IF roth_balance > 0 AND age >= 59.5 AND account_5yr_rule_met:
        roth_withdrawal = MIN($45,000, roth_balance)
        cash_need -= roth_withdrawal
        tax_cost = $0

      // Step 2: Draw from taxable account (but manage gains)
      IF cash_need > 0 AND taxable_balance > 0:
        // Harvest losses first if available
        IF taxable_has_losses:
          loss_harvest_amount = MIN(losses, cash_need × 0.3)
          cash_need -= loss_harvest_amount
          tax_cost = NEGATIVE (loss benefit)

        // Then draw unrealized gains (buy FIFO or specific ID)
        IF cash_need > 0:
          taxable_withdrawal = MIN(cash_need, taxable_balance)
          // Use specific ID to minimize gain recognition
          gain_per_share = (current_price - cost_basis) / shares_held
          gain_total = taxable_withdrawal × gain_per_share
          tax_cost = gain_total × ltcg_rate

      // Step 3: Draw from tax-deferred as needed
      IF cash_need > 0:
        // Check for RMD age and coordinate
        IF age >= 73:
          rmd_amount = CALCULATE_RMD()
          traditional_withdrawal = MAX(cash_need, rmd_amount)
        ELSE:
          traditional_withdrawal = cash_need

        tax_cost = traditional_withdrawal × ordinary_rate

      // Final tally
      total_withdrawal = roth_withdrawal + taxable_withdrawal + traditional_withdrawal
      total_tax = [sum of all tax costs]
      after_tax_income = total_withdrawal - total_tax

WITHDRAWAL SEQUENCE EXAMPLE:

Year 1 (Age 65):
  Annual need: $45,000
  ✓ Roth draw: $45,000 (tax cost: $0)
  ✓ Taxable draw: $0
  ✓ Traditional draw: $0
  Total income: $45,000 | Tax: $0 | After-tax: $45,000

Year 2 (Age 66):
  Annual need: $45,000
  ✓ Roth draw: $25,000 (remaining balance: $75,000)
  ✓ Taxable draw: $15,000 with $2,000 gain (tax: $400)
  ✓ Traditional draw: $5,000 (tax: $1,750)
  Total income: $45,000 | Tax: $2,150 | After-tax: $42,850

Year 3 (Age 67):
  Annual need: $48,000
  ✓ Roth draw: $0 (fully depleted)
  ✓ Taxable draw: $28,000 with $3,500 gain (tax: $700)
  ✓ Traditional draw: $20,000 (tax: $7,000)
  Total income: $48,000 | Tax: $7,700 | After-tax: $40,300
```

### 1.2 Tax Bracket Filling Strategy
```
FUNCTION: optimize_withdrawal_by_tax_bracket():

  // Maximize tax-deferred withdrawals in low-income years
  // Fill available "tax room" before triggering higher brackets

  CLIENT TAX SITUATION:

  Filing status: Married filing jointly
  Standard deduction: $27,700
  Tax brackets (2024):
    10%: $0 - $22,500
    12%: $22,500 - $90,750
    22%: $90,750 - $190,650
    24%: $190,650 - $364,200

  Age 65 (first retirement year):
    Ordinary income (taxable): $0
    Social Security (50% taxable): $32,000 × 50% = $16,000
    Provisional income: $16,000

    Available room before 22% bracket:
      22% bracket threshold: $90,750
      Current income: $16,000
      Available room: $90,750 - $16,000 = $74,750

    Recommended traditional IRA withdrawal: $60,000
    New taxable income: $16,000 + $60,000 = $76,000
    Tax bracket: 12%
    Tax on $60K withdrawal: $60,000 × 12% = $7,200

  Age 70 (later year, higher other income):
    Ordinary income: $8,000 (pension)
    Social Security (85% taxable): $45,000 × 85% = $38,250
    Provisional income: $46,250

    Available room before 22% bracket:
      Current income: $46,250
      Available room: $90,750 - $46,250 = $44,500

    Recommended traditional IRA withdrawal: $40,000
    New taxable income: $46,250 + $40,000 = $86,250
    Tax bracket: 12%
    Tax on $40K withdrawal: $40,000 × 12% = $4,800

BRACKET-FILLING ALGORITHM:

FOR each_tax_year IN retirement:

  // Calculate current taxable income
  ss_taxable = ss_income × calculation_factor
  pension_income = pension_payment
  current_taxable = ss_taxable + pension_income + other_income

  // Identify available "room"
  next_bracket_threshold = tax_brackets[next_bracket]
  available_room = next_bracket_threshold - current_taxable

  // Fill room with tax-deferred withdrawals
  tax_deferred_withdrawal = MIN(available_room, total_tax_deferred_balance)

  // If need more income, take in next bracket
  IF total_cash_need > tax_deferred_withdrawal:
    additional_need = total_cash_need - tax_deferred_withdrawal
    additional_withdrawal = additional_need
    additional_tax_rate = next_bracket_rate
  ELSE:
    additional_withdrawal = 0

  total_withdrawal = tax_deferred_withdrawal + additional_withdrawal
  total_tax = (tax_deferred_withdrawal × current_rate) +
              (additional_withdrawal × next_bracket_rate)

EXAMPLE BRACKET FILLING OVER 10 YEARS:

Age | Other Income | Available Room | IRA Withdrawal | Tax Rate | Tax Cost
────────────────────────────────────────────────────────────────────────
65  | $16,000     | $74,750        | $60,000        | 12%      | $7,200
66  | $18,000     | $72,750        | $60,000        | 12%      | $7,200
67  | $40,000     | $50,750        | $45,000        | 12%      | $5,400
68  | $42,000     | $48,750        | $45,000        | 12%      | $5,400
69  | $44,000     | $46,750        | $40,000        | 12%      | $4,800
70  | $46,000     | $44,750        | $40,000        | 12%      | $4,800
71  | $48,000     | $42,750        | $40,000        | 12%      | $4,800
72  | $50,000     | $40,750        | $38,000        | 12%      | $4,560
73  | $52,000     | $38,750        | $38,000 (RMD)  | 12%      | $4,560
74  | $54,000     | $36,750        | $36,000 (RMD)  | 12%      | $4,320

10-year total taxes: $52,840 (12% average rate)
vs. unoptimized (22% rate): $77,000
TAX SAVINGS: $24,160 (31% reduction)
```

### 1.3 Roth Conversion Opportunity Windows
```
FUNCTION: identify_roth_conversion_windows():

  // Low-income years are ideal for converting traditional IRA → Roth
  // Lock in lower lifetime tax

  CLIENT PROFILE:

  Ages 62-65: High income (W-2 employment) - NOT ideal for conversion
  Ages 65-70: Moderate income (SS + some work) - IDEAL for conversion
  Ages 70+: High income (SS + RMD forced) - NOT ideal

  LOW-INCOME YEAR IDENTIFICATION:

  Age 65-66 (transition):
    Employment income:      $0 (just retired)
    Social Security (50%):  $16,000
    Provisional income:     $16,000
    Top tax bracket:        12%

    Conversion strategy: Convert $60,000 traditional → Roth
    Tax on conversion:   $60,000 × 12% = $7,200

  vs. Age 70-75 (forced RMD):
    Employment income:      $0
    Social Security (85%):  $38,250
    RMD:                    $47,000
    Provisional income:     $85,250
    Top tax bracket:        22%

    Conversion available: $0 (RMD forced withdrawal exceeds tax room)
    If forced to convert: $60,000 × 22% = $13,200
    Additional tax cost:   $6,000 more expensive

  CONVERSION LADDER OPPORTUNITY:

  Year | Ordinary Income | Available Room | Conversion Size | Tax Cost | Cumulative Roth
  ──────────────────────────────────────────────────────────────────────────────────
  1    | $16,000        | $74,750        | $60,000         | $7,200   | $60,000
  2    | $18,000        | $72,750        | $55,000         | $6,600   | $115,000
  3    | $35,000        | $55,750        | $45,000         | $5,400   | $160,000
  4    | $40,000        | $50,750        | $40,000         | $4,800   | $200,000
  5    | $42,000        | $48,750        | $38,000         | $4,560   | $238,000

  5-Year total conversions: $238,000
  5-Year total tax paid: $28,560 (12% average)

  Long-term benefit:
    • Reduced RMD at age 73 (less traditional IRA to draw from)
    • More tax-free income later (Roth withdrawals)
    • Estimated lifetime tax savings: $15,000-20,000
```

### 1.4 RMD Coordination & Optimization
```
FUNCTION: coordinate_rmd_with_withdrawal_plan():

  // RMD is mandatory; coordinate it with optimal withdrawal strategy

  CLIENT: Age 73, Traditional IRA $850,000

  RMD CALCULATION (2024 Uniform Lifetime Table):

  Age 73, IRA balance $850,000
  Life expectancy factor: 26.5
  RMD amount: $850,000 / 26.5 = $32,075

  WITHDRAWAL PLAN COORDINATION:

  Annual cash need: $50,000
  RMD: $32,075 (must be taken)
  Additional withdrawal needed: $50,000 - $32,075 = $17,925

  OPTION A: Take RMD + additional from same account
    Total traditional IRA withdrawal: $50,000
    Tax on withdrawal: $50,000 × 35% = $17,500
    After-tax income: $32,500

  OPTION B: Take RMD from traditional, additional from Roth
    Traditional IRA withdrawal: $32,075 (satisfies RMD)
    Roth IRA withdrawal: $17,925 (if available, no tax)
    Total tax: $32,075 × 35% = $11,226
    After-tax income: $38,774

  Tax savings from Option B: $6,274 (37% reduction)

  OPTION C: Qualified Charitable Distribution (QCD)
    Use QCD to satisfy part of RMD requirement
    QCD limit: $100,000/year
    Use QCD for: $32,075 (full RMD amount)
    Direct charity donation (no income tax to client)

    Cash withdrawal from Roth/taxable: $17,925
    Total tax: $0 (QCD is tax-neutral)
    After-tax income: $50,000

  Tax savings from Option C: $11,226 (100% savings on RMD)
  VERDICT: Option C is optimal IF charitably inclined

  RMD MULTI-YEAR PROJECTION:

  Age | IRA Balance | RMD Amount | Other Income | Tax | After-Tax
  ─────────────────────────────────────────────────────────
  73  | $850,000    | $32,075    | $18,000      | $17,526 | $32,474
  74  | $830,000    | $32,549    | $18,000      | $17,749 | $32,800
  75  | $810,000    | $32,927    | $18,000      | $17,824 | $32,103
  76  | $790,000    | $33,333    | $18,000      | $18,017 | $33,316
  80  | $700,000    | $35,897    | $18,000      | $18,814 | $35,083
  85  | $580,000    | $37,419    | $18,000      | $19,397 | $35,022
```

---

## 2. TAX IMPACT ANALYSIS

### 2.1 Marginal Bracket Impact Per Withdrawal Source
```
FUNCTION: analyze_tax_bracket_marginal_impact():

  // Each dollar withdrawn from different account type has different tax cost

  CLIENT TAX SITUATION:

  Filing status: Married, filing jointly
  Current ordinary income: $40,000 (Social Security 85% taxable)
  Current bracket: 12% (threshold is $90,750)
  Current tax rate on additional income: 12%

  MARGINAL TAX COST BY ACCOUNT TYPE:

  Withdrawal Source: Roth IRA
  ────────────────────────────────
  Amount withdrawn:         $1,000
  Additional taxable income: $0
  Tax cost:                 $0
  Marginal tax rate:        0%
  After-tax proceeds:       $1,000
  Verdict: Most tax-efficient

  Withdrawal Source: Taxable Account (no gains)
  ─────────────────────────────────────────────
  Amount withdrawn:         $1,000
  Taxable gain:            $0 (if no gain)
  Tax cost:                $0
  Marginal tax rate:        0%
  After-tax proceeds:       $1,000
  Verdict: Tax-free if no gains

  Withdrawal Source: Taxable Account (with gains)
  ───────────────────────────────────────────────
  Amount withdrawn:         $1,000
  Cost basis per share:    $800
  Capital gain:            $200
  Tax cost:                $200 × 20% (LTCG) = $40
  Marginal tax rate:        4% (on $1,000 withdrawn)
  After-tax proceeds:       $960
  Verdict: Inefficient due to gains

  Withdrawal Source: Traditional IRA
  ──────────────────────────────────
  Amount withdrawn:         $1,000
  Additional taxable income: $1,000
  Tax cost:                 $1,000 × 12% = $120
  Marginal tax rate:        12%
  After-tax proceeds:       $880
  Plus: Social Security impact (provisional income)
    Additional $1,000 SS taxable = $850 × 85% = $425 × 12% = $51 additional
  Total tax:                $120 + $51 = $171
  True marginal rate:        17.1%
  After-tax proceeds:       $829
  Verdict: Moderate efficiency but coupled effect

  Withdrawal Source: 401(k) (employer plan)
  ─────────────────────────────────────────
  Amount withdrawn:         $1,000
  Additional taxable income: $1,000
  Tax cost:                 $1,000 × 12% = $120 (federal)
  State tax (if applicable):$1,000 × 5% = $50
  Total tax:                $170
  Marginal tax rate:        17%
  After-tax proceeds:       $830
  Verdict: Similar to traditional IRA

RANKING BY EFFICIENCY (Most to Least):

1. Roth IRA: 0% marginal (tax-free)
2. Taxable (no gains): 0% marginal (no tax if no gains)
3. Taxable (with gains): 4-20% depending on gain size
4. Traditional IRA: 12-22% marginal rate (varies by income level)
5. 401(k): 12-22% marginal rate (same as traditional)
```

### 2.2 State Tax Considerations
```
FUNCTION: assess_state_tax_impact():

  // State taxes vary dramatically by state
  // Major impact on after-tax withdrawal income

  CLIENT SITUATION:

  Scenario A: California Resident
  ───────────────────────────────
  Federal marginal rate: 22%
  California state tax: 9.3% (on ordinary income)
  Combined marginal rate: 31.3%

  IRA withdrawal of $30,000:
    Federal tax: $30,000 × 22% = $6,600
    State tax:   $30,000 × 9.3% = $2,790
    Total tax:   $9,390
    After-tax:   $20,610
    Effective rate: 31.3%

  Scenario B: Texas Resident (No State Income Tax)
  ──────────────────────────────────────────────
  Federal marginal rate: 22%
  Texas state tax: 0%
  Combined marginal rate: 22%

  IRA withdrawal of $30,000:
    Federal tax: $30,000 × 22% = $6,600
    State tax:   $0
    Total tax:   $6,600
    After-tax:   $23,400
    Effective rate: 22%

  TAX ADVANTAGE OF TEXAS: $2,790/year
  Over 20-year retirement: $55,800 (or $130K with growth)

  PLANNING IMPLICATION:

  IF client planning major move at/near retirement:
    Recommend move to low-tax state (FL, TX, NV, WA)
    Save significant state taxes on withdrawal income

  IF client already in high-tax state:
    May justify accelerated Roth conversions (deduct state tax)
    Example: Convert in final CA work years (while deductible)
             then move to TX and take Roth draws (tax-free)

  STATE TAX ON INVESTMENT INCOME:

  California adds state tax to:
    ✓ Interest income
    ✓ Dividend income
    ✓ Capital gains (except municipal bonds)
    ✓ IRA distributions (except if converted Roth)

  Texas/Florida/Nevada advantages:
    ✓ No state tax on any income
    ✓ No tax on business income
    ✓ Municipal bonds not taxed (federal only)

  RETIREMENT HOME CONSIDERATIONS:

  If moving from high-tax to low-tax state:
    Timeline: Move BEFORE taking large IRA distributions
    Example: Retire in CA, claim residency in TX 1 year, THEN take distributions
    Save: State marginal rate × distribution amount × years
```

### 2.3 Medicare IRMAA Premium Surcharge Triggers
```
FUNCTION: monitor_irmaa_and_withdrawal_impact():

  // Modified Adjusted Gross Income (MAGI) above threshold triggers
  // higher Medicare Part B, Part D, and Net Investment Income Tax

  2024 IRMAA THRESHOLDS (Married Filing Jointly):

  Income Tier           | Part B Premium  | Part D Premium | IRMAA Surcharge
  ──────────────────────────────────────────────────────────────────────
  ≤ $194,000          | $174.70/mo      | Standard       | No surcharge
  $194,001-$246,000   | $244.20/mo      | +$11.10/mo     | 65% surcharge
  $246,001-$306,000   | $313.70/mo      | +$28.60/mo     | 85% surcharge
  $306,001-$366,000   | $383.20/mo      | +$44.70/mo     | 115% surcharge
  > $366,000          | $452.70/mo      | +$71.10/mo     | 135% surcharge

  MAGI = Adjusted Gross Income + 50% of Social Security + Tax-exempt interest

  CLIENT ANALYSIS:

  Age 65, enrolling in Medicare:

  Scenario A: Conservative withdrawals
    W-2 income: $0
    IRA withdrawal: $25,000
    Social Security (FRA): $32,000 (85% taxable = $27,200)
    Tax-exempt interest: $0

    MAGI = $25,000 + $27,200 = $52,200
    Status: BELOW threshold
    Medicare premiums: STANDARD rates ($174.70/mo)
    Annual cost for couple: $4,193

  Scenario B: Higher withdrawals (poor planning)
    W-2 income: $0
    IRA withdrawal: $80,000
    Social Security (FRA): $32,000 (85% taxable = $27,200)
    Tax-exempt interest: $0

    MAGI = $80,000 + $27,200 = $107,200
    Status: BELOW threshold ($194,000)
    Medicare premiums: STANDARD rates ($174.70/mo)
    Annual cost for couple: $4,193

  Scenario C: Large capital gains (uncoordinated)
    W-2 income: $0
    IRA withdrawal: $30,000
    Capital gains (sold stocks): $120,000
    Social Security (FRA): $32,000 (85% taxable = $27,200)
    Tax-exempt interest: $0

    MAGI = $30,000 + $120,000 + $27,200 = $177,200
    Status: BELOW threshold ($194,000) - JUST BARELY
    Medicare premiums: STANDARD rates

  Scenario D: Uncoordinated gains push over threshold
    W-2 income: $0
    IRA withdrawal: $30,000
    Capital gains (large rebalancing): $165,000
    Social Security (FRA): $32,000 (85% taxable = $27,200)
    Tax-exempt interest: $0

    MAGI = $30,000 + $165,000 + $27,200 = $222,200
    Status: OVER threshold ($194,000)
    IRMAA surcharge tier: $194,001 - $246,000 (65% surcharge)
    Medicare Part B premium: $244.20/mo vs. $174.70 = +$69.50/mo

    Additional annual cost for couple: $69.50 × 12 × 2 = $1,668/year

  PLANNING STRATEGY:

  Coordinate withdrawals around IRMAA thresholds:

  Year 1-3 (Conservative):
    Keep MAGI < $194,000
    Avoid large capital gains
    Take needed income from IRA/SS
    Medicare premiums: Standard

  Year 4 (Major rebalancing):
    SAME approach: Harvest losses to offset gains
    If must take gains: Consider spreading over 2 years
    Target: Stay below $194,000 if possible

  OR: ACCEPT higher IRMAA and plan accordingly
    If client needs > $194,000 MAGI: Acknowledge $1,668/year additional cost
    Document decision and accept trade-off
```

### 2.4 Social Security Taxation Thresholds (50% & 85%)
```
FUNCTION: manage_social_security_taxation():

  // SS taxation depends on "combined income" including withdrawals

  SS TAXATION FORMULA:

  Combined Income (CI) = Adjusted Gross Income + 50% of Social Security + Tax-exempt interest

  IF CI ≤ $25,000 (single) OR $32,000 (married):
    Taxable SS = 0%

  ELSE IF CI ≤ $34,000 (single) OR $44,000 (married):
    Taxable SS = 50% of excess above threshold
    Maximum: 50% of total SS

  ELSE IF CI > $34,000 (single) OR $44,000 (married):
    Taxable SS = lesser of:
      (a) 85% of total Social Security, OR
      (b) 85% of excess over higher threshold + $4,500 (single) or $6,000 (married)

  CLIENT EXAMPLE (Married):

  Scenario A: No withdrawals (conservative)
    Social Security: $32,000
    Other income (pension): $8,000
    IRA withdrawal: $0
    Tax-exempt interest: $0
    Combined income: $8,000

    Taxable SS calculation:
      CI ($8,000) < threshold ($32,000)
      Taxable SS: 0%
      Taxation: Only the $8,000 pension taxed at marginal rate

  Scenario B: Small withdrawal
    Social Security: $32,000
    Other income (pension): $8,000
    IRA withdrawal: $10,000
    Tax-exempt interest: $0
    Combined income: $8,000 + $10,000 + (50% × $32,000) = $34,000

    Taxable SS calculation:
      CI ($34,000) = higher threshold ($44,000 - NO, it's less)
      Actually: CI = $34,000, threshold = $32,000
      Excess: $34,000 - $32,000 = $2,000
      Taxable SS = 50% × $2,000 = $1,000 of the $32,000 SS

    Total taxable income: $8,000 + $10,000 + $1,000 = $19,000

  Scenario C: Large withdrawal (poor coordination)
    Social Security: $32,000
    Other income (pension): $8,000
    IRA withdrawal: $50,000
    Tax-exempt interest: $0
    Combined income: $8,000 + $50,000 + (50% × $32,000) = $74,000

    Taxable SS calculation:
      CI ($74,000) > higher threshold ($44,000)
      Excess: $74,000 - $44,000 = $30,000
      Tentative taxable SS = 85% × $30,000 = $25,500
      BUT: Cannot exceed 85% of total SS
      85% × $32,000 = $27,200
      Taxable SS = MIN($25,500, $27,200) = $25,500 of the $32,000 SS

    Total taxable income: $8,000 + $50,000 + $25,500 = $83,500
    Compared to scenario B: Additional $64,500 in taxable income!
    Tax difference at 22% bracket: $64,500 × 22% = $14,190 additional tax

  PLANNING IMPLICATION:

  The "SS tax thresholds" create a powerful incentive to minimize:
    • IRA withdrawals
    • Capital gains realization
    • Taxable interest income

  EXAMPLE OPTIMAL PLAN:

  Year 1-5 (Ages 65-70):
    Take small IRA draws: $15,000/year
    Withdrawal source: Roth (if available): $20,000/year
    Goal: Keep CI below $44,000
    Result: Minimal SS taxation (0-15% of benefits taxed)

  Year 6-10 (Ages 70-75):
    SS higher (if delayed): $48,000/year
    Larger RMD forces higher CI
    Can't avoid higher SS taxation
    Plan accordingly, don't fight threshold

  Lifetime SS taxation: 15-30% of benefits (vs. 85% if uncoordinated)
```

### 2.5 Net Investment Income Tax (NIIT) 3.8% Threshold
```
FUNCTION: monitor_niit_exposure():

  // Additional 3.8% Medicare tax on investment income if MAGI too high

  NIIT THRESHOLDS (Modified Adjusted Gross Income):

  Single:     > $200,000
  Married:    > $250,000

  Net Investment Income includes:
    • Capital gains (long and short-term)
    • Dividends
    • Interest
    • Rental income
    • Passive business income

  Does NOT include:
    • Salary/W-2 income
    • Self-employment income subject to SE tax
    • Social Security
    • Certain excluded gains

  CLIENT ANALYSIS:

  Status: Married, filing jointly
  NIIT threshold: $250,000

  Scenario A: Below threshold
    Ordinary income (pension): $30,000
    Social Security (85% taxable): $27,200
    Capital gains realized: $15,000
    Total MAGI: $72,200

    Status: Below $250,000
    NIIT tax: $0
    Verdict: No Medicare surtax

  Scenario B: Uncoordinated rebalancing pushes over
    Ordinary income: $30,000
    Social Security: $27,200
    Large capital gains (needed for spending): $200,000
    Total MAGI: $257,200

    Status: Over threshold by $7,200
    Net Investment Income (capital gains): $200,000
    NIIT tax: $200,000 × 3.8% = $7,600
    PLUS: Additional marginal income tax on $200K gains

    Total tax on $200K gains:
      22% federal bracket: $44,000
      NIIT 3.8%: $7,600
      State tax (if CA): $18,600
      Total: $70,200 (35% effective rate!)

  PLANNING STRATEGY:

  Avoid concentration of capital gains in single year:

  Year 1: Realize $70,000 in gains (spread rebalancing)
    MAGI: $30,000 + $27,200 + $70,000 = $127,200
    Below threshold → No NIIT
    Tax on gains: $70,000 × 22% = $15,400

  Year 2: Realize $75,000 in gains
    MAGI: $30,000 + $27,200 + $75,000 = $132,200
    Below threshold → No NIIT
    Tax on gains: $75,000 × 22% = $16,500

  Year 3: Realize remaining $55,000
    MAGI: $30,000 + $27,200 + $55,000 = $112,200
    Below threshold → No NIIT
    Tax on gains: $55,000 × 22% = $12,100

  Total 3-year tax: $44,000
  vs. Year 1 all at once: $70,200
  Tax SAVINGS: $26,200 (37% reduction)
```

---

## 3. YEAR-BY-YEAR WITHDRAWAL PLAN

### 3.1 Projected Withdrawals by Account Type
```
DETAILED WITHDRAWAL SCHEDULE (First 10 Years)

Year | Age | Roth Draw | Taxable Draw | Trad IRA Draw | Portfolio  | Total
     |     |           | (w/gain tax) | (w/tax)       | End Value  | After-Tax
─────────────────────────────────────────────────────────────────────────
1    | 65  | $45,000   | $15,000      | $0            | $620,000   | $58,500
     |     | ($0 tax)  | ($3,000)     |               |            |
2    | 66  | $40,000   | $15,000      | $5,000        | $595,000   | $55,450
     |     | ($0)      | ($3,000)     | ($1,750)      |            |
3    | 67  | $35,000   | $18,000      | $10,000       | $565,000   | $57,250
     |     | ($0)      | ($3,600)     | ($3,500)      |            |
4    | 68  | $20,000   | $25,000      | $15,000       | $550,000   | $55,050
     |     | ($0)      | ($5,000)     | ($5,250)      |            |
5    | 69  | $0        | $30,000      | $20,000       | $540,000   | $43,200
     |     | (depleted)| ($6,000)     | ($7,000)      |            |
6    | 70  | $0        | $25,000      | $25,000       | $535,000   | $40,200
     |     |           | ($5,000)     | ($8,750)      |            |
7    | 71  | $0        | $28,000      | $22,000       | $530,000   | $36,650
     |     |           | ($5,600)     | ($7,700)      |            |
8    | 72  | $0        | $30,000      | $20,000       | $520,000   | $35,200
     |     |           | ($6,000)     | ($7,000)      |            |
9    | 73  | $0        | $25,000      | $32,000 (RMD) | $510,000   | $42,750
     |     |           | ($5,000)     | ($11,200)     |            |
10   | 74  | $0        | $28,000      | $32,000 (RMD) | $505,000   | $43,100
     |     |           | ($5,600)     | ($11,200)     |            |

10-YEAR SUMMARY:
  Total Roth withdrawn: $175,000 (tax-free)
  Total Taxable withdrawn: $239,000 (with gains tax: $42,800)
  Total Traditional withdrawn: $181,000 (with income tax: $65,450)
  Total RMD at age 73-74: $64,000 (with income tax: $22,400)

  Total gross withdrawals: $659,000
  Total taxes paid: $130,650 (19.8% effective rate)
  Total after-tax income: $528,350
```

### 3.2 Tax Liability Estimates Per Year
```
FUNCTION: project_annual_tax_liability():

  CLIENT: Married, filing jointly

ANNUAL TAX PROJECTION:

Year | Ordinary | Cap Gains | Taxable SS | Fed Tax | State | Total Tax | After-Tax
     | Income   | (LTCG)    | Income     |        | Tax   |          | Income
─────────────────────────────────────────────────────────────────────────────
1    | $45,000  | $3,000   | $1,000    | $5,920 | $2,800 | $8,720  | $40,280
2    | $45,000  | $3,500   | $2,000    | $6,200 | $2,950 | $9,150  | $40,850
3    | $45,000  | $3,500   | $3,000    | $6,400 | $3,050 | $9,450  | $40,050
4    | $45,000  | $5,000   | $4,000    | $7,100 | $3,300 | $10,400 | $39,600
5    | $45,000  | $6,000   | $5,000    | $7,500 | $3,500 | $11,000 | $39,000
6    | $50,000  | $5,000   | $5,000    | $8,000 | $3,750 | $11,750 | $40,250
7    | $50,000  | $5,500   | $6,000    | $8,300 | $3,900 | $12,200 | $39,800
8    | $50,000  | $6,000   | $6,000    | $8,500 | $4,050 | $12,550 | $39,450
9    | $55,000  | $5,000   | $7,000    | $9,200 | $4,350 | $13,550 | $41,450
10   | $55,000  | $5,500   | $7,000    | $9,500 | $4,450 | $13,950 | $41,550

10-YEAR AVERAGE:
  Average ordinary income: $48,500
  Average capital gains: $4,800
  Average taxes: $11,057/year
  Average after-tax income: $39,943/year
  Effective tax rate: 21.7%
```

### 3.3 Account Balance Trajectory
```
PROJECTED PORTFOLIO BALANCE PROGRESSION

Year | Age | Start Balance | Return | Withdrawal | End Balance | % Decline
─────────────────────────────────────────────────────────────────────────
1    | 65  | $650,000      | $29,250| $60,000   | $619,250    | —
2    | 66  | $619,250      | $27,867| $60,000   | $587,117    | -5.2%
3    | 67  | $587,117      | $26,420| $60,000   | $553,537    | -5.7%
4    | 68  | $553,537      | $24,909| $60,000   | $518,446    | -6.3%
5    | 69  | $518,446      | $23,330| $60,000   | $481,776    | -7.0%
6    | 70  | $481,776      | $21,680| $60,000   | $443,456    | -7.9%
7    | 71  | $443,456      | $19,955| $60,000   | $403,411    | -9.0%
8    | 72  | $403,411      | $18,154| $60,000   | $361,565    | -10.3%
9    | 73  | $361,565      | $16,270| $64,000   | $313,835    | -13.2%
10   | 74  | $313,835      | $14,123| $64,000   | $263,958    | -15.9%
15   | 79  | [projected]   | [loss]| $65,000   | $128,000    | [continues declining]
20   | 84  | $95,000       | [loss]| $65,000   | [depleted]  | Portfolio runs dry age 87

INTERPRETATION:
  Portfolio declines steadily as withdrawals exceed returns
  Acceleration at age 73 (RMD forces larger withdrawals)
  Critical watch point: Age 85 when portfolio drops below $100K
  Contingency plan needed: At age 85, evaluate if modifications needed
    - Reduce spending further
    - Find additional income sources
    - Prepare for Social Security-only living (if portfolio depleted)
```

---

## 4. DYNAMIC ADJUSTMENT TRIGGERS

### 4.1 Market Drawdown Response Protocol
```
FUNCTION: activate_drawdown_defense_protocol():

  // Markets decline; what should advisor/client do?

  MARKET DECLINE DETECTION:

  IF portfolio_YTD_return < -10%:
    TRIGGER: Market Drawdown Protocol

  WITHDRAWAL ADJUSTMENT ALGORITHM:

  // Normally follow scheduled withdrawal plan
  // But if portfolio down significantly, consider modifications

  SCENARIO: Market down 15% YTD

  Original plan:
    Annual withdrawal: $50,000
    Projected end-of-year balance: $550,000

  Actual situation:
    Portfolio value after drawdown: $550,000
    Normal withdrawal: $50,000
    Would bring portfolio to: $500,000

  PROTOCOL:

  Level 1: REVIEW (no action yet)
    - Confirm market decline is broad-based (not concentrated)
    - Check: Is underlying portfolio still appropriate?
    - Discuss with client: Are they comfortable?

  Level 2: DEFER (delay withdrawal if possible)
    IF client has emergency fund/cash reserves:
      DEFER $10,000 of planned $50,000 withdrawal
      Use cash reserves instead
      Leave portfolio invested, avoid "selling low"
      Resume normal withdrawal when market recovers

  Level 3: MODIFY (adjust spending)
    IF portfolio decline > 20% AND no recovery in sight:
      Reduce annual withdrawal by 10-15%
      Example: $50,000 → $42,500-45,000
      Temporary reduction until portfolio recovers

  Level 4: TACTICAL REBALANCE (buy weakness)
    IF portfolio allocation drifted due to market decline:
      Rebalance to target allocation
      Example: Stocks down → Buy stocks with cash flow
      Creates "sell high, buy low" effect

  DOCUMENTED PROTOCOL EXAMPLE:

  Market Decline | Action | Withdrawal | Rationale
  ──────────────────────────────────────────────
  -5%           | Monitor | Full amount | Normal markets volatility
  -10%          | Review | Full amount | Assess if broader issue
  -15%          | Defer if possible | -25% | Avoid selling into panic
  -20%          | Reduce | -10% | Extend portfolio longevity
  -25%+         | Reduce + Defer | -20% | Preserve for recovery

  RECOVERY PROTOCOL:

  Once portfolio recovers 50% of losses:
    Evaluate returning to normal withdrawal schedule
    If 100% recovery: Resume full withdrawals
    Document lessons learned and market observations
```

### 4.2 Spending Guardrails (Ceiling & Floor)
```
FUNCTION: establish_withdrawal_guardrails():

  // Spending band: not too high (deplete portfolio), not too low (waste money)

  GUARDRAIL CONCEPT:

  Upper Guardrail (Ceiling):
    Annual spending = 4% of portfolio (sustainable)
    With $600,000 portfolio: $24,000/year maximum

  Core Spending Level (Target):
    Annual spending = 3% of portfolio (very safe)
    With $600,000 portfolio: $18,000/year

  Lower Guardrail (Floor):
    Absolute minimum to cover basic needs
    With $600,000 portfolio: $12,000/year

  CLIENT APPLICATION:

  Year 1 (Portfolio $650,000):
    Upper guardrail: $26,000/year
    Core level: $19,500/year
    Lower guardrail: $13,000/year
    Client planned spending: $50,000/year
    STATUS: ABOVE upper guardrail

    Action: Client needs to add income sources OR reduce spending
            OR acknowledge withdrawal rate risk

  Year 5 (Portfolio $480,000):
    Upper guardrail: $19,200/year
    Core level: $14,400/year
    Lower guardrail: $9,600/year
    Planned spending: $50,000/year
    STATUS: WELL ABOVE upper guardrail (critical concern)

    Action: Mandatory spending reduction
            OR supplemental income source
            OR extend work timeline

  DYNAMIC GUARDRAIL ADJUSTMENT:

  Market up significantly:
    Can increase spending up to upper guardrail
    Not beyond, to maintain sustainability

  Market down significantly:
    May need to reduce spending to lower guardrail
    For duration of recovery

  Client health issue discovered:
    May increase medical spending (exception to guardrails)
    Adjust other categories downward

  GUARDRAIL COMMUNICATION:

  To client:
    "Your portfolio can support $19,500-26,000 annually (with your other income)
     Your planned spending of $50,000 exceeds our guardrails
     This means we need: [additional income] OR [spending reduction] OR [longer work]"

  Preferred framing: Presents spending as flexible, not fixed
                     Empowers client to make trade-off decisions
```

### 4.3 Tax Law Change Adaptation
```
FUNCTION: adapt_withdrawal_plan_to_tax_changes():

  // Tax law changes create re-planning opportunities

  COMMON TAX LAW CHANGES & RESPONSES:

  Change 1: Tax Bracket Adjustment (from inflation)
  ─────────────────────────────────────────────────
  Event: Congress indexes tax brackets annually for inflation
  Impact: Effective tax rate on same nominal income may change

  2023 bracket threshold: $90,750 (12% threshold)
  2024 bracket threshold: $94,375 (inflation adjusted)
  Change: +3.6% or +$3,625

  RESPONSE:
    Recalculate tax-bracket-filling strategy
    May allow slightly larger IRA withdrawals without moving brackets
    Example: Can now withdraw $3,625 more staying in 12% bracket

  Change 2: Social Security COLA (Cost of Living Adjustment)
  ──────────────────────────────────────────────────────────
  Event: Congress adjusts SS benefits for inflation annually

  2023 COLA: +8.7% (unusually high due to inflation)
  Impact: SS income increased, pushing into higher tax brackets

  RESPONSE:
    Recalculate IRMAA impact (Medicare surcharge triggers)
    May need to reduce IRA withdrawals to offset SS increase
    Example: If SS increased $4,000, reduce IRA draw by $2,000-3,000
             to stay below IRMAA threshold

  Change 3: RMD Age Increase (SECURE 2.0 Act)
  ────────────────────────────────────────
  Event: 2024 SECURE Act increased RMD starting age from 72 to 73

  Impact: One additional year without forced withdrawals
  Benefit: Additional year of tax-deferred growth

  RESPONSE:
    Old clients (72+): No change (already past point)
    New clients (70-72): Plan conversions in that gap year
                        Convert pre-age-73 while tax-deferred balance still available
                        Reduces eventual RMD amounts

  Change 4: Capital Gains Tax Rates Change
  ────────────────────────────────────────
  Event: Hypothetically, Congress changes LTCG rates (15% → 20%)

  IMPACT: Every dollar of capital gains costs 5% more in taxes

  RESPONSE:
    Immediately harvest realized gains in LOW-TAX years
    Example: If moving from 20% federal to 25% combined (22% + 3% NIIT)
             Harvest $50,000 gain now (save $2,500 vs. later)
    Harvest losses against same-year gains
    Shift Roth conversion timing to lock in lower rate

  RE-PLANNING TRIGGER CHECKLIST:

  IF tax_law_changes:
    ☐ Updated ordinary tax brackets available?
    ☐ Social Security COLA adjusts benefit amounts?
    ☐ RMD rules modified (age, aggregation, etc.)?
    ☐ Capital gains rates adjusted?
    ☐ Contribution limits increased?
    ☐ IRMAA thresholds indexed?
    ☐ QCD rules modified?

  IF any box checked:
    TRIGGER: Annual withdrawal plan review and update
    Timeline: Complete by October 31 (before year-end tax planning)
    Action: Recalculate brackets, IRMAA, RMD, and adjust as needed
```

### 4.4 Life Event Adjustment (Health, Spouse Death, Inheritance)
```
FUNCTION: adjust_withdrawal_plan_to_life_events():

  // Major life events require plan modifications

  EVENT 1: Spouse Health Issue or Death
  ──────────────────────────────────────

  Scenario: Spouse diagnosed with terminal illness (1-2 years)

  Current plan: Assume joint life expectancy to 95
  New reality: One spouse dying within 2 years

  ADJUSTMENTS:

  Social Security:
    Remove spouse's benefit projection
    Surviving spouse receives own benefit + survivor benefit
    Recalculate total household SS income

  Healthcare costs:
    Add end-of-life care costs (hospice, nursing, etc.)
    Example: $50,000-100,000 in final year
    Plan increased spending for this year

  Withdrawal plan:
    Year 1-2: Increase withdrawals for care costs
    Year 3+: Reduce withdrawals (one less person)
    Reassess longevity (may extend if only survivor to live to 95)

  Tax planning:
    Final tax return: May be joint or separate (depending on timing)
    Inherited assets: Step-up in basis at death (tax benefit)
    IRA inheritance: Beneficiary must take distributions per SECURE Act

  EVENT 2: Inheritance Received
  ──────────────────────────────

  Scenario: Client inherits $500,000 from parent's estate

  Current plan: Portfolio draws $50K/year
  New reality: Large influx of assets

  ADJUSTMENTS:

  Portfolio rebalancing:
    Integrate inherited assets into existing portfolio
    Rebalance to target allocation
    Step-up basis creates opportunity to harvest losses elsewhere

  Withdrawal plan:
    May reduce annual portfolio withdrawals significantly
    Example: With inherited assets, could reduce draw to $30K/year
    Extends portfolio longevity or increases spending

  Tax planning:
    Inherited IRAs: Must follow SECURE Act rules (generally 10-year distribution)
    Inherited taxable accounts: Receive step-up in basis
    Inherited real estate: May have capital gains deferral opportunities

  Timeline:
    Implement inheritance plan within 6-12 months of receipt
    Don't rush; take time to integrate properly

  EVENT 3: Required Move to Long-Term Care Facility
  ─────────────────────────────────────────────────

  Scenario: Client needs to move to assisted living ($60,000/year)

  Current plan: Home-based living ($45,000/year)
  New reality: Facility care required

  ADJUSTMENTS:

  Spending increase:
    Add $15,000/year to basic withdrawals
    May need to tap portfolio faster OR reduce other categories

  Asset protection:
    If facility care continues 3+ years: May deplete portfolio
    Medicaid planning may become relevant (asset spend-down)
    Recommend elder law attorney consultation

  State consideration:
    Some states have more favorable Medicaid rules
    May want to establish residency before asset spend-down

  Timeline:
    Reassess withdrawal plan immediately upon facility move
    May need to increase portfolio draws or reduce discretionary spending

RE-PLANNING FREQUENCY:

  After major life event: Immediately (within 1 month)
    - Death of spouse
    - Major health diagnosis
    - Large inheritance
    - Unexpected windfall or loss

  After market shock: Within 3 months
    - Market decline > 20%
    - Major policy change affecting taxes
    - Significant portfolio change

  Annual review: At minimum, before year-end tax planning
```

---

## 5. DISTRIBUTION STRATEGY COMPARISON

### 5.1 Strategy A: Simple Pro-Rata Withdrawal
```
STRATEGY A: Pro-Rata (Proportional) Withdrawals

Description:
  Withdraw from each account type in proportion to its balance
  Example: If portfolio is 40% taxable, 40% traditional, 20% Roth
           Then each withdrawal: 40% from taxable, 40% traditional, 20% Roth

CALCULATION:

Total portfolio: $650,000
  Taxable:       $260,000 (40%)
  Traditional:   $260,000 (40%)
  Roth:          $130,000 (20%)

Annual withdrawal needed: $50,000

Pro-rata withdrawal:
  From taxable:   $50,000 × 40% = $20,000 (gain tax: $4,000)
  From traditional: $50,000 × 40% = $20,000 (income tax: $7,000)
  From Roth:      $50,000 × 20% = $10,000 (no tax)

  Total tax: $11,000 (22% effective rate)
  After-tax: $39,000

ADVANTAGES:
  ✓ Simple (no analysis required)
  ✓ Maintains account balance proportions
  ✓ No concentration risk (all accounts equally depleted)

DISADVANTAGES:
  ✗ Ignores tax efficiency
  ✗ Doesn't account for RMD rules
  ✗ Doesn't harvest losses
  ✗ Not optimized for any goal
  ✗ May overdraw Roth early (waste of tax-free growth)

VERDICT: Conservative approach, but suboptimal from tax perspective
         Cost: ~15-20% higher lifetime taxes than optimized strategy
```

### 5.2 Strategy B: Tax-Bracket Filling Approach
```
STRATEGY B: Tax-Bracket Filling (Tax-Optimized)

Description:
  Maximize use of low tax brackets
  Fill each bracket before moving to next
  Prioritize tax-free and low-tax sources first

CALCULATION:

Step 1: Baseline income assessment
  Social Security (50% taxable): $16,000
  Pension income: $8,000
  Total baseline: $24,000

Step 2: Available tax room
  12% bracket threshold: $90,750 (married, standard deduction)
  Available room: $90,750 - $24,000 = $66,750

Step 3: Withdrawal priority
  Priority 1: Roth ($30,000) — No tax
  Priority 2: Tax-deferred IRA ($36,750) — 12% tax
  Priority 3: Taxable (gains) — Last

Withdrawals:
  From Roth:       $30,000 (no tax)
  From traditional: $36,750 (tax: $4,410)

  Total withdrawal: $66,750
  Total tax: $4,410 (6.6% effective rate on withdrawals)
  After-tax: $62,340

ADVANTAGES:
  ✓ Minimizes tax bracket increase
  ✓ Maximizes use of low tax rate
  ✓ Coordinates with other income sources
  ✓ Can be adjusted annually as income changes
  ✓ Coordinates with SS/IRMAA planning

DISADVANTAGES:
  ✗ Requires detailed tax planning
  ✗ Depletes Roth quickly (wastes tax-free growth)
  ✗ Forces large traditional IRA draws (increases RMD later)
  ✗ May not address capital gains tax efficiency

VERDICT: Tax-efficient but may not optimize long-term portfolio sustainability
         Advantage: 15-25% tax savings vs. pro-rata approach
         Cost: Complexity, requires annual review
```

### 5.3 Strategy C: Roth Conversion Ladder + Deferred Withdrawal
```
STRATEGY C: Roth Conversion Ladder with Deferred Withdrawals

Description:
  Convert portion of IRA to Roth in low-income years
  Builds Roth balance for later tax-free withdrawals
  Defers/reduces traditional IRA withdrawals
  Minimizes lifetime tax burden

EXECUTION:

Pre-retirement (Ages 62-64, high income):
  No conversion (income too high, tax cost too high)

Early retirement (Age 65-70, low income):
  Year 1: Convert $40,000 IRA → Roth (tax cost: $4,800)
  Year 2: Convert $40,000 IRA → Roth (tax cost: $4,800)
  Year 3: Convert $40,000 IRA → Roth (tax cost: $4,800)
  Year 4: Convert $40,000 IRA → Roth (tax cost: $4,800)
  Year 5: Convert $40,000 IRA → Roth (tax cost: $4,800)

  Total conversions: $200,000
  Total conversion tax paid: $24,000
  Roth balance built: $200,000

Withdrawal phase (Age 70+):
  Annual need: $50,000
  From Roth:      $50,000 (no tax, funded by conversions)
  From traditional: $0 (or RMD only when age 73+)
  From taxable:    $0

  Effective tax rate: 0% (all from Roth)

COMPARISON TO NON-CONVERSION:

Without conversion:
  Age 73 traditional IRA: $600,000
  RMD at 73 (table 26.5): $22,642/year
  Annual RMD tax (35%): $7,925/year

With conversion ladder:
  Age 73 traditional IRA: $400,000 (reduced by $200K conversion)
  RMD at 73 (table 26.5): $15,094/year
  Annual RMD tax (35%): $5,283/year
  Roth balance: $200,000 (tax-free withdrawals)

Lifetime savings (ages 73-95):
  RMD tax reduction: ($7,925 - $5,283) × 22 years = $58,124
  Less conversion tax paid upfront: ($24,000)
  Net lifetime savings: $34,124

ADVANTAGES:
  ✓ Massive lifetime tax savings (30-40% over lifetime)
  ✓ Eliminates future RMD tax burden
  ✓ Builds tax-free income stream
  ✓ Protects against future tax increases
  ✓ Improves IRMAA outcomes (lower ordinary income at advanced ages)

DISADVANTAGES:
  ✗ Requires upfront tax payment (may strain budget)
  ✗ Complex to explain and implement
  ✗ Needs to be done in specific window (ages 65-70)
  ✗ Misses window if client continues working

VERDICT: Most tax-efficient strategy for client with low income window
         Requires discipline to execute in early retirement years
         Delivers 30-40% lifetime tax savings
         Best for clients with: 20+ year horizon, low early retirement income
```

### 5.4 NPV Comparison of Strategies (30-Year Horizon)
```
PRESENT VALUE COMPARISON (Assuming 2% discount rate)

Strategy A: Pro-Rata (baseline)
─────────────────────────────
Year 1-10: Tax cost $11,000/year
Year 11-20: Tax cost $13,500/year (higher income from RMD)
Year 21-30: Tax cost $18,000/year (large RMD, potential NIIT)

Total 30-year taxes: $380,000
Present value (discounted): $345,000
After-tax cumulative income: $1,125,000

Strategy B: Tax-Bracket Filling
──────────────────────────────
Year 1-10: Tax cost $4,410/year (optimized brackets)
Year 11-20: Tax cost $8,500/year (more traditional draws)
Year 21-30: Tax cost $16,000/year (RMD escalation)

Total 30-year taxes: $310,000
Present value (discounted): $278,000
After-tax cumulative income: $1,195,000

Advantage over Strategy A: $1,195K - $1,125K = $70,000 (6% improvement)

Strategy C: Roth Conversion Ladder
─────────────────────────────────
Year 1-5: Tax cost $24,000/year (conversion taxes, but intentional)
Year 6-10: Tax cost $0/year (all withdrawals from Roth)
Year 11-20: Tax cost $5,283/year (reduced RMD only)
Year 21-30: Tax cost $5,283/year (same RMD, no escalation)

Total 30-year taxes: $161,000
Present value (discounted): $144,000
After-tax cumulative income: $1,360,000

Advantage over Strategy A: $1,360K - $1,125K = $235,000 (21% improvement!)
Advantage over Strategy B: $1,360K - $1,195K = $165,000 (14% improvement)

STRATEGY RANKING (by Net Present Value):

1. Strategy C (Roth Conversion Ladder)
   NPV: $1,360,000 after-tax income
   Total taxes paid: $144,000 (PV)
   WINNER: Highest after-tax income, lowest lifetime tax burden

2. Strategy B (Tax-Bracket Filling)
   NPV: $1,195,000 after-tax income
   Total taxes paid: $278,000 (PV)
   STRONG: Simple improvement over pro-rata

3. Strategy A (Pro-Rata)
   NPV: $1,125,000 after-tax income
   Total taxes paid: $345,000 (PV)
   BASELINE: Easy but expensive

RECOMMENDATION FRAMEWORK:

IF client has low early retirement income (age 65-70):
  → Recommend Strategy C (Roth ladder)
  → Upfront cost: $24K/year conversions
  → Lifetime benefit: $235K+ savings

ELSE IF client prefers simplicity with some optimization:
  → Recommend Strategy B (bracket filling)
  → Easy annual adjustment based on income
  → Lifetime benefit: $70K+ savings

ELSE:
  → Acceptable to use Strategy A if client refuses complexity
  → Document tradeoff: "Costs $70-235K in lifetime taxes"
```

---

## 6. KB RETRIEVAL TRIGGERS

**Before analysis, retrieve:**

1. **Tax Brackets & Rates (Current Year)** — Ordinary, capital gains, IRMAA thresholds
   - Path: /kb/regulatory/tax-rates/federal-tax-tables-2024.json

2. **Withdrawal Rules & Constraints** — RMD rules, QCD, SECURE Act
   - Path: /kb/regulatory/tax-rules/withdrawal-rules-2024.md

3. **Social Security Taxation Rules** — Combined income calculation, thresholds
   - Path: /kb/regulatory/social-security/ss-taxation-rules.md

4. **Client Portfolio & Income Data** — Account balances, cost basis, income sources
   - Path: /clients/[CLIENT_ID]/withdrawal-analysis-data.json

5. **Tax Planning Methodologies** — Withdrawal optimization frameworks
   - Path: /kb/planning-methodologies/withdrawal-sequencing-framework.md

---

## 7. OUTPUT REQUIREMENTS

### 7.1 Withdrawal Plan (Year-by-Year Table)
```json
{
  "analysis_date": "ISO-8601",
  "client_id": "string",
  "plan_years": 30,
  "annual_withdrawals": [
    {
      "year": 1,
      "age": 65,
      "roth_withdrawal": 45000,
      "taxable_withdrawal": 15000,
      "traditional_withdrawal": 0,
      "total_withdrawal": 60000,
      "roth_tax": 0,
      "taxable_tax": 3000,
      "traditional_tax": 0,
      "total_tax": 3000,
      "after_tax_income": 57000,
      "portfolio_balance_end": 590000
    }
  ]
}
```

### 7.2 Tax Projection (Annual & Cumulative)
```
See section 3.2 above for detailed format
```

### 7.3 Strategy Comparison (3-4 Alternative Approaches)
```
WITHDRAWAL STRATEGY COMPARISON SUMMARY
══════════════════════════════════════

Strategy            | 10-Yr Tax | 30-Yr Tax | NPV Advantage | Recommendation
────────────────────────────────────────────────────────────────────
Strategy A (Pro-Rata)  | $130K    | $345K     | Baseline      | If want simplicity
Strategy B (Bracket Fill)| $82K   | $278K     | +$70K (6%)    | Good balance
Strategy C (Roth Ladder)| $120K*  | $144K     | +$235K (21%)  | Best if eligible

*Includes upfront conversion taxes ($24K/year years 1-5)
```

---

## 8. VALIDATION GATES

Before finalizing withdrawal plan:

```
GATE 1: Data Completeness
  ☐ Current account balances (all types)
  ☐ Cost basis (taxable accounts)
  ☐ Life expectancy stated and documented
  ☐ Other income sources identified (SS, pension, rental)
  ☐ Client spending expectations documented
  IF not all: Request missing data

GATE 2: Tax Coordination
  ☐ Social Security claiming age addressed
  ☐ RMD implications understood by client
  ☐ IRMAA thresholds considered (if age 65+)
  ☐ Medicare tax (NIIT) evaluated (if high NII)
  ☐ State tax implications addressed
  IF not addressed: Add to planning memo

GATE 3: Strategy Selection
  ☐ Recommended strategy explained and documented
  ☐ Client acknowledges trade-offs (complexity vs. savings)
  ☐ Alternative strategies presented for comparison
  ☐ Recommendation tied to client's specific situation
  IF not addressed: Explain rationale

GATE 4: Reality Check
  ☐ Projected after-tax income is realistic (covers spending)
  ☐ Account depletion timeline is acceptable
  ☐ Tax payments are affordable (don't require additional borrowing)
  ☐ RMD coordination won't create surprises
  IF any concern: Revise plan
```

---

## 9. NOTES FOR IMPLEMENTATION

- Withdrawal sequencing decisions are permanent until reviewed; plan carefully
- Tax bracket filling requires annual coordination; recalculate each year
- RMD coordination is mandatory at age 73; no flexibility here
- Roth conversion windows close if working income resumes; use early retirement years
- Life events (inheritance, health change, spending change) trigger re-planning
- This prompt produces year-by-year, account-by-account withdrawal guidance
