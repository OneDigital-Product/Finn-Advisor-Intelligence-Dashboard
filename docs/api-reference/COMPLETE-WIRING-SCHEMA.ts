// =============================================================================
// DEFINITIVE FRONT-END JSON WIRING SCHEMA
// =============================================================================
// INCORPORATES:
//   1. Wealth_Advisor_Dashboard_Mapping.xlsx — ALL 133 UI element rows
//   2. mock-data-master.ts — ALL 70+ exports, ALL interfaces
//   3. All 13 Combined-Page*.jsx components — ALL inline data variables
//   4. All 3 meeting transcriptions — ALL Torin instructions
//   5. data-service.ts — ALL service functions
//   6. json-render-schemas.ts — ALL 4 AI output schemas
//
// STRUCTURE PER ENTRY:
//   spreadsheetRow    → Row # from "UI elements mapping" sheet
//   uiElement         → Element name from spreadsheet Column B
//   uiDetails         → Description from spreadsheet Column C
//   dataFields        → Underlying data fields from spreadsheet Column D
//   sourceSystem      → Source system from spreadsheet Column E
//   sourceDetails     → Source details from spreadsheet Column F
//   notes             → Notes/open questions from spreadsheet Column G
//   componentFile     → Which of the 13 .jsx files renders this
//   inlineVariable    → The const variable name in that component
//   serviceCall       → The data-service.ts function to call
//   tsInterface       → The TypeScript interface from mock-data-master.ts
//   mockExport        → The named export from mock-data-master.ts
//   fieldMapping      → How component fields map to interface fields
// =============================================================================


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: HEADER (Spreadsheet rows 2-7)
// Component: ALL pages (shared layout)
// ─────────────────────────────────────────────────────────────────────────────

export const HEADER_WIRING = [
  {
    spreadsheetRow: 2,
    uiElement: "Dashboard Greeting",
    uiDetails: 'Message displayed: "Good morning, Sarah"',
    sourceSystem: "Salesforce or Microsoft Entra",
    componentFile: "Combined-Page1-Dashboard.jsx",
    inlineVariable: "advisor",
    serviceCall: "configService.getAdvisor()",
    tsInterface: "Advisor",
    mockExport: "advisor",
    fieldMapping: { greeting: "advisor.name → 'Good morning, ' + firstName" },
  },
  {
    spreadsheetRow: 4,
    uiElement: "Meetings Today Indicator",
    uiDetails: 'Top right indicator showing "0 meetings today"',
    sourceSystem: "Outlook, Calendly, or Salesforce",
    sourceDetails: "If meetings then Outlook, if client meetings then Salesforce",
    componentFile: "Combined-Page1-Dashboard.jsx",
    inlineVariable: "kpis[3]",  // "Meetings This Week"
    serviceCall: "dashboardService.getTodaysSchedule()",
    tsInterface: "Meeting[]",
    mockExport: "todaysSchedule",
    fieldMapping: { count: "todaysSchedule.length" },
  },
  {
    spreadsheetRow: 6,
    uiElement: "Advisor Profile Display",
    uiDetails: '"Sarah Mitchell – Advisor"',
    sourceSystem: "Salesforce",
    sourceDetails: "User Profile",
    serviceCall: "configService.getAdvisor()",
    tsInterface: "Advisor",
    mockExport: "advisor",
    fieldMapping: { name: "advisor.name", title: "advisor.title" },
  },
];


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: NAVIGATION (Spreadsheet rows 8-14)
// Component: ALL pages (sidebar)
// ─────────────────────────────────────────────────────────────────────────────

export const NAVIGATION_WIRING = {
  spreadsheetRows: "8-14",
  uiElements: ["My Day", "Clients", "Calendar", "Analytics", "Compliance", "Admin"],
  serviceCall: "configService.getNavItems(role)",
  tsInterface: "NavItem[]",
  mockExport: "advisorNavItems (role=advisor) | adminNavItems (role=admin)",
  fieldMapping: {
    label: "navItem.title",
    url: "navItem.url",
    icon: "navItem.iconName → map to lucide-react icon",
  },
  notes: "Spreadsheet has 6 nav items. Your components have 7 (adds Planning, Investments, Tax, Estate). These extra pages are valid — they map to sub-sections of the app.",
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: DASHBOARD METRICS (Spreadsheet rows 15-21)
// Component: Combined-Page1-Dashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────

export const DASHBOARD_METRICS_WIRING = [
  {
    spreadsheetRow: 16,
    uiElement: "Total AUM Metric Card",
    uiDetails: 'KPI card showing "$9.0M" with "+2.4% MTD" indicator',
    sourceSystem: "Orion",
    sourceDetails: "Pull from Orion dashboards",
    componentFile: "Combined-Page1-Dashboard.jsx",
    inlineVariable: "kpis[0]",
    serviceCall: "dashboardService.getSummaryCards()",
    tsInterface: "DashboardSummaryCard",
    mockExport: "dashboardSummaryCards[0]",
    fieldMapping: {
      label: "card.label",             // "Total AUM"
      value: "card.value",             // 487_320_000 → format as "$487.3M"
      sub: "'+' + card.trendPct + '% ' + card.format", // "+5.8% YTD"
      src: "'Orion'",
    },
    discrepancy: "Spreadsheet says $9.0M, mock-data says $487.3M. Mock data is for full book (214 clients). Spreadsheet was Vinay's 5-client demo. USE MOCK DATA.",
  },
  {
    spreadsheetRow: 17,
    uiElement: "Net Flows YTD Metric Card",
    uiDetails: 'KPI card showing "$1.3M" with "~ $287K this month"',
    sourceSystem: "Orion",
    serviceCall: "dashboardService.getSummaryCards()",
    tsInterface: "DashboardSummaryCard",
    mockExport: "dashboardSummaryCards[2]",  // Net Flows YTD
    fieldMapping: {
      value: "card.value",             // 18_740_000
      sub: "card.trendPct + '%'",
    },
  },
  {
    spreadsheetRow: 18,
    uiElement: "Revenue YTD Metric Card",
    uiDetails: 'KPI card showing "$285K" with "Based on current AUM"',
    serviceCall: "dashboardService.getBookSnapshot()",
    tsInterface: "BookSnapshot",
    mockExport: "bookSnapshot",
    fieldMapping: {
      value: "bookSnapshot.revenueYTD",
    },
    notes: "This is in BookSnapshot, NOT in DashboardSummaryCard. Your Page 1 component is MISSING this — add it.",
  },
  {
    spreadsheetRow: 19,
    uiElement: "YTD Recurring Sales Goal",
    sourceSystem: "Salesforce",
    sourceDetails: "https://onedigitalrw.lightning.force.com/lightning/r/Dashboard/01Z4z0000011THJEA2/view",
    serviceCall: "dashboardService.getSalesGoals()",
    tsInterface: "SalesGoal[]",
    mockExport: "salesGoals[0]",  // type: "recurring"
    fieldMapping: {
      label: "goal.label",             // "YTD Recurring Sales Goal"
      target: "goal.targetAmount",     // 350_000
      current: "goal.currentAmount",   // 285_000
      progress: "goal.progressPct",    // 0.814
    },
    notes: "YOUR PAGE 1 COMPONENT IS MISSING THIS. The spreadsheet explicitly lists it. Add a sales goals section.",
  },
  {
    spreadsheetRow: 20,
    uiElement: "YTD Non-Recurring Sales Goal",
    sourceSystem: "Salesforce",
    serviceCall: "dashboardService.getSalesGoals()",
    tsInterface: "SalesGoal[]",
    mockExport: "salesGoals[1]",  // type: "non-recurring"
    notes: "ALSO MISSING from your Page 1 component.",
  },
  {
    spreadsheetRow: 21,
    uiElement: "Clients Count Metric Card",
    uiDetails: 'KPI card showing total clients "5" with segmentation "A:4 B:1 C:0 D:0"',
    sourceSystem: "Orion",
    serviceCall: "dashboardService.getSummaryCards() + analyticsService.getCapacity()",
    tsInterface: "DashboardSummaryCard + AdvisorCapacity",
    mockExport: "dashboardSummaryCards[1] + advisorCapacity",
    fieldMapping: {
      totalClients: "dashboardSummaryCards[1].value",  // 214
      segmentBreakdown: "advisorCapacity.segmentBreakdown[]",
    },
    notes: "Spreadsheet shows segment breakdown A:4 B:1 C:0 D:0 alongside the count. Your component shows just the count. Add the breakdown.",
  },
];


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: SCHEDULE (Spreadsheet rows 22-24)
// Component: Combined-Page1-Dashboard.jsx + Combined-Page6-Calendar.jsx
// ─────────────────────────────────────────────────────────────────────────────

export const SCHEDULE_WIRING = {
  spreadsheetRows: "22-24",
  uiElement: "Today's Schedule Widget",
  sourceSystem: "Salesforce",
  componentFiles: ["Combined-Page1-Dashboard.jsx", "Combined-Page6-Calendar.jsx"],
  inlineVariables: { page1: "todaySchedule", page6: "weekEvents" },
  serviceCall: "dashboardService.getTodaysSchedule()",
  tsInterface: "Meeting[]",
  mockExport: "todaysSchedule",
  fieldMapping: {
    time: "meeting.time",
    endTime: "meeting.endTime",
    client: "meeting.clientName",
    type: "meeting.meetingType",
    tier: "meeting.tier",
    location: "meeting.location",
    prepNotes: "meeting.prepNotes",
    clientAUM: "meeting.clientAUM",
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: ALERTS (Spreadsheet rows 25-29)
// Component: Combined-Page1-Dashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────

export const ALERTS_WIRING = {
  spreadsheetRows: "25-29",
  uiElement: "Alerts Panel",
  uiDetails: 'Alerts widget header showing "6 unread" notifications',
  sourceSystem: "Orion & Salesforce",
  sourceDetails: "Need to understand intended function — combination of SF and Orion alerts",
  componentFile: "Combined-Page1-Dashboard.jsx",
  inlineVariable: "urgentItems",
  serviceCall: "dashboardService.getAlerts()",
  tsInterface: "Alert[]",
  mockExport: "alerts",
  fieldMapping: {
    title: "alert.title",
    description: "alert.description",
    severity: "alert.severity",  // critical | high | medium | low | info
    type: "alert.type",          // rebalance | rmd | review | compliance | opportunity | beneficiary | tax | insurance
    read: "alert.read",
    estimatedValue: "alert.estimatedValue",
    clientId: "alert.clientId",
    actionUrl: "alert.actionUrl",
    createdAt: "alert.createdAt",
  },
  spreadsheetExamples: [
    { row: 27, text: "Quarterly Compliance Audit Due", mapsTo: "alerts where type='compliance'" },
    { row: 28, text: "Follow-Up Needed (Patel)", mapsTo: "alerts where type='review'", openQuestion: "SF opportunity or LINC Cases?" },
    { row: 29, text: "Concentrated Position Warning (Chen)", mapsTo: "alerts where type='rebalance'", openQuestion: "Check with Chris if possible in Orion" },
  ],
  notes: "OPEN QUESTION (spreadsheet): 'Need to understand intended function of alerts.' mock-data-master has 10 alerts covering all types. Your component only renders 3 as 'urgentItems'. Render ALL with severity sorting.",
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: ACTION QUEUE (Spreadsheet rows 30-36)
// Component: Combined-Page1-Dashboard.jsx (partially) + Combined-Page10-Engagement.jsx
// ─────────────────────────────────────────────────────────────────────────────

export const ACTION_QUEUE_WIRING = {
  spreadsheetRows: "30-36",
  uiElement: "Action Queue Widget",
  uiDetails: 'Widget listing advisor tasks showing "10 pending"',
  sourceSystem: "Salesforce",
  sourceDetails: "Task and Cases — Open tasks and cases in SF",
  componentFiles: ["Combined-Page1-Dashboard.jsx", "Combined-Page10-Engagement.jsx"],
  inlineVariables: { page1: "— missing (tasks not rendered on dashboard)", page10: "actionQueue" },
  serviceCall: "dashboardService.getTasks() + engagementService.getActionQueue()",
  tsInterfaces: ["Task[]", "ActionItem[]"],
  mockExports: ["tasks", "actionQueue"],
  fieldMapping: {
    title: "task.title | actionItem.action",
    dueDate: "task.dueDate | actionItem.dueDate",
    priority: "task.priority | actionItem.priority",
    status: "task.status | actionItem.status",
    clientId: "task.clientId | actionItem.clientId",
    clientName: "actionItem.clientName",
    category: "task.category | actionItem.category",
  },
  openQuestion: "Is it possible to pull all cases and tasks and have AI surface the types of tasks, or does it have to be predefined by record type/field? (spreadsheet rows 32-36, also mock-data oq-004)",
  notes: "YOUR PAGE 1 IS MISSING THE ACTION QUEUE. Spreadsheet explicitly requires it with 5 sample tasks (rows 32-36). Add dashboardService.getTasks() to Page 1.",
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: UPCOMING MEETINGS (Spreadsheet rows 37-39)
// Component: Combined-Page1-Dashboard.jsx + Combined-Page6-Calendar.jsx
// ─────────────────────────────────────────────────────────────────────────────

export const UPCOMING_MEETINGS_WIRING = {
  spreadsheetRows: "37-39",
  uiElement: "Upcoming Meetings Widget",
  sourceSystem: "Outlook, Calendly, or Salesforce",
  sourceDetails: "Events (SF) - not comprehensive",
  serviceCall: "dashboardService.getUpcomingMeetings()",
  tsInterface: "UpcomingMeeting[]",
  mockExport: "upcomingMeetings",
  fieldMapping: {
    clientName: "meeting.clientName",
    meetingType: "meeting.meetingType",
    date: "meeting.date",
    time: "meeting.time",
    endTime: "meeting.endTime",
    source: "meeting.source",  // "outlook" | "salesforce" | "calendly"
    location: "meeting.location",
  },
  notes: "YOUR PAGE 1 IS MISSING UPCOMING MEETINGS as a separate widget. You have todaySchedule but not the 7-day lookahead. Add this section.",
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: CLIENTS (Spreadsheet rows 40-66)
// Component: Combined-Page2-Clients.jsx
// ─────────────────────────────────────────────────────────────────────────────

export const CLIENTS_WIRING = {
  spreadsheetRows: "40-66",
  componentFile: "Combined-Page2-Clients.jsx",
  inlineVariable: "clients",

  elements: [
    {
      row: 42,
      uiElement: "Client Count Summary",
      sourceSystem: "Salesforce",
      sourceDetails: "Pull households by account owner",
      serviceCall: "clientService.getRoster()",
      fieldMapping: { count: "roster.length" },
    },
    {
      rows: "45-49",
      uiElement: "Segment Filter (Tier A/B/C/D)",
      openQuestion: "Need to define the tier list functionality — what defines A,B,C,D (spreadsheet row 46)",
      serviceCall: "clientService.getTierDefinitions()",
      tsInterface: "TierDefinition[]",
      mockExport: "tierDefinitions",
      notes: "tierDefinitions[].isConfirmed = false — business hasn't signed off yet (oq-003).",
    },
    {
      row: 52,
      uiElement: "Client Record Row",
      sourceSystem: "Salesforce",
      sourceDetails: "Household Account",
      serviceCall: "clientService.getRoster()",
      tsInterface: "ClientProfile",
      mockExport: "clientRoster",
      fieldMapping: {
        name: "client.firstName + ' ' + client.lastName",  // row 54
        tierBadge: "client.segment → tierDefinition lookup",  // row 55
        status: "client.status",  // row 56
        occupation: "client.occupation",  // row 58
        email: "client.email",  // row 59
        totalAUM: "client.totalAUM",  // row 61 — Source: Orion
        accountCount: "— derive from clientService.getAccounts(id).length",  // row 62
      },
    },
    {
      row: 65,
      uiElement: "Schedule Meeting Icon",
      sourceSystem: "Calendly, Salesforce Meetings, or Outlook",
      notes: "This is a UI action, not a data field. Link to calendar/scheduling.",
    },
  ],

  CRITICAL_MISSING: "HOUSEHOLD VIEW — Torin (Daily Meeting #2, 8:26): 'make sure we have both, so both the households coming down and then individual that have to go get mapped to a household.' Spreadsheet row 42 says 'Pull households by account owner.' Your component only shows individuals. ADD clientService.getHouseholds() → Household[] view.",
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: ANALYTICS (Spreadsheet rows 69-94)
// Component: Combined-Page9-Analytics.jsx
// ─────────────────────────────────────────────────────────────────────────────

export const ANALYTICS_WIRING = {
  spreadsheetRows: "69-94",
  componentFile: "Combined-Page9-Analytics.jsx",

  elements: [
    {
      row: 72,
      uiElement: "Analytics Query Input",
      uiDetails: 'AI prompt field "Ask about your book..."',
      serviceCall: "analyticsService.getAIQueryExamples()",
      mockExport: "aiQueryExamples",
      notes: "Phase 3 — JSON Render NLQ. For now, show example queries.",
    },
    {
      row: 74,
      uiElement: "Total AUM KPI",
      sourceSystem: "Orion",
      sourceDetails: "Advisor/User AUM",
      inlineVariable: "kpiData.totalAUM",
      serviceCall: "analyticsService.getKPIs()",
      mockExport: "analyticsKPIs.totalAUM",
    },
    {
      row: 75,
      uiElement: "Total Clients KPI",
      sourceSystem: "Salesforce",
      sourceDetails: "Total Households by Account Owner",
      serviceCall: "analyticsService.getKPIs()",
      mockExport: "analyticsKPIs.totalClients",
    },
    {
      row: 76,
      uiElement: "At-Risk Clients KPI",
      sourceSystem: "Salesforce",
      openQuestion: "We need better idea of the functionality intended (spreadsheet row 76, also oq-006)",
      serviceCall: "analyticsService.getAtRiskClients()",
      tsInterface: "AtRiskClient[]",
      mockExport: "atRiskClients",
    },
    {
      row: 77,
      uiElement: "Advisor Capacity KPI",
      sourceSystem: "Salesforce?",
      openQuestion: "We need better idea of functionality intended (spreadsheet row 77, also oq-007)",
      serviceCall: "analyticsService.getCapacity()",
      tsInterface: "AdvisorCapacity",
      mockExport: "advisorCapacity",
    },
    {
      rows: "79-80",
      uiElement: "AUM by Segment Chart + Client Segmentation Donut",
      serviceCall: "analyticsService.getAUMBySegment()",
      tsInterface: "SegmentData[]",
      mockExport: "aumBySegment",
      fieldMapping: {
        segment: "seg.segment",
        aum: "seg.aum",
        clientCount: "seg.clientCount",
        revenueEstimate: "seg.revenueEstimate",
        atRiskCount: "seg.atRiskCount",
      },
    },
    {
      row: 82,
      uiElement: "At-Risk Clients Panel",
      openQuestion: "What defines an at risk client?",
      serviceCall: "analyticsService.getAtRiskClients()",
      mockExport: "atRiskClients",
      fieldMapping: {
        name: "client.firstName + ' ' + client.lastName",
        lastContactDays: "client.lastContactDays",
        totalAUM: "client.totalAUM",
        segment: "client.segment",
        riskFactors: "client.riskFactors[]",
        recommendedAction: "client.recommendedAction",
      },
    },
    {
      rows: "83-89",
      uiElement: "Engagement & Compliance Health",
      sourceSystem: "Salesforce",
      serviceCall: "complianceService.getHealthScore()",
      mockExport: "complianceHealthScore",
      notes: "Engagement metrics on Analytics page overlap with Compliance page. Consider cross-linking.",
    },
    {
      rows: "91-92",
      uiElement: "Advisor Capacity Progress",
      serviceCall: "analyticsService.getCapacity()",
      tsInterface: "AdvisorCapacity",
      mockExport: "advisorCapacity",
      fieldMapping: {
        current: "capacity.currentClients",
        max: "capacity.maxCapacity",
        utilization: "capacity.utilizationPct",
        breakdown: "capacity.segmentBreakdown[]",
      },
    },
  ],
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: COMPLIANCE (Spreadsheet rows 95-133)
// Component: Combined-Page11-Compliance.jsx
// ─────────────────────────────────────────────────────────────────────────────

export const COMPLIANCE_WIRING = {
  spreadsheetRows: "95-133",
  componentFile: "Combined-Page11-Compliance.jsx",

  elements: [
    {
      row: 98,
      uiElement: "Compliance Health Score",
      uiDetails: "Display overall compliance health score (e.g., 59%)",
      inlineVariable: "complianceScore",
      serviceCall: "complianceService.getHealthScore()",
      mockExport: "complianceHealthScore",
    },
    {
      rows: "100-103",
      uiElement: "Compliance Metric Cards (Current, Expiring, Overdue, Pending)",
      inlineVariable: "statusCounts",
      serviceCall: "complianceService.getItems()",
      tsInterface: "ComplianceItem[]",
      mockExport: "complianceItems",
      notes: "Derive counts: current = items where status='current', expiring = status='expiring_soon', overdue = status='overdue', pending = status='pending'",
    },
    {
      rows: "107-110",
      uiElement: "Compliance Filter Tabs (All, Overdue, Expiring, Audit Trail)",
      notes: "Front-end filter on complianceItems[] by status field.",
    },
    {
      rows: "112-121",
      uiElement: "Compliance Item Rows",
      inlineVariable: "complianceItems",
      serviceCall: "complianceService.getItems()",
      tsInterface: "ComplianceItem[]",
      mockExport: "complianceItems",
      fieldMapping: {
        title: "item.title",         // row 113
        description: "item.description",  // row 114 (derive from category)
        clientName: "item.clientId → client lookup",  // row 115
        status: "item.status",       // row 117
        dueDate: "item.dueDate",     // row 120
        lastCompleted: "item.lastCompleted",  // row 121
      },
    },
    {
      rows: "123-129",
      uiElement: "7 Compliance Categories",
      serviceCall: "complianceService.getCategories()",
      tsInterface: "ComplianceCategory[]",
      mockExport: "complianceCategories",
      categories: [
        { row: 123, key: "risk_profile_review", label: "Risk Profile Review" },
        { row: 124, key: "ips_review", label: "IPS Review" },
        { row: 125, key: "estate_plan_review", label: "Estate Plan Review" },
        { row: 126, key: "suitability_review", label: "Suitability Review" },
        { row: 127, key: "concentrated_position", label: "Concentrated Position Documentation" },
        { row: 128, key: "beneficiary_update", label: "Beneficiary Update" },
        { row: 129, key: "insurance_review", label: "Insurance Review" },
      ],
    },
    {
      row: 133,
      uiElement: "Audit Trail Records",
      inlineVariable: "auditTrail",
      serviceCall: "complianceService.getReviewEvents()",
      tsInterface: "ComplianceReviewEvent[]",
      mockExport: "complianceReviewEvents",
    },
  ],
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: OBJECTS TO SYNC (Spreadsheet "Objects to Sync" sheet)
// This defines what Salesforce objects the API server needs to query
// ─────────────────────────────────────────────────────────────────────────────

export const OBJECTS_TO_SYNC = [
  {
    object: "Account",
    details: "Households",
    source: "Salesforce",
    filter: "WHERE RecordType.DeveloperName = 'IndustriesHousehold'",
    frontEndConsumer: "clientService.getHouseholds()",
    tsInterface: "Household[]",
  },
  {
    object: "Account",
    details: "Person Accounts / Clients",
    source: "Salesforce",
    filter: "WHERE RecordType.DeveloperName = 'PersonAccount'",
    frontEndConsumer: "clientService.getRoster()",
    tsInterface: "ClientProfile[]",
  },
  {
    object: "Household Person Account Relation",
    source: "Salesforce",
    frontEndConsumer: "clientService.getHouseholdMembers(clientId)",
    tsInterface: "HouseholdMember[]",
  },
  {
    object: "User",
    source: "Salesforce",
    frontEndConsumer: "configService.getAdvisor()",
    tsInterface: "Advisor",
  },
  {
    object: "Opportunity",
    source: "Salesforce",
    frontEndConsumer: "— not yet mapped to a page (follow-up tracking, oq-008)",
    notes: "Open question: SF Opportunities or LINC Cases for client follow-ups?",
  },
];


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: SOURCE SYSTEMS (Spreadsheet "Source Systems" sheet)
// ─────────────────────────────────────────────────────────────────────────────

export const SOURCE_SYSTEMS = [
  { system: "Orion", details: "portfolio data, transactions, financial accounts", phase: "Phase 1", status: "confirmed" },
  { system: "Salesforce", details: "client profiles, CRM data, activities", phase: "Phase 1", status: "confirmed" },
  { system: "Custodians - Schwab/Fidelity", details: "account data, holdings", phase: "?", status: "pending" },
  { system: "Snowflake", details: "aggregated/ETL data warehouse", phase: "?", status: "pending" },
  { system: "eMoney / MoneyGuidePro", details: "planning", phase: "?", status: "NEW — not in mock-data-master" },
  { system: "Holistiplan", details: "tax", phase: "?", status: "NEW — not in mock-data-master" },
  { system: "Wealth.com", details: "estate planning", phase: "?", status: "NEW — not in mock-data-master" },
];

// ⚠️ NEW SOURCE SYSTEMS from spreadsheet NOT in mock-data-master:
// - eMoney / MoneyGuidePro (planning) → feeds Page 3 Planning diagnostic scores
// - Holistiplan (tax) → feeds Page 4 Tax planning data
// - Wealth.com (estate planning) → feeds Page 5 Estate planning data
// These need to be added to sourceSystemRegistry in mock-data-master.ts


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: OPEN QUESTIONS (Spreadsheet "Open Questions" sheet)
// Cross-referenced with mock-data-master.ts openQuestions export
// ─────────────────────────────────────────────────────────────────────────────

export const OPEN_QUESTIONS = [
  { id: "oq-001", question: "Orion direct vs Salesforce synced Orion data", answer: "Use Orion directly — real-time data", status: "Closed", inMockData: true },
  { id: "oq-002", question: "Household grouping in SF — Households having Person Accounts or Households having Households", status: "Open", inMockData: true },
  { id: "oq-003", question: "Tier definitions — what defines A/B/C/D", status: "Open", inMockData: true, affectsPages: ["Page 2 Clients", "Page 9 Analytics"] },
  { id: "oq-004", question: "Action Queue — can AI surface task types or must they be predefined", status: "Open", inMockData: true, affectsPages: ["Page 1 Dashboard", "Page 10 Engagement"] },
  { id: "oq-005", question: "Alerts — combination of SF and Orion? Need intended functionality", status: "Open", inMockData: true, affectsPages: ["Page 1 Dashboard"] },
  { id: "oq-006", question: "At-Risk Clients — what defines at-risk?", status: "Open", inMockData: true, affectsPages: ["Page 9 Analytics"] },
  { id: "oq-007", question: "Advisor Capacity — what source system drives utilization?", status: "Open", inMockData: true, affectsPages: ["Page 9 Analytics"] },
  { id: "oq-008", question: "Follow-up tracking — SF Opportunities or LINC Cases?", status: "Open", inMockData: true },
  { id: "NEW-from-spreadsheet-1", question: "Understand current APIs for household hierarchy from SF", status: "Open", inMockData: false },
  { id: "NEW-from-spreadsheet-2", question: "Understand grouping for Orion households", status: "Open", inMockData: false },
  { id: "NEW-from-spreadsheet-3", question: "How Microsoft Entra Users map to SF Users (email match)", status: "Open", inMockData: false },
  { id: "NEW-from-spreadsheet-4", question: "Create an SF API to be consumed by MuleSoft", status: "Open", inMockData: false },
  { id: "NEW-from-spreadsheet-5", question: "Create a Mock Payload for MuleSoft", status: "Open", inMockData: false },
  { id: "NEW-from-spreadsheet-6", question: "SF Dashboards run as a user — OK to get this info?", status: "Open", inMockData: false },
  { id: "NEW-from-spreadsheet-7", question: "Segmentation of Clients at AI layer?", status: "Open", inMockData: false },
  { id: "NEW-from-spreadsheet-8", question: "MuleSoft Integration User — needs additional permissions?", status: "Open", inMockData: false },
];


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: ORION ID LIST (Spreadsheet "Orion Id List" sheet)
// Already in mock-data-master.ts as orionIdMappings
// ─────────────────────────────────────────────────────────────────────────────

export const ORION_ID_MAPPING_STATUS = {
  inMockData: true,
  mockExport: "orionIdMappings",
  serviceCall: "configService.getOrionMappings()",
  renderedOn: "Combined-Page13-Config.jsx",
  totalMappings: 13,  // from spreadsheet
  notes: "Spreadsheet has 30 rows of Orion ID types. mock-data-master has 13 of the most critical ones. Consider adding the remaining 17 (Systematics, Sub Advisor, Shareclass, Receivables, Payout, Management Style, Goal, Custodian, Business Line, Beneficiary, ActionStep, etc.).",
  missingFromMock: [
    "Orion Id → Systematics (2024-09-26)",
    "Orion Id → Sub Advisor (2024-09-26)",
    "Orion Id → Shareclass (2023-10-15)",
    "Orion Id → Receivables (2024-09-26)",
    "Orion Id → Payout (2024-09-26)",
    "Orion Id → Management Style (2023-10-15)",
    "Orion Id → Goal (2024-09-26)",
    "Orion Id → Custodian (2023-10-15)",
    "Orion Id → Business Line (2023-10-15)",
    "Orion Id → Beneficiary (2024-09-26)",
    "Orion Id → ActionStep (2024-09-26)",
    "Orion Id → Accounts Paying For Other Accounts (2024-09-26)",
  ],
};


// ─────────────────────────────────────────────────────────────────────────────
// SECTION: PAGES NOT IN SPREADSHEET (Your extra pages)
// Components: Page 3 (Planning), Page 4 (Tax), Page 5 (Estate),
//             Page 7 (Investments), Page 8 (Client360), Page 10 (Engagement),
//             Page 12 (Admin)
// ─────────────────────────────────────────────────────────────────────────────

export const PAGES_NOT_IN_SPREADSHEET = {
  note: "The spreadsheet only maps: Dashboard, Clients, Calendar, Analytics, Compliance. The following pages are YOUR additions (valid, but not explicitly in the spreadsheet mapping).",

  extraPages: [
    {
      page: "Page 3 — Planning",
      component: "Combined-Page3-Planning.jsx",
      dataSources: "ai-platform (JSON Render) + Salesforce + eMoney/MoneyGuidePro",
      status: "Phase 3 — pending ai-platform package",
    },
    {
      page: "Page 4 — Tax",
      component: "Combined-Page4-Tax.jsx",
      dataSources: "ai-platform + Orion + Holistiplan",
      status: "Phase 3 — pending ai-platform + Holistiplan integration",
    },
    {
      page: "Page 5 — Estate",
      component: "Combined-Page5-Estate.jsx",
      dataSources: "Salesforce + Wealth.com",
      status: "Phase 3 — pending Wealth.com integration",
    },
    {
      page: "Page 7 — Investments/Portfolio",
      component: "Combined-Page7-Investments.jsx",
      dataSources: "Orion direct",
      status: "Phase 1 — can wire now with portfolioService",
    },
    {
      page: "Page 8 — Client 360",
      component: "Combined-Page8-Client360.jsx",
      dataSources: "Salesforce + Orion",
      status: "Phase 1 — can wire now with clientService",
    },
    {
      page: "Page 10 — Engagement",
      component: "Combined-Page10-Engagement.jsx",
      dataSources: "AI-computed from Salesforce activity data",
      status: "Phase 2/3 — mock data ready, AI scoring is Phase 3",
    },
    {
      page: "Page 12 — Admin",
      component: "Combined-Page12-Admin.jsx",
      dataSources: "Internal app metrics",
      status: "Phase 1 — can wire now with adminService",
    },
  ],
};


// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE GAP ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

export const GAPS = {
  // Items in spreadsheet NOT in your components
  spreadsheetItemsMissingFromComponents: [
    "YTD Recurring Sales Goal (spreadsheet row 19) — NOT on Page 1 Dashboard",
    "YTD Non-Recurring Sales Goal (spreadsheet row 20) — NOT on Page 1 Dashboard",
    "Segment breakdown on client count card (row 21) — NOT on Page 1 Dashboard",
    "Action Queue with 10 pending tasks (rows 30-36) — NOT on Page 1 Dashboard",
    "Upcoming Meetings separate widget (rows 37-39) — NOT on Page 1 Dashboard",
    "Household view alongside individual view (row 42, 52) — NOT on Page 2 Clients",
    "AI Query input on Analytics (row 72) — NOT functional on Page 9",
    "Advisor Capacity progress bar (rows 91-92) — partial on Page 9",
    "Revenue by Segment chart (row 94) — NOT on Page 9",
  ],

  // Items in your components NOT in spreadsheet
  componentItemsMissingFromSpreadsheet: [
    "Page 3 Planning — entire page not in mapping spreadsheet",
    "Page 4 Tax — entire page not in mapping spreadsheet",
    "Page 5 Estate — entire page not in mapping spreadsheet",
    "Client Pipeline table on Page 1 — not explicitly mapped",
    "Recent Activity feed on Page 1 — not explicitly mapped",
    "Book Snapshot (netFlowsMTD/QTD/YTD) — in mock data, not in spreadsheet",
    "Goals Widget (funded ratio, goals by category) — in mock data, not in spreadsheet",
    "Monte Carlo projection — in mock data, not in spreadsheet",
    "Alternative assets table — in mock data, not in spreadsheet",
    "Market indices ticker — in mock data, not in spreadsheet",
  ],

  // Items in mock-data-master NOT referenced anywhere
  mockDataNotUsedAnywhere: [
    "bookSnapshot.netFlowsMTD/QTD — data exists, not rendered",
    "goalsWidget.goalsByCategory — data exists, not rendered",
    "monteCarloResults[] (22 data points) — data exists, not rendered",
    "monteCarloSummary.stressTests[] — data exists, not rendered",
    "scenarioEvents[] (11 events) — data exists, not rendered",
    "alternativeAssets[] (4 private investments) — data exists, not rendered",
    "marketIndices[] (5 indices) — data exists, not rendered",
    "marketNews[] (5 headlines) — data exists, not rendered",
    "standardDocumentChecklist[] (28 items) — data exists, only 8 used on Page 5",
    "clientWorkflows[] — data exists, not rendered",
    "workflowTemplates[] — data exists, not rendered",
    "pilotTrends[] — data exists, not rendered",
    "sampleTranscript — data exists, not rendered",
    "segmentColors/chartColors — data exists, not consumed",
  ],

  // Source systems in spreadsheet NOT in mock-data-master
  newSourceSystems: [
    "eMoney / MoneyGuidePro (planning) — ADD to sourceSystemRegistry",
    "Holistiplan (tax) — ADD to sourceSystemRegistry",
    "Wealth.com (estate planning) — ADD to sourceSystemRegistry",
  ],

  // New open questions from spreadsheet NOT in mock-data-master
  newOpenQuestions: [
    "Understand current APIs for household hierarchy from SF",
    "Understand grouping for Orion households",
    "How Microsoft Entra Users map to SF Users",
    "Create SF API for MuleSoft consumption",
    "Create Mock Payload for MuleSoft",
    "SF Dashboards run-as-user authorization",
    "Client segmentation at AI layer",
    "MuleSoft Integration User permissions",
  ],

  // Missing Orion ID mappings (12 not in mock-data-master)
  missingOrionMappings: 12,
};


// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION PLAN
// ─────────────────────────────────────────────────────────────────────────────

export const EXECUTION_PLAN = [
  "STEP 1: Update mock-data-master.ts",
  "  - Add 3 new source systems (eMoney, Holistiplan, Wealth.com)",
  "  - Add 8 new open questions from spreadsheet",
  "  - Add 12 missing Orion ID mappings",
  "  - Add Tax interfaces (RothConversionOpp, TaxLossHarvestOpp, TaxProjection)",
  "  - Add Estate interfaces (EstateExposure)",
  "  - Add Planning diagnostic mock results",
  "",
  "STEP 2: Update data-service.ts",
  "  - Add taxService with getTaxLossHarvestOpps(), getRothConversionOpps()",
  "  - Add estateService with getEstateOverview(), getDocChecklist()",
  "  - Add planningService with getDiagnosticResults()",
  "",
  "STEP 3: Wire Page 1 Dashboard (add missing elements from spreadsheet)",
  "  - Add Sales Goals section (rows 19-20)",
  "  - Add segment breakdown to client count card (row 21)",
  "  - Add Action Queue widget (rows 30-36)",
  "  - Add Upcoming Meetings widget (rows 37-39)",
  "  - Wire all existing sections to data-service.ts",
  "",
  "STEP 4: Wire Page 2 Clients (add household view)",
  "  - Add household hierarchy view per Torin instruction",
  "  - Wire roster + households + tierDefinitions",
  "",
  "STEP 5: Wire remaining Phase 1 pages",
  "  - Page 6 Calendar → todaysSchedule + upcomingMeetings + tasks",
  "  - Page 7 Investments → portfolioService (all functions)",
  "  - Page 8 Client360 → clientService (all functions per clientId)",
  "  - Page 9 Analytics → analyticsService (all functions)",
  "  - Page 11 Compliance → complianceService (all functions)",
  "  - Page 12 Admin → adminService (all functions)",
  "  - Page 13 Config → configService (all functions)",
  "",
  "STEP 6: Wire Phase 3 pages (pending ai-platform)",
  "  - Page 3 Planning → JSON Render WealthDiagnosticResult schema",
  "  - Page 4 Tax → JSON Render + Orion holdings for TLH",
  "  - Page 5 Estate → Salesforce documents + StandardChecklistItem",
  "  - Page 10 Engagement → JSON Render EngagementAnalysisResult schema",
];
