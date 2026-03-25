import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../storage", () => ({
  storage: {
    getAccountsByClient: vi.fn(),
  },
}));

import { EstateGapGenerator } from "../engines/generators/estate-gap-generator";
import { storage } from "../storage";

const mockGetAccounts = vi.mocked(storage.getAccountsByClient);

function mockAccount(balance: string, accountType: string) {
  return { balance, accountType } as Awaited<ReturnType<typeof storage.getAccountsByClient>>[0];
}

describe("EstateGapGenerator", () => {
  const generator = new EstateGapGenerator();
  const advisorId = "advisor-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty for low AUM client", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount("50000", "brokerage")]);
    const client = { id: "c1", firstName: "Low", lastName: "AUM", notes: "" };
    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should detect estate gap for high net worth client without planning docs", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount("2000000", "brokerage")]);
    const today = new Date();
    const dob = `${today.getFullYear() - 65}-01-01`;
    const client = { id: "c1", firstName: "Rich", lastName: "Elder", dateOfBirth: dob, notes: "Has 2 children" };
    const result = await generator.generate(client, advisorId);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].insightType).toBe("estate_gap");
    expect(result[0].title).toContain("Estate Planning Gap");
  });

  it("should not flag client who has trust documentation", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount("2000000", "brokerage")]);
    const client = { id: "c1", firstName: "A", lastName: "B", notes: "Revocable trust established 2020. Will on file." };
    const result = await generator.generate(client, advisorId);
    const estateGaps = result.filter(r => r.description?.includes("No estate planning"));
    expect(estateGaps).toHaveLength(0);
  });

  it("should detect beneficiary review for elder with retirement accounts", async () => {
    mockGetAccounts.mockResolvedValue([
      mockAccount("500000", "Traditional IRA"),
      mockAccount("300000", "401k"),
    ]);
    const today = new Date();
    const dob = `${today.getFullYear() - 70}-06-15`;
    const client = { id: "c1", firstName: "Elder", lastName: "Client", dateOfBirth: dob, notes: "" };
    const result = await generator.generate(client, advisorId);
    const beneficiaryInsights = result.filter(r => r.title?.includes("Beneficiary"));
    expect(beneficiaryInsights.length).toBeGreaterThan(0);
  });

  it("should not flag beneficiary review if beneficiary mentioned in notes", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount("500000", "Traditional IRA")]);
    const today = new Date();
    const dob = `${today.getFullYear() - 70}-06-15`;
    const client = { id: "c1", firstName: "Elder", lastName: "Client", dateOfBirth: dob, notes: "Beneficiary: spouse Jane" };
    const result = await generator.generate(client, advisorId);
    const beneficiaryInsights = result.filter(r => r.title?.includes("Beneficiary"));
    expect(beneficiaryInsights).toHaveLength(0);
  });

  it("should assign high severity to HNW elder without estate plan", async () => {
    mockGetAccounts.mockResolvedValue([mockAccount("3000000", "brokerage")]);
    const today = new Date();
    const dob = `${today.getFullYear() - 75}-01-01`;
    const client = { id: "c1", firstName: "Old", lastName: "Rich", dateOfBirth: dob, notes: "Has children" };
    const result = await generator.generate(client, advisorId);
    const estateGap = result.find(r => r.title?.includes("Estate Planning Gap"));
    expect(estateGap?.severity).toBe("high");
  });
});
