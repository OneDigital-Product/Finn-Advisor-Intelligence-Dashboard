import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { ContactCadenceGenerator } from "../engines/generators/contact-cadence-generator";
import { db } from "../db";

let selectCallIndex = 0;
function setupMock(clients: any[], accountsByClient: Record<string, any[]>) {
  selectCallIndex = 0;
  (db.select as Mock).mockImplementation(() => {
    const idx = selectCallIndex++;
    if (idx === 0) {
      return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(clients),
      };
    }
    const clientId = Object.keys(accountsByClient)[idx - 1] || "";
    return {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(accountsByClient[clientId] || []),
    };
  });
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

describe("ContactCadenceGenerator", () => {
  const generator = new ContactCadenceGenerator();
  const advisorId = "advisor-1";

  beforeEach(() => {
    vi.clearAllMocks();
    selectCallIndex = 0;
  });

  it("should return empty array when no clients exist", async () => {
    setupMock([], {});
    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should skip clients without lastContactDate", async () => {
    setupMock([{ id: "c1", firstName: "A", lastName: "B", lastContactDate: null }], {});
    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should generate critical alert for high AUM client not contacted in 46+ days", async () => {
    setupMock(
      [{ id: "c1", firstName: "John", lastName: "Doe", lastContactDate: daysAgo(50) }],
      { c1: [{ balance: "5000000" }] }
    );
    const result = await generator.generate(advisorId);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("critical");
    expect(result[0].message).toContain("50 days ago");
  });

  it("should generate warning for high AUM client not contacted in 31-45 days", async () => {
    setupMock(
      [{ id: "c1", firstName: "John", lastName: "Doe", lastContactDate: daysAgo(35) }],
      { c1: [{ balance: "5000000" }] }
    );
    const result = await generator.generate(advisorId);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("warning");
  });

  it("should not alert for recently contacted high AUM client", async () => {
    setupMock(
      [{ id: "c1", firstName: "John", lastName: "Doe", lastContactDate: daysAgo(15) }],
      { c1: [{ balance: "5000000" }] }
    );
    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should use 90-day cadence for mid-tier AUM", async () => {
    setupMock(
      [{ id: "c1", firstName: "Mid", lastName: "Tier", lastContactDate: daysAgo(100) }],
      { c1: [{ balance: "1500000" }] }
    );
    const result = await generator.generate(advisorId);
    expect(result).toHaveLength(1);
    expect(result[0].message).toContain("every 90 days");
  });

  it("should use 180-day cadence for low AUM", async () => {
    setupMock(
      [{ id: "c1", firstName: "Low", lastName: "Tier", lastContactDate: daysAgo(200) }],
      { c1: [{ balance: "300000" }] }
    );
    const result = await generator.generate(advisorId);
    expect(result).toHaveLength(1);
    expect(result[0].message).toContain("every 180 days");
  });
});
