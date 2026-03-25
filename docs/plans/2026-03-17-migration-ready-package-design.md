# Migration-Ready Package Design: Approach A (Lift and Shift)

**Date:** 2026-03-17
**Author:** Claude Code + Luitze Capodici
**Status:** Approved
**Source:** Wealth Advisory Refactor Plan (March 17, 2026)

## Purpose

Create a `/migration-ready/` directory containing all portable business logic, schemas, API routes, and component stubs organized to match the target OneApp directory structure. When NPM access is granted, these files drop directly into the `oneapp-example` repo with minimal wiring.

## Context

- Current app: Express 5 + React 18 + Vite + Tailwind 3 + Zod 3 + Drizzle ORM
- Target app: Next.js 16 + React 19 + Tailwind v4 + Zod 4 + @od-oneapp/* packages
- Blocker: No access to private oneapp-example repo or @od-oneapp NPM packages yet
- The running prototype is NOT modified by this work

## Directory Structure

```
/migration-ready/
  src/
    app/
      (my-app)/
        page.tsx                     # Advisor dashboard overview
        clients/
          page.tsx                   # Client list
          [clientId]/
            page.tsx                 # Client detail
            portfolio/page.tsx       # Portfolio detail
            behaviors/page.tsx       # Behavioral analysis
        tools/
          [calculator]/page.tsx      # Calculator pages
      api/
        orion/route.ts               # Orion integration
        salesforce/route.ts          # Salesforce integration
        market/route.ts              # Market data
        calculators/
          rmd/route.ts
          roth/route.ts
          retirement/route.ts
          monte-carlo/route.ts
          tax-bracket/route.ts
          withdrawal/route.ts
          concentrated-stock/route.ts
          qsbs/route.ts
          life-insurance/route.ts
          ltc/route.ts
          charitable/route.ts
          budget/route.ts
          asset-location/route.ts
        clients/route.ts
        clients/[id]/route.ts
        meetings/route.ts
        ai/route.ts
    components/
      schemas/
        client.ts                    # Client/household Zod v4 schemas
        portfolio.ts                 # Account/holdings/performance schemas
        behavioral.ts                # Behavioral finance schemas
        compliance.ts                # Compliance/KYC schemas
        calculators.ts               # Calculator input/output schemas
      dashboard/
        client-overview.tsx          # Client card (uni-ui stub)
        portfolio-chart.tsx          # Recharts + ChartContainer stub
        task-list.tsx                # Task list (uni-ui stub)
        calculator-panel.tsx         # Calculator selector
      calculators/
        monte-carlo-form.tsx         # Interactive calculator UIs
        roth-conversion-form.tsx
        retirement-form.tsx
    lib/
      calculators/
        monte-carlo.ts               # Direct copy from server/monte-carlo.ts
        roth-conversion.ts           # Direct copy from server/calculators/
        rmd.ts
        retirement-analysis.ts
        tax-bracket.ts
        withdrawal-analysis.ts
        concentrated-stock.ts
        qsbs.ts
        qsbs-tracker.ts
        life-insurance-gap.ts
        ltc-planning.ts
        charitable-tax.ts
        budget.ts
        asset-location.ts
      integrations/
        orion.ts                     # Orion client (no Express)
        salesforce.ts                # Salesforce client (no Express)
        market-data.ts               # Yahoo Finance / provider logic
  MIGRATION-GUIDE.md                 # Step-by-step instructions
  route-map.md                       # Express path -> Next.js file mapping
```

## Layer Details

### 1. `src/lib/calculators/` - Pure Business Logic (Direct Copy)

All 13 calculators + Monte Carlo engine. These are pure TypeScript functions with:
- Zero Express dependencies
- Zero database dependencies
- Zero UI dependencies
- Typed inputs and outputs via TypeScript interfaces

**Action:** Copy as-is. No changes needed.

### 2. `src/components/schemas/` - Zod v4 JSON Render Schemas

Migrate all Zod schemas from v3 to v4 syntax. Organize by data domain:
- `client.ts`: Client, household, relationship schemas
- `portfolio.ts`: Account, holdings, performance, transaction schemas
- `behavioral.ts`: Behavioral finance scoring, engagement schemas
- `compliance.ts`: KYC/AML, fiduciary, audit schemas
- `calculators.ts`: Input/output schemas for each calculator

Include `@od-oneapp/ai-platform` imports (createObjectOutput, etc.) as commented stubs that activate when the package is available.

### 3. `src/app/api/` - Next.js API Routes

Convert Express route handlers to Next.js Route Handlers:
- `app.get('/path/:id', handler)` becomes `src/app/api/path/[id]/route.ts` with `export async function GET()`
- `app.post('/path', handler)` becomes `export async function POST()`
- Preserve all business logic, change only the HTTP wrapper
- Use `NextResponse.json()` instead of `res.json()`
- Use `request.json()` instead of `req.body`

### 4. `src/components/dashboard/` - UI Component Stubs

Placeholder components using:
- `@od-oneapp/uni-ui` imports (will resolve when available)
- `lucide-react` for icons
- Tailwind v4 utility classes
- `'use client'` directive where interactivity is needed
- Props typed to match the Zod schemas

### 5. `src/lib/integrations/` - API Clients

Extract Orion, Salesforce, and market data client logic:
- Remove Express req/res coupling
- Keep as pure async functions
- Typed inputs/outputs

## Conversion Patterns

### Zod 3 to Zod 4
- Import: `import { z } from 'zod'` (unchanged)
- `z.object()`, `z.enum()`, `z.infer<>` syntax verified against Zod 4 docs
- ESM-first imports only

### Express to Next.js
```
// BEFORE: server/routes/calculators.ts
app.post('/api/calculators/rmd', requireAuth, async (req, res) => {
  const result = calculateRMD(req.body);
  res.json(result);
});

// AFTER: src/app/api/calculators/rmd/route.ts
import { NextResponse } from 'next/server';
import { calculateRMD } from '#/lib/calculators/rmd';
export async function POST(request: Request) {
  const body = await request.json();
  const result = calculateRMD(body);
  return NextResponse.json(result);
}
```

### Import Aliases
All cross-directory imports use `#/` prefix:
```typescript
import { clientSchema } from '#/components/schemas/client';
import { calculateRMD } from '#/lib/calculators/rmd';
```

## Scope Exclusions

- Running prototype is not modified
- No Next.js project setup (no next.config.ts, no package.json)
- No sidebar implementation (Opus team owns this)
- No auth implementation (@od-oneapp/auth handles this)
- No (platform) routes (OneApp fabric owns these)
- No database schema (data comes from Orion/Salesforce APIs)

## Success Criteria

1. All 13 calculators + Monte Carlo copied with zero modifications
2. All Zod schemas converted to v4 syntax and organized by domain
3. All Express routes have a Next.js equivalent with same business logic
4. Component stubs have correct imports and prop types
5. MIGRATION-GUIDE.md provides clear step-by-step drop-in instructions
6. route-map.md documents every Express path to Next.js file mapping
