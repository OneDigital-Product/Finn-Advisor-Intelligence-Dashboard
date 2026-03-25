# Migration-Ready Package Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a `/migration-ready/` directory containing all portable business logic, Zod v4 schemas, Next.js API route stubs, and UI component stubs organized to match the target OneApp `src/` layout — ready to drop into the `oneapp-example` repo when NPM access is granted.

**Architecture:** Lift-and-shift approach. Calculators copied verbatim (pure functions). Zod schemas reorganized by domain and migrated to v4. Express routes converted to Next.js Route Handlers preserving business logic. UI components stubbed with `@od-oneapp/uni-ui` imports. No modifications to the running prototype.

**Tech Stack:** TypeScript, Zod 4, Next.js 16 Route Handlers, React 19 Server/Client Components, Tailwind v4, Recharts, lucide-react, `@od-oneapp/uni-ui` (stubbed), `@od-oneapp/ai-platform` (stubbed)

---

### Task 1: Create Directory Skeleton

**Files:**
- Create: `migration-ready/src/lib/calculators/` (directory)
- Create: `migration-ready/src/lib/integrations/` (directory)
- Create: `migration-ready/src/components/schemas/` (directory)
- Create: `migration-ready/src/components/dashboard/` (directory)
- Create: `migration-ready/src/components/calculators/` (directory)
- Create: `migration-ready/src/app/(my-app)/clients/[clientId]/portfolio/` (directory)
- Create: `migration-ready/src/app/(my-app)/clients/[clientId]/behaviors/` (directory)
- Create: `migration-ready/src/app/(my-app)/tools/[calculator]/` (directory)
- Create: `migration-ready/src/app/api/calculators/rmd/` (directory)
- Create: `migration-ready/src/app/api/calculators/roth/` (directory)
- Create: `migration-ready/src/app/api/calculators/retirement/` (directory)
- Create: `migration-ready/src/app/api/calculators/monte-carlo/` (directory)
- Create: `migration-ready/src/app/api/calculators/tax-bracket/` (directory)
- Create: `migration-ready/src/app/api/calculators/withdrawal/` (directory)
- Create: `migration-ready/src/app/api/calculators/concentrated-stock/` (directory)
- Create: `migration-ready/src/app/api/calculators/qsbs/` (directory)
- Create: `migration-ready/src/app/api/calculators/life-insurance/` (directory)
- Create: `migration-ready/src/app/api/calculators/ltc/` (directory)
- Create: `migration-ready/src/app/api/calculators/charitable/` (directory)
- Create: `migration-ready/src/app/api/calculators/budget/` (directory)
- Create: `migration-ready/src/app/api/calculators/asset-location/` (directory)
- Create: `migration-ready/src/app/api/clients/[id]/` (directory)
- Create: `migration-ready/src/app/api/orion/` (directory)
- Create: `migration-ready/src/app/api/salesforce/` (directory)
- Create: `migration-ready/src/app/api/market/` (directory)
- Create: `migration-ready/src/app/api/meetings/` (directory)
- Create: `migration-ready/src/app/api/ai/` (directory)

**Step 1: Create all directories with a single command**

```bash
mkdir -p migration-ready/src/{lib/{calculators,integrations},components/{schemas,dashboard,calculators},app/\(my-app\)/{clients/\[clientId\]/{portfolio,behaviors},tools/\[calculator\]},app/api/{calculators/{rmd,roth,retirement,monte-carlo,tax-bracket,withdrawal,concentrated-stock,qsbs,life-insurance,ltc,charitable,budget,asset-location},clients/\[id\],orion,salesforce,market,meetings,ai}}
```

**Step 2: Verify structure**

```bash
find migration-ready -type d | sort
```

Expected: All directories listed above exist.

**Step 3: Commit**

```bash
git add migration-ready/
git commit -m "feat(migration): create directory skeleton matching OneApp target layout"
```

---

### Task 2: Copy Calculators (Pure Business Logic)

**Files:**
- Copy: `server/calculators/*.ts` → `migration-ready/src/lib/calculators/`
- Copy: `server/monte-carlo.ts` → `migration-ready/src/lib/calculators/monte-carlo.ts`

All 13 calculators + Monte Carlo are pure functions with zero external dependencies. Direct copy, no modifications.

**Step 1: Copy all calculator files**

```bash
cp server/calculators/asset-location-calculator.ts migration-ready/src/lib/calculators/asset-location.ts
cp server/calculators/budget-calculator.ts migration-ready/src/lib/calculators/budget.ts
cp server/calculators/charitable-tax-calculator.ts migration-ready/src/lib/calculators/charitable-tax.ts
cp server/calculators/concentrated-stock-calculator.ts migration-ready/src/lib/calculators/concentrated-stock.ts
cp server/calculators/life-insurance-gap-calculator.ts migration-ready/src/lib/calculators/life-insurance-gap.ts
cp server/calculators/ltc-planning-calculator.ts migration-ready/src/lib/calculators/ltc-planning.ts
cp server/calculators/qsbs-calculator.ts migration-ready/src/lib/calculators/qsbs.ts
cp server/calculators/qsbs-tracker-calculator.ts migration-ready/src/lib/calculators/qsbs-tracker.ts
cp server/calculators/retirement-analysis-calculator.ts migration-ready/src/lib/calculators/retirement-analysis.ts
cp server/calculators/rmd-calculator.ts migration-ready/src/lib/calculators/rmd.ts
cp server/calculators/roth-conversion-calculator.ts migration-ready/src/lib/calculators/roth-conversion.ts
cp server/calculators/tax-bracket-calculator.ts migration-ready/src/lib/calculators/tax-bracket.ts
cp server/calculators/withdrawal-analysis-calculator.ts migration-ready/src/lib/calculators/withdrawal-analysis.ts
cp server/monte-carlo.ts migration-ready/src/lib/calculators/monte-carlo.ts
```

**Step 2: Copy shared retirement types (dependency of retirement-analysis-calculator)**

```bash
cp shared/retirement-analysis-types.ts migration-ready/src/lib/calculators/retirement-analysis-types.ts
```

Then update the import in `retirement-analysis.ts` to use a relative path:
- Change: `import { ... } from "@shared/retirement-analysis-types"` (or similar)
- To: `import { ... } from "./retirement-analysis-types"`

**Step 3: Create barrel export**

Create `migration-ready/src/lib/calculators/index.ts`:

```typescript
export { calculateAssetLocation } from './asset-location';
export { calculateBudget } from './budget';
export { calculateCharitableTaxImpact } from './charitable-tax';
export { calculateConcentratedStock } from './concentrated-stock';
export { calculateLifeInsuranceGap } from './life-insurance-gap';
export { calculateLTCPlanning } from './ltc-planning';
export { calculateQSBS } from './qsbs';
export { calculateQSBS as calculateQSBSTracker } from './qsbs-tracker';
export { calculateRetirementAnalysis } from './retirement-analysis';
export { calculateRMD, calculateAggregatedRMD, analyzeQCD, projectRMD, compareStrategies } from './rmd';
export { calculateRothConversion, projectMultiYearConversion, compareConversionScenarios, getConversionAmountToMaximizeBracket, validateRothConversionInput } from './roth-conversion';
export { calculateTaxBracket } from './tax-bracket';
export { runMonteCarloSimulation, createSeededRng, validateSimulationParams } from './monte-carlo';
// withdrawal-analysis exports vary — check file for exact names
export * from './withdrawal-analysis';
```

**Step 4: Verify no external imports remain**

```bash
grep -rn "from ['\"]\.\./" migration-ready/src/lib/calculators/ | grep -v retirement-analysis-types
```

Expected: No output (no parent-directory imports except the one we fixed).

**Step 5: Commit**

```bash
git add migration-ready/src/lib/calculators/
git commit -m "feat(migration): copy 13 calculators + Monte Carlo engine (zero modifications)"
```

---

### Task 3: Migrate Zod Schemas to v4 (Calculator Inputs)

**Files:**
- Read: `server/routes/calculators.ts` (lines 20-268 contain all Zod body schemas)
- Create: `migration-ready/src/components/schemas/calculators.ts`

Extract all calculator input validation schemas from the Express route file. These are currently inline in `server/routes/calculators.ts`. Reorganize them into a standalone schema file. Zod v4 is largely backward-compatible with v3 for `z.object()`, `z.enum()`, `z.coerce` — the main migration is structural (moving schemas out of route files).

**Step 1: Create calculator schemas file**

Create `migration-ready/src/components/schemas/calculators.ts` containing all the Zod schemas from `server/routes/calculators.ts` lines 20-268:
- `rmdBodySchema`
- `budgetBodySchema`
- `rothConversionBodySchema`
- `assetLocationBodySchema`
- `taxBracketBodySchema`
- `qsbsBodySchema`
- `concentratedStockBodySchema`
- `ltcPlanningBodySchema`
- `lifeInsuranceGapBodySchema`
- `multiYearRothBodySchema`
- `rothScenarioComparisonBodySchema`
- `bracketOptimizerBodySchema`
- `qcdAnalysisBodySchema`
- `rmdProjectionBodySchema`
- `aggregatedRmdBodySchema`
- `strategyComparisonBodySchema`
- `scenarioSchema`

Export all schemas and their inferred types. Add `@od-oneapp/ai-platform` integration as commented stubs:

```typescript
import { z } from 'zod';
// TODO: Uncomment when @od-oneapp/ai-platform is available
// import { createObjectOutput } from '@od-oneapp/ai-platform/output';

export const rmdInputSchema = z.object({
  // ... exact copy from server/routes/calculators.ts lines 20-33
});
export type RMDInput = z.infer<typeof rmdInputSchema>;

// ... repeat for all schemas ...

// TODO: Wire through ai-platform when available
// export const rmdOutput = createObjectOutput({ schema: rmdInputSchema });
```

**Step 2: Commit**

```bash
git add migration-ready/src/components/schemas/calculators.ts
git commit -m "feat(migration): extract calculator Zod schemas into standalone module"
```

---

### Task 4: Migrate Zod Schemas (AI Render Schemas — Client/Behavioral/Compliance)

**Files:**
- Read: `server/types/ai-render-schemas.ts`
- Create: `migration-ready/src/components/schemas/client.ts`
- Create: `migration-ready/src/components/schemas/behavioral.ts`
- Create: `migration-ready/src/components/schemas/compliance.ts`
- Create: `migration-ready/src/components/schemas/portfolio.ts`

Split the monolithic `ai-render-schemas.ts` by domain. Each file gets the relevant schemas.

**Step 1: Create client.ts**

Extract `ClientRelationshipIntelligenceSchema` and `TranscriptToSalesforceSchema` into `migration-ready/src/components/schemas/client.ts`. These cover client relationship health, meeting transcription, and Salesforce actions.

**Step 2: Create behavioral.ts**

Extract `SFEngagementScoringSchema` into `migration-ready/src/components/schemas/behavioral.ts`. This covers engagement frequency, recency, diversity, stickiness, and churn risk.

**Step 3: Create compliance.ts**

Extract `SFComplianceGapSchema` into `migration-ready/src/components/schemas/compliance.ts`. This covers risk reviews, IPS, estate plans, document audits, beneficiary audits.

**Step 4: Create portfolio.ts**

Extract `SFHouseholdFinancialSnapshotSchema` into `migration-ready/src/components/schemas/portfolio.ts`. This covers AUM, accounts, holdings, goals.

Also add schemas derived from the `shared/schema.ts` Drizzle definitions for:
- Account shape (from `accounts` table definition)
- Holdings shape (from `holdings` table definition)
- Performance shape (from `performance` table definition)

These should be standalone Zod schemas (not Drizzle `createInsertSchema`), since the target has no Drizzle.

**Step 5: Add commented ai-platform stubs to each file**

```typescript
// TODO: Uncomment when @od-oneapp/ai-platform is available
// import { createObjectOutput } from '@od-oneapp/ai-platform/output';
// export const clientRelationshipOutput = createObjectOutput({
//   schema: ClientRelationshipIntelligenceSchema,
// });
```

**Step 6: Commit**

```bash
git add migration-ready/src/components/schemas/
git commit -m "feat(migration): split AI render schemas by domain (client/behavioral/compliance/portfolio)"
```

---

### Task 5: Convert Calculator API Routes (Express → Next.js)

**Files:**
- Read: `server/routes/calculators.ts` (lines 270-end for route handlers)
- Create: `migration-ready/src/app/api/calculators/rmd/route.ts`
- Create: `migration-ready/src/app/api/calculators/budget/route.ts`
- Create: `migration-ready/src/app/api/calculators/roth/route.ts`
- Create: `migration-ready/src/app/api/calculators/asset-location/route.ts`
- Create: `migration-ready/src/app/api/calculators/tax-bracket/route.ts`
- Create: `migration-ready/src/app/api/calculators/qsbs/route.ts`
- Create: `migration-ready/src/app/api/calculators/concentrated-stock/route.ts`
- Create: `migration-ready/src/app/api/calculators/ltc/route.ts`
- Create: `migration-ready/src/app/api/calculators/life-insurance/route.ts`
- Create: `migration-ready/src/app/api/calculators/monte-carlo/route.ts`
- Create: `migration-ready/src/app/api/calculators/charitable/route.ts`
- Create: `migration-ready/src/app/api/calculators/retirement/route.ts`
- Create: `migration-ready/src/app/api/calculators/withdrawal/route.ts`

**Conversion pattern for each route:**

```typescript
// migration-ready/src/app/api/calculators/rmd/route.ts
import { NextResponse } from 'next/server';
import { calculateRMD } from '#/lib/calculators/rmd';
import { rmdInputSchema } from '#/components/schemas/calculators';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = rmdInputSchema.parse(body);

    const inputs = {
      accountHolderDOB: data.accountHolderDOB,
      accountBalance: data.accountBalance,
      beneficiaryDOB: data.beneficiaryDOB || undefined,
      beneficiaryRelationship: data.beneficiaryRelationship || 'none',
      taxYear: data.taxYear,
      assumedGrowthRate: data.assumedGrowthRate ?? 0.07,
      inheritanceStatus: data.inheritanceStatus || 'original_owner',
      projectionYears: data.projectionYears || 10,
      qcdAmount: data.qcdAmount,
      qcdAnnualIncrease: data.qcdAnnualIncrease,
      marginalTaxRate: data.marginalTaxRate,
    };

    const results = calculateRMD(inputs);

    return NextResponse.json({
      calculatorType: 'rmd',
      inputs,
      results,
      assumptions: {
        mortalityTableUsed: 'IRS Uniform Lifetime Table III',
        withdrawalTiming: 'by December 31',
      },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to calculate RMD' },
      { status: 400 }
    );
  }
}
```

**Step 1:** Create each route file following this pattern, extracting the business logic from the corresponding Express handler in `server/routes/calculators.ts`. Key changes per route:
- Remove `db.insert(calculatorRuns)` calls (no database in target)
- Remove `req.session.userId` references (auth handled by `@od-oneapp/auth`)
- Replace `validateBody()` with direct `schema.parse()`
- Replace `res.json()` with `NextResponse.json()`
- Import calculators from `#/lib/calculators/`
- Import schemas from `#/components/schemas/calculators`

**Step 2: Commit**

```bash
git add migration-ready/src/app/api/calculators/
git commit -m "feat(migration): convert 13 calculator Express routes to Next.js API routes"
```

---

### Task 6: Convert Core CRUD API Routes (Clients, Meetings, AI)

**Files:**
- Read: `server/routes/clients.ts`, `server/routes/meetings.ts`, `server/routes/ai.ts`
- Create: `migration-ready/src/app/api/clients/route.ts`
- Create: `migration-ready/src/app/api/clients/[id]/route.ts`
- Create: `migration-ready/src/app/api/meetings/route.ts`
- Create: `migration-ready/src/app/api/ai/route.ts`

These routes are more complex because they use `storage` (database abstraction). Convert them to Next.js format but mark database calls with `// TODO: Replace with data source` comments since the target app won't use Drizzle.

**Step 1: Convert clients route**

```typescript
// migration-ready/src/app/api/clients/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const segment = searchParams.get('segment');
  const status = searchParams.get('status');

  // TODO: Replace with data source (Orion/Salesforce API calls)
  // const clients = await getClients({ search, segment, status });
  // return NextResponse.json(clients);

  return NextResponse.json({ todo: 'Wire to Orion/Salesforce data source' });
}

export async function POST(request: Request) {
  const body = await request.json();
  // TODO: Validate with clientSchema.parse(body)
  // TODO: Replace with data source
  return NextResponse.json({ todo: 'Wire to data source' }, { status: 201 });
}
```

**Step 2: Convert clients/[id] route**

```typescript
// migration-ready/src/app/api/clients/[id]/route.ts
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // TODO: Replace with data source
  return NextResponse.json({ todo: `Get client ${id}` });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  // TODO: Validate and update
  return NextResponse.json({ todo: `Update client ${id}` });
}
```

**Step 3: Convert meetings and AI routes following same pattern**

**Step 4: Commit**

```bash
git add migration-ready/src/app/api/clients/ migration-ready/src/app/api/meetings/ migration-ready/src/app/api/ai/
git commit -m "feat(migration): convert client/meeting/AI Express routes to Next.js stubs"
```

---

### Task 7: Convert Integration API Routes (Orion, Salesforce, Market)

**Files:**
- Read: `server/routes/orion.ts`, `server/routes/salesforce.ts`, `server/routes/market.ts`
- Read: `server/integrations/orion/client.ts` (for pure API client logic)
- Create: `migration-ready/src/app/api/orion/route.ts`
- Create: `migration-ready/src/app/api/salesforce/route.ts`
- Create: `migration-ready/src/app/api/market/route.ts`
- Create: `migration-ready/src/lib/integrations/orion.ts`
- Create: `migration-ready/src/lib/integrations/salesforce.ts`
- Create: `migration-ready/src/lib/integrations/market-data.ts`

**Step 1: Extract Orion client logic**

Read `server/integrations/orion/client.ts` and extract the pure HTTP client functions (authentication, API calls) into `migration-ready/src/lib/integrations/orion.ts`. Remove any `storage` or `db` imports. Keep the axios-based HTTP calls.

**Step 2: Create Orion API route**

```typescript
// migration-ready/src/app/api/orion/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Wire to Orion client from #/lib/integrations/orion
  return NextResponse.json({
    enabled: false,
    authenticated: false,
    todo: 'Wire to Orion integration client',
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  // TODO: Trigger sync via Orion client
  return NextResponse.json({ todo: 'Trigger Orion sync' });
}
```

**Step 3: Repeat for Salesforce and Market data**

**Step 4: Commit**

```bash
git add migration-ready/src/app/api/orion/ migration-ready/src/app/api/salesforce/ migration-ready/src/app/api/market/ migration-ready/src/lib/integrations/
git commit -m "feat(migration): convert integration routes + extract API clients"
```

---

### Task 8: Create Dashboard Component Stubs

**Files:**
- Create: `migration-ready/src/components/dashboard/client-overview.tsx`
- Create: `migration-ready/src/components/dashboard/portfolio-chart.tsx`
- Create: `migration-ready/src/components/dashboard/task-list.tsx`
- Create: `migration-ready/src/components/dashboard/calculator-panel.tsx`

These are placeholder components that use the target library imports. They won't render until `@od-oneapp/uni-ui` is available, but the structure and prop types will be correct.

**Step 1: Create client-overview.tsx**

```tsx
'use client';

// TODO: Uncomment when @od-oneapp/uni-ui is available
// import { Card, CardHeader, CardTitle, CardContent } from '@od-oneapp/uni-ui';
import { User, TrendingUp, AlertCircle } from 'lucide-react';
import type { z } from 'zod';
// import type { clientOverviewSchema } from '#/components/schemas/client';

interface ClientOverviewProps {
  name: string;
  segment: string;
  aum: number;
  riskTolerance: string;
  status: string;
  lastContactDate: string | null;
  healthScore?: number;
}

export function ClientOverview({ name, segment, aum, riskTolerance, status, lastContactDate, healthScore }: ClientOverviewProps) {
  // TODO: Replace div scaffolding with uni-ui Card components
  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center gap-3 mb-4">
        <User className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{name}</h3>
        <span className="text-sm text-muted-foreground">Tier {segment}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">AUM</p>
          <p className="text-xl font-bold">${(aum / 1_000_000).toFixed(2)}M</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Risk Tolerance</p>
          <p className="text-lg">{riskTolerance}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="text-lg">{status}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Last Contact</p>
          <p className="text-lg">{lastContactDate ?? 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create portfolio-chart.tsx** (Recharts stub with `'use client'`)

**Step 3: Create task-list.tsx** (uni-ui Table stub)

**Step 4: Create calculator-panel.tsx** (calculator selector with links)

**Step 5: Commit**

```bash
git add migration-ready/src/components/dashboard/
git commit -m "feat(migration): create dashboard component stubs with uni-ui placeholders"
```

---

### Task 9: Create Calculator UI Component Stubs

**Files:**
- Create: `migration-ready/src/components/calculators/monte-carlo-form.tsx`
- Create: `migration-ready/src/components/calculators/roth-conversion-form.tsx`
- Create: `migration-ready/src/components/calculators/retirement-form.tsx`

Interactive calculator forms. These need `'use client'` since they use `useState` and form handlers.

**Step 1: Create monte-carlo-form.tsx**

A form component that collects Monte Carlo simulation inputs and calls `POST /api/calculators/monte-carlo`. Uses uni-ui form components (stubbed). Displays results with Recharts.

**Step 2: Create roth-conversion-form.tsx**

Form for Roth conversion analysis. Calls `POST /api/calculators/roth`.

**Step 3: Create retirement-form.tsx**

Form for retirement analysis. Calls `POST /api/calculators/retirement`.

**Step 4: Commit**

```bash
git add migration-ready/src/components/calculators/
git commit -m "feat(migration): create calculator form component stubs"
```

---

### Task 10: Create Page Components

**Files:**
- Create: `migration-ready/src/app/(my-app)/page.tsx`
- Create: `migration-ready/src/app/(my-app)/clients/page.tsx`
- Create: `migration-ready/src/app/(my-app)/clients/[clientId]/page.tsx`
- Create: `migration-ready/src/app/(my-app)/clients/[clientId]/portfolio/page.tsx`
- Create: `migration-ready/src/app/(my-app)/clients/[clientId]/behaviors/page.tsx`
- Create: `migration-ready/src/app/(my-app)/tools/[calculator]/page.tsx`

**Step 1: Create main dashboard page** (Server Component — no `'use client'`)

```tsx
// migration-ready/src/app/(my-app)/page.tsx
// Server Component — renders advisor dashboard overview
// TODO: Fetch data from API routes or Server Actions

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Advisor Dashboard</h1>
      <p className="text-muted-foreground">
        Overview of all clients, upcoming tasks, and alerts.
      </p>
      {/* TODO: Wire ClientOverview, TaskList, and alert components */}
    </div>
  );
}
```

**Step 2: Create client list page** (Server Component fetching from API)

**Step 3: Create client detail page** (Server Component with dynamic `[clientId]` param)

```tsx
// migration-ready/src/app/(my-app)/clients/[clientId]/page.tsx
export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  // TODO: Fetch client data from /api/clients/[id]
  // const client = await fetch(`${BASE_URL}/api/clients/${clientId}`).then(r => r.json());

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Client Detail</h1>
      <p>Client ID: {clientId}</p>
      {/* TODO: Wire ClientOverview, PortfolioChart, TaskList */}
    </div>
  );
}
```

**Step 4: Create portfolio and behaviors pages**

**Step 5: Create calculator tools page** (routes to correct calculator form by `[calculator]` param)

**Step 6: Commit**

```bash
git add migration-ready/src/app/\(my-app\)/
git commit -m "feat(migration): create page components for all routes"
```

---

### Task 11: Create Route Map Document

**Files:**
- Create: `migration-ready/route-map.md`

Document every Express route path and its corresponding Next.js file. This is the Rosetta Stone for the migration.

**Step 1: Create route-map.md**

Map all 70 route registration functions from `server/routes.ts` to their target Next.js paths. Format:

```markdown
# Express → Next.js Route Map

| Express Path | Method | Next.js File | Status |
|---|---|---|---|
| `/api/calculators/rmd` | POST | `src/app/api/calculators/rmd/route.ts` | Converted |
| `/api/calculators/budget` | POST | `src/app/api/calculators/budget/route.ts` | Converted |
| `/api/clients` | GET, POST | `src/app/api/clients/route.ts` | Stub |
| `/api/clients/:id` | GET, PATCH | `src/app/api/clients/[id]/route.ts` | Stub |
| `/api/integrations/orion/status` | GET | `src/app/api/orion/route.ts` | Stub |
| ... | ... | ... | ... |
```

Include ALL routes from `server/routes.ts` (lines 6-74), marking each as:
- **Converted**: Full business logic ported
- **Stub**: Next.js file created with TODO comments
- **Not Started**: No file created yet (lower-priority routes)

**Step 2: Commit**

```bash
git add migration-ready/route-map.md
git commit -m "docs(migration): create Express-to-Next.js route mapping document"
```

---

### Task 12: Create Migration Guide

**Files:**
- Create: `migration-ready/MIGRATION-GUIDE.md`

**Step 1: Write the guide**

```markdown
# Migration Guide: Drop-In Instructions

## Prerequisites
- Access to `OneDigital-Product/oneapp-example` repo (GitHub)
- NPM_TOKEN for `@od-oneapp/*` private registry (set in ~/.zprofile)
- Node.js 20+ and pnpm 10+

## Step 1: Clone and Set Up Target Repo
git clone https://github.com/OneDigital-Product/oneapp-example.git
cd oneapp-example
git checkout release
pnpm install --ignore-workspace

## Step 2: Add Required Packages
pnpm add @od-oneapp/ai-platform@canary recharts @tanstack/react-query @tanstack/react-table

## Step 3: Copy Migration-Ready Files
cp -r migration-ready/src/* src/

## Step 4: Uncomment @od-oneapp Imports
Search all files for "TODO: Uncomment" and activate the imports.

## Step 5: Update Import Aliases
Verify '#/' alias is configured in tsconfig.json (should be in the template).

## Step 6: Activate Zod v4
Replace `import { z } from 'zod'` if Zod 4 uses a different import path.

## Step 7: Verify
pnpm typecheck
pnpm lint
pnpm build

## File Origin Map
| Migration-Ready File | Source File | Changes Made |
|---|---|---|
| src/lib/calculators/*.ts | server/calculators/*.ts | None (direct copy) |
| src/components/schemas/*.ts | server/types/ai-render-schemas.ts + server/routes/calculators.ts | Split by domain, export types |
| src/app/api/calculators/*/route.ts | server/routes/calculators.ts | Express → Next.js wrapper |
| src/app/api/clients/route.ts | server/routes/clients.ts | Stub with TODOs |
| src/components/dashboard/*.tsx | client/src/components/dashboard/*.tsx | Rebuilt with uni-ui stubs |
```

**Step 2: Commit**

```bash
git add migration-ready/MIGRATION-GUIDE.md
git commit -m "docs(migration): create step-by-step migration guide"
```

---

### Task 13: Final Verification

**Step 1: Verify all files exist**

```bash
find migration-ready -type f | wc -l
```

Expected: ~40-50 files

**Step 2: Verify no Express imports leaked in**

```bash
grep -rn "from ['\"]express" migration-ready/
```

Expected: No output

**Step 3: Verify no Drizzle imports leaked in**

```bash
grep -rn "drizzle" migration-ready/
```

Expected: No output

**Step 4: Verify all imports use #/ alias for cross-directory**

```bash
grep -rn "from ['\"]\.\./" migration-ready/src/app/ migration-ready/src/components/
```

Expected: No output (all use `#/` alias)

**Step 5: Verify prototype is untouched**

```bash
git diff server/ client/ shared/
```

Expected: No changes (only the `reusePort` fix from earlier)

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat(migration): complete migration-ready package — 13 calculators, schemas, API routes, component stubs"
```
