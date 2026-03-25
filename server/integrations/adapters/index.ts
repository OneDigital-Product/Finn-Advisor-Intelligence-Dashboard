import type { CRMAdapter } from "./crm-adapter";
import type { PortfolioAdapter } from "./portfolio-adapter";
import { SalesforceCRMAdapter } from "./salesforce-crm-adapter";
import { RedtailCRMAdapter } from "./redtail-crm-adapter";
import { OrionPortfolioAdapter } from "./orion-portfolio-adapter";
import { BlackDiamondPortfolioAdapter } from "./blackdiamond-portfolio-adapter";
import { MulesoftPortfolioAdapter } from "./mulesoft-portfolio-adapter";

export type CRMProvider = "salesforce" | "redtail";
export type PortfolioProvider = "orion" | "blackdiamond" | "mulesoft";

const crmAdapters: Record<CRMProvider, CRMAdapter> = {
  salesforce: new SalesforceCRMAdapter(),
  redtail: new RedtailCRMAdapter(),
};

const portfolioAdapters: Record<PortfolioProvider, PortfolioAdapter> = {
  orion: new OrionPortfolioAdapter(),
  blackdiamond: new BlackDiamondPortfolioAdapter(),
  mulesoft: new MulesoftPortfolioAdapter(),
};

let activeCrmProvider: CRMProvider = (process.env.ACTIVE_CRM_PROVIDER as CRMProvider) || "salesforce";
let activePortfolioProvider: PortfolioProvider = (process.env.ACTIVE_PORTFOLIO_PROVIDER as PortfolioProvider) || "orion";

export function getActiveCRM(): CRMAdapter {
  return crmAdapters[activeCrmProvider];
}

export function getActivePortfolio(): PortfolioAdapter {
  return portfolioAdapters[activePortfolioProvider];
}

export function getCRMAdapter(provider: CRMProvider): CRMAdapter {
  return crmAdapters[provider];
}

export function getPortfolioAdapter(provider: PortfolioProvider): PortfolioAdapter {
  return portfolioAdapters[provider];
}

export function setActiveCRM(provider: CRMProvider): void {
  if (!crmAdapters[provider]) throw new Error(`Unknown CRM provider: ${provider}`);
  activeCrmProvider = provider;
}

export function setActivePortfolio(provider: PortfolioProvider): void {
  if (!portfolioAdapters[provider]) throw new Error(`Unknown portfolio provider: ${provider}`);
  activePortfolioProvider = provider;
}

export function getActiveCRMProvider(): CRMProvider {
  return activeCrmProvider;
}

export function getActivePortfolioProvider(): PortfolioProvider {
  return activePortfolioProvider;
}

export function getAllCRMProviders(): Array<{ id: CRMProvider; name: string; enabled: boolean }> {
  return [
    { id: "salesforce", name: "Salesforce CRM", enabled: crmAdapters.salesforce.isEnabled() },
    { id: "redtail", name: "Redtail CRM", enabled: crmAdapters.redtail.isEnabled() },
  ];
}

export function getAllPortfolioProviders(): Array<{ id: PortfolioProvider; name: string; enabled: boolean }> {
  return [
    { id: "orion", name: "Orion Portfolio", enabled: portfolioAdapters.orion.isEnabled() },
    { id: "blackdiamond", name: "Black Diamond", enabled: portfolioAdapters.blackdiamond.isEnabled() },
    { id: "mulesoft", name: "MuleSoft WAD", enabled: portfolioAdapters.mulesoft.isEnabled() },
  ];
}

export type { CRMAdapter } from "./crm-adapter";
export type { PortfolioAdapter } from "./portfolio-adapter";
