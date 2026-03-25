# Advanced Analyzers Architecture Design

## 1. Framework Design

### Analyzer Pattern
Each analyzer follows a consistent interface:

```
analyzerDefinitions
  - id: UUID
  - name: string
  - category: string (tax, estate, investment, charitable)
  - inputSchema: JSONB (field definitions with types & validation)
  - outputSchema: JSONB (result structure definition)
  - calculationLogic: text (engine identifier)
  - isActive: boolean
```

### Lifecycle
1. **Definition** - Admin creates analyzer with input/output schemas
2. **Pre-fill** - Fact finder responses auto-populate inputs
3. **Run** - User fills remaining inputs, triggers calculation
4. **Results** - Output displayed with visualizations
5. **Store** - Results saved to `calculatorRuns` with extended type enum
6. **Export** - PDF/share results with client

### Integration Points
- Fact Finder responses pre-fill analyzer inputs via field mapping
- Results appear in client detail page and dashboard widgets
- Calculator runs table stores all analyzer executions
- Reports can embed analyzer outputs

---

## 2. Six Analyzer Specifications

### Analyzer 1: Roth Conversion Optimizer
- **Category**: tax
- **Inputs**: Traditional IRA balance, current income, tax filing status, state, conversion amount range, time horizon
- **Outputs**: Year-by-year tax impact, optimal conversion amount, break-even age, multi-year strategy table
- **Algorithm**: Deterministic tax bracket calculation + Monte Carlo growth projection
- **Use Case**: "Should I convert my Traditional IRA to Roth? How much per year?"

### Analyzer 2: Tax Bracket Visualizer
- **Category**: tax
- **Inputs**: W-2 income, 1099 income, business income, deductions, filing status, state
- **Outputs**: Current bracket position, marginal vs effective rate, bracket creep over time, optimization opportunities
- **Algorithm**: Federal + state tax table lookup, income projection with inflation
- **Use Case**: "Where do I fall in the tax system? What moves keep me in a lower bracket?"

### Analyzer 3: Beneficiary Audit Tool
- **Category**: estate
- **Inputs**: List of accounts with current beneficiaries, estate plan summary, marital status, dependents
- **Outputs**: Audit report with mismatches, missing designations, per-stirpes vs per-capita analysis, recommendations
- **Algorithm**: Rule-based matching against estate plan, gap detection
- **Use Case**: "Are my beneficiaries correct across all accounts?"

### Analyzer 4: Estate Document Checklist
- **Category**: estate
- **Inputs**: State of residence, marital status, net worth, business ownership, minor children, special needs dependents
- **Outputs**: Required documents list with priority, completion status, referral suggestions
- **Algorithm**: State-specific rule-based decision tree
- **Use Case**: "What estate documents do I need and which are missing?"

### Analyzer 5: Charitable Giving Optimizer
- **Category**: charitable
- **Inputs**: Appreciated assets (type, basis, FMV), giving target amount, tax bracket, time horizon, giving preferences
- **Outputs**: Strategy comparison (cash, DAF, CRT, QCD), tax savings per strategy, timing recommendations
- **Algorithm**: Multi-strategy tax calculation with present value comparison
- **Use Case**: "What's the most tax-efficient way to achieve my giving goals?"

### Analyzer 6: Asset Allocation Visualizer
- **Category**: investment
- **Inputs**: Current holdings by asset class, target allocation, risk tolerance, tax lots
- **Outputs**: Current vs target allocation chart, drift analysis, rebalancing trade list, tax impact of trades, optimal sequence
- **Algorithm**: Allocation percentage calculation, tax-aware rebalancing optimization
- **Use Case**: "How far am I from my target allocation? What trades should I make?"

---

## 3. Database Schema

### New Table: analyzerDefinitions
```sql
CREATE TABLE analyzer_definitions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- tax, estate, investment, charitable
  description TEXT,
  input_schema JSONB NOT NULL, -- field definitions
  output_schema JSONB NOT NULL, -- result structure
  calculation_logic TEXT NOT NULL, -- engine identifier
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Extend calculatorRuns type enum
Add new values: `roth_conversion`, `tax_bracket`, `beneficiary_audit`, `estate_checklist`, `charitable_giving`, `asset_allocation`

---

## 4. Integration Approach

### UI Location
- New "Analyzers" section accessible from Calculators page or dedicated nav item
- Client detail page shows relevant analyzer results
- Dashboard widget for recent analyzer runs

### Pre-fill from Fact Finders
- Field mapping config connects fact finder question IDs to analyzer input fields
- When launching analyzer for a client with completed fact finder, inputs auto-populate
- Example: Retirement FF q1 (401k balance) maps to Roth Conversion Optimizer Traditional IRA input

### Export & Sharing
- PDF export for each analyzer result
- Include in client reports via report template engine
- Email summary to client

---

## 5. Implementation Roadmap

### Priority Order (by business value)
1. **Roth Conversion Optimizer** - High demand, clear tax savings, 1-2 weeks
2. **Tax Bracket Visualizer** - Visual impact, pairs with Roth, 1 week
3. **Beneficiary Audit Tool** - Compliance value, risk mitigation, 1-2 weeks
4. **Asset Allocation Visualizer** - Portfolio management core, 1-2 weeks
5. **Estate Document Checklist** - Referral driver, 1 week
6. **Charitable Giving Optimizer** - Niche but high value, 1-2 weeks

### Phase 9 Sprint Structure
- Sprint 1: Analyzer framework + Roth Conversion (2 weeks)
- Sprint 2: Tax Bracket + Beneficiary Audit (2 weeks)
- Sprint 3: Asset Allocation + Estate Checklist (2 weeks)
- Sprint 4: Charitable Giving + Polish (2 weeks)

### Dependencies
- Tax calculation: Federal tax tables (built-in), state tax tables (data file)
- No external APIs required for Phase 9 analyzers
- All calculations can be deterministic (no AI dependency)
