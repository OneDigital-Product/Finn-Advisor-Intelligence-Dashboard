import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../storage", () => ({
  storage: {
    getHoldingsByClient: vi.fn(),
  },
}));

import { TaxHarvestingGenerator } from "../engines/generators/tax-harvesting-generator";
import { storage } from "../storage";

interface MockHolding {
  ticker: string;
  name?: string;
  costBasis: string;
  marketValue: string;
  unrealizedGainLoss: string;
  sector?: string;
}

const mockGetHoldings = vi.mocked(storage.getHoldingsByClient);

describe("TaxHarvestingGenerator", () => {
  const generator = new TaxHarvestingGenerator();
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

  it("should return empty array when holdings have no losses", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "AAPL", costBasis: "100000", marketValue: "120000",
        unrealizedGainLoss: "20000", sector: "Technology",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should detect tax harvesting opportunity with significant loss", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "META", name: "Meta Platforms", costBasis: "100000", marketValue: "80000",
        unrealizedGainLoss: "-20000", sector: "Technology",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result.length).toBe(1);
    expect(result[0].insightType).toBe("tax_harvesting");
    expect(result[0].title).toContain("META");
    expect(result[0].description).toContain("unrealized loss");
  });

  it("should skip losses with less than 5% decline", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "AAPL", costBasis: "100000", marketValue: "97000",
        unrealizedGainLoss: "-3000", sector: "Technology",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should include holding at exactly $1250 tax savings threshold", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "SMALL", costBasis: "10000", marketValue: "5000",
        unrealizedGainLoss: "-5000", sector: "Other",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result.length).toBe(1);
  });

  it("should skip when tax savings is below $1250 threshold", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "TINY", costBasis: "10000", marketValue: "5100",
        unrealizedGainLoss: "-4900", sector: "Other",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should set severity to high when tax savings > $5000", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "NFLX", name: "Netflix", costBasis: "200000", marketValue: "100000",
        unrealizedGainLoss: "-100000", sector: "Communication",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe("high");
  });

  it("should set severity to medium when tax savings <= $5000", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "XYZ", name: "XYZ Corp", costBasis: "50000", marketValue: "30000",
        unrealizedGainLoss: "-20000", sector: "Industrial",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe("medium");
  });

  it("should calculate estimated tax savings at 25% rate", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "ABC", costBasis: "200000", marketValue: "100000",
        unrealizedGainLoss: "-100000", sector: "Tech",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result[0].estimatedValue).toBe(String(Math.round(100000 * 0.25)));
  });

  it("should skip holdings with zero cost basis", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "FREE", costBasis: "0", marketValue: "10000",
        unrealizedGainLoss: "-5000", sector: "Tech",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should skip holdings with zero market value", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "DEAD", costBasis: "100000", marketValue: "0",
        unrealizedGainLoss: "-100000", sector: "Tech",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should handle multiple holdings with mixed gains/losses", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "GAIN", costBasis: "50000", marketValue: "80000",
        unrealizedGainLoss: "30000", sector: "Tech",
      },
      {
        ticker: "LOSS", name: "Loss Corp", costBasis: "100000", marketValue: "60000",
        unrealizedGainLoss: "-40000", sector: "Finance",
      },
      {
        ticker: "SMALL", costBasis: "10000", marketValue: "9800",
        unrealizedGainLoss: "-200", sector: "Energy",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result.length).toBe(1);
    expect(result[0].title).toContain("LOSS");
  });

  it("should include wash sale warning in recommended action", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "DROP", costBasis: "100000", marketValue: "70000",
        unrealizedGainLoss: "-30000", sector: "Tech",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    expect(result[0].recommendedAction).toContain("wash sale");
  });

  it("should include metrics with correct values", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "XYZ", name: "XYZ Corp", costBasis: "100000", marketValue: "80000",
        unrealizedGainLoss: "-20000", sector: "Finance",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    const metrics = result[0].metrics as Record<string, unknown>;
    expect(metrics.ticker).toBe("XYZ");
    expect(metrics.costBasis).toBe(100000);
    expect(metrics.marketValue).toBe(80000);
    expect(metrics.unrealizedLoss).toBe(20000);
    expect(metrics.estimatedTaxSavings).toBe(5000);
  });

  it("should return empty array on error and not throw", async () => {
    mockGetHoldings.mockRejectedValue(new Error("DB error"));

    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should set expiresAt to 30 days from now", async () => {
    mockGetHoldings.mockResolvedValue([
      {
        ticker: "EXP", costBasis: "100000", marketValue: "70000",
        unrealizedGainLoss: "-30000", sector: "Tech",
      },
    ] as ReturnType<typeof mockGetHoldings> extends Promise<infer T> ? T : never);

    const result = await generator.generate(client, advisorId);
    const expiresAt = result[0].expiresAt as Date;
    const daysFromNow = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysFromNow).toBeGreaterThan(29);
    expect(daysFromNow).toBeLessThan(31);
  });
});
