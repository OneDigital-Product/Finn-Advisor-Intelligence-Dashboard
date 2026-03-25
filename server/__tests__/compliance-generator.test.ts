import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { ComplianceGenerator } from "../engines/generators/compliance-generator";
import { db } from "../db";

function mockDbResult(rows: any[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
  (db.select as Mock).mockReturnValue(chain);
  return chain;
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

describe("ComplianceGenerator", () => {
  const generator = new ComplianceGenerator();
  const advisorId = "advisor-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array when no compliance items exist", async () => {
    mockDbResult([]);
    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should generate critical alert for overdue items", async () => {
    mockDbResult([{
      item: { clientId: "c1", dueDate: daysFromNow(-10), description: "ADV Filing", status: "pending" },
      clientFirstName: "John",
      clientLastName: "Doe",
    }]);
    const result = await generator.generate(advisorId);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("critical");
    expect(result[0].title).toContain("Overdue");
    expect(result[0].message).toContain("10 days ago");
  });

  it("should generate critical alert for items due within 14 days", async () => {
    mockDbResult([{
      item: { clientId: "c1", dueDate: daysFromNow(7), description: "Form CRS", status: "in_progress" },
      clientFirstName: "Jane",
      clientLastName: "Smith",
    }]);
    const result = await generator.generate(advisorId);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("critical");
    expect(result[0].title).toContain("Deadline");
  });

  it("should generate warning alert for items due within 30 days", async () => {
    mockDbResult([{
      item: { clientId: "c1", dueDate: daysFromNow(20), description: "KYC Update", status: "pending" },
      clientFirstName: "Bob",
      clientLastName: "Jones",
    }]);
    const result = await generator.generate(advisorId);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("warning");
    expect(result[0].title).toContain("Upcoming");
  });

  it("should not generate alerts for items due more than 30 days away", async () => {
    mockDbResult([{
      item: { clientId: "c1", dueDate: daysFromNow(60), description: "Annual Review", status: "pending" },
      clientFirstName: "Test",
      clientLastName: "User",
    }]);
    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should skip items with null dueDate", async () => {
    mockDbResult([{
      item: { clientId: "c1", dueDate: null, description: "No Date", status: "pending" },
      clientFirstName: "Test",
      clientLastName: "User",
    }]);
    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should skip items with invalid dueDate", async () => {
    mockDbResult([{
      item: { clientId: "c1", dueDate: "invalid-date", description: "Bad Date", status: "pending" },
      clientFirstName: "Test",
      clientLastName: "User",
    }]);
    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should handle multiple compliance items", async () => {
    mockDbResult([
      { item: { clientId: "c1", dueDate: daysFromNow(-5), description: "Item A", status: "pending" }, clientFirstName: "A", clientLastName: "B" },
      { item: { clientId: "c2", dueDate: daysFromNow(10), description: "Item B", status: "pending" }, clientFirstName: "C", clientLastName: "D" },
      { item: { clientId: "c3", dueDate: daysFromNow(25), description: "Item C", status: "pending" }, clientFirstName: "E", clientLastName: "F" },
    ]);
    const result = await generator.generate(advisorId);
    expect(result).toHaveLength(3);
  });
});
