import { db } from "./db";
import { advisors, clients, households, householdMembers, accounts, holdings, performance, transactions, tasks, meetings, activities, alerts, documents, complianceItems, lifeEvents, documentChecklist, workflowTemplates, clientWorkflows, associates, clientTeamMembers, diagnosticConfig, diagnosticResults, transcriptConfig, complianceReviews, complianceReviewEvents, featureFlags, investorProfileQuestionSchemas, triggerCategories, reportTemplates, meetingNotes, recurringTasks, engagementScores, engagementEvents, intentSignals, nextBestActions, approvalItems, approvalRules, reportArtifacts, workflowDefinitions, workflowInstances, workflowStepExecutions, discoverySessions, discoveryQuestionnaires } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "./auth";
import { sampleDocuments } from "./sample-documents";
import { logger } from "./lib/logger";

async function seedChecklistForClient(clientId: string, firstName: string, lastName: string, items: Array<{category: string; documentName: string; description: string; required: boolean; received: boolean; receivedDate?: string; notes?: string; sortOrder: number}>) {
  for (const item of items) {
    await db.insert(documentChecklist).values({ clientId, ...item });
  }
  logger.info(`${firstName} ${lastName} document checklist seeded.`);
}

export async function seedDatabase() {
  const existingAdvisors = await db.select().from(advisors).limit(1);
  if (existingAdvisors.length > 0) {
    await seedAdditionalDemoData();
    return;
  }

  const [advisor] = await db.insert(advisors).values({
    name: process.env.SEED_DEMO_ADVISOR_NAME || "Sarah Mitchell",
    email: process.env.SEED_DEMO_ADVISOR_EMAIL || "sarah.mitchell@example.com",
    title: "Senior Wealth Advisor, CFP",
    phone: "(404) 555-0142",
    avatarUrl: "/avatars/sarah_mitchell.png",
    onboardingCompleted: true,
    passwordHash: hashPassword(process.env.SEED_DEMO_ADVISOR_PASSWORD || "changeme123"),
  }).returning();

  await db.insert(advisors).values({
    name: process.env.SEED_USER_NAME || "Dev Advisor",
    email: process.env.SEED_USER_EMAIL || "dev.advisor@example.com",
    title: "Lead Advisor",
    phone: "(404) 555-0100",
    onboardingCompleted: true,
    passwordHash: hashPassword(process.env.SEED_USER_PASSWORD || "changeme123"),
  });

  await db.insert(advisors).values({
    name: process.env.SEED_UAT_ADVISOR_NAME || "UAT Advisor",
    email: process.env.SEED_UAT_ADVISOR_EMAIL || "uat.advisor@example.com.uat",
    title: "Wealth Advisor",
    phone: "(404) 555-0200",
    onboardingCompleted: true,
    passwordHash: hashPassword(process.env.SEED_UAT_ADVISOR_PASSWORD || "changeme123"),
  });

  const clientsData = [
    { firstName: "Robert", lastName: "Henderson", email: "robert.henderson@gmail.com", phone: "(404) 555-1001", segment: "A", riskTolerance: "moderate-aggressive", dateOfBirth: "1958-03-15", occupation: "Retired CEO", employer: "Henderson Industries (Retired)", address: "1245 Peachtree Rd NE", city: "Atlanta", state: "GA", zip: "30309", lastContactDate: "2026-02-20", nextReviewDate: "2026-03-15", referralSource: "CPA Referral", interests: "Golf, grandchildren, philanthropy", notes: "Key relationship. Wife Margaret active in planning. Concerned about estate tax changes." },
    { firstName: "Margaret", lastName: "Henderson", email: "margaret.henderson@gmail.com", phone: "(404) 555-1002", segment: "A", riskTolerance: "moderate", dateOfBirth: "1960-07-22", occupation: "Retired Nonprofit Director", employer: "Atlanta Community Foundation (Retired)", address: "1245 Peachtree Rd NE", city: "Atlanta", state: "GA", zip: "30309", lastContactDate: "2025-10-15", nextReviewDate: "2026-01-15", referralSource: "Spouse", interests: "Art collecting, volunteer work, travel" },
    { firstName: "James", lastName: "Chen", email: "james.chen@techcorp.com", phone: "(770) 555-2001", segment: "A", riskTolerance: "aggressive", dateOfBirth: "1975-11-08", occupation: "CTO", employer: "TechCorp Solutions", address: "890 Lenox Rd", city: "Brookhaven", state: "GA", zip: "30319", lastContactDate: "2026-02-15", nextReviewDate: "2026-04-01", referralSource: "LinkedIn", interests: "Technology, startups, cryptocurrency, mountain biking", notes: "High growth focus. Concentrated stock position from employer. RSU vesting schedule." },
    { firstName: "Lisa", lastName: "Chen", email: "lisa.chen@gmail.com", phone: "(770) 555-2002", segment: "A", riskTolerance: "moderate", dateOfBirth: "1978-04-19", occupation: "Pediatrician", employer: "Children's Healthcare of Atlanta", address: "890 Lenox Rd", city: "Brookhaven", state: "GA", zip: "30319", lastContactDate: "2026-01-10", nextReviewDate: "2026-04-01", referralSource: "Spouse", interests: "Running, cooking, children's education" },
    { firstName: "Priya", lastName: "Patel", email: "priya.patel@medgroup.com", phone: "(678) 555-4001", segment: "B", riskTolerance: "moderate-conservative", dateOfBirth: "1982-12-05", occupation: "Cardiologist", employer: "Emory Healthcare", address: "567 Virginia Ave", city: "Atlanta", state: "GA", zip: "30306", lastContactDate: "2026-02-28", nextReviewDate: "2026-05-15", referralSource: "Medical Association Event", interests: "Yoga, medical research, real estate investing", notes: "New baby born Jan 2026. Education funding priority. Considering practice buy-in." },
    { firstName: "Sandra", lastName: "Vaughn", email: "sandra.vaughn@email.com", phone: "(415) 555-0264", segment: "A", riskTolerance: "moderate", dateOfBirth: "1964-09-28", occupation: "Attorney (Partner)", employer: "Vaughn & Associates LLP", address: "2200 Pacific Ave", city: "San Francisco", state: "CA", zip: "94115", lastContactDate: "2026-02-28", nextReviewDate: "2026-02-18", referralSource: "Client Referral", interests: "Charitable giving, estate planning, wine collecting", notes: "Partner at law firm. Interested in CRT for tax-efficient charitable giving. Estate attorney consultation scheduled." },
    { firstName: "Lisa", lastName: "Nakamura", email: "lisa.nakamura@email.com", phone: "(510) 555-0177", segment: "C", riskTolerance: "moderate-aggressive", dateOfBirth: "1978-01-20", occupation: "Software Engineering Manager", employer: "TechVista Inc.", address: "450 Grand Ave", city: "Oakland", state: "CA", zip: "94610", lastContactDate: "2026-02-05", nextReviewDate: "2026-08-05", referralSource: "Professional Network", interests: "Technology, travel, financial independence", notes: "MAGI projected under threshold for 2026. Review backdoor Roth conversion eligibility." },
  ];

  const createdClients: any[] = [];
  for (const c of clientsData) {
    const [created] = await db.insert(clients).values({ ...c, advisorId: advisor.id, status: "active" }).returning();
    createdClients.push(created);
  }

  const [robert, margaret, james, lisa, priya, sandra, lisaN] = createdClients;

  const [hh1] = await db.insert(households).values({ name: "Henderson Household", primaryClientId: robert.id, advisorId: advisor.id, totalAum: "4850000" }).returning();
  const [hh2] = await db.insert(households).values({ name: "Chen Household", primaryClientId: james.id, advisorId: advisor.id, totalAum: "3200000" }).returning();
  const [hh3] = await db.insert(households).values({ name: "Patel Household", primaryClientId: priya.id, advisorId: advisor.id, totalAum: "950000" }).returning();
  const [hh4] = await db.insert(households).values({ name: "Vaughn Household", primaryClientId: sandra.id, advisorId: advisor.id, totalAum: "3100000" }).returning();
  const [hh5] = await db.insert(households).values({ name: "Nakamura Household", primaryClientId: lisaN.id, advisorId: advisor.id, totalAum: "870000" }).returning();

  await db.insert(householdMembers).values([
    { householdId: hh1.id, clientId: robert.id, relationship: "Primary" },
    { householdId: hh1.id, clientId: margaret.id, relationship: "Spouse" },
    { householdId: hh2.id, clientId: james.id, relationship: "Primary" },
    { householdId: hh2.id, clientId: lisa.id, relationship: "Spouse" },
    { householdId: hh3.id, clientId: priya.id, relationship: "Primary" },
    { householdId: hh4.id, clientId: sandra.id, relationship: "Primary" },
    { householdId: hh5.id, clientId: lisaN.id, relationship: "Primary" },
  ]);

  const accountsData = [
    { clientId: robert.id, householdId: hh1.id, accountNumber: "ORN-001-4521", accountType: "Individual", custodian: "Charles Schwab", model: "Growth & Income", balance: "1850000", taxStatus: "taxable", status: "active" },
    { clientId: robert.id, householdId: hh1.id, accountNumber: "ORN-001-4522", accountType: "Traditional IRA", custodian: "Charles Schwab", model: "Balanced", balance: "1200000", taxStatus: "tax-deferred", status: "active" },
    { clientId: margaret.id, householdId: hh1.id, accountNumber: "ORN-001-4523", accountType: "Roth IRA", custodian: "Charles Schwab", model: "Growth", balance: "450000", taxStatus: "tax-free", status: "active" },
    { clientId: margaret.id, householdId: hh1.id, accountNumber: "ORN-001-4524", accountType: "Revocable Trust", custodian: "Charles Schwab", model: "Conservative Growth", balance: "1350000", taxStatus: "taxable", status: "active" },
    { clientId: james.id, householdId: hh2.id, accountNumber: "ORN-002-7801", accountType: "Individual", custodian: "Fidelity", model: "Aggressive Growth", balance: "1500000", taxStatus: "taxable", status: "active" },
    { clientId: james.id, householdId: hh2.id, accountNumber: "ORN-002-7802", accountType: "401(k) Rollover", custodian: "Fidelity", model: "Growth", balance: "890000", taxStatus: "tax-deferred", status: "active" },
    { clientId: lisa.id, householdId: hh2.id, accountNumber: "ORN-002-7803", accountType: "Roth IRA", custodian: "Fidelity", model: "Balanced", balance: "320000", taxStatus: "tax-free", status: "active" },
    { clientId: lisa.id, householdId: hh2.id, accountNumber: "ORN-002-7804", accountType: "529 Plan", custodian: "Fidelity", model: "Age-Based", balance: "185000", taxStatus: "tax-advantaged", status: "active" },
    { clientId: priya.id, householdId: hh3.id, accountNumber: "ORN-003-5501", accountType: "Individual", custodian: "Charles Schwab", model: "Conservative", balance: "450000", taxStatus: "taxable", status: "active" },
    { clientId: priya.id, householdId: hh3.id, accountNumber: "ORN-003-5502", accountType: "Roth IRA", custodian: "Charles Schwab", model: "Growth", balance: "280000", taxStatus: "tax-free", status: "active" },
    { clientId: priya.id, householdId: hh3.id, accountNumber: "ORN-003-5503", accountType: "SEP IRA", custodian: "Charles Schwab", model: "Balanced", balance: "220000", taxStatus: "tax-deferred", status: "active" },
    { clientId: sandra.id, householdId: hh4.id, accountNumber: "ORN-004-8801", accountType: "Individual", custodian: "Charles Schwab", model: "Income with Growth", balance: "1200000", taxStatus: "taxable", status: "active" },
    { clientId: sandra.id, householdId: hh4.id, accountNumber: "ORN-004-8802", accountType: "Traditional IRA", custodian: "Charles Schwab", model: "Balanced", balance: "850000", taxStatus: "tax-deferred", status: "active" },
    { clientId: sandra.id, householdId: hh4.id, accountNumber: "ORN-004-8803", accountType: "Roth IRA", custodian: "Charles Schwab", model: "Growth", balance: "380000", taxStatus: "tax-free", status: "active" },
    { clientId: sandra.id, householdId: hh4.id, accountNumber: "ORN-004-8804", accountType: "Donor Advised Fund", custodian: "Schwab Charitable", model: "Balanced Growth", balance: "275000", taxStatus: "tax-exempt", status: "active" },
    { clientId: sandra.id, householdId: hh4.id, accountNumber: "ORN-004-8805", accountType: "Irrevocable Trust", custodian: "Charles Schwab", model: "Conservative", balance: "395000", taxStatus: "taxable", status: "active" },
    { clientId: lisaN.id, householdId: hh5.id, accountNumber: "ORN-005-9901", accountType: "Individual", custodian: "Fidelity", model: "Growth", balance: "320000", taxStatus: "taxable", status: "active" },
    { clientId: lisaN.id, householdId: hh5.id, accountNumber: "ORN-005-9902", accountType: "401(k)", custodian: "Fidelity", model: "Target Date 2045", balance: "285000", taxStatus: "tax-deferred", status: "active" },
    { clientId: lisaN.id, householdId: hh5.id, accountNumber: "ORN-005-9903", accountType: "Roth IRA", custodian: "Fidelity", model: "Aggressive Growth", balance: "165000", taxStatus: "tax-free", status: "active" },
    { clientId: lisaN.id, householdId: hh5.id, accountNumber: "ORN-005-9904", accountType: "529 Plan", custodian: "Fidelity", model: "Age-Based", balance: "55000", taxStatus: "tax-advantaged", status: "active" },
    { clientId: lisaN.id, householdId: hh5.id, accountNumber: "ORN-005-9905", accountType: "HSA", custodian: "Fidelity", model: "Growth", balance: "45000", taxStatus: "tax-free", status: "active" },
  ];

  const createdAccounts: any[] = [];
  for (const a of accountsData) {
    const [created] = await db.insert(accounts).values(a).returning();
    createdAccounts.push(created);
  }

  const holdingsData = [
    { accountId: createdAccounts[0].id, ticker: "AAPL", name: "Apple Inc.", shares: "850", marketValue: "185000", costBasis: "120000", unrealizedGainLoss: "65000", weight: "10.00", sector: "Technology" },
    { accountId: createdAccounts[0].id, ticker: "MSFT", name: "Microsoft Corp.", shares: "420", marketValue: "178000", costBasis: "95000", unrealizedGainLoss: "83000", weight: "9.62", sector: "Technology" },
    { accountId: createdAccounts[0].id, ticker: "NVDA", name: "NVIDIA Corp.", shares: "300", marketValue: "222000", costBasis: "45000", unrealizedGainLoss: "177000", weight: "12.00", sector: "Technology" },
    { accountId: createdAccounts[0].id, ticker: "JNJ", name: "Johnson & Johnson", shares: "600", marketValue: "96000", costBasis: "88000", unrealizedGainLoss: "8000", weight: "5.19", sector: "Healthcare" },
    { accountId: createdAccounts[0].id, ticker: "JPM", name: "JPMorgan Chase", shares: "500", marketValue: "115000", costBasis: "72000", unrealizedGainLoss: "43000", weight: "6.22", sector: "Financials" },
    { accountId: createdAccounts[0].id, ticker: "VTI", name: "Vanguard Total Stock Market ETF", shares: "1200", marketValue: "312000", costBasis: "245000", unrealizedGainLoss: "67000", weight: "16.86", sector: "Broad Market" },
    { accountId: createdAccounts[0].id, ticker: "VXUS", name: "Vanguard Total Intl Stock ETF", shares: "2000", marketValue: "120000", costBasis: "110000", unrealizedGainLoss: "10000", weight: "6.49", sector: "International" },
    { accountId: createdAccounts[0].id, ticker: "BND", name: "Vanguard Total Bond Market ETF", shares: "3500", marketValue: "252000", costBasis: "262000", unrealizedGainLoss: "-10000", weight: "13.62", sector: "Fixed Income" },
    { accountId: createdAccounts[0].id, ticker: "VNQ", name: "Vanguard Real Estate ETF", shares: "800", marketValue: "72000", costBasis: "68000", unrealizedGainLoss: "4000", weight: "3.89", sector: "Real Estate" },
    { accountId: createdAccounts[0].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "298000", costBasis: "298000", unrealizedGainLoss: "0", weight: "16.11", sector: "Cash" },

    { accountId: createdAccounts[1].id, ticker: "VBIAX", name: "Vanguard Balanced Index Admiral", shares: "2800", marketValue: "420000", costBasis: "350000", unrealizedGainLoss: "70000", weight: "35.00", sector: "Balanced" },
    { accountId: createdAccounts[1].id, ticker: "VTSAX", name: "Vanguard Total Stock Market Admiral", shares: "1500", marketValue: "360000", costBasis: "280000", unrealizedGainLoss: "80000", weight: "30.00", sector: "Broad Market" },
    { accountId: createdAccounts[1].id, ticker: "VBTLX", name: "Vanguard Total Bond Market Admiral", shares: "3000", marketValue: "300000", costBasis: "310000", unrealizedGainLoss: "-10000", weight: "25.00", sector: "Fixed Income" },
    { accountId: createdAccounts[1].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "120000", costBasis: "120000", unrealizedGainLoss: "0", weight: "10.00", sector: "Cash" },

    { accountId: createdAccounts[2].id, ticker: "VOO", name: "Vanguard S&P 500 ETF", shares: "350", marketValue: "175000", costBasis: "130000", unrealizedGainLoss: "45000", weight: "38.89", sector: "Large Cap" },
    { accountId: createdAccounts[2].id, ticker: "QQQ", name: "Invesco QQQ Trust", shares: "200", marketValue: "104000", costBasis: "72000", unrealizedGainLoss: "32000", weight: "23.11", sector: "Technology" },
    { accountId: createdAccounts[2].id, ticker: "VGT", name: "Vanguard Info Tech ETF", shares: "150", marketValue: "82500", costBasis: "60000", unrealizedGainLoss: "22500", weight: "18.33", sector: "Technology" },
    { accountId: createdAccounts[2].id, ticker: "SCHD", name: "Schwab US Dividend Equity ETF", shares: "400", marketValue: "34000", costBasis: "28000", unrealizedGainLoss: "6000", weight: "7.56", sector: "Dividend" },
    { accountId: createdAccounts[2].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "54500", costBasis: "54500", unrealizedGainLoss: "0", weight: "12.11", sector: "Cash" },

    { accountId: createdAccounts[3].id, ticker: "VGIT", name: "Vanguard Intermediate-Term Treasury ETF", shares: "4000", marketValue: "240000", costBasis: "248000", unrealizedGainLoss: "-8000", weight: "17.78", sector: "Fixed Income" },
    { accountId: createdAccounts[3].id, ticker: "VTI", name: "Vanguard Total Stock Market ETF", shares: "1800", marketValue: "468000", costBasis: "380000", unrealizedGainLoss: "88000", weight: "34.67", sector: "Broad Market" },
    { accountId: createdAccounts[3].id, ticker: "VTIP", name: "Vanguard Short-Term Inflation-Protected Securities ETF", shares: "3000", marketValue: "150000", costBasis: "152000", unrealizedGainLoss: "-2000", weight: "11.11", sector: "TIPS" },
    { accountId: createdAccounts[3].id, ticker: "BND", name: "Vanguard Total Bond Market ETF", shares: "3500", marketValue: "252000", costBasis: "260000", unrealizedGainLoss: "-8000", weight: "18.67", sector: "Fixed Income" },
    { accountId: createdAccounts[3].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "240000", costBasis: "240000", unrealizedGainLoss: "0", weight: "17.78", sector: "Cash" },

    { accountId: createdAccounts[4].id, ticker: "NVDA", name: "NVIDIA Corp.", shares: "500", marketValue: "370000", costBasis: "50000", unrealizedGainLoss: "320000", weight: "24.67", sector: "Technology" },
    { accountId: createdAccounts[4].id, ticker: "AAPL", name: "Apple Inc.", shares: "600", marketValue: "130200", costBasis: "78000", unrealizedGainLoss: "52200", weight: "8.68", sector: "Technology" },
    { accountId: createdAccounts[4].id, ticker: "AMZN", name: "Amazon.com Inc.", shares: "350", marketValue: "73500", costBasis: "42000", unrealizedGainLoss: "31500", weight: "4.90", sector: "Technology" },
    { accountId: createdAccounts[4].id, ticker: "TSLA", name: "Tesla Inc.", shares: "200", marketValue: "78000", costBasis: "55000", unrealizedGainLoss: "23000", weight: "5.20", sector: "Technology" },
    { accountId: createdAccounts[4].id, ticker: "QQQ", name: "Invesco QQQ Trust", shares: "600", marketValue: "312000", costBasis: "220000", unrealizedGainLoss: "92000", weight: "20.80", sector: "Technology" },
    { accountId: createdAccounts[4].id, ticker: "ARKK", name: "ARK Innovation ETF", shares: "1500", marketValue: "82500", costBasis: "120000", unrealizedGainLoss: "-37500", weight: "5.50", sector: "Innovation" },
    { accountId: createdAccounts[4].id, ticker: "VGT", name: "Vanguard Info Tech ETF", shares: "400", marketValue: "220000", costBasis: "160000", unrealizedGainLoss: "60000", weight: "14.67", sector: "Technology" },
    { accountId: createdAccounts[4].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "233800", costBasis: "233800", unrealizedGainLoss: "0", weight: "15.59", sector: "Cash" },

    { accountId: createdAccounts[5].id, ticker: "VTI", name: "Vanguard Total Stock Market ETF", shares: "800", marketValue: "208000", costBasis: "170000", unrealizedGainLoss: "38000", weight: "23.37", sector: "Broad Market" },
    { accountId: createdAccounts[5].id, ticker: "VGT", name: "Vanguard Info Tech ETF", shares: "300", marketValue: "165000", costBasis: "120000", unrealizedGainLoss: "45000", weight: "18.54", sector: "Technology" },
    { accountId: createdAccounts[5].id, ticker: "VXUS", name: "Vanguard Total Intl Stock ETF", shares: "1500", marketValue: "90000", costBasis: "82000", unrealizedGainLoss: "8000", weight: "10.11", sector: "International" },
    { accountId: createdAccounts[5].id, ticker: "BND", name: "Vanguard Total Bond Market ETF", shares: "2000", marketValue: "144000", costBasis: "150000", unrealizedGainLoss: "-6000", weight: "16.18", sector: "Fixed Income" },
    { accountId: createdAccounts[5].id, ticker: "SCHD", name: "Schwab US Dividend Equity ETF", shares: "1200", marketValue: "102000", costBasis: "88000", unrealizedGainLoss: "14000", weight: "11.46", sector: "Dividend" },
    { accountId: createdAccounts[5].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "181000", costBasis: "181000", unrealizedGainLoss: "0", weight: "20.34", sector: "Cash" },

    { accountId: createdAccounts[6].id, ticker: "VTI", name: "Vanguard Total Stock Market ETF", shares: "400", marketValue: "104000", costBasis: "85000", unrealizedGainLoss: "19000", weight: "32.50", sector: "Broad Market" },
    { accountId: createdAccounts[6].id, ticker: "VXUS", name: "Vanguard Total Intl Stock ETF", shares: "800", marketValue: "48000", costBasis: "42000", unrealizedGainLoss: "6000", weight: "15.00", sector: "International" },
    { accountId: createdAccounts[6].id, ticker: "BND", name: "Vanguard Total Bond Market ETF", shares: "1200", marketValue: "86400", costBasis: "90000", unrealizedGainLoss: "-3600", weight: "27.00", sector: "Fixed Income" },
    { accountId: createdAccounts[6].id, ticker: "VTIP", name: "Vanguard Short-Term Inflation-Protected Securities ETF", shares: "600", marketValue: "30000", costBasis: "30500", unrealizedGainLoss: "-500", weight: "9.38", sector: "TIPS" },
    { accountId: createdAccounts[6].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "51600", costBasis: "51600", unrealizedGainLoss: "0", weight: "16.13", sector: "Cash" },

    { accountId: createdAccounts[7].id, ticker: "VSGAX", name: "Vanguard Small-Cap Growth Index", shares: "500", marketValue: "42500", costBasis: "35000", unrealizedGainLoss: "7500", weight: "22.97", sector: "Small Cap" },
    { accountId: createdAccounts[7].id, ticker: "VUG", name: "Vanguard Growth ETF", shares: "200", marketValue: "72000", costBasis: "55000", unrealizedGainLoss: "17000", weight: "38.92", sector: "Growth" },
    { accountId: createdAccounts[7].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "70500", costBasis: "70500", unrealizedGainLoss: "0", weight: "38.11", sector: "Cash" },

    { accountId: createdAccounts[8].id, ticker: "VYM", name: "Vanguard High Dividend Yield ETF", shares: "800", marketValue: "96000", costBasis: "78000", unrealizedGainLoss: "18000", weight: "21.33", sector: "Dividend" },
    { accountId: createdAccounts[8].id, ticker: "SCHD", name: "Schwab US Dividend Equity ETF", shares: "600", marketValue: "51000", costBasis: "44000", unrealizedGainLoss: "7000", weight: "11.33", sector: "Dividend" },
    { accountId: createdAccounts[8].id, ticker: "VTI", name: "Vanguard Total Stock Market ETF", shares: "500", marketValue: "130000", costBasis: "110000", unrealizedGainLoss: "20000", weight: "28.89", sector: "Broad Market" },
    { accountId: createdAccounts[8].id, ticker: "BND", name: "Vanguard Total Bond Market ETF", shares: "1000", marketValue: "72000", costBasis: "75000", unrealizedGainLoss: "-3000", weight: "16.00", sector: "Fixed Income" },
    { accountId: createdAccounts[8].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "101000", costBasis: "101000", unrealizedGainLoss: "0", weight: "22.44", sector: "Cash" },

    { accountId: createdAccounts[9].id, ticker: "VOO", name: "Vanguard S&P 500 ETF", shares: "200", marketValue: "100000", costBasis: "75000", unrealizedGainLoss: "25000", weight: "35.71", sector: "Large Cap" },
    { accountId: createdAccounts[9].id, ticker: "VGT", name: "Vanguard Info Tech ETF", shares: "100", marketValue: "55000", costBasis: "40000", unrealizedGainLoss: "15000", weight: "19.64", sector: "Technology" },
    { accountId: createdAccounts[9].id, ticker: "VXUS", name: "Vanguard Total Intl Stock ETF", shares: "600", marketValue: "36000", costBasis: "30000", unrealizedGainLoss: "6000", weight: "12.86", sector: "International" },
    { accountId: createdAccounts[9].id, ticker: "BND", name: "Vanguard Total Bond Market ETF", shares: "500", marketValue: "36000", costBasis: "37000", unrealizedGainLoss: "-1000", weight: "12.86", sector: "Fixed Income" },
    { accountId: createdAccounts[9].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "53000", costBasis: "53000", unrealizedGainLoss: "0", weight: "18.93", sector: "Cash" },

    { accountId: createdAccounts[10].id, ticker: "VTSAX", name: "Vanguard Total Stock Market Admiral", shares: "500", marketValue: "120000", costBasis: "95000", unrealizedGainLoss: "25000", weight: "54.55", sector: "Broad Market" },
    { accountId: createdAccounts[10].id, ticker: "VBTLX", name: "Vanguard Total Bond Market Admiral", shares: "600", marketValue: "60000", costBasis: "62000", unrealizedGainLoss: "-2000", weight: "27.27", sector: "Fixed Income" },
    { accountId: createdAccounts[10].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "40000", costBasis: "40000", unrealizedGainLoss: "0", weight: "18.18", sector: "Cash" },

    { accountId: createdAccounts[11].id, ticker: "VTI", name: "Vanguard Total Stock Market ETF", shares: "1000", marketValue: "260000", costBasis: "210000", unrealizedGainLoss: "50000", weight: "21.67", sector: "Broad Market" },
    { accountId: createdAccounts[11].id, ticker: "SCHD", name: "Schwab US Dividend Equity ETF", shares: "1500", marketValue: "127500", costBasis: "105000", unrealizedGainLoss: "22500", weight: "10.63", sector: "Dividend" },
    { accountId: createdAccounts[11].id, ticker: "VXUS", name: "Vanguard Total Intl Stock ETF", shares: "1800", marketValue: "108000", costBasis: "95000", unrealizedGainLoss: "13000", weight: "9.00", sector: "International" },
    { accountId: createdAccounts[11].id, ticker: "BND", name: "Vanguard Total Bond Market ETF", shares: "4000", marketValue: "288000", costBasis: "296000", unrealizedGainLoss: "-8000", weight: "24.00", sector: "Fixed Income" },
    { accountId: createdAccounts[11].id, ticker: "VNQ", name: "Vanguard Real Estate ETF", shares: "1200", marketValue: "108000", costBasis: "98000", unrealizedGainLoss: "10000", weight: "9.00", sector: "Real Estate" },
    { accountId: createdAccounts[11].id, ticker: "VTIP", name: "Vanguard Short-Term Inflation-Protected Securities ETF", shares: "1500", marketValue: "75000", costBasis: "76500", unrealizedGainLoss: "-1500", weight: "6.25", sector: "TIPS" },
    { accountId: createdAccounts[11].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "233500", costBasis: "233500", unrealizedGainLoss: "0", weight: "19.46", sector: "Cash" },

    { accountId: createdAccounts[12].id, ticker: "VBIAX", name: "Vanguard Balanced Index Admiral", shares: "2000", marketValue: "300000", costBasis: "255000", unrealizedGainLoss: "45000", weight: "35.29", sector: "Balanced" },
    { accountId: createdAccounts[12].id, ticker: "VTSAX", name: "Vanguard Total Stock Market Admiral", shares: "1200", marketValue: "288000", costBasis: "240000", unrealizedGainLoss: "48000", weight: "33.88", sector: "Broad Market" },
    { accountId: createdAccounts[12].id, ticker: "VBTLX", name: "Vanguard Total Bond Market Admiral", shares: "2000", marketValue: "200000", costBasis: "205000", unrealizedGainLoss: "-5000", weight: "23.53", sector: "Fixed Income" },
    { accountId: createdAccounts[12].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "62000", costBasis: "62000", unrealizedGainLoss: "0", weight: "7.29", sector: "Cash" },

    { accountId: createdAccounts[13].id, ticker: "VUG", name: "Vanguard Growth ETF", shares: "250", marketValue: "90000", costBasis: "70000", unrealizedGainLoss: "20000", weight: "23.68", sector: "Growth" },
    { accountId: createdAccounts[13].id, ticker: "QQQ", name: "Invesco QQQ Trust", shares: "200", marketValue: "104000", costBasis: "82000", unrealizedGainLoss: "22000", weight: "27.37", sector: "Technology" },
    { accountId: createdAccounts[13].id, ticker: "VXUS", name: "Vanguard Total Intl Stock ETF", shares: "1000", marketValue: "60000", costBasis: "52000", unrealizedGainLoss: "8000", weight: "15.79", sector: "International" },
    { accountId: createdAccounts[13].id, ticker: "BND", name: "Vanguard Total Bond Market ETF", shares: "800", marketValue: "57600", costBasis: "60000", unrealizedGainLoss: "-2400", weight: "15.16", sector: "Fixed Income" },
    { accountId: createdAccounts[13].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "68400", costBasis: "68400", unrealizedGainLoss: "0", weight: "18.00", sector: "Cash" },

    { accountId: createdAccounts[14].id, ticker: "VFSVX", name: "Vanguard FTSE Social Index", shares: "600", marketValue: "120000", costBasis: "100000", unrealizedGainLoss: "20000", weight: "43.64", sector: "ESG" },
    { accountId: createdAccounts[14].id, ticker: "BND", name: "Vanguard Total Bond Market ETF", shares: "1500", marketValue: "108000", costBasis: "112000", unrealizedGainLoss: "-4000", weight: "39.27", sector: "Fixed Income" },
    { accountId: createdAccounts[14].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "47000", costBasis: "47000", unrealizedGainLoss: "0", weight: "17.09", sector: "Cash" },

    { accountId: createdAccounts[15].id, ticker: "VTI", name: "Vanguard Total Stock Market ETF", shares: "300", marketValue: "78000", costBasis: "65000", unrealizedGainLoss: "13000", weight: "30.47", sector: "Broad Market" },
    { accountId: createdAccounts[15].id, ticker: "QQQ", name: "Invesco QQQ Trust", shares: "100", marketValue: "52000", costBasis: "40000", unrealizedGainLoss: "12000", weight: "20.31", sector: "Technology" },
    { accountId: createdAccounts[15].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "126000", costBasis: "126000", unrealizedGainLoss: "0", weight: "49.22", sector: "Cash" },

    { accountId: createdAccounts[16].id, ticker: "VTI", name: "Vanguard Total Stock Market ETF", shares: "400", marketValue: "104000", costBasis: "82000", unrealizedGainLoss: "22000", weight: "24.12", sector: "Broad Market" },
    { accountId: createdAccounts[16].id, ticker: "VXUS", name: "Vanguard Total Intl Stock ETF", shares: "500", marketValue: "30000", costBasis: "26000", unrealizedGainLoss: "4000", weight: "6.96", sector: "International" },
    { accountId: createdAccounts[16].id, ticker: "VUG", name: "Vanguard Growth ETF", shares: "150", marketValue: "54000", costBasis: "42000", unrealizedGainLoss: "12000", weight: "12.53", sector: "Growth" },
    { accountId: createdAccounts[16].id, ticker: "BND", name: "Vanguard Total Bond Market ETF", shares: "800", marketValue: "57600", costBasis: "60000", unrealizedGainLoss: "-2400", weight: "13.36", sector: "Fixed Income" },
    { accountId: createdAccounts[16].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "39400", costBasis: "39400", unrealizedGainLoss: "0", weight: "9.14", sector: "Cash" },

    { accountId: createdAccounts[17].id, ticker: "VXUS", name: "Vanguard Total Intl Stock ETF", shares: "400", marketValue: "24000", costBasis: "20000", unrealizedGainLoss: "4000", weight: "14.55", sector: "International" },
    { accountId: createdAccounts[17].id, ticker: "VUG", name: "Vanguard Growth ETF", shares: "200", marketValue: "72000", costBasis: "58000", unrealizedGainLoss: "14000", weight: "43.64", sector: "Growth" },
    { accountId: createdAccounts[17].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "69000", costBasis: "69000", unrealizedGainLoss: "0", weight: "41.82", sector: "Cash" },

    { accountId: createdAccounts[18].id, ticker: "VTIVX", name: "Vanguard Target Retirement 2045", shares: "300", marketValue: "37500", costBasis: "32000", unrealizedGainLoss: "5500", weight: "68.18", sector: "Target Date" },
    { accountId: createdAccounts[18].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "17500", costBasis: "17500", unrealizedGainLoss: "0", weight: "31.82", sector: "Cash" },

    { accountId: createdAccounts[19].id, ticker: "VTI", name: "Vanguard Total Stock Market ETF", shares: "100", marketValue: "26000", costBasis: "22000", unrealizedGainLoss: "4000", weight: "57.78", sector: "Broad Market" },
    { accountId: createdAccounts[19].id, ticker: "CASH", name: "Cash & Equivalents", shares: "1", marketValue: "19000", costBasis: "19000", unrealizedGainLoss: "0", weight: "42.22", sector: "Cash" },
  ];

  for (const h of holdingsData) {
    await db.insert(holdings).values(h);
  }

  const perfData = [
    { householdId: hh1.id, period: "1M", returnPct: "2.35", benchmarkPct: "1.89" },
    { householdId: hh1.id, period: "3M", returnPct: "5.12", benchmarkPct: "4.67" },
    { householdId: hh1.id, period: "YTD", returnPct: "8.24", benchmarkPct: "7.10" },
    { householdId: hh1.id, period: "1Y", returnPct: "14.56", benchmarkPct: "12.80" },
    { householdId: hh1.id, period: "3Y", returnPct: "32.10", benchmarkPct: "28.50" },
    { householdId: hh1.id, period: "5Y", returnPct: "58.40", benchmarkPct: "52.30" },
    { householdId: hh2.id, period: "1M", returnPct: "3.80", benchmarkPct: "1.89" },
    { householdId: hh2.id, period: "3M", returnPct: "8.45", benchmarkPct: "4.67" },
    { householdId: hh2.id, period: "YTD", returnPct: "15.20", benchmarkPct: "7.10" },
    { householdId: hh2.id, period: "1Y", returnPct: "22.30", benchmarkPct: "12.80" },
    { householdId: hh2.id, period: "3Y", returnPct: "45.60", benchmarkPct: "28.50" },
    { householdId: hh2.id, period: "5Y", returnPct: "78.90", benchmarkPct: "52.30" },
    { householdId: hh3.id, period: "1M", returnPct: "1.50", benchmarkPct: "1.89" },
    { householdId: hh3.id, period: "3M", returnPct: "3.90", benchmarkPct: "4.67" },
    { householdId: hh3.id, period: "YTD", returnPct: "6.20", benchmarkPct: "7.10" },
    { householdId: hh3.id, period: "1Y", returnPct: "10.80", benchmarkPct: "12.80" },
    { householdId: hh3.id, period: "3Y", returnPct: "24.50", benchmarkPct: "28.50" },
    { householdId: hh3.id, period: "5Y", returnPct: "42.10", benchmarkPct: "52.30" },
    { householdId: hh4.id, period: "1M", returnPct: "1.85", benchmarkPct: "1.89" },
    { householdId: hh4.id, period: "3M", returnPct: "4.30", benchmarkPct: "4.67" },
    { householdId: hh4.id, period: "YTD", returnPct: "7.15", benchmarkPct: "7.10" },
    { householdId: hh4.id, period: "1Y", returnPct: "12.40", benchmarkPct: "12.80" },
    { householdId: hh4.id, period: "3Y", returnPct: "29.80", benchmarkPct: "28.50" },
    { householdId: hh4.id, period: "5Y", returnPct: "54.20", benchmarkPct: "52.30" },
    { householdId: hh5.id, period: "1M", returnPct: "2.90", benchmarkPct: "1.89" },
    { householdId: hh5.id, period: "3M", returnPct: "6.50", benchmarkPct: "4.67" },
    { householdId: hh5.id, period: "YTD", returnPct: "11.80", benchmarkPct: "7.10" },
    { householdId: hh5.id, period: "1Y", returnPct: "18.90", benchmarkPct: "12.80" },
    { householdId: hh5.id, period: "3Y", returnPct: "38.40", benchmarkPct: "28.50" },
    { householdId: hh5.id, period: "5Y", returnPct: "65.10", benchmarkPct: "52.30" },
  ];

  for (const p of perfData) {
    await db.insert(performance).values(p);
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const meetingsData = [
    { advisorId: advisor.id, clientId: robert.id, title: "Annual Review - Henderson", startTime: `${todayStr}T10:00:00`, endTime: `${todayStr}T11:30:00`, type: "Annual Review", status: "scheduled", location: "Office - Conference Room A", timezone: "America/New_York", attendees: [{ name: "Robert Henderson", email: "robert@example.com" }, { name: "Margaret Henderson", email: "margaret@example.com" }], agenda: ["Portfolio performance review", "Estate plan update", "Tax-loss harvesting strategy", "Charitable giving goals"], description: "Comprehensive annual review covering portfolio performance, estate planning updates, and tax strategy." },
    { advisorId: advisor.id, clientId: james.id, title: "Portfolio Review - Chen", startTime: `${todayStr}T14:00:00`, endTime: `${todayStr}T15:00:00`, type: "Semi-Annual Review", status: "scheduled", location: "Zoom", timezone: "America/New_York", attendees: [{ name: "James Chen", email: "james@example.com" }], agenda: ["RSU vesting review", "Concentration risk assessment", "529 plan contributions"] },
    { advisorId: advisor.id, clientId: priya.id, title: "New Baby Planning - Patel", startTime: `${todayStr}T16:00:00`, endTime: `${todayStr}T16:45:00`, type: "Life Event", status: "scheduled", location: "Phone Call", timezone: "America/New_York" },
    { advisorId: advisor.id, clientId: robert.id, title: "Estate Plan Update - Henderson", startTime: `${tomorrow.toISOString().split("T")[0]}T09:30:00`, endTime: `${tomorrow.toISOString().split("T")[0]}T10:30:00`, type: "Planning Session", status: "scheduled", location: "Office - Conference Room B", timezone: "America/New_York", agenda: ["Trust amendments", "Beneficiary designations", "Power of attorney update"] },
    { advisorId: advisor.id, clientId: robert.id, title: "Q4 Review - Henderson", startTime: "2025-12-15T10:00:00", endTime: "2025-12-15T11:30:00", type: "Quarterly Review", status: "completed", notes: "Reviewed year-end tax-loss harvesting. Discussed estate plan updates. Margaret wants to increase charitable giving. Agreed to rebalance after January.", location: "Office" },
    { advisorId: advisor.id, clientId: priya.id, title: "Post-Baby Financial Review - Patel", startTime: "2026-02-10T10:00:00", endTime: "2026-02-10T11:00:00", type: "Life Event", status: "completed", notes: "Discussed 529 plan setup for baby Aria. Reviewed life insurance needs - recommended $2M term policy. Discussed estate planning basics. Priya considering practice buy-in at Emory, potential $400k investment.", location: "Office" },
  ];

  const createdMeetings: any[] = [];
  for (const m of meetingsData) {
    const [created] = await db.insert(meetings).values(m).returning();
    createdMeetings.push(created);
  }

  if (createdMeetings.length > 4) {
    const completedMeeting1 = createdMeetings[4];
    const completedMeeting2 = createdMeetings[5];

    await db.insert(meetingNotes).values([
      { meetingId: completedMeeting1.id, advisorId: advisor.id, noteText: "Robert expressed concern about charitable giving strategy. Wants to maximize QCD to $105,000 this year. Margaret interested in DAF for multi-year giving.", summary: "Client wants to increase QCDs and explore DAF strategy for charitable giving.", actionItems: ["Research DAF providers for Henderson account", "Calculate optimal QCD amount for 2026"] },
      { meetingId: completedMeeting1.id, advisorId: advisor.id, noteText: "Tax-loss harvesting identified $45K in unrealized losses across three positions. Discussed wash sale rules and replacement securities.", summary: "Significant tax-loss harvesting opportunity identified. Need to execute before year-end.", actionItems: ["Execute TLH trades by Dec 31", "Document replacement securities for wash sale compliance"] },
      { meetingId: completedMeeting2.id, advisorId: advisor.id, noteText: "James has 15,000 NVDA shares vesting Q1 2026. Agreed on 25% quarterly sell strategy to reduce concentration from 40% to under 20% by year-end.", summary: "RSU diversification plan established. Systematic quarterly sales to reduce NVDA concentration.", actionItems: ["Set up systematic sell orders for Q1 NVDA vesting", "Review 10b5-1 plan eligibility"] },
    ]);
  }

  const txData = [
    { accountId: createdAccounts[0].id, type: "buy", ticker: "VTI", description: "Buy 200 shares VTI", amount: "52000", date: "2026-02-28" },
    { accountId: createdAccounts[0].id, type: "sell", ticker: "BND", description: "Sell 500 shares BND - rebalance", amount: "36000", date: "2026-02-25" },
    { accountId: createdAccounts[0].id, type: "dividend", ticker: "AAPL", description: "AAPL dividend Q1", amount: "2040", date: "2026-02-15" },
    { accountId: createdAccounts[0].id, type: "dividend", ticker: "JNJ", description: "JNJ dividend Q1", amount: "2340", date: "2026-02-10" },
    { accountId: createdAccounts[1].id, type: "withdrawal", description: "RMD Distribution", amount: "48000", date: "2026-01-15" },
    { accountId: createdAccounts[1].id, type: "buy", ticker: "VTSAX", description: "Buy Vanguard Total Stock Market Admiral", amount: "25000", date: "2026-02-01" },
    { accountId: createdAccounts[4].id, type: "deposit", description: "RSU vesting deposit", amount: "125000", date: "2026-02-01" },
    { accountId: createdAccounts[4].id, type: "sell", ticker: "NVDA", description: "Sell 50 shares NVDA - diversification", amount: "37000", date: "2026-02-05" },
    { accountId: createdAccounts[4].id, type: "buy", ticker: "QQQ", description: "Buy 100 shares QQQ", amount: "52000", date: "2026-02-06" },
    { accountId: createdAccounts[5].id, type: "deposit", description: "401(k) rollover from previous employer", amount: "45000", date: "2026-01-15" },
    { accountId: createdAccounts[5].id, type: "buy", ticker: "VGT", description: "Buy 50 shares VGT", amount: "27500", date: "2026-01-20" },
    { accountId: createdAccounts[7].id, type: "deposit", description: "Annual 529 contribution", amount: "16000", date: "2026-01-10" },
    { accountId: createdAccounts[8].id, type: "deposit", description: "Monthly contribution", amount: "5000", date: "2026-03-01" },
    { accountId: createdAccounts[8].id, type: "dividend", ticker: "VYM", description: "VYM dividend Q1", amount: "1440", date: "2026-02-20" },
    { accountId: createdAccounts[8].id, type: "buy", ticker: "VTI", description: "Buy 20 shares VTI", amount: "5200", date: "2026-02-22" },
    { accountId: createdAccounts[9].id, type: "deposit", description: "Roth IRA contribution 2026", amount: "7000", date: "2026-01-05" },
    { accountId: createdAccounts[9].id, type: "buy", ticker: "VOO", description: "Buy 14 shares VOO", amount: "7000", date: "2026-01-06" },
    { accountId: createdAccounts[10].id, type: "deposit", description: "SEP IRA contribution", amount: "15000", date: "2026-02-15" },
    { accountId: createdAccounts[10].id, type: "buy", ticker: "VTSAX", description: "Buy Vanguard Total Stock Market Admiral", amount: "15000", date: "2026-02-16" },
  ];

  for (const t of txData) {
    await db.insert(transactions).values(t);
  }

  // Tasks are seeded after associates are created (see below)

  const alertsData = [
    { advisorId: advisor.id, clientId: robert.id, type: "drift", severity: "warning", title: "Portfolio Drift Alert - Henderson", message: "Henderson Individual account has drifted 3.2% from target allocation. Fixed income underweight, technology overweight. Consider rebalancing at next review.", isRead: false },
    { advisorId: advisor.id, clientId: robert.id, type: "rmd", severity: "critical", title: "RMD Processing Due - Henderson", message: "Robert Henderson's 2026 RMD of approximately $48,000 from Traditional IRA must be processed. Recommend scheduling distribution before Q2.", isRead: false },
    { advisorId: advisor.id, clientId: james.id, type: "cash_movement", severity: "info", title: "Large Deposit - Chen", message: "RSU vesting deposit of $125,000 received in Chen Individual account on 2/1/2026. Review for reinvestment per diversification strategy.", isRead: false },
    { advisorId: advisor.id, clientId: james.id, type: "compliance", severity: "warning", title: "Concentrated Position Warning - Chen", message: "TechCorp (NVDA proxy) position in Chen Individual account exceeds 24% of portfolio. Suitability documentation recommended.", isRead: false },
    { advisorId: advisor.id, clientId: priya.id, type: "life_event", severity: "info", title: "Life Event - Patel", message: "New baby born January 2026 (Aria Patel). Recommended actions: 529 plan setup, life insurance review, beneficiary updates, estate planning basics.", isRead: true },
    { advisorId: advisor.id, clientId: priya.id, type: "engagement", severity: "info", title: "Follow-Up Needed - Patel", message: "Life insurance application submitted 3 weeks ago. Follow up with Northwestern Mutual on underwriting status.", isRead: false },
    { advisorId: advisor.id, type: "market", severity: "info", title: "Market Alert - Fed Meeting", message: "Federal Reserve FOMC meeting scheduled for March 18-19. Potential rate decision impact on bond portfolios. Review fixed income allocations across all clients.", isRead: true },
    { advisorId: advisor.id, type: "compliance", severity: "warning", title: "Quarterly Compliance Audit Due", message: "Q1 2026 compliance review and documentation audit due by March 31. Ensure all client suitability reviews are current.", isRead: false },
  ];

  for (const a of alertsData) {
    await db.insert(alerts).values(a);
  }

  const activitiesData = [
    { advisorId: advisor.id, clientId: robert.id, type: "meeting", subject: "Q3 Portfolio Review", description: "Reviewed third quarter performance and discussed rebalancing strategy ahead of year-end.", date: "2025-09-22", duration: 60 },
    { advisorId: advisor.id, clientId: robert.id, type: "call", subject: "Tax Planning Call", description: "Discussed tax-loss harvesting opportunities before year-end. Identified several positions.", date: "2025-10-15", duration: 20 },
    { advisorId: advisor.id, clientId: robert.id, type: "email", subject: "Year-End Tax Summary", description: "Sent preliminary year-end tax impact report and harvesting recommendations.", date: "2025-11-10", duration: 15 },
    { advisorId: advisor.id, clientId: robert.id, type: "meeting", subject: "Q4 Annual Review", description: "Comprehensive year-end review. Discussed estate planning, tax-loss harvesting, and charitable giving strategy. Margaret wants to increase QCDs.", date: "2025-12-15", duration: 90 },
    { advisorId: advisor.id, clientId: robert.id, type: "call", subject: "New Year Check-In", description: "Quick check-in call to discuss January market outlook and confirm RMD schedule.", date: "2026-01-08", duration: 15 },
    { advisorId: advisor.id, clientId: robert.id, type: "email", subject: "RMD Processing Confirmation", description: "Confirmed RMD distribution of $48K from Traditional IRA has been processed.", date: "2026-01-20", duration: 10 },
    { advisorId: advisor.id, clientId: robert.id, type: "call", subject: "RMD Discussion", description: "Called to discuss RMD timing for 2026. Robert prefers Q1 distribution. Will process $48K from Traditional IRA.", date: "2026-02-20", duration: 15 },
    { advisorId: advisor.id, clientId: robert.id, type: "email", subject: "Estate Plan Attorney Referral", description: "Sent referral to James Blake at Baker & McKenzie for estate plan updates. Cc'd Margaret.", date: "2026-02-22", duration: 10 },
    { advisorId: advisor.id, clientId: margaret.id, type: "call", subject: "Charitable Giving Discussion", description: "Discussed qualified charitable distributions and donor-advised fund options with Margaret. She wants to donate $50K to Atlanta Community Foundation.", date: "2025-10-15", duration: 20 },
    { advisorId: advisor.id, clientId: james.id, type: "meeting", subject: "RSU Planning Session", description: "Reviewed RSU vesting schedule and diversification plan. Agreed to sell 25% of vesting shares quarterly to reduce concentration.", date: "2026-01-20", duration: 60 },
    { advisorId: advisor.id, clientId: james.id, type: "email", subject: "Diversification Update", description: "Sent summary of agreed-upon systematic diversification plan with projected timeline and tax implications.", date: "2026-01-21", duration: 10 },
    { advisorId: advisor.id, clientId: james.id, type: "call", subject: "Market Update Check-In", description: "Quick call about tech sector volatility. James comfortable holding current positions. Reminded him of Q2 vesting coming up.", date: "2026-02-15", duration: 12 },
    { advisorId: advisor.id, clientId: james.id, type: "call", subject: "Q3 Portfolio Update", description: "Discussed Q3 tech sector performance and upcoming vesting schedule.", date: "2025-10-05", duration: 15 },
    { advisorId: advisor.id, clientId: james.id, type: "email", subject: "Year-End Tax Strategy", description: "Sent year-end capital gains summary and recommended tax-loss harvesting on ARKK position.", date: "2025-11-28", duration: 10 },
    { advisorId: advisor.id, clientId: james.id, type: "meeting", subject: "Year-End Review", description: "Annual review covering concentrated position strategy, 2026 planning, and 529 contribution targets.", date: "2025-12-10", duration: 60 },
    { advisorId: advisor.id, clientId: lisa.id, type: "meeting", subject: "529 Plan Review", description: "Reviewed 529 contributions and age-based allocation for eldest child. On track for 2030 college start. Discussed increasing monthly contributions.", date: "2026-02-05", duration: 30 },
    { advisorId: advisor.id, clientId: priya.id, type: "call", subject: "New Baby Congratulations", description: "Called to congratulate on baby Aria's birth. Discussed initial planning needs: 529, life insurance, beneficiary updates.", date: "2026-01-15", duration: 25 },
    { advisorId: advisor.id, clientId: priya.id, type: "meeting", subject: "Post-Baby Financial Review", description: "Comprehensive review of financial plan changes needed after baby. Discussed 529 setup, life insurance ($2M term recommendation), estate planning basics.", date: "2026-02-10", duration: 60 },
    { advisorId: advisor.id, clientId: priya.id, type: "email", subject: "Life Insurance Application Follow-Up", description: "Sent Northwestern Mutual application status update. Underwriting in progress. Expected decision within 2 weeks.", date: "2026-02-28", duration: 10 },
    { advisorId: advisor.id, clientId: priya.id, type: "call", subject: "Practice Buy-In Discussion", description: "Priya called to discuss potential practice buy-in at Emory Healthcare. Estimated cost $400K. Discussed financing options and impact on retirement savings.", date: "2026-03-01", duration: 30 },
  ];

  for (const a of activitiesData) {
    await db.insert(activities).values(a);
  }

  const docsData = [
    { clientId: robert.id, name: "Henderson Family Trust Agreement", type: "Trust Document", status: "signed", uploadDate: "2024-06-15" },
    { clientId: robert.id, name: "Investment Policy Statement - Henderson", type: "IPS", status: "signed", uploadDate: "2025-06-01", expirationDate: "2026-06-01" },
    { clientId: robert.id, name: "Estate Plan Summary", type: "Estate", status: "needs_update", uploadDate: "2023-01-15" },
    { clientId: robert.id, name: "Henderson Power of Attorney", type: "Legal", status: "signed", uploadDate: "2024-06-15" },
    { clientId: robert.id, name: "Robert Henderson Will", type: "Estate", status: "signed", uploadDate: "2024-06-15" },
    { clientId: margaret.id, name: "Margaret Henderson Will", type: "Estate", status: "signed", uploadDate: "2024-06-15" },
    { clientId: margaret.id, name: "Henderson Charitable Giving Plan", type: "Planning", status: "draft", uploadDate: "2026-02-25" },
    { clientId: james.id, name: "RSU Diversification Agreement", type: "Agreement", status: "signed", uploadDate: "2026-01-20" },
    { clientId: james.id, name: "Risk Tolerance Questionnaire - Chen", type: "Suitability", status: "signed", uploadDate: "2025-04-15", expirationDate: "2026-04-15" },
    { clientId: james.id, name: "TechCorp RSU Vesting Schedule", type: "Employment", status: "signed", uploadDate: "2025-06-01" },
    { clientId: james.id, name: "Investment Policy Statement - Chen", type: "IPS", status: "signed", uploadDate: "2025-04-15", expirationDate: "2026-04-15" },
    { clientId: lisa.id, name: "529 Plan Application - Chen Children", type: "Account Form", status: "signed", uploadDate: "2023-09-01" },
    { clientId: lisa.id, name: "Lisa Chen Risk Questionnaire", type: "Suitability", status: "signed", uploadDate: "2025-04-15", expirationDate: "2026-04-15" },
    { clientId: priya.id, name: "New Account Application - 529", type: "Account Form", status: "draft", uploadDate: "2026-03-01" },
    { clientId: priya.id, name: "Life Insurance Application - Patel", type: "Insurance", status: "pending_signature", uploadDate: "2026-02-15" },
    { clientId: priya.id, name: "Risk Tolerance Questionnaire - Patel", type: "Suitability", status: "signed", uploadDate: "2025-12-01", expirationDate: "2026-12-01" },
    { clientId: priya.id, name: "Investment Policy Statement - Patel", type: "IPS", status: "signed", uploadDate: "2025-12-01", expirationDate: "2026-12-01" },
    { clientId: priya.id, name: "Beneficiary Designation Update Form", type: "Account Form", status: "pending_signature", uploadDate: "2026-02-15" },
  ];

  for (const d of docsData) {
    const sample = sampleDocuments[d.name];
    await db.insert(documents).values({
      ...d,
      ...(sample ? { fileName: sample.fileName, fileContent: sample.fileContent } : {}),
    });
  }

  const complianceData = [
    { clientId: robert.id, advisorId: advisor.id, type: "Risk Profile Review", status: "current", dueDate: "2026-06-01", description: "Annual risk tolerance assessment - Henderson, Robert", completedDate: "2025-06-01" },
    { clientId: robert.id, advisorId: advisor.id, type: "IPS Review", status: "current", dueDate: "2026-06-01", description: "Investment Policy Statement annual review", completedDate: "2025-06-01" },
    { clientId: robert.id, advisorId: advisor.id, type: "Estate Plan Review", status: "expiring_soon", dueDate: "2026-03-31", description: "Estate plan requires update due to tax law changes", completedDate: "2024-06-15" },
    { clientId: james.id, advisorId: advisor.id, type: "Risk Profile Review", status: "expiring_soon", dueDate: "2026-04-15", description: "Annual risk tolerance assessment - Chen, James", completedDate: "2025-04-15" },
    { clientId: james.id, advisorId: advisor.id, type: "Suitability Review", status: "current", dueDate: "2026-07-01", description: "Suitability review for concentrated position strategy", completedDate: "2025-07-01" },
    { clientId: james.id, advisorId: advisor.id, type: "Concentrated Position Documentation", status: "pending", dueDate: "2026-03-31", description: "Document suitability rationale for TechCorp concentration >20%" },
    { clientId: lisa.id, advisorId: advisor.id, type: "Risk Profile Review", status: "expiring_soon", dueDate: "2026-04-15", description: "Annual risk tolerance assessment - Chen, Lisa", completedDate: "2025-04-15" },
    { clientId: priya.id, advisorId: advisor.id, type: "Risk Profile Review", status: "current", dueDate: "2026-12-01", description: "Risk assessment - Patel, Priya", completedDate: "2025-12-01" },
  ];

  for (const c of complianceData) {
    await db.insert(complianceItems).values(c);
  }

  const lifeEventsData = [
    { clientId: robert.id, eventType: "retirement", eventDate: "2018-06-01", description: "Robert retired as CEO of Henderson Industries" },
    { clientId: robert.id, eventType: "anniversary", eventDate: "2026-08-20", description: "40th wedding anniversary" },
    { clientId: robert.id, eventType: "birthday", eventDate: "2026-03-15", description: "Robert turns 68" },
    { clientId: margaret.id, eventType: "birthday", eventDate: "2026-07-22", description: "Margaret turns 66" },
    { clientId: margaret.id, eventType: "philanthropy", eventDate: "2026-04-01", description: "Margaret joining Atlanta Community Foundation board of directors" },
    { clientId: james.id, eventType: "vesting", eventDate: "2026-05-01", description: "RSU vesting - approximately 2,000 shares TechCorp (estimated value $370K)" },
    { clientId: james.id, eventType: "education", eventDate: "2030-09-01", description: "Eldest child (Emma) starts college - target school: Georgia Tech" },
    { clientId: james.id, eventType: "career", eventDate: "2026-09-01", description: "TechCorp IPO rumored - potential liquidity event for equity compensation" },
    { clientId: lisa.id, eventType: "education", eventDate: "2032-09-01", description: "Second child (Ryan) starts college" },
    { clientId: priya.id, eventType: "birth", eventDate: "2026-01-12", description: "Baby daughter born - Aria Patel" },
    { clientId: priya.id, eventType: "career", eventDate: "2026-06-01", description: "Considering practice buy-in at Emory Healthcare ($400K estimated cost)" },
    { clientId: priya.id, eventType: "birthday", eventDate: "2026-12-05", description: "Priya turns 44" },
  ];

  for (const le of lifeEventsData) {
    await db.insert(lifeEvents).values(le);
  }

  const existingCategories = await db.select().from(triggerCategories);
  if (existingCategories.length === 0) {
    const triggerCategorySeedData = [
      {
        name: "Retirement",
        description: "Client approaching or entering retirement",
        defaultActions: [
          { actionType: "refresh_profile", description: "Re-assess risk tolerance for income phase" },
          { actionType: "create_task", taskTitle: "Review retirement income plan", taskDescription: "Update withdrawal strategy and income projections", dueDays: 14, taskPriority: "high" },
          { actionType: "flag_review", description: "Compliance review for distribution suitability" },
          { actionType: "create_reminder", remindDays: 30, description: "Follow up on retirement transition" },
        ],
      },
      {
        name: "Divorce",
        description: "Client undergoing divorce proceedings",
        defaultActions: [
          { actionType: "refresh_profile", description: "Re-assess financial situation post-divorce" },
          { actionType: "create_task", taskTitle: "Review beneficiary designations", taskDescription: "Update all account beneficiaries and estate documents", dueDays: 7, taskPriority: "high" },
          { actionType: "create_task", taskTitle: "Asset division analysis", taskDescription: "Prepare analysis of assets subject to division", dueDays: 14, taskPriority: "high" },
          { actionType: "flag_review", description: "Review account ownership changes" },
        ],
      },
      {
        name: "Birth",
        description: "Client has a new child or grandchild",
        defaultActions: [
          { actionType: "create_task", taskTitle: "Review life insurance coverage", taskDescription: "Assess adequacy of life insurance with new dependent", dueDays: 30, taskPriority: "medium" },
          { actionType: "create_task", taskTitle: "Discuss education savings", taskDescription: "Present 529 plan or education savings options", dueDays: 30, taskPriority: "medium" },
          { actionType: "create_task", taskTitle: "Update estate plan", taskDescription: "Review guardianship and beneficiary designations", dueDays: 60, taskPriority: "medium" },
        ],
      },
      {
        name: "Marriage",
        description: "Client getting married",
        defaultActions: [
          { actionType: "refresh_profile", description: "Update profile for combined household" },
          { actionType: "create_task", taskTitle: "Review beneficiary designations", taskDescription: "Update beneficiaries across all accounts", dueDays: 30, taskPriority: "high" },
          { actionType: "create_task", taskTitle: "Joint financial planning", taskDescription: "Schedule meeting to discuss combined financial strategy", dueDays: 14, taskPriority: "medium" },
          { actionType: "flag_review", description: "Review account titling and ownership" },
        ],
      },
      {
        name: "Job Change",
        description: "Client changing employers or career",
        defaultActions: [
          { actionType: "create_task", taskTitle: "401(k) rollover analysis", taskDescription: "Evaluate rollover options for previous employer plan", dueDays: 14, taskPriority: "high" },
          { actionType: "create_task", taskTitle: "Review benefits package", taskDescription: "Analyze new employer benefits and identify gaps", dueDays: 30, taskPriority: "medium" },
          { actionType: "refresh_profile", description: "Update income and employment details" },
        ],
      },
      {
        name: "Inheritance",
        description: "Client receiving an inheritance",
        defaultActions: [
          { actionType: "refresh_profile", description: "Update asset levels and risk capacity" },
          { actionType: "create_task", taskTitle: "Inheritance investment plan", taskDescription: "Develop plan for integrating inherited assets", dueDays: 14, taskPriority: "high" },
          { actionType: "create_task", taskTitle: "Tax implications review", taskDescription: "Assess estate tax, step-up basis, and income tax impact", dueDays: 7, taskPriority: "high" },
          { actionType: "flag_review", description: "Suitability review for new asset allocation" },
        ],
      },
      {
        name: "Death",
        description: "Death of client family member or dependent",
        defaultActions: [
          { actionType: "create_task", taskTitle: "Review beneficiary designations", taskDescription: "Update all beneficiary designations across accounts", dueDays: 7, taskPriority: "high" },
          { actionType: "create_task", taskTitle: "Estate settlement support", taskDescription: "Assist with estate documentation and asset transfer", dueDays: 14, taskPriority: "high" },
          { actionType: "refresh_profile", description: "Update financial profile for changed circumstances" },
          { actionType: "flag_review", description: "Review estate plan and account ownership" },
        ],
      },
      {
        name: "Illness",
        description: "Client or family member diagnosed with serious illness",
        defaultActions: [
          { actionType: "create_task", taskTitle: "Review insurance coverage", taskDescription: "Assess health, disability, and long-term care coverage adequacy", dueDays: 7, taskPriority: "high" },
          { actionType: "create_task", taskTitle: "Emergency fund assessment", taskDescription: "Evaluate liquid reserves against potential medical costs", dueDays: 7, taskPriority: "high" },
          { actionType: "create_task", taskTitle: "Review estate documents", taskDescription: "Ensure healthcare directive and POA are current", dueDays: 14, taskPriority: "high" },
          { actionType: "create_reminder", remindDays: 30, description: "Follow up on health situation and financial impact" },
        ],
      },
      {
        name: "Relocation",
        description: "Client moving to a new state or country",
        defaultActions: [
          { actionType: "create_task", taskTitle: "State tax analysis", taskDescription: "Analyze tax implications of relocation", dueDays: 14, taskPriority: "medium" },
          { actionType: "create_task", taskTitle: "Update estate plan for new state", taskDescription: "Review state-specific estate planning requirements", dueDays: 30, taskPriority: "medium" },
          { actionType: "refresh_profile", description: "Update address and state-specific information" },
        ],
      },
    ];

    for (const cat of triggerCategorySeedData) {
      await db.insert(triggerCategories).values(cat);
    }
  }

  const existingReportTemplates = await db.select().from(reportTemplates);
  if (existingReportTemplates.length === 0) {
    const reportTemplateSeedData = [
      {
        name: "Client Summary",
        description: "Comprehensive client overview with AUM, performance, accounts, and open tasks",
        templateType: "client_summary",
        advisorId: advisor.id,
        sections: [
          { id: "aum_section", title: "Assets Under Management", dataSource: "clients.aum", formatRules: { chartType: "pie", currencyFormat: true }, order: 1, isVisible: true },
          { id: "performance_section", title: "Portfolio Performance", dataSource: "clients.performance", formatRules: { percentFormat: true }, order: 2, isVisible: true },
          { id: "accounts_section", title: "Account Details", dataSource: "accounts.list", formatRules: { currencyFormat: true, sortBy: "balance_desc" }, order: 3, isVisible: true },
          { id: "tasks_section", title: "Open Action Items", dataSource: "tasks.open", formatRules: {}, order: 4, isVisible: true },
        ],
      },
      {
        name: "Retirement Planning Review",
        description: "Retirement-focused review with asset allocation and investor profile",
        templateType: "retirement_planning",
        advisorId: advisor.id,
        sections: [
          { id: "aum_section", title: "Total Assets", dataSource: "clients.aum", formatRules: { currencyFormat: true }, order: 1, isVisible: true },
          { id: "performance_section", title: "Investment Performance", dataSource: "clients.performance", formatRules: { percentFormat: true }, order: 2, isVisible: true },
          { id: "allocation_section", title: "Asset Allocation", dataSource: "holdings.allocation", formatRules: { chartType: "pie" }, order: 3, isVisible: true },
          { id: "profile_section", title: "Investor Profile", dataSource: "investorProfiles.latest", formatRules: {}, order: 4, isVisible: true },
        ],
      },
      {
        name: "Meeting Recap",
        description: "Post-meeting summary with recent activities, open tasks, and upcoming meetings",
        templateType: "meeting_recap",
        advisorId: advisor.id,
        sections: [
          { id: "activities_section", title: "Recent Activities", dataSource: "activities.recent", formatRules: {}, order: 1, isVisible: true },
          { id: "tasks_section", title: "Open Tasks", dataSource: "tasks.open", formatRules: {}, order: 2, isVisible: true },
          { id: "meetings_section", title: "Upcoming Meetings", dataSource: "meetings.upcoming", formatRules: {}, order: 3, isVisible: true },
        ],
      },
      {
        name: "Compliance Status Report",
        description: "Overview of compliance item statuses and outstanding tasks",
        templateType: "planning_review",
        advisorId: advisor.id,
        sections: [
          { id: "compliance_section", title: "Compliance Status", dataSource: "complianceItems.status", formatRules: {}, order: 1, isVisible: true },
          { id: "tasks_section", title: "Outstanding Tasks", dataSource: "tasks.open", formatRules: {}, order: 2, isVisible: true },
        ],
      },
    ];

    for (const tmpl of reportTemplateSeedData) {
      await db.insert(reportTemplates).values(tmpl);
    }
  }

  await seedChecklistForClient(robert.id, "Robert", "Henderson", [
    { category: "Identity & KYC", documentName: "Government-Issued Photo ID", description: "Driver's license or passport copy for identity verification", required: true, received: true, receivedDate: "2024-01-15", sortOrder: 1 },
    { category: "Identity & KYC", documentName: "Social Security Verification", description: "SSN card or W-9 form for tax identification", required: true, received: true, receivedDate: "2024-01-15", sortOrder: 2 },
    { category: "Identity & KYC", documentName: "Proof of Address", description: "Utility bill or bank statement showing current address", required: true, received: true, receivedDate: "2024-01-15", sortOrder: 3 },
    { category: "Financial Statements", documentName: "Bank Account Statements", description: "Recent statements from checking and savings accounts (last 3 months)", required: true, received: true, receivedDate: "2026-02-28", notes: "Bank of America checking and savings", sortOrder: 10 },
    { category: "Financial Statements", documentName: "Brokerage Account Statements", description: "Current brokerage/investment account statements", required: true, received: true, receivedDate: "2026-02-28", notes: "Charles Schwab Individual ORN-001-4521", sortOrder: 11 },
    { category: "Financial Statements", documentName: "Retirement Account Statements", description: "401(k), IRA, Roth IRA, pension statements", required: true, received: true, receivedDate: "2026-02-28", notes: "Charles Schwab Traditional IRA ORN-001-4522", sortOrder: 12 },
    { category: "Financial Statements", documentName: "Mortgage/Loan Statements", description: "Current mortgage, auto loan, student loan, or other debt statements", required: false, received: true, receivedDate: "2024-06-15", notes: "No outstanding mortgages or loans - debt free", sortOrder: 13 },
    { category: "Financial Statements", documentName: "Credit Card Statements", description: "Recent credit card statements showing balances", required: false, received: false, sortOrder: 14 },
    { category: "Tax Documents", documentName: "Federal Tax Returns (Last 2 Years)", description: "Complete federal tax returns including all schedules", required: true, received: true, receivedDate: "2026-02-15", notes: "2024 and 2025 returns on file", sortOrder: 20 },
    { category: "Tax Documents", documentName: "State Tax Returns (Last 2 Years)", description: "State income tax returns", required: true, received: true, receivedDate: "2026-02-15", notes: "Georgia state returns for 2024 and 2025", sortOrder: 21 },
    { category: "Tax Documents", documentName: "W-2 / 1099 Forms", description: "Current year income documentation from all sources", required: true, received: true, receivedDate: "2026-01-31", notes: "1099-INT, 1099-DIV, 1099-R received", sortOrder: 22 },
    { category: "Tax Documents", documentName: "K-1 Forms", description: "Partnership or S-Corp income forms, if applicable", required: false, received: false, notes: "N/A - no partnership interests", sortOrder: 23 },
    { category: "Insurance", documentName: "Life Insurance Policies", description: "All life insurance policy declarations and beneficiary information", required: true, received: true, receivedDate: "2025-06-15", notes: "Northwestern Mutual NM-2845791 and NM-2845792", sortOrder: 30 },
    { category: "Insurance", documentName: "Health Insurance Coverage", description: "Current health insurance plan details", required: false, received: true, receivedDate: "2025-01-15", notes: "Medicare Parts A & B plus Medigap Plan G", sortOrder: 31 },
    { category: "Insurance", documentName: "Long-Term Care Insurance", description: "LTC policy details, if applicable", required: false, received: true, receivedDate: "2025-06-15", notes: "Covered under NW Mutual life policy LTC rider", sortOrder: 33 },
    { category: "Insurance", documentName: "Property & Casualty Insurance", description: "Homeowners, auto, umbrella policy declarations", required: false, received: true, receivedDate: "2025-06-15", notes: "State Farm - home, auto, $2M umbrella", sortOrder: 34 },
    { category: "Estate Planning", documentName: "Will / Last Testament", description: "Current signed will or testament", required: true, received: true, receivedDate: "2024-06-15", notes: "Pour-over will dated June 15, 2024", sortOrder: 40 },
    { category: "Estate Planning", documentName: "Trust Documents", description: "Revocable or irrevocable trust agreements", required: false, received: true, receivedDate: "2024-06-15", notes: "Henderson Family Revocable Living Trust", sortOrder: 41 },
    { category: "Estate Planning", documentName: "Power of Attorney", description: "Financial and healthcare power of attorney documents", required: true, received: true, receivedDate: "2024-06-15", notes: "Both financial and healthcare POA on file", sortOrder: 42 },
    { category: "Estate Planning", documentName: "Healthcare Directive", description: "Living will or advance healthcare directive", required: true, received: true, receivedDate: "2024-06-15", sortOrder: 43 },
    { category: "Estate Planning", documentName: "Beneficiary Designations", description: "Current beneficiary forms for all accounts and policies", required: true, received: true, receivedDate: "2024-06-15", notes: "All accounts: Primary - Margaret, Contingent - Henderson Family Trust", sortOrder: 44 },
    { category: "Planning & Suitability", documentName: "Risk Tolerance Questionnaire", description: "Completed risk assessment questionnaire", required: true, received: true, receivedDate: "2025-06-01", notes: "Score: 53/70 - Moderate-Aggressive", sortOrder: 60 },
    { category: "Planning & Suitability", documentName: "Investment Policy Statement", description: "Signed IPS outlining investment objectives and constraints", required: true, received: true, receivedDate: "2025-06-01", notes: "IPS signed and on file", sortOrder: 61 },
    { category: "Planning & Suitability", documentName: "Financial Goals Worksheet", description: "Documented short-term and long-term financial goals", required: true, received: true, receivedDate: "2025-06-01", sortOrder: 62 },
    { category: "Planning & Suitability", documentName: "Client Advisory Agreement", description: "Signed advisory/engagement agreement", required: true, received: true, receivedDate: "2024-01-15", notes: "0.75% AUM fee schedule", sortOrder: 63 },
  ]);

  await seedChecklistForClient(james.id, "James", "Chen", [
    { category: "Identity & KYC", documentName: "Government-Issued Photo ID", description: "Driver's license or passport copy for identity verification", required: true, received: true, receivedDate: "2022-06-01", sortOrder: 1 },
    { category: "Identity & KYC", documentName: "Social Security Verification", description: "SSN card or W-9 form for tax identification", required: true, received: true, receivedDate: "2022-06-01", sortOrder: 2 },
    { category: "Identity & KYC", documentName: "Proof of Address", description: "Utility bill or bank statement showing current address", required: true, received: true, receivedDate: "2022-06-01", sortOrder: 3 },
    { category: "Financial Statements", documentName: "Bank Account Statements", description: "Recent statements from checking and savings accounts (last 3 months)", required: true, received: true, receivedDate: "2026-01-15", notes: "Chase checking and savings", sortOrder: 10 },
    { category: "Financial Statements", documentName: "Brokerage Account Statements", description: "Current brokerage/investment account statements", required: true, received: true, receivedDate: "2026-01-15", notes: "Fidelity Individual ORN-002-7801", sortOrder: 11 },
    { category: "Financial Statements", documentName: "Retirement Account Statements", description: "401(k), IRA, Roth IRA, pension statements", required: true, received: true, receivedDate: "2026-01-15", notes: "Fidelity 401(k) Rollover ORN-002-7802", sortOrder: 12 },
    { category: "Financial Statements", documentName: "Stock Option/RSU Statements", description: "Current equity compensation statements and vesting schedules", required: true, received: true, receivedDate: "2026-01-20", notes: "TechCorp RSU vesting schedule - next vest Q2 2026", sortOrder: 13 },
    { category: "Tax Documents", documentName: "Federal Tax Returns (Last 2 Years)", description: "Complete federal tax returns including all schedules", required: true, received: true, receivedDate: "2026-02-01", notes: "2024 and 2025 returns on file", sortOrder: 20 },
    { category: "Tax Documents", documentName: "State Tax Returns (Last 2 Years)", description: "State income tax returns", required: true, received: true, receivedDate: "2026-02-01", notes: "Georgia state returns", sortOrder: 21 },
    { category: "Tax Documents", documentName: "W-2 / 1099 Forms", description: "Current year income documentation from all sources", required: true, received: true, receivedDate: "2026-01-31", notes: "W-2 from TechCorp, 1099-DIV, 1099-B", sortOrder: 22 },
    { category: "Insurance", documentName: "Life Insurance Policies", description: "All life insurance policy declarations and beneficiary information", required: true, received: true, receivedDate: "2025-06-01", notes: "TechCorp group life + personal $1M term policy", sortOrder: 30 },
    { category: "Insurance", documentName: "Health Insurance Coverage", description: "Current health insurance plan details", required: false, received: true, receivedDate: "2025-01-15", notes: "TechCorp employer plan - family coverage", sortOrder: 31 },
    { category: "Insurance", documentName: "Disability Insurance", description: "Short-term and long-term disability coverage details", required: false, received: true, receivedDate: "2025-06-01", notes: "TechCorp group LTD - 60% of salary", sortOrder: 32 },
    { category: "Estate Planning", documentName: "Will / Last Testament", description: "Current signed will or testament", required: true, received: true, receivedDate: "2023-03-15", sortOrder: 40 },
    { category: "Estate Planning", documentName: "Beneficiary Designations", description: "Current beneficiary forms for all accounts and policies", required: true, received: true, receivedDate: "2023-03-15", notes: "Primary - Lisa Chen, Contingent - Children's trust", sortOrder: 44 },
    { category: "Planning & Suitability", documentName: "Risk Tolerance Questionnaire", description: "Completed risk assessment questionnaire", required: true, received: true, receivedDate: "2025-04-15", notes: "Score: 62/70 - Aggressive", sortOrder: 60 },
    { category: "Planning & Suitability", documentName: "Investment Policy Statement", description: "Signed IPS outlining investment objectives and constraints", required: true, received: true, receivedDate: "2025-04-15", notes: "Growth-oriented IPS with concentrated position addendum", sortOrder: 61 },
    { category: "Planning & Suitability", documentName: "Client Advisory Agreement", description: "Signed advisory/engagement agreement", required: true, received: true, receivedDate: "2022-06-01", notes: "0.85% AUM fee schedule", sortOrder: 63 },
    { category: "Employment & Income", documentName: "RSU Vesting Schedule", description: "Current RSU/stock option vesting schedule from employer", required: true, received: true, receivedDate: "2026-01-20", notes: "Q2 2026: ~2,000 shares, Q4 2026: ~1,500 shares", sortOrder: 50 },
    { category: "Employment & Income", documentName: "Employment Agreement", description: "Current employment contract or offer letter", required: false, received: true, receivedDate: "2022-06-01", notes: "CTO agreement with TechCorp Solutions", sortOrder: 51 },
  ]);

  await seedChecklistForClient(priya.id, "Priya", "Patel", [
    { category: "Identity & KYC", documentName: "Government-Issued Photo ID", description: "Driver's license or passport copy for identity verification", required: true, received: true, receivedDate: "2024-08-01", sortOrder: 1 },
    { category: "Identity & KYC", documentName: "Social Security Verification", description: "SSN card or W-9 form for tax identification", required: true, received: true, receivedDate: "2024-08-01", sortOrder: 2 },
    { category: "Identity & KYC", documentName: "Proof of Address", description: "Utility bill or bank statement showing current address", required: true, received: true, receivedDate: "2024-08-01", sortOrder: 3 },
    { category: "Financial Statements", documentName: "Bank Account Statements", description: "Recent statements from checking and savings accounts (last 3 months)", required: true, received: true, receivedDate: "2026-02-01", notes: "Wells Fargo checking and savings", sortOrder: 10 },
    { category: "Financial Statements", documentName: "Brokerage Account Statements", description: "Current brokerage/investment account statements", required: true, received: true, receivedDate: "2026-02-01", notes: "Charles Schwab Individual ORN-003-5501", sortOrder: 11 },
    { category: "Financial Statements", documentName: "Retirement Account Statements", description: "401(k), IRA, Roth IRA, pension statements", required: true, received: true, receivedDate: "2026-02-01", notes: "Schwab Roth IRA ORN-003-5502, SEP IRA ORN-003-5503", sortOrder: 12 },
    { category: "Financial Statements", documentName: "Mortgage/Loan Statements", description: "Current mortgage, auto loan, student loan, or other debt statements", required: false, received: true, receivedDate: "2025-12-01", notes: "Mortgage: $320K remaining on $525K home (Wells Fargo). Student loans: $45K remaining (SoFi refinanced).", sortOrder: 13 },
    { category: "Tax Documents", documentName: "Federal Tax Returns (Last 2 Years)", description: "Complete federal tax returns including all schedules", required: true, received: true, receivedDate: "2026-02-15", notes: "2024 and 2025 returns on file", sortOrder: 20 },
    { category: "Tax Documents", documentName: "State Tax Returns (Last 2 Years)", description: "State income tax returns", required: true, received: true, receivedDate: "2026-02-15", notes: "Georgia state returns", sortOrder: 21 },
    { category: "Tax Documents", documentName: "W-2 / 1099 Forms", description: "Current year income documentation from all sources", required: true, received: true, receivedDate: "2026-01-31", notes: "W-2 from Emory Healthcare, 1099-MISC for consulting income", sortOrder: 22 },
    { category: "Insurance", documentName: "Life Insurance Policies", description: "All life insurance policy declarations and beneficiary information", required: true, received: false, notes: "APPLICATION PENDING - $2M 20-year term with Northwestern Mutual. Currently only employer group life ($500K).", sortOrder: 30 },
    { category: "Insurance", documentName: "Health Insurance Coverage", description: "Current health insurance plan details", required: false, received: true, receivedDate: "2025-01-15", notes: "Emory Healthcare employer plan - family coverage (added baby Aria)", sortOrder: 31 },
    { category: "Insurance", documentName: "Disability Insurance", description: "Short-term and long-term disability coverage details", required: false, received: true, receivedDate: "2025-06-01", notes: "Emory group LTD - 60% of salary up to $15K/month. Also has personal own-occupation policy.", sortOrder: 32 },
    { category: "Insurance", documentName: "Malpractice Insurance", description: "Professional liability insurance for medical practice", required: false, received: true, receivedDate: "2025-06-01", notes: "Emory Healthcare provides coverage through EMORY RISK MANAGEMENT", sortOrder: 35 },
    { category: "Estate Planning", documentName: "Will / Last Testament", description: "Current signed will or testament", required: true, received: false, notes: "NEEDS CREATION - No current will. Referred to estate attorney following birth of Aria.", sortOrder: 40 },
    { category: "Estate Planning", documentName: "Beneficiary Designations", description: "Current beneficiary forms for all accounts and policies", required: true, received: false, notes: "NEEDS UPDATE - Current beneficiary is estate. Needs to add husband Ravi and daughter Aria.", sortOrder: 44 },
    { category: "Planning & Suitability", documentName: "Risk Tolerance Questionnaire", description: "Completed risk assessment questionnaire", required: true, received: true, receivedDate: "2025-12-01", notes: "Score: 42/70 - Moderate-Conservative", sortOrder: 60 },
    { category: "Planning & Suitability", documentName: "Investment Policy Statement", description: "Signed IPS outlining investment objectives and constraints", required: true, received: true, receivedDate: "2025-12-01", notes: "Conservative growth IPS", sortOrder: 61 },
    { category: "Planning & Suitability", documentName: "Financial Goals Worksheet", description: "Documented short-term and long-term financial goals", required: true, received: true, receivedDate: "2025-12-01", notes: "Goals: education funding, practice buy-in, retirement by 62", sortOrder: 62 },
    { category: "Planning & Suitability", documentName: "Client Advisory Agreement", description: "Signed advisory/engagement agreement", required: true, received: true, receivedDate: "2024-08-01", notes: "0.90% AUM fee schedule", sortOrder: 63 },
    { category: "Employment & Income", documentName: "Employment Contract", description: "Current employment contract or offer letter", required: false, received: true, receivedDate: "2024-08-01", notes: "Emory Healthcare cardiologist - base salary + productivity bonus", sortOrder: 50 },
    { category: "Employment & Income", documentName: "Practice Buy-In Prospectus", description: "Details of potential practice ownership opportunity", required: false, received: false, notes: "PENDING - Priya is reviewing practice buy-in opportunity. Expected to receive prospectus Q2 2026.", sortOrder: 51 },
  ]);

  const workflowTemplateData = [
    {
      advisorId: advisor.id,
      name: "New Client Onboarding",
      description: "Standard onboarding process for new wealth management clients",
      category: "onboarding",
      steps: [
        { stepNumber: 1, title: "Initial Discovery Meeting", description: "Conduct comprehensive intake meeting to understand goals, risk tolerance, and financial situation" },
        { stepNumber: 2, title: "Collect KYC Documents", description: "Gather government ID, Social Security verification, and proof of address" },
        { stepNumber: 3, title: "Gather Financial Statements", description: "Collect bank statements, brokerage statements, retirement account statements, and tax returns" },
        { stepNumber: 4, title: "Risk Assessment Questionnaire", description: "Complete risk tolerance questionnaire and document investment objectives" },
        { stepNumber: 5, title: "Open Custodial Accounts", description: "Set up investment accounts at custodian (Fidelity/Schwab) and complete account applications" },
        { stepNumber: 6, title: "Initiate Asset Transfers", description: "Submit ACAT transfers and track incoming assets from prior custodians" },
        { stepNumber: 7, title: "Develop Financial Plan", description: "Create comprehensive financial plan including retirement projections, tax planning, and estate considerations" },
        { stepNumber: 8, title: "Investment Policy Statement", description: "Draft and have client sign the Investment Policy Statement (IPS)" },
        { stepNumber: 9, title: "Implement Portfolio", description: "Allocate and invest assets according to approved IPS and model portfolio" },
        { stepNumber: 10, title: "Schedule First Review", description: "Schedule 90-day review meeting and set up ongoing communication cadence" },
      ],
    },
    {
      advisorId: advisor.id,
      name: "Annual Review",
      description: "Annual comprehensive portfolio and financial plan review process",
      category: "review",
      steps: [
        { stepNumber: 1, title: "Prepare Review Materials", description: "Generate performance reports, account summaries, and plan vs. actual comparison" },
        { stepNumber: 2, title: "Review Life Changes", description: "Document any changes in employment, family, health, or financial goals since last review" },
        { stepNumber: 3, title: "Portfolio Performance Review", description: "Analyze returns vs. benchmarks, review asset allocation drift, and assess risk exposure" },
        { stepNumber: 4, title: "Tax Planning Review", description: "Review tax-loss harvesting opportunities, RMD status, and Roth conversion strategies" },
        { stepNumber: 5, title: "Insurance Coverage Review", description: "Evaluate life, disability, long-term care, and liability insurance adequacy" },
        { stepNumber: 6, title: "Estate Plan Review", description: "Confirm beneficiary designations, review trust documents, and check estate plan alignment" },
        { stepNumber: 7, title: "Rebalance Portfolio", description: "Execute rebalancing trades to realign with target allocation if needed" },
        { stepNumber: 8, title: "Update Financial Plan", description: "Refresh financial plan projections with updated data and assumptions" },
        { stepNumber: 9, title: "Document Meeting Notes", description: "Record key discussion points, decisions made, and action items" },
        { stepNumber: 10, title: "Send Follow-Up Summary", description: "Email client with meeting summary, updated plan, and next steps" },
      ],
    },
    {
      advisorId: advisor.id,
      name: "Life Event Response",
      description: "Process for handling significant client life events that impact financial planning",
      category: "planning",
      steps: [
        { stepNumber: 1, title: "Assess Situation", description: "Meet with client to understand the life event and its immediate financial implications" },
        { stepNumber: 2, title: "Review Current Plan Impact", description: "Analyze how the event affects existing financial plan assumptions and projections" },
        { stepNumber: 3, title: "Update Risk Profile", description: "Reassess risk tolerance and investment timeline changes resulting from the event" },
        { stepNumber: 4, title: "Review Insurance Needs", description: "Evaluate changes needed to insurance coverage (life, health, disability, property)" },
        { stepNumber: 5, title: "Update Beneficiaries", description: "Review and update beneficiary designations across all accounts and policies" },
        { stepNumber: 6, title: "Adjust Portfolio Strategy", description: "Modify investment allocation and strategy based on updated goals and timeline" },
        { stepNumber: 7, title: "Update Estate Documents", description: "Coordinate with estate attorney to update wills, trusts, and powers of attorney" },
        { stepNumber: 8, title: "Revised Financial Plan", description: "Generate updated financial plan with new projections and recommendations" },
      ],
    },
    {
      advisorId: advisor.id,
      name: "Account Transfer (ACAT)",
      description: "Process for transferring accounts from external custodians",
      category: "operations",
      steps: [
        { stepNumber: 1, title: "Gather Transfer Details", description: "Collect account statements and identify assets to transfer from delivering firm" },
        { stepNumber: 2, title: "Review Non-Transferable Assets", description: "Identify proprietary funds, illiquid positions, or assets that cannot be transferred in-kind" },
        { stepNumber: 3, title: "Complete Transfer Forms", description: "Fill out ACAT transfer initiation paperwork with client signatures" },
        { stepNumber: 4, title: "Submit Transfer Request", description: "Submit transfer request to receiving custodian and confirm receipt" },
        { stepNumber: 5, title: "Monitor Transfer Progress", description: "Track transfer status and resolve any rejections or partial transfers" },
        { stepNumber: 6, title: "Verify Received Assets", description: "Confirm all expected assets arrived and reconcile with original statements" },
        { stepNumber: 7, title: "Reallocate to Model", description: "Sell transferred positions as needed and invest according to target allocation" },
      ],
    },
    {
      advisorId: advisor.id,
      name: "Compliance Review",
      description: "Periodic compliance audit and documentation review",
      category: "compliance",
      steps: [
        { stepNumber: 1, title: "Verify Client Information", description: "Confirm client contact info, employment status, and financial details are current" },
        { stepNumber: 2, title: "Review Suitability", description: "Validate that current portfolio aligns with documented risk tolerance and objectives" },
        { stepNumber: 3, title: "Check Regulatory Filings", description: "Ensure all required regulatory disclosures and filings are up to date" },
        { stepNumber: 4, title: "Audit Communication Records", description: "Review client correspondence logs for completeness and compliance" },
        { stepNumber: 5, title: "Update ADV Delivery", description: "Confirm annual ADV Part 2 delivery and obtain client acknowledgment" },
        { stepNumber: 6, title: "Review Fee Schedule", description: "Verify fee billing accuracy and alignment with signed advisory agreement" },
      ],
    },
  ];

  for (const t of workflowTemplateData) {
    await db.insert(workflowTemplates).values(t);
  }

  const [onboardingTemplate] = await db.select().from(workflowTemplates).where(eq(workflowTemplates.name, "New Client Onboarding"));
  const [reviewTemplate] = await db.select().from(workflowTemplates).where(eq(workflowTemplates.name, "Annual Review"));
  const [lifeEventTemplate] = await db.select().from(workflowTemplates).where(eq(workflowTemplates.name, "Life Event Response"));

  if (onboardingTemplate) {
    const templateSteps = (onboardingTemplate.steps as any[]) || [];
    await db.insert(clientWorkflows).values({
      clientId: robert.id,
      templateId: onboardingTemplate.id,
      templateName: onboardingTemplate.name,
      status: "completed",
      steps: templateSteps.map((s: any) => ({
        stepNumber: s.stepNumber, title: s.title, description: s.description,
        completed: true, completedAt: "2024-01-20", notes: "",
      })),
      startedAt: "2024-01-10",
      completedAt: "2024-01-20",
      assignedBy: advisor.name,
    });

    await db.insert(clientWorkflows).values({
      clientId: priya.id,
      templateId: onboardingTemplate.id,
      templateName: onboardingTemplate.name,
      status: "completed",
      steps: templateSteps.map((s: any) => ({
        stepNumber: s.stepNumber, title: s.title, description: s.description,
        completed: true, completedAt: "2024-08-15", notes: "",
      })),
      startedAt: "2024-08-01",
      completedAt: "2024-08-15",
      assignedBy: advisor.name,
    });
  }

  if (reviewTemplate) {
    const templateSteps = (reviewTemplate.steps as any[]) || [];
    await db.insert(clientWorkflows).values({
      clientId: robert.id,
      templateId: reviewTemplate.id,
      templateName: reviewTemplate.name,
      status: "active",
      steps: templateSteps.map((s: any, i: number) => ({
        stepNumber: s.stepNumber, title: s.title, description: s.description,
        completed: i < 5, completedAt: i < 3 ? "2026-03-01" : i < 5 ? "2026-03-07" : null, notes: "",
      })),
      startedAt: "2026-02-28",
      completedAt: null,
      assignedBy: advisor.name,
    });

    await db.insert(clientWorkflows).values({
      clientId: james.id,
      templateId: reviewTemplate.id,
      templateName: reviewTemplate.name,
      status: "active",
      steps: templateSteps.map((s: any, i: number) => ({
        stepNumber: s.stepNumber, title: s.title, description: s.description,
        completed: i < 3, completedAt: i < 3 ? "2026-02-15" : null, notes: "",
      })),
      startedAt: "2026-02-10",
      completedAt: null,
      assignedBy: advisor.name,
    });
  }

  if (lifeEventTemplate) {
    const templateSteps = (lifeEventTemplate.steps as any[]) || [];
    await db.insert(clientWorkflows).values({
      clientId: priya.id,
      templateId: lifeEventTemplate.id,
      templateName: lifeEventTemplate.name,
      status: "active",
      steps: templateSteps.map((s: any, i: number) => ({
        stepNumber: s.stepNumber, title: s.title, description: s.description,
        completed: i < 4, completedAt: i < 2 ? "2026-02-10" : i < 4 ? "2026-02-15" : null, notes: i === 0 ? "Baby Aria born Jan 12, 2026" : "",
      })),
      startedAt: "2026-01-15",
      completedAt: null,
      assignedBy: advisor.name,
    });
  }

  const first100DaysTemplate = await db.insert(workflowTemplates).values({
    advisorId: advisor.id,
    name: "First 100 Days",
    description: "Structured 100-day onboarding program with milestone tracking, automated check-ins, and paperwork management for new clients.",
    category: "onboarding",
    steps: [
      { stepNumber: 1, title: "Day 1 — Welcome", description: "Welcome email sent; Introduce advisor team; Confirm communication preferences", outputType: "checklist", milestoneDay: 1, milestoneCategory: "welcome", deliverables: ["Welcome email sent", "Introduce advisor team", "Confirm communication preferences"] },
      { stepNumber: 2, title: "Day 7 — Foundation", description: "KYC documents collected; Risk assessment completed; Initial discovery meeting held", outputType: "checklist", milestoneDay: 7, milestoneCategory: "foundation", deliverables: ["KYC documents collected", "Risk assessment completed", "Initial discovery meeting held"] },
      { stepNumber: 3, title: "Day 14 — Account Setup", description: "Custodial accounts opened; Asset transfers initiated; Beneficiary designations confirmed", outputType: "checklist", milestoneDay: 14, milestoneCategory: "setup", deliverables: ["Custodial accounts opened", "Asset transfers initiated", "Beneficiary designations confirmed"] },
      { stepNumber: 4, title: "Day 30 — Planning", description: "Financial plan draft delivered; Investment policy statement signed; Insurance review completed", outputType: "checklist", milestoneDay: 30, milestoneCategory: "planning", deliverables: ["Financial plan draft delivered", "Investment policy statement signed", "Insurance review completed"] },
      { stepNumber: 5, title: "Day 60 — Implementation", description: "Portfolio fully invested; Automatic contributions configured; Estate plan review scheduled", outputType: "checklist", milestoneDay: 60, milestoneCategory: "implementation", deliverables: ["Portfolio fully invested", "Automatic contributions configured", "Estate plan review scheduled"] },
      { stepNumber: 6, title: "Day 90 — First Review", description: "90-day performance review; Plan vs actuals comparison; Adjust allocations if needed", outputType: "checklist", milestoneDay: 90, milestoneCategory: "review", deliverables: ["90-day performance review", "Plan vs actuals comparison", "Adjust allocations if needed"] },
      { stepNumber: 7, title: "Day 100 — Graduation", description: "Transition to regular service cadence; Set next annual review date; Client satisfaction check-in", outputType: "checklist", milestoneDay: 100, milestoneCategory: "graduation", deliverables: ["Transition to regular service cadence", "Set next annual review date", "Client satisfaction check-in"] },
    ],
  }).returning();

  const f100Template = first100DaysTemplate[0];

  const today100 = new Date();
  const priyaStart = new Date(today100);
  priyaStart.setDate(today100.getDate() - 35);
  const priyaStartStr = priyaStart.toISOString().split("T")[0];

  await db.insert(clientWorkflows).values({
    clientId: priya.id,
    templateId: f100Template.id,
    templateName: "First 100 Days",
    status: "active",
    steps: [
      { stepNumber: 1, title: "Day 1 — Welcome", description: "Welcome email sent; Introduce advisor team; Confirm communication preferences", milestoneDay: 1, milestoneCategory: "welcome", deliverables: ["Welcome email sent", "Introduce advisor team", "Confirm communication preferences"], completed: true, completedAt: priyaStartStr, notified: true, notifiedAt: priyaStartStr, notes: "Welcome packet sent via email" },
      { stepNumber: 2, title: "Day 7 — Foundation", description: "KYC documents collected; Risk assessment completed; Initial discovery meeting held", milestoneDay: 7, milestoneCategory: "foundation", deliverables: ["KYC documents collected", "Risk assessment completed", "Initial discovery meeting held"], completed: true, completedAt: new Date(priyaStart.getTime() + 7 * 86400000).toISOString().split("T")[0], notified: true, notifiedAt: new Date(priyaStart.getTime() + 7 * 86400000).toISOString().split("T")[0], notes: "All KYC docs received" },
      { stepNumber: 3, title: "Day 14 — Account Setup", description: "Custodial accounts opened; Asset transfers initiated; Beneficiary designations confirmed", milestoneDay: 14, milestoneCategory: "setup", deliverables: ["Custodial accounts opened", "Asset transfers initiated", "Beneficiary designations confirmed"], completed: true, completedAt: new Date(priyaStart.getTime() + 14 * 86400000).toISOString().split("T")[0], notified: true, notifiedAt: new Date(priyaStart.getTime() + 14 * 86400000).toISOString().split("T")[0], notes: "Schwab accounts opened" },
      { stepNumber: 4, title: "Day 30 — Planning", description: "Financial plan draft delivered; Investment policy statement signed; Insurance review completed", milestoneDay: 30, milestoneCategory: "planning", deliverables: ["Financial plan draft delivered", "Investment policy statement signed", "Insurance review completed"], completed: true, completedAt: new Date(priyaStart.getTime() + 30 * 86400000).toISOString().split("T")[0], notified: true, notifiedAt: new Date(priyaStart.getTime() + 30 * 86400000).toISOString().split("T")[0], notes: "IPS signed, plan delivered" },
      { stepNumber: 5, title: "Day 60 — Implementation", description: "Portfolio fully invested; Automatic contributions configured; Estate plan review scheduled", milestoneDay: 60, milestoneCategory: "implementation", deliverables: ["Portfolio fully invested", "Automatic contributions configured", "Estate plan review scheduled"], completed: false, completedAt: null, notified: false, notifiedAt: null, notes: "" },
      { stepNumber: 6, title: "Day 90 — First Review", description: "90-day performance review; Plan vs actuals comparison; Adjust allocations if needed", milestoneDay: 90, milestoneCategory: "review", deliverables: ["90-day performance review", "Plan vs actuals comparison", "Adjust allocations if needed"], completed: false, completedAt: null, notified: false, notifiedAt: null, notes: "" },
      { stepNumber: 7, title: "Day 100 — Graduation", description: "Transition to regular service cadence; Set next annual review date; Client satisfaction check-in", milestoneDay: 100, milestoneCategory: "graduation", deliverables: ["Transition to regular service cadence", "Set next annual review date", "Client satisfaction check-in"], completed: false, completedAt: null, notified: false, notifiedAt: null, notes: "" },
    ],
    startedAt: priyaStartStr,
    completedAt: null,
    assignedBy: advisor.name,
  });

  const jamesStart = new Date(today100);
  jamesStart.setDate(today100.getDate() - 12);
  const jamesStartStr = jamesStart.toISOString().split("T")[0];

  await db.insert(clientWorkflows).values({
    clientId: james.id,
    templateId: f100Template.id,
    templateName: "First 100 Days",
    status: "active",
    steps: [
      { stepNumber: 1, title: "Day 1 — Welcome", description: "Welcome email sent; Introduce advisor team; Confirm communication preferences", milestoneDay: 1, milestoneCategory: "welcome", deliverables: ["Welcome email sent", "Introduce advisor team", "Confirm communication preferences"], completed: true, completedAt: jamesStartStr, notified: true, notifiedAt: jamesStartStr, notes: "Welcome call completed" },
      { stepNumber: 2, title: "Day 7 — Foundation", description: "KYC documents collected; Risk assessment completed; Initial discovery meeting held", milestoneDay: 7, milestoneCategory: "foundation", deliverables: ["KYC documents collected", "Risk assessment completed", "Initial discovery meeting held"], completed: true, completedAt: new Date(jamesStart.getTime() + 7 * 86400000).toISOString().split("T")[0], notified: true, notifiedAt: new Date(jamesStart.getTime() + 7 * 86400000).toISOString().split("T")[0], notes: "Risk assessment: aggressive" },
      { stepNumber: 3, title: "Day 14 — Account Setup", description: "Custodial accounts opened; Asset transfers initiated; Beneficiary designations confirmed", milestoneDay: 14, milestoneCategory: "setup", deliverables: ["Custodial accounts opened", "Asset transfers initiated", "Beneficiary designations confirmed"], completed: false, completedAt: null, notified: false, notifiedAt: null, notes: "" },
      { stepNumber: 4, title: "Day 30 — Planning", description: "Financial plan draft delivered; Investment policy statement signed; Insurance review completed", milestoneDay: 30, milestoneCategory: "planning", deliverables: ["Financial plan draft delivered", "Investment policy statement signed", "Insurance review completed"], completed: false, completedAt: null, notified: false, notifiedAt: null, notes: "" },
      { stepNumber: 5, title: "Day 60 — Implementation", description: "Portfolio fully invested; Automatic contributions configured; Estate plan review scheduled", milestoneDay: 60, milestoneCategory: "implementation", deliverables: ["Portfolio fully invested", "Automatic contributions configured", "Estate plan review scheduled"], completed: false, completedAt: null, notified: false, notifiedAt: null, notes: "" },
      { stepNumber: 6, title: "Day 90 — First Review", description: "90-day performance review; Plan vs actuals comparison; Adjust allocations if needed", milestoneDay: 90, milestoneCategory: "review", deliverables: ["90-day performance review", "Plan vs actuals comparison", "Adjust allocations if needed"], completed: false, completedAt: null, notified: false, notifiedAt: null, notes: "" },
      { stepNumber: 7, title: "Day 100 — Graduation", description: "Transition to regular service cadence; Set next annual review date; Client satisfaction check-in", milestoneDay: 100, milestoneCategory: "graduation", deliverables: ["Transition to regular service cadence", "Set next annual review date", "Client satisfaction check-in"], completed: false, completedAt: null, notified: false, notifiedAt: null, notes: "" },
    ],
    startedAt: jamesStartStr,
    completedAt: null,
    assignedBy: advisor.name,
  });

  const associatesData = [
    { name: "James Chen", email: "james.chen@onedigital.com", role: "analyst", phone: "(404) 555-0201", avatarUrl: "/avatars/james_chen_associate.png", passwordHash: hashPassword("associate123") },
    { name: "Emily Rodriguez", email: "emily.rodriguez@onedigital.com", role: "paraplanner", phone: "(404) 555-0202", avatarUrl: "/avatars/emily_rodriguez.png", passwordHash: hashPassword("associate123") },
    { name: "David Kim", email: "david.kim@onedigital.com", role: "assistant", phone: "(404) 555-0203", avatarUrl: "/avatars/david_kim.png", passwordHash: hashPassword("associate123") },
  ];

  const createdAssociates = [];
  for (const a of associatesData) {
    const [created] = await db.insert(associates).values(a).returning();
    createdAssociates.push(created);
  }

  await db.insert(clientTeamMembers).values({ clientId: robert.id, associateId: createdAssociates[0].id, role: "lead analyst", addedAt: "2024-01-15" });
  await db.insert(clientTeamMembers).values({ clientId: robert.id, associateId: createdAssociates[1].id, role: "paraplanner", addedAt: "2024-01-15" });
  await db.insert(clientTeamMembers).values({ clientId: margaret.id, associateId: createdAssociates[0].id, role: "analyst", addedAt: "2024-02-01" });
  await db.insert(clientTeamMembers).values({ clientId: james.id, associateId: createdAssociates[0].id, role: "lead analyst", addedAt: "2022-06-15" });
  await db.insert(clientTeamMembers).values({ clientId: james.id, associateId: createdAssociates[2].id, role: "support", addedAt: "2023-01-01" });
  await db.insert(clientTeamMembers).values({ clientId: lisa.id, associateId: createdAssociates[2].id, role: "support", addedAt: "2023-01-01" });
  await db.insert(clientTeamMembers).values({ clientId: priya.id, associateId: createdAssociates[1].id, role: "paraplanner", addedAt: "2024-08-01" });
  await db.insert(clientTeamMembers).values({ clientId: priya.id, associateId: createdAssociates[2].id, role: "support", addedAt: "2024-08-01" });

  const tasksData = [
    { advisorId: advisor.id, clientId: robert.id, title: "Update Henderson estate plan", description: "Review and update estate documents based on recent tax law changes. Coordinate with estate attorney James Blake at Baker & McKenzie.", dueDate: "2026-03-15", priority: "high", status: "pending", category: "Planning", type: "estate_planning", assigneeId: createdAssociates[1].id },
    { advisorId: advisor.id, clientId: robert.id, title: "Process Henderson RMD", description: "Calculate and process required minimum distribution for Robert's Traditional IRA. Estimated RMD: $48,000 for 2026.", dueDate: "2026-03-31", priority: "high", status: "pending", category: "Operations", type: "compliance", assigneeId: createdAssociates[0].id },
    { advisorId: advisor.id, clientId: robert.id, title: "Henderson charitable giving strategy", description: "Research qualified charitable distribution (QCD) options for Margaret's philanthropic goals. She wants to donate to Atlanta Community Foundation.", dueDate: "2026-04-15", priority: "medium", status: "pending", category: "Planning", type: "tax_planning" },
    { advisorId: advisor.id, clientId: james.id, title: "Review Chen RSU vesting schedule", description: "Prepare analysis of upcoming RSU vesting (Q2 2026 - ~2,000 shares TechCorp). Develop systematic diversification plan to reduce concentration risk.", dueDate: "2026-03-20", priority: "medium", status: "in-progress", category: "Planning", type: "rebalancing", assigneeId: createdAssociates[0].id },
    { advisorId: advisor.id, clientId: james.id, title: "Chen concentrated position analysis", description: "Run Monte Carlo simulations on TechCorp concentration risk. Current position ~25% of portfolio. Target: reduce to 15% over 12 months.", dueDate: "2026-04-01", priority: "high", status: "pending", category: "Planning", type: "rebalancing", assigneeId: createdAssociates[0].id },
    { advisorId: advisor.id, clientId: lisa.id, title: "Increase Chen 529 contributions", description: "Set up automatic monthly contributions of $1,500 to Chen 529 plan per Lisa's request. Eldest child starts college 2030.", dueDate: "2026-03-15", priority: "medium", status: "pending", category: "Operations", type: "account_opening", assigneeId: createdAssociates[2].id },
    { advisorId: advisor.id, clientId: priya.id, title: "Set up 529 plan for Patel baby", description: "Open and fund Georgia 529 plan for baby Aria Patel (born Jan 2026). Initial funding: $10,000. Set up monthly auto-contributions of $500.", dueDate: "2026-03-25", priority: "medium", status: "pending", category: "Operations", type: "account_opening", assigneeId: createdAssociates[1].id },
    { advisorId: advisor.id, clientId: priya.id, title: "Patel life insurance application", description: "Submit application for $2M 20-year term life insurance policy. Priya is healthy, non-smoker - should qualify for preferred rates.", dueDate: "2026-03-20", priority: "high", status: "in-progress", category: "Insurance", type: "insurance", assigneeId: createdAssociates[1].id },
    { advisorId: advisor.id, clientId: priya.id, title: "Evaluate practice buy-in for Patel", description: "Analyze financial implications of Priya's potential practice buy-in at Emory Healthcare. Estimated cost: $400K. Review financing options and impact on retirement timeline.", dueDate: "2026-04-30", priority: "medium", status: "pending", category: "Planning", type: "general" },
    { advisorId: advisor.id, clientId: robert.id, title: "Request updated Henderson trust documents", description: "Contact attorney to obtain latest versions of revocable trust and power of attorney documents for file.", dueDate: "2026-03-10", priority: "medium", status: "pending", category: "Documents", type: "document_request", assigneeId: createdAssociates[2].id },
    { advisorId: advisor.id, clientId: james.id, title: "Follow up on Chen 401k rollover", description: "Check status of James Chen's 401k rollover from previous employer. Ensure funds have been received and invested per IPS.", dueDate: "2026-03-18", priority: "medium", status: "completed", category: "Operations", type: "follow_up", assigneeId: createdAssociates[0].id },
    { advisorId: advisor.id, title: "Complete CE credits - Ethics module", description: "Complete annual continuing education ethics requirement before June deadline.", dueDate: "2026-06-30", priority: "low", status: "pending", category: "Professional Development", type: "compliance" },
    { advisorId: advisor.id, title: "Prepare quarterly client newsletter", description: "Draft Q1 2026 market commentary and practice updates for client distribution.", dueDate: "2026-04-05", priority: "medium", status: "pending", category: "Marketing", type: "general" },
  ];

  const createdTasks: any[] = [];
  for (const t of tasksData) {
    const [created] = await db.insert(tasks).values(t).returning();
    createdTasks.push(created);
  }

  const quarterlyReviewTask = createdTasks.find(t => t.title.includes("Henderson charitable"));
  if (quarterlyReviewTask) {
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    await db.insert(recurringTasks).values({
      taskId: quarterlyReviewTask.id,
      pattern: "monthly",
      interval: 3,
      nextDueDate: nextMonth.toISOString().split("T")[0],
      active: true,
    });
  }

  await db.insert(diagnosticConfig).values({
    name: "Comprehensive Wealth Diagnostic",
    isActive: true,
    analysisPrompt: `You are a senior wealth management analyst performing a comprehensive financial diagnostic for a wealth advisor's client. Analyze ALL provided client data and return a structured JSON analysis.

Your analysis must cover these areas:
1. **Summary** - Client overview with key metrics
2. **Portfolio Analysis** - Diversification, concentration risks, sector allocation scoring
3. **Performance Analysis** - Returns vs benchmarks, alpha generation, trends
4. **Risk Assessment** - Overall risk level, concentration risk, compliance risk, suitability alignment
5. **Recommendations** - Specific, actionable items ranked by priority

Return EXACTLY this JSON structure:
{
  "summary": {
    "clientName": "string",
    "riskProfile": "string",
    "totalAum": number,
    "accountCount": number,
    "holdingCount": number
  },
  "portfolioAnalysis": {
    "overallScore": number (0-100),
    "diversificationRating": "Excellent|Good|Fair|Poor",
    "topSector": "string",
    "topSectorWeight": number,
    "concentrationRisk": "Low|Moderate|High|Critical",
    "sectorBreakdown": [{"sector": "string", "weight": number, "value": number}]
  },
  "performanceAnalysis": {
    "ytdReturn": number or null,
    "benchmarkReturn": number or null,
    "alpha": number or null,
    "performanceRating": "Outperforming|In Line|Underperforming"
  },
  "riskAssessment": {
    "overallRisk": "Low|Medium|High",
    "concentrationRisk": "Low|Moderate|High",
    "complianceRisk": "Low|Moderate|High",
    "actionItemsCount": number,
    "overdueCompliance": number,
    "expiringCompliance": number
  },
  "recommendations": ["string array of 3-6 specific actionable recommendations"],
  "generatedAt": "ISO date string",
  "aiPowered": true
}

Be thorough, specific, and data-driven. Reference actual numbers from the client data. Each recommendation should be actionable and specific to this client's situation.`,
    htmlTemplate: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; color: #1a1a2e;">
  <div style="background: linear-gradient(135deg, #1a5276 0%, #2980b9 100%); color: white; padding: 28px 32px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 700;">Financial Diagnostic Report</h1>
    <p style="margin: 0; opacity: 0.9; font-size: 14px;">{{summary.clientName}} &bull; Risk Profile: {{summary.riskProfile}}</p>
  </div>

  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #e5e7eb;">
    <div style="background: white; padding: 18px 20px; text-align: center;">
      <div style="font-size: 22px; font-weight: 700; color: #1a5276;">{{summary.totalAum}}</div>
      <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Total AUM</div>
    </div>
    <div style="background: white; padding: 18px 20px; text-align: center;">
      <div style="font-size: 22px; font-weight: 700; color: #1a5276;">{{summary.accountCount}}</div>
      <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Accounts</div>
    </div>
    <div style="background: white; padding: 18px 20px; text-align: center;">
      <div style="font-size: 22px; font-weight: 700; color: #1a5276;">{{summary.holdingCount}}</div>
      <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Holdings</div>
    </div>
    <div style="background: white; padding: 18px 20px; text-align: center;">
      <div style="font-size: 22px; font-weight: 700; color: #1a5276;">{{portfolioAnalysis.overallScore}}</div>
      <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Portfolio Score</div>
    </div>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px 32px;">
    <h2 style="font-size: 16px; font-weight: 600; color: #1a5276; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Portfolio Analysis</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div>
        <span style="font-size: 12px; color: #6b7280;">Diversification</span>
        <div style="font-size: 15px; font-weight: 600;">{{portfolioAnalysis.diversificationRating}}</div>
      </div>
      <div>
        <span style="font-size: 12px; color: #6b7280;">Concentration Risk</span>
        <div style="font-size: 15px; font-weight: 600;">{{portfolioAnalysis.concentrationRisk}}</div>
      </div>
      <div>
        <span style="font-size: 12px; color: #6b7280;">Top Sector</span>
        <div style="font-size: 15px; font-weight: 600;">{{portfolioAnalysis.topSector}} ({{portfolioAnalysis.topSectorWeight}})</div>
      </div>
    </div>

    <h3 style="font-size: 13px; font-weight: 600; color: #374151; margin: 16px 0 8px 0;">Sector Breakdown</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb;">
          <th style="text-align: left; padding: 8px 4px; color: #6b7280; font-weight: 500;">Sector</th>
          <th style="text-align: right; padding: 8px 4px; color: #6b7280; font-weight: 500;">Weight</th>
          <th style="text-align: right; padding: 8px 4px; color: #6b7280; font-weight: 500;">Value</th>
        </tr>
      </thead>
      <tbody>
        {{#each portfolioAnalysis.sectorBreakdown}}<tr style="border-bottom: 1px solid #f3f4f6;">
          <td style="padding: 8px 4px;">{{sector}}</td>
          <td style="text-align: right; padding: 8px 4px;">{{weight}}</td>
          <td style="text-align: right; padding: 8px 4px;">{{value}}</td>
        </tr>{{/each}}
      </tbody>
    </table>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px 32px;">
    <h2 style="font-size: 16px; font-weight: 600; color: #1a5276; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Performance Analysis</h2>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 20px; font-weight: 700; color: #059669;">{{performanceAnalysis.ytdReturn}}</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">YTD Return</div>
      </div>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 20px; font-weight: 700; color: #6b7280;">{{performanceAnalysis.benchmarkReturn}}</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Benchmark</div>
      </div>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 20px; font-weight: 700; color: #1a5276;">{{performanceAnalysis.alpha}}</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Alpha</div>
      </div>
    </div>
    <div style="margin-top: 12px; padding: 10px 16px; background: #f0f9ff; border-radius: 6px; font-size: 13px;">
      Performance Rating: <strong>{{performanceAnalysis.performanceRating}}</strong>
    </div>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px 32px;">
    <h2 style="font-size: 16px; font-weight: 600; color: #1a5276; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Risk Assessment</h2>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
      <div style="padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Overall Risk</div>
        <div style="font-size: 15px; font-weight: 600; margin-top: 4px;">{{riskAssessment.overallRisk}}</div>
      </div>
      <div style="padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Concentration</div>
        <div style="font-size: 15px; font-weight: 600; margin-top: 4px;">{{riskAssessment.concentrationRisk}}</div>
      </div>
      <div style="padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Compliance</div>
        <div style="font-size: 15px; font-weight: 600; margin-top: 4px;">{{riskAssessment.complianceRisk}}</div>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px;">
      <div style="text-align: center; padding: 10px; background: #fef3c7; border-radius: 6px;">
        <div style="font-size: 18px; font-weight: 700;">{{riskAssessment.actionItemsCount}}</div>
        <div style="font-size: 11px; color: #92400e;">Pending Actions</div>
      </div>
      <div style="text-align: center; padding: 10px; background: #fee2e2; border-radius: 6px;">
        <div style="font-size: 18px; font-weight: 700;">{{riskAssessment.overdueCompliance}}</div>
        <div style="font-size: 11px; color: #991b1b;">Overdue Items</div>
      </div>
      <div style="text-align: center; padding: 10px; background: #fff7ed; border-radius: 6px;">
        <div style="font-size: 18px; font-weight: 700;">{{riskAssessment.expiringCompliance}}</div>
        <div style="font-size: 11px; color: #9a3412;">Expiring Soon</div>
      </div>
    </div>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 24px 32px; border-radius: 0 0 12px 12px;">
    <h2 style="font-size: 16px; font-weight: 600; color: #1a5276; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">Recommendations</h2>
    <ol style="margin: 0; padding-left: 20px;">
      {{#list recommendations}}<li style="padding: 8px 0; font-size: 14px; line-height: 1.5; border-bottom: 1px solid #f3f4f6;">{{this}}</li>{{/list}}
    </ol>
  </div>

  <div style="text-align: center; padding: 16px; font-size: 11px; color: #9ca3af;">
    Generated {{generatedAt}} &bull; OneDigital Wealth Management
  </div>
</div>`,
  });

  await db.insert(transcriptConfig).values({
    name: "Meeting Transcript Analyzer",
    isActive: true,
    analysisPrompt: `You are a wealth management meeting analyst. Analyze the meeting transcript and extract structured information to populate a meeting record in a CRM system.

Return EXACTLY this JSON structure:
{
  "title": "string - A concise meeting title (e.g., 'Q1 Portfolio Review - Henderson')",
  "type": "string - one of: quarterly_review, portfolio_review, financial_planning, estate_planning, tax_planning, onboarding, ad_hoc",
  "status": "completed",
  "summary": "string - 2-3 paragraph summary of the meeting covering main topics discussed, decisions made, and overall tone",
  "keyTopics": ["array of string topic names discussed"],
  "actionItems": [
    {
      "description": "string - specific action item",
      "owner": "string - 'Advisor' or 'Client'",
      "priority": "string - 'high', 'medium', or 'low'",
      "dueDate": "string ISO date or null"
    }
  ],
  "clientSentiment": "string - 'positive', 'neutral', or 'concerned'",
  "followUpNeeded": true/false,
  "complianceNotes": ["array of any compliance-relevant items mentioned (suitability, risk tolerance, regulatory items)"],
  "aiPowered": true
}

Be thorough in extracting action items. Each action item should be specific and actionable. Identify the responsible party (advisor vs client) for each item. Note any compliance-relevant discussion points separately.`,
  });

  const complianceItemsList = await db.select().from(complianceItems).where(eq(complianceItems.clientId, robert.id));
  const robertItemIds = complianceItemsList.map(i => i.id);

  const [approvedReview] = await db.insert(complianceReviews).values({
    clientId: robert.id,
    advisorId: advisor.id,
    title: "Q4 2025 Annual Compliance Review",
    status: "approved",
    advisorNotes: "All items reviewed and up to date. Risk profile confirmed with client during December meeting. IPS reviewed and no changes needed.",
    reviewerName: "Maria Santos, CCO",
    reviewerNotes: "Thorough review. All documentation in order. Approved.",
    reviewItems: JSON.stringify(robertItemIds.slice(0, 2)),
    submittedAt: "2025-12-15",
    reviewedAt: "2025-12-18",
    completedAt: "2025-12-20",
  }).returning();

  await db.insert(complianceReviewEvents).values([
    { reviewId: approvedReview.id, eventType: "created", description: "Compliance review created", createdBy: "Sarah Mitchell" },
    { reviewId: approvedReview.id, eventType: "submitted", description: "Review submitted for compliance team review", createdBy: "Sarah Mitchell" },
    { reviewId: approvedReview.id, eventType: "under_review", description: "Review picked up by Maria Santos, CCO", createdBy: "Maria Santos, CCO" },
    { reviewId: approvedReview.id, eventType: "approved", description: "Review approved by Maria Santos, CCO", createdBy: "Maria Santos, CCO" },
  ]);

  const [activeReview] = await db.insert(complianceReviews).values({
    clientId: robert.id,
    advisorId: advisor.id,
    title: "Q1 2026 Estate Plan & Suitability Review",
    status: "under_review",
    advisorNotes: "Estate plan needs update due to recent tax law changes. Client aware and has consulted estate attorney. Requesting expedited review given March 31 deadline.",
    reviewerName: "Maria Santos, CCO",
    reviewerNotes: null,
    reviewItems: JSON.stringify(robertItemIds.slice(2)),
    submittedAt: "2026-03-01",
    reviewedAt: "2026-03-05",
    completedAt: null,
  }).returning();

  await db.insert(complianceReviewEvents).values([
    { reviewId: activeReview.id, eventType: "created", description: "Compliance review created", createdBy: "Sarah Mitchell" },
    { reviewId: activeReview.id, eventType: "submitted", description: "Review submitted for compliance team review", createdBy: "Sarah Mitchell" },
    { reviewId: activeReview.id, eventType: "under_review", description: "Review picked up by Maria Santos, CCO", createdBy: "Maria Santos, CCO" },
  ]);

  const existingFlags = await db.select().from(featureFlags).limit(1);
  if (existingFlags.length === 0) {
    await db.insert(featureFlags).values([
      { key: "ai_enabled", enabled: true, rolloutPercentage: 100, description: "Finn AI chat interface and AI-powered features" },
      { key: "salesforce_integration", enabled: false, rolloutPercentage: 0, description: "Salesforce CRM data synchronization" },
      { key: "orion_integration", enabled: false, rolloutPercentage: 0, description: "Orion portfolio management API connectivity" },
      { key: "outlook_integration", enabled: false, rolloutPercentage: 0, description: "Microsoft Outlook calendar and email sync" },
      { key: "zoom_integration", enabled: false, rolloutPercentage: 0, description: "Zoom meeting recording and transcription" },
      { key: "monte_carlo_enabled", enabled: true, rolloutPercentage: 100, description: "Monte Carlo simulation analysis tab" },
      { key: "workflow_builder_enabled", enabled: true, rolloutPercentage: 100, description: "Visual workflow builder tool" },
      { key: "expansion_enabled", enabled: false, rolloutPercentage: 0, description: "Full production expansion — requires all 8 gates to pass" },
    ]);
    logger.info("Feature flags seeded.");
  }

  const existingSchemas = await db.select().from(investorProfileQuestionSchemas).limit(1);
  if (existingSchemas.length === 0) {
    await db.insert(investorProfileQuestionSchemas).values([
      {
        name: "Individual Investor Profile v1.0",
        profileType: "individual",
        isActive: true,
        questions: [
          { id: "q_full_name", section: "Demographics", label: "Full Legal Name", type: "text", required: true },
          { id: "q_dob", section: "Demographics", label: "Date of Birth", type: "date", required: true },
          { id: "q_ssn_last4", section: "Demographics", label: "Last 4 of SSN", type: "text", required: true, validationRules: { minLength: 4 } },
          { id: "q_marital_status", section: "Demographics", label: "Marital Status", type: "select", required: true, options: [{ label: "Single", value: "single" }, { label: "Married", value: "married" }, { label: "Divorced", value: "divorced" }, { label: "Widowed", value: "widowed" }] },
          { id: "q_dependents", section: "Demographics", label: "Number of Dependents", type: "number", required: false, validationRules: { min: 0, max: 20 } },
          { id: "q_employment_status", section: "Employment & Income", label: "Employment Status", type: "select", required: true, options: [{ label: "Employed", value: "employed" }, { label: "Self-Employed", value: "self_employed" }, { label: "Retired", value: "retired" }, { label: "Unemployed", value: "unemployed" }] },
          { id: "q_employer", section: "Employment & Income", label: "Employer Name", type: "text", required: false },
          { id: "q_annual_income", section: "Employment & Income", label: "Annual Income (USD)", type: "number", required: true, validationRules: { min: 0 }, helpText: "Gross annual income from all sources" },
          { id: "q_income_sources", section: "Employment & Income", label: "Income Sources", type: "multiselect", required: false, options: [{ label: "Salary", value: "salary" }, { label: "Dividends", value: "dividends" }, { label: "Rental Income", value: "rental" }, { label: "Business Income", value: "business" }, { label: "Social Security", value: "social_security" }, { label: "Pension", value: "pension" }] },
          { id: "q_net_worth", section: "Net Worth Assessment", label: "Estimated Net Worth (USD)", type: "number", required: true, validationRules: { min: 0 }, helpText: "Include all assets minus liabilities" },
          { id: "q_liquid_assets", section: "Net Worth Assessment", label: "Liquid Assets (USD)", type: "number", required: true, validationRules: { min: 0 }, helpText: "Cash, savings, money market, CDs" },
          { id: "q_risk_tolerance", section: "Risk Assessment", label: "What is your risk tolerance?", type: "radio", required: true, options: [{ label: "Conservative", value: "conservative" }, { label: "Moderately Conservative", value: "moderately_conservative" }, { label: "Moderate", value: "moderate" }, { label: "Moderately Aggressive", value: "moderately_aggressive" }, { label: "Aggressive", value: "aggressive" }] },
          { id: "q_investment_horizon", section: "Risk Assessment", label: "Investment Time Horizon", type: "select", required: true, options: [{ label: "Less than 3 years", value: "short" }, { label: "3-7 years", value: "medium" }, { label: "7-15 years", value: "long" }, { label: "15+ years", value: "very_long" }] },
          { id: "q_investment_experience", section: "Risk Assessment", label: "Investment Experience", type: "select", required: true, options: [{ label: "None", value: "none" }, { label: "Limited", value: "limited" }, { label: "Moderate", value: "moderate" }, { label: "Extensive", value: "extensive" }] },
          { id: "q_primary_goal", section: "Goals & Objectives", label: "Primary Financial Goal", type: "select", required: true, options: [{ label: "Capital Preservation", value: "preservation" }, { label: "Income Generation", value: "income" }, { label: "Growth", value: "growth" }, { label: "Aggressive Growth", value: "aggressive_growth" }, { label: "Retirement Planning", value: "retirement" }] },
          { id: "q_retirement_age", section: "Goals & Objectives", label: "Target Retirement Age", type: "number", required: false, validationRules: { min: 40, max: 100 } },
          { id: "q_special_needs", section: "Goals & Objectives", label: "Special Financial Considerations", type: "textarea", required: false, helpText: "Education funding, charitable giving, estate planning, etc." },
          { id: "q_liquidity_needs", section: "Constraints", label: "Anticipated Liquidity Needs", type: "textarea", required: false, helpText: "Describe any upcoming large expenses or cash needs" },
          { id: "q_tax_concerns", section: "Constraints", label: "Tax Considerations", type: "textarea", required: false, helpText: "Any specific tax situations or concerns" },
          { id: "q_restrictions", section: "Constraints", label: "Investment Restrictions", type: "textarea", required: false, helpText: "Any securities, sectors, or strategies you wish to avoid" },
        ],
      },
      {
        name: "Legal Entity Profile v1.0",
        profileType: "legal_entity",
        isActive: true,
        questions: [
          { id: "q_entity_name", section: "Entity Information", label: "Legal Entity Name", type: "text", required: true },
          { id: "q_ein", section: "Entity Information", label: "EIN/Tax ID", type: "text", required: true, entityTypes: ["corporation", "foundation", "partnership", "llc"] },
          { id: "q_state_formation", section: "Entity Information", label: "State of Formation", type: "text", required: true },
          { id: "q_date_formation", section: "Entity Information", label: "Date of Formation", type: "date", required: true },
          { id: "q_authorized_signers", section: "Entity Information", label: "Authorized Signers", type: "textarea", required: true, helpText: "List all authorized signers with titles", entityTypes: ["corporation", "partnership", "llc"] },

          { id: "q_trust_type", section: "Trust Details", label: "Type of Trust", type: "select", required: true, options: [{ label: "Revocable Living Trust", value: "revocable_living" }, { label: "Irrevocable Trust", value: "irrevocable" }, { label: "Testamentary Trust", value: "testamentary" }, { label: "Charitable Trust", value: "charitable" }], entityTypes: ["trust"] },
          { id: "q_trust_date", section: "Trust Details", label: "Date Trust Was Established", type: "date", required: true, entityTypes: ["trust"] },
          { id: "q_trustee_names", section: "Trust Administration", label: "Trustee Name(s)", type: "textarea", helpText: "List primary and successor trustees", required: true, entityTypes: ["trust"] },
          { id: "q_beneficiaries", section: "Trust Administration", label: "Primary Beneficiaries", type: "textarea", required: true, entityTypes: ["trust"] },

          { id: "q_corporation_type", section: "Corporate Info", label: "Corporation Type", type: "select", required: true, options: [{ label: "C Corporation", value: "c_corp" }, { label: "S Corporation", value: "s_corp" }], entityTypes: ["corporation"] },
          { id: "q_articles_of_incorporation", section: "Corporate Documents", label: "Articles of Incorporation Filed?", type: "checkbox", required: false, entityTypes: ["corporation"] },

          { id: "q_formation_state", section: "LLC Formation", label: "State of Formation", type: "text", required: true, entityTypes: ["llc"] },
          { id: "q_operating_agreement", section: "LLC Documents", label: "Operating Agreement on File?", type: "checkbox", required: false, entityTypes: ["llc"] },

          { id: "q_partnership_type", section: "Partnership Details", label: "Partnership Type", type: "select", required: true, options: [{ label: "General Partnership", value: "general" }, { label: "Limited Partnership", value: "limited" }, { label: "Limited Liability Partnership", value: "llp" }], entityTypes: ["partnership"] },
          { id: "q_partner_names", section: "Partnership Details", label: "Partner Names and Roles", type: "textarea", required: true, helpText: "List all partners with their roles (general/limited)", entityTypes: ["partnership"] },

          { id: "q_foundation_type", section: "Foundation Details", label: "Foundation Type", type: "select", required: true, options: [{ label: "Private Foundation", value: "private" }, { label: "Public Charitable Foundation", value: "public_charitable" }], entityTypes: ["foundation"] },
          { id: "q_foundation_mission", section: "Foundation Details", label: "Foundation Mission", type: "textarea", required: true, entityTypes: ["foundation"] },

          { id: "q_entity_purpose", section: "Investment Details", label: "Investment Purpose", type: "textarea", required: true, helpText: "Describe the purpose of investment for this entity" },
          { id: "q_entity_assets", section: "Investment Details", label: "Total Entity Assets (USD)", type: "number", required: true, validationRules: { min: 0 } },
          { id: "q_entity_risk", section: "Investment Details", label: "Risk Tolerance", type: "radio", required: true, options: [{ label: "Conservative", value: "conservative" }, { label: "Moderate", value: "moderate" }, { label: "Aggressive", value: "aggressive" }] },
          { id: "q_entity_horizon", section: "Investment Details", label: "Investment Time Horizon", type: "select", required: true, options: [{ label: "Less than 3 years", value: "short" }, { label: "3-7 years", value: "medium" }, { label: "7-15 years", value: "long" }, { label: "15+ years", value: "very_long" }] },
          { id: "q_entity_restrictions", section: "Constraints", label: "Investment Policy Restrictions", type: "textarea", required: false },
          { id: "q_entity_distributions", section: "Constraints", label: "Distribution Requirements", type: "textarea", required: false, helpText: "Required distributions, trust terms, etc." },
        ],
      },
    ]);
    logger.info("Investor profile question schemas seeded.");
  }

  await seedAdditionalDemoData();

  logger.info("Database seeded successfully with 3 client households!");
}

async function seedAdditionalDemoData() {
  logger.info("Running additional demo data seeding...");
  type Advisor = typeof advisors.$inferSelect;
  type Client = typeof clients.$inferSelect;

  const allAdvisors = await db.select().from(advisors).limit(1);
  if (allAdvisors.length === 0) return;
  const advisor: Advisor = allAdvisors[0];

  const allClients: Client[] = await db.select().from(clients);
  if (allClients.length < 7) {
    logger.warn("Fewer than 7 clients found — skipping additional demo data seeding");
    return;
  }
  const byName = (first: string, last: string) => allClients.find(c => c.firstName === first && c.lastName === last);
  const robert = byName("Robert", "Henderson");
  const margaret = byName("Margaret", "Henderson");
  const james = byName("James", "Chen");
  const lisa = byName("Lisa", "Chen");
  const priya = byName("Priya", "Patel");
  const sandra = byName("Sandra", "Vaughn") ?? allClients[5];
  const lisaN = byName("Lisa", "Nakamura") ?? allClients[6];
  if (!robert || !margaret || !james || !lisa || !priya || !sandra || !lisaN) {
    logger.warn("Could not find all expected demo clients by name — skipping additional demo data seeding");
    return;
  }

  const allHouseholds = await db.select().from(households);
  const hh1 = allHouseholds.find(h => h.primaryClientId === robert.id);
  const hh4 = allHouseholds.find(h => h.primaryClientId === sandra.id);

  const allAccounts = await db.select().from(accounts);

  const today = new Date();
  const d = (offset: number) => {
    const dt = new Date(today);
    dt.setDate(today.getDate() + offset);
    return dt.toISOString().split("T")[0];
  };
  const pastDate = (daysAgo: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - daysAgo);
    return dt;
  };

  // ─── EXPANDED CALENDAR MEETINGS (15+ spread across 3 weeks) ───
  const existingMeetingRows = await db.select().from(meetings);
  if (existingMeetingRows.length <= 7) {
    const additionalMeetings = [
      { advisorId: advisor.id, clientId: sandra.id, title: "Quarterly Check-In - " + sandra.lastName, startTime: `${d(2)}T09:00:00`, endTime: `${d(2)}T10:00:00`, type: "Quarterly Check-In", status: "confirmed", location: "Office - Conference Room A", timezone: "America/New_York", attendees: [{ name: `${sandra.firstName} ${sandra.lastName}`, email: sandra.email }], agenda: ["Performance review", "Rebalancing discussion", "Roth conversion strategy"] },
      { advisorId: advisor.id, clientId: lisaN.id, title: "Prospect Intro - " + lisaN.lastName, startTime: `${d(2)}T14:00:00`, endTime: `${d(2)}T15:00:00`, type: "Prospect Intro", status: "scheduled", location: "Zoom", timezone: "America/New_York", attendees: [{ name: `${lisaN.firstName} ${lisaN.lastName}`, email: lisaN.email }], agenda: ["Introductory discussion", "Goals overview", "Service walkthrough"] },
      { advisorId: advisor.id, clientId: james.id, title: "RSU Vesting Follow-Up - Chen", startTime: `${d(3)}T11:00:00`, endTime: `${d(3)}T11:45:00`, type: "Follow-Up", status: "confirmed", location: "Phone Call", timezone: "America/New_York" },
      { advisorId: advisor.id, clientId: robert.id, title: "Charitable Giving Strategy - Henderson", startTime: `${d(4)}T10:00:00`, endTime: `${d(4)}T11:00:00`, type: "Planning Session", status: "scheduled", location: "Office - Conference Room B", timezone: "America/New_York", attendees: [{ name: "Robert Henderson", email: "robert@example.com" }, { name: "Margaret Henderson", email: "margaret@example.com" }], agenda: ["DAF setup", "QCD optimization", "Endowment planning"] },
      { advisorId: advisor.id, clientId: lisa.id, title: "College Planning Review - Chen", startTime: `${d(5)}T13:00:00`, endTime: `${d(5)}T13:45:00`, type: "Planning Session", status: "scheduled", location: "Zoom", timezone: "America/New_York", attendees: [{ name: "Lisa Chen", email: "lisa.chen@example.com" }], agenda: ["529 performance", "Financial aid projections", "Tuition estimates"] },
      { advisorId: advisor.id, clientId: priya.id, title: "Life Event Review - Patel", startTime: `${d(6)}T15:00:00`, endTime: `${d(6)}T16:00:00`, type: "Life Event", status: "confirmed", location: "Office - Conference Room A", timezone: "America/New_York", attendees: [{ name: "Priya Patel", email: "priya@example.com" }], agenda: ["Practice buy-in financing", "Cash flow impact analysis", "Retirement timeline adjustment"] },
      { advisorId: advisor.id, clientId: sandra.id, title: "Tax Planning Session - " + sandra.lastName, startTime: `${d(7)}T09:30:00`, endTime: `${d(7)}T10:30:00`, type: "Tax Planning", status: "scheduled", location: "Office", timezone: "America/New_York" },
      { advisorId: advisor.id, clientId: james.id, title: "10b5-1 Plan Discussion - Chen", startTime: `${d(8)}T10:00:00`, endTime: `${d(8)}T11:00:00`, type: "Planning Session", status: "scheduled", location: "Zoom", timezone: "America/New_York", attendees: [{ name: "James Chen", email: "james@example.com" }], agenda: ["10b5-1 plan structure", "Trading window compliance", "Diversification timeline"] },
      { advisorId: advisor.id, clientId: lisaN.id, title: "Annual Review - " + lisaN.lastName, startTime: `${d(10)}T14:00:00`, endTime: `${d(10)}T15:00:00`, type: "Annual Review", status: "scheduled", location: "Office - Conference Room B", timezone: "America/New_York" },
      { advisorId: advisor.id, clientId: robert.id, title: "Estate Planning - Henderson", startTime: `${d(12)}T10:00:00`, endTime: `${d(12)}T11:30:00`, type: "Estate Planning", status: "confirmed", location: "Office - Conference Room A", timezone: "America/New_York", attendees: [{ name: "Robert Henderson", email: "robert@example.com" }, { name: "Margaret Henderson", email: "margaret@example.com" }], agenda: ["Revocable trust amendments", "Successor trustee review", "Generation-skipping provisions"] },
      { advisorId: advisor.id, clientId: priya.id, title: "Life Insurance Follow-Up - Patel", startTime: `${d(13)}T11:00:00`, endTime: `${d(13)}T11:30:00`, type: "Follow-Up", status: "scheduled", location: "Phone Call", timezone: "America/New_York" },
      { advisorId: advisor.id, clientId: sandra.id, title: "Social Security Strategy - " + sandra.lastName, startTime: `${d(14)}T09:00:00`, endTime: `${d(14)}T10:00:00`, type: "Quarterly Check-In", status: "scheduled", location: "Office", timezone: "America/New_York", attendees: [{ name: `${sandra.firstName} ${sandra.lastName}`, email: sandra.email }], agenda: ["Optimal claiming age", "Spousal benefits", "Tax implications of Social Security"] },
      { advisorId: advisor.id, clientId: james.id, title: "Semi-Annual Review - Chen", startTime: `${d(-5)}T14:00:00`, endTime: `${d(-5)}T15:00:00`, type: "Semi-Annual Review", status: "completed", notes: "Reviewed NVDA concentration reduction progress. Down to 30% from 40%. Discussed next tranche of sales for Q2. 529 on track.", location: "Zoom" },
      { advisorId: advisor.id, clientId: sandra.id, title: "Quarterly Check-In - " + sandra.lastName, startTime: `${d(-8)}T10:00:00`, endTime: `${d(-8)}T11:00:00`, type: "Quarterly Check-In", status: "completed", notes: "Rebalanced from 65/35 to 60/40 allocation per request. Moved $200K from equities to intermediate bonds. Discussed Roth conversion ladder.", location: "Office" },
      { advisorId: advisor.id, clientId: lisaN.id, title: "Prospect Intro - " + lisaN.lastName, startTime: `${d(-12)}T09:00:00`, endTime: `${d(-12)}T10:30:00`, type: "Prospect Intro", status: "completed", notes: "Completed initial data gathering. Transferred $870K from Fidelity. Set up SEP IRA and individual brokerage. Discussed freelance income variability.", location: "Office - Conference Room A" },
    ];

    for (const m of additionalMeetings) {
      await db.insert(meetings).values(m).returning();
    }
    logger.info("Additional calendar meetings seeded.");
  }

  // ─── ENGAGEMENT DATA ───
  const engHasCompositeScore = await columnExists("engagement_scores", "composite_score");
  if (!engHasCompositeScore) {
    logger.info("Skipping engagement seed — engagement_scores table uses old schema (missing composite_score column). Run db:push to sync.");
  }
  const existingEngScores = engHasCompositeScore ? await db.select().from(engagementScores) : [1];
  if (existingEngScores.length === 0) {
    await db.insert(engagementScores).values([
      { clientId: robert.id, advisorId: advisor.id, compositeScore: 92, frequencyScore: 95, recencyScore: 90, diversityScore: 88, trend: "improving", breakdown: { meetings: 4, calls: 3, emails: 3, totalTouchpoints: 10 } },
      { clientId: margaret.id, advisorId: advisor.id, compositeScore: 65, frequencyScore: 50, recencyScore: 70, diversityScore: 75, trend: "stable", breakdown: { meetings: 1, calls: 2, emails: 1, totalTouchpoints: 4 } },
      { clientId: james.id, advisorId: advisor.id, compositeScore: 78, frequencyScore: 80, recencyScore: 85, diversityScore: 70, trend: "improving", breakdown: { meetings: 3, calls: 3, emails: 2, totalTouchpoints: 8 } },
      { clientId: lisa.id, advisorId: advisor.id, compositeScore: 42, frequencyScore: 35, recencyScore: 55, diversityScore: 40, trend: "declining", breakdown: { meetings: 1, calls: 0, emails: 1, totalTouchpoints: 2 } },
      { clientId: priya.id, advisorId: advisor.id, compositeScore: 85, frequencyScore: 80, recencyScore: 95, diversityScore: 80, trend: "improving", breakdown: { meetings: 2, calls: 2, emails: 2, totalTouchpoints: 6 } },
      { clientId: sandra.id, advisorId: advisor.id, compositeScore: 55, frequencyScore: 60, recencyScore: 45, diversityScore: 60, trend: "declining", breakdown: { meetings: 1, calls: 1, emails: 1, totalTouchpoints: 3 } },
      { clientId: lisaN.id, advisorId: advisor.id, compositeScore: 28, frequencyScore: 20, recencyScore: 30, diversityScore: 35, trend: "stable", breakdown: { meetings: 1, calls: 0, emails: 0, totalTouchpoints: 1 } },
    ]);

    await db.insert(engagementEvents).values([
      { clientId: robert.id, advisorId: advisor.id, eventType: "meeting", channel: "in_person", subject: "Q4 Annual Review", description: "Comprehensive year-end review", occurredAt: pastDate(90) },
      { clientId: robert.id, advisorId: advisor.id, eventType: "call", channel: "phone", subject: "New Year Check-In", description: "Quick call about market outlook", occurredAt: pastDate(68) },
      { clientId: robert.id, advisorId: advisor.id, eventType: "email", channel: "email", subject: "RMD Confirmation", description: "Confirmed RMD distribution", occurredAt: pastDate(55) },
      { clientId: robert.id, advisorId: advisor.id, eventType: "call", channel: "phone", subject: "RMD Discussion", description: "Discussed RMD timing", occurredAt: pastDate(24) },
      { clientId: robert.id, advisorId: advisor.id, eventType: "email", channel: "email", subject: "Estate Plan Referral", description: "Sent attorney referral", occurredAt: pastDate(22) },
      { clientId: james.id, advisorId: advisor.id, eventType: "meeting", channel: "in_person", subject: "RSU Planning", description: "Reviewed diversification plan", occurredAt: pastDate(55) },
      { clientId: james.id, advisorId: advisor.id, eventType: "email", channel: "email", subject: "Diversification Summary", description: "Sent plan summary", occurredAt: pastDate(54) },
      { clientId: james.id, advisorId: advisor.id, eventType: "call", channel: "phone", subject: "Market Check-In", description: "Tech sector update call", occurredAt: pastDate(29) },
      { clientId: james.id, advisorId: advisor.id, eventType: "meeting", channel: "video", subject: "Semi-Annual Review", description: "Reviewed NVDA concentration reduction progress", occurredAt: pastDate(5) },
      { clientId: priya.id, advisorId: advisor.id, eventType: "call", channel: "phone", subject: "New Baby Congrats", description: "Congratulations and initial planning", occurredAt: pastDate(60) },
      { clientId: priya.id, advisorId: advisor.id, eventType: "meeting", channel: "in_person", subject: "Post-Baby Review", description: "Comprehensive plan review after baby", occurredAt: pastDate(34) },
      { clientId: priya.id, advisorId: advisor.id, eventType: "email", channel: "email", subject: "Insurance Follow-Up", description: "Life insurance application update", occurredAt: pastDate(16) },
      { clientId: priya.id, advisorId: advisor.id, eventType: "call", channel: "phone", subject: "Practice Buy-In", description: "Discussed financing options", occurredAt: pastDate(15) },
      { clientId: lisa.id, advisorId: advisor.id, eventType: "meeting", channel: "video", subject: "529 Plan Review", description: "Reviewed college savings progress", occurredAt: pastDate(39) },
      { clientId: sandra.id, advisorId: advisor.id, eventType: "meeting", channel: "in_person", subject: "Rebalance Review", description: "Quarterly portfolio review", occurredAt: pastDate(8) },
      { clientId: lisaN.id, advisorId: advisor.id, eventType: "meeting", channel: "in_person", subject: "Onboarding", description: "Initial onboarding and data gathering", occurredAt: pastDate(12) },
    ]);

    await db.insert(intentSignals).values([
      { clientId: robert.id, advisorId: advisor.id, signalType: "estate_planning", strength: "high", title: "Estate Plan Update Intent", description: "Robert has mentioned trust amendments and beneficiary updates in recent meetings. Attorney referral sent.", evidence: [{ source: "meeting_notes", detail: "Discussed trust amendments at Q4 review" }, { source: "email", detail: "Requested attorney referral for estate updates" }] },
      { clientId: robert.id, advisorId: advisor.id, signalType: "charitable_giving", strength: "high", title: "Increased Charitable Giving", description: "Both Robert and Margaret expressed interest in expanding charitable giving through QCDs and DAF.", evidence: [{ source: "meeting_notes", detail: "Margaret wants to increase QCDs to $105K" }, { source: "activity", detail: "Researching DAF providers" }] },
      { clientId: james.id, advisorId: advisor.id, signalType: "risk_management", strength: "medium", title: "Concentration Risk Awareness", description: "James is aware of NVDA concentration but moving slowly on diversification. 10b5-1 plan under consideration.", evidence: [{ source: "portfolio_analysis", detail: "NVDA at 30% of portfolio" }] },
      { clientId: priya.id, advisorId: advisor.id, signalType: "major_purchase", strength: "high", title: "Practice Buy-In Consideration", description: "Priya is actively evaluating a $400K buy-in at Emory Healthcare practice. Needs financing analysis.", evidence: [{ source: "call_notes", detail: "Discussed practice buy-in financing March 1" }] },
      { clientId: priya.id, advisorId: advisor.id, signalType: "insurance_need", strength: "medium", title: "Life Insurance Application Pending", description: "Life insurance application submitted to Northwestern Mutual. Underwriting in progress.", evidence: [{ source: "email", detail: "Application submitted 3 weeks ago" }] },
      { clientId: sandra.id, advisorId: advisor.id, signalType: "retirement_planning", strength: "medium", title: "Social Security Timing Decision", description: "Sandra approaching Social Security claiming decision. Needs analysis of optimal timing.", evidence: [{ source: "meeting_notes", detail: "Discussed claiming strategies at last review" }] },
      { clientId: lisa.id, advisorId: advisor.id, signalType: "disengagement_risk", strength: "high", title: "Low Engagement Warning", description: "Lisa has had minimal contact in recent months. Only one meeting in last quarter with no follow-up.", evidence: [{ source: "engagement_data", detail: "Only 2 touchpoints in 90 days" }] },
    ]);

    await db.insert(nextBestActions).values([
      { clientId: robert.id, advisorId: advisor.id, actionType: "meeting", priority: 90, title: "Schedule DAF Setup Meeting", description: "Set up donor-advised fund with Robert and Margaret to execute charitable giving strategy", reasoning: "Both clients expressed strong interest in expanding charitable giving. DAF setup is time-sensitive for tax year planning.", category: "planning", estimatedImpact: "high", dueDate: d(14) },
      { clientId: robert.id, advisorId: advisor.id, actionType: "task", priority: 85, title: "Process Q2 RMD Distribution", description: "Initiate $48K RMD distribution from Traditional IRA per Robert's Q1 preference", reasoning: "RMD deadline approaching. Robert prefers early distribution.", category: "compliance", estimatedImpact: "high", dueDate: d(30) },
      { clientId: james.id, advisorId: advisor.id, actionType: "call", priority: 75, title: "Follow Up on 10b5-1 Plan", description: "Call James to discuss 10b5-1 plan eligibility and trading window for NVDA diversification", reasoning: "Concentration risk remains elevated. Systematic plan would automate diversification.", category: "outreach", estimatedImpact: "medium", dueDate: d(7) },
      { clientId: priya.id, advisorId: advisor.id, actionType: "email", priority: 80, title: "Send Practice Buy-In Analysis", description: "Prepare and send detailed financial analysis of $400K practice buy-in impact on retirement plan", reasoning: "Priya actively evaluating this decision. Timely analysis will demonstrate value.", category: "planning", estimatedImpact: "high", dueDate: d(5) },
      { clientId: priya.id, advisorId: advisor.id, actionType: "call", priority: 70, title: "Check Insurance Underwriting Status", description: "Follow up with Northwestern Mutual on $2M term life underwriting decision", reasoning: "Application submitted 3+ weeks ago. Client expecting update.", category: "outreach", estimatedImpact: "medium", dueDate: d(3) },
      { clientId: lisa.id, advisorId: advisor.id, actionType: "call", priority: 95, title: "Re-engagement Call - Lisa Chen", description: "Proactive check-in call with Lisa to discuss 529 progress and upcoming milestones", reasoning: "Engagement score dropping. Only 2 touchpoints in 90 days. Risk of disengagement.", category: "outreach", estimatedImpact: "high", dueDate: d(2) },
      { clientId: sandra.id, advisorId: advisor.id, actionType: "meeting", priority: 65, title: "Social Security Analysis Presentation", description: "Prepare Social Security claiming analysis for upcoming planning session", reasoning: "Nearing claiming decision. Comprehensive analysis needed.", category: "planning", estimatedImpact: "medium", dueDate: d(10) },
      { clientId: lisaN.id, advisorId: advisor.id, actionType: "email", priority: 60, title: "Send Welcome Package Materials", description: "Send remaining onboarding documents and investment policy statement draft", reasoning: "New client onboarding in progress. Keep momentum going.", category: "onboarding", estimatedImpact: "medium", dueDate: d(4) },
    ]);
    logger.info("Engagement data seeded (scores, events, signals, actions).");
  }

  // ─── APPROVAL RULES & ITEMS ───
  const existingApprovalRuleRows = await db.select().from(approvalRules);
  if (existingApprovalRuleRows.length === 0) {
    await db.insert(approvalRules).values([
      { itemType: "trade", autoApproveConditions: { maxAmount: 50000 }, requiredReviewerRole: "compliance_officer", slaHours: 4, escalationRole: "chief_compliance_officer" },
      { itemType: "account_opening", autoApproveConditions: {}, requiredReviewerRole: "operations_manager", slaHours: 24, escalationRole: "branch_manager" },
      { itemType: "wire_transfer", autoApproveConditions: { maxAmount: 10000 }, requiredReviewerRole: "compliance_officer", slaHours: 2, escalationRole: "chief_compliance_officer" },
      { itemType: "fee_adjustment", autoApproveConditions: {}, requiredReviewerRole: "branch_manager", slaHours: 48 },
      { itemType: "document_update", autoApproveConditions: {}, requiredReviewerRole: "operations_manager", slaHours: 72 },
    ]);
    logger.info("Approval rules seeded.");
  }

  const existingApprovalItemRows = await db.select().from(approvalItems);
  if (existingApprovalItemRows.length === 0) {
    const robertIndividual = allAccounts.find(a => a.clientId === robert.id && a.accountType === "Individual");
    const robertIRA = allAccounts.find(a => a.clientId === robert.id && a.accountType === "Traditional IRA");
    const jamesIndividual = allAccounts.find(a => a.clientId === james.id && a.accountType === "Individual");
    const priyaIndividual = allAccounts.find(a => a.clientId === priya.id && a.accountType === "Individual");

    await db.insert(approvalItems).values([
      { itemType: "trade", entityType: "account", entityId: robertIndividual?.id, title: "Large Equity Rebalance - Henderson Individual", description: "Sell $200K in large-cap equities and purchase intermediate bond ETFs to shift allocation from 65/35 to 60/40", payload: { accountName: "Henderson Individual", tradeAmount: 200000, sellPositions: ["VTI", "AAPL"], buyPositions: ["BND", "VCIT"], rationale: "Client-requested allocation shift to more conservative posture" }, status: "pending", priority: "high", submittedBy: advisor.id },
      { itemType: "wire_transfer", entityType: "account", entityId: robertIRA?.id, title: "RMD Distribution Wire - Henderson IRA", description: "Wire $48,000 RMD distribution from Traditional IRA to Bank of America checking account", payload: { amount: 48000, sourceAccount: "Henderson Traditional IRA", destinationBank: "Bank of America", routingNumber: "***6789", reason: "2026 Required Minimum Distribution" }, status: "pending", priority: "high", submittedBy: advisor.id },
      { itemType: "account_opening", entityType: "client", entityId: priya.id, title: "New 529 Plan - Patel (Aria)", description: "Open Georgia 529 plan for baby Aria Patel. Initial contribution $10,000. Age-based aggressive allocation.", payload: { planType: "529", state: "Georgia", beneficiary: "Aria Patel", initialContribution: 10000, allocationStrategy: "age-based-aggressive" }, status: "pending", priority: "normal", submittedBy: advisor.id },
      { itemType: "trade", entityType: "account", entityId: jamesIndividual?.id, title: "NVDA Diversification Sale - Chen", description: "Sell 3,750 shares NVDA (25% of Q1 vesting) per systematic diversification plan. Reinvest in QQQ and VGT.", payload: { accountName: "Chen Individual Brokerage", sellTicker: "NVDA", sellShares: 3750, estimatedProceeds: 280000, buyAllocations: [{ ticker: "QQQ", pct: 60 }, { ticker: "VGT", pct: 40 }] }, status: "pending", priority: "normal", submittedBy: advisor.id },
      { itemType: "fee_adjustment", entityType: "client", entityId: robert.id, title: "Fee Reduction - Henderson Household", description: "Reduce advisory fee from 85bps to 75bps based on AUM crossing $4.5M threshold", payload: { currentFee: "0.85%", proposedFee: "0.75%", totalAum: 4850000, feeScheduleTier: "$4.5M+", annualImpact: -4850 }, status: "pending", priority: "low", submittedBy: advisor.id },
      { itemType: "trade", entityType: "account", entityId: robertIndividual?.id, title: "Tax-Loss Harvest - Henderson", description: "Sell ARKK position at $15K loss, replace with QQQM to maintain exposure while harvesting loss", payload: { accountName: "Henderson Individual", sellTicker: "ARKK", estimatedLoss: -15000, replacementTicker: "QQQM", washSaleCompliant: true }, status: "approved", priority: "normal", submittedBy: advisor.id, reviewedBy: advisor.id, comments: "Approved. Wash sale rules verified - no ARKK purchases in last 30 days." },
      { itemType: "wire_transfer", entityType: "account", entityId: priyaIndividual?.id, title: "Monthly Contribution - Patel SEP IRA", description: "Process monthly $5,000 SEP IRA contribution via ACH from Wells Fargo checking", payload: { amount: 5000, sourceBank: "Wells Fargo", destinationAccount: "Patel SEP IRA", frequency: "monthly" }, status: "approved", priority: "low", submittedBy: advisor.id, reviewedBy: advisor.id, comments: "Recurring contribution. Standing approval in place." },
      { itemType: "document_update", entityType: "client", entityId: robert.id, title: "Beneficiary Update - Henderson IRA", description: "Update beneficiary designation on Traditional IRA from individual beneficiaries to Henderson Family Trust", payload: { accountName: "Henderson Traditional IRA", currentBeneficiary: "Margaret Henderson (100%)", newBeneficiary: "Henderson Family Revocable Trust", requiresNotarization: true }, status: "rejected", priority: "normal", submittedBy: advisor.id, reviewedBy: advisor.id, comments: "Rejected - trust document not yet finalized. Resubmit after trust amendments are complete." },
    ]);
    logger.info("Approval items seeded.");
  }

  // ─── REPORT ARTIFACTS ───
  const existingReportArtifactRows = await db.select().from(reportArtifacts);
  if (existingReportArtifactRows.length === 0) {
    const seededTemplates = await db.select().from(reportTemplates);
    const clientSummaryTmpl = seededTemplates.find(t => t.templateType === "client_summary");
    const retirementTmpl = seededTemplates.find(t => t.templateType === "retirement_planning");
    const meetingRecapTmpl = seededTemplates.find(t => t.templateType === "meeting_recap");
    const complianceTmpl = seededTemplates.find(t => t.templateType === "planning_review");

    const reportData: (typeof reportArtifacts.$inferInsert)[] = [];

    if (clientSummaryTmpl) {
      reportData.push({
        templateId: clientSummaryTmpl.id, clientId: robert.id, householdId: hh1?.id ?? null, advisorId: advisor.id, createdBy: advisor.id,
        status: "final", reportName: "Henderson Household Summary - Q1 2026", reportType: "client_summary",
        content: { sections: clientSummaryTmpl.sections, generatedData: { totalAum: "$4,850,000", ytdReturn: "8.2%", openTasks: 3 } },
        draftTitle: "Henderson Household Summary - Q1 2026",
        fullDraftText: "This report provides a comprehensive overview of the Henderson household portfolio as of Q1 2026. Total assets under management stand at $4.85M across 4 accounts. Year-to-date return is 8.2%, outperforming the benchmark by 1.1%. Key action items include estate plan updates, charitable giving strategy implementation, and Q2 RMD processing.",
        wordCount: 450,
      });
    }

    if (retirementTmpl) {
      reportData.push({
        templateId: retirementTmpl.id, clientId: sandra.id, householdId: hh4?.id ?? null, advisorId: advisor.id, createdBy: advisor.id,
        status: "draft", reportName: `${sandra.lastName} Retirement Planning Review`, reportType: "retirement_planning",
        content: { sections: retirementTmpl.sections, generatedData: { totalAum: "$3,100,000", projectedRetirementIncome: "$124,000/yr" } },
        draftTitle: `${sandra.lastName} Retirement Planning Review`,
        fullDraftText: `Draft retirement planning review for ${sandra.firstName} ${sandra.lastName}. Current AUM of $3.1M with a 60/40 allocation after recent rebalance. Social Security claiming analysis pending. Projected retirement income of $124K annually based on current trajectory. Roth conversion ladder analysis included.`,
        wordCount: 380,
      });
    }

    if (meetingRecapTmpl) {
      reportData.push({
        templateId: meetingRecapTmpl.id, clientId: james.id, advisorId: advisor.id, createdBy: advisor.id,
        status: "final", reportName: "Chen Semi-Annual Review Recap", reportType: "meeting_recap",
        content: { sections: meetingRecapTmpl.sections, generatedData: { meetingDate: d(-5), attendees: ["James Chen"], duration: "60 min" } },
        draftTitle: "Chen Semi-Annual Review Recap",
        fullDraftText: "Meeting recap for James Chen semi-annual review. NVDA concentration reduced from 40% to 30% through systematic quarterly sales. Discussed 10b5-1 plan eligibility for next phase. 529 contributions on track. Next diversification tranche scheduled for Q2.",
        wordCount: 320,
      });
      reportData.push({
        templateId: meetingRecapTmpl.id, clientId: priya.id, advisorId: advisor.id, createdBy: advisor.id,
        status: "final", reportName: "Patel Post-Baby Review Recap", reportType: "meeting_recap",
        content: { sections: meetingRecapTmpl.sections, generatedData: { meetingDate: "2026-02-10", attendees: ["Priya Patel"], duration: "60 min" } },
        draftTitle: "Patel Post-Baby Review Recap",
        fullDraftText: "Meeting recap for Priya Patel post-baby financial review. Key decisions: 529 plan setup for baby Aria ($10K initial), $2M term life insurance application submitted to Northwestern Mutual, beneficiary updates pending. Practice buy-in at Emory under evaluation ($400K).",
        wordCount: 290,
      });
    }

    if (complianceTmpl) {
      reportData.push({
        templateId: complianceTmpl.id, advisorId: advisor.id, createdBy: advisor.id,
        status: "draft", reportName: "Q1 2026 Compliance Status Report", reportType: "planning_review",
        content: { sections: complianceTmpl.sections, generatedData: { reviewPeriod: "Q1 2026", itemsReviewed: 12, pendingItems: 3 } },
        draftTitle: "Q1 2026 Compliance Status Report",
        fullDraftText: "Quarterly compliance review for Q1 2026. 12 compliance items reviewed, 9 resolved, 3 pending action. Key items: Henderson beneficiary update blocked pending trust finalization, Chen concentrated position documentation needed, Patel insurance verification in progress.",
        wordCount: 260,
      });
    }

    for (const r of reportData) {
      await db.insert(reportArtifacts).values(r);
    }
    logger.info("Report artifacts seeded.");
  }

  // ─── WORKFLOW DEFINITIONS & INSTANCES ───
  const wfDefsExist = await tableExists("workflow_definitions");
  if (wfDefsExist) {
    const existingWfDefs = await db.select().from(workflowDefinitions);
    if (existingWfDefs.length === 0) {
      const [meetingLifecycleDef] = await db.insert(workflowDefinitions).values({
        name: "Meeting Lifecycle", slug: "meeting-lifecycle", description: "Automates the full meeting lifecycle: pre-meeting prep, post-meeting notes generation, and follow-up task creation",
        category: "meetings", triggerEvent: "meeting.completed", isActive: true, version: 1,
        steps: [
          { name: "Generate Meeting Summary", type: "ai_prompt", config: { prompt: "Summarize the meeting notes and key decisions", outputKey: "meetingSummary" } },
          { name: "Create Follow-Up Tasks", type: "action", config: { action: "create_tasks", source: "meetingSummary.actionItems" } },
          { name: "Send Recap Email", type: "notification", config: { channel: "email", template: "meeting_recap", recipients: "attendees" } },
        ],
        gates: [{ name: "Advisor Review", type: "approval", afterStep: 0, ownerId: "advisor", description: "Review AI-generated summary before distributing" }],
      }).returning();

      const [clientOnboardingDef] = await db.insert(workflowDefinitions).values({
        name: "Client Onboarding", slug: "client-onboarding", description: "Guides new client onboarding with document collection, account setup, and initial planning",
        category: "onboarding", triggerEvent: "client.created", isActive: true, version: 1,
        steps: [
          { name: "Send Welcome Package", type: "notification", config: { channel: "email", template: "welcome_package" } },
          { name: "Generate Document Checklist", type: "action", config: { action: "create_checklist", template: "new_client" } },
          { name: "Schedule Discovery Meeting", type: "action", config: { action: "schedule_meeting", type: "Discovery" } },
          { name: "Create IPS Draft", type: "ai_prompt", config: { prompt: "Generate investment policy statement draft based on discovery responses", outputKey: "ipsDraft" } },
        ],
        gates: [{ name: "Documents Complete", type: "condition", afterStep: 1, condition: "checklist.completion >= 80%", description: "Wait until 80% of required documents are received" }],
      }).returning();

      const [rebalanceApprovalDef] = await db.insert(workflowDefinitions).values({
        name: "Rebalance Approval", slug: "rebalance-approval", description: "Routes rebalance proposals through compliance review and client approval before execution",
        category: "trading", triggerEvent: "rebalance.proposed", isActive: true, version: 1,
        steps: [
          { name: "Validate Compliance", type: "action", config: { action: "compliance_check", rules: ["concentration_limit", "suitability", "wash_sale"] } },
          { name: "Generate Trade Summary", type: "ai_prompt", config: { prompt: "Summarize proposed trades with rationale and expected impact", outputKey: "tradeSummary" } },
          { name: "Execute Trades", type: "action", config: { action: "execute_trades", source: "rebalance.tradeList" } },
          { name: "Send Confirmation", type: "notification", config: { channel: "email", template: "trade_confirmation", recipients: "client" } },
        ],
        gates: [
          { name: "Compliance Approval", type: "approval", afterStep: 0, ownerId: "compliance_officer", description: "Compliance review of proposed trades" },
          { name: "Client Consent", type: "approval", afterStep: 1, ownerId: "client", description: "Client approval of trade summary" },
        ],
      }).returning();

      await db.insert(workflowInstances).values([
        { definitionId: meetingLifecycleDef.id, advisorId: advisor.id, clientId: james.id, status: "completed", currentStepIndex: 3, triggerPayload: { meetingId: "semi-annual-review", meetingType: "Semi-Annual Review" }, context: { meetingSummary: "Reviewed NVDA concentration. Down to 30%. Next tranche Q2.", tasksCreated: 2 }, startedAt: pastDate(5), completedAt: pastDate(4) },
        { definitionId: clientOnboardingDef.id, advisorId: advisor.id, clientId: lisaN.id, status: "in_progress", currentStepIndex: 2, triggerPayload: { clientName: `${lisaN.firstName} ${lisaN.lastName}`, clientType: "individual" }, context: { welcomePackageSent: true, checklistCreated: true, documentsReceived: 6, documentsRequired: 10 }, startedAt: pastDate(12) },
        { definitionId: rebalanceApprovalDef.id, advisorId: advisor.id, clientId: sandra.id, status: "completed", currentStepIndex: 4, triggerPayload: { accountId: "individual-account", currentAllocation: "65/35", targetAllocation: "60/40" }, context: { compliancePassed: true, tradeCount: 4, totalAmount: 200000 }, startedAt: pastDate(10), completedAt: pastDate(8) },
      ]);
      logger.info("Workflow definitions and instances seeded.");
    }
  } else {
    logger.info("Skipping workflow seed — workflow_definitions table does not exist yet.");
  }

  // ─── DISCOVERY SESSIONS ───
  const dsTableExists = await tableExists("discovery_sessions");
  if (dsTableExists) {
    const existingDSessions = await db.select().from(discoverySessions);
    if (existingDSessions.length === 0) {
      const dqTableExists = await tableExists("discovery_questionnaires");
      let questionnaireId: string | null = null;
      if (dqTableExists) {
        const questionnaires = await db.select().from(discoveryQuestionnaires);
        const individualQ = questionnaires.find(q => q.clientType === "individual");
        questionnaireId = individualQ?.id ?? null;
      }

      await db.insert(discoverySessions).values([
        {
          advisorId: advisor.id, clientId: robert.id, questionnaireId, clientType: "individual", status: "completed",
          prospectName: "Robert Henderson", prospectEmail: robert.email,
          wizardResponses: {
            investmentGoals: "Preserve wealth and generate income for retirement. Maximize charitable giving through DAF and QCDs.",
            riskTolerance: "moderate-aggressive",
            timeHorizon: "10-15 years",
            annualIncome: "Retired — pension + Social Security + portfolio income",
            existingAssets: "$4.85M across multiple accounts",
            retirementAge: "Already retired at 65",
            concerns: "Estate planning, tax-efficient charitable giving, RMD optimization",
          },
          summary: "Robert Henderson is a retired CEO with $4.85M AUM. Primary focus areas: estate plan updates, charitable giving expansion via DAF and QCDs, and RMD optimization. Moderate-aggressive risk tolerance with 10-15 year horizon.",
          engagementPathway: "comprehensive_planning",
          recommendedNextSteps: ["Update revocable trust with attorney", "Set up donor-advised fund", "Optimize QCD strategy for 2026", "Process Q2 RMD distribution"],
        },
        {
          advisorId: advisor.id, clientId: james.id, questionnaireId, clientType: "individual", status: "in_progress",
          prospectName: "James Chen", prospectEmail: james.email,
          wizardResponses: {
            investmentGoals: "Diversify concentrated stock position while maintaining growth. Build college fund for children.",
            riskTolerance: "aggressive",
            timeHorizon: "20+ years",
            annualIncome: "$580,000 (base + RSU vesting)",
            existingAssets: "$3.2M including concentrated NVDA position",
          },
          currentSection: 3,
          talkingPoints: "Focus on 10b5-1 plan eligibility for systematic NVDA diversification. Review 529 contribution limits and age-based allocation changes.",
        },
        {
          advisorId: advisor.id, clientType: "individual", status: "in_progress",
          prospectName: "David Park", prospectEmail: "david.park@example.com",
          wizardResponses: {
            investmentGoals: "Recently sold tech startup for $5M. Need comprehensive wealth management plan.",
            riskTolerance: "aggressive",
            timeHorizon: "20+ years",
            annualIncome: "$0 currently (exploring next venture)",
            existingAssets: "$5M cash from exit, $200K in 401(k) rollover",
          },
          currentSection: 2,
        },
        {
          advisorId: advisor.id, clientId: priya.id, questionnaireId, clientType: "individual", status: "completed",
          prospectName: "Priya Patel", prospectEmail: priya.email,
          wizardResponses: {
            investmentGoals: "Balance practice growth with personal financial security. New parent needs comprehensive plan.",
            riskTolerance: "moderate-aggressive",
            timeHorizon: "25+ years",
            annualIncome: "$320,000",
            existingAssets: "$950K across multiple accounts",
            lifeChanges: "New baby (January 2026), potential practice buy-in ($400K)",
          },
          summary: "Priya Patel is a physician with strong income and long time horizon. Key planning needs: life insurance, 529 setup for new baby, practice buy-in financing analysis, and estate planning basics.",
          engagementPathway: "comprehensive_planning",
          recommendedNextSteps: ["Set up 529 plan for Aria", "Finalize $2M term life policy", "Analyze practice buy-in financing options", "Create basic estate plan"],
        },
      ]);
      logger.info("Discovery sessions seeded.");
    }
  } else {
    logger.info("Skipping discovery seed — discovery_sessions table does not exist yet.");
  }
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ${tableName})`
  );
  const rows = (result as unknown as { rows?: { exists: boolean }[] }).rows ?? result as unknown as { exists: boolean }[];
  return Array.isArray(rows) && rows.length > 0 && rows[0].exists === true;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${tableName} AND column_name = ${columnName})`
  );
  const rows = (result as unknown as { rows?: { exists: boolean }[] }).rows ?? result as unknown as { exists: boolean }[];
  return Array.isArray(rows) && rows.length > 0 && rows[0].exists === true;
}
