import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../storage", () => ({
  storage: {
    getHoldingsByClient: vi.fn(),
  },
}));

import { ConcentrationGenerator } from "../engines/generators/concentration-generator";
import { storage } from "../storage";

interface MockHolding {
  ticker: string;
  name?: string;
  marketValue: string;
  sector?: string;
}

const mockGetHoldings = vi.mocked(storage.getHoldingsByClient);

describe("ConcentrationGenerator", () => {
  const generator = new ConcentrationGenerator();
  const advisorId = "advisor-1";
  const client = { id: "c1", firstName: "Test", lastName: "Client" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array when no holdings exist", async () => {
    mockGetHoldings.mockResolvedValue([]);

    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should return empty array when only one holding exists", async () => {
    mockGetHoldings.mockResolvedValue([
      { ticker: "AAPL", marketValue: "100000", sector: "Technology" },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should detect single position concentration above 30%", async () => {
    mockGetHoldings.mockResolvedValue([
      { ticker: "AAPL", marketValue: "70000", sector: "Technology" },
      { ticker: "MSFT", marketValue: "20000", sector: "Technology" },
      { ticker: "JPM", marketValue: "10000", sector: "Finance" },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    const positionInsights = result.filter((i) => i.title.includes("Position Concentration"));
    expect(positionInsights.length).toBe(1);
    expect(positionInsights[0].title).toContain("AAPL");
    expect(positionInsights[0].severity).toBe("high");
  });

  it("should set severity to high for position weight >= 50%", async () => {
    mockGetHoldings.mockResolvedValue([
      { ticker: "TSLA", marketValue: "60000", sector: "Auto" },
      { ticker: "F", marketValue: "40000", sector: "Auto" },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    const positionInsights = result.filter((i) => i.title.includes("Position Concentration"));
    expect(positionInsights[0].severity).toBe("high");
  });

  it("should set severity to medium for position weight 30-49%", async () => {
    mockGetHoldings.mockResolvedValue([
      { ticker: "AAPL", marketValue: "35000", sector: "Technology" },
      { ticker: "MSFT", marketValue: "35000", sector: "Technology" },
      { ticker: "JPM", marketValue: "30000", sector: "Finance" },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    const positionInsights = result.filter((i) => i.title.includes("Position Concentration"));
    expect(positionInsights.length).toBe(3);
    expect(positionInsights[0].severity).toBe("medium");
  });

  it("should not detect sector concentration below 40%", async () => {
    mockGetHoldings.mockResolvedValue([
      { ticker: "AAPL", marketValue: "19000", sector: "Technology" },
      { ticker: "MSFT", marketValue: "19000", sector: "Technology" },
      { ticker: "JPM", marketValue: "31000", sector: "Finance" },
      { ticker: "BAC", marketValue: "31000", sector: "Healthcare" },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    const sectorInsights = result.filter((i) => i.title.includes("Sector Concentration"));
    expect(sectorInsights.length).toBe(0);
  });

  it("should detect sector concentration when sector exceeds 40%", async () => {
    mockGetHoldings.mockResolvedValue([
      { ticker: "AAPL", marketValue: "30000", sector: "Technology" },
      { ticker: "MSFT", marketValue: "25000", sector: "Technology" },
      { ticker: "JPM", marketValue: "10000", sector: "Finance" },
      { ticker: "XOM", marketValue: "5000", sector: "Energy" },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    const sectorInsights = result.filter((i) => i.title.includes("Sector Concentration"));
    expect(sectorInsights.length).toBeGreaterThan(0);
    expect(sectorInsights[0].title).toContain("Technology");
  });

  it("should set sector severity to high when >= 60%", async () => {
    mockGetHoldings.mockResolvedValue([
      { ticker: "AAPL", marketValue: "40000", sector: "Technology" },
      { ticker: "MSFT", marketValue: "30000", sector: "Technology" },
      { ticker: "JPM", marketValue: "10000", sector: "Finance" },
      { ticker: "XOM", marketValue: "5000", sector: "Energy" },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    const sectorInsights = result.filter((i) => i.title.includes("Sector Concentration"));
    expect(sectorInsights.length).toBe(1);
    const techSector = sectorInsights.find((i) => i.title.includes("Technology"));
    expect(techSector?.severity).toBe("high");
  });

  it("should skip Other sector for sector concentration", async () => {
    mockGetHoldings.mockResolvedValue([
      { ticker: "X1", marketValue: "80000" },
      { ticker: "X2", marketValue: "20000", sector: "Finance" },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    const sectorInsights = result.filter((i) => i.title.includes("Sector Concentration"));
    const otherSector = sectorInsights.find((i) => i.title.includes("Other"));
    expect(otherSector).toBeUndefined();
  });

  it("should skip holdings with zero market value", async () => {
    mockGetHoldings.mockResolvedValue([
      { ticker: "AAPL", marketValue: "0", sector: "Technology" },
      { ticker: "MSFT", marketValue: "100000", sector: "Technology" },
      { ticker: "JPM", marketValue: "50000", sector: "Finance" },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    const positionInsights = result.filter((i) => i.title.includes("Position Concentration"));
    const appleInsight = positionInsights.find((i) => i.title.includes("AAPL"));
    expect(appleInsight).toBeUndefined();
  });

  it("should include correct metrics in insight", async () => {
    mockGetHoldings.mockResolvedValue([
      { ticker: "AAPL", name: "Apple Inc", marketValue: "80000", sector: "Technology" },
      { ticker: "JPM", name: "JPMorgan", marketValue: "20000", sector: "Finance" },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    const positionInsight = result.find((i) => i.title.includes("Position Concentration"));
    expect(positionInsight).toBeDefined();
    expect(positionInsight!.metrics).toBeDefined();
    const metrics = positionInsight!.metrics as Record<string, unknown>;
    expect(metrics.ticker).toBe("AAPL");
    expect(metrics.marketValue).toBe(80000);
    expect(metrics.portfolioWeight).toBe(80);
  });

  it("should return empty array on error and not throw", async () => {
    mockGetHoldings.mockRejectedValue(new Error("DB error"));

    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should return empty array when total portfolio value is zero", async () => {
    mockGetHoldings.mockResolvedValue([
      { ticker: "X", marketValue: "0" },
      { ticker: "Y", marketValue: "0" },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });
});
