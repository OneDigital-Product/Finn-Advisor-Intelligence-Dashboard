# OneDigital Wealth Advisor Command Center

## Overview
This project is an AI-powered wealth management command center designed for OneDigital advisors. Its main purpose is to integrate and centralize simulated Salesforce CRM and Orion portfolio data across six core modules, providing advisors with a comprehensive tool for managing client wealth. The platform aims to enhance advisor efficiency, improve client engagement, and streamline wealth management processes through advanced analytics and AI capabilities.

## Phase 1 Focus (Current)
The application is currently scoped to Phase 1 deliverables only. Navigation and dashboard have been restructured to emphasize these 7 core features:
1. **My Day Dashboard** — Priority-sorted daily view with meeting prep (Salesforce + Outlook)
2. **Client 360 View** — Complete client picture with managed/external accounts, documents, notes, activity history (Salesforce + Orion)
3. **Client/Household Data Hub** — People, Households, Organizations, Trusts with family relationships (Salesforce)
4. **Financial Status Integration** — Investment accounts, portfolio holdings, performance data, billing (Orion)
5. **AI Financial Planning Tools** — Monte Carlo simulations, Roth conversion analysis, tax calculators, retirement projections (Native AI Engine)
6. **Calendar & Task Integration** — Full calendar page with day/week/month views, enhanced meetings (attendees, timezone, agenda, description), meeting_notes table with AI summaries, recurring tasks, task convenience endpoints (overdue/upcoming/complete), Outlook conflict resolution
7. **Activity History & Audit Trail** — Full CRUD activity tracking with 12 activity types, metadata, related entity linking, Salesforce sync status, client timeline, CSV/JSON export, general-purpose audit log, enhanced login event tracking with failed attempt blocking, and activity analytics (summary, engagement, productivity, trends)
8. **AI-Driven Insights Dashboard** — Per-client AI-generated insights dashboard with executive summary, financial health score (0-100), portfolio insights, market trends relevant to holdings, prioritized AI recommendations with estimated values, risk indicators with actions, key metrics with trends, and next steps. Backend: POST `/api/ai/insights-dashboard` with advisor-client authorization, compliance guardrails, and response validation. Frontend: `ai-insights-section.tsx` under Phase 1 "AI Insights" nav group.

All non-Phase 1 features (Analytics, Engagement, Research, Compliance, Approvals, Reports, Withdrawals, Custodial, Intake, Fact Finders, Profiles, Discovery, Copilot, Tax Strategy) are moved under a grayed-out "Administration" group in the sidebar. Routes remain functional but are visually de-emphasized. The client detail sidebar similarly separates Phase 1 sections (Overview, Meetings, Financial, Documents, Insurance) from Administration sections. Dashboard widgets were trimmed to remove non-Phase 1 panels (First 100 Days, Pending Approvals, Profiles Expiring, Recent Reports).

### P&C Shield Insurance Diagnostic Engine (Phase 1)
A comprehensive AI-powered P&C Shield Personal Lines Insurance Diagnostic Engine integrated as a Phase 1 tab in the client detail view. Transforms uploaded insurance documents into full calculation-backed diagnostic reports with an 11-step workflow:
- Document Intake & Classification (Step 0) — identifies dec pages, full policies, CLUE reports
- Client Risk Snapshot (Step 1) — named insureds, properties, vehicles, carriers, protection readiness
- Data Quality Gates (Step 2) — document sufficiency, analysis safety, missing context flags
- Coverage Domain Extraction (Step 3) — Homeowners, Auto, Umbrella, Valuable Articles, Carrier Quality
- Carrier Quality Assessment (Step 4) — AM Best ratings, admitted status, guaranty fund coverage
- Calculation Engine (Step 5.5) — 5 quantified calculations: Umbrella Adequacy, Dwelling ITV, Auto Liability, Deductible Optimization, Valuable Articles
- Domain Scoring (Step 6) — 1-10 scores per domain with weighted overall (HO 30%, Auto 20%, Umbrella 30%, VA 10%, CQ 10%)
- Risk Flag Assignment (Step 7) — priority-coded flags (CRITICAL/HIGH/MEDIUM/LOW) with dollar-quantified gaps
- Recommendations & Referral Brief (Step 8) — referral-ready language with copyable P&C Referral Brief
- Advisor Report (Step 9) — technical report with full calculation audit
- Client Summary (Step 10) — jargon-free, plain language summary

Features:
- Optional Client Context panel for supplemental data (net worth, home sq footage, vehicles, etc.)
- Pre-populated from available client data (totalAum, occupation, state)
- Progress stepper showing the 11-step workflow running
- Togglable Advisor Report / Client Summary / Diagnostic Results views
- Expandable domain score cards with extracted coverage tables and calculation audit
- Copyable P&C Referral Brief for producer handoff
- Collapsible Calculation Audit accordion showing all math
- Assumptions table showing what was estimated vs. confirmed
- Questions to Ask Client section for data gaps

Backend: `server/routes/insurance.ts` — Two endpoints: `POST /api/insurance/analyze-upload` (file upload) and `POST /api/insurance/analyze-document` (pasted text). Uses 16384 max tokens for comprehensive diagnostic output. Full P&C Shield system prompt enforces the 11-step workflow and structured JSON response.
Frontend: `client/src/pages/client-detail/insurance-section.tsx` — Rich multi-section diagnostic UI with domain score cards, risk flags, recommendations, referral brief, and togglable report views.

## Design System Reference
The application's UI/UX is aligned with the **reUI Vega** style (https://reui.io). The full extracted design spec is in `references/reui-vega-design-spec.md`. Key properties applied:
- **Chart palette (Vega)**: Deep blue (#1447e6), Teal (#009588), Dark teal (#104e64), Purple (#ac4bff), Amber (#f99c00) in light mode; Bright orange, Emerald, Amber, Gold, Hot pink in dark mode
- **Border radius**: 10px base (0.625rem); Tailwind scale: sm=6px, md=8px, lg=10px, xl=14px; cards rounded-xl (14px), buttons/inputs rounded-md (8px), badges fully rounded (pill)
- **Shadows (Vega-subtle)**: sm=`0 1px 2px rgba(0,0,0,0.03)`, md=`0 2px 4px rgba(0,0,0,0.05)`, lg=`0 4px 8px rgba(0,0,0,0.06)`, xl=`0 8px 24px rgba(0,0,0,0.08)`
- **Component patterns**: Card p-5 with text-base titles; Input bg-transparent with shadow-sm; Dialog bg-black/60 + backdrop-blur-sm + rounded-xl; Chart tooltip rounded-xl + shadow-xl
- **Typography**: Inter as primary sans-serif font, with DM Sans fallback
- **Spacing**: 4px (0.25rem) base unit
- **Card pattern**: Subtle 1px foreground/10% ring border + minimal shadow (0 1px 2px rgba(0,0,0,0.05))
- **Chart tooltips**: Elevated shadow, border/50%, xs font, rounded corners

## User Preferences
I prefer clear, concise, and professional communication. Please prioritize actionable insights and direct answers. For coding, I favor clean, readable, and maintainable code with a focus on modern best practices. I appreciate an iterative development approach where I can review progress frequently. When making significant changes or architectural decisions, please ask for my approval first. I prefer detailed explanations for complex features or architectural choices.

## System Architecture
The application is built with a modern web stack, utilizing **React** for the frontend, **Express.js** for the backend, and **PostgreSQL** as the database. **Drizzle ORM** is used for database interactions. AI capabilities are integrated via the **Vercel AI Gateway** (`@ai-sdk/gateway`) using the `AI_GATEWAY_API_KEY` environment variable, with fallback to direct **OpenAI** (`OPENAI_API_KEY`) and **Cassidy** (`CASSIDY_WEBHOOK_URL`). The AI provider priority chain is: Cassidy → Vercel AI Gateway → Direct OpenAI.

### Backend Route Decomposition
`server/routes.ts` is the orchestrator that imports and calls `registerXxxRoutes(app)` from domain modules in `server/routes/`:
- `auth.ts` (MUST be registered first — sets global `requireAuth` middleware), `clients.ts`, `meetings.ts`, `tasks.ts`, `calendar.ts`, `compliance.ts`, `documents.ts`, `ai.ts`, `analytics.ts`, `admin.ts`, `workflows.ts`, `market.ts`, `scenarios.ts`, `goals.ts`, `alert-generation.ts`, `meeting-processing.ts`, `assessment.ts`, `insights.ts`, `salesforce.ts`, `orion.ts`, `microsoft.ts`, `zoom.ts`, `approvals.ts`, `custodial.ts`, `discovery.ts`, `withdrawals.ts`, `validation.ts`, `nigo.ts`, `fiduciary-compliance.ts`, `behavioral-finance.ts`, `sop.ts`, `kyc-aml.ts`, `engagement.ts`, `research.ts`, `direct-indexing.ts`, `social-intelligence.ts`, `business-succession.ts`
- `activity-history.ts` (activity CRUD, client timeline, CSV/JSON export with audit logging)
- `audit-log.ts` (audit log query, entity trail, advisor trail, report generation)
- `login-events.ts` (login/logout recording, failed attempt tracking with blocking)
- `activity-analytics.ts` (activity summary, client engagement, advisor productivity, trends)
- `philanthropy.ts` (charitable accounts, contributions, grants, goals, CRT modeling, QCD analysis)
- `philanthropic.ts` (DAF accounts/transactions, CRT CRUD, QCD records, charitable tax impact calculator API)
- `cross-module-intelligence.ts` (planning intelligence endpoint aggregating succession, estate, charitable, direct indexing data)

### Charitable Tax Impact Calculator
Located in `server/calculators/charitable-tax-calculator.ts`. Computes AGI-based deduction limits (60% cash/public, 30% appreciated property, 20% private foundation) with aggregate 60% AGI cap, 5-year carryforward modeling, strategy comparison (Cash vs DAF vs CRT vs QCD), CRT Section 7520 present-value calculations, and QCD optimization. API endpoint: `POST /api/philanthropic/tax-impact`. Frontend tab: "Tax Impact" in the philanthropic section (`client/src/pages/client-detail/philanthropic-section.tsx`).
- Shared: `middleware.ts` (requireAuth, requireAdvisor, getSessionAdvisor), `utils.ts` (upload, uploadLimiter, SAMPLE_TRANSCRIPT, renderDiagnosticTemplate, etc.)

### API Input Validation (Zod)
All 10 highest-risk route files use Zod schema validation on POST/PATCH request bodies via a shared `validateBody()` helper in `server/lib/validation.ts`. This helper calls `.safeParse()` and returns a standardized 400 response with `{ message: "Validation failed", errors: [{ path, message }] }`.
- **Validated routes**: `auth.ts`, `ai.ts`, `admin.ts`, `documents.ts`, `cassidy.ts`, `clients.ts`, `meetings.ts`, `workflows.ts`, `reports.ts`, `tasks.ts`
- Schemas are defined at the top of each route file using `z.object()`, `z.enum()`, `.superRefine()` etc.
- Multipart upload endpoints (transcript, document parsing) validate non-file body fields through the same `validateBody` pattern.

### API Response Contracts & Transform Layer (Task #12)
Type-safe API response contract interfaces and transform functions for the MuleSoft experience layer, bridging Orion and Salesforce raw API responses to unified UI types.

**Type files in `server/types/`**:
- `api-response-contracts.ts` — 37+ interfaces with `ApiEnvelope<T>` wrapper, covering Orion endpoints (households, accounts, assets, performance, reporting scope, tax lots, RMDs, balance sheet, billing, transactions, risk, compliance), Salesforce FSC objects (households, person accounts, financial accounts, holdings, goals, revenue, tasks, events, cases, opportunities, documents, beneficiaries, sales goals, compliance items), and composed dashboard/client360/alert responses.
- `api-transforms.ts` — 13 transform functions (`transformOrion*ToUI`, `transformSf*ToUI`) converting raw API shapes to frontend-friendly types, plus `wrapEnvelope()` helper and 2 merge helpers (`mergeOrionSfHouseholds`, `mergeOrionSfAccounts`) for Orion↔SF data reconciliation.
- `orion-api.ts` — Raw Orion API response types (existing).
- `salesforce-fsc.ts` — Raw Salesforce FSC object types (existing).
- `service-types.ts` — `SERVICE_TO_ORION_MAP` with 45 service-to-endpoint mappings and `OrionEndpointKey` union type.

**Feature flags** in `server/services/data-service.ts`:
- `USE_REAL_ORION_API` (env: `USE_REAL_ORION_API=true`) — switches Orion calls from mock/local to live API.
- `USE_REAL_SALESFORCE_API` (env: `USE_REAL_SALESFORCE_API=true`) — switches Salesforce calls from mock/local to live API.
- `USE_REAL_API` — convenience OR of both flags.

**Reference architecture** in `references/`:
- `orion-api-resource-summary.md` — 35 Orion endpoints across 11 resource groups.
- `salesforce-api-resource-summary.md` — 16 SF objects with 20 SOQL queries.
- `sf-json-render-schemas.ts` — 6 AI-facing JSON render schemas (Client Relationship Intelligence, Transcript→SF Actions, Engagement Scoring, Compliance Gap, Household Financial Snapshot, Action Queue).
- `complete-wiring-schema.ts` — 133-element UI↔API wiring map.
- `sf-sample-payloads.json` — 5-household sample payload fixtures.
- `api-response-contracts-spec.txt` — Full specification document (1388 lines).

### Integration Infrastructure (Steps 1.1–1.4)
All integrations live in `server/integrations/{service}/` with corresponding routes in `server/routes/{service}.ts`. Each integration checks env var guards and returns gracefully when not configured.

#### Adapter Pattern (CRM & Portfolio)
CRM and portfolio integrations use an adapter pattern defined in `server/integrations/adapters/`:
- **`CRMAdapter`** interface (`crm-adapter.ts`): Abstracts task/meeting/activity sync, contact/account inbound sync, reconciliation, withdrawal case management.
- **`PortfolioAdapter`** interface (`portfolio-adapter.ts`): Abstracts account/holdings/performance/transaction retrieval, portfolio sync, reconciliation, set-aside/NWR tag management.
- **Registry** (`index.ts`): Manages active provider selection with `getActiveCRM()`, `getActivePortfolio()`, `setActiveCRM()`, `setActivePortfolio()`.
- Admin can switch providers at runtime via `PUT /api/admin/integration-settings`.
- Provider-agnostic routes: `GET/POST /api/integrations/crm/*`, `GET/POST /api/integrations/portfolio/*`.

#### CRM Adapters
- **Salesforce** (`salesforce-crm-adapter.ts`): Wraps existing `server/integrations/salesforce/` modules. Env: `SALESFORCE_ENABLED`, `SALESFORCE_SYNC_ENABLED`, `SALESFORCE_CLIENT_ID`, `SALESFORCE_PRIVATE_KEY`, `SALESFORCE_INSTANCE_URL`.
- **Redtail** (`redtail-crm-adapter.ts`): Redtail CRM REST API adapter. Env: `REDTAIL_ENABLED`, `REDTAIL_API_KEY`, `REDTAIL_USER_KEY`, `REDTAIL_BASE_URL`.

#### Portfolio Adapters
- **Orion** (`orion-portfolio-adapter.ts`): Wraps existing `server/integrations/orion/` modules. Env: `ORION_ENABLED`, `ORION_API_KEY`, `ORION_BASE_URL`, `ORION_TIMEOUT` (ms, default 30000), `ORION_RETRY_COUNT` (default 3), `PORTFOLIO_SYNC_INTERVAL` (ms, default 14400000 / 4 hours).
- **Black Diamond** (`blackdiamond-portfolio-adapter.ts`): Black Diamond (Advent) REST API adapter with OAuth2 client credentials. Env: `BLACK_DIAMOND_ENABLED`, `BLACK_DIAMOND_CLIENT_ID`, `BLACK_DIAMOND_CLIENT_SECRET`, `BLACK_DIAMOND_BASE_URL`.
- **MuleSoft WAD** (`mulesoft-portfolio-adapter.ts`): MuleSoft Wealth Advisory Dashboard EAPI adapter with OAuth2 client_credentials flow. Client module (`server/integrations/mulesoft/client.ts`) handles token acquisition, in-memory caching with TTL, and auto-refresh. API module (`server/integrations/mulesoft/api.ts`) provides authenticated fetch with 401/403 retry. Currently live: `/v1/Portfolio/Clients/Value` (household list with AUM). Stubbed (pending MuleSoft delivery): `/v1/Portfolio/Clients/{id}/Accounts/Value`, `/v1/Portfolio/Clients/{id}/Assets`, `/v1/Reporting/Scope`. Env: `MULESOFT_ENABLED`, `MULESOFT_AUTH_URL`, `MULESOFT_CLIENT_ID`, `MULESOFT_CLIENT_SECRET`, `MULESOFT_SCOPE` (optional), `MULESOFT_API_BASE_URL`.

#### Other Integrations
- **Microsoft 365** (`server/integrations/microsoft/`): Graph API client, Outlook calendar sync (bidirectional), email via SendGrid or SMTP fallback. Env: `MICROSOFT_ENABLED`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`, `EMAIL_ENABLED`, `SENDGRID_API_KEY` or `SMTP_*`.
- **Zoom** (`server/integrations/zoom/`): JWT auth, meeting creation with auto-recording, webhook handler for recording.completed, recording download/processing. Env: `ZOOM_ENABLED`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`, `ZOOM_WEBHOOK_SECRET`.

Integration DB tables: `salesforce_sync_log`, `orion_sync_log`, `orion_reconciliation_report`, `email_log`, `zoom_recordings`, `meeting_transcripts`. Integration columns added to: clients, accounts, holdings, transactions, tasks, meetings, activities.

### Calendar & Task Integration (Feature 1.6)
**New DB tables**: `meeting_notes` (structured note records with AI summaries and action items), `recurring_tasks` (task recurrence patterns: daily/weekly/monthly with daysOfWeek/dateOfMonth support).
**Enhanced columns**: `meetings` table gained `meeting_description`, `timezone`, `attendees` (JSONB), `agenda` (JSONB). `tasks` table gained `completed_at` timestamp.
**Calendar routes** (`server/routes/calendar.ts`): `GET /api/calendar?from=&to=` returns meetings in date range.
**Meeting notes routes** (`server/routes/meetings.ts`): `GET/POST /api/meetings/:id/notes-records` for structured note records (separate from inline `notes` field). POST auto-generates AI summary + action items and creates linked tasks.
**Task convenience routes** (`server/routes/tasks.ts`): `GET /api/tasks/overdue`, `GET /api/tasks/upcoming?days=N`, `PUT /api/tasks/:id/complete` (sets completedAt, spawns next recurring instance), `GET/POST /api/tasks/:id/recurring` (toggle recurring on/off).
**Outlook conflict resolution** (`server/routes/microsoft.ts`): `POST /api/microsoft/outlook/resolve-conflict` with `keep_local` (pushes to Outlook) or `use_remote` (pulls from Outlook).
**Frontend**: `client/src/pages/calendar.tsx` with day/week/month views, quick-add meeting modal, task convenience panel (overdue/upcoming filters, one-click complete, recurring toggle). Meeting detail dialog enhanced with attendees, timezone, agenda, description fields and notes-records tab.
**Migration**: `migrations/0014_calendar_task_integration.sql`.

### Withdrawal & Trade Execution Workflow
Complete withdrawal request workflow with multi-step execution pipeline. Routes in `server/routes/withdrawals.ts`, frontend page at `client/src/pages/withdrawals.tsx`.

**DB Tables**: `withdrawal_requests` (status-tracked requests with Orion/SF/Eclipse integration fields), `withdrawal_audit_log` (action audit trail per withdrawal).

**Workflow Steps**:
1. Advisor creates withdrawal request (client, account, amount, method, reason, frequency, tax withholding)
2. Orion set-aside creation + NWR tag application (`server/integrations/orion/set-aside.ts`)
3. Salesforce case creation for tracking (`server/integrations/salesforce/withdrawal-case.ts`)
4. Eclipse import CSV generation for trade execution (`server/integrations/eclipse/import-generator.ts`)
5. Trade confirmation → automatic NWR tag removal + SF case closure
6. Full audit trail for every action

**Status Flow**: pending → nwr_applied → sf_case_created → eclipse_generated → completed (or cancelled at any point)

**Integration Graceful Degradation**: All Orion/SF integrations return mock IDs when services are not configured (env vars not set), allowing the workflow to function in development without live integrations.

### Scheduled Job Runner
Lightweight cron-based scheduler (`server/scheduler.ts`) using `node-cron`, started on server boot and stopped on graceful shutdown. Disabled via `DISABLE_SCHEDULER=true` env var.

Scheduled jobs (all times America/New_York):
- **Alert generation**: every 6 hours — runs `AlertEngine.run()` for all advisors
- **Reminder checks**: daily at 8am — runs `checkAndCreateReminders()` for all advisors
- **Insight generation**: weekly Monday 2am — runs `generateInsightsForAdvisor()` for all advisors (with expired insight pruning)
- **Market data prefetch**: every 30min during market hours (9:30am–4pm ET, weekdays) — runs `prefetchEngine.prefetchClientPortfolios()` for all advisors
- **Stale Cassidy job cleanup**: every hour — marks `pending`/`processing` jobs older than 2 hours as `timed_out`

- **Onboarding milestone checks**: daily at 9am — runs `checkMilestoneProgression()` for all advisors, sends milestone emails and transitions completed onboardings

Features: per-job concurrency guard (skips overlapping runs), structured logging (start/complete/fail with duration), graceful shutdown awaits in-flight jobs (15s timeout).

### Pre-Case Submission Validator
Engine at `server/engines/pre-case-validator.ts` runs four validation modules before case submission: new account checks (profile completeness, custodian assignment), billing/fee integrity (balance thresholds, model assignment), data integrity cross-checks (account number uniqueness, holdings reconciliation), and M&A conflict detection (employer overlap, concentrated positions, pending compliance items). Results stored in `pre_case_validations` table. API: `POST /api/clients/:clientId/validate`, `GET /api/clients/:clientId/validations`. UI in client detail Operations → Pre-Case Check tab.

### Withdrawal Request Workflow
Full operational pipeline: form submission → Salesforce case creation → Orion NWR tag → Eclipse queue file generation → status tracking pipeline. Schema table `withdrawal_requests` tracks all stages. API: `GET/POST /api/withdrawals`, `PATCH /api/withdrawals/:id`, `GET /api/withdrawals/stats`. UI in client detail Operations → Withdrawals tab with visual pipeline tracker and action buttons for advancing status.

### Social Intelligence Module
Relationship intelligence via social media monitoring. Routes in `server/routes/social-intelligence.ts`, frontend tab "Social Intel" under AI Tools in client detail (`client/src/pages/client-detail/social-intelligence-section.tsx`).

**DB Tables**: `social_profiles` (LinkedIn profile links with monitoring toggle per client), `social_events` (detected social activity events with outreach generation).

**Features**:
- Social profile linking with LinkedIn URLs stored on client records
- Public activity monitoring simulation for linked profiles (job changes, promotions, company milestones, life events, education, awards, publications)
- Social event alerts with read/unread tracking
- AI-generated outreach prompts based on detected social events (OpenAI with fallback templates)
- Social intelligence activity feed on client detail page
- Privacy-compliant data handling with per-profile monitoring opt-in/opt-out toggle

**API routes**:
- `GET /api/clients/:clientId/social-profiles` — List linked social profiles
- `POST /api/clients/:clientId/social-profiles` — Link a new social profile
- `PATCH /api/social-profiles/:id` — Update profile settings (monitoring toggle, etc.)
- `DELETE /api/social-profiles/:id` — Remove a linked profile and its events
- `GET /api/clients/:clientId/social-events` — List detected social events
- `POST /api/social-profiles/:profileId/events` — Manually add a social event
- `PATCH /api/social-events/:id/read` — Mark event as read
- `POST /api/social-events/:id/generate-outreach` — Generate AI outreach prompt for an event
- `POST /api/clients/:clientId/social-monitor` — Run monitoring scan (simulated detection)

### NIGO Dashboard & Custodial Reporting
Dedicated page at `/custodial-reporting` for tracking Not In Good Order items by custodian. Schema table `nigo_items` with custodian breakdown, RMD aggregation by custodian and year. API: `GET/POST /api/nigo`, `PATCH /api/nigo/:id`, `GET /api/nigo/stats`. Supports filtering by status and custodian, RMD amount tracking, resolution workflow (pending → in_review → resolved/escalated).

### Marketing Engagement & Next-Best-Action Engine
Engagement tracking and intent-based action recommendation system in `server/engines/engagement-scoring.ts`, `server/engines/intent-signal-engine.ts`, and `server/engines/next-best-action-engine.ts`. Routes in `server/routes/engagement.ts`. Frontend page at `client/src/pages/engagement.tsx` (route: `/engagement`).

**DB Tables**: `engagement_events`, `engagement_scores`, `intent_signals`, `next_best_actions`

**Features**:
- Engagement event tracking (email opens, clicks, website visits, content downloads, webinar attendance, pricing page views)
- Composite engagement scoring (frequency, recency, diversity factors) with trend detection
- Intent signal detection with 6 rules: content binge, pricing interest, high-frequency visits, webinar engagement, high email engagement, re-engagement after silence
- Next-best-action recommendation engine generating prioritized actions based on signals, scores, AUM, and contact recency
- Deduplication on signal and action generation to prevent queue inflation
- One-click action completion/dismissal with Salesforce activity sync
- 4-tab UI: Overview dashboard, Action Queue, Intent Signals, Activity Timeline

### Onboarding First-100-Days Engine
Structured 100-day onboarding program in `server/engines/onboarding-engine.ts` with milestone tracking, automated email notifications, and paperwork completion tracking for new clients.

**Milestones**: Day 1 (Welcome), Day 7 (Foundation), Day 14 (Account Setup), Day 30 (Planning), Day 60 (Implementation), Day 90 (First Review), Day 100 (Graduation).

**Features**:
- Automatic milestone progression engine with date-based tracking
- Automated email notifications at each milestone with progress summaries
- Status classification: on_track, at_risk, behind, completed
- Paperwork completion tracking (integrates with document_checklist table)
- Dashboard widget showing active onboardings with progress bars

**API routes** (`server/routes/onboarding.ts`):
- `GET /api/onboarding/active` — List all active first-100-days onboardings
- `POST /api/onboarding/create` — Create a first-100-days workflow for a client
- `POST /api/onboarding/check-milestones` — Check and progress milestones, send email notifications
- `GET /api/onboarding/:clientId/status` — Get onboarding status for a specific client

**Dashboard**: The "First 100 Days" widget on the main dashboard shows active onboardings with progress bars, milestone status, overdue items, and outstanding paperwork indicators.

**Automation**:
- Scheduled job runs daily at 9am ET to check milestone progression and send automated emails
- Automatically creates First 100 Days workflow when new clients are synced from Salesforce
- Completion celebration email sent when all milestones are completed

**Seed data**: First 100 Days template and two active onboarding workflows (Priya Patel at Day ~35 with 4/7 milestones, James Chen at Day ~12 with 2/7 milestones).

### Direct Indexing & Tax-Lot Management
Tax-lot level tracking, direct index portfolio creation, lot-level harvesting, wash-sale tracking, tracking difference reporting, and tax alpha attribution.

**Schema tables** (`shared/schema.ts`): `taxLots`, `directIndexPortfolios`, `washSaleEvents` with proper indices and foreign keys.

**Engine** (`server/engines/direct-indexing-engine.ts`): 6 engines — portfolio generation (S&P 500, Total Market), harvestable lot identification, wash-sale tracker, tracking difference reporting, tax alpha attribution. Auto-generates tax lots from existing holdings.

**API routes** (`server/routes/direct-indexing.ts`, all require auth):
- `GET /api/clients/:clientId/tax-lots` — Tax lots (auto-generates from holdings if empty)
- `GET /api/accounts/:accountId/tax-lots` — Tax lots by account
- `GET /api/clients/:clientId/harvestable-lots` — Harvestable loss identification
- `GET /api/clients/:clientId/wash-sale-tracker` — Wash sale tracking
- `POST /api/clients/:clientId/wash-sale-events` — Create wash sale event
- `GET/POST /api/clients/:clientId/direct-index-portfolios` — Direct index portfolios
- `GET /api/direct-index-portfolios/:portfolioId/tracking` — Tracking difference report
- `GET /api/clients/:clientId/tax-alpha` — Tax alpha attribution
- `GET /api/direct-indexing/indices` — Available indices

**Frontend** (`client/src/pages/client-detail/direct-indexing-section.tsx`): 5 tabs — Tax Lots, Harvestable Losses, Wash Sales, Direct Index Portfolios, Tax Alpha. Integrated into client detail page via `client-tabs.tsx`.

**Storage** (`server/storage.ts`): 10 methods — CRUD for tax lots, direct index portfolios, and wash sale events.

### Security Hardening & AI Guardrails (Sprint 1)
Three-layer defense for AI endpoints and financial compliance:

1. **Prompt Injection Sanitizer** (`server/lib/prompt-sanitizer.ts`): Middleware that strips prompt injection patterns (role reassignment, system prompt extraction, jailbreak attempts, template injection, control characters) from all user-supplied fields before they reach OpenAI prompts. Applied in `server/routes/ai.ts` and `server/routes/meeting-processing.ts`.

2. **Fiduciary Guardrail** (`server/lib/fiduciary-guardrail.ts`): Post-processing agent that scans all AI-generated output against a configurable SEC/FINRA compliance ruleset before returning to the frontend. Rules include: no guaranteed returns, no risk-free claims, no specific security recommendations without disclosure, no tax/legal advice impersonation, no market timing predictions, no licensed professional impersonation. Violations are either blocked (text replaced) or flagged (disclaimer appended). Integrated into `chatCompletion()` in `server/ai-core.ts`.

### AI Module Architecture (v3.3)
The AI layer uses a three-tier architecture:
- **`server/ai-core.ts`**: Shared AI primitives — OpenAI/Gateway/Cassidy client management, `chatCompletion()`, `chatCompletionWithMeta()`, `sanitizeForPrompt()`, `isAIAvailable()`, and all shared type interfaces (`HoldingData`, `MeetingPrepInput`, `ChatCompletionMeta`, etc.). No circular dependencies — this is the lowest-level module.
- **`server/prompts/`**: v3.3 meeting function modules with upgraded system prompts and structured I/O:
  - `types.ts` — v3.3 TypeScript interfaces for all structured I/O (V33MeetingPrepResult, V33MeetingSummaryResult, V33TalkingPointsResult, V33ActionItemsResult, V33FollowUpEmailResult, plus domain enums: MeetingType, PlanningDomain, ActionOwner, etc.)
  - `parse-utils.ts` — Markdown-to-structured-data parsers for extracting v3.3 typed metadata from AI-generated content
  - `01-meeting-prep.ts` — `generateMeetingPrep()` (string) + `generateMeetingPrepStructured()` (V33MeetingPrepResult with data freshness, drift alerts, goal progress, compliance flags)
  - `02-meeting-summary.ts` — `generateMeetingSummary()` (string) + `generateMeetingSummaryStructured()` (V33MeetingSummaryResult with decisions, compliance moments, sentiment, dual advisor/client output)
  - `03-talking-points.ts` — `generateTalkingPointsWithMeta()` (ChatCompletionMeta) + `generateTalkingPointsStructured()` (V33TalkingPointsResult with conversation flow, parsed points, delivery guidance)
  - `04-action-items.ts` — `extractActionItems()` (string) + `extractActionItemsStructured()` (V33ActionItemsResult with parsed actions, critical path, owner workload)
  - `05-follow-up-email.ts` — `generateFollowUpEmail()` (string) + `generateFollowUpEmailStructured()` (V33FollowUpEmailResult with subject line, action items, compliance review, next meeting)
  - `index.ts` — barrel re-export of all functions, structured variants, and v3.3 types
- **`server/openai.ts`**: Backward-compatible facade that re-exports everything from `ai-core.ts` and `prompts/index.ts`, plus non-meeting AI functions (insights, diagnostics, document parsing, sentiment, etc.). All 16+ files importing from `server/openai.ts` continue to work unchanged.

3. **Database-Backed Rate Limiting** (`server/lib/db-rate-limiter.ts`): PostgreSQL-backed store for express-rate-limit that persists rate limit state across server restarts. Uses `rate_limit_general` and `rate_limit_login` tables with automatic cleanup of expired entries. Replaces the previous in-memory store in `server/index.ts`.

**Unit Test Coverage**: 263 tests covering RMD calculator, budget calculator, Monte Carlo engine, assessment engine scoring, prompt sanitizer, fiduciary guardrail, and all 12 alert/insight generators.

### Alert Generation Engine (Step 2.1)
Automated alert system in `server/engines/` with 6 generators in `server/engines/generators/`:
- **RMD Generator**: Flags clients at/near RMD age 73 (critical at 73, warning at 72 within 180 days)
- **Birthday Generator**: Birthdays within 30 days, milestone ages (50,60,65,70,75,80,85,90,95,100)
- **Transaction Generator**: Large transactions >$100K (warning) or >$500K (critical) in last 7 days
- **Rebalance Generator**: Portfolio allocation drift vs `portfolio_targets` table — >5% (warning), >10% (critical)
- **Contact Cadence Generator**: Overdue contact based on AUM tier ($5M+: 30 days, $1M+: 90 days, else: 180 days)
- **Compliance Generator**: Compliance items due within 14 days (critical), 30 days (warning), or overdue (critical)

Engine orchestrator (`server/engines/alert-engine.ts`) runs generators in parallel, deduplicates via `server/lib/alert-deduplicator.ts` (24h window, highest severity wins), batch inserts, and returns summary stats.

DB tables: `alert_config` (per-advisor alert type preferences), `portfolio_targets` (per-client asset class allocation targets). Columns added to `alerts`: `alert_type` (varchar 50), `dismissed_at` (timestamp). Indexes on `alert_type`, `dismissed_at`, `portfolio_targets(client_id)`.

API routes (`server/routes/alert-generation.ts`): `POST /api/alerts/generate`, `GET /api/alerts/dashboard`, `PATCH /api/alerts/:id/dismiss`, `GET /api/alerts/config`, `PATCH /api/alerts/config`, `POST /api/alerts/prune`. Existing `GET /api/alerts` enhanced with severity/type/clientId filtering.

### Fiduciary Compliance Agent (AI Guardrail)
Silent compliance validation layer in `server/engines/fiduciary-compliance.ts` that intercepts all AI-generated content before delivery to advisors. Validates against SEC/FINRA fiduciary rules.

**Rule Engine** — 11 configurable rules across 6 categories:
- **Suitability** (SUIT-001, SUIT-002): Unsuitable aggressive recommendations, concentrated position advice. SUIT-001 includes context-aware check against client risk tolerance.
- **Risk Disclosure** (RISK-001, RISK-002): Missing risk disclosures on investment recommendations, downplaying risk.
- **Performance Claims** (PERF-001, PERF-002): Performance guarantees, unrealistic return projections.
- **Promissory Language** (PROM-001, PROM-002): Promises of outcomes, future outcome assurances.
- **Cherry-picked Data** (CHRP-001): Selective time period performance without benchmarks/disclaimers.
- **Misleading Statements** (MISL-001, MISL-002): Superlative claims, urgency pressure tactics.

**Validation outcomes**: `clean` (pass-through), `flagged` (annotated with warnings), `blocked` (held for compliance officer review). Fail-closed: if validation itself errors, content is blocked.

**Integration points**: AI routes (`server/routes/ai.ts` — action items, follow-up emails, talking points, insights, NL queries), meeting pipeline (`server/engines/meeting-pipeline.ts` — summary and follow-up email), assessment engine (`server/engines/assessment-engine.ts` — domain recommendations and summary).

**Admin config**: Rules can be enabled/disabled, severity changed (warning/block), global enable/disable, block threshold configurable. Config persisted to DB and loaded on startup.

DB tables: `fiduciary_validation_logs` (audit trail with outcome, matches, resolution), `fiduciary_rule_configs` (persisted rule configuration).

API routes (`server/routes/fiduciary-compliance.ts`): `POST /api/fiduciary/validate`, `GET /api/fiduciary/rules`, `PATCH /api/fiduciary/rules`, `PUT /api/fiduciary/config`, `GET /api/fiduciary/audit-log`, `GET /api/fiduciary/audit-log/:id`, `POST /api/fiduciary/audit-log/:id/resolve`, `GET /api/fiduciary/stats`. All routes require authentication; write operations require advisor role.

### Meeting Summarization Pipeline (Step 2.2)
End-to-end meeting processing pipeline in `server/engines/meeting-pipeline.ts` — orchestrates existing AI functions into a single "Process Meeting" action:
1. Validate meeting has content (notes/transcript) and associated client
2. Gather client data (holdings, accounts, tasks, life events, performance)
3. Generate AI meeting summary via `generateMeetingSummary()`
4. Extract action items via `extractActionItems()` with parsing (owner, priority, due date)
5. Auto-create tasks from action items (respects per-advisor config)
6. Async Salesforce sync via `server/services/meeting-salesforce-sync.ts` (retry with exponential backoff)
7. Generate follow-up email via `generateFollowUpEmail()`

DB table: `meeting_processing_config` (per-advisor pipeline settings: autoCreateTasks, syncToSalesforce, generateFollowUpEmail, defaultTaskPriority, defaultTaskDueDays, emailTemplate). Column added to `meetings`: `summary_generated` (boolean).

API routes (`server/routes/meeting-processing.ts`): `POST /api/meetings/:id/process` (full pipeline), `POST /api/meetings/:id/process/email` (email only), `GET /api/meetings/:id/process/config`, `PATCH /api/meetings/:id/process/config`.

Frontend: "Process" tab in MeetingDetailDialog (meetings.tsx), "Process Meeting" button in MeetingDetailContent (meetings-section.tsx). Shows summary, action items with owner/priority/due date, tasks created count, follow-up email with copy button, Salesforce sync status.

### AI Assessment Engine & PDF Export (Step 2.3)
Server-side AI-powered financial assessment engine in `server/engines/assessment-engine.ts` that analyzes clients across 7 planning domains:
- **Cash Flow & Budgeting**: Liquidity analysis, cash allocation, deposit/withdrawal patterns
- **Investment & Portfolio**: Holdings concentration, sector allocation, unrealized gains/losses, YTD returns
- **Insurance Coverage**: Coverage adequacy based on assets, dependents, occupation
- **Tax Optimization**: Tax-deferred/Roth/taxable allocation, tax-loss harvesting opportunities
- **Retirement Planning**: Retirement readiness, projected income (4% rule), years to retirement
- **Estate & Legacy**: Estate planning status, high-net-worth considerations
- **Education Funding**: 529/education account analysis, dependent education needs

Each domain calls `generateAssessment()` in `server/openai.ts` with domain-specific prompts constructed from actual client data. Results are parsed, normalized (status: action_needed/on_track/review, score: 0-100), and stored in the `assessments` table. In-memory cache with 7-day TTL.

**PDF Generation**: `server/pdf/base-pdf.ts` (BrandedPDF base class using pdfkit) + `server/pdf/assessment-pdf.ts` (AssessmentPDF with cover page, executive summary, domain sections, disclosures). OneDigital branded with #1E4B82 primary color.

DB tables: `assessments` (id, clientId, advisorId, overallScore, assessmentData jsonb, criticalActions jsonb, summary, generatedAt, expiresAt, createdAt, updatedAt), `assessment_pdfs` (id, assessmentId, type, fileName, fileSize, downloadCount, createdAt).

API routes (`server/routes/assessment.ts`): `POST /api/clients/:id/assessment` (generate), `GET /api/clients/:id/assessment` (fetch latest), `GET /api/clients/:id/assessment/history`, `GET /api/clients/:id/assessment-pdf` (download PDF), `POST /api/clients/:id/assessment-pdf/email`. All routes require auth + advisor role + IDOR check.

Frontend: `diagnostics-section.tsx` now has two tabs — "Financial Assessment" (server-side 7-domain assessment with score ring, domain cards with expandable details, critical actions, PDF download, email) and "AI Diagnostics" (existing diagnostic analysis).

### AI Estate Analysis Panel
The estate planning section (`client/src/pages/client-detail/estate-planning-section.tsx`) includes an "AI Analysis" subtab that integrates with the Cassidy multi-agent system. It provides four analysis modes: Full Analysis (chains Planning Triage → Knowledge Retrieval → Report Writer), Tax Optimization Scenarios, Regulatory Change Alerts, and Summary Report. The panel serializes the client's full estate context (trust structures, beneficiary data, gift history, exemption utilization, sunset alert status, tax analysis) into the Cassidy `client_context` payload. Results are displayed as collapsible recommendation cards, each labeled by the producing agent with confidence levels and suggested actions. Uses `useCassidyJob` hook for SSE-based job tracking. The `useCassidyJob` hook properly resets state (loading, data, error) when jobId changes or becomes null.

### Cross-Module Planning Intelligence
`server/routes/cross-module-intelligence.ts` provides a `GET /api/clients/:clientId/planning-intelligence` endpoint that aggregates data across business succession, estate planning, charitable/philanthropic, and direct indexing modules. Returns structured insights about cross-domain impacts (succession→estate, charitable→tax, direct indexing→tax, estate→insurance, holistic) with severity levels (action_needed, opportunity, info) and module summary metrics. The assessment engine (`server/engines/assessment-engine.ts`) is enriched with business entity, CRT, DAF, and direct indexing data for estate and insurance domain scoring. Frontend: "Planning Intel" tab under AI Tools in client detail (`client/src/pages/client-detail/planning-intelligence-section.tsx`).

### Proactive Insights Engine (Step 2.4)
Rule-based insights discovery system in `server/engines/insights-engine.ts` that scans the advisor's client book and surfaces 6 types of actionable insights:

**6 Insight Generators** (`server/engines/generators/`):
- **Underinsurance** (`underinsurance-generator.ts`): Estimates income from AUM (4% rule), parses notes for dependents/spouse, calculates coverage gap. Threshold: gap ≥ $50k.
- **Tax-Loss Harvesting** (`tax-harvesting-generator.ts`): Scans holdings for unrealized losses >5% of cost basis. Estimates tax savings at 25% rate. Threshold: savings ≥ $1,250.
- **Estate Planning Gap** (`estate-gap-generator.ts`): Detects missing trust/will/POA for high-net-worth, elderly, or clients with dependents. Also flags missing beneficiary designations on retirement accounts.
- **Engagement Risk** (`engagement-generator.ts`): Analyzes quarterly activity frequency over 12 months. Flags declining engagement >20%.
- **AUM Decline/Underperformance** (`aum-trend-generator.ts`): Compares client portfolio returnPct vs benchmarkPct. Flags underperformance >3%.
- **Concentration Risk** (`concentration-generator.ts`): Identifies single-position >30% of portfolio or sector >40%. Severity scales with concentration level.

Engine orchestrator (`server/engines/insights-engine.ts`): `generateInsightsForAdvisor()` fetches all clients, runs 6 generators in parallel per client (batches of 5), deduplicates by clearing non-dismissed insights before inserting. Also: `generateInsightsForClient()`, `pruneExpiredInsights()`.

DB table: `insights` (id uuid, clientId, advisorId, insightType, severity, title, description, opportunity, recommendedAction, estimatedValue decimal nullable, metrics jsonb, confidence int 0-100, isRead boolean, isDismissed boolean, dismissedAt timestamp, createdAt, expiresAt). Indexes on (advisorId, createdAt DESC), (clientId, insightType), (severity, confidence DESC), (expiresAt).

API routes (`server/routes/insights.ts`): `POST /api/insights/generate`, `GET /api/insights/dashboard`, `GET /api/insights/book-wide`, `GET /api/insights/opportunities`, `GET /api/clients/:id/insights`, `POST /api/clients/:id/insights/generate`, `PATCH /api/insights/:id/read`, `PATCH /api/insights/:id/dismiss`.

Frontend: Dashboard has "Proactive Insights" widget in right column (above Alerts) showing severity counts, top 5 insights with read/dismiss. Client detail has "Insights" tab under AI Tools group with full insight cards, scan button, severity badges, estimated values.

### Frontend Client Detail Decomposition
`client/src/pages/client-detail.tsx` (~394 lines) is the orchestrator importing from `client/src/pages/client-detail/`:
- `use-client-data.ts` — `useClientData()` custom hook centralizing all data-fetching (useQuery), mutations (useMutation), tab state, and derived data (pieData, perfData, clientMeetings)
- `client-tabs.tsx` — `ClientTabs` component handling tab content rendering and TaskSidebar layout (mobile/desktop)
- `retirement-section.tsx` — `RetirementSection` (Monte Carlo simulation scenarios, events, charts)
- `shared.tsx` — ClientDetailNav, SourcePill, formatCurrency, formatFullCurrency, COLORS, eventIcon, BASE_NAV_GROUPS, MOBILE_TASKS_GROUP, WorkflowInstanceCard, getReachableSteps
- `overview-section.tsx` — OverviewSection (contact, accounts, performance chart, household, life events)
- `portfolio-section.tsx` — PortfolioSection (allocation pie, performance summary, holdings table with live market data, alternative assets, news)
- `meetings-section.tsx` — MeetingsSection (meeting list, create/transcript dialog, prep/summarize mutations, MeetingDetailContent)
- `documents-section.tsx` — DocumentsSection (checklist, upload/parse, documents list)
- `diagnostics-section.tsx` — DiagnosticsSection (AI assessment, report history, PDF export)
- `insights-section.tsx` — InsightsSection (proactive insights per client, scan, read/dismiss)
- `behavioral-section.tsx` — BehavioralSection (sentiment analysis, behavioral risk scoring, de-escalation scripts, coaching notes, sentiment timeline)

### Institutional Research Feed
Research feed aggregation engine in `server/engines/research-engine.ts` that pulls and processes institutional research content from configurable sources (JPM, Goldman, BlackRock, Vanguard, Fidelity).

**Features:**
- **Research Ingestion**: Ingest articles via API with automatic AI-powered summarization and topic tagging
- **AI Summarization**: Generates concise summaries, key takeaways, topic tags and relevance tags using OpenAI with keyword-based fallback
- **Topic Tagging**: Auto-tags research by topic (macro, equity, fixed_income, alternatives, tax, estate, retirement, esg)
- **Client-Research Matching**: Surfaces research relevant to specific client portfolios based on holdings, account types, and sectors
- **Meeting Prep Integration**: Automatically includes relevant institutional research highlights in AI-generated meeting prep briefs
- **Research Library UI**: Searchable, filterable research library page at `/research` with topic and source filters, tabbed Articles/Feeds views
- **RSS/Atom Feed Ingestion**: Automated ingestion from configurable RSS/Atom feed URLs with built-in XML parser
- **Feed Management UI**: Add, remove, test, pause/resume, and manually fetch research feeds from the Feeds tab
- **Deduplication**: Prevents duplicate articles via URL matching and SHA-256 content hash comparison
- **Feed Health Monitoring**: Tracks last fetch time, error counts, article counts per feed source
- **Scheduled Ingestion**: Feed fetching runs every 6 hours via the scheduler (`server/scheduler.ts`), respecting per-feed interval configuration
- **SSRF Protection**: Feed URL validation blocks private/reserved network addresses and non-HTTP(S) schemes

**DB Tables**:
- `research_articles` — stores source, title, content, AI summary, key takeaways, topics array, relevance tags array, publication date, content_hash, feed_id
- `research_feeds` — stores feed name, URL, category, fetch interval, status (active/paused), last fetch time, error count, article count

**Routes**: `server/routes/research.ts` — GET /api/research, GET /api/research/:id, POST /api/research/ingest, POST /api/research/:id/reprocess, DELETE /api/research/:id, GET /api/clients/:clientId/research, GET /api/research/feeds, GET /api/research/feeds/:id, POST /api/research/feeds, PATCH /api/research/feeds/:id, DELETE /api/research/feeds/:id, POST /api/research/feeds/test, POST /api/research/feeds/:id/fetch
**Engine**: `server/engines/feed-ingestion-engine.ts` — RSS/Atom parser, feed fetching, deduplication, batch ingestion
**Frontend**: `client/src/pages/research.tsx`

### Behavioral Finance Agent
AI-powered behavioral finance analysis system in `server/engines/behavioral-finance.ts` that analyzes client communication patterns for emotional indicators and provides evidence-based de-escalation strategies.

**Features:**
- **Sentiment Analysis**: AI-powered analysis of meeting transcripts, emails, and other communications detecting anxiety, panic, euphoria, and other emotional states. Uses `analyzeSentiment()` in `server/openai.ts` with keyword-based fallback when AI unavailable.
- **Behavioral Risk Scoring**: 0-100 risk score based on communication patterns, with trend tracking (increasing/decreasing/stable).
- **Bias Detection**: Identifies behavioral biases (Loss Aversion, Recency Bias, Herd Mentality, Overconfidence, Anchoring, Status Quo Bias) with confidence levels and evidence.
- **De-Escalation Script Library**: 8 curated evidence-based scripts for common behavioral biases with research citations (Kahneman, Tversky, Thaler, etc.). Filterable by bias type.
- **Proactive Volatility Alerts**: Automatic alert generation when client sentiment shifts significantly — critical (risk >75) and warning (risk >55) levels.
- **Meeting Prep Integration**: Behavioral coaching notes automatically included in meeting prep briefs when client shows elevated anxiety (`generateMeetingPrep` in `server/openai.ts`).
- **Sentiment Timeline**: Visual chart showing emotional patterns over time with color-coded sentiment dots.

**Schema**: `behavioral_analyses` table with sentiment, sentiment_score, behavioral_risk_score, dominant_bias, bias_indicators (JSONB), anxiety_level, source_type, coaching_notes, de_escalation_strategy, market_condition, metrics (JSONB).

**API Routes** (`server/routes/behavioral-finance.ts`): `POST /api/clients/:id/behavioral/analyze`, `POST /api/clients/:id/behavioral/analyze-meeting/:meetingId`, `GET /api/clients/:id/behavioral`, `GET /api/clients/:id/behavioral/alerts`, `GET /api/clients/:id/behavioral/coaching-notes`, `GET /api/behavioral/de-escalation-scripts`, `GET /api/clients/:id/behavioral/timeline`.

**Frontend**: "Behavioral" tab added under AI Tools group in client detail navigation. Component includes behavioral risk gauge, current sentiment card, summary card, coaching notes, sentiment timeline chart, communication analyzer form, and de-escalation script browser.

**UI/UX Decisions:**
- The frontend is developed with **React + Vite**, styled using **TailwindCSS** and **Shadcn/ui**, and visualizations are powered by **Recharts**.
- Branding incorporates OneDigital's primary blue color (`hsl(213 72% 31%)`) and the Inter font. Dark mode is supported.
- Lucide icons are used throughout the UI.

**Technical Implementations & Feature Specifications:**
- **Authentication & Authorization**: Session-based authentication using `express-session` with PostgreSQL-backed session store (`connect-pg-simple`). Sessions persist across server restarts with a 30-day cookie. Differentiates between "advisor" and "associate" roles with corresponding access controls. Associates have restricted views based on client assignments.
- **Data Model**: Designed to mirror real-world Salesforce and Orion APIs, allowing for flexible integration with actual external systems.
- **Core Modules**:
    - **Dashboard**: Provides an aggregated view of key advisor data.
    - **Client Management**: A "Client 360" view with grouped top navigation instead of flat tabs. Four category groups: Overview, Financial (Portfolio, Retirement), Operations (Meetings, Documents, Compliance), and AI Tools (Insights, AI Assessment). Groups with multiple sections show a second row of sub-section buttons when active. Team members are displayed as overlapping avatar profile pictures in the client header card with hover tooltips showing name and role.
    - **Meetings**: Calendar view with simulated Outlook sync, AI-powered meeting prep, notes, follow-up generation, and transcript analysis.
    - **Analytics**: Book of Business analytics with AI query capabilities.
    - **Compliance**: Client compliance tab with health score gauge, stat cards (current/expiring/needs attention), compliance items list with quick-complete actions, compliance review submission workflow (Draft → Submitted → Under Review → Approved/Changes Requested) with visual progress bar, review history with audit trail timelines. Server-side state transition validation enforced. Compliance reviews stored in `compliance_reviews` and `compliance_review_events` tables. Global compliance dashboard also available.
    - **Admin**: Accessible via footer link in sidebar. When in admin mode, the sidebar switches to admin-specific navigation (Users, Reports, Login Analytics, AI Assessment, Prompts & Templates, Workflows, Settings) with a "Back to Advisor View" link. Routes are `/admin`, `/admin/reports`, `/admin/analytics`, `/admin/assessment`, `/admin/prompts`, `/admin/workflows`, `/admin/settings`. Old `/settings` and `/workflows` routes redirect to `/admin` and `/admin/workflows` respectively. Login Analytics tracks all advisor and associate login events in the `login_events` table with daily activity chart, summary stats, and per-user breakdown table with time range filtering (7/30/90 days).
- **Associates & Team Management**: Allows advisors to manage associates, assign them to clients, and define their roles. Both advisors and associates have `avatarUrl` fields for profile pictures, served statically from `/avatars/`. Profile pictures are displayed in the client header and throughout the UI using the Avatar component with initials fallback.
- **Task Management**: Full CRUD task system with types (follow_up, account_opening, document_request, rebalancing, insurance, estate_planning, tax_planning, compliance, general), assignees (team members/associates), due dates, and priorities. Tasks table has `type`, `assignee_id`, and `meeting_id` fields. Task sidebar component (`client/src/components/task-sidebar.tsx`) shown as sticky right sidebar on desktop, as a "Tasks" nav tab on mobile. Meeting summary AI prompt returns suggested tasks which appear in the sidebar with one-click "Add" buttons. Tasks can be linked to meetings bidirectionally: create tasks from within meeting detail dialogs, or link existing client tasks to meetings. `MeetingTasksPanel` component shows linked tasks inside meeting dialogs (both client-detail and meetings page). Tasks with due dates appear on the Calendar alongside meetings as violet-colored items. Calendar day popups show both meetings and tasks. API: `GET /api/clients/:clientId/tasks`, `GET /api/meetings/:meetingId/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id` (all with advisor ownership checks).
- **Workflow Feature**: Includes a visual, drag-and-drop workflow designer for creating templates with branching logic, configurable step output types (free text, multiple choice), real-time email notifications upon updates, and optional task auto-creation on step completion (configurable per step with title, type, and due date offset).
- **AI Financial Assessment**: Admin-configurable assessment tool (formerly "Diagnostics") that gathers client data, uses AI to generate structured JSON analysis, and renders customizable HTML reports. Includes PDF export for sharing with clients and a rule-based fallback if OpenAI is unavailable. PDF utility at `client/src/lib/assessment-pdf.ts`.
- **Meeting Prep Configuration**: Admin-configurable prompt templates for AI meeting prep generation. Admins can create/edit/delete meeting prep configs with system prompts and user prompt templates containing merge fields (`{{clientName}}`, `{{clientInfo}}`, `{{holdings}}`, `{{performance}}`, `{{recentMeetings}}`, `{{tasks}}`, `{{lifeEvents}}`, `{{complianceItems}}`). The active config is used when generating prep briefs. Prep can be triggered from both the dashboard and client detail meetings tab. Prep buttons only appear on future/scheduled meetings.
- **Meeting Summary Configuration**: Admin-configurable prompt templates for AI meeting summarization. Similar to meeting prep but for completed/past meetings. Admins can create/edit/delete summary configs with system prompts and user prompt templates containing merge fields (`{{clientName}}`, `{{clientInfo}}`, `{{meetingTitle}}`, `{{meetingType}}`, `{{meetingDate}}`, `{{meetingNotes}}`, `{{holdings}}`, `{{performance}}`, `{{tasks}}`, `{{lifeEvents}}`). Summary buttons appear on completed meetings; prep buttons appear on scheduled meetings.
- **Transcript Analysis**: Admin-configurable tool for uploading and analyzing meeting transcripts (.vtt/.txt) using AI to extract summaries, action items, compliance notes, and client sentiment.
- **Document Upload & Parsing**: Facilitates uploading client documents (transcripts, financial documents) for AI-powered extraction of key information (profile fields, accounts, holdings) and secure storage. Documents can also be downloaded. On upload, documents are automatically classified against the client's document checklist using an admin-configurable AI prompt (stored in `document_classification_config` table). Matched checklist items are auto-checked with the document linked for download.
- **Document Checklist**: Standardized checklist for client documentation across various categories, with progress tracking and initialization features. Received items no longer show strikethrough text; instead, items linked to uploaded documents show a Download button. The `document_checklist` table has a `document_id` column linking to the uploaded document.
- **Real-Time Market Data & News**: Integrates Yahoo Finance for real-time stock quotes and RSS feeds for financial news, providing portfolio-specific and general market insights. Data is cached for performance.
- **Monte Carlo Retirement Simulation**: An engine (1,000 simulations) for creating and running retirement scenarios based on client data, life events, and financial assumptions. Visualizes success rates and wealth paths. Includes PDF export (`client/src/lib/retirement-pdf.ts`) that generates a branded report with scenario assumptions, life events table, success gauge, final balance statistics, projected wealth chart (SVG-to-canvas capture), percentile data table, depletion warnings, and disclaimer footer. Uses `jspdf` + `jspdf-autotable`.
- **Goals-Based Bucket Strategy**: 3-bucket approach (Cash/Short-Term 1-2yr, Bonds/Intermediate 3-7yr, Equities/Growth 8+yr) visualization in client detail Financial tab. Features: CRUD for financial goals with target amounts, time horizons, and priorities; bucket allocation engine that classifies holdings into buckets; visual bucket diagrams with funded ratios; aggregate funded ratio; rebalancing suggestions when allocations drift >5% from targets. Schema: `financial_goals` table. Routes: `server/routes/goals.ts`. Frontend: `client/src/pages/client-detail/goals-section.tsx`.
- **Alternative Assets**: Portfolio tab displays a "Properties & Alternative Assets" section (with Orion source pill) showing real estate, private equity, crypto, collectibles, and business interests. Table includes asset name/description/notes, type badge, location, estimated value, cost basis, and gain/loss. Total alternative assets shown in footer. Data stored in `alternative_assets` table.
- **Data Source Indicator Pills**: Visual pills on card headers throughout client detail view showing which system data originates from. Salesforce (blue cloud logo) = contacts, tasks, compliance, life events, household. Orion (blue asterisk logo) = accounts, holdings, performance, transactions, portfolio news, asset allocation, alternative assets. Yahoo Finance (purple logo) = market data, portfolio news. Documents, meetings, and workflows are internal and do not show source pills.

## Testing
- **Framework**: Vitest (v4.x)
- **Server tests** (`vitest.config.ts`, node environment):
  - `server/__tests__/` directory with 57 test files, 833 tests
  - Run: `npx vitest run`
- **Client tests** (`vitest.config.client.ts`, jsdom environment):
  - `client/src/__tests__/` directory with 3 test files, 43 tests
  - Uses React Testing Library + jsdom
  - Covers: 8 calculator pages, discovery wizard, CassidyAnalysisButton
  - Run: `npx vitest run --config vitest.config.client.ts`
- **Run all tests**: `npx vitest run && npx vitest run --config vitest.config.client.ts`
- **Watch mode**: `npx vitest watch` (server) or `npx vitest watch --config vitest.config.client.ts` (client)

## Security Hardening (Phase 0.1)
- **Security headers**: helmet.js middleware adds X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, Cross-Origin-Opener-Policy, and more
- **CORS**: Configured with credentials support via `cors` package
- **Rate limiting**: `express-rate-limit` — general 200/15min on all API routes, 10/15min on `/api/auth/login`, 20/hr on upload endpoints (transcript, parse-document, from-transcript)
- **Cookie security**: `secure` flag now dynamic based on `NODE_ENV === "production"`
- **Error sanitization**: All catch blocks in routes.ts return generic error messages; actual errors logged server-side only
- **Prompt injection prevention**: Two layers — `sanitizeUserPrompt()` in `chatCompletion()` strips template literals and HTML comments from all AI user prompts; `sanitizePromptInput()` in `interpolateTemplate()` additionally strips braces for custom prompt templates
- **CORS**: Origin allowlist driven by `CORS_ORIGIN` env var (comma-separated); permissive when unset (dev mode)
- **Dependencies added**: helmet, express-rate-limit, cors

## Data Integrity & Performance (Phase 0.4)
- **updatedAt timestamps**: Added to 11 critical tables (advisors, clients, households, accounts, holdings, meetings, tasks, documents, compliance_items, alerts, activities)
- **Database indexes**: 17 indexes created for common query patterns (advisor lookups, client queries, task/meeting/compliance filtering, alert/activity timelines)
- **N+1 fix**: `getHoldingsByClient()` now uses a single JOIN query instead of N+1 loop queries
- **Update operations**: Update methods for tables with `updatedAt` (clients, tasks, meetings, compliance_items, alerts, advisors) now set `updatedAt: new Date()` automatically. Config table updates (diagnostic, transcript, meeting prep/summary, document classification) already had this behavior.

### Design System (UI/UX Polish Layer)
Added as an additive layer over the existing OneDigital template:
- **Fonts**: Cormorant Garamond (serif/hero text), DM Sans (primary body — replaces Inter), DM Mono (financial figures). Loaded via Google Fonts preload in `client/index.html`.
- **Design Tokens**: `client/src/styles/tokens.ts` — colors, typography families, spacing, shadows, transitions. Single source of truth.
- **Animations**: `client/src/styles/animations.css` — 7 keyframe animations (fade-up, slide-in, scale-in, slide-up, fill, breathe, shimmer, glow) with staggered delay classes and `prefers-reduced-motion` support. Also registered in `tailwind.config.ts` as `animate-fade-up`, `animate-slide-in`, `animate-scale-in`.
- **13 Reusable Design Components** in `client/src/components/design/`:
  - `Arc` — animated 270° gauge (SVG) for KPI percentages, with `role="img"` + `aria-label`
  - `Spark` — inline sparkline chart (SVG) with gradient fill, with `role="img"` + `aria-label`
  - `DomainBar` — horizontal stacked bar for allocation/distribution
  - `Pill` — semantic status pill with optional `icon` prop (positive/negative/neutral/warning/info)
  - `ActionBtn` — styled action button (primary/ghost/outline variants)
  - `Serif` / `Mono` / `Lbl` — typography helpers (Cormorant Garamond, DM Mono, uppercase label). Support `as` prop for semantic heading levels (h1-h4, p, div)
  - `Body` — 15px DM Sans body text component
  - `Supporting` — 13px DM Sans secondary/muted text component
  - `StatusIndicator` — triple-encoded status component (color + icon + text), with `scoreToLevel()` helper
  - `NavTabs` — standardized tab navigation component with `underline`, `pill`, and `segment` variants. Includes full ARIA tab semantics (`role="tab"`, `aria-selected`, `aria-controls`)
  - `SignalCard` — 3-level signal hierarchy component (action-needed/review/info) with colored left border, icon, and badge. Uses P tokens.
  - `Score` — unified score ring component (SVG) with auto-coloring via `sc()`, configurable size/max/label/showPercent
  - Barrel export via `client/src/components/design/index.ts`
- **Currency Formatting**: Unified in `client/src/lib/format.ts` — `formatCurrency()` (abbreviated: $1.2M/$500K) and `formatFullCurrency()` (locale-formatted: $1,234,567). Re-exported from `client/src/pages/client-detail/shared.tsx` for backward compatibility. All 20+ duplicate local formatters replaced with imports from this single source.
- **Skip-to-content**: Visually-hidden keyboard-accessible link at top of `AppLayout` in `client/src/App.tsx`, targeting `#main-content` on the `<main>` element.
- **Token helpers**: `sc()` (score→color), `sb()` (score→background), `sl()` (score→label text) in `tokens.ts`
- **Dashboard polish**: Staggered fade-up on metric cards, DM Mono for financial figures, uppercase tracking-widest labels, Cormorant Garamond italic for user name, hover shadow transitions on section cards, tighter heading letter-spacing globally.
- **CSS**: `client/src/index.css` updated with new font stack (DM Sans primary, Cormorant Garamond serif, DM Mono mono), optimized text rendering, and heading letter-spacing.

### Deployment Infrastructure (Phase 4.1)
Production-ready deployment setup:
- **Docker**: Multi-stage `Dockerfile` (node:20-alpine builder + runtime, non-root user, dumb-init for signal handling, <300MB target). `docker-compose.yml` for local dev (app + postgres:16-alpine).
- **Health Check**: `GET /api/health` — returns status (healthy/degraded/unhealthy), database response time, AI configuration, uptime. Registered BEFORE auth middleware so it's publicly accessible. Files: `server/health.ts`, `server/routes/health.ts`.
- **Database Resilience**: `server/db.ts` enhanced with connection pool config (max 20, idle timeout 30s, connection timeout 5s), error handler, `ensureDbConnection()` with 5-retry exponential backoff.
- **Graceful Shutdown**: `server/index.ts` handles SIGTERM/SIGINT — closes HTTP server, drains DB pool, 30s forced-exit timeout.
- **CI/CD**: `.github/workflows/deploy.yml` — GitHub Actions 3-job pipeline (test → build → deploy). Uses ghcr.io for container registry, deploys to Cloud Run.
- **Environment**: `.env.example` documents all env vars including integrations, feature flags, session config. `.dockerignore` excludes dev files.

### Feature Flags & Monitoring (Phase 4.2)
- **Feature Flags Table**: `feature_flags` in `shared/schema.ts` — key (unique), enabled (bool), rolloutPercentage (0-100), description. 7 initial flags seeded (ai_enabled, salesforce_integration, orion_integration, outlook_integration, zoom_integration, monte_carlo_enabled, workflow_builder_enabled).
- **Feature Flag Library**: `server/lib/feature-flags.ts` — `isFeatureEnabled(key, userId?)` with 1-minute in-memory cache, deterministic rollout via hash, env var overrides (`FEATURE_FLAG_KEY=true/false`). Also `getAllFlags()`, `updateFlag()`, `invalidateCache()`.
- **Structured Logger**: `server/lib/logger.ts` — pino-based logger. Pretty-print in dev, JSON in prod. `createRequestLogger()` and `createIntegrationLogger()` for child loggers. Replaces all `console.log/error/warn` across server codebase.
- **Error Handler**: `server/lib/error-handler.ts` — optional Sentry integration (via `SENTRY_DSN` env var), structured error logging with error IDs. Express error middleware in `server/index.ts`.
- **Admin Routes**: `server/routes/feature-flags.ts` — `GET /api/admin/flags` (list all, advisor-only), `POST /api/admin/flags/:key` (update, advisor-only), `GET /api/flags/:key/status` (check for current user).
- **Admin UI**: `client/src/components/admin/flags-panel.tsx` — toggle switches, rollout percentage sliders, flag descriptions. Accessible via "Feature Flags" tab in admin sidebar.
- **Tables WITH updatedAt**: featureFlags (now added to the list).

### Pilot Onboarding (Phase 4.3)
- **Onboarding Wizard**: `client/src/components/onboarding-wizard.tsx` — 5-step wizard (Welcome → Connect Accounts → Import Clients → Configure AI → Go Live). Step indicators, progress bar, back/next navigation. Route: `/onboarding`.
- **Feedback Widget**: `client/src/components/feedback-widget.tsx` — Floating bottom-right button that opens a feedback modal (type selector, message textarea, character count). Included in AppLayout for all pages. Posts to `POST /api/feedback`.
- **Feedback Table**: `pilot_feedback` in `shared/schema.ts` — userId, type (bug/feature/feedback), message, pageUrl, email, createdAt.
- **Feedback Routes**: `server/routes/feedback.ts` — `POST /api/feedback` (authenticated), `GET /api/admin/feedback` (advisor-only), `GET /api/admin/feedback/stats` (advisor-only with counts by type).
- **Admin Feedback Tab**: `PilotFeedbackTab` in `client/src/pages/admin.tsx` — Stats cards (total, bugs, features, feedback), filterable table with type/message/page/email/date. Accessible via "Pilot Feedback" sidebar item.

### Expansion Gates & Retrospective (Phase 4.4)
- **New Tables**: `survey_responses` (userId, rating 1-5, comment, pageUrl, createdAt), `health_check_events` (status, responseTime, checkedAt), `gate_signoffs` (gate, signedOffBy, title, reason, createdAt).
- **Pilot Metrics Engine**: `server/engines/pilot-metrics.ts` — calculates 8 expansion gates: Participation (≥20 active users), Satisfaction (NPS ≥4.0/5.0), Critical Bugs (=0), AI Adoption (≥85%), System Stability (≥99.5% uptime), Integration Uptime (≥99%), Data Accuracy (≥99%), Leadership Sign-off. 5-minute cache.
- **Pilot Metrics Routes**: `server/routes/pilot-metrics.ts` — `GET /api/admin/gates` (all gate statuses), `GET /api/admin/metrics` (trend data), `POST /api/admin/gates/:gate/signoff`, `GET /api/admin/signoffs`, `POST /api/survey` (NPS submission).
- **Gate Card Component**: `client/src/components/gate-card.tsx` — reusable card with status icon, progress bar, color-coded (green/amber/red).
- **Pilot Dashboard Tab**: `PilotDashboardTab` in `client/src/pages/admin.tsx` — overall status banner, 8 gate cards, trend charts (active users, NPS, uptime), leadership sign-off form with recorded approvals. Route: `/admin/pilot-dashboard`.
- **NPS Survey**: `client/src/components/nps-survey.tsx` — floating survey with 1-5 star rating, optional comment. Shows after 5 actions, 24h cooldown. Mounted in AppLayout.
- **Feature Flag**: `expansion_enabled` — disabled by default, intended to be enabled only when all 8 gates pass.
- **Retrospective Script**: `scripts/generate-retrospective.ts` — generates markdown report with executive summary, gate results table, feedback summary, learnings, go/no-go decision. Run with `npx tsx scripts/generate-retrospective.ts`.
- **Tables WITHOUT updatedAt**: surveyResponses, healthCheckEvents, gateSignoffs (add to existing list).

### Investor Profile Schema (Phase 5.1)
- **New Tables**: `investor_profiles` (clientId, profileType individual/legal_entity, status draft/in_progress/submitted/finalized/expired, currentVersionId, expirationDate, draftAnswers JSONB, createdBy, createdAt, updatedAt), `investor_profile_versions` (profileId, versionNumber, questionSchemaId, answers JSONB, submittedBy, submittedAt — immutable), `investor_profile_question_schemas` (name, profileType, questions JSONB array, isActive, createdAt, updatedAt).
- **Storage Functions**: 16 functions for CRUD on profiles, drafts (save/get via draftAnswers column), versions, and question schemas.
- **Routes**: `server/routes/profiles.ts` — 15 endpoints: Profile CRUD (5), Drafts (2), Finalize + Versions (3), Question Schemas (5 including activate/deactivate). All authenticated, schema admin routes require advisor role.
- **Seeded Schemas**: Individual Investor Profile v1.0 (20 questions across Demographics, Employment & Income, Net Worth, Risk Assessment, Goals, Constraints), Legal Entity Profile v1.0 (22 questions with `entityTypes` filtering across Entity Information, Trust Details, Trust Administration, Corporate Info, Corporate Documents, LLC Formation, LLC Documents, Partnership Details, Foundation Details, Investment Details, Constraints — questions filtered by `entityType` field on profile).
- **Validation**: `validateAnswers()` function checks required fields and validation rules (minLength, min, max) against schema before finalization.
- **Tables WITHOUT updatedAt**: investorProfileVersions (immutable audit trail).

### Legal Entity Profiles (Phase 5.3)
- **Schema**: `entityType` column added to `investorProfiles` table (text, nullable). Values: trust, corporation, llc, partnership, foundation. Required when `profileType = 'legal_entity'`, null for individuals.
- **Route validation**: `POST /api/profiles` validates entityType required for legal_entity, rejects invalid values.
- **Question filtering**: Schema questions have optional `entityTypes` array. `SectionForm.tsx` and `ProfileEditor.tsx` filter questions — only showing questions matching the profile's entityType (or all questions with no entityTypes filter).
- **UI**: ProfileList create modal shows entity type selector when "Legal Entity" is chosen. Profile cards display entity type name for legal entities.
- **Seeded data**: Legal Entity Profile v1.0 schema has 22 questions spanning trust, corporation, LLC, partnership, and foundation entity types, plus shared questions (Entity Information, Investment Details, Constraints).

### Reminder Automation Engine (Phase 5.4)
- **Engine**: `server/engines/reminder-engine.ts` — `checkAndCreateReminders()` scans all profiles, detects expired or expiring-within-N-days, creates deduped reminder tasks. `getProfileReminders()` returns pending reminders sorted by urgency.
- **Storage**: `getAllInvestorProfiles()` fetches all profiles. `getExistingReminder(profileId, remindDays)` checks for existing reminder tasks by matching profileId and remindDays in description to prevent duplicates.
- **Routes**: `server/routes/reminders.ts` — `GET /api/reminders/check` triggers reminder creation (query params: days, includeExpired). `GET /api/reminders/pending` lists profiles expiring within 90 days.
- **Dashboard Widget**: `client/src/components/reminders/ReminderWidget.tsx` — Shows counts of expired/expiring profiles, "Run Check" button to trigger reminder creation, link to profiles page. Added to right column of dashboard.
- **Deduplication**: Uses `[remindDays:N]` tag in task description, queried via SQL LIKE to prevent duplicate tasks for same profile+interval.
- **Task properties**: category=profile_reminder, type=reminder, priority escalates (low→medium→high as expiration approaches).

### Life Event Trigger Framework (Phase 5.5)
- **Engine**: `server/engines/trigger-engine.ts` — `executeTriggers()` takes a lifeEventId + metadata, matches to trigger category by name or explicit ID, iterates defaultActions and dispatches each action type (create_task, refresh_profile, create_reminder, flag_review). Each action result is stored in `trigger_actions` table.
- **Schema**: `trigger_categories` (id, name, description, defaultActions JSONB, isActive), `trigger_actions` (id, lifeEventId, triggerCategoryId, actionType, status, resultMetadata). `life_events` extended with triggerCategoryId and downstreamActions columns.
- **Storage**: `createTriggerCategory`, `getTriggerCategory`, `getTriggerCategories`, `getTriggerCategoryByName` (ilike match), `updateTriggerCategory`, `toggleTriggerCategoryActive`, `createTriggerAction`, `getTriggerActionsForEvent`, `updateLifeEvent`.
- **Routes**: `server/routes/triggers.ts` — `GET /api/triggers/categories`, `POST /api/triggers/categories`, `PUT /api/triggers/categories/:categoryId`, `PUT /api/triggers/categories/:categoryId/activate`, `PUT /api/triggers/categories/:categoryId/deactivate`, `GET /api/triggers/actions/:lifeEventId`, `POST /api/life-events` (creates event + executes triggers + stores downstream actions).
- **Seed**: 9 categories seeded: Retirement (4 actions), Divorce (4), Birth (3), Marriage (4), Job Change (3), Inheritance (4), Death (4), Illness (4), Relocation (3).
- **Action types**: create_task (auto-creates task with configurable title/description/priority/dueDays), refresh_profile (expires active investor profile), create_reminder (creates follow-up task), flag_review (creates compliance review).

### Calendly Integration (Phase 5.6)
- **Integration**: `server/integrations/calendly.ts` — `CalendlyIntegration` class wrapping Calendly API v2: `getUser()`, `getEventTypes()`, `getEventTypeLink()`. Uses bearer token auth.
- **Encryption**: `server/lib/crypto.ts` — AES-256-GCM encryption/decryption for Calendly access tokens. Uses `ENCRYPTION_KEY` env var (64-char hex).
- **Schema**: `advisors` table extended with `calendlyAccessToken` (encrypted) and `calendlyUserId` columns.
- **Routes**: `server/routes/calendly.ts` — `GET /api/integrations/calendly/status`, `GET /api/integrations/calendly/event-types`, `GET /api/integrations/calendly/link/:eventTypeId`, `POST /api/integrations/calendly/config` (validates token, encrypts, stores), `DELETE /api/integrations/calendly/config` (disconnects).
- **UI**: `client/src/components/integrations/CalendlyWidget.tsx` — Dashboard widget showing connection status, event types with copy/open buttons, disconnect option. `CalendlyConfigModal.tsx` — Dialog for entering PAT token with link to Calendly API settings.
- **Dashboard**: CalendlyWidget added to right column below ReminderWidget.

### Budget Calculator (Step 6.4)
- **Engine**: `server/calculators/budget-calculator.ts` — Two modes: pre-retirement (savings projection with FV formula) and post-retirement (withdrawal sustainability with inflation-adjusted expenses). Three scenarios (base/optimistic/conservative) with different growth and inflation rates. Returns summaryByScenario, projections, expenseSummary, and notes.
- **Route**: POST `/api/calculators/budget` in `server/routes/calculators.ts`. Validates mode/expenses/scenarios, calculates, persists to `calculatorRuns` table.
- **Frontend**: `client/src/pages/budget-calculator.tsx` — Left panel: mode selector, age, portfolio/income inputs (conditional on mode), 8 expense categories with running total, client link, projection years. Right panel: scenario tabs (Base/Optimistic/Conservative), status-colored recommendation card, metric cards, projection table, expense breakdown bar chart, notes section.
- **Hub**: Budget Calculator card updated to "available" status in `client/src/pages/calculators.tsx`.
- **Route**: `/calculators/budget` registered in App.tsx.

### RMD Calculator (Step 6.3)
- **Schema**: `calculatorRuns` table in `shared/schema.ts` — shared by RMD, Budget, Monte Carlo calculators. Fields: calculatorType, clientId, householdId, advisorId, inputs (JSONB), results (JSONB), assumptions (JSONB), createdAt, createdBy.
- **Engine**: `server/calculators/rmd-calculator.ts` — IRS Uniform Lifetime Table III (ages 72–120) hardcoded. `calculateRMD(inputs)` returns currentYearRMD, rmdPercentage, lifeExpectancyFactor, multi-year projections, and advisory notes. Handles spouse beneficiary (10+ year age gap adjustment), inherited IRA/SECURE Act notes, account depletion detection.
- **Routes**: `server/routes/calculators.ts` — `registerCalculatorRoutes(app)`. POST `/api/calculators/rmd` (calculate + persist), GET `/api/calculators/runs` (list with clientId/type filters), GET `/api/calculators/runs/:runId`.
- **Hub Page**: `client/src/pages/calculators.tsx` — Card grid showing RMD (available), Budget (coming soon), Monte Carlo (coming soon).
- **Elite Monte Carlo Engine**: `client/src/pages/monte-carlo.tsx` — Standalone page at `/monte-carlo` with production-grade Monte Carlo simulation. Features: Log-Normal GBM with correlated asset classes (10 classes, correlation matrix), 4 withdrawal strategies (Fixed Real, Guyton-Klinger, Floor+Upside, RMD-Based), lifecycle cashflow modeling (home purchase, college, business sale, inheritance, medical, vacation home), P10/P50/P90 fan chart visualization (SVG), stress test overlays (2008 crash, 1970s inflation, sequence-of-returns risk), Confidence Age metric, 5 allocation presets. Runs 500-10,000 scenarios client-side. Retirement-phase-aware: withdrawals only begin at retirement age. Sidebar entry between Calculators and Tax Strategy.
- **RMD Page**: `client/src/pages/rmd-calculator.tsx` — Left panel: input form (DOB, balance, tax year, client link, beneficiary info, growth rate, inheritance status, projection years). Right panel: 3 metric cards (RMD amount, percentage, life expectancy factor), projection table, notes/warnings section.
- **Navigation**: "Calculators" in advisor sidebar (Calculator icon), routes `/calculators` and `/calculators/rmd` in App.tsx.

### Report Builder UI (Step 6.2)
- **Reports Dashboard**: `client/src/pages/reports.tsx` — Table view with search, status filter (All/Draft/Final/Archived), row actions (Edit/Preview/Archive), "Generate New Report" button.
- **Template Selection Modal**: `client/src/components/report-template-selection-modal.tsx` — 3-step wizard: template grid → client/name selection → section visibility toggles. Generates report via POST `/api/reports` and redirects to editor.
- **Report Editor**: `client/src/pages/report-editor.tsx` — Two-column layout: left sidebar (section checkboxes, Save Draft, Finalize) + main content (collapsible section cards with data tables, annotations add/delete). Auto-save with 3s debounce. Finalize confirmation dialog.
- **Preview Modal**: `client/src/components/report-preview-modal.tsx` — Renders `renderedHtml` from report artifact, print button opens new window.
- **Client Detail Integration**: `client/src/components/client-reports-section.tsx` — Reports tab under Operations in client detail showing total/draft/final stats, recent reports table, generate button pre-populated with client.
- **Navigation**: Reports added to advisor sidebar (ClipboardList icon), routes `/reports` and `/reports/:reportId/edit` in App.tsx, "Reports" tab in client detail Operations group.

### Report Template Engine (Step 6.1)
- **Schema**: `reportTemplates` + `reportArtifacts` tables in `shared/schema.ts` with insert schemas and types.
- **Data Sources**: `server/engines/data-sources.ts` — `executeDataSource()` supports 9 sources: `clients.aum`, `clients.performance`, `accounts.list`, `holdings.allocation`, `investorProfiles.latest`, `tasks.open`, `meetings.upcoming`, `activities.recent`, `complianceItems.status`. Accepts `DataSourceContext { clientId?, householdId?, advisorId }`.
- **Renderer**: `server/engines/report-renderer.ts` — `renderReportHtml(content, reportName?)` generates styled HTML documents with OneDigital branding (#0066cc). Renders arrays as tables, objects as dl/dt/dd lists, supports annotations and visibility overrides.
- **Service**: `server/engines/report-service.ts` — `generateReportArtifact()` (fetches template, executes data sources in parallel, creates draft with rendered HTML), `updateReportDraft()` (edit draft content, re-render), `finalizeReport()` (set final, increment version). Includes advisor ownership validation for client/household.
- **Routes**: `server/routes/reports.ts` — `registerReportRoutes(app)`. CRUD for templates (GET/POST/PATCH/DELETE `/api/report-templates`), report generation (POST `/api/reports`), report management (GET/PATCH `/api/reports/:id`), finalize (PATCH `/api/reports/:id/finalize`), archive (PATCH `/api/reports/:id/archive`), PDF preview (GET `/api/reports/:id/pdf`).
- **Seed**: 4 templates (Client Summary, Retirement Planning Review, Meeting Recap, Compliance Status Report) seeded for advisor Sarah Mitchell.
- **DB**: Tables `report_templates`, `report_artifacts` with indexes on advisor/type/active, advisor/status, client, template.

### Profile Workflow UI (Phase 5.2)
- **Page**: `client/src/pages/profiles.tsx` — Multi-view page (list/editor/history) with state-based navigation.
- **Components** in `client/src/components/profiles/`:
  - `ProfileList.tsx` — Lists all profiles across clients with status filter, new/edit/delete/history actions.
  - `ProfileEditor.tsx` — Dynamic form editor with section sidebar, progress bar, auto-save debounce (800ms), prev/next section navigation.
  - `SectionForm.tsx` — Renders questions for a single section with labels, help text, validation errors.
  - `QuestionInput.tsx` — Type dispatcher supporting text, textarea, number, date, select, multiselect, radio, checkbox.
  - `FinalizationModal.tsx` — 3-step flow: Review (shows all answers, validates required) → Confirm (warning) → Success (version number).
  - `VersionHistory.tsx` — Lists finalized versions with view-detail dialog.
  - `StatusBadge.tsx` — Color-coded badge (draft=gray, in_progress=blue, submitted=amber, finalized=green, expired=red).
- **Hook**: `client/src/hooks/useDebounce.ts` — Generic debounce hook for auto-save.
- **Route**: `/profiles` in App.tsx, "Profiles" nav item in advisor sidebar (FileText icon).

### Approval Queue (Step 7.1)
- **Schema**: `approvalItems` table (id, itemType, entityType, entityId, title, description, payload JSONB, status, priority, submittedBy, reviewedBy, reviewedAt, comments, createdAt, updatedAt), `approvalRules` table (id, itemType, autoApproveConditions JSONB, requiredReviewerRole, slaHours, escalationRole, isActive, createdAt, updatedAt).
- **Engine**: `server/engines/approval-engine.ts` — `evaluateAutoApprove()` checks rules' auto-approve conditions (maxAmount, allowedPriorities, allowedEntityTypes), `applyApprovalChange()` updates status (only if pending), `calculateSLADueDate()`, `getApprovalRulesForType()`.
- **Routes**: `server/routes/approvals.ts` — POST /api/approvals (create + auto-approve check), GET /api/approvals (filter by itemType/status/priority), GET /api/approvals/stats (counts by status + urgent), GET /api/approvals/:id, PATCH /api/approvals/:id/approve, PATCH /api/approvals/:id/reject.
- **UI**: `client/src/pages/approvals.tsx` — Tabs: "Approval Queue" (table with filters, detail modal, approve/reject dialogs) + "Custodial Feed". Stats cards (pending/urgent/approved/rejected). Sidebar badge shows pending count.
- **Seed rules**: 3 default rules for compliance_review, profile_update, custodial_change.

### Dashboard Widget Expansion (Step 7.3)
- **Backend**: Enhanced `GET /api/dashboard` in `server/routes/auth.ts` with 5 new queries (parallel via `Promise.all`):
  - `pendingApprovals` — top 3 pending approval items from `approvalItems` table
  - `pendingApprovalsCount` — total pending count
  - `expiringProfiles` — investor profiles expiring within 30 days (finalized, joined with clients for advisor scoping)
  - `recentReports` — last 5 `reportArtifacts` for current advisor, enriched with client names
  - `recentCalculatorRuns` — last 5 `calculatorRuns` for current advisor, enriched with client names
- **Frontend**: 4 new widget cards in `client/src/pages/dashboard.tsx`:
  - Pending Approvals (orange accent, priority badges, "View All" → /approvals)
  - Profiles Expiring Soon (rose accent, days-until badges, "View All" → /profiles)
  - Recent Reports (indigo accent, status badges, "View All" → /reports)
  - Recent Calculator Runs (teal accent, type labels, "View All" → /calculators)
- All widgets have empty states, consistent design with existing dashboard cards (hover-elevate, color bars, badges)

### Custodial Change Feed (Step 7.2)
- **Schema**: `custodialChanges` table (id, source, changeType, rawPayload JSONB, normalizedPayload JSONB, matchedClientId FK, matchedAccountId FK, status, approvalItemId FK, notes, receivedAt, processedAt, createdAt).
- **Matcher**: `server/engines/custodial-matcher.ts` — `normalizeCustodialPayload()` maps Schwab/Fidelity/Pershing field names to normalized keys, `matchCustodialChange()` with priority: exact account#+custodian → name+account lookup → fuzzy prefix, `calculateSimilarity()` via Levenshtein distance.
- **Routes**: `server/routes/custodial.ts` — POST /api/webhooks/custodial (HMAC-SHA256 sig verification, idempotency, normalize, match, create change + approval item for high confidence), GET /api/custodial-changes (filter by status), PATCH /api/custodial-changes/:id (match or ignore actions).
- **UI**: Integrated in approvals.tsx "Custodial Feed" tab — cards with source/type/status, manual match (select client dropdown), ignore button.

### Admin Configuration (Step 7.4)
- **Approval Rules CRUD**: Full admin panel at `/admin/approval-rules` — list, create, edit, toggle active/inactive, delete rules. Endpoints: GET/POST/PATCH/DELETE `/api/admin/approval-rules` using direct Drizzle queries on `approvalRules` table. Dialog form for create/edit with item type, reviewer role, SLA hours, escalation role.
- **Integration Health**: Status dashboard at `/admin/integrations` — cards showing connected status, last sync time, error counts for Salesforce, Microsoft 365, Zoom, Custodial Webhooks. Endpoint: GET `/api/admin/integrations` returns integration status based on env var configuration.
- **Reminder Settings**: Persistent configuration at `/admin/reminders` — configurable days-before thresholds for profile expiration (30d), document deadline (14d), compliance review (60d), client review (90d). Stored in `system_config` table (key-value JSONB). Endpoints: GET/PATCH `/api/admin/settings/reminders`.
- **DB**: `system_config` table (key TEXT PK, value JSONB, updated_at TIMESTAMP) for persistent app configuration.
- **Sidebar**: 3 new admin nav items (Approval Rules, Integrations, Reminders) in `app-sidebar.tsx`.

### Discovery Meeting Framework
- **Schema**: `discovery_questionnaires` table (id, advisorId FK, name, clientType, sections JSONB, isActive, createdAt, updatedAt), `discovery_sessions` table (id, advisorId FK, clientId FK, questionnaireId FK, meetingId FK, clientType, status, prospectName, prospectEmail, questionnaireResponses JSONB, wizardResponses JSONB, currentSection, talkingPoints, summary, engagementPathway, recommendedNextSteps JSONB, createdAt, updatedAt).
- **Storage**: Full CRUD for both tables via `DatabaseStorage` in `server/storage.ts`.
- **AI**: `generateDiscoveryTalkingPoints()` and `generateDiscoverySummary()` in `server/openai.ts` — AI-generated talking points for discovery meetings and post-discovery summaries with engagement pathway and next steps. Fallback templates when AI unavailable.
- **Routes**: `server/routes/discovery.ts` — CRUD for questionnaires and sessions, AI endpoints (talking points, summary generation), client creation from discovery data. All resource-by-id endpoints enforce advisor ownership.
- **Templates**: Built-in questionnaire templates for 4 client types (individual, couple, business owner, inheritor) with conditional questions.
- **Wizard**: 6-section discovery wizard (Personal Background, Financial Snapshot, Values & Priorities, Money Story, Risk Attitudes, Goals Hierarchy) with client-type-specific prompts.
- **UI**: `client/src/pages/discovery.tsx` — Dashboard with active/completed sessions, questionnaire management, session detail with tabbed interface (Questionnaire, Discovery Wizard, Talking Points, Summary). Supports client creation from completed sessions.
- **Sidebar**: "Discovery" nav item with Compass icon.

### Fact Finder Framework (Step 8.1)
- **Schema**: `factFinderDefinitions` table (id, name, description, category, questionSchema JSONB, routingRules JSONB, scoringRules JSONB, isActive, createdAt, updatedAt), `factFinderResponses` table (id, definitionId FK, clientId FK, householdId FK, advisorId FK, status, answers JSONB, completionPercentage, startedAt, submittedAt, reviewedBy FK, reviewedAt, createdAt, updatedAt).
- **Engine**: `server/engines/fact-finder-renderer.ts` — `renderFactFinder()` evaluates conditional visibility, calculates completion percentage from visible required questions. `evaluateCondition()` parses simple comparisons (===, !==, >, <, etc.) without eval. `calculateCompletionPercentage()` convenience wrapper.
- **Routes**: `server/routes/fact-finders.ts` (8 endpoints) — GET /api/fact-finders (active definitions), GET /api/fact-finders/:id, GET /api/fact-finders/:id/render, GET /api/fact-finder-responses (with clientId/status filters, joined with definition+client names), POST /api/fact-finder-responses, GET /api/fact-finder-responses/:id, PATCH /api/fact-finder-responses/:id (auto-calculates completion), PATCH /api/fact-finder-responses/:id/submit.
- **UI**: `client/src/pages/fact-finders.tsx` — Templates tab (definition cards with section/question counts, launch dialog with client search) + Responses tab (table with status badges, progress bars, continue/view actions). `client/src/pages/fact-finder-fill.tsx` — Section-by-section form with progress tracking, auto-save (2s debounce), conditional question visibility, support for text/textarea/number/currency/select/boolean/multiselect types, submit on 100% completion.
- **Sidebar**: "Fact Finders" nav item with Notebook icon.
- **Seed**: "General Financial Review" definition with 23 questions across 5 sections (Personal Info, Employment & Income, Assets & Liabilities, Risk & Goals, Insurance & Estate), conditional logic for spouse name, employer name, retirement age, life insurance amount.

### Retirement Fact Finder (Step 8.2)
- **Data seed**: "Retirement Planning Fact Finder" definition with 26 questions across 6 sections: Current Accounts (4), Social Security & Pensions (5), Retirement Goals (6), Income & Spending (5), Asset & Risk (4), Next Steps (2). Conditional logic for spouse SS, part-time income. Uses `currency` type for dollar amounts.

### Business Owner Fact Finder (Step 8.3)
- **Data seed**: "Business Owner Planning Fact Finder" definition with 28 questions across 7 sections: Business Overview (5), Ownership Structure (3), Succession Planning (5), Buy-Sell & Insurance (4), Business Retirement Plans (4), Business vs. Personal Assets (4), Legal & Tax (3). Conditional logic for family takeover successor, sell-to-buyer valuation target, retirement plan contribution strategy.

### Advanced Analyzers Design (Step 8.4)
- **Design document only**: `docs/advanced-analyzers-architecture.md` — Architecture for 6 future analyzers (Roth Conversion Optimizer, Tax Bracket Visualizer, Beneficiary Audit Tool, Estate Document Checklist, Charitable Giving Optimizer, Asset Allocation Visualizer). Defines analyzer framework pattern, database schema extension, integration with fact finders, and Phase 9 implementation roadmap. No code implementation.

### Cassidy Workflow Plumbing (Phase 9)
- **Schema**: `cassidyJobs` table (id, jobId UNIQUE, advisorId FK, clientId FK, householdId FK, taskType, status pending/in_progress/completed/timed_out/failed, requestPayload JSONB, responsePayload JSONB, calledAgent, cassidyRequestId, agentTrace JSONB, createdAt, updatedAt, completedAt), `cassidyAuditLog` table (id, jobId, eventType, eventData JSONB, timestamp, createdAt) with 3 indexes.
- **Backend Modules** (`server/integrations/cassidy/`):
  - `signature-verifier.ts` — HMAC-SHA256 sign/verify with crypto.timingSafeEqual
  - `rate-limiter.ts` — Token bucket rate limiter with global + per-advisor limits (in-memory). Global limit configurable via `CASSIDY_GLOBAL_RATE_LIMIT` (default 500) and `CASSIDY_GLOBAL_RATE_WINDOW` (default 60s) env vars. Per-advisor default: 100 req/min. Global check runs before per-advisor check. Returns `limit_type` ("global"|"advisor") in 429 responses.
  - `webhook-client.ts` — callCassidyWorkflow with 3-attempt retry (2s/4s/8s exponential backoff), HMAC-signed headers
  - `event-bus.ts` — EventEmitter singleton for SSE pub-sub (`job:{jobId}` events), auto-cleanup after completion
  - `timeout-manager.ts` — 120s job timeout tracking, auto-marks timed_out, notifies SSE subscribers
  - `callback-handler.ts` — Processes Cassidy callbacks: HMAC verify, update DB, clear timeout, publish SSE event, audit log
  - `audit-logger.ts` — AuditLogger service (7 event types: request_sent, routing_decision, agent_called, agent_responded, synthesis_complete, callback_received, result_rendered), search/stats queries
- **Routes** (`server/routes/cassidy.ts`, 6 endpoints):
  - POST /api/cassidy/request — validate 13-field payload, rate limit, insert job, call Cassidy async, return 202 Accepted
  - POST /api/cassidy/callback — HMAC verify, update job with response, clear timeout, publish SSE, audit log
  - GET /api/cassidy/stream/:job_id — SSE endpoint for real-time results (returns JSON if already completed)
  - POST /api/cassidy/result-rendered — Log result view audit event
  - GET /api/cassidy/jobs — List advisor's recent jobs
  - GET /api/admin/cassidy-audit/:job_id — Admin timeline view with advisor/client names
  - GET /api/admin/cassidy-audit — Admin search with filters (jobId, eventType, dateRange)
- **Frontend**:
  - `client/src/hooks/use-cassidy-job.ts` — SSE subscription hook with auto-reconnect, handles completed/failed/timed_out states
  - `client/src/components/cassidy/agent-result-panel.tsx` — 5-tab result display (Summary, Sources, Actions, Next Steps, Trace) with loading/error/timeout states
  - `client/src/components/cassidy/suggested-prompts.tsx` — Follow-up prompt buttons
  - Admin "Cassidy Audit" section with search form, results table, job timeline view
- **Env vars**: CASSIDY_WEBHOOK_URL, CASSIDY_API_KEY (existing), CALLBACK_BASE_URL
- **Webhook contract**: 13 required fields (advisor_request, conversation_id, advisor_name, session_id, source, client_id, household_id, metadata, task_type, timestamp, client_context, callback_url, job_id)
- **Sidebar**: "Cassidy Audit" admin nav item (Search icon)

### Intake Agent Integration (Step 10.1)
- **Backend**:
  - `POST /api/cassidy/submit-intake` — Intake-specific submission route with validation (raw_text ≥50 chars, input_type enum, client_id required), advisor ownership checks on client_id and household_id, rate limiting, audit logging. Sends payload with `task_type: "intake_extraction"` and `agent: { name: "intake_agent", version: "1.0" }`.
  - Callback handler (`callback-handler.ts`) extended to support both existing `fin_response`/`fin_report` format and new `output` field for intake results. SSE stream also updated to include `output` when present.
  - `intake_extraction` added to `VALID_TASK_TYPES` in cassidy routes.
- **Frontend**:
  - `client/src/hooks/use-intake-job.ts` — SSE hook for intake results, parses `output` field into typed IntakeOutput (facts, missing_fields, possible_entities, summary, warnings).
  - `client/src/components/cassidy/intake-submission.tsx` — Full intake form (input_type, client, household, meeting_date, raw_text, related_entities), state machine (idle → submitting → polling → success/error), renders FactCards on success.
  - `client/src/components/cassidy/fact-cards.tsx` — Displays extracted facts grouped by 13 fact types (personal_identity through life_events), confidence badges (HIGH=green, MEDIUM=amber, LOW=red), expandable source snippets, ambiguity/review flags, missing fields alert, possible entities grid, warnings section, summary.
  - `client/src/pages/intake.tsx` — Intake page with 2-column layout (form + help text).
  - Sidebar: "Intake" nav item (FileInput icon), route `/intake` in App.tsx.
- **Valid input types**: transcript, summary, dictation, notes, crm_note, jumpai, email.
- **Intake output schema**: facts[] (fact_type, fact_label, fact_value, normalized_value, confidence HIGH/MEDIUM/LOW, source_snippet, source_reference, ambiguity_flag, review_required), missing_fields[], possible_entities[], summary, warnings[].

### Fact Review Queue (Step 10.2)
- **Schema**: `candidateFacts` table (id SERIAL, jobId VARCHAR, clientId VARCHAR, factType, factLabel, factValue, normalizedValue, confidence, sourceSnippet, sourceReference, ambiguityFlag, originalReviewRequired, editorNote, status pending/approved/rejected/edited/mapped_to_profile, reviewerId VARCHAR, reviewedAt, createdAt, updatedAt). 5 indexes on jobId, clientId, status, reviewerId, confidence.
- **Backend** (added to `server/routes/cassidy.ts`):
  - `GET /api/cassidy/facts/:job_id` — Fetches facts from job's responsePayload.output.facts, merges with existing candidate_facts statuses, returns facts with status, counts (total/pending/approved/rejected), client_id, job_status. If job already `facts_reviewed`, UI shows completed state.
  - `POST /api/cassidy/facts/complete-review` — Validates: job exists + owned by advisor, not already reviewed (409 idempotency), all facts have unique action indices matching fact count, edit values non-empty. Inserts approved/edited facts to candidate_facts (edited facts force `originalReviewRequired=true`), updates job status to `facts_reviewed`, logs audit event.
- **Frontend**:
  - `client/src/components/cassidy/fact-review-card.tsx` — Card per fact with confidence badge, status coloring (green/red/blue), approve/reject/edit buttons for pending facts, undo button for reviewed facts, source snippet, ambiguity/review flags.
  - `client/src/components/cassidy/fact-edit-dialog.tsx` — Dialog for editing fact_value, normalized_value, editor_note with original source reference.
  - `client/src/components/cassidy/fact-review-queue.tsx` — Main queue component: fetches facts, Map-based review state management, "Approve All HIGH" batch action, filter remaining/all toggle, progress bar, complete review POST. Initializes from server-returned statuses. Shows completed state if job already reviewed.
  - `client/src/pages/review-queue.tsx` — Page at `/review/:jobId` with back navigation to intake.
- **Navigation**: Route `/review/:jobId` in App.tsx. "Review Facts" button added to intake-submission success state linking to `/review/{jobId}`. Review completion navigates to profile draft page.
- **Tables WITHOUT updatedAt auto-update**: candidateFacts (has updatedAt but no auto-update trigger).

### Investor Profile Agent Integration (Step 10.3)
- **Purpose**: After fact review, map approved facts to investor profile questions via Cassidy Investor Profile Agent. Generates draft answers with confidence scoring and evidence citations.
- **Backend** (added to `server/routes/cassidy.ts`):
  - `GET /api/cassidy/facts/approved/:client_id` — Returns approved/edited facts for a client with count breakdown by confidence (high/medium/low). Requires advisor ownership of client.
  - `POST /api/cassidy/submit-profile-draft` — Validates client_id, profile_mode (individual/legal_entity). Fetches approved facts, creates cassidyJob with task_type `investor_profile_draft`, calls Cassidy workflow async. Returns job_id + approved_facts_count. Rate-limited, audit-logged.
- **VALID_TASK_TYPES** now includes `"investor_profile_draft"`.
- **Frontend**:
  - `client/src/hooks/use-profile-draft-job.ts` — SSE-based hook (same pattern as useIntakeJob) that parses ProfileDraftOutput (question_responses, unanswered_questions, clarifications_needed, overall_confidence_summary, profile_mode).
  - `client/src/components/cassidy/profile-draft-form.tsx` — Form to select profile_mode and initiate draft generation. Shows approved facts count with confidence breakdown badges. Fetches facts count on mount. Submits to POST submit-profile-draft.
  - `client/src/components/cassidy/profile-draft-viewer.tsx` — Displays profile draft results: summary stats (answered/unanswered/conflicts), clarifications needed section, answered questions with confidence badges + progress bars + evidence snippets + reasoning + source references + conflict flags + review-required alerts, unanswered questions with reasons.
  - `client/src/pages/profile-draft.tsx` — Page at `/profile-draft/:clientId`. Shows form until job submitted, then shows viewer.
- **Navigation**: Route `/profile-draft/:clientId` in App.tsx. Review queue completion now shows "Generate Profile Draft" button and auto-navigates to profile draft page.
- **Output Schema**: ProfileDraftOutput with QuestionResponse (question_id, question_text, proposed_answer, answer_format, confidence, evidence_snippets, source_references, review_required, reasoning_summary, conflict_flag), UnansweredQuestion (question_id, question_text, reason), ClarificationNeeded (fact_label, current_value, needed_clarification, severity).

### Profile Draft Review & Commit (Step 10.4)
- **Purpose**: Final step of Phase 10 — advisors review per-question profile draft answers from Step 10.3, accept/override/skip each, commit to `investor_profiles` + `investor_profile_versions` with versioning.
- **Uses existing tables**: `investor_profiles` (varchar PK, clientId, profileType, status, expirationDate, draftAnswers, currentVersionId, createdBy), `investor_profile_versions` (varchar PK, profileId FK, versionNumber, questionSchemaId FK, answers JSONB, submittedBy, submittedAt), `investor_profile_question_schemas` (2 active: individual + legal_entity).
- **Backend** (added to `server/routes/cassidy.ts`):
  - `GET /api/cassidy/profile-diff/:client_id/:profile_type` — Returns prior version's answered_questions for diff display. Advisor-scoped.
  - `POST /api/cassidy/profile-commit` — Validates job_id, client_id, profile_mode, answer_actions[]. Builds answered_questions map (accept=cassidy draft, override=custom, skip=excluded). Finds/creates investor_profile, creates version with next version_number, links questionSchemaId, sets expirationDate +1yr, audit logs. Returns profile_id + version_number + counts.
  - `GET /api/cassidy/job-output/:job_id` — Returns job output with request_payload for commit page to extract draft questions, client_id, profile_mode.
- **Frontend**:
  - `client/src/components/cassidy/override-answer-modal.tsx` — Dialog for custom answer + optional reasoning.
  - `client/src/components/cassidy/profile-commit-wizard.tsx` — Question-by-question wizard with RadioGroup (accept/override/skip), prior answer diff with DIFF badge, progress bar, navigation (prev/next), commit button. Fetches prior answers on mount.
  - `client/src/pages/profile-commit.tsx` — Page at `/profile-commit/:jobId`. Fetches job output, extracts answered questions, renders wizard.
- **Navigation**: Route `/profile-commit/:jobId` in App.tsx. Profile draft viewer has "Review & Commit Profile" button navigating to commit page. Commit success navigates back to intake.
- **Profile draft viewer updated**: Added `onCommit` callback prop + "Review & Commit Profile" button at bottom.

### Meeting Signals Agent Integration (Step 11.1)
- **Purpose**: Scan meeting transcripts/summaries for life events, material changes, and workflow triggers. Displays detected signals as priority-sorted cards with actionable buttons.
- **Database**: `detected_signals` table (varchar PK, jobId, clientId FK, meetingId FK, advisorId FK, signalType, description, confidence HIGH/MEDIUM/LOW, materiality CRITICAL/IMPORTANT, sourceSnippet, dateReference, recommendedActions JSONB, status pending/actioned/dismissed, reviewRequired, duplicateLikelihood, reasoning, timestamps). Indexes on client_id, meeting_id, status, materiality, advisor_id.
- **Backend** (added to `server/routes/cassidy.ts`):
  - `POST /api/cassidy/scan-signals` — Validates meeting exists + has content, validates client exists, fetches prior signals (90 days), creates cassidyJobs record with taskType "signal_detection", calls Cassidy webhook, starts timeout. Returns 202 with job_id.
  - `GET /api/cassidy/signals/:meetingId` — Returns signals for meeting sorted by materiality (CRITICAL first) then confidence then recency, filter by status query param. Advisor-scoped.
  - `GET /api/cassidy/signals/client/:clientId` — Returns signals for client with days + filter params. Advisor-scoped.
  - `PATCH /api/cassidy/signals/:signalId` — Updates signal status to actioned/dismissed/pending. Advisor-scoped.
- **Callback handler** (`server/integrations/cassidy/callback-handler.ts`): Extended to handle `signal_detection` task type. After storing responsePayload, inserts each signal from `output.signals` into `detected_signals` table.
- **Frontend**:
  - `client/src/hooks/use-signal-scan-job.ts` — SSE hook (same pattern as useIntakeJob) for signal detection results. Parses signals[], warnings[], no_signal_summary.
  - `client/src/components/cassidy/signal-scanner.tsx` — Button component to initiate scan. Disabled if no content.
  - `client/src/components/cassidy/signal-cards.tsx` — Card display for detected signals with materiality styling, confidence badges, source snippets, date references, action buttons, expand/collapse for metadata. Sorted by materiality then confidence.
- **Integration points**: Signal scanning section added to MeetingDetailDialog Process tab (`client/src/pages/meetings.tsx`) and MeetingDetailContent in client-detail view (`client/src/pages/client-detail/meetings-section.tsx`). Existing signals fetched on load via GET endpoint.
- **Proactive signal detection** (real-time background scan):
  - `client/src/hooks/use-proactive-signals.ts` — Hook that auto-fetches client signals via `GET /api/cassidy/signals/client/:clientId` after a 3-second debounce when the advisor navigates to a client detail page. Deduplicates by filtering out already-actioned/dismissed signals. Maps signal types to relevant sections (e.g., `retirement` → "retirement", `beneficiary_change` → "estate"). Polls every 60 seconds and reactively updates via SSE.
  - `client/src/components/cassidy/signal-detail-card.tsx` — `SignalDetailCard` component showing signal details with materiality styling, confidence badges, and action buttons. `SignalBadgePopover` wraps tab badges for expandable signal detail on click.
  - `client/src/components/cassidy/proactive-signals-banner.tsx` — `ProactiveSignalsBanner` collapsible bar shown below client nav when active signals exist. Shows signal count, critical count, section breakdown, with expandable detail per section and "Go to section" navigation.
  - `ClientDetailNav` updated to accept optional `signalCounts` prop for numeric badges on nav group buttons and section tabs (amber dot styling).
  - `use-signal-action.ts` updated to use prefix-based invalidation for all `/api/cassidy/signals` queries so proactive signal counts refresh immediately after actions.
- **Signal categories**: CRITICAL (retirement, divorce, death, business_sale, business_acquisition, liquidity_event, concentrated_stock), IMPORTANT (marriage, birth, relocation, beneficiary_change, trust_estate_change, employment_change, insurance_need, legal_entity_change).

### Signal-to-Workflow Routing (Step 11.2)
- **Purpose**: Route detected signals to downstream workflows when advisor clicks action buttons on signal cards. Seven action types supported.
- **Database**:
  - `signal_actions` table (audit trail): id (varchar PK), signal_id FK→detected_signals, advisor_id FK→advisors, action_type, action_timestamp, action_status (pending/success/failed), action_result JSONB, timestamps. Indexes on signal_id, advisor_id, created_at.
  - `detected_signals` columns added: action_history JSONB, action_taken_at TIMESTAMP, action_metadata JSONB.
- **Action handlers** (`server/integrations/cassidy/handlers/`): Each exports `validate()` and `execute()` functions.
  - `investor-profile-handler.ts` — Validates client ownership, checks for approved facts, invokes Investor Profile Agent via Cassidy workflow. Creates cassidyJobs record.
  - `fact-finder-handler.ts` — Exports `retirementFinder` and `businessOwnerFinder`. Returns navigation URLs to fact finder pages with signal_id param.
  - `task-handler.ts` — Creates task in tasks table with signal context, 7-day due date, priority based on materiality.
  - `alert-handler.ts` — Creates alert in alerts table with signal details, severity mapped from materiality.
  - `beneficiary-audit-handler.ts` — Creates a task and alert for the advisor with signal context (transactional). Validates clientId presence. Priority/severity based on materiality.
  - `planning-triage-handler.ts` — Maps recommended planning tools to existing calculator routes (RMD → /calculators/rmd, Budget → /calculators/budget). Returns informational recommendations for unavailable tools (Roth Conversion, Tax Bracket, etc.). Normalizes tool list input safely.
- **API routes** (added to `server/routes/cassidy.ts`):
  - `POST /api/cassidy/signals/:signalId/action` — Validates signal exists + advisor-scoped, validates action_type in recommended_actions, checks handler preconditions, creates audit entry, executes handler, updates signal status to "actioned" with action_history/metadata. Returns result with optional navigation URL.
  - `GET /api/cassidy/signals/:signalId/actions` — Returns audit trail of actions taken on a signal.
- **Frontend**:
  - `client/src/hooks/use-signal-action.ts` — Hook for dispatching signal actions. Makes POST request, shows success/error toast, auto-navigates on navigation URL in result, invalidates signal queries.
  - `client/src/components/cassidy/signal-action-button.tsx` — Button component wrapping useSignalAction hook. Shows loading spinner during dispatch, disables while loading.
  - `client/src/components/cassidy/signal-cards.tsx` — Updated to use SignalActionButton instead of raw buttons. Removed onActionClick prop in favor of self-contained action dispatch.

### Report Writer Agent Integration (Step 11.3)
- **Purpose**: AI-powered report generation for clients. Advisor selects report type, provides instruction, and the system gathers client context (approved facts, meeting summaries, calculator results) to generate a draft via Cassidy AI.
- **Database**:
  - `report_artifacts` table extended with columns: jobId, reportType, draftTitle, fullDraftText, draftSections JSONB, includedSources JSONB, assumptionNotes JSONB, missingInfoFlags JSONB, confidenceSummary JSONB, wordCount INT. Indexes on jobId, reportType, status.
  - `"report_generation"` added to VALID_TASK_TYPES in cassidy.ts.
- **API routes** (added to `server/routes/cassidy.ts`):
  - `POST /api/cassidy/generate-report` — Validates report_type (8 types), advisor_instruction (50-500 chars), client ownership. Gathers approved facts, meeting summary, calculator results. Creates cassidyJobs record, dispatches to Cassidy webhook. Returns 202 with job_id. Handles webhook dispatch failure (marks job failed, publishes error event).
  - `GET /api/cassidy/report-drafts/:draftId` — Returns single draft (advisor-scoped).
  - `GET /api/cassidy/report-drafts/client/:clientId` — Returns drafts for client (advisor-scoped, paginated with bounds 1-100).
  - `PATCH /api/cassidy/report-drafts/:draftId` — Updates status (draft/reviewed only) or edits text (max 50K chars, increments version). Locked for approved/discarded drafts.
- **Callback handler** (`server/integrations/cassidy/callback-handler.ts`):
  - Extended for `taskType === "report_generation"`. Persists draft to report_artifacts BEFORE marking job completed. On persistence failure, marks job failed and publishes error event. Includes draft_id in SSE event.
- **Frontend**:
  - `client/src/components/cassidy/report-request-form.tsx` — Report type selector (8 types), instruction textarea with character counter, approved facts badge, SSE job tracking. Shows generating/completed/failed states.
  - `client/src/components/cassidy/report-draft-viewer.tsx` — Full draft display with sections, content, missing info flags. Sidebar with assumptions, sources, confidence summary, details.
  - `client/src/components/client-reports-section.tsx` — Updated with tab toggle (Template Reports / AI Reports). AI tab shows ReportRequestForm + AI-generated drafts list with view buttons. Clicking a draft opens ReportReviewPanel.

### Report Artifact Storage & Review (Step 11.4)
- **Purpose**: Versioning, inline editing, version comparison, and approval workflow for report drafts. Advisors can edit drafts, save versions, compare versions, and approve/discard with confirmation dialogs.
- **Database**:
  - `report_artifact_versions` table: id, artifact_id FK→report_artifacts(id) ON DELETE CASCADE, version_number, draft_text, edited_by FK→advisors(id), edit_summary, created_at. UNIQUE(artifact_id, version_number). Indexes on artifact_id, created_at.
  - `report_artifacts` extended: original_draft_text TEXT, edit_count INTEGER DEFAULT 0.
- **Storage service** (`server/integrations/cassidy/report-storage.ts`):
  - `saveDraftVersion(draftId, advisorId, edits, editSummary?)` — Creates version record, updates artifact (fullDraftText, version, editCount), captures originalDraftText on first edit (from fullDraftText or rendered sections). Blocks edits on approved/discarded drafts.
  - `getDraftVersions(draftId, advisorId)` — Returns all versions ordered by version_number desc.
  - `getVersionDiff(draftId, advisorId, v1, v2)` — Line-by-line diff between two versions. Uses originalDraftText for v1=1 baseline, fullDraftText for current version shortcut.
  - `approveDraft(draftId, advisorId)` — Sets status to "approved", locks draft.
  - `discardDraft(draftId, advisorId)` — Sets status to "discarded".
- **API routes** (added to `server/routes/cassidy.ts`):
  - `POST /api/cassidy/report-drafts/:draftId/save-version` — Validates edits (non-empty, max 50K), edit_summary (optional, max 500). Creates version via storage service. Returns updated draft + version number.
  - `GET /api/cassidy/report-drafts/:draftId/versions` — Returns version history (advisor-scoped).
  - `GET /api/cassidy/report-drafts/:draftId/diff?v1=N&v2=M` — Returns line-by-line diff with added/removed/unchanged markers.
  - `POST /api/cassidy/report-drafts/:draftId/approve` — Approves draft with lock (advisor-scoped).
  - `POST /api/cassidy/report-drafts/:draftId/discard` — Discards draft (advisor-scoped, blocks on approved).
  - `PATCH /api/cassidy/report-drafts/:draftId` — Hardened: blocks modifications on approved/discarded drafts, restricts status changes to draft/reviewed only.
- **Frontend**:
  - `client/src/components/cassidy/report-review-panel.tsx` — Full review interface: inline edit mode (textarea + edit summary + save version), version history sidebar, diff comparison view with version selectors, approve/discard with AlertDialog confirmations. Locked state disables editing. Dark mode compatible.
  - `client/src/components/client-reports-section.tsx` — AI Reports tab now opens ReportReviewPanel instead of simple viewer.

### Fin Multi-Step Orchestration (Phase 13)
- **Purpose**: Multi-agent chaining, structured follow-up prompts, unified trace/explain layer, and Fin Copilot UX for conversational AI-powered wealth management.
- **Database**:
  - `agent_chain_steps` table: id, jobId FK→cassidyJobs.jobId, chainPosition, agentName, agentPromptHash, status (pending/in_progress/completed/failed), inputContext JSONB, outputContext JSONB, errorMessage, executionDurationMs, startedAt, completedAt, createdAt, updatedAt. Indexes on jobId, status, unique(jobId+chainPosition).
  - `conversation_turns` table: id, conversationId, sessionId, advisorId FK→advisors.id, clientId FK→clients.id, turnNumber, role, content, jobId FK→cassidyJobs.jobId, suggestedPrompts JSONB, tokenUsage, executionTimeMs, parentTurnId, createdAt, updatedAt. Indexes on conversationId, advisorId, unique(conversationId+turnNumber).
  - `execution_traces` table: id, jobId unique FK→cassidyJobs.jobId, traceData JSONB, summary, status, totalDurationMs, createdAt, updatedAt.
  - `cassidyJobs` extended: secondaryAgents JSONB, mergedOutput JSONB, chainStatus VARCHAR(50) DEFAULT 'single_agent', conversationTurnId VARCHAR FK→conversation_turns.id.
- **Backend Modules** (`server/integrations/cassidy/`):
  - `chain-context-builder.ts` — buildChainPrompt, formatContextForPrompt, injectContextIntoPrompt. Queries cassidyJobs, agentChainSteps, clients, households for chain context.
  - `chain-executor.ts` — executeChain (sequential multi-agent execution with SSE updates), hasSecondaryAgents, getChainStats. Creates agent_chain_steps records, merges outputs.
  - `conversation-context.ts` — buildConversationContext, injectConversationContext, getConversationSummary. Fetches conversation turns for context injection.
  - `trace-builder.ts` — buildTraceTimeline, getFullTrace. Aggregates cassidyJobs + agentChainSteps into timeline steps.
  - `callback-handler.ts` — Extended to detect secondary_agents in callback output and asynchronously trigger chain execution.
- **API Routes** (added to `server/routes/cassidy.ts`):
  - POST /api/conversations — Start new conversation (returns conversation_id)
  - POST /api/conversations/:conversationId/turns — Record a turn
  - GET /api/conversations/:conversationId — Fetch full thread
  - GET /api/conversations — List advisor's recent conversations
  - GET /api/cassidy/jobs/:jobId/trace — Returns timeline
  - GET /api/cassidy/jobs/:jobId/trace/full — Returns full trace for audit
  - GET /api/cassidy/jobs/:jobId/chain-stats — Returns chain execution stats
  - GET /api/cassidy/review-queue — Returns pending review items (facts, profiles, reports, signals)
- **Frontend Hooks** (`client/src/hooks/`):
  - `use-conversation.ts` — useConversation hook with useQuery/useMutation for conversation turns
  - `use-trace.ts` — useTrace hook for fetching job trace timeline
  - `use-copilot-state.ts` — useCopilotState for managing copilot state (submit, poll, response)
  - `use-review-queue.ts` — useReviewQueue for pending review items
- **Frontend Components** (`client/src/components/cassidy/`):
  - `follow-up-prompts-v2.tsx` — Interactive prompt buttons with per-button loading states
  - `conversation-thread.tsx` — Vertical message thread (advisor/Fin) with auto-scroll, typing indicator
  - `trace-timeline.tsx` — Expandable vertical timeline with status icons, duration, detail panels
  - `trace-detail-panel.tsx` — Key-value trace detail renderer with copy-to-clipboard
  - `copilot-prompt-bar.tsx` — Client selector + prompt textarea + submit button
  - `copilot-response-area.tsx` — 5-tab response display (Summary, Details, Sources, Actions, Trace)
  - `review-queue-sidebar.tsx` — Pending review items sidebar (facts, profiles, reports, signals)
- **Fin Copilot Page** (`client/src/pages/fin-copilot.tsx`):
  - 3-column layout: conversation history sidebar | main chat + response area | review queue sidebar
  - View mode toggle: Chat (conversation thread) / Analysis (tabbed response)
  - Welcome screen with suggested prompts
  - Responsive design (sidebars collapsible on mobile)
  - Route: `/copilot`, sidebar nav "Fin Copilot" (Bot icon)
  - Added to command palette for search

### SOP Knowledge Base & Custodial Instructions (Phase 15)
- **Purpose**: RAG-based knowledge system for Standard Operating Procedures and custodial form requirements. Advisors can ask natural language questions about SOPs and get answers with source citations. Custodial instruction library organized by custodian and action type.
- **Database**:
  - `sop_documents` table: id, title, category, description, content, version, status (active/draft/archived), uploadedBy, createdAt, updatedAt. Indexes on category, status.
  - `sop_chunks` table: id, documentId FK→sop_documents.id (CASCADE), chunkIndex, content, metadata JSONB, createdAt. Index on documentId.
  - `custodial_instructions` table: id, custodian, actionType, formName, description, requiredFields JSONB, requiredSignatures JSONB, supportingDocuments JSONB, instructions, processingTime, notes, status, createdAt, updatedAt. Indexes on custodian, actionType.
- **Backend**:
  - `server/routes/sop.ts` — SOP document CRUD, chunk ingestion pipeline (automatic text chunking with overlap), RAG query endpoint, custodial instruction CRUD, form requirements checker, custodians list.
  - `server/openai.ts` — `querySopKnowledgeBase()` function for RAG query with AI answer generation and source citations. Falls back to raw content display when AI unavailable.
  - Storage methods in `server/storage.ts` for all CRUD operations plus keyword-based chunk search with document join.
- **Frontend**:
  - `client/src/components/admin/sop-knowledge-tab.tsx` — Admin UI with 4 tabs: Query (natural language search), SOP Documents (CRUD), Custodial Instructions (CRUD with list editors for fields/signatures/documents), Form Requirements Checker.
  - Admin page section at `/admin/sop-knowledge`.
  - Fin Copilot integration: SOP-related queries detected via keyword matching and routed to RAG engine with inline source citations. Quick action buttons for SOP and custodial queries.
- **API Routes**:
  - GET/POST /api/sop/documents — List/create SOP documents
  - GET/PATCH/DELETE /api/sop/documents/:id — Get/update/delete SOP document
  - POST /api/sop/query — Natural language RAG query with source citations
  - GET/POST /api/custodial-instructions — List/create custodial instructions (filterable by custodian/actionType)
  - GET/PATCH/DELETE /api/custodial-instructions/:id — Get/update/delete instruction
  - POST /api/custodial-instructions/form-requirements — Check requirements for custodian+action
  - GET /api/custodial-instructions/custodians/list — List unique custodians and action types

### Free API Financial Data Layer (Phase 14)
- **Purpose**: Multi-provider market data architecture with automatic failover, caching, rate limiting, and real-time streaming.
- **Architecture** (`server/market-data/`):
  - `provider-interface.ts` — Core types: StockQuote, NewsItem, HistoricalData, Fundamentals, InsiderTransaction, EarningsEvent, SentimentScore, MarketDataProvider interface, ProviderCapability enum.
  - `provider-registry.ts` — Provider registration, capability-based chain lookup, health tracking (healthy/degraded/unavailable), success/failure recording.
  - `market-data-service.ts` — Unified service layer with automatic failover across provider chain per capability.
  - `providers/base-provider.ts` — Abstract base with metadata, health status, request logging.
  - `providers/yahoo-provider.ts` — Yahoo Finance (priority 3, fallback): real-time quotes, batch quotes, news. No API key needed.
  - `providers/finnhub-provider.ts` — Finnhub (priority 1, primary): quotes, news, sentiment, earnings, insider, company profile. Env: `FINNHUB_API_KEY`.
  - `providers/alpha-vantage-provider.ts` — Alpha Vantage (priority 2): historical time series, company fundamentals/overview. Env: `ALPHA_VANTAGE_API_KEY`. 25 calls/day limit.
  - `finnhub-websocket.ts` — EventEmitter-based WebSocket client for real-time price streaming. Injected via `setWebSocketClient()` pattern.
  - `cache-manager.ts` — DB-backed cache using `market_data_cache` table with TTL, upsert on conflict, daily cleanup.
  - `rate-limiter.ts` — Per-provider daily request tracking and enforcement.
  - `failover-manager.ts` — Periodic health checks (every 5 min), provider chain management.
  - `prefetch-engine.ts` — Background prefetch for client portfolios, popular tickers, daily earnings.
- **Database Tables**:
  - `market_data_cache`: id, provider, data_type, ticker, cache_key (unique), data (JSONB), fetched_at, expires_at, created_at. Indexes on (provider, ticker) and expires_at.
  - `api_usage_tracking`: id, provider, date, requests_made, requests_limit, last_request_at. Unique index on (provider, date).
- **API Endpoints** (`server/routes/market.ts`):
  - GET `/api/market/quote/:ticker` — Single stock quote
  - GET `/api/market/quotes` — Batch quotes (?tickers=AAPL,MSFT)
  - GET `/api/market/news` — Market news (?tickers=AAPL,MSFT)
  - GET `/api/market/historical/:ticker` — Historical data (?period=1Y&interval=daily)
  - GET `/api/market/fundamentals/:ticker` — Company fundamentals
  - GET `/api/market/earnings` — Earnings calendar (?from=&to=)
  - GET `/api/market/insider/:ticker` — Insider transactions
  - GET `/api/market/sentiment/:ticker` — Sentiment score
  - GET `/api/market/profile/:ticker` — Company profile
  - GET `/api/market/stream` — SSE real-time price stream (?tickers=AAPL,MSFT)
  - GET `/api/market/admin/dashboard` — Provider status, cache stats, rate limit usage

## Database Migrations
The project uses **Drizzle ORM migrations** (not `drizzle-kit push`) for versioned, reviewable schema changes. Migration files live in the `migrations/` directory.

### Scripts
- `npm run db:generate` — Generate a new migration from schema changes in `shared/schema.ts`
- `npm run db:migrate` — Apply pending migrations via CLI
- `npm run db:push-dev-only` — Direct schema push (development only, discouraged for production)

### Startup Migration Runner
`server/migrate.ts` automatically applies pending migrations when the server starts, before it begins listening for requests. This ensures the database schema is always up to date on deployment.

### Workflow for Schema Changes
1. Edit `shared/schema.ts`
2. Run `npm run db:generate` to create a migration file
3. Review the generated SQL in `migrations/`
4. The server will auto-apply it on next startup (or run `npm run db:migrate` manually)

## External Dependencies
- **Cassidy AI** (PRIMARY): Finn AI chat now routes through Cassidy AI (`server/lib/cassidy.ts`). Thread-based API: creates a thread per request, sends combined system+user prompt as message. API key: `CASSIDY_API_KEY` env secret. Assistant ID: `cml7j0m17014dqv1du8jur3cp`. Falls back to OpenAI if Cassidy unavailable.
- **OpenAI** (FALLBACK): Used as fallback when Cassidy API key is not set. Provides meeting prep, note summarization, follow-up emails, financial diagnostics, and transcript analysis.
- **Yahoo Finance (via `yahoo-finance2`)**: Provides real-time stock quotes and market data.
- **RSS Parser**: Used for fetching and processing financial news from various RSS feeds (e.g., Yahoo Finance, CNBC).
- **Multer**: Utilized for handling file uploads (e.g., meeting transcripts, client documents).
- **Express-session**: Manages user sessions for authentication.
- **Vite**: Frontend build tool.
- **TailwindCSS**: Utility-first CSS framework for styling.
- **Shadcn/ui**: UI component library.
- **Recharts**: Charting library for data visualization.
- **Drizzle ORM**: Object-relational mapper for PostgreSQL.
- **jsforce**: Salesforce API client for JWT OAuth and SOQL queries.
- **jsonwebtoken**: JWT token generation for Salesforce and Zoom auth flows.
- **@sendgrid/mail**: SendGrid email delivery service.
- **nodemailer**: SMTP email fallback provider.
- **axios**: HTTP client for Orion and Zoom API calls.

### Calculator Interpretation Panels
Reusable `CalculatorInterpretation` component (`client/src/components/cassidy/calculator-interpretation.tsx`) provides plain-language summaries, metric cards with Info tooltips, insight/warning lists, and "Analyze with Finn" CTA for all 11 calculators: RMD, Roth Conversion, Tax Bracket, Asset Location, Budget, QSBS Tracker, QSBS Calculator, Concentrated Stock, Life Insurance Gap, LTC Planning, Monte Carlo.

### Client Detail Sidebar
`ClientDetailSidebar` (`client/src/pages/client-detail/shared.tsx`) replaces `ClientDetailNav` on desktop. Flat grouped section list with search filter, recently visited sections (localStorage), active indicator with blue accent bar, and signal count badges. Mobile falls back to the original `ClientDetailNav` pill buttons. Main container widened to 1340px max-width.

### Client Insights Dashboard (Prop 24)
`ClientInsightsPage` (`client/src/pages/client-insights.tsx`) — Practice-level command center with 5 tabs:
- **Book Analytics**: AUM distribution with top-20 client ranking, cumulative percentages, HHI concentration index with risk assessment (red/yellow/green), revenue concentration analysis with top-5/10/20 percentages, what-if impact analysis (loss of top-5), and 3 mitigation strategies with projected revenue lift
- **Proactive Alerts**: Alert queue across 6 categories (RMD age proximity, policy renewal, stale plans, life events, portfolio drift, low engagement) with priority ranking (HIGH/MEDIUM/LOW), due dates, expandable details (action, objective, timeline, owner)
- **Opportunity Pipeline**: Cross-sell analysis with service penetration rates and revenue opportunity, referral potential scoring (0-100) with tier classification (Advocate/Promoter/Potential/At-Risk), assets-not-held estimation with capture timeline and probability, service tier upgrade candidates with revenue lift
- **Risk Dashboard**: Concentration risk (AUM + revenue HHI), compliance attention panel (missing IPS, outdated disclosures, capacity), client retention risk scoring with factors and improvement plans, market sensitivity stress testing (-15%/-25% decline scenarios)
- **Performance Metrics**: Client satisfaction, NPS score, revenue growth, response time, service efficiency metrics (clients served, reviews completed/overdue)
- **Segmentation**: By tier (Enterprise/Wealth/Comprehensive/Core/Foundational/Digital), by life stage (Accumulation/Pre-Retirement/Distribution/Legacy), by growth category
Backend: `server/engines/client-insights-engine.ts` — Analytics engine with `generateClientInsights()`. Route: `GET /api/client-insights` in `server/routes/client-insights.ts`.

### Client List Progressive Disclosure
`ClientRow` in `client/src/pages/clients.tsx` expands on click to reveal email, phone, last contact, occupation, health score, pending NBA count, and "View Client" button. Parent tracks `expandedId` state.

### Workflow Orchestration Engine
General-purpose workflow orchestration engine (`server/engines/workflow-orchestrator.ts`) that chains AI prompt executions into multi-step, event-driven workflows with human-in-the-loop gates, branching logic, retry/error handling, and compliance checkpoints.

**Schema**: `workflow_definitions`, `workflow_instances`, `workflow_step_executions`, `workflow_gates` tables in `shared/schema.ts`.
**Storage**: 16 CRUD methods in `IStorage`/`DatabaseStorage` for all workflow tables.
**Engine**: `WorkflowOrchestrator` class with step executor registry, exponential backoff retry (0s/30s/5min), gate creation/resolution (approve/reject/request_changes with rewind), conditional branching (evaluated after step completion), SSE events via `sseEventBus`, cancel/pause/resume.
**API**: REST endpoints at `/api/workflow-automations/` (definitions, instances, gates, trigger, cancel/pause/resume, overdue gate escalation) with advisor ownership authorization.
**Reference Implementation**: Client Meeting Lifecycle (`server/engines/workflow-definitions/meeting-lifecycle.ts`) — 9-step definition (7 AI steps + 2 human gates) with 2 branch rules. Auto-seeded on startup via `ensureMeetingLifecycleDefinition()`.
**MeetingPipeline Integration**: `processViaWorkflow()` method in `server/engines/meeting-pipeline.ts` delegates AI calls through the orchestrator.

### Onboarding Walkthrough
`OnboardingWalkthrough` (`client/src/components/onboarding-walkthrough.tsx`) — 5-step tooltip overlay with progress bar, step dots, back/next/skip controls. Persists completion state in localStorage (`od-onboarding-complete`). Wired into `AppLayout` in App.tsx. `useResetOnboarding()` hook exported for resetting from settings.