# Finn — Advisor Intelligence Suite

A full-stack wealth management platform built for financial advisors, powered by Next.js 16, real-time integrations with Salesforce FSC, Orion Advisor, and MuleSoft EAPI, and an AI copilot named **Finn**.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-Proprietary-red)

---

## Overview

Finn is a comprehensive advisor intelligence platform designed for wealth management professionals. It consolidates client data from multiple enterprise systems into a single, unified dashboard with AI-powered insights, planning tools, compliance workflows, and portfolio monitoring.

### Key Capabilities

- **Unified Dashboard** — Drag-and-drop customizable widgets with collapsible sections, real-time data from Orion and Salesforce, revenue pipeline tracking, and activity monitoring
- **Finn AI Copilot** — Conversational AI assistant for portfolio analysis, client insights, meeting prep, and compliance guidance
- **Client 360 View** — Household overview, portfolio performance, estate planning, philanthropy, financial goals, and life events in a single view
- **Portfolio Monitoring** — Live portfolio grid with holdings, performance metrics (alpha, Sharpe, drawdown), model drift analysis, and stress testing
- **Financial Calculators** — Roth conversion, RMD, tax bracket, concentrated stock, QSBS, life insurance gap, LTC planning, asset location, and budgeting
- **Estate Planning** — Trust modeling (GRAT, SLAT, QPRT, ILIT, CRT, DAF, Dynasty), GST tracking, TCJA sunset analysis, and gift history
- **Compliance & Risk** — Fiduciary guardrails, KYC/AML workflows, compliance reviews, audit logging, and validation rules
- **Business Succession** — Business valuations, buy-sell agreements, exit milestones, and FLP structures

---

## Architecture

```
                    ┌─────────────────────────────────┐
                    │        Next.js 16 App Router     │
                    │     (Pages + API Routes)         │
                    └──────────┬──────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
     ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
     │  React 18   │   │  API Layer  │   │  AI Engine  │
     │  + TanStack │   │  90+ REST   │   │  OpenAI /   │
     │  Query      │   │  endpoints  │   │  Vercel AI  │
     └──────┬──────┘   └──────┬──────┘   └─────────────┘
            │                  │
            │          ┌───────┼───────────┐
            │          │       │           │
      ┌─────▼────┐  ┌─▼───┐ ┌─▼────┐ ┌───▼────┐
      │ Drizzle  │  │Mule │ │Orion │ │  SFDC  │
      │ ORM +    │  │Soft │ │Adv.  │ │  FSC   │
      │ SQLite   │  │EAPI │ │ API  │ │  API   │
      └──────────┘  └─────┘ └──────┘ └────────┘
```

### Data Flow

1. **MuleSoft EAPI** — OAuth2 client credentials proxy layer routing to Salesforce and Orion
2. **Orion Advisor** — Portfolio accounts, holdings, performance, AUM, and market data
3. **Salesforce FSC** — Households, members, opportunities, tasks, events, and cases
4. **Local DB** — SQLite via Drizzle ORM for user settings, cached data, and application state

### Performance Optimizations

- **Tiered data loading** — Tier 1 (summary) loads instantly, Tier 2 (portfolio/members) loads in parallel, Tier 3 (monolithic) deferred until needed
- **N+1 query elimination** — Batch storage methods with Map lookups across all endpoints
- **Cache-Control headers** — Tiered HTTP caching (30s real-time to 5min slow-changing)
- **React Query persistence** — `PersistQueryClientProvider` with localStorage for instant page loads
- **Hover prefetch** — Client data prefetched on hover for instant navigation

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.6 |
| UI | React 18.3, Radix UI, Tailwind CSS 4, Lucide Icons |
| State | TanStack React Query v5, React Context |
| Charts | Recharts 2.15 |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Database | SQLite + Drizzle ORM |
| Auth | Session-based with bcrypt |
| AI | OpenAI GPT-4 via Vercel AI SDK |
| Integrations | MuleSoft EAPI, Orion Advisor, Salesforce FSC, Microsoft Graph, Cassidy AI |
| Forms | React Hook Form + Zod validation |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Capodici888/Finn-Advisor-Intelligence.git
cd Finn-Advisor-Intelligence

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your credentials

# Initialize the database
npm run db:push-dev-only

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Environment Configuration

See `.env.example` for all available configuration options. Key settings:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session encryption key (min 32 chars) |
| `OPENAI_API_KEY` | OpenAI API key for Finn AI |
| `MULESOFT_ENABLED` | Enable MuleSoft EAPI integration |
| `MULESOFT_CLIENT_ID/SECRET` | OAuth2 credentials for MuleSoft |
| `ACTIVE_PORTFOLIO_PROVIDER` | `orion`, `mulesoft`, or `blackdiamond` |
| `SALESFORCE_ENABLED` | Enable Salesforce FSC integration |
| `ORION_ENABLED` | Enable Orion Advisor integration |
| `ORION_REP_CODE` | Advisor rep code to filter portfolios |

### Scripts

```bash
npm run dev          # Start development server (webpack)
npm run build        # Production build
npm run start        # Start production server
npm run check        # TypeScript type checking
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run database migrations
```

---

## Project Structure

```
├── app/
│   ├── (auth)/              # Login, signup pages
│   ├── (dashboard)/         # All dashboard pages
│   │   ├── clients/         # Client list + detail views
│   │   ├── calculators/     # 9 financial calculators
│   │   ├── compliance/      # Compliance & risk management
│   │   └── ...              # 30+ page modules
│   └── api/                 # 90+ REST API routes
│       ├── clients/[id]/    # Client endpoints (summary, portfolio, estate, etc.)
│       ├── alerts/          # Alert management
│       ├── meetings/        # Meeting scheduling
│       └── ...
├── client/src/
│   ├── components/          # UI components
│   │   ├── dashboard/       # Dashboard widgets (RevenuePipeline, etc.)
│   │   ├── settings/        # Settings page sections
│   │   └── ui/              # Shared UI primitives (shadcn/ui)
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Page components
│   └── lib/                 # Utilities, query client
├── server/
│   ├── integrations/        # External service clients
│   │   ├── mulesoft/        # MuleSoft EAPI (OAuth2 proxy)
│   │   ├── orion/           # Orion Advisor API
│   │   ├── salesforce/      # Salesforce FSC API
│   │   └── microsoft/       # Microsoft Graph (calendar)
│   ├── engines/             # Business logic engines
│   ├── prompts/             # AI system prompts
│   └── storage.ts           # Database access layer
├── shared/                  # Shared types and schemas
└── drizzle/                 # Database migrations
```

---

## Dashboard Widgets

The My Day dashboard features customizable, drag-and-drop widgets:

| Widget | Description |
|--------|-------------|
| Schedule & Calendar | Unified meetings view with Outlook integration |
| Action Queue | Prioritized next-best-actions for clients |
| Calculator Runs | Recent financial calculator simulations |
| Goals Dashboard | Client goal tracking with funded ratios |
| Insights | AI-generated practice insights |
| Alerts & Reminders | Time-sensitive notifications |
| Recently Closed | Recently closed opportunities |
| Revenue & Pipeline | Revenue goals, pipeline tracking with source badges (EST/SF/OR) |
| Pipeline | Open opportunities with stages and close dates |
| Net Flows | Asset flows MTD, QTD, YTD with trend |
| Portfolio Monitor | Live portfolio monitoring grid |

---

## Integrations

### MuleSoft EAPI
OAuth2 client credentials flow proxying requests to Salesforce and Orion. Includes circuit breaker pattern (5 failures triggers 30s open state) and configurable timeout.

### Orion Advisor
Portfolio data including accounts, holdings, performance metrics, AUM history, and market data. Fuzzy name matching links Orion portfolios to Salesforce households.

### Salesforce FSC
Household data, members, opportunities, tasks, events, cases, and financial accounts. Paginated queries with 50-record page size.

### Microsoft Graph
Outlook calendar integration for meeting display on the dashboard.

### Cassidy AI
Workflow orchestration for automated advisor tasks via webhook integration.

---

## License

Proprietary. All rights reserved.

---

Built with [Claude Code](https://claude.ai/claude-code)
