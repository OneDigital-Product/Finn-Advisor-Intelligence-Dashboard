import type { Account } from "@shared/schema";

export interface SparklinePoint {
  date: string;
  aum: number;
}

export function generateSparklineData(
  accounts: Account[],
  totalAum: number,
): SparklinePoint[] {
  const now = new Date();
  const points: SparklinePoint[] = [];

  const seed = hashAccounts(accounts, totalAum);

  const trendBias = ((seed % 100) - 40) / 1000;

  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

    const monthSeed = (seed * (i + 1) * 7 + i * 13) % 1000;
    const noise = (monthSeed / 1000 - 0.5) * 0.04;
    const trendFactor = 1 + trendBias * (11 - i) + noise;

    const adjustedAum = Math.round(totalAum * Math.max(0.7, Math.min(1.3, trendFactor)));

    points.push({ date: dateStr, aum: adjustedAum });
  }

  points[points.length - 1].aum = Math.round(totalAum);

  return points;
}

function hashAccounts(accounts: Account[], totalAum: number): number {
  let hash = Math.round(totalAum);
  for (const acc of accounts) {
    for (let i = 0; i < acc.id.length; i++) {
      hash = ((hash << 5) - hash + acc.id.charCodeAt(i)) | 0;
    }
  }
  return Math.abs(hash);
}
