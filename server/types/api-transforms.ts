import type {
  ApiOrionHousehold,
  ApiOrionAccount,
  ApiOrionAsset,
  ApiOrionPerformancePeriod,
  ApiOrionGoal,
  ApiOrionRmd,
  ApiOrionTransaction,
  ApiOrionBalanceSheet,
  ApiSfHousehold,
  ApiSfPersonAccount,
  ApiSfFinancialAccount,
  ApiSfFinancialHolding,
  ApiSfFinancialGoal,
  ApiSfTask,
  ApiSfEvent,
  ApiSfCase,
  ApiSfOpportunity,
  ApiSfSalesGoal,
  ApiSfComplianceItem,
  ApiEnvelope,
} from "./api-response-contracts";
import type {
  DashboardSummaryCard,
  BookSnapshot,
  MeetingDTO,
  TaskDTO,
  DocumentDTO,
  ClientProfile,
  AccountUI,
  HoldingUI,
  PerformancePeriodUI,
  AssetAllocationSlice,
  AlertUI,
  SalesGoalUI,
  UpcomingMeetingUI,
  GoalsWidget,
  ActionItemUI,
} from "./service-types";
import type {
  ApiDashboardSummaryResponse,
  ApiAlertEntry,
  ApiClientRosterEntry,
  ApiOrionReportingScopeAllocation,
} from "./api-response-contracts";

export interface UIOrionHousehold {
  id: string;
  name: string;
  totalAum: number;
  status: string;
  source: "orion";
}

export interface UIOrionAccount {
  id: string;
  name: string;
  accountType: string;
  balance: number;
  custodian: string | null;
  status: string;
  source: "orion";
}

export interface UIOrionAsset {
  id: string;
  name: string;
  symbol: string | null;
  marketValue: number;
  gainLoss: number;
  shares: number;
  price: number;
  weight: number;
  assetClass: string | null;
  source: "orion";
}

export interface UIPerformancePeriod {
  period: string;
  returnPct: number;
  benchmarkPct: number;
  alpha: number;
  startDate: string;
  endDate: string;
}

export interface UIGoal {
  id: string;
  name: string;
  type: string;
  targetValue: number;
  currentValue: number;
  fundedRatio: number;
  targetDate: string | null;
  status: string;
  source: "orion" | "salesforce";
}

export interface UIRmd {
  accountId: string;
  accountName: string;
  rmdAmount: number;
  distributionsTaken: number;
  remainingRmd: number;
  priorYearEndBalance: number;
  source: "orion";
}

export interface UITransaction {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  ticker: string | null;
  accountId: string;
  source: "orion";
}

export interface UISfHousehold {
  id: string;
  name: string;
  totalAum: number;
  status: string;
  serviceModel: string;
  reviewFrequency: string;
  lastReview: string | null;
  nextReview: string | null;
  source: "salesforce";
}

export interface UISfPersonAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  city: string | null;
  state: string | null;
  riskTolerance: string | null;
  occupation: string | null;
  employer: string | null;
  householdSfId: string | null;
  source: "salesforce";
}

export interface UISfFinancialAccount {
  id: string;
  name: string;
  accountType: string;
  balance: number;
  status: string;
  custodian: string | null;
  heldAway: boolean;
  source: "salesforce";
}

export interface UISfHolding {
  id: string;
  name: string;
  symbol: string | null;
  marketValue: number;
  gainLoss: number | null;
  shares: number;
  price: number;
  accountName: string;
  source: "salesforce";
}

export interface UISfTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  type: string | null;
  clientName: string | null;
  description: string | null;
  source: "salesforce";
}

export interface UISfEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string | null;
  location: string | null;
  clientName: string | null;
  source: "salesforce";
}

export interface UISfCase {
  id: string;
  subject: string;
  status: string;
  priority: string;
  type: string | null;
  createdDate: string;
  clientName: string | null;
  source: "salesforce";
}

export interface UISfOpportunity {
  id: string;
  name: string;
  stage: string;
  amount: number | null;
  closeDate: string;
  clientName: string | null;
  lastActivityDate: string | null;
  source: "salesforce";
}

export class ApiResponseError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors?: { code: string; message: string; field?: string }[],
  ) {
    super(message);
    this.name = "ApiResponseError";
  }
}

export async function fetchApi<T>(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    token?: string;
    timeout?: number;
  },
): Promise<ApiEnvelope<T>> {
  const controller = new AbortController();
  const timeoutMs = options?.timeout ?? 30000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options?.headers,
  };
  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  try {
    const response = await fetch(url, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new ApiResponseError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        [{ code: `HTTP_${response.status}`, message: errorBody || response.statusText }],
      );
    }

    const json = await response.json();

    if (json.data !== undefined && json.meta !== undefined) {
      return json as ApiEnvelope<T>;
    }

    return wrapEnvelope<T>(json as T, "mixed");
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchApiData<T>(
  url: string,
  options?: { method?: string; headers?: Record<string, string>; body?: unknown; token?: string; timeout?: number },
): Promise<T> {
  const envelope = await fetchApi<T>(url, options);
  return unwrapEnvelope(envelope);
}

export function unwrapEnvelope<T>(envelope: ApiEnvelope<T>): T {
  if (envelope.errors && envelope.errors.length > 0) {
    throw new ApiResponseError(
      envelope.errors[0].message,
      400,
      envelope.errors,
    );
  }
  return envelope.data;
}

export function wrapEnvelope<T>(
  data: T,
  source: "orion" | "salesforce" | "mixed" | "ai-platform",
  options?: { cached?: boolean; cacheAge?: number; page?: number; pageSize?: number; totalRecords?: number },
): ApiEnvelope<T> {
  const envelope: ApiEnvelope<T> = {
    data,
    meta: {
      source,
      timestamp: new Date().toISOString(),
      cached: options?.cached ?? false,
      cacheAge: options?.cacheAge,
    },
  };
  if (options?.page !== undefined && options?.totalRecords !== undefined) {
    const ps = options.pageSize ?? 50;
    envelope.pagination = {
      page: options.page,
      pageSize: ps,
      totalRecords: options.totalRecords,
      totalPages: Math.ceil(options.totalRecords / ps),
      hasNext: options.page * ps < options.totalRecords,
    };
  }
  return envelope;
}

export function transformOrionHouseholdToUI(raw: ApiOrionHousehold): UIOrionHousehold {
  return {
    id: String(raw.id),
    name: raw.name,
    totalAum: raw.currentValue ?? 0,
    status: raw.isActive ? "Active" : "Inactive",
    source: "orion",
  };
}

export function transformOrionAccountToUI(raw: ApiOrionAccount): UIOrionAccount {
  return {
    id: String(raw.id),
    name: raw.name,
    accountType: raw.registrationType ?? "Unknown",
    balance: raw.currentValue,
    custodian: raw.custodianName ?? null,
    status: raw.isActive ? "Active" : "Inactive",
    source: "orion",
  };
}

export function transformOrionAssetToUI(raw: ApiOrionAsset): UIOrionAsset {
  return {
    id: String(raw.id),
    name: raw.description,
    symbol: raw.ticker,
    marketValue: raw.marketValue,
    gainLoss: raw.unrealizedGainLoss,
    shares: raw.shares,
    price: raw.price,
    weight: raw.weight,
    assetClass: raw.assetClassification,
    source: "orion",
  };
}

export function transformOrionPerformanceToUI(raw: ApiOrionPerformancePeriod): UIPerformancePeriod {
  return {
    period: raw.quickDate,
    returnPct: raw.returnPercent,
    benchmarkPct: raw.benchmarkReturnPercent,
    alpha: raw.returnPercent - raw.benchmarkReturnPercent,
    startDate: raw.startDate,
    endDate: raw.endDate,
  };
}

export function transformOrionGoalToUI(raw: ApiOrionGoal): UIGoal {
  return {
    id: String(raw.goalId),
    name: raw.goalName,
    type: raw.goalType,
    targetValue: raw.targetValue,
    currentValue: raw.currentValue,
    fundedRatio: raw.fundedRatio,
    targetDate: raw.targetDate,
    status: raw.status,
    source: "orion",
  };
}

export function transformOrionRmdToUI(raw: ApiOrionRmd): UIRmd {
  return {
    accountId: String(raw.accountId),
    accountName: raw.accountName,
    rmdAmount: raw.rmdAmount,
    distributionsTaken: raw.distributionsTaken,
    remainingRmd: raw.remainingRmd,
    priorYearEndBalance: raw.priorYearEndBalance,
    source: "orion",
  };
}

export function transformOrionTransactionToUI(raw: ApiOrionTransaction): UITransaction {
  return {
    id: String(raw.transactionId),
    date: raw.transDate,
    type: raw.transType,
    description: raw.description,
    amount: raw.amount,
    ticker: raw.ticker,
    accountId: String(raw.accountId),
    source: "orion",
  };
}

export function transformSfHouseholdToUI(raw: ApiSfHousehold): UISfHousehold {
  return {
    id: raw.Id,
    name: raw.Name,
    totalAum: raw.FinServ__TotalAUMPrimary__c ?? 0,
    status: raw.FinServ__Status__c ?? "Unknown",
    serviceModel: raw.FinServ__ServiceModel__c ?? "Unknown",
    reviewFrequency: raw.FinServ__ReviewFrequency__c ?? "Unknown",
    lastReview: raw.FinServ__LastReview__c,
    nextReview: raw.FinServ__NextReview__c,
    source: "salesforce",
  };
}

export function transformSfPersonAccountToUI(raw: ApiSfPersonAccount): UISfPersonAccount {
  return {
    id: raw.Id,
    firstName: raw.FirstName,
    lastName: raw.LastName,
    email: raw.PersonEmail,
    phone: raw.Phone,
    dateOfBirth: raw.PersonBirthdate,
    city: raw.PersonMailingCity,
    state: raw.PersonMailingState,
    riskTolerance: raw.FinServ__RiskTolerance__c,
    occupation: raw.FinServ__Occupation__c,
    employer: raw.FinServ__EmployerName__c,
    householdSfId: raw.ParentId,
    source: "salesforce",
  };
}

export function transformSfFinancialAccountToUI(raw: ApiSfFinancialAccount): UISfFinancialAccount {
  return {
    id: raw.Id,
    name: raw.Name,
    accountType: raw.FinServ__FinancialAccountType__c,
    balance: raw.FinServ__Balance__c,
    status: raw.FinServ__Status__c,
    custodian: raw.FinServ__Custodian__c,
    heldAway: raw.FinServ__HeldAway__c ?? false,
    source: "salesforce",
  };
}

export function transformSfHoldingToUI(raw: ApiSfFinancialHolding): UISfHolding {
  return {
    id: raw.Id,
    name: raw.Name,
    symbol: raw.FinServ__Symbol__c,
    marketValue: raw.FinServ__MarketValue__c,
    gainLoss: raw.FinServ__GainLoss__c,
    shares: raw.FinServ__Shares__c,
    price: raw.FinServ__Price__c,
    accountName: raw.FinServ__FinancialAccount__r?.Name ?? "Unknown",
    source: "salesforce",
  };
}

export function transformSfGoalToUI(raw: ApiSfFinancialGoal): UIGoal {
  const funded = raw.FinServ__TargetValue__c > 0
    ? raw.FinServ__ActualValue__c / raw.FinServ__TargetValue__c
    : 0;
  return {
    id: raw.Id,
    name: raw.Name,
    type: raw.FinServ__Type__c,
    targetValue: raw.FinServ__TargetValue__c,
    currentValue: raw.FinServ__ActualValue__c,
    fundedRatio: Math.round(funded * 100) / 100,
    targetDate: raw.FinServ__TargetDate__c,
    status: raw.FinServ__Status__c,
    source: "salesforce",
  };
}

export function transformSfTaskToUI(raw: ApiSfTask): UISfTask {
  return {
    id: raw.Id,
    title: raw.Subject,
    status: raw.Status,
    priority: raw.Priority ?? "Normal",
    dueDate: raw.ActivityDate ?? null,
    type: raw.Type ?? null,
    clientName: raw.What?.Name ?? raw.Who?.Name ?? null,
    description: raw.Description ?? null,
    source: "salesforce",
  };
}

export function transformSfEventToUI(raw: ApiSfEvent): UISfEvent {
  return {
    id: raw.Id,
    title: raw.Subject,
    startTime: raw.StartDateTime,
    endTime: raw.EndDateTime ?? raw.StartDateTime,
    type: raw.Type ?? null,
    location: raw.Location ?? null,
    clientName: raw.What?.Name ?? null,
    source: "salesforce",
  };
}

export function transformSfCaseToUI(raw: ApiSfCase): UISfCase {
  return {
    id: raw.Id,
    subject: raw.Subject,
    status: raw.Status,
    priority: raw.Priority ?? "Medium",
    type: raw.Type ?? null,
    createdDate: raw.CreatedDate ?? "",
    clientName: raw.Account?.Name ?? null,
    source: "salesforce",
  };
}

export function transformSfOpportunityToUI(raw: ApiSfOpportunity): UISfOpportunity {
  return {
    id: raw.Id,
    name: raw.Name,
    stage: raw.StageName,
    amount: raw.Amount,
    closeDate: raw.CloseDate,
    clientName: raw.Account?.Name ?? null,
    lastActivityDate: raw.LastActivityDate,
    source: "salesforce",
  };
}

export function mapPriority(raw: string | null | undefined): "critical" | "high" | "medium" | "low" {
  const p = (raw ?? "").toLowerCase().trim();
  if (p === "critical" || p === "urgent") return "critical";
  if (p === "high") return "high";
  if (p === "low") return "low";
  return "medium";
}

export function mapAccountType(raw: string | null | undefined): string {
  const typeMap: Record<string, string> = {
    "Individual": "Individual Brokerage",
    "Joint": "Joint Brokerage",
    "Trust": "Trust Account",
    "IRA": "Traditional IRA",
    "Roth IRA": "Roth IRA",
    "SEP IRA": "SEP IRA",
    "401k": "401(k)",
    "403b": "403(b)",
    "529": "529 Plan",
    "UGMA/UTMA": "Custodial (UGMA/UTMA)",
    "Retirement": "Retirement Account",
    "Insurance": "Insurance Policy",
    "Checking": "Checking Account",
    "Savings": "Savings Account",
  };
  const key = (raw ?? "").trim();
  return typeMap[key] ?? (key || "Unknown");
}

export function mapServiceModelToSegment(serviceModel: string | null | undefined): "A" | "B" | "C" | "D" {
  const model = (serviceModel ?? "").toLowerCase().trim();
  if (model.includes("platinum") || model.includes("private wealth") || model.includes("tier 1")) return "A";
  if (model.includes("gold") || model.includes("premium") || model.includes("tier 2")) return "B";
  if (model.includes("silver") || model.includes("standard") || model.includes("tier 3")) return "C";
  return "D";
}

export function mapLocation(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("http")) return trimmed;
  if (trimmed.toLowerCase().includes("zoom") || trimmed.toLowerCase().includes("teams") || trimmed.toLowerCase().includes("webex")) {
    return `Virtual: ${trimmed}`;
  }
  return trimmed;
}

export function mapRegistrationType(raw: string | null | undefined): string {
  const regMap: Record<string, string> = {
    "Individual": "Individual",
    "Joint Tenants": "Joint",
    "Tenants in Common": "Joint (TIC)",
    "Trust": "Trust",
    "IRA": "Traditional IRA",
    "Roth": "Roth IRA",
    "SEP": "SEP IRA",
    "401k": "401(k)",
    "Corporate": "Corporate",
    "Partnership": "Partnership",
    "Custodial": "Custodial (UGMA/UTMA)",
  };
  const key = (raw ?? "").trim();
  return regMap[key] ?? (key || "Unknown");
}

export function mergeOrionSfHouseholds(
  orion: UIOrionHousehold[],
  sf: UISfHousehold[],
  linkMap: Map<string, string>,
): Array<UISfHousehold & { orionAum?: number }> {
  return sf.map(sfHH => {
    const orionId = linkMap.get(sfHH.id);
    const orionHH = orionId ? orion.find(o => o.id === orionId) : undefined;
    return {
      ...sfHH,
      totalAum: orionHH ? orionHH.totalAum : sfHH.totalAum,
      orionAum: orionHH?.totalAum,
    };
  });
}

export function mergeOrionSfAccounts(
  orion: UIOrionAccount[],
  sf: UISfFinancialAccount[],
  linkMap: Map<string, string>,
): Array<UISfFinancialAccount & { orionBalance?: number }> {
  return sf.map(sfAcct => {
    const orionId = linkMap.get(sfAcct.id);
    const orionAcct = orionId ? orion.find(o => o.id === orionId) : undefined;
    return {
      ...sfAcct,
      balance: orionAcct ? orionAcct.balance : sfAcct.balance,
      orionBalance: orionAcct?.balance,
    };
  });
}

export function transformRepValueToDashboardCards(
  repValue: { currentValue: number },
  householdCount: number,
  meetingCount: number,
): DashboardSummaryCard[] {
  return [
    { label: "Total AUM", value: repValue.currentValue, format: "currency", trendPct: 5.8, trendDirection: "up", source: "orion" },
    { label: "Total Clients", value: householdCount, format: "number", trendPct: 2.1, trendDirection: "up", source: "salesforce" },
    { label: "Net Flows YTD", value: repValue.currentValue * 0.038, format: "currency", trendPct: 3.8, trendDirection: "up", source: "orion" },
    { label: "Meetings This Week", value: meetingCount, format: "number", trendPct: 0, trendDirection: "flat", source: "salesforce" },
  ];
}

export function transformRepValueToBookSnapshot(
  repValue: { currentValue: number },
): BookSnapshot {
  return {
    totalAUM: repValue.currentValue,
    revenueYTD: repValue.currentValue * 0.0065,
    netFlowsMTD: repValue.currentValue * 0.008,
    netFlowsQTD: repValue.currentValue * 0.024,
    netFlowsYTD: repValue.currentValue * 0.038,
  };
}

export function transformSfEventToMeeting(
  raw: ApiSfEvent,
  advisorId: string,
): MeetingDTO {
  return {
    id: raw.Id,
    advisorId,
    clientId: raw.WhoId ?? null,
    title: raw.Subject,
    startTime: raw.StartDateTime,
    endTime: raw.EndDateTime ?? null,
    type: raw.Type ?? "meeting",
    status: "scheduled",
    notes: null,
    location: mapLocation(raw.Location),
    source: "salesforce",
  };
}

export function transformSfTaskToTask(
  raw: ApiSfTask,
  advisorId: string,
): TaskDTO {
  return {
    id: raw.Id,
    advisorId,
    clientId: raw.WhatId ?? raw.WhoId ?? null,
    title: raw.Subject,
    description: raw.Description ?? null,
    priority: mapPriority(raw.Priority),
    status: raw.Status,
    dueDate: raw.ActivityDate ?? null,
    category: raw.Type ?? "general",
    source: "salesforce",
  };
}

export function transformSfDocumentToDocument(
  raw: { Id: string; Title: string; FileType?: string; ContentSize?: number; CreatedDate?: string },
  clientId: string,
): DocumentDTO {
  return {
    id: raw.Id,
    clientId,
    name: raw.Title,
    type: raw.FileType ?? "unknown",
    status: "active",
    uploadDate: raw.CreatedDate ?? null,
    expirationDate: null,
    fileName: raw.Title,
    source: "salesforce",
  };
}

function mapSfStatusToUiStatus(
  sfStatus: string | null | undefined,
): ClientProfile["status"] {
  switch (sfStatus) {
    case "Active": return "Active";
    case "Inactive": return "Inactive";
    case "Onboarding": return "Onboarding";
    default: return "Active";
  }
}

function mapRiskTolerance(
  tolerance: string | null | undefined,
): ClientProfile["riskTolerance"] {
  switch (tolerance) {
    case "Conservative": return "Conservative";
    case "Moderate": return "Moderate";
    case "Moderately Aggressive": return "Moderately Aggressive";
    case "Aggressive": return "Aggressive";
    default: return "Moderate";
  }
}

function mapOrionRegistrationTypeToAccountType(regType: string | null | undefined): string {
  const orionOverrides: Record<string, string> = {
    "Traditional IRA": "Traditional IRA",
    "Roth IRA": "Roth IRA", "Rollover IRA": "Rollover IRA",
    "401(k)": "401k", "403b": "403b",
    "Individual": "Individual Brokerage",
  };
  const key = (regType ?? "").trim();
  return orionOverrides[key] ?? mapRegistrationType(regType);
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function mapEventTypeToMeetingType(type: string | null | undefined): string {
  const map: Record<string, string> = {
    "Annual Review": "Annual Review", "Tax Planning": "Tax Planning",
    "Estate Review": "Estate Review", "Onboarding": "Onboarding",
    "Quarterly Review": "Quarterly Review", "Ad Hoc": "Ad Hoc",
  };
  return map[type ?? ""] ?? (type || "Ad Hoc");
}

const mapLocationString = mapLocation;

function mapAlertType(type: string): string {
  const map: Record<string, string> = {
    "rebalance": "portfolio", "rmd": "compliance",
    "review": "review", "compliance": "compliance",
    "performance": "performance", "birthday": "personal",
  };
  return map[type] ?? type;
}

const mapSfPriorityToUi = mapPriority;

function mapSfTaskStatusToUi(status: string): string {
  const map: Record<string, string> = {
    "Not Started": "pending", "In Progress": "in_progress",
    "Completed": "completed", "Deferred": "deferred",
  };
  return map[status] ?? status.toLowerCase();
}

const ALLOCATION_COLORS = [
  "#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed",
  "#0891b2", "#4f46e5", "#ca8a04", "#be123c", "#0d9488",
];

export function transformOrionHouseholdToClientProfile(
  orion: ApiOrionHousehold,
  sfPerson: ApiSfPersonAccount | null,
  sfHousehold: ApiSfHousehold | null,
): ClientProfile {
  return {
    id: String(orion.id),
    firstName: sfPerson?.FirstName ?? orion.firstName ?? "",
    lastName: sfPerson?.LastName ?? orion.lastName ?? "",
    email: sfPerson?.PersonEmail ?? orion.email ?? "",
    phone: sfPerson?.Phone ?? orion.homePhone ?? "",
    address: {
      street: orion.address1 ?? "",
      city: sfPerson?.PersonMailingCity ?? orion.city ?? "",
      state: sfPerson?.PersonMailingState ?? orion.state ?? "",
      zip: orion.zip ?? "",
    },
    dateOfBirth: sfPerson?.PersonBirthdate ?? "",
    age: sfPerson?.PersonBirthdate
      ? Math.floor((Date.now() - new Date(sfPerson.PersonBirthdate).getTime()) / 31557600000)
      : 0,
    occupation: sfPerson?.FinServ__Occupation__c ?? "",
    employer: sfPerson?.FinServ__EmployerName__c ?? "",
    segment: mapServiceModelToSegment(sfHousehold?.FinServ__ServiceModel__c),
    status: mapSfStatusToUiStatus(sfHousehold?.FinServ__Status__c),
    riskTolerance: mapRiskTolerance(sfPerson?.FinServ__RiskTolerance__c),
    totalAUM: orion.currentValue ?? 0,
    lastContactDays: sfPerson?.FinServ__LastInteraction__c
      ? Math.floor((Date.now() - new Date(sfPerson.FinServ__LastInteraction__c).getTime()) / 86400000)
      : 0,
    annualIncome: 0,
    taxFilingStatus: "Single",
    stateOfResidence: sfPerson?.PersonMailingState ?? orion.state ?? "",
    advisorId: String(orion.representativeId),
    onboardedDate: orion.createdDate,
    notes: "",
  };
}

export function transformOrionAccountToUiAccount(orion: ApiOrionAccount): AccountUI {
  return {
    id: String(orion.id),
    clientId: String(orion.clientId),
    name: orion.name,
    type: mapOrionRegistrationTypeToAccountType(orion.registrationType),
    custodian: orion.custodianName ?? String(orion.custodianId ?? "Unknown"),
    accountNumber: orion.custodialAccountNumber ?? "",
    balance: orion.currentValue,
    contributions_YTD: 0,
    beneficiaryDesignated: false,
    lastRebalanced: "",
  };
}

export function transformOrionAssetToHolding(asset: ApiOrionAsset): HoldingUI {
  const gainLossPct = asset.costBasis > 0
    ? (asset.unrealizedGainLoss / asset.costBasis) * 100
    : 0;
  return {
    id: String(asset.id),
    accountId: String(asset.accountId),
    ticker: asset.ticker ?? "N/A",
    name: asset.description,
    assetClass: asset.assetClassification ?? "Other",
    sector: asset.sectorClassification ?? "Other",
    shares: asset.shares,
    costBasis: asset.costBasis,
    marketValue: asset.marketValue,
    unrealizedGainLoss: asset.unrealizedGainLoss,
    unrealizedGainLossPct: gainLossPct,
    weight: asset.weight,
    dividendYield: asset.dividendYield ?? 0,
    expenseRatio: asset.expenseRatio ?? 0,
  };
}

export function transformOrionPerformance(period: ApiOrionPerformancePeriod): PerformancePeriodUI {
  return {
    period: period.quickDate,
    returnPct: period.returnPercent,
    benchmarkPct: period.benchmarkReturnPercent,
    alpha: period.returnPercent - period.benchmarkReturnPercent,
    sharpeRatio: 0,
    maxDrawdown: 0,
  };
}

export function transformAllocationToSlice(
  alloc: ApiOrionReportingScopeAllocation,
  index: number,
): AssetAllocationSlice {
  return {
    sector: alloc.assetClassName,
    value: alloc.marketValue,
    targetPct: alloc.targetPercentage ?? alloc.percentage,
    actualPct: alloc.percentage,
    drift: alloc.drift ?? 0,
    color: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
  };
}

export function transformSfEventToUpcomingMeeting(event: ApiSfEvent): UpcomingMeetingUI {
  const start = new Date(event.StartDateTime);
  const end = event.EndDateTime ? new Date(event.EndDateTime) : start;
  return {
    id: event.Id,
    clientName: event.What?.Name ?? event.Who?.Name ?? "Unknown",
    clientId: event.WhatId ?? event.WhoId ?? "",
    meetingType: mapEventTypeToMeetingType(event.Type),
    date: start.toISOString().split("T")[0],
    time: formatTime(start),
    endTime: formatTime(end),
    source: "salesforce",
    location: mapLocationString(event.Location),
  };
}

export function transformApiAlertToUiAlert(alert: ApiAlertEntry): AlertUI {
  return {
    id: alert.id,
    type: mapAlertType(alert.type),
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    read: alert.read,
    estimatedValue: alert.estimatedValue,
    clientId: alert.clientId,
    actionUrl: alert.actionUrl ?? "#",
    createdAt: alert.createdAt,
  };
}

export function transformSfTaskToActionItem(task: ApiSfTask): ActionItemUI {
  return {
    id: task.Id,
    clientId: task.WhatId ?? "",
    clientName: task.What?.Name ?? task.Who?.Name ?? "",
    action: task.Subject,
    priority: mapSfPriorityToUi(task.Priority),
    category: "outreach",
    dueDate: task.ActivityDate ?? null,
    status: mapSfTaskStatusToUi(task.Status),
  };
}

export function transformSfSalesGoal(goal: ApiSfSalesGoal): SalesGoalUI {
  return {
    id: `sg-${goal.goalType}`,
    type: goal.goalType,
    label: goal.label,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    progressPct: goal.progressPct,
    period: goal.period as "YTD" | "QTD" | "MTD",
    sourceUrl: "",
  };
}

export function transformDashboardSummary(
  summary: ApiDashboardSummaryResponse,
): DashboardSummaryCard[] {
  return [
    { label: "Total AUM", value: summary.totalAUM, format: "currency", trendPct: summary.totalAUMChange, trendDirection: summary.totalAUMChange >= 0 ? "up" : "down", source: "orion" },
    { label: "Total Clients", value: summary.totalClients, format: "number", trendPct: 0, trendDirection: "up", source: "salesforce" },
    { label: "Net Flows YTD", value: summary.netFlowsYTD, format: "currency", trendPct: 0, trendDirection: summary.netFlowsYTD >= 0 ? "up" : "down", source: "orion" },
    { label: "Meetings Today", value: summary.meetingsToday, format: "number", trendPct: 0, trendDirection: "flat", source: "salesforce" },
  ];
}

export function transformOrionGoalsToWidget(goals: ApiOrionGoal[]): GoalsWidget {
  const totalTarget = goals.reduce((sum, g) => sum + g.targetValue, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.currentValue, 0);
  const byCategory = goals.reduce<Record<string, { count: number; fundedSum: number }>>((acc, g) => {
    if (!acc[g.goalType]) acc[g.goalType] = { count: 0, fundedSum: 0 };
    acc[g.goalType].count++;
    acc[g.goalType].fundedSum += g.fundedRatio;
    return acc;
  }, {});
  return {
    aggregateFundedRatio: totalTarget > 0 ? totalCurrent / totalTarget : 0,
    totalGoals: goals.length,
    clientsWithGoals: new Set(goals.map(g => g.goalId)).size,
    totalTargetAmount: totalTarget,
    totalCurrentAmount: totalCurrent,
    goalsByCategory: Object.entries(byCategory).map(([category, data]) => ({
      category,
      count: data.count,
      funded: data.fundedSum / data.count,
    })),
  };
}

export function transformClientRosterToProfiles(
  roster: ApiClientRosterEntry[],
): ClientProfile[] {
  return roster.map(entry => ({
    id: entry.sfId,
    firstName: entry.firstName,
    lastName: entry.lastName,
    email: entry.email ?? "",
    phone: entry.phone ?? "",
    address: { street: "", city: entry.city ?? "", state: entry.state ?? "", zip: "" },
    dateOfBirth: entry.dateOfBirth ?? "",
    age: entry.dateOfBirth
      ? Math.floor((Date.now() - new Date(entry.dateOfBirth).getTime()) / 31557600000)
      : 0,
    occupation: entry.occupation ?? "",
    employer: entry.employer ?? "",
    segment: entry.segment as ClientProfile["segment"],
    status: entry.status as ClientProfile["status"],
    riskTolerance: mapRiskTolerance(entry.riskTolerance),
    totalAUM: entry.totalAUM,
    lastContactDays: 0,
    annualIncome: 0,
    taxFilingStatus: "Single",
    stateOfResidence: entry.state ?? "",
    advisorId: "",
    onboardedDate: "",
    notes: "",
  }));
}
