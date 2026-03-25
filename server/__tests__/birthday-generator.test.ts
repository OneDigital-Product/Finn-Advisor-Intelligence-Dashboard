import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { BirthdayGenerator } from "../engines/generators/birthday-generator";
import { db } from "../db";

interface MockClient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  advisorId?: string;
}

function mockClients(clientList: MockClient[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(clientList),
  };
  (db.select as Mock).mockReturnValue(chain);
  return chain;
}

function dobForUpcomingBirthday(turningAge: number, daysFromNow: number): string {
  const now = new Date();
  const birthdayDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  const birthYear = birthdayDate.getFullYear() - turningAge;
  const dob = new Date(birthYear, birthdayDate.getMonth(), birthdayDate.getDate());
  return dob.toISOString().split("T")[0];
}

describe("BirthdayGenerator", () => {
  const generator = new BirthdayGenerator();
  const advisorId = "advisor-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array when no clients exist", async () => {
    mockClients([]);

    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should create alert for client with birthday within 30 days", async () => {
    const dob = dobForUpcomingBirthday(45, 10);

    mockClients([{
      id: "c1", firstName: "Alice", lastName: "Wonder",
      dateOfBirth: dob, advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result.length).toBe(1);
    expect(result[0].type).toBe("birthday");
    expect(result[0].title).toContain("Client Birthday");
    expect(result[0].severity).toBe("info");
  });

  it("should not create alert for client with birthday more than 30 days away", async () => {
    const dob = dobForUpcomingBirthday(45, 60);

    mockClients([{
      id: "c1", firstName: "Far", lastName: "Away",
      dateOfBirth: dob, advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should create milestone alert for age 50", async () => {
    const dob = dobForUpcomingBirthday(50, 5);

    mockClients([{
      id: "c1", firstName: "Milestone", lastName: "Person",
      dateOfBirth: dob, advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe("warning");
    expect(result[0].title).toContain("Milestone Birthday");
    expect(result[0].message).toContain("special outreach");
  });

  it("should create milestone alert for age 65", async () => {
    const dob = dobForUpcomingBirthday(65, 5);

    mockClients([{
      id: "c1", firstName: "Medicare", lastName: "Age",
      dateOfBirth: dob, advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe("warning");
    expect(result[0].title).toContain("Milestone Birthday");
  });

  it("should create info alert for non-milestone age", async () => {
    const dob = dobForUpcomingBirthday(42, 5);

    mockClients([{
      id: "c1", firstName: "Regular", lastName: "Birthday",
      dateOfBirth: dob, advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe("info");
    expect(result[0].title).toContain("Client Birthday");
    expect(result[0].message).toContain("personal outreach");
  });

  it("should skip clients with null DOB", async () => {
    mockClients([{
      id: "c1", firstName: "No", lastName: "DOB",
      dateOfBirth: null, advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should skip clients with invalid DOB", async () => {
    mockClients([{
      id: "c1", firstName: "Bad", lastName: "Date",
      dateOfBirth: "invalid-date", advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should set correct alertType and isRead", async () => {
    const dob = dobForUpcomingBirthday(40, 5);

    mockClients([{
      id: "c1", firstName: "Test", lastName: "Client",
      dateOfBirth: dob, advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result.length).toBe(1);
    expect(result[0].alertType).toBe("birthday");
    expect(result[0].isRead).toBe(false);
  });
});
