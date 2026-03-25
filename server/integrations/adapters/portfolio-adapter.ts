export type PortfolioAccount = {
  id: string;
  accountNumber: string;
  name: string;
  custodian: string;
  accountType: string;
  status: string;
  totalValue: number;
  baseCurrency: string;
  lastUpdated: string;
  managementStyle?: string;
  isActive?: boolean;
  registrationType?: string;
};

export type PortfolioHolding = {
  id: string;
  ticker: string;
  description: string;
  quantity: number;
  marketValue: number;
  percentOfAccount: number;
  costBasis: number;
  unrealizedGainLoss: number;
  sector: string;
  assetClass: string;
};

export type PortfolioPerformance = {
  period: string;
  returnPct: number;
  benchmarkPct: number;
  outperformance: number;
  since: string;
  sharpeRatio?: number | null;
  maxDrawdown?: number | null;
  alpha?: number | null;
};

export type PortfolioTransaction = {
  id: string;
  date: string;
  type: "BUY" | "SELL" | "DIVIDEND" | "TRANSFER";
  ticker: string;
  quantity: number;
  price: number;
  amount: number;
  commission: number;
};

export type PortfolioSyncResult = {
  success: boolean;
  recordsProcessed?: number;
  error?: string;
};

export type PortfolioBatchSyncResult = {
  synced: number;
  failed: number;
  recordsProcessed: number;
  errors: Array<{ accountId: string; error: string }>;
};

export type PortfolioReconciliationReport = {
  accountsChecked: number;
  discrepancies: Array<{
    type: string;
    accountId?: string;
    ticker?: string;
    local?: any;
    remote?: any;
    diff?: number;
    message: string;
  }>;
  totalValueDiff: number;
  lastChecked: Date;
};

export interface SetAsideRequest {
  accountId: string;
  amount: number;
  reason: string;
  frequency: string;
}

export interface SetAsideResponse {
  setAsideId: string;
  status: string;
}

export interface NwrTagResponse {
  tagId: string;
  status: string;
}

export interface PortfolioAdapter {
  readonly name: string;

  isEnabled(): boolean;
  validateConnection(): Promise<boolean>;

  getAccounts(): Promise<PortfolioAccount[]>;
  getAccount(accountId: string): Promise<PortfolioAccount | null>;
  getHoldings(accountId: string): Promise<PortfolioHolding[]>;
  getPerformance(accountId: string, period?: string): Promise<PortfolioPerformance | null>;
  getTransactions(accountId: string, sinceDate?: string): Promise<PortfolioTransaction[]>;

  syncAllAccounts(options?: { fullSync?: boolean; specificAccountIds?: string[] }): Promise<PortfolioBatchSyncResult>;
  syncAccountData(accountId: string, options?: { fullSync?: boolean }): Promise<PortfolioSyncResult>;

  reconcile(): Promise<PortfolioReconciliationReport>;

  createSetAside(request: SetAsideRequest): Promise<SetAsideResponse>;
  applyNwrTag(accountId: string): Promise<NwrTagResponse>;
  removeNwrTag(accountId: string, tagId: string): Promise<boolean>;
}
