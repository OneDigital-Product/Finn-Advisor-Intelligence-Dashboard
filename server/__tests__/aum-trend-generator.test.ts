import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../storage", () => ({
  storage: {
    getAccountsByClient: vi.fn(),
    getPerformanceByHousehold: vi.fn(),
    getPerformanceByAccount: vi.fn(),
  },
}));

import { AumTrendGenerator } from "../engines/generators/aum-trend-generator";
import { storage } from "../storage";

const mockGetAccounts = vi.mocked(storage.getAccountsByClient);
const mockGetPerfByHousehold = vi.mocked(storage.getPerformanceByHousehold);
const mockGetPerfByAccount = vi.mocked(storage.getPerformanceByAccount);

function mockAccount(overrides: { id?: string; householdId?: string | null; balance?: string }) {
  return { id: overrides.id ?? "a1", householdId: overrides.householdId ?? "h1", balance: overrides.balance ?? "0" } as Awaited<ReturnType<typeof storage.getAccountsByClient>>[0];
}

function mockPerf(overrides: { period?: string; returnPct?: string; benchmarkPct?: string }) {
  return { period: overrides.period ?? "YTD", returnPct: overrides.returnPct ?? "0", benchmarkPct: overrides.benchmarkPct ?? "0" } as Awaited<ReturnType<typeof storage.getPerformanceByHousehold>>[0];
}

describe("AumTrendGenerator", () => {
  const generator = new AumTrendGenerator();
  const advisorId = "advisor-1";
  const client = { id: "c1", firstName: "John", lastName: "Doe", riskTolerance: "moderate" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty when no accounts", async () => {
    mockGetAccounts.mockResolvedValue([]);
    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should return empty when no performance data", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount({ id: "a1", householdId: "h1", balance: "1000000" })]);
    mockGetPerfByHousehold.mockResolvedValue([]);
    mockGetPerfByAccount.mockResolvedValue([]);
    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should return empty when underperformance is less than 3%", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount({ id: "a1", householdId: "h1", balance: "1000000" })]);
    mockGetPerfByHousehold.mockResolvedValue([mockPerf({ period: "YTD", returnPct: "8.0", benchmarkPct: "9.0" })]);
    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should detect significant underperformance (>3%)", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount({ id: "a1", householdId: "h1", balance: "1000000" })]);
    mockGetPerfByHousehold.mockResolvedValue([mockPerf({ period: "YTD", returnPct: "2.0", benchmarkPct: "8.0" })]);
    const result = await generator.generate(client, advisorId);
    expect(result).toHaveLength(1);
    expect(result[0].insightType).toBe("aum_decline");
    expect(result[0].title).toContain("Underperformance");
    expect(result[0].severity).toBe("medium");
  });

  it("should assign high severity for >8% underperformance", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount({ id: "a1", householdId: "h1", balance: "1000000" })]);
    mockGetPerfByHousehold.mockResolvedValue([mockPerf({ period: "YTD", returnPct: "-2.0", benchmarkPct: "8.0" })]);
    const result = await generator.generate(client, advisorId);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("high");
  });

  it("should fall back to account performance if no household data", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount({ id: "a1", householdId: null, balance: "500000" })]);
    mockGetPerfByAccount.mockResolvedValue([mockPerf({ period: "YTD", returnPct: "1.0", benchmarkPct: "7.0" })]);
    const result = await generator.generate(client, advisorId);
    expect(result).toHaveLength(1);
  });

  it("should include estimated dollar impact in metrics", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount({ id: "a1", householdId: "h1", balance: "2000000" })]);
    mockGetPerfByHousehold.mockResolvedValue([mockPerf({ period: "YTD", returnPct: "2.0", benchmarkPct: "7.0" })]);
    const result = await generator.generate(client, advisorId);
    expect(result).toHaveLength(1);
    const metrics = result[0].metrics as Record<string, unknown>;
    expect(metrics.dollarsImpact).toBe(100000);
  });
});
