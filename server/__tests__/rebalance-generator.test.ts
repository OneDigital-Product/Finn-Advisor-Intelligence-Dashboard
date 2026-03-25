import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { RebalanceGenerator } from "../engines/generators/rebalance-generator";
import { db } from "../db";

let selectCallIndex = 0;

function setupMockSequence(responses: any[][]) {
  selectCallIndex = 0;
  (db.select as Mock).mockImplementation(() => {
    const idx = selectCallIndex++;
    const data = responses[idx] || [];
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(data),
    };
  });
}

describe("RebalanceGenerator", () => {
  const advisorId = "advisor-1";

  beforeEach(() => {
    vi.clearAllMocks();
    selectCallIndex = 0;
  });

  it("should return empty when no clients", async () => {
    const generator = new RebalanceGenerator();
    setupMockSequence([[]]);
    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should skip clients without portfolio targets", async () => {
    const generator = new RebalanceGenerator();
    setupMockSequence([
      [{ id: "c1", firstName: "A", lastName: "B" }],
      [],
    ]);
    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should detect critical drift above threshold", async () => {
    const generator = new RebalanceGenerator({ criticalDriftPercent: 10, warningDriftPercent: 5 });
    setupMockSequence([
      [{ id: "c1", firstName: "Test", lastName: "Client" }],
      [{ clientId: "c1", assetClass: "Technology", targetAllocation: "20" }],
      [{ id: "acct1", clientId: "c1" }],
      [{ accountId: "acct1", sector: "Technology", marketValue: "50000" }, { accountId: "acct1", sector: "Healthcare", marketValue: "50000" }],
    ]);
    const result = await generator.generate(advisorId);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("critical");
    expect(result[0].title).toContain("Rebalance Required");
  });

  it("should detect warning drift above threshold", async () => {
    const generator = new RebalanceGenerator({ criticalDriftPercent: 10, warningDriftPercent: 5 });
    setupMockSequence([
      [{ id: "c1", firstName: "Test", lastName: "Client" }],
      [{ clientId: "c1", assetClass: "Technology", targetAllocation: "25" }],
      [{ id: "acct1", clientId: "c1" }],
      [{ accountId: "acct1", sector: "Technology", marketValue: "30000" }, { accountId: "acct1", sector: "Healthcare", marketValue: "70000" }],
    ]);
    const result = await generator.generate(advisorId);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("warning");
    expect(result[0].title).toContain("Rebalance Recommended");
  });

  it("should not alert when drift is below warning threshold", async () => {
    const generator = new RebalanceGenerator({ criticalDriftPercent: 10, warningDriftPercent: 5 });
    setupMockSequence([
      [{ id: "c1", firstName: "Test", lastName: "Client" }],
      [{ clientId: "c1", assetClass: "Technology", targetAllocation: "50" }],
      [{ id: "acct1", clientId: "c1" }],
      [{ accountId: "acct1", sector: "Technology", marketValue: "48000" }, { accountId: "acct1", sector: "Healthcare", marketValue: "52000" }],
    ]);
    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should skip clients without accounts", async () => {
    const generator = new RebalanceGenerator();
    setupMockSequence([
      [{ id: "c1", firstName: "A", lastName: "B" }],
      [{ clientId: "c1", assetClass: "Tech", targetAllocation: "50" }],
      [],
    ]);
    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });
});
