import { useState, useMemo } from "react";
import { V2_CARD, V2_TITLE, V2_DARK_SCOPE } from "@/styles/v2-tokens";

/* ── Helpers ─────────────────────────────────────────────────────── */

const PAGE_SIZE = 25;

function fmtCurrency(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

/* ── Styles ──────────────────────────────────────────────────────── */

const cellBase: React.CSSProperties = {
  fontFamily: "var(--font-data, 'JetBrains Mono', monospace)",
  fontSize: 11,
  padding: "6px 8px",
  whiteSpace: "nowrap",
  color: "var(--color-text-primary)",
};

const cellRight: React.CSSProperties = { ...cellBase, textAlign: "right" };

const thStyle: React.CSSProperties = {
  fontFamily: "var(--font-data, 'JetBrains Mono', monospace)",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: ".04em",
  textTransform: "uppercase",
  padding: "6px 8px",
  color: "var(--color-text-tertiary)",
  borderBottom: "1px solid var(--color-border-subtle)",
};

const thRight: React.CSSProperties = { ...thStyle, textAlign: "right" };

/* ── Props ───────────────────────────────────────────────────────── */

interface HoldingsTableProps {
  holdings: any[];
  marketData: any;
  marketLoading: boolean;
  refetchMarket: () => void;
  onAccountSelect: (id: string) => void;
  accounts: any[];
}

/* ── Component ───────────────────────────────────────────────────── */

export function HoldingsTable({
  holdings,
  marketData,
  marketLoading,
  refetchMarket,
  onAccountSelect,
  accounts,
}: HoldingsTableProps) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [groupByAccount, setGroupByAccount] = useState(false);

  // Build account lookup
  const accountMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const a of accounts) m.set(a.id ?? a.accountId, a);
    return m;
  }, [accounts]);

  // Filter by search
  const filteredHoldings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return holdings;
    return holdings.filter((h: any) => {
      const ticker = (h.ticker || "").toLowerCase();
      const name = (h.name || h.description || "").toLowerCase();
      return ticker.includes(q) || name.includes(q);
    });
  }, [holdings, search]);

  // Optionally group by account
  const displayHoldings = useMemo(() => {
    if (!groupByAccount) return filteredHoldings;
    return [...filteredHoldings].sort((a: any, b: any) => {
      const aAcct = (a.accountId || "").toString();
      const bAcct = (b.accountId || "").toString();
      return aAcct.localeCompare(bAcct);
    });
  }, [filteredHoldings, groupByAccount]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(displayHoldings.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageHoldings = displayHoldings.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  // Reset page when search changes
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  // Total portfolio value for weight calc
  const totalValue = useMemo(() => {
    return holdings.reduce((sum: number, h: any) => {
      const shares = parseFloat(h.shares || "0");
      const quote = marketData?.quotes?.[h.ticker];
      const price = quote?.price ?? parseFloat(h.currentPrice || "0");
      return sum + shares * price;
    }, 0);
  }, [holdings, marketData]);

  return (
    <div className={V2_DARK_SCOPE} style={V2_CARD}>
      {/* Header */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={V2_TITLE}>Holdings</h3>
          <span
            style={{
              fontFamily: "var(--font-data, 'JetBrains Mono', monospace)",
              fontSize: 10,
              color: "var(--color-text-tertiary)",
            }}
          >
            {filteredHoldings.length} position{filteredHoldings.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Controls row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 10,
            marginBottom: 12,
          }}
        >
          {/* Search input */}
          <input
            type="text"
            placeholder="Search ticker or name..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              height: 28,
              padding: "0 8px",
              fontSize: 11,
              fontFamily: "var(--font-data, 'JetBrains Mono', monospace)",
              background: "var(--color-surface-overlay, rgba(255,255,255,0.04))",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: 4,
              color: "var(--color-text-primary)",
              outline: "none",
              width: 200,
            }}
          />

          {/* Group-by-account toggle */}
          <button
            onClick={() => setGroupByAccount((g) => !g)}
            style={{
              height: 28,
              padding: "0 10px",
              fontSize: 10,
              fontFamily: "var(--font-data, 'JetBrains Mono', monospace)",
              fontWeight: 600,
              letterSpacing: ".04em",
              textTransform: "uppercase",
              background: groupByAccount
                ? "var(--color-accent, hsl(24,100%,55%))"
                : "var(--color-surface-overlay, rgba(255,255,255,0.04))",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: 4,
              color: groupByAccount
                ? "#fff"
                : "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            Group by Account
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Ticker / Name</th>
              <th style={thStyle}>Account</th>
              <th style={thRight}>Shares</th>
              <th style={thRight}>Price</th>
              <th style={thRight}>Value</th>
              <th style={thRight}>Gain / Loss</th>
              <th style={thRight}>Weight</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Risk</th>
              <th style={thStyle}>Mgd</th>
            </tr>
          </thead>
          <tbody>
            {pageHoldings.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    textAlign: "center",
                    padding: "32px 8px",
                    fontSize: 12,
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  {holdings.length === 0
                    ? "No holdings data available"
                    : "No holdings match your search"}
                </td>
              </tr>
            )}
            {pageHoldings.map((h: any, idx: number) => {
              const shares = parseFloat(h.shares || "0");
              const quote = marketData?.quotes?.[h.ticker];
              const price = quote?.price ?? parseFloat(h.currentPrice || "0");
              const value = shares * price;
              const gl = parseFloat(h.unrealizedGainLoss || "0");
              const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
              const acct = accountMap.get(h.accountId);
              const acctLabel = acct?.name || acct?.accountName || h.accountId || "—";
              const hasQuote = !!quote;

              return (
                <tr
                  key={h.id ?? `${h.ticker}-${idx}`}
                  style={{
                    borderBottom: "1px solid var(--color-border-subtle)",
                  }}
                >
                  {/* Ticker / Name */}
                  <td style={cellBase}>
                    <span
                      onClick={() => onAccountSelect(h.accountId)}
                      style={{
                        cursor: "pointer",
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {h.ticker || "—"}
                    </span>
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      {h.name || h.description || ""}
                    </span>
                  </td>

                  {/* Account */}
                  <td
                    style={{
                      ...cellBase,
                      fontSize: 10,
                      color: "var(--color-text-secondary)",
                      maxWidth: 140,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {acctLabel}
                  </td>

                  {/* Shares */}
                  <td style={cellRight}>{shares.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>

                  {/* Price + green dot */}
                  <td style={cellRight}>
                    {hasQuote && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#22c55e",
                          marginRight: 4,
                          verticalAlign: "middle",
                        }}
                        title="Yahoo Finance live quote"
                      />
                    )}
                    ${price.toFixed(2)}
                  </td>

                  {/* Value */}
                  <td style={cellRight}>{fmtCurrency(value)}</td>

                  {/* Gain/Loss */}
                  <td
                    style={{
                      ...cellRight,
                      color:
                        gl > 0
                          ? "var(--color-positive, #22c55e)"
                          : gl < 0
                            ? "var(--color-negative, #ef4444)"
                            : "var(--color-text-secondary)",
                    }}
                  >
                    {fmtCurrency(gl)}
                  </td>

                  {/* Weight */}
                  <td style={cellRight}>{weight.toFixed(2)}%</td>

                  {/* Product Type */}
                  <td style={{ ...cellBase, fontSize: 10, color: "var(--color-text-tertiary)" }}>
                    {h.productType || h.fundFamily || "—"}
                  </td>

                  {/* Risk Category */}
                  <td style={{ ...cellBase, fontSize: 10 }}>
                    {h.riskCategory ? (
                      <span style={{
                        padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600,
                        background: h.riskCategory === "High" ? "rgba(239,68,68,0.12)" :
                                   h.riskCategory === "Medium" ? "rgba(255,198,11,0.12)" :
                                   "rgba(142,185,53,0.12)",
                        color: h.riskCategory === "High" ? "#ef4444" :
                               h.riskCategory === "Medium" ? "#FFC60B" :
                               "#8EB935",
                      }}>{h.riskCategory}</span>
                    ) : "—"}
                  </td>

                  {/* Managed */}
                  <td style={{ ...cellBase, fontSize: 10, textAlign: "center" }}>
                    {h.isManaged != null ? (
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", display: "inline-block",
                        background: h.isManaged ? "#8EB935" : "var(--color-text-muted)",
                      }} title={h.isManaged ? "Managed" : "Held Away"} />
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "12px 20px 16px",
          }}
        >
          <button
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{
              height: 26,
              padding: "0 10px",
              fontSize: 10,
              fontFamily: "var(--font-data, 'JetBrains Mono', monospace)",
              fontWeight: 600,
              background: "var(--color-surface-overlay, rgba(255,255,255,0.04))",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: 4,
              color: safePage === 0 ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
              cursor: safePage === 0 ? "default" : "pointer",
              opacity: safePage === 0 ? 0.5 : 1,
            }}
          >
            Prev
          </button>
          <span
            style={{
              fontFamily: "var(--font-data, 'JetBrains Mono', monospace)",
              fontSize: 10,
              color: "var(--color-text-secondary)",
            }}
          >
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            style={{
              height: 26,
              padding: "0 10px",
              fontSize: 10,
              fontFamily: "var(--font-data, 'JetBrains Mono', monospace)",
              fontWeight: 600,
              background: "var(--color-surface-overlay, rgba(255,255,255,0.04))",
              border: "1px solid var(--color-border-subtle)",
              borderRadius: 4,
              color: safePage >= totalPages - 1 ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
              cursor: safePage >= totalPages - 1 ? "default" : "pointer",
              opacity: safePage >= totalPages - 1 ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
