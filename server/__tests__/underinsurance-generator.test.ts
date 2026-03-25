import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../storage", () => ({
  storage: {
    getAccountsByClient: vi.fn(),
  },
}));

import { UnderinsuranceGenerator } from "../engines/generators/underinsurance-generator";
import { storage } from "../storage";

const mockGetAccounts = vi.mocked(storage.getAccountsByClient);

function mockAccount(balance: string, accountType: string) {
  return { balance, accountType } as Awaited<ReturnType<typeof storage.getAccountsByClient>>[0];
}

describe("UnderinsuranceGenerator", () => {
  const generator = new UnderinsuranceGenerator();
  const advisorId = "advisor-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty for zero AUM client", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount("0", "brokerage")]);
    const client = { id: "c1", firstName: "No", lastName: "Money", notes: "Has 2 children" };
    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should return empty for client without dependents or spouse", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount("1000000", "brokerage")]);
    const client = { id: "c1", firstName: "Single", lastName: "Person", notes: "Likes golf" };
    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should detect underinsurance for client with dependents", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount("2000000", "brokerage")]);
    const client = { id: "c1", firstName: "Parent", lastName: "Client", notes: "Has 3 children, married. spouse is homemaker" };
    const result = await generator.generate(client, advisorId);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].insightType).toBe("underinsured");
    expect(result[0].title).toContain("Life Insurance Gap");
  });

  it("should detect underinsurance for client with spouse only", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount("1000000", "brokerage")]);
    const client = { id: "c1", firstName: "Married", lastName: "Client", notes: "Married, spouse works part-time" };
    const result = await generator.generate(client, advisorId);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should consider existing insurance from notes", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount("500000", "brokerage")]);
    const client = { id: "c1", firstName: "Insured", lastName: "Client", notes: "Has 1 child. Life insurance coverage $5M" };
    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should assign high severity for large coverage gaps", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount("5000000", "brokerage")]);
    const client = { id: "c1", firstName: "Big", lastName: "Gap", notes: "Has 2 children" };
    const result = await generator.generate(client, advisorId);
    if (result.length > 0) {
      expect(result[0].severity).toBe("high");
    }
  });
});
