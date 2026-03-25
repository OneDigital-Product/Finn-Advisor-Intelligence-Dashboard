export function formatCurrency(
  value: number,
  opts?: { abbreviated?: boolean },
): string {
  if (opts?.abbreviated === false) {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return value < 0 ? `-${formatted}` : formatted;
  }

  if (value >= 1_000_000_000) return `$${parseFloat((value / 1_000_000_000).toFixed(1))}B`;
  if (value >= 1_000_000) return `$${parseFloat((value / 1_000_000).toFixed(2))}M`;
  if (value >= 1_000) return `$${parseFloat((value / 1_000).toFixed(1))}K`;
  return `$${value.toFixed(0)}`;
}
