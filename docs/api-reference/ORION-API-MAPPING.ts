// =============================================================================
// ORION API ENDPOINT MAPPING FOR WEALTH ADVISORY DASHBOARD
// =============================================================================
//
// Base URLs:
//   TEST:       https://testapi.orionadvisor.com/api/v1
//   PRODUCTION: https://api.orionadvisor.com/api/v1
//
// Authentication: OAuth (recommended by Orion for SSO + complex work)
//   Token endpoint: POST /api/v1/Security/Token
//   Refresh:        POST /api/v1/Security/Token (with Bearer {refresh_token})
//
// Entity IDs (from Orion Contextual SSO docs):
//   5   = Household
//   6   = Registration
//   7   = Account
//   107 = Portfolio Group
//
// Orion Data Model Hierarchy:
//   Firm → Representative → Household → Registration → Account → Asset → Transaction
//                                    → Portfolio Group (custom grouping)
//
// SOURCE: https://developers.orionadvisor.com/guides/data-model/
// SOURCE: https://developers.orionadvisor.com/quick-start/
// SOURCE: https://developers.orionadvisor.com/guides/best-practices-workflow/
// =============================================================================


// ─────────────────────────────────────────────────────────────────────────────
// AUTHENTICATION
// ─────────────────────────────────────────────────────────────────────────────

export const ORION_AUTH = {
  method: "OAuth (recommended)",
  tokenEndpoint: "POST /api/v1/Security/Token",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    "client_id": "{partner_client_id}",
    "client_secret": "{partner_client_secret}",
  },
  response: {
    access_token: "string — use as 'Authorization: Session {access_token}'",
    expires_in: "number — default 36000 seconds (10 hours)",
    refresh_token: "string — one-time use, get new access_token + refresh_token",
  },
  impersonation: {
    purpose: "For client-level access without client knowing Orion credentials",
    method: "GET /api/v1/Security/Token with Authorization: Impersonate header",
    headers: { Entity: "5", EntityId: "{householdId}" },
    note: "Household ID (Entity=5) from Orion maps to SF Household via Integration Tracker",
  },
  userEndpoint: "GET /api/v1/Authorization/User — returns user details, Orion User ID, database",
};


// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO DOMAIN — Households, Registrations, Accounts, Assets
// Guide: https://developers.orionadvisor.com/guides/creating-a-new-portfolio-or-household/
// ─────────────────────────────────────────────────────────────────────────────

export const ORION_PORTFOLIO_ENDPOINTS = {

  // ─── HOUSEHOLD (Client) ──────────────────────────────────────────────
  getHouseholds: {
    endpoint: "GET /api/v1/Portfolio/Clients",
    description: "Retrieve all households for the authenticated representative",
    orionEntity: "Household (Entity ID: 5)",
    responseFields: [
      "id — Orion Household ID (maps to SF via Integration Tracker)",
      "name — household display name",
      "firstName, lastName — head of household",
      "representativeId — assigned advisor",
      "isActive — active/inactive status",
      "address1, address2, city, state, zip, country",
      "email, homePhone, fax",
      "createdDate, editedDate",
    ],
    usedBy: {
      serviceCall: "clientService.getHouseholds()",
      tsInterface: "Household[]",
      pages: ["Page 2 Clients", "Page 1 Dashboard (client count)"],
    },
  },

  getHouseholdVerbose: {
    endpoint: "GET /api/v1/Portfolio/Clients/{clientId}/Verbose",
    description: "Get full household detail including billing, registrations",
    responseFields: [
      "client.id — Household ID",
      "client.portfolio.firstName, lastName, name",
      "client.portfolio.representativeId",
      "client.portfolio.isActive, startDate",
      "client.portfolio.address1, city, state, zip, email, homePhone",
      "client.portfolio.categoryId — client category",
      "client.billing — billing configuration",
      "client.recurringAdjustments",
    ],
    usedBy: {
      serviceCall: "clientService.getProfile(clientId)",
      tsInterface: "ClientProfile",
      pages: ["Page 8 Client360"],
    },
  },

  getHouseholdNew: {
    endpoint: "GET /api/v1/Portfolio/Accounts/NewPortfolio/New",
    description: "Get template for creating new household (pre-populated defaults)",
    method: "GET (template) → POST (create)",
  },

  // ─── REGISTRATION ────────────────────────────────────────────────────
  getRegistrations: {
    endpoint: "GET /api/v1/Portfolio/Registrations?clientId={householdId}",
    description: "Get registrations (account owners/types) for a household",
    orionEntity: "Registration (Entity ID: 6)",
    responseFields: [
      "id — Registration ID",
      "name — registration name",
      "registrationType — IRA, 401k, Trust, etc.",
      "ssn, dateOfBirth",
      "clientId — parent Household ID",
    ],
    usedBy: {
      serviceCall: "clientService.getAccounts(clientId) — intermediate step",
      notes: "Registration contains the account type info. Account is nested under Registration.",
    },
  },

  // ─── ACCOUNT ─────────────────────────────────────────────────────────
  getAccounts: {
    endpoint: "GET /api/v1/Portfolio/Accounts?clientId={householdId}",
    alternateV2: "POST /api/v2/account/accounts/list — supports pagination",
    description: "Get all financial accounts for a household",
    orionEntity: "Account (Entity ID: 7)",
    responseFields: [
      "id — Account ID",
      "name — account display name",
      "custodianId — custodian (Schwab, Fidelity, etc.)",
      "custodialAccountNumber",
      "fundFamilyId",
      "managementStyleId",
      "isActive",
      "currentValue — current market value",
      "startDate",
    ],
    relatedEndpoints: [
      "GET /api/v1/Portfolio/Custodians/Simple — list of custodians",
      "GET /api/v1/Portfolio/FundFamilies — list of fund families",
    ],
    usedBy: {
      serviceCall: "clientService.getAccounts(clientId)",
      tsInterface: "Account[]",
      pages: ["Page 8 Client360 (accounts section)", "Page 2 Clients (account count)"],
    },
  },

  // ─── ASSET (Holdings) ────────────────────────────────────────────────
  getAssets: {
    endpoint: "GET /api/v1/Portfolio/Assets?accountId={accountId}",
    description: "Get individual holdings for an account",
    orionDataModel: "Asset → related to Product (the security) and Transactions",
    responseFields: [
      "id — Asset ID",
      "accountId — parent Account",
      "productId — the security (maps to Product)",
      "shares — number of shares",
      "currentValue — market value",
      "costBasis",
      "unrealizedGainLoss",
    ],
    usedBy: {
      serviceCall: "portfolioService.getHoldings(householdId)",
      tsInterface: "Holding[]",
      pages: ["Page 7 Investments (holdings table)", "Page 8 Client360 (portfolio section)"],
    },
  },

  // ─── TRANSACTIONS ────────────────────────────────────────────────────
  getTransactions: {
    endpoint: "GET /api/v1/Portfolio/Transactions?accountId={accountId}",
    description: "Get transaction history — cash flows, trades, dividends, contributions",
    orionDataModel: "Transaction → grouped by Asset, includes all cash flows",
    responseFields: [
      "id, accountId, assetId",
      "transactionDate",
      "transactionType — buy, sell, dividend, contribution, withdrawal, etc.",
      "amount, shares, price",
      "ticker, productName",
    ],
    usedBy: {
      serviceCall: "clientService.getTransactions(clientId)",
      tsInterface: "Transaction[]",
      pages: ["Page 8 Client360 (transactions section)"],
    },
  },

  // ─── PORTFOLIO GROUP ─────────────────────────────────────────────────
  getPortfolioGroups: {
    endpoint: "GET /api/v1/Portfolio/Groups?clientId={householdId}",
    alternateV2: "POST /api/v2/portfolio/portfolios/list — supports pagination",
    description: "Custom grouping of accounts within a household",
    orionEntity: "Portfolio Group (Entity ID: 107)",
    notes: "Used for trading and performance, NOT billing. Can group accounts from different registrations.",
  },

  // ─── DOCUMENTS ───────────────────────────────────────────────────────
  uploadDocument: {
    endpoint: "POST /api/v1/Portfolio/Clients/{clientId}/Documents",
    description: "Upload documents to a household (Client Portal accessible)",
    guide: "https://developers.orionadvisor.com/guides/uploading-documents-to-a-household/",
  },

  // ─── CUSTOM FIELDS (User Defined Fields) ─────────────────────────────
  getCustomFields: {
    endpoint: "GET /api/v1/Portfolio/UserDefinedFields",
    createEndpoint: "POST /api/v1/Portfolio/UserDefinedFields",
    updateEndpoint: "PUT /api/v1/Portfolio/UserDefinedFields/{fieldId}",
    description: "Custom fields on Household, Registration, Account entities",
    notes: "Can store tier, segment, or any custom classification on the Orion entity",
  },

  // ─── REPRESENTATIVE (Advisor) ────────────────────────────────────────
  getRepresentative: {
    endpoint: "GET /api/v1/Portfolio/Representatives/{repId}",
    createEndpoint: "POST /api/v1/Portfolio/Representatives",
    description: "Advisor profile — personal contact info, custodian IDs, custom fields",
    usedBy: {
      serviceCall: "configService.getAdvisor()",
      tsInterface: "Advisor",
      pages: ["All pages (sidebar)"],
    },
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// REPORTING DOMAIN — Performance, Allocation, Activity
// Guide: Reporting Scope (the most powerful data endpoint)
// ─────────────────────────────────────────────────────────────────────────────

export const ORION_REPORTING_ENDPOINTS = {

  // ─── REPORTING SCOPE (Master endpoint) ───────────────────────────────
  reportingScope: {
    endpoint: "POST /api/v1/Reporting/Scope",
    description: "THE MASTER DATA ENDPOINT — combines performance, allocation, activity in one call",
    guide: "Reporting Scope - Performance/Allocation/Activity Summary - Exhaustive",
    payload: {
      entity: '"Household"',
      entityIds: "[1, 2, 3] — array of Orion Household IDs",
      asOfDate: '"2026-03-16" — defines the reporting date',
    },
    calculationObjects: {
      "Performance (managed=1)": "Returns portfolio vs benchmark returns, alpha, Sharpe ratio",
      "Activity Summary (managed=2)": "Returns cash flows, contributions, distributions, trades",
      "Allocation (managed=4)": "Returns current asset allocation with target drift",
      "Portfolio Detail (managed=8)": "Returns holding-level detail",
      "Tax Detail (managed=16)": "Returns tax lot detail for harvesting",
    },
    managedFilter: {
      0: "All — show everything",
      1: "Managed Performance",
      2: "Managed Activity Summary",
      4: "Managed Allocation",
      8: "Managed Portfolio Detail",
      16: "Managed Tax Detail",
      "-1": "Unmanaged Performance",
      "-4": "Unmanaged Allocation",
    },
    dateOptions: {
      quickDates: "MTD, QTD, YTD, 1Y, 3Y, 5Y, 10Y, Inception",
      customRange: "startDate + endDate or startDateExpression + endDateExpression",
    },
    accountInclusion: {
      Default: "Use database settings",
      "All Accounts": "All regardless of value or IsActive",
      "Active Accounts": "Only IsActive = 1",
      "Accounts with value": "ActiveOnly AND had value on EndDate",
    },

    // MAP TO FRONT-END SERVICE CALLS:
    usedBy: [
      {
        serviceCall: "portfolioService.getPerformance(householdId)",
        tsInterface: "PerformancePeriod[]",
        scopeConfig: { managed: 1 },
        pages: ["Page 7 Investments (performance table)"],
      },
      {
        serviceCall: "portfolioService.getAllocation(householdId)",
        tsInterface: "AssetAllocationSlice[]",
        scopeConfig: { managed: 4 },
        pages: ["Page 7 Investments (allocation pie chart)", "Page 8 Client360"],
      },
      {
        serviceCall: "dashboardService.getSummaryCards() — Total AUM, Net Flows",
        scopeConfig: { entity: "Representative", managed: 0 },
        notes: "Aggregate at rep level for Total AUM across all households",
        pages: ["Page 1 Dashboard (AUM card, Net Flows card)"],
      },
    ],
  },

  // ─── PERFORMANCE DATA ────────────────────────────────────────────────
  getPerformance: {
    endpoint: "GET /api/v1/Reporting/Performance?entityId={householdId}&entity=5",
    description: "Get performance returns for a household",
    guide: "Getting Performance Data",
    responseFields: [
      "returnPercent — portfolio return",
      "benchmarkReturnPercent — benchmark return",
      "alpha — excess return",
      "startDate, endDate",
    ],
    usedBy: {
      serviceCall: "portfolioService.getPerformance(householdId)",
      tsInterface: "PerformancePeriod[]",
      mockExport: "performanceSummary",
      pages: ["Page 7 Investments"],
      fieldMapping: {
        "period": "quickDate label (MTD, QTD, YTD, etc.)",
        "returnPct": "returnPercent",
        "benchmarkPct": "benchmarkReturnPercent",
        "alpha": "returnPercent - benchmarkReturnPercent",
      },
    },
  },

  // ─── BENCHMARK PERFORMANCE ───────────────────────────────────────────
  getBenchmarkPerformance: {
    endpoint: "GET /api/v1/Reporting/Benchmark/Performance",
    description: "Get benchmark returns for comparison",
    guide: "Benchmark Performance",
  },

  // ─── HOUSEHOLD PORTFOLIO VIEW CARDS ──────────────────────────────────
  getHouseholdViewCards: {
    endpoint: "GET /api/v1/Reporting/HouseholdViewCards?clientId={householdId}",
    description: "Summary cards for household — Total Value, Net Flows, Performance",
    guide: "Household Level Portfolio View Cards",
    usedBy: {
      serviceCall: "dashboardService.getBookSnapshot()",
      tsInterface: "BookSnapshot",
      mockExport: "bookSnapshot",
      pages: ["Page 1 Dashboard (book snapshot)"],
      fieldMapping: {
        "netFlowsMTD": "net flows month-to-date from view card",
        "netFlowsQTD": "net flows quarter-to-date",
        "netFlowsYTD": "net flows year-to-date",
        "revenueYTD": "revenue year-to-date (may need billing endpoint)",
      },
    },
  },

  // ─── PDF REPORTS ─────────────────────────────────────────────────────
  runPDFReport: {
    endpoint: "POST /api/v1/Reporting/Reports/Action/Run",
    description: "Generate PDF reports (quarterly statements, etc.)",
    guide: "Running a PDF Report",
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// TRADING DOMAIN — Eclipse, Tax Loss Harvesting, Rebalancing
// ─────────────────────────────────────────────────────────────────────────────

export const ORION_TRADING_ENDPOINTS = {

  // ─── TAX LOSS HARVESTING ─────────────────────────────────────────────
  taxLossHarvesting: {
    endpoint: "POST /api/v1/Trading/TaxLossHarvesting",
    description: "Identify TLH opportunities, validate trades, execute harvesting",
    guide: "Tax Loss Harvesting (TLH) under Trading - Eclipse Trade Tools",
    workflow: [
      "1. Identify opportunities (manual or automated scan)",
      "2. Validate proposed trades (wash sale rules, substantially identical)",
      "3. Execute harvesting trades",
    ],
    usedBy: {
      serviceCall: "portfolioService → new getTaxLossHarvestOpps()",
      tsInterface: "TaxLossHarvestOpp[] (to be added to mock-data-master)",
      pages: ["Page 4 Tax (TLH section)"],
      notes: "This is the Orion native endpoint for TLH. Your mock data has 3 TLH opps on Page 4.",
    },
  },

  // ─── REBALANCE ───────────────────────────────────────────────────────
  rebalance: {
    endpoint: "POST /api/v1/Trading/Rebalance",
    description: "Account-level rebalancing to target model",
    guide: "TOM Rebalance (Account Level)",
    usedBy: {
      notes: "Rebalance actions triggered from Page 7 Investments rebalance queue or Page 1 Dashboard alerts",
    },
  },

  // ─── QUICK TRADE ─────────────────────────────────────────────────────
  quickTrade: {
    endpoint: "POST /api/v1/Trading/QuickTrade/Action/Validate + /Action/Submit",
    description: "Execute individual trades — validate then submit",
    guide: "Quick Trade",
    payload: '[{ accountId, ticker, dollars/shares, action: "BUY"|"SELL" }]',
  },

  // ─── MODEL ASSIGNMENT ────────────────────────────────────────────────
  getModels: {
    endpoint: "GET /api/v1/Trading/ModelAggs/Simple",
    description: "Get available aggregate models for account assignment",
    usedBy: {
      notes: "Model target allocations drive the 'drift' calculation on allocation chart",
    },
  },

  // ─── ECLIPSE ACCOUNTS/PORTFOLIOS ─────────────────────────────────────
  eclipseAccountsList: {
    endpoint: "POST /api/v2/account/accounts/list",
    description: "Paginated account list with filters",
    guide: "Dynamic Accounts List",
  },
  eclipsePortfoliosList: {
    endpoint: "POST /api/v2/portfolio/portfolios/list",
    description: "Paginated portfolio list with filters",
    guide: "Dynamic Portfolio List",
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// RISK DOMAIN — Risk Profiles, Stress Tests, Suitability
// ─────────────────────────────────────────────────────────────────────────────

export const ORION_RISK_ENDPOINTS = {

  getRiskProfile: {
    endpoint: "GET /api/v1/Risk/Profile/{clientId}",
    description: "Get client's risk tolerance profile and score",
    guide: "Orion Risk - Risk Profile",
    usedBy: {
      tsInterface: "ClientProfile.riskTolerance",
      pages: ["Page 8 Client360 (risk tolerance badge)", "Page 11 Compliance (suitability review)"],
    },
  },

  getStressTest: {
    endpoint: "POST /api/v1/Risk/StressTest",
    description: "Run portfolio stress test scenarios",
    guide: "Orion Risk - Stress Test",
    usedBy: {
      tsInterface: "MonteCarloSummary.stressTests[]",
      pages: ["Page 7 Investments (stress test scenarios, if rendered)"],
    },
  },

  getSurveyResults: {
    endpoint: "GET /api/v1/Risk/Survey/Results/{clientId}",
    description: "Get risk questionnaire results",
    guide: "Orion Risk – Get Survey Results",
    usedBy: {
      pages: ["Page 11 Compliance (risk profile review category)"],
    },
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// BILLING DOMAIN — Revenue, Fees
// ─────────────────────────────────────────────────────────────────────────────

export const ORION_BILLING_ENDPOINTS = {

  getBillInstance: {
    endpoint: "POST /api/v1/Billing/BillGenerator/Action/Instance",
    description: "Create bill instance to calculate fees/revenue",
    guide: "Bill Instance Data",
    usedBy: {
      serviceCall: "dashboardService.getBookSnapshot() — revenueYTD field",
      tsInterface: "BookSnapshot.revenueYTD",
      pages: ["Page 1 Dashboard (Revenue YTD card)", "Page 9 Analytics (revenue by segment)"],
    },
  },

  getBillInstanceDetail: {
    endpoint: "GET /api/v1/Billing/Instances/{instanceId}",
    description: "Get calculated bill with market value and balance due",
    responseFields: [
      "marketValue — AUM at billing date",
      "balanceDue — calculated fee amount",
      "householdCount — number of households billed",
      "isMockBill — forecast vs actual",
    ],
  },

  getFeeSchedules: {
    endpoint: "GET /api/v1/Billing/Schedules",
    description: "Get fee schedule configurations",
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL PLANNING DOMAIN
// ─────────────────────────────────────────────────────────────────────────────

export const ORION_PLANNING_ENDPOINTS = {

  getAggregatedAccounts: {
    endpoint: "GET /api/v1/Planning/Accounts/Aggregated/{clientId}",
    description: "Get aggregated accounts for financial planning view",
    guide: "Orion Planning - Aggregated Accounts",
  },

  getNetWorth: {
    endpoint: "GET /api/v1/Planning/NetWorth/{clientId}",
    description: "Get net worth calculation for a household",
    guide: "Orion Planning - Net Worth",
    usedBy: {
      notes: "THIS is where 'netWorth' comes from — your components reference it but ClientProfile doesn't have it. Use this endpoint.",
      pages: ["Page 1 Dashboard (pipeline table netWorth)", "Page 2 Clients (netWorth column)", "Page 5 Estate (netWorth)"],
    },
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// BULK DATA / BATCH ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export const ORION_BULK_ENDPOINTS = {

  batchAccountPositions: {
    endpoint: "POST /api/v1/Portfolio/Accounts/Positions/Batch",
    description: "Batch pull account and position balance data",
    guide: "How to Batch Pull Account and Position Balance Data",
    usedBy: {
      serviceCall: "portfolioService.getHoldings(householdId) — for multiple accounts at once",
      notes: "More efficient than calling per-account for households with many accounts",
    },
  },

  dataQueries: {
    endpoint: "POST /api/v1/Portfolio/DataQueries",
    description: "Flexible data query endpoint for large pulls",
    guide: "Data Queries via API",
    notes: "For large data API pulls, use pagination and batch processing per Orion best practices",
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// ORION CONNECT (SSO / Deep Links)
// ─────────────────────────────────────────────────────────────────────────────

export const ORION_CONNECT = {
  base: "https://api.cloud.orionadvisor.com/orionconnectapp",
  deepLinks: {
    householdOverview: "#/orion/dashboard?entity=5&entityId={householdId}",
    portfolioAudit: "#/portfolio/households?entity=5&entityId={householdId}",
    performanceTab: "#/orion/dashboard?entity=5&entityId={householdId}&tab=Performance",
    holdings: "/portfolio/holdings",
  },
  notes: "Can embed as iFrame or launch as SSO deep link from Command Center",
};


// =============================================================================
// MASTER MAPPING: Front-End Service → Orion API Endpoint
// =============================================================================
// This is the table Nitin and Praveen need.
// Left column = what the front end calls.
// Right column = what the API server calls on Orion.
// =============================================================================

export const SERVICE_TO_ORION_MAP = [
  // ─── DASHBOARD ───────────────────────────────────────────────────────
  { service: "dashboardService.getSummaryCards()",      orion: "POST /v1/Reporting/Scope (entity=Representative, Performance+Allocation)",  note: "Aggregate AUM, Net Flows at rep level" },
  { service: "dashboardService.getBookSnapshot()",      orion: "GET /v1/Reporting/HouseholdViewCards (aggregated) OR Billing/Instances",     note: "Net flows + revenue" },
  { service: "dashboardService.getSalesGoals()",        orion: "N/A — Salesforce Dashboard",                                                 note: "Salesforce-only, specific dashboard URL" },
  { service: "dashboardService.getTodaysSchedule()",    orion: "N/A — Outlook/Salesforce Events",                                            note: "Not an Orion endpoint" },
  { service: "dashboardService.getUpcomingMeetings()",  orion: "N/A — Outlook/Salesforce Events",                                            note: "Not an Orion endpoint" },
  { service: "dashboardService.getAlerts()",            orion: "MIXED — Orion (rebalance/performance) + Salesforce (compliance/beneficiary)", note: "Combine multiple sources" },
  { service: "dashboardService.getTasks()",             orion: "N/A — Salesforce Tasks/Cases",                                               note: "Not an Orion endpoint" },
  { service: "dashboardService.getGoals()",             orion: "N/A — Salesforce + Orion Planning",                                          note: "Goals may be in Orion Planning or SF" },

  // ─── CLIENTS ─────────────────────────────────────────────────────────
  { service: "clientService.getRoster()",               orion: "N/A — Salesforce Person Accounts",                                           note: "Client profiles from SF, AUM from Orion" },
  { service: "clientService.getHouseholds()",           orion: "GET /v1/Portfolio/Clients",                                                  note: "Orion Households = primary source" },
  { service: "clientService.getProfile(clientId)",      orion: "GET /v1/Portfolio/Clients/{id}/Verbose",                                     note: "Full household detail" },
  { service: "clientService.getAccounts(clientId)",     orion: "GET /v1/Portfolio/Accounts?clientId={id}",                                   note: "All accounts for household" },
  { service: "clientService.getHouseholdMembers(id)",   orion: "N/A — Salesforce Household Person Account Relation",                         note: "Members from SF, not Orion" },
  { service: "clientService.getLifeEvents(id)",         orion: "N/A — Salesforce + AI-detected",                                             note: "Not in Orion" },
  { service: "clientService.getTransactions(id)",       orion: "GET /v1/Portfolio/Transactions?accountId={id}",                               note: "Per-account, aggregate for household" },

  // ─── PORTFOLIO ───────────────────────────────────────────────────────
  { service: "portfolioService.getAllocation(hhId)",    orion: "POST /v1/Reporting/Scope (managed=4, Allocation)",                            note: "Current allocation with target drift" },
  { service: "portfolioService.getHoldings(hhId)",     orion: "GET /v1/Portfolio/Assets?accountId={id} OR Batch Positions",                  note: "Holdings per account, batch for efficiency" },
  { service: "portfolioService.getPerformance(hhId)",  orion: "POST /v1/Reporting/Scope (managed=1, Performance) OR GET /v1/Reporting/Performance", note: "Returns, alpha, Sharpe for multiple periods" },
  { service: "portfolioService.getAlternatives(hhId)", orion: "GET /v1/Reporting/UnmanagedAssets",                                           note: "Outside/unmanaged assets including PE, VC" },
  { service: "portfolioService.getProjection(hhId)",   orion: "N/A — AI-computed (JSON Render, Phase 3)",                                    note: "Monte Carlo from ai-platform, not Orion" },
  { service: "portfolioService.getMarket()",           orion: "N/A — Market data feed (not Orion)",                                          note: "External market data API" },

  // ─── TAX ─────────────────────────────────────────────────────────────
  { service: "taxService.getTLHOpps()",                orion: "POST /v1/Trading/TaxLossHarvesting",                                          note: "Orion Eclipse TLH endpoint" },
  { service: "taxService.getRothConversionOpps()",     orion: "N/A — AI-computed (JSON Render, Phase 3)",                                    note: "AI analyzes tax brackets from Orion data" },
  { service: "taxService.getTaxProjection()",          orion: "POST /v1/Reporting/Scope (managed=16, Tax Detail)",                            note: "Tax lot detail for projections" },

  // ─── ANALYTICS ───────────────────────────────────────────────────────
  { service: "analyticsService.getKPIs()",             orion: "POST /v1/Reporting/Scope (entity=Representative) + GET /v1/Portfolio/Clients", note: "AUM from Scope, client count from Clients" },
  { service: "analyticsService.getAUMBySegment()",     orion: "POST /v1/Reporting/Scope per segment + Salesforce segment classification",    note: "Segment = SF field, AUM = Orion Scope" },
  { service: "analyticsService.getAtRiskClients()",    orion: "N/A — AI-scored from SF activity + Orion data",                               note: "AI computation, not direct Orion endpoint" },
  { service: "analyticsService.getCapacity()",         orion: "GET /v1/Portfolio/Clients (count) vs configured max",                          note: "Client count from Orion, max from config" },

  // ─── RISK ────────────────────────────────────────────────────────────
  { service: "riskService.getRiskProfile(clientId)",   orion: "GET /v1/Risk/Profile/{clientId}",                                             note: "Risk tolerance score and profile" },
  { service: "riskService.getStressTest(clientId)",    orion: "POST /v1/Risk/StressTest",                                                    note: "Scenario-based stress testing" },
  { service: "riskService.getSurveyResults(clientId)", orion: "GET /v1/Risk/Survey/Results/{clientId}",                                      note: "Risk questionnaire answers" },

  // ─── BILLING / REVENUE ───────────────────────────────────────────────
  { service: "billingService.getRevenueYTD()",         orion: "POST /v1/Billing/BillGenerator/Action/Instance + GET /v1/Billing/Instances/{id}", note: "Create mock bill to get revenue" },

  // ─── PLANNING ────────────────────────────────────────────────────────
  { service: "planningService.getNetWorth(clientId)",  orion: "GET /v1/Planning/NetWorth/{clientId}",                                         note: "Net worth for household" },
  { service: "planningService.getAggregatedAccts(id)", orion: "GET /v1/Planning/Accounts/Aggregated/{clientId}",                              note: "Aggregated account view for planning" },

  // ─── NOT ORION (Salesforce / Other) ──────────────────────────────────
  { service: "engagementService.*",                    orion: "N/A — AI-computed from Salesforce activity data",                              note: "Engagement is AI layer, not Orion" },
  { service: "complianceService.*",                    orion: "N/A — Salesforce compliance tracking",                                         note: "Compliance is Salesforce-only" },
  { service: "adminService.*",                         orion: "N/A — Internal app metrics",                                                   note: "Admin is internal, not Orion" },
];


// =============================================================================
// VERIFIED ORION API ENDPOINTS — FROM SWAGGER SPEC (5,352 operations)
// Source: https://stagingapi.orionadvisor.com/api/swagger/docs/V1
// Base: https://api.orionadvisor.com/api/v1 (production)
//       https://stagingapi.orionadvisor.com/api/v1 (test)
// =============================================================================
// These are the EXACT endpoints confirmed from the full Swagger spec that
// our dashboard will call through MuleSoft → API Server → Front End.
// =============================================================================

export const VERIFIED_ORION_ENDPOINTS = {

  // ─── AUTHENTICATION ──────────────────────────────────────────────────
  auth: {
    getToken:           "GET  /v1/Security/Token",
    postToken:          "POST /v1/Security/Token",
    getUser:            "GET  /v1/Authorization/User — logged-in user info",
    getUserVerbose:     "GET  /v1/Authorization/User/Verbose",
    getUserLogo:        "GET  /v1/Authorization/User/Logo",
    getUserRights:      "GET  /v1/Authorization/User/Rights",
    getUserPrivileges:  "GET  /v1/Authorization/User/Privileges",
    sfIntegration:      "POST /v1/Authorization/User/Integrations/SaleForce",
  },

  // ─── HOUSEHOLDS (Portfolio/Clients) ──────────────────────────────────
  // 112 total endpoints — these are the ones we need
  households: {
    list:               "GET  /v1/Portfolio/Clients — all households (paginated, 50000 limit)",
    listSimple:         "GET  /v1/Portfolio/Clients/Simple — lightweight list",
    listVerbose:        "GET  /v1/Portfolio/Clients/Verbose — full detail list",
    listValue:          "GET  /v1/Portfolio/Clients/Value — list with AUM for today",
    listValueAsOf:      "GET  /v1/Portfolio/Clients/Value/{asOfDate} — list with AUM as-of-date",
    getById:            "GET  /v1/Portfolio/Clients/{key} — single household",
    getVerbose:         "GET  /v1/Portfolio/Clients/Verbose/{key} — single household full detail",
    getValue:           "GET  /v1/Portfolio/Clients/{key}/Value — household with AUM today",
    getValueAsOf:       "GET  /v1/Portfolio/Clients/{key}/Value/{asOfDate}",
    search:             "GET  /v1/Portfolio/Clients/Simple/Search/{search} — search by name",
    searchAdvanced:     "GET  /v1/Portfolio/Clients/Search/Advanced — filtered search",
    grid:               "GET  /v1/Portfolio/Clients/Grid — grid-optimized list",
    portfolioTree:      "GET  /v1/Portfolio/Clients/{key}/PortfolioTree — full hierarchy (HH→Reg→Acct)",
    accounts:           "GET  /v1/Portfolio/Clients/{key}/Accounts — accounts in household",
    accountsSimple:     "GET  /v1/Portfolio/Clients/{key}/Accounts/Simple",
    accountsValue:      "GET  /v1/Portfolio/Clients/{key}/Accounts/Value — accounts with AUM",
    assets:             "GET  /v1/Portfolio/Clients/{key}/Assets — all holdings in household",
    assetsAsOf:         "GET  /v1/Portfolio/Clients/{key}/Assets/{asOfDate}",
    registrations:      "GET  /v1/Portfolio/Clients/{key}/Registrations — account types/owners",
    registrationsSimple:"GET  /v1/Portfolio/Clients/{clientId}/Registrations/Simple",
    transactions:       "GET  /v1/Portfolio/Clients/{key}/Transactions — all transactions",
    documents:          "GET  /v1/Portfolio/Clients/{key}/Documents — household documents",
    uploadDocument:     "POST /v1/Portfolio/Clients/{key}/Documents — upload document",
    downloadDocument:   "GET  /v1/Portfolio/Clients/{key}/Documents/{fileId}/Download",
    performance:        "GET  /v1/Portfolio/Clients/{key}/Performance — verbose performance",
    perfGrouped:        "GET  /v1/Portfolio/Clients/{key}/Performance/{grouping}",
    perfInterval:       "GET  /v1/Portfolio/Clients/{key}/Performance/Interval",
    perfSummary:        "GET  /v1/Portfolio/Clients/{key}/Performance/Summary",
    perfSummaryGrouped: "GET  /v1/Portfolio/Clients/{key}/Performance/Summary/{grouping}",
    aumOverTime:        "GET  /v1/Portfolio/Clients/{key}/AumOverTime — AUM time series",
    netAmountInvested:  "GET  /v1/Portfolio/Clients/{key}/NetAmountInvested",
    goalTracking:       "GET  /v1/Portfolio/Clients/{key}/GoalTracking — goal summary + performance",
    balanceSheet:       "GET  /v1/Portfolio/Clients/{key}/BalanceSheet — net worth/balance sheet",
    rmdCalculations:    "GET  /v1/Portfolio/Clients/{key}/RmdCalculations — RMD calculations",
    modelTolerance:     "GET  /v1/Portfolio/Clients/{clientId}/ModelTolerance — drift from target",
    portfolioGroups:    "GET  /v1/Portfolio/Clients/{clientId}/PortfolioGroups",
    userDefinedFields:  "GET  /v1/Portfolio/Clients/{key}/UserDefinedFields — custom fields",
    householdMembers:   "PUT  /v1/Portfolio/Clients/{clientId}/HouseholdMembers/{id}/SSNTaxId",
  },

  // ─── ACCOUNTS ────────────────────────────────────────────────────────
  // 146 total endpoints — key ones for our dashboard
  accounts: {
    list:               "GET  /v1/Portfolio/Accounts — all accounts (paginated)",
    getById:            "GET  /v1/Portfolio/Accounts/{key}",
    getSimple:          "GET  /v1/Portfolio/Accounts/{key}/Simple",
    getValue:           "GET  /v1/Portfolio/Accounts/{key}/Value — account with AUM",
    getValueAsOf:       "GET  /v1/Portfolio/Accounts/{key}/Value/{asOfDate}",
    assets:             "GET  /v1/Portfolio/Accounts/{key}/Assets — holdings in account",
    assetsValue:        "GET  /v1/Portfolio/Accounts/{key}/Assets/Value — holdings with AUM",
    assetsAsOf:         "GET  /v1/Portfolio/Accounts/{key}/Assets/{asOfDate}",
    transactions:       "GET  /v1/Portfolio/Accounts/{key}/Transactions",
    performance:        "GET  /v1/Portfolio/Accounts/{key}/Performance — verbose",
    perfSummary:        "GET  /v1/Portfolio/Accounts/{key}/Performance/Summary",
    perfInterval:       "GET  /v1/Portfolio/Accounts/{key}/Performance/Interval",
    aumOverTime:        "GET  /v1/Portfolio/Accounts/{key}/AumOverTime",
    taxLot:             "GET  /v1/Portfolio/Accounts/{accountId}/TaxLot — tax lot detail",
    rmdCalculation:     "GET  /v1/Portfolio/Accounts/{key}/RmdCalculation",
    modelTolerance:     "GET  /v1/Portfolio/Accounts/{accountId}/ModelTolerance — drift from model",
    documents:          "GET  /v1/Portfolio/Accounts/{key}/Documents",
    userDefinedFields:  "GET  /v1/Portfolio/Accounts/{key}/UserDefinedFields",
    beneficiaries:      "GET  /v1/Portfolio/Accounts/AccountInformation/Beneficiaries/{repId}",
    rmdByRep:           "GET  /v1/Portfolio/Accounts/AccountInformation/Rmd/{repId}",
    newPortfolio:       "GET  /v1/Portfolio/Accounts/NewPortfolio — template for new portfolio",
    createPortfolio:    "POST /v1/Portfolio/Accounts/NewPortfolio — create new portfolio",
  },

  // ─── REPRESENTATIVES (Advisors) ──────────────────────────────────────
  representatives: {
    list:               "GET  /v1/Portfolio/Representatives — all reps",
    getById:            "GET  /v1/Portfolio/Representatives/{key}",
    getSimple:          "GET  /v1/Portfolio/Representatives/{key}/Simple",
    getVerbose:         "GET  /v1/Portfolio/Representatives/Verbose/{key}",
    accounts:           "GET  /v1/Portfolio/Representatives/{key}/Accounts",
    accountsValue:      "GET  /v1/Portfolio/Representatives/{key}/Accounts/Value",
    value:              "GET  /v1/Portfolio/Representatives/Value — reps with AUM",
    documents:          "GET  /v1/Portfolio/Representatives/{key}/Documents",
    search:             "GET  /v1/Portfolio/Representatives/Simple/Search/{search}",
    clientsByRep:       "GET  /v1/Portfolio/Representatives/{key}/Clients/Simple/Search",
    recalcAUM:          "PUT  /v1/Portfolio/Representatives/Action/RecalculateAUMData",
  },

  // ─── REPORTING ───────────────────────────────────────────────────────
  // 776 total endpoints — THE key endpoint is Reporting/Scope
  reporting: {
    scope:              "POST /v1/Reporting/Scope — MASTER DATA ENDPOINT (perf+alloc+activity)",
    perfVerbose:        "POST /v1/Reporting/Performance/Verbose — grouped performance",
    perfOverview:       "POST /v1/Reporting/Performance/Overview — stored/cached performance",
    perfDrillDown:      "POST /v1/Reporting/Performance/DrillDownSummary — hierarchical drill-down",
    activityCostBasis:  "GET  /v1/Reporting/Activity/CostBasis — cost basis for entity",
    activityDrillDown:  "POST /v1/Reporting/Activity/DrillDownSummary — hierarchical activity",
    activityValue:      "GET  /v1/Reporting/Activity/{entity}/{entityId}/Value — entity value",
    reportsList:        "GET  /v1/Reporting/Reports — available reports",
    reportGenerate:     "POST /v1/Reporting/Reports/{key}/Generate — generate PDF report",
    reportRun:          "GET  /v1/Reporting/Reports/{reportId}/Run/{fileGuid} — download PDF",
  },

  // ─── COMPLIANCE ──────────────────────────────────────────────────────
  // Orion has built-in compliance/risk dashboard
  compliance: {
    riskTiles:          "GET  /v1/Compliance/RiskDashboard/RiskTiles — risk/suitability tiles",
    accountAlerts:      "GET  /v1/Compliance/RiskDashboard/AccountAlerts",
    outOfTolerance:     "GET  /v1/Compliance/RiskDashboard/OutOfTolerance/{daysOut}",
    settings:           "GET  /v1/Compliance/RiskDashboard/Settings",
  },

  // ─── BILLING ─────────────────────────────────────────────────────────
  billing: {
    createInstance:     "POST /v1/Billing/BillGenerator/Action/Instance — create bill",
    getInstance:        "GET  /v1/Billing/Instances/{key}",
    generateBills:      "PUT  /v1/Billing/Instances/{key}/Action/Generate",
    instanceClientList: "GET  /v1/Billing/BillGenerator/Instance/{key}/ClientList",
    overview:           "GET  /v1/Billing/BillGenerator/Overview",
    summary:            "GET  /v1/Billing/BillGenerator/Summary",
    schedules:          "GET  /v1/Billing/Schedules",
    planningFees:       "GET  /v1/Billing/FinancialPlanningFee/List/{householdId}",
  },

  // ─── INTEGRATIONS — NET WORTH (3 sources) ───────────────────────────
  netWorth: {
    advizr:             "GET  /v1/Integrations/Advizr/NetWorth/{clientId} — Advizr net worth",
    eMoney:             "GET  /v1/Integrations/eMoney/Client/NetWorth — eMoney net worth",
    moneyGuidePro:      "GET  /v1/Integrations/MoneyGuidePro/Networth/Client/{clientId}",
    balanceSheet:       "GET  /v1/Portfolio/Clients/{key}/BalanceSheet — Orion native balance sheet",
  },

  // ─── INTEGRATIONS — RISK (HiddenLevers) ─────────────────────────────
  risk: {
    riskProfile:        "POST /v1/Integrations/HiddenLevers/RiskProfile",
    riskProfileIframe:  "GET  /v1/Integrations/HiddenLevers/Iframe/RiskProfile",
    stressTest:         "POST /v1/Integrations/HiddenLevers/StressTest",
    stressTestAccount:  "GET  /v1/Integrations/HiddenLevers/StressTest/Account/{accountId}",
    stressTestClient:   "GET  /v1/Integrations/HiddenLevers/StressTest/Client/{clientId}",
    surveyResults:      "GET  /v1/Integrations/HiddenLevers/GetSurveyResults",
    riskRewardScores:   "GET  /v1/Integrations/HiddenLevers/RiskRewardScores",
    riskTolerance:      "GET  /v1/Integrations/Element/RiskToleranceQuestionnaire/email/{clientId}/{registrationId}",
  },

  // ─── INTEGRATIONS — SALESFORCE ───────────────────────────────────────
  salesforce: {
    userIntegration:    "POST /v1/Authorization/User/Integrations/SaleForce",
    clientIntegration:  "GET  /v1/Portfolio/Clients/{key}/Integrations/{app}",
    updateIntegration:  "PUT  /v1/Portfolio/Clients/{key}/Integrations/{app}",
  },
};


// =============================================================================
// FINAL SERVICE → VERIFIED ENDPOINT MAP (with Swagger confirmation)
// This is what Nitin's API server implements.
// =============================================================================

export const FINAL_SERVICE_TO_ENDPOINT = {
  // ─── Page 1: Dashboard ──────────────────────────────────────────────
  "dashboardService.getSummaryCards()": {
    primary: "GET /v1/Portfolio/Representatives/Value — rep-level AUM",
    secondary: "GET /v1/Portfolio/Clients/Value — all households with AUM",
    note: "Aggregate Total AUM, Total Clients, Net Flows from these endpoints",
  },
  "dashboardService.getBookSnapshot()": {
    primary: "GET /v1/Portfolio/Clients/{key}/AumOverTime — AUM trend",
    secondary: "GET /v1/Billing/BillGenerator/Summary — revenue data",
    note: "Net flows = delta in AumOverTime, Revenue = billing summary",
  },
  "dashboardService.getGoals()": {
    primary: "GET /v1/Portfolio/Clients/{key}/GoalTracking — goal summary + performance",
    note: "VERIFIED: This endpoint returns goal summary and performance info for all accounts",
  },
  "dashboardService.getAlerts()": {
    primary: "GET /v1/Compliance/RiskDashboard/AccountAlerts — compliance/risk alerts",
    secondary: "GET /v1/Compliance/RiskDashboard/OutOfTolerance/{daysOut} — drift alerts",
    note: "Combine Orion compliance alerts with Salesforce task alerts",
  },

  // ─── Page 2: Clients ────────────────────────────────────────────────
  "clientService.getRoster()": {
    primary: "GET /v1/Portfolio/Clients/Value — households with AUM",
    alt: "GET /v1/Portfolio/Clients/Grid — grid-optimized (paginated)",
    note: "Client profile fields from Salesforce, AUM overlay from Orion",
  },
  "clientService.getHouseholds()": {
    primary: "GET /v1/Portfolio/Clients/Simple — lightweight household list",
    hierarchy: "GET /v1/Portfolio/Clients/{key}/PortfolioTree — full HH→Reg→Acct tree",
    note: "Requirement: show both households and individuals",
  },

  // ─── Page 7: Portfolio/Investments ───────────────────────────────────
  "portfolioService.getAllocation()": {
    primary: "POST /v1/Reporting/Scope — managed=4 (Allocation)",
    alt: "GET /v1/Portfolio/Clients/{key}/Assets — raw holdings for manual calc",
    modelDrift: "GET /v1/Portfolio/Clients/{clientId}/ModelTolerance — drift from target",
    note: "Scope is the power endpoint; ModelTolerance gives drift directly",
  },
  "portfolioService.getHoldings()": {
    primary: "GET /v1/Portfolio/Clients/{key}/Assets — all holdings in household",
    withValue: "GET /v1/Portfolio/Accounts/{key}/Assets/Value — holdings with AUM",
    note: "Holdings at household level aggregates all accounts",
  },
  "portfolioService.getPerformance()": {
    primary: "GET /v1/Portfolio/Clients/{key}/Performance/Summary — MTD/QTD/YTD/etc.",
    grouped: "GET /v1/Portfolio/Clients/{key}/Performance/Summary/{grouping}",
    intervals: "GET /v1/Portfolio/Clients/{key}/Performance/Interval — time series",
    bulkOverview: "POST /v1/Reporting/Performance/Overview — stored daily performance",
    note: "Performance/Summary gives what your PerformancePeriod[] interface needs",
  },
  "portfolioService.getProjection()": {
    stressTest: "GET /v1/Integrations/HiddenLevers/StressTest/Client/{clientId}",
    note: "Monte Carlo is AI-computed (Phase 3). Stress tests available via HiddenLevers.",
  },

  // ─── Page 4: Tax ────────────────────────────────────────────────────
  "taxService.getTaxLots()": {
    primary: "GET /v1/Portfolio/Accounts/{accountId}/TaxLot — tax lot detail",
    costBasis: "GET /v1/Reporting/Activity/CostBasis — aggregated cost basis",
    note: "Tax lots feed tax-loss harvesting analysis",
  },
  "taxService.getRMDs()": {
    byAccount: "GET /v1/Portfolio/Accounts/{key}/RmdCalculation",
    byClient: "GET /v1/Portfolio/Clients/{key}/RmdCalculations",
    byRep: "GET /v1/Portfolio/Accounts/AccountInformation/Rmd/{repId} — all RMDs for rep",
    note: "Three levels: single account, household, or all accounts for a rep",
  },

  // ─── Page 5: Estate / Net Worth ─────────────────────────────────────
  "estateService.getNetWorth()": {
    orionNative: "GET /v1/Portfolio/Clients/{key}/BalanceSheet — Orion balance sheet",
    advizr: "GET /v1/Integrations/Advizr/NetWorth/{clientId}",
    eMoney: "GET /v1/Integrations/eMoney/Client/NetWorth",
    moneyGuidePro: "GET /v1/Integrations/MoneyGuidePro/Networth/Client/{clientId}",
    note: "4 possible sources for net worth. Balance sheet is Orion-native. Others are integrations.",
  },

  // ─── Page 8: Client 360 ────────────────────────────────────────────
  "clientService.getProfile()": {
    primary: "GET /v1/Portfolio/Clients/Verbose/{key} — full household detail",
    note: "Most comprehensive single-client endpoint",
  },
  "clientService.getAccounts()": {
    primary: "GET /v1/Portfolio/Clients/{key}/Accounts/Value — accounts with AUM",
    simple: "GET /v1/Portfolio/Clients/{key}/Accounts/Simple",
  },
  "clientService.getTransactions()": {
    primary: "GET /v1/Portfolio/Clients/{key}/Transactions — all household transactions",
    byAccount: "GET /v1/Portfolio/Accounts/{key}/Transactions — per-account",
  },
  "clientService.getDocuments()": {
    primary: "GET /v1/Portfolio/Clients/{key}/Documents",
    download: "GET /v1/Portfolio/Clients/{key}/Documents/{fileId}/Download",
  },

  // ─── Page 9: Analytics ──────────────────────────────────────────────
  "analyticsService.getKPIs()": {
    totalAUM: "GET /v1/Portfolio/Representatives/Value — rep-level AUM total",
    clientCount: "GET /v1/Portfolio/Clients — count from list",
    beneficiaryInfo: "GET /v1/Portfolio/Accounts/AccountInformation/Beneficiaries/{repId}",
    note: "Aggregate KPIs from multiple endpoints",
  },

  // ─── Page 11: Compliance (Orion-side) ────────────────────────────────
  "complianceService (Orion portion)": {
    riskTiles: "GET /v1/Compliance/RiskDashboard/RiskTiles",
    accountAlerts: "GET /v1/Compliance/RiskDashboard/AccountAlerts",
    outOfTolerance: "GET /v1/Compliance/RiskDashboard/OutOfTolerance/{daysOut}",
    note: "Orion has native compliance dashboard endpoints. Supplement with Salesforce compliance data.",
  },
};
