import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { TransactionGenerator } from "../engines/generators/transaction-generator";
import { db } from "../db";

interface MockTransactionRow {
  transaction: { amount: string; type: string; date: string };
  clientId: string;
  clientFirstName: string;
  clientLastName: string;
}

function mockTransactions(rows: MockTransactionRow[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
  (db.select as Mock).mockReturnValue(chain);
  return chain;
}

describe("TransactionGenerator", () => {
  const advisorId = "advisor-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array when no recent transactions exist", async () => {
    const generator = new TransactionGenerator();
    mockTransactions([]);

    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should create warning alert for transaction at warning threshold", async () => {
    const generator = new TransactionGenerator();
    mockTransactions([{
      transaction: { amount: "150000", type: "withdrawal", date: "2025-03-01" },
      clientId: "c1",
      clientFirstName: "John",
      clientLastName: "Doe",
    }]);

    const result = await generator.generate(advisorId);
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe("warning");
    expect(result[0].type).toBe("transaction");
    expect(result[0].title).toContain("Large Transaction");
  });

  it("should create critical alert for transaction at critical threshold", async () => {
    const generator = new TransactionGenerator();
    mockTransactions([{
      transaction: { amount: "750000", type: "transfer", date: "2025-03-01" },
      clientId: "c1",
      clientFirstName: "Jane",
      clientLastName: "Smith",
    }]);

    const result = await generator.generate(advisorId);
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe("critical");
  });

  it("should skip transactions below warning threshold", async () => {
    const generator = new TransactionGenerator();
    mockTransactions([{
      transaction: { amount: "50000", type: "deposit", date: "2025-03-01" },
      clientId: "c1",
      clientFirstName: "Small",
      clientLastName: "Tx",
    }]);

    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should skip transactions with NaN amount", async () => {
    const generator = new TransactionGenerator();
    mockTransactions([{
      transaction: { amount: "not-a-number", type: "deposit", date: "2025-03-01" },
      clientId: "c1",
      clientFirstName: "Bad",
      clientLastName: "Amount",
    }]);

    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should respect custom thresholds", async () => {
    const generator = new TransactionGenerator({
      warningThreshold: 10000,
      criticalThreshold: 50000,
    });
    mockTransactions([{
      transaction: { amount: "25000", type: "deposit", date: "2025-03-01" },
      clientId: "c1",
      clientFirstName: "Custom",
      clientLastName: "Threshold",
    }]);

    const result = await generator.generate(advisorId);
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe("warning");
  });

  it("should handle multiple transactions for different clients", async () => {
    const generator = new TransactionGenerator();
    mockTransactions([
      {
        transaction: { amount: "200000", type: "withdrawal", date: "2025-03-01" },
        clientId: "c1",
        clientFirstName: "Client",
        clientLastName: "One",
      },
      {
        transaction: { amount: "600000", type: "transfer", date: "2025-03-02" },
        clientId: "c2",
        clientFirstName: "Client",
        clientLastName: "Two",
      },
    ]);

    const result = await generator.generate(advisorId);
    expect(result.length).toBe(2);
    expect(result[0].severity).toBe("warning");
    expect(result[1].severity).toBe("critical");
  });

  it("should include transaction details in message", async () => {
    const generator = new TransactionGenerator();
    mockTransactions([{
      transaction: { amount: "200000", type: "withdrawal", date: "2025-03-01" },
      clientId: "c1",
      clientFirstName: "John",
      clientLastName: "Doe",
    }]);

    const result = await generator.generate(advisorId);
    expect(result[0].message).toContain("withdrawal");
    expect(result[0].message).toContain("200,000");
    expect(result[0].message).toContain("John Doe");
  });

  it("should set alertType to transaction", async () => {
    const generator = new TransactionGenerator();
    mockTransactions([{
      transaction: { amount: "500000", type: "deposit", date: "2025-03-01" },
      clientId: "c1",
      clientFirstName: "A",
      clientLastName: "B",
    }]);

    const result = await generator.generate(advisorId);
    expect(result[0].alertType).toBe("transaction");
    expect(result[0].isRead).toBe(false);
  });

  it("should treat exact critical threshold as critical", async () => {
    const generator = new TransactionGenerator();
    mockTransactions([{
      transaction: { amount: "500000", type: "deposit", date: "2025-03-01" },
      clientId: "c1",
      clientFirstName: "A",
      clientLastName: "B",
    }]);

    const result = await generator.generate(advisorId);
    expect(result[0].severity).toBe("critical");
  });
});
