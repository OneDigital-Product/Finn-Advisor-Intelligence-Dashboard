# 21-direct-indexing-analysis.md
## Function: Route-level - Direct Indexing Analysis

### PURPOSE
Analyze tax-loss harvesting opportunities, quantify direct indexing benefits, recommend harvesting strategies, and provide comprehensive suitability documentation. Every recommendation is backed by lot-level analysis and regulatory compliance checks.

---

## CORE ARCHITECTURE

### 1. TAX-LOSS HARVESTING OPPORTUNITY DETECTION

### 1.1 Lot-Level Analysis
**Input Data Required:**
- Security position (ticker/CUSIP)
- Quantity and acquisition price (per lot)
- Current market price
- Acquisition date
- Account type (taxable/tax-deferred)

**Calculation Logic:**
```
FOR each lot IN security_position:

  cost_basis = acquisition_price × quantity
  current_value = current_price × quantity
  unrealized_gain_loss = current_value - cost_basis

  IF unrealized_gain_loss < 0:
    loss_magnitude = ABS(unrealized_gain_loss)
    holding_period = CALCULATE_DAYS(acquisition_date, today)

    IF holding_period >= 366:
      capital_loss_type = "LONG_TERM"
      tax_benefit_rate = client_ltcg_rate (0%, 15%, 20%)
    ELSE:
      capital_loss_type = "SHORT_TERM"
      tax_benefit_rate = client_ordinary_income_rate (22%, 24%, 32%, 35%, 37%)

    harvesting_candidate = {
      "ticker": ticker,
      "lot_id": lot_id,
      "loss_magnitude": loss_magnitude,
      "capital_loss_type": capital_loss_type,
      "tax_benefit_rate": tax_benefit_rate,
      "annual_tax_savings": loss_magnitude × tax_benefit_rate,
      "holding_period_days": holding_period,
      "harvestable": TRUE
    }

  ELSE:
    // Gain lot - not candidate for harvesting, but track for offset
    gain_candidate = {
      "ticker": ticker,
      "lot_id": lot_id,
      "unrealized_gain": unrealized_gain_loss,
      "harvesting_candidate": FALSE
    }

HARVEST_QUEUE = SORT(harvesting_candidates, BY="tax_benefit_rate DESC, loss_magnitude DESC")
```

**Output Example:**
```
HARVESTABLE LOSSES:
┌──────────┬──────────┬─────────────┬────────────┬─────────────────┐
│ Security │ Quantity │ Loss Amount │ Tax Rate   │ Annual Tax Saved│
├──────────┼──────────┼─────────────┼────────────┼─────────────────┤
│ XYZ Corp │ 100      │ $(12,500)   │ 35% (ST)   │ $4,375          │
│ ABC Fund │ 250      │ $(5,000)    │ 15% (LT)   │ $750            │
│ MNO Inc  │ 50       │ $(2,250)    │ 24% (ST)   │ $540            │
└──────────┴──────────┴─────────────┴────────────┴─────────────────┘

TOTAL HARVESTABLE: $(19,750)
TOTAL POTENTIAL TAX BENEFIT: $5,665
```

### 1.2 Wash Sale Rule Compliance (IRC §1091)
**Definition:** Cannot repurchase "substantially identical" security within 30 days before/after sale (61-day window total)

**Compliance Logic:**
```
FUNCTION: check_wash_sale_risk(security_to_sell, client_holdings):

  // 30 days BEFORE sale
  restricted_before = today - 30_days

  // 30 days AFTER sale (projected)
  restricted_after = today + 30_days

  FOR each holding IN client_holdings:

    IF holding.ticker == security_to_sell.ticker:
      // Same security - definitely wash sale risk
      wash_sale_risk = "SAME_SECURITY"

    ELSE IF SUBSTANTIALLY_IDENTICAL(holding, security_to_sell):
      // Example: same index fund (e.g., Vanguard S&P 500 vs. iShares S&P 500)
      // Example: stock of same company (different share class)
      wash_sale_risk = "SUBSTANTIALLY_IDENTICAL"

    ELSE IF SIMILAR_BUT_NOT_IDENTICAL(holding, security_to_sell):
      // Example: similar sector ETF, related company
      wash_sale_risk = "LIKELY_SAFE"

    ELSE:
      wash_sale_risk = "SAFE"

    IF wash_sale_risk IN ["SAME_SECURITY", "SUBSTANTIALLY_IDENTICAL"]:
      holding_period_restriction = restricted_before TO restricted_after
      recommendation = "CANNOT REPURCHASE [holding] DURING WINDOW"

    ELSE IF wash_sale_risk == "LIKELY_SAFE":
      recommendation = "Monitor for IRS challenge; document distinction"

    ELSE:
      recommendation = "Safe to repurchase immediately"

  RETURN {
    "wash_sale_restrictions": restriction_list,
    "safe_replacement_securities": safe_list,
    "restricted_dates": (restricted_before, restricted_after)
  }
```

**Wash Sale Prevention Strategies:**
```
STRATEGY 1: Different Index/Strategy
  Sell: Vanguard S&P 500 (VOO) - losing position
  Replace: SPDR S&P 500 (SPY) - same market exposure, different fund
  Risk: IRS may challenge if deemed substantially identical
  Mitigation: Choose replacement with different methodology/provider

STRATEGY 2: Complementary Security
  Sell: SPY (S&P 500) with loss
  Replace: [Continue holding] or [Buy] similar exposure through different lens:
          - Russell 1000 ETF (IWB) - overlapping but not identical
          - Total US Market ETF (VTI) - broader exposure including mid/small cap
  Risk: Lower than direct replacement
  Mitigation: Document portfolio rationale for different exposure

STRATEGY 3: Delay Repurchase
  Sell: Losing position immediately
  Replace: Wait 31 days to repurchase same security (or never repurchase)
  Risk: Market gap risk (security could outperform during wait)
  Mitigation: Use different temporary holding if concerned about gap exposure

STRATEGY 4: Harvest Both Sides (if gains exist)
  IF portfolio has both gains AND losses:
    Sell losses (harvest tax benefit)
    Immediately buy different security with similar characteristics
    Later: Sell gained positions to offset harvested losses
  Benefit: Maintains target allocation while harvesting losses
```

### 1.3 Substantially Identical Security Detection
**Test: Would the IRS consider these two securities to produce the same economic result?**

```
FUNCTION: substantially_identical_test(security_1, security_2):

  // Test 1: Same underlying instrument
  IF security_1.cusip == security_2.cusip:
    RETURN substantially_identical = TRUE (same company/same security class)

  // Test 2: Same index or fund objective
  IF security_1.index == security_2.index:
    IF security_1.expense_ratio similar_to security_2.expense_ratio:
      RETURN substantially_identical = TRUE
      // Example: VOO and SPY both track S&P 500

  // Test 3: Positively correlated substitutes
  correlation = CALCULATE_CORRELATION(security_1_returns, security_2_returns)
  IF correlation > 0.99:
    RETURN substantially_identical = TRUE
  ELSE IF correlation > 0.95:
    RETURN substantially_identical = "LIKELY" (risky, document rationale)
  ELSE IF correlation > 0.85:
    RETURN substantially_identical = FALSE (safe but different exposure)
  ELSE:
    RETURN substantially_identical = FALSE (distinct securities)

  // Test 4: IRS guidance on related securities
  IF (security_1 IN restricted_list) OR (security_2 IN restricted_list):
    RETURN substantially_identical = TRUE (per IRS guidance)

  // Documented case law
  cases = [
    "Short sale of stock + holding same stock = wash sale",
    "Selling stock + buying call option on same stock = wash sale",
    "Selling stock + buying convertible bond on same stock = likely wash sale",
    "Selling mutual fund + buying ETF with same index = risky (likely wash)"
  ]

```

**IRS Guidance Examples:**
```
WASH SALE - CONFIRMED:
  ✗ Vanguard S&P 500 (VOO) sold at loss → Buy iShares S&P 500 (IVV)
    Reason: Both track identical S&P 500 index, would produce same results

  ✗ Apple stock sold at loss → Buy Apple stock (different share class or later)
    Reason: Same company, same economic rights

  ✗ Corporate bond sold at loss → Buy convertible bond (same company)
    Reason: Substantial economic identity despite different form

SAFE - LIKELY PERMISSIBLE:
  ✓ S&P 500 index fund sold at loss → Buy Total US Market Fund
    Reason: Broader exposure (includes mid/small cap not in S&P 500)
    But: Might be challenged if S&P 500 significant portion of Total US
    Mitigation: Document as deliberate exposure shift

  ✓ Apple stock sold at loss → Buy tech sector ETF (without Apple being largest)
    Reason: Different exposure
    But: Might be challenged if replicating Apple's performance
    Mitigation: Hold at least 31 days before buying Apple again

  ✓ US Bond fund sold at loss → Buy International Bond fund
    Reason: Clearly different geographic exposure
    Risk level: Low
```

### 1.4 Short-Term vs. Long-Term Capital Gains/Losses Classification
```
FUNCTION: classify_capital_gain_loss(acquisition_date, sale_date):

  holding_period_days = (sale_date - acquisition_date).days

  IF holding_period_days <= 365:
    classification = "SHORT_TERM"
    tax_rate_applicable = ordinary_income_tax_rate (22%, 24%, 32%, 35%, 37%)
    // Short-term losses offset short-term gains first, then long-term gains

  ELSE:  // > 365 days
    classification = "LONG_TERM"
    tax_rate_applicable = long_term_capital_gains_rate (0%, 15%, 20%)
    // Long-term losses offset long-term gains first, then short-term gains

  RETURN {
    "classification": classification,
    "holding_period_days": holding_period_days,
    "tax_rate": tax_rate_applicable,
    "offset_priority": offset_priority
  }

// IRS Ordering Rules for Loss Offset (in order applied):
// 1. Short-term losses offset short-term gains
// 2. Long-term losses offset long-term gains
// 3. Excess short-term losses offset long-term gains
// 4. Excess long-term losses offset short-term gains
// 5. Remaining losses (up to $3,000/year) offset ordinary income
// 6. Excess losses carry forward to future years (indefinitely)
```

**Portfolio Loss Offset Calculation:**
```
CLIENT CAPITAL GAIN/LOSS SITUATION:

Short-term gains:          $25,000
Short-term losses:       ($12,000)  → Net short-term gain: $13,000

Long-term gains:          $45,000
Long-term losses:        ($8,000)   → Net long-term gain: $37,000

BEFORE Harvesting: Total capital gains = $50,000 at applicable rates

NEW HARVEST:
  Sell position with $(19,750) loss
  Holding period: 95 days (SHORT-TERM loss)

AFTER Harvesting:
  Short-term: $13,000 (gain) - $19,750 (loss) = $(6,750) (loss)
  Long-term: $37,000 (gain)
  Ordinary income offset: $3,000 (loss)
  Loss carryforward: $(3,750)

TAX SAVINGS CALCULATION:
  Before: $50,000 × blended_rate (likely 20-30%) = $10,000-$15,000
  After: $37,000 × 20% (LTCG) - $3,000 × 35% (ordinary) = $7,400 - $1,050 = $6,350
  Tax Savings: ~$5,000 this year + $3,750 loss carryforward
```

---

## 2. DIRECT INDEXING BENEFIT QUANTIFICATION

### 2.1 Tax Alpha Calculation
**Definition: Annual tax savings from harvesting vs. traditional investment approach**

```
FUNCTION: calculate_tax_alpha(client, direct_index_strategy):

  ==========================================
  SCENARIO A: Traditional Index Fund (VOO)
  ==========================================
  Annual return (pre-tax):        4.5%
  Annual dividend yield:          1.8%
  Annual capital gains (fund):    1.2% (internal index rebalancing)

  Client's federal tax rate:      35% (short-term), 20% (long-term)
  Client's state tax rate:        5% (CA)
  Combined marginal rate:         40% (short-term), 25% (long-term)

  Tax drag from fund:
    Dividend tax:  1.8% × 40% = 0.72%
    Cap gains tax: 1.2% × 25% = 0.30%
    Total tax drag: 1.02%

  After-tax return (VOO):         4.5% - 1.02% = 3.48%


  ==========================================
  SCENARIO B: Direct Indexing Strategy
  ==========================================
  Annual return (same index):     4.5%
  Annual dividend yield:          1.8%
  Annual internal rebalancing:    0% (individual stocks, not fund)

  Annual tax-loss harvesting:     $(8,500) harvested losses
  Harvesting benefit:             $8,500 × 35% = $2,975 tax savings

  Tax cost (realized gains):
    Clients who trimmed gains:    $12,000 gain × 20% = $2,400 tax

  Net tax benefit:                $2,975 - $2,400 = $575
  Plus: No fund-level cap gains:  +0.30% (avoided)
  Total annual benefit:           ~$575 + 0.30% = ~1.1% (before fees)

  After-tax return (Direct):
    Baseline: 4.5%
    Less: Dividend tax: 0.72%
    Plus: Tax harvesting: 1.1%
    Result: 4.5% - 0.72% + 1.1% = 4.88%

  TAX ALPHA = 4.88% - 3.48% = 1.40% annual benefit

  ==========================================

  // SENSITIVITY ANALYSIS

  IF Harvesting Scenario = CONSERVATIVE (only harvest crystallized losses):
    Tax Alpha: 0.5% - 0.8% annually

  ELSE IF Harvesting Scenario = MODERATE (annual harvesting):
    Tax Alpha: 0.8% - 1.2% annually

  ELSE IF Harvesting Scenario = AGGRESSIVE (quarterly harvesting):
    Tax Alpha: 1.2% - 1.8% annually (but higher transaction costs)

  RETURN {
    "annual_tax_alpha_percent": 1.4,
    "annual_tax_alpha_dollars": 8750,  // $625K portfolio × 1.4%
    "sensitivity_range": [0.5, 1.8],
    "key_driver": "annual_loss_harvesting_magnitude"
  }
```

**Variables Affecting Tax Alpha:**
```
INCREASES Tax Alpha:
  + Higher portfolio value → larger dollar benefits
  + Higher tax bracket → higher tax savings rate
  + More active trading/rebalancing → more harvesting opportunities
  + Concentrated positions → larger losses available
  + Market volatility → more losses available to harvest
  + Longer holding period → more long-term losses (lower tax rate)

DECREASES Tax Alpha:
  - Lower portfolio value → smaller dollar benefits
  - Lower tax bracket (long-term gains at 0%) → minimal benefit
  - Buy-and-hold strategy → fewer rebalancing opportunities
  - Well-diversified positions → smaller losses per position
  - Low market volatility → fewer loss opportunities
  - Short-term holding → harvest at higher tax rate
```

### 2.2 Tracking Error vs. Benchmark Analysis
**Definition: How much does the direct index portfolio deviate from the target benchmark?**

```
FUNCTION: calculate_tracking_error(direct_index_portfolio, benchmark_index):

  // Standard deviation of return differences

  FOR each measurement_period IN [daily, monthly, quarterly, annual]:

    period_returns_direct = CALCULATE_RETURNS(direct_index_portfolio)
    period_returns_benchmark = CALCULATE_RETURNS(benchmark_index)

    return_difference = period_returns_direct - period_returns_benchmark

  tracking_error = STDEV(return_difference)

  // Information ratio
  information_ratio = excess_return / tracking_error

  RETURN {
    "tracking_error_percent": 0.35,
    "information_ratio": 1.8,
    "assessment": classification
  }

CLASSIFICATION:
  tracking_error < 0.25%:    "TIGHT TRACKING" (high correlation)
  0.25% - 0.50%:             "CLOSE TRACKING" (small deviations)
  0.50% - 1.00%:             "MODERATE TRACKING" (noticeable variance)
  > 1.00%:                   "LOOSE TRACKING" (significant divergence)
```

**Tracking Error Sources:**
```
CAUSES OF DEVIATION FROM BENCHMARK:
  1. Weight deviations: Individual stock holds weighted slightly differently
     than index (intentional to maximize/minimize certain positions)

  2. Harvest-driven portfolio drift: Temporary absence of a position
     while in wash sale window creates tracking error

  3. Dividend timing: Client may receive dividends on different schedule
     than fund aggregation

  4. Cash drag: Pending dividend or new investment creates cash position
     (typically 0-1% effect)

  5. Sector constraints: If client specifies "no energy sector," tracking
     error vs. broad index increases (but intentional)

TRACKING ERROR ACCEPTABLE IF:
  ✓ < 0.50% quarterly deviation (typical for well-managed direct index)
  ✓ Information ratio > 1.0 (excess return > tracking error)
  ✓ Excess return (tax alpha) > tracking error cost
  ✓ Client understands and accepts the trade-off
```

### 2.3 Fee Comparison: Direct Indexing vs. ETF/Mutual Fund
```
DIRECT INDEXING COST STRUCTURE:

Annual costs:
  Advisory fee (DI management):         0.10% - 0.30% AUM
  Custody/trading costs:               ~$50-150 per rebalance
  Tax reporting (1099 complexity):     Included in advisory fee

Annual example (500K portfolio):
  Advisory: $500,000 × 0.20% =        $1,000
  Trading: 4 rebalances × $100 =      $400
  Total annual cost:                   $1,400 (0.28%)

ETF/MUTUAL FUND APPROACH:

Annual costs:
  Fund expense ratio (low-cost):       0.03% - 0.10%
  Advisory fee (if using advisor):     0.50% - 1.00%
  Tax reporting:                       1040 + Schedule D

Annual example (500K portfolio):
  Expense ratio: $500,000 × 0.05% =   $250
  Advisory: $500,000 × 0.75% =        $3,750
  Total annual cost:                   $4,000 (0.80%)

COST COMPARISON:
  Direct Indexing Cost:         $1,400
  ETF Cost:                     $4,000
  Annual Savings:               $2,600 (0.52% AUM)

BUT: Tax Alpha Offset
  If tax alpha = 1.40%:         $7,000 annual benefit
  Net benefit after DI costs:   $7,000 - $1,400 = $5,600 (1.12%)
```

### 2.4 Break-Even Analysis
**At what portfolio size does direct indexing become cost-beneficial?**

```
FUNCTION: calculate_breakeven_aum():

  // Find the AUM where:
  //   Tax Alpha + Cost Savings = DI Advisory Cost + Additional Costs

  VARIABLES:
    advisory_fee_traditional = 0.75%
    advisory_fee_di = 0.20%
    di_trading_costs = $400/year (fixed + variable)
    tax_alpha_percent = 1.2%
    mutual_fund_expense_ratio = 0.05%

  FOR portfolio_size IN range(50K, 5M, 50K):

    cost_traditional = portfolio_size × (advisory_fee_traditional + mutual_fund_expense_ratio)
    cost_di = portfolio_size × advisory_fee_di + di_trading_costs

    tax_alpha_dollars = portfolio_size × tax_alpha_percent

    total_benefit_di = (cost_traditional - cost_di) + tax_alpha_dollars

    IF total_benefit_di > 0:
      breakeven_aum = portfolio_size
      BREAK

  RETURN breakeven_aum

BREAKEVEN ANALYSIS EXAMPLE:

Portfolio Size | Annual Cost (ETF) | Annual Cost (DI) | Tax Alpha | Net Benefit
$100K          | $800             | $620            | $1,200    | $780
$250K          | $2,000           | $650            | $3,000    | $2,350
$500K          | $4,000           | $1,400          | $6,000    | $4,600
$1,000K        | $8,000           | $2,400          | $12,000   | $9,600

BREAKEVEN POINT: ~$150K minimum (where DI benefits exceed costs)
OPTIMAL RANGE: $500K - $5M (tax alpha > 1%, cost advantage clear)
SWEET SPOT: $1M+ (maximum cost advantage, maximum tax alpha)
```

---

## 3. HARVESTING STRATEGY RECOMMENDATIONS

### 3.1 Immediate Harvest Opportunities
```
FUNCTION: identify_immediate_harvest_opportunities():

  CRITERIA:
    1. Unrealized loss: YES
    2. Wash sale risk: LOW or MANAGED
    3. Tax benefit: > $100 (material impact)
    4. Holding period: Any (prioritize short-term losses for immediate benefit)

  ALGORITHM:
    FOR each_position WITH unrealized_loss:

      wash_sale_risk = CHECK_WASH_SALE(position)

      IF wash_sale_risk == "SAFE":
        immediate_harvest.append(position)

      ELSE IF wash_sale_risk == "LIKELY_SAFE":
        // Can harvest but need to modify portfolio
        replacement_security = FIND_ALTERNATIVE(position)
        immediate_harvest.append({
          "position": position,
          "replacement": replacement_security,
          "caveat": "Wash sale risk manageable with replacement"
        })

      ELSE:
        // HIGH RISK - defer or use different strategy
        deferred_harvest.append(position)

  RETURN {
    "immediate_opportunities": immediate_harvest,
    "deferred_opportunities": deferred_harvest,
    "total_harvestable": SUM(amounts),
    "total_tax_benefit": SUM(tax_benefits)
  }

IMMEDIATE HARVEST OUTPUT:

READY TO HARVEST (No Wash Sale Risk):
  Security          | Loss Amount | Tax Rate | Tax Savings | Action
  ─────────────────────────────────────────────────────────────────
  XYZ Corp Stock    | $(12,500)   | 35%      | $4,375      | HARVEST NOW
  ABC Fixed Income  | $(5,000)    | 35%      | $1,750      | HARVEST NOW
  MNO Emerging      | $(2,250)    | 15%      | $338        | HARVEST NOW

  Total harvestable: $(19,750)
  Total tax savings: $6,463

HARVESTABLE WITH REPLACEMENT (Need Alternative):
  Security          | Loss Amount | Current   | Recommended  | Risk Level
  ─────────────────────────────────────────────────────────────────────
  XYZ Index         | $(8,000)    | SPY       | IVV          | MEDIUM

  Action: Sell SPY, immediately buy IVV (similar but not identical)
```

### 3.2 Year-End Tax Planning Integration
```
FUNCTION: plan_year_end_harvesting():

  current_year_capital_gains = CALCULATE_REALIZED_GAINS_YTD()
  current_year_capital_losses = CALCULATE_REALIZED_LOSSES_YTD()

  projected_year_end_position = current_year_capital_gains + current_year_capital_losses

  IF projected_year_end_position > 0:
    // NET GAIN situation - harvest losses to offset
    target_loss_harvest = projected_year_end_position + $3,000_buffer
    available_losses = IDENTIFY_HARVESTABLE_LOSSES()

    IF available_losses >= target_loss_harvest:
      recommend_harvest = target_loss_harvest
      urgency = "HIGH" (by Dec 31)

    ELSE:
      recommend_harvest = available_losses
      residual_tax_liability = projected_year_end_position - available_losses

  ELSE IF projected_year_end_position < 0:
    // NET LOSS situation - preserve losses for carryforward
    loss_carryforward = ABS(projected_year_end_position)

    IF loss_carryforward > $3,000:
      carryforward_years = CEILING(loss_carryforward / $3,000)
      recommend = "No harvesting needed; losses carry forward"

    ELSE:
      recommend = "Use remaining loss this year, then harvest"

  RETURN {
    "year_end_projection": projected_year_end_position,
    "recommended_harvest_amount": recommend_harvest,
    "urgency": urgency,
    "deadline": "December 31 (sell-date requirement)"
  }

YEAR-END SCENARIO EXAMPLES:

Scenario A: High Gains YTD
  Realized gains YTD:     $45,000
  Realized losses YTD:    $(8,000)
  Net position:           +$37,000

  Recommendation: Harvest $37,000 + $3,000 = $40,000 in losses
  Target loss harvest: $(40,000)
  Available losses: $(60,000)
  Action: Harvest $40,000 of losses by Dec 31
  Result: Offset all 2024 gains plus $3,000 ordinary income offset

Scenario B: Small Gains, Losses in Carryforward
  Realized gains YTD:     $12,000
  Realized losses YTD:    $0
  Loss carryforward:      $(15,000) from 2023

  Recommendation: Let carryforward work; no additional harvesting needed
  Offset impact: $12,000 gains covered by carryforward, $3,000 reduces
                 ordinary income in 2024
  Action: Wait; monitor for end-of-year realized gains
```

### 3.3 Multi-Year Harvesting Schedule
```
FUNCTION: plan_multi_year_harvesting_strategy():

  // Some losses are large but harvesting all at once creates tracking
  // error or wash sale complexity. Spread over time.

  large_loss_positions = IDENTIFY(position.loss > $15,000)

  FOR each large_loss IN large_loss_positions:

    // Year 1: Harvest 40% of loss
    year_1_harvest = large_loss × 0.40

    // Wait minimum 31 days

    // Year 2: Harvest 35% of loss (net of any new gains)
    year_2_harvest = large_loss × 0.35

    // Year 3+: Harvest remainder or hold for strategic timing
    year_3_harvest = large_loss × 0.25

  RETURN phased_harvest_schedule

MULTI-YEAR EXAMPLE:

Concentrated Position: Apple Stock
  Current value:        $250,000
  Cost basis:          $180,000
  Unrealized loss:     $(70,000)

  Tax impact at once:   $70,000 × 20% (LTCG rate) = $14,000 tax relief
  But: Creates tracking error vs. S&P 500, might need offset gain harvest

  STRATEGY: Harvest over 3 years, reinvest in broader index

  Year 1 (now):
    Harvest: $(28,000)
    Tax benefit: $5,600
    Replace: Buy S&P 500 ETF with $28,000 proceeds
    Portfolio impact: Diversifies concentrated position

  Year 2:
    Monitor market; harvest additional $(21,000) if still underwater
    Reinvest in different sector rotation

  Year 3:
    Harvest remainder $(21,000)
    Full position gradually moves to diversified index

  Total benefit: $14,000 tax relief + diversification benefit
```

### 3.4 Capital Gain/Loss Carryforward Tracking
```
FUNCTION: track_capital_loss_carryforward():

  // Client realizes losses that exceed offset capacity;
  // excess carries forward indefinitely

  FOR each tax_year IN [2022, 2023, 2024, ...]:

    year_gains = realized_gains[year]
    year_losses = realized_losses[year]
    carryforward_from_prior = carryforward[year - 1]

    total_losses = year_losses + carryforward_from_prior

    // Offset rules: losses first offset gains, then up to $3,000 ordinary income

    gains_offset = MIN(total_losses, year_gains)
    remaining_losses = total_losses - gains_offset

    ordinary_income_offset = MIN(remaining_losses, $3,000)
    remaining_losses -= ordinary_income_offset

    carryforward[year] = remaining_losses

    tax_benefit_year = (gains_offset × ltcg_rate) + (ordinary_income_offset × ordinary_rate)

CARRYFORWARD TRACKING TABLE:

Year  | Realized Gains | Realized Losses | Carryforward In | Carryforward Out | Tax Benefit
──────────────────────────────────────────────────────────────────────────────────────────
2023  | $25,000        | $(35,000)       | $0              | $(10,000)        | $5,000
2024  | $12,000        | $(8,000)        | $(10,000)       | $(6,000)         | $5,600
2025  | $45,000        | $(5,000)        | $(6,000)        | $0               | $10,300
      |                |                 | (full use)      |                  |

Total 3-year tax benefit: $20,900
```

---

## 4. PORTFOLIO CONSTRUCTION CONSIDERATIONS

### 4.1 Factor Exposure Maintenance
```
OBJECTIVE: Replicate index performance while harvesting losses

FACTORS TO PRESERVE:
  - Beta (market risk):        Target match index beta = 1.0
  - Sector exposure:           Match index sector weights ±2%
  - Market cap:                Maintain large-cap focus if index is large-cap
  - Value/Growth tilt:         Match if index is neutral/blended
  - Quality metrics:           Match dividend payers, profitability
  - Momentum:                  Match or intentionally tilt

FACTOR CHECK PROCESS:

FOR each_sector IN [Technology, Healthcare, Financials, ...]:

  index_sector_weight = sector_weight[index]
  direct_index_weight = sector_weight[direct_index]

  IF ABS(direct_index_weight - index_sector_weight) > 2%:
    deviation = direct_index_weight - index_sector_weight

    IF deviation > 0:
      RECOMMEND: "Reduce sector overweight by rebalancing"
    ELSE:
      RECOMMEND: "Increase sector exposure in next purchase"

  ELSE:
    RESULT: "Sector weight within tolerance"

FACTOR EXPOSURE TOLERANCE:
  Sector deviation:        ±2.0% acceptable
  Beta deviation:          ±0.05 acceptable
  Growth/Value tilt:       ±3% acceptable
  Concentrated position:   ±1 stock acceptable if < 2% of portfolio
```

### 4.2 Sector Weight Constraints
```
CONSTRAINT SETTING:

Client specifies (optional):
  - Exclude energy sector (ESG concern)
  - Underweight healthcare (overweight elsewhere)
  - Maintain tech focus (career exposure hedge)
  - No financial stocks (philosophical reason)

IMPLEMENTATION:

FOR each_sector IN portfolio_sectors:

  IF sector IN client_exclusion_list:
    target_weight[sector] = 0%
    tolerance = 0% (strict)

  ELSE IF sector IN client_underweight_list:
    target_weight[sector] = index_weight × 0.75 (25% reduce)
    tolerance = ±1%

  ELSE:
    target_weight[sector] = index_weight
    tolerance = ±2%

EXAMPLE: S&P 500 with ESG constraints

Sector             | Index Weight | Constraint | Target | Tolerance
─────────────────────────────────────────────────────────────────────
Technology        | 28.2%        | None       | 28.2%  | ±2%
Healthcare        | 13.1%        | None       | 13.1%  | ±2%
Financials        | 13.0%        | None       | 13.0%  | ±2%
Energy            | 4.2%         | EXCLUDE    | 0%     | 0% (strict)
Materials         | 2.5%         | None       | 2.5%   | ±2%
Industrials       | 8.0%         | None       | 8.0%   | ±2%
Consumer Disc     | 10.5%        | None       | 10.5%  | ±2%
Utilities         | 3.1%         | None       | 3.1%   | ±2%
Real Estate       | 2.9%         | None       | 2.9%   | ±2%
Consumer Staples  | 6.5%         | None       | 6.5%   | ±2%
Communication    | 8.0%         | None       | 8.0%   | ±2%

IMPACT: Excluding energy creates 4.2% weight drift; must allocate to other
        sectors. Recommend increasing tech/healthcare proportionally.
```

### 4.3 ESG/Values Alignment Screening
```
OPTIONAL: Client specifies ESG preferences

ESG_SCORE_THRESHOLD = {
  "strict": >= 70 (top 30% of companies),
  "moderate": >= 50 (top 50%),
  "flexible": >= 30 (bottom 70% acceptable)
}

CLIENT_VALUES_EXCLUDE = [
  "tobacco", "weapons", "oil_gas", "gambling",
  "animal_testing", "labor_violations", ...
]

IMPLEMENTATION:

FOR each_stock IN direct_index_portfolio:

  esg_score = LOOKUP(stock_ticker, esg_database)
  values_violation = CHECK_EXCLUSIONS(stock_ticker, client_values)

  IF values_violation == TRUE:
    ACTION: "Remove from holdings; replace with similar-profile stock"
    holding_replacement = FIND_REPLACEMENT(sector, market_cap, style)

  ELSE IF esg_score < esg_threshold:
    IF holding_is_essential_to_index_tracking:
      FLAG: "Keep for tracking; highlight in reporting"
    ELSE:
      ACTION: "Replace with higher-ESG alternative"

EXAMPLE:
  Stock: XOM (Exxon Mobil, Energy)
  ESG Score: 42/100
  Client exclusion: "No oil & gas"

  ACTION: Remove XOM
  Replacement: Choose from:
    1. Brookfield Renewable (renewable energy, similar energy exposure)
    2. NextEra Energy (alternative energy producer)
    3. Diversify across other sectors instead

  Impact: Small tracking error vs. S&P 500 (which includes XOM)
  But: Aligns with client values
```

### 4.4 Concentration Limits
```
FUNCTION: enforce_concentration_limits():

  max_single_position = portfolio_aum × 5% (typical maximum)
  max_sector_position = index_sector_weight + 2%

  FOR each_holding IN direct_index:

    holding_weight = holding_value / portfolio_aum

    IF holding_weight > max_single_position:
      ALERT: "Position exceeds concentration limit"
      ACTION: "Consider trimming to 5% max, harvest gains/losses"
      override_reason = CHECK(client_has_reason):
        "Concentrated stock position / Inherited wealth / etc."

    IF sector_weight > max_sector_weight:
      ALERT: "Sector overweight vs. index"
      ACTION: "Rebalance within sector or move to underweight sector"

CONCENTRATION LIMITS TABLE:

Metric                          | Limit     | Purpose
────────────────────────────────────────────────────────────
Single stock weight             | 5.0%      | Prevent single-stock risk
Top 10 holdings                 | 40.0%     | Prevent concentration
Single sector (vs index)        | +2.0%     | Preserve index characteristics
Largest sector (absolute)       | 35.0%     | Cap any single sector
Cash drag (undeployed capital)  | < 1.0%    | Minimize tracking error

CONCENTRATION MONITORING:
  Monthly review of all holdings
  Quarterly report to client
  Annual rebalancing if drifts exceed limits
```

---

## 5. CLIENT-SPECIFIC CONTEXT

### 5.1 Current Tax Bracket & Projected Changes
```
FUNCTION: assess_client_tax_situation():

  // Understanding client's tax bracket is critical for harvesting
  // benefit calculation and strategy timing

  current_filing_status = "married_filing_jointly"
  current_ordinary_income = $280,000 (W-2 + 1099)
  current_federal_bracket = 32% (income 191,951 - 243,725)
  current_state_tax = 5% (CA)
  combined_marginal_rate = 37%

  // Long-term capital gains rate
  ltcg_rate = CALCULATE(ordinary_income + new_gains):
    IF ordinary_income < $89,250:
      ltcg_rate = 0%
    ELSE IF ordinary_income < $553,850:
      ltcg_rate = 15%
    ELSE:
      ltcg_rate = 20%

  // For this client: 15% LTCG rate applies

  // Projected changes
  IF spouse_retiring_2025:
    projected_ordinary_income_2025 = $150,000 (single W-2)
    projected_bracket_2025 = 24%
    projected_ltcg_2025 = 15% (likely still applies)

    ACTION: "Consider Roth conversion before retirement"
           "Harvest losses while in 32% bracket now"

  RETURN {
    "current_ordinary_bracket": 32%,
    "current_ltcg_rate": 15%,
    "combined_rate": 37%,
    "projected_ordinary_2025": 24%,
    "harvesting_timing": "HARVEST NOW before bracket reduction"
  }

TAX BRACKET PLANNING IMPLICATIONS:

Situation 1: High income, but expecting retirement
  Current tax rate: 35% (ordinary), 20% (LTCG)
  Expected retirement rate: 22% (ordinary), 15% (LTCG)

  Recommendation: Harvest losses NOW (benefit at 35%)
                 Defer gain realization until retirement (pay at 15%)

Situation 2: Income rising (promotion, bonus)
  Current tax rate: 24%
  Expected future rate: 32%

  Recommendation: Defer harvesting (will be more valuable later)
                 If must harvest, harvest losses now, defer gains

Situation 3: Inconsistent income (bonus/commission)
  Current tax rate: Highly variable

  Recommendation: Harvest in high-income years
                 Harvest losses in low-income years (lower benefit but
                 preserves carryforward for high years)
```

### 5.2 Capital Gain/Loss Carryforward Balance
```
CLIENT BACKGROUND:

  2022 realized losses:         $(45,000)
  2023 realized gains:          $25,000
  2023 loss carryforward used:  $(25,000)
  Remaining loss carryforward:  $(20,000)

  2023 ordinary income offset:  $(3,000)
  Loss carryforward into 2024:  $(17,000)

  2024 YTD realized gains:      $35,000
  2024 YTD realized losses:     $(5,000)

  IMPACT OF CARRYFORWARD:

  Without direct indexing:
    2024 net gains: $35,000 - $5,000 = $30,000
    Tax on $30,000: $30,000 × 20% (LTCG) = $6,000 tax

  WITH carryforward applied:
    Offset $17,000 of gains: $35,000 - $17,000 = $18,000
    Tax on $18,000: $18,000 × 20% = $3,600 tax
    Annual benefit: $2,400 (from prior year losses)

  HARVESTING STRATEGY FOR 2024:
    Available carryforward: $17,000 (already working in background)
    New losses harvested: $40,000

    Total losses available 2024: $57,000
    Against gains of $35,000: Offset fully + $22,000 excess
    Excess offset ordinary income: $3,000
    Excess carryforward to 2025: $19,000

    Total benefit: ($35,000 × 20%) + ($3,000 × 35%) = $7,000 + $1,050 = $8,050
```

### 5.3 Income Sources & Variability
```
MULTI-SOURCE INCOME ANALYSIS:

Client income sources:
  W-2 salary:           $200,000 (stable, fixed)
  Spouse W-2:           $80,000 (stable, fixed)
  Investment income:    $25,000 (variable, dividends + interest)
  Business 1099 income: $35,000 (variable, consulting)
  Real estate rentals:  $15,000 (variable, seasonal)

  Total ordinary income: $355,000
  Federal tax bracket: 35%

  VARIABILITY ASSESSMENT:

  Year 1: $355,000 (normal)
  Year 2: $300,000 (less consulting)
  Year 3: $385,000 (more 1099 + bonus)

  Coefficient of variation: 12% (moderate variability)

  HARVESTING STRATEGY:
    High income years: Harvest larger loss amounts (more valuable)
    Low income years: Harvest smaller amounts or defer
    Preserve flexibility: Keep some losses in carryforward for high years

INCOME SOURCES BY CATEGORY:

Category          | Amount | Stability | Tax Characteristics
──────────────────────────────────────────────────────────────
Employment        | $280K  | HIGH      | W-2, FICA taxes paid
Self-employment   | $50K   | MEDIUM    | 1099, self-employment tax
Investment        | $25K   | MEDIUM    | Dividends, interest, cap gains
Real estate       | $15K   | MEDIUM    | Passive income / depreciation
```

### 5.4 State Tax Considerations
```
CLIENT: California resident
  Federal marginal rate: 35%
  California state tax: 13.3% (highest in US)
  Combined marginal rate: 48.3%

  IMPACT ON DIRECT INDEXING:
    Long-term capital gains in CA are subject to state tax (unlike some states)
    Tax savings from harvesting losses:
      Federal: $(40,000) × 35% = $14,000
      State: $(40,000) × 13.3% = $5,320
      Total: $19,320 (48.3% combined!)

    This makes tax harvesting especially valuable in high-tax states

STATE TAX COMPARISON:

State                 | Tax on LTCG | Combined Rate | DI Value
──────────────────────────────────────────────────────────────
California           | 13.3%       | 48.3%         | VERY HIGH
New York             | 8.8%        | 43.8%         | VERY HIGH
Massachusetts        | 5.0%        | 40.0%         | HIGH
Illinois             | 0%          | 20%           | MEDIUM (fed only)
Florida              | 0%          | 20%           | MEDIUM (fed only)
Texas                | 0%          | 20%           | MEDIUM (fed only)

ACTION: Document state of residence for compliance
        CA residents prioritize DI harvesting (highest impact)
```

---

## 6. COMPLIANCE & SUITABILITY

### 6.1 Suitability Documentation
```
REQUIREMENT: Direct indexing must be suitable for client

FACTORS TO DOCUMENT:

☑ Investment objective alignment
  - Client goal: "Tax optimization while maintaining index tracking"
  - Direct indexing appropriateness: "YES - directly serves goal"

☑ Risk tolerance
  - Client risk profile: "Moderate"
  - Direct indexing risk: "Same as underlying index" (tracking error < 0.5%)
  - Suitability: "YES - risk equivalent to traditional index"

☑ Time horizon
  - Client investment horizon: "20+ years (retirement)"
  - Harvesting benefit horizon: "Immediate and ongoing"
  - Suitability: "YES - benefits increase over time"

☑ Financial situation
  - Taxable account: "YES" (essential for harvesting)
  - Sufficient portfolio size: $500K+ (break-even at ~$150K)
  - Suitability: "YES - adequate AUM for cost justification"

☑ Investment sophistication
  - Client experience: "Intermediate investor"
  - DI complexity: "Moderate (individual holdings, more reporting)"
  - Suitability: "YES - client comfortable with complexity"

☑ Special circumstances
  - Concentrated position: "Apple stock $250K" (DI helps diversify)
  - Inheritance expectations: "Potential large inflow" (harvesting flexibility)
  - Suitability: "YES - DI addresses special needs"

SUITABILITY SIGN-OFF:
  Document must include:
    1. Client's stated objectives and constraints
    2. Analysis of suitability across all dimensions
    3. Advisor recommendation and rationale
    4. Client acknowledgment and consent
    5. Date signed and witnessed
```

### 6.2 Fee Disclosure Requirements
```
REQUIRED DISCLOSURES:

Form ADV Part 2A (Advisor brochure):
  ☐ Direct indexing service description
  ☐ Fee structure (advisory % + trading costs)
  ☐ Comparison to traditional ETF approach
  ☐ Potential conflicts (advisor profits from trading activity)
  ☐ Risks and limitations (tracking error, wash sale rules, complexity)

Fee Schedule Document:
  ☐ Advisory fee: 0.20% AUM (direct indexing management)
  ☐ Trading/implementation: $50-150 per rebalance (est. 4x/year = $200-600)
  ☐ Custody fees: Included in custodian's standard fees
  ☐ Tax reporting: Included in advisory fee

  Total annual cost example:
    $500K portfolio × 0.20% = $1,000
    Trading (est.): $400
    Total: $1,400 (0.28%)

  Compare to:
    Traditional ETF + advisory: $500K × 0.80% = $4,000
    Savings: $2,600

ICA Disclosure (if applicable):
  ☐ Potential tax consequences must be disclosed
  ☐ Tax treatment is not guaranteed
  ☐ Harvesting benefit depends on realized losses availability
  ☐ Client responsible for tax reporting accuracy

Conflict of Interest Disclosures:
  ☐ Advisor may earn more from DI (higher fees) than traditional approach
  ☐ Advisor has incentive to recommend DI
  ☐ Mitigation: Documented suitability analysis, client consent
```

### 6.3 Performance Reporting Methodology
```
REPORTING REQUIREMENTS:

Monthly Statement:
  ✓ Individual holdings (ticker, quantity, market value)
  ✓ Gain/loss by lot
  ✓ Dividend and interest income
  ✓ Trading activity (harvests, rebalancing)
  ✓ Cash position
  ✓ Performance vs. benchmark index

Quarterly Report:
  ✓ Tax harvesting summary (losses realized, tax benefit)
  ✓ Capital gains/losses carryforward status
  ✓ Tracking error vs. S&P 500
  ✓ Sector weight analysis
  ✓ Rebalancing actions taken
  ✓ Projected year-end tax situation

Annual Tax Report:
  ✓ Year-end holdings summary
  ✓ All realized gains and losses (pre-1099)
  ✓ Dividend and interest income
  ✓ Estimated tax liability
  ✓ Capital loss carryforward into next year
  ✓ After-tax return vs. pre-tax return
  ✓ Tax alpha achieved (estimate)

Performance Attribution:
  ✓ Total return (price appreciation + dividends)
  ✓ Benchmark return (S&P 500)
  ✓ Outperformance/(underperformance)
  ✓ Explanation of differences:
    - Tax harvesting benefit: +1.2%
    - Trading costs: -0.15%
    - Tracking error: -0.05%
    - Net advantage: +1.0%
```

---

## 7. KB RETRIEVAL TRIGGERS

**Before analysis, retrieve:**

1. **Regulatory Reference (Wash Sale Rules)** — IRC §1091 and IRS guidance
   - Path: /kb/regulatory/tax-rules/wash-sale-rules.md

2. **Capital Gains Tax Rates & Brackets** — Current year rates by income level
   - Path: /kb/regulatory/tax-rates/capital-gains-rates-[YEAR].json

3. **Planning Methodologies** — Tax optimization frameworks
   - Path: /kb/planning-methodologies/tax-optimization-framework.md

4. **Client Portfolio Data** — Holdings, cost basis, performance
   - Path: /clients/[CLIENT_ID]/portfolio-holdings.json

5. **Direct Indexing Implementation Standards** — Best practices
   - Path: /kb/services/direct-indexing-implementation-standards.md

---

## 8. OUTPUT REQUIREMENTS

### 8.1 Harvest Opportunity Report (JSON)
```json
{
  "analysis_date": "ISO-8601",
  "client_id": "string",
  "portfolio_aum": 500000,
  "harvestable_opportunities": [
    {
      "security_id": "AAPL",
      "quantity": 100,
      "cost_basis": 180000,
      "current_value": 170000,
      "unrealized_loss": -10000,
      "holding_period_days": 450,
      "capital_loss_type": "long_term",
      "tax_benefit_rate": 0.20,
      "annual_tax_savings": 2000,
      "wash_sale_risk": "safe",
      "recommended_action": "harvest_immediately",
      "replacement_security": null
    }
  ],
  "total_harvestable_losses": -75000,
  "total_potential_tax_benefit": 18750,
  "wash_sale_restrictions": [
    {
      "security": "VOO",
      "restriction_period": ["2024-12-15", "2025-01-14"],
      "status": "cannot_repurchase"
    }
  ]
}
```

### 8.2 Tax Alpha Projection (Structured)
```json
{
  "scenario": "direct_indexing_strategy",
  "base_case_annual_return": 0.045,
  "tax_alpha_calculation": {
    "annual_harvesting_amount": 40000,
    "harvesting_frequency": "annual",
    "average_tax_rate": 0.35,
    "annual_tax_savings": 14000,
    "portfolio_value": 500000,
    "tax_alpha_percent": 1.4,
    "tax_alpha_dollars": 7000
  },
  "fee_impact": {
    "di_advisory_fee": 0.002,
    "trading_costs": 0.001,
    "total_cost": 0.003,
    "cost_dollars": 1500
  },
  "net_benefit": {
    "annual_tax_alpha": 0.014,
    "annual_cost": -0.003,
    "net_advantage": 0.011,
    "net_dollars": 5500
  },
  "sensitivity_analysis": {
    "conservative_scenario": 0.008,
    "base_case": 0.011,
    "aggressive_scenario": 0.015
  }
}
```

### 8.3 Strategy Recommendation
```
DIRECT INDEXING STRATEGY RECOMMENDATION
═══════════════════════════════════════

CLIENT PROFILE:
  Portfolio value: $500,000 (taxable)
  Tax bracket: 35% federal, 5% state (40% combined)
  Time horizon: 20+ years
  Suitability assessment: EXCELLENT

RECOMMENDED STRATEGY:
  Annual tax-loss harvesting with S&P 500 direct index

PROJECTED BENEFITS:
  Year 1 tax alpha: 1.4% ($7,000)
  Annual cost: 0.3% ($1,500)
  Net benefit: 1.1% ($5,500)

  10-year cumulative benefit (with compounding): ~$63,000

IMPLEMENTATION TIMELINE:
  Week 1: Advisor discussion and suitability documentation
  Week 2: Account funding and position transfer
  Week 3-4: Individual stock selection and positioning
  Week 5-6: Trading execution and rebalancing
  Target go-live: 4-6 weeks

ONGOING MANAGEMENT:
  Quarterly rebalancing (if tracking error exceeds 0.5%)
  Annual tax harvesting (larger losses in higher-tax years)
  Monthly reporting (individual holdings, gains/losses)
  Annual tax impact summary (before year-end tax planning)

RISKS & MITIGATIONS:
  Tracking error: Managed through sector weight tolerance (±2%)
  Wash sale complexity: Documentation and replacement security procedure
  Concentration: 5% max per position, 2% sector tolerance
  Tax law changes: Regular review of harvesting strategy
```

---

## 9. VALIDATION GATES

Before recommending direct indexing:

```
GATE 1: Portfolio Size & Composition
  ☐ Minimum AUM: $150K (break-even point)
  ☐ Account type: Taxable (not tax-deferred)
  ☐ Realistic harvesting opportunities identified: YES
  IF not all pass: Consider traditional ETF approach instead

GATE 2: Regulatory & Tax Analysis
  ☐ Wash sale rules understood and documented
  ☐ Harvesting strategy addresses client's actual loss position
  ☐ Tax carryforward tracking methodology established
  ☐ State tax considerations identified
  IF not all pass: Flag risks and document in suitability memo

GATE 3: Client Suitability
  ☐ Client acknowledges understanding of DI mechanics
  ☐ Risk tolerance matches index tracking (low tracking error)
  ☐ Client accepts tax reporting complexity
  ☐ Time horizon sufficient for long-term holding
  IF not all pass: Recommend simplified approach

GATE 4: Fee Justification
  ☐ Projected tax alpha exceeds costs: YES
  ☐ Client agrees to fee structure: YES
  ☐ Comparison to ETF approach documented: YES
  IF not all pass: Negotiate or switch to traditional approach

GATE 5: Implementation Readiness
  ☐ Custodian supports direct indexing: YES
  ☐ Reporting systems ready: YES
  ☐ Tax software integrates 1099-B reporting: YES
  ☐ Advisor trained and certified: YES
  IF not all pass: Defer implementation until ready
```

---

## 10. NOTES FOR IMPLEMENTATION

- Every recommendation must have quantitative support (no subjective scoring)
- Wash sale rules are mandatory compliance; violations result in loss disallowance
- Tax alpha projections should include sensitivity ranges (conservative/base/aggressive)
- Client must understand tracking error will exceed traditional ETF approach
- Document all suitability decisions in client file (fiduciary record-keeping)
- Annual review of strategy as tax law and client circumstances change
