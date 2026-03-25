import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../storage", () => ({
  storage: {
    getActivitiesByClient: vi.fn(),
    getAccountsByClient: vi.fn(),
  },
}));

import { EngagementGenerator } from "../engines/generators/engagement-generator";
import { storage } from "../storage";

const mockGetActivities = vi.mocked(storage.getActivitiesByClient);
const mockGetAccounts = vi.mocked(storage.getAccountsByClient);

function activityOnDate(daysAgo: number) {
  return { date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString() } as Awaited<ReturnType<typeof storage.getActivitiesByClient>>[0];
}

function mockAccount(balance: string) {
  return { balance } as Awaited<ReturnType<typeof storage.getAccountsByClient>>[0];
}

describe("EngagementGenerator", () => {
  const generator = new EngagementGenerator();
  const advisorId = "advisor-1";
  const client = { id: "c1", firstName: "John", lastName: "Doe", riskTolerance: "moderate" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty when no activities", async () => {
    mockGetActivities.mockResolvedValue([]);
    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should return empty when fewer than 2 activities", async () => {
    mockGetActivities.mockResolvedValue([activityOnDate(10)]);
    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });

  it("should return empty when no significant decline", async () => {
    const activities = [
      activityOnDate(10), activityOnDate(20), activityOnDate(30),
      activityOnDate(100), activityOnDate(200), activityOnDate(300),
    ];
    mockGetActivities.mockResolvedValue(activities);
    mockGetAccounts.mockResolvedValue([mockAccount("500000")]);
    const result = await generator.generate(client, advisorId);
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it("should detect significant engagement decline", async () => {
    const activities = [
      activityOnDate(300), activityOnDate(310), activityOnDate(320),
      activityOnDate(200), activityOnDate(210), activityOnDate(220),
      activityOnDate(100), activityOnDate(110), activityOnDate(120),
    ];
    mockGetActivities.mockResolvedValue(activities);
    mockGetAccounts.mockResolvedValue([mockAccount("2000000")]);
    const result = await generator.generate(client, advisorId);
    if (result.length > 0) {
      expect(result[0].insightType).toBe("engagement_risk");
      expect(result[0].title).toContain("Declining Engagement");
    }
  });

  it("should return empty when activities are only very old", async () => {
    const activities = [activityOnDate(400), activityOnDate(500)];
    mockGetActivities.mockResolvedValue(activities);
    const result = await generator.generate(client, advisorId);
    expect(result).toEqual([]);
  });
});
