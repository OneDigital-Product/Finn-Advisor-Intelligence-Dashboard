import {
  dashboardService,
  clientService,
  portfolioService,
  analyticsService,
  complianceService,
  engagementService,
  taxService,
  billingService,
  activeDashboardService,
  activeBillingService,
  activePlanningService,
  activeRiskService,
  activeConfigService,
} from "./data-service";
import { resolveOrionEndpoint } from "../types/service-types";
import type { ServiceToOrionMapping } from "../types/service-types";

export type ServiceName =
  | "dashboardService"
  | "clientService"
  | "portfolioService"
  | "analyticsService"
  | "complianceService"
  | "engagementService"
  | "taxService"
  | "billingService"
  | "planningService"
  | "riskService"
  | "configService";

export type DataSource = "orion" | "salesforce" | "local" | "computed" | "both";

export const serviceRegistry: Record<ServiceName, Record<string, (...args: unknown[]) => Promise<unknown>>> = {
  dashboardService: activeDashboardService as Record<string, (...args: unknown[]) => Promise<unknown>>,
  clientService: clientService as Record<string, (...args: unknown[]) => Promise<unknown>>,
  portfolioService: portfolioService as Record<string, (...args: unknown[]) => Promise<unknown>>,
  analyticsService: analyticsService as Record<string, (...args: unknown[]) => Promise<unknown>>,
  complianceService: complianceService as Record<string, (...args: unknown[]) => Promise<unknown>>,
  engagementService: engagementService as Record<string, (...args: unknown[]) => Promise<unknown>>,
  taxService: taxService as Record<string, (...args: unknown[]) => Promise<unknown>>,
  billingService: activeBillingService as Record<string, (...args: unknown[]) => Promise<unknown>>,
  planningService: activePlanningService as Record<string, (...args: unknown[]) => Promise<unknown>>,
  riskService: activeRiskService as Record<string, (...args: unknown[]) => Promise<unknown>>,
  configService: activeConfigService as Record<string, (...args: unknown[]) => Promise<unknown>>,
};

export interface ServiceCallResult<T = unknown> {
  data: T;
  source: DataSource;
  orionEndpoint: string | null;
  isSalesforceOnly: boolean;
  cached: boolean;
}

function resolveSource(mapping: ServiceToOrionMapping | undefined): DataSource {
  if (!mapping) return "local";
  return mapping.primarySource;
}

export async function executeServiceCall<T = unknown>(
  serviceName: ServiceName,
  methodName: string,
  args: unknown[] = []
): Promise<ServiceCallResult<T>> {
  const serviceKey = `${serviceName}.${methodName}`;
  const mapping = resolveOrionEndpoint(serviceKey);

  const service = serviceRegistry[serviceName];
  if (!service || typeof service[methodName] !== "function") {
    throw new Error(`Unknown service call: ${serviceKey}`);
  }

  const data = await service[methodName](...args) as T;

  return {
    data,
    source: resolveSource(mapping),
    orionEndpoint: mapping?.orionEndpoint || null,
    isSalesforceOnly: mapping?.primarySource === "salesforce",
    cached: false,
  };
}

export function getServiceMetadata(serviceName: ServiceName, methodName: string): {
  isSalesforceOnly: boolean;
  orionEndpoint: string | null;
  source: DataSource;
  notes: string;
} {
  const serviceKey = `${serviceName}.${methodName}`;
  const mapping = resolveOrionEndpoint(serviceKey);
  return {
    isSalesforceOnly: mapping?.primarySource === "salesforce",
    orionEndpoint: mapping?.orionEndpoint ?? null,
    source: resolveSource(mapping),
    notes: mapping?.notes ?? "",
  };
}

export function listAvailableServices(): Array<{
  service: ServiceName;
  methods: string[];
}> {
  return Object.entries(serviceRegistry).map(([name, service]) => ({
    service: name as ServiceName,
    methods: Object.keys(service).filter(key => typeof service[key] === "function"),
  }));
}

export function getOrionEndpointForService(serviceCall: string): ServiceToOrionMapping | undefined {
  return resolveOrionEndpoint(serviceCall);
}
