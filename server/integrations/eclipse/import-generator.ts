import { logger } from "../../lib/logger";

export interface EclipseTradeRecord {
  accountNumber: string;
  tradeType: "SELL" | "WITHDRAW";
  amount: number;
  method: string;
  reason: string;
  clientName: string;
  taxWithholding?: number;
}

export interface EclipseImportFile {
  fileName: string;
  content: string;
  recordCount: number;
}

function formatDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function escapeField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function generateEclipseImportFile(trades: EclipseTradeRecord[]): EclipseImportFile {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const fileName = `ECLIPSE_WD_${timestamp}.csv`;

  const headers = [
    "AccountNumber",
    "TradeType",
    "TradeDate",
    "SettleDate",
    "Amount",
    "NetAmount",
    "FederalWithholding",
    "StateWithholding",
    "Method",
    "Reason",
    "ClientName",
    "Status",
  ];

  const settleDate = new Date(now);
  settleDate.setDate(settleDate.getDate() + 3);

  const rows = trades.map((trade) => {
    const federalWithholding = trade.taxWithholding
      ? (trade.amount * (trade.taxWithholding / 100))
      : 0;
    const netAmount = trade.amount - federalWithholding;

    return [
      escapeField(trade.accountNumber),
      trade.tradeType,
      formatDate(now),
      formatDate(settleDate),
      formatAmount(trade.amount),
      formatAmount(netAmount),
      formatAmount(federalWithholding),
      "0.00",
      escapeField(trade.method),
      escapeField(trade.reason),
      escapeField(trade.clientName),
      "PENDING",
    ].join(",");
  });

  const content = [headers.join(","), ...rows].join("\n");

  logger.info({ fileName, recordCount: trades.length }, "[Eclipse] Generated import file");

  return {
    fileName,
    content,
    recordCount: trades.length,
  };
}
