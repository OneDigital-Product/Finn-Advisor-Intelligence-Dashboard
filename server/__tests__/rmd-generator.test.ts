import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { RmdGenerator } from "../engines/generators/rmd-generator";
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

describe("RmdGenerator", () => {
  const generator = new RmdGenerator();
  const advisorId = "advisor-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array when no clients have DOB", async () => {
    mockClients([{ id: "c1", firstName: "John", lastName: "Doe", dateOfBirth: null }]);

    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should return empty array when no clients exist", async () => {
    mockClients([]);

    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should create critical alert when client has reached RMD age this year", async () => {
    const now = new Date();
    const rmdAge = 73;
    const dob = new Date(now.getFullYear() - rmdAge, now.getMonth(), now.getDate());
    dob.setMonth(dob.getMonth() - 1);

    mockClients([{
      id: "c1",
      firstName: "Jane",
      lastName: "Smith",
      dateOfBirth: dob.toISOString().split("T")[0],
      advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe("critical");
    expect(result[0].type).toBe("rmd");
    expect(result[0].title).toContain("RMD Required");
    expect(result[0].clientId).toBe("c1");
  });

  it("should create warning alert when client is within 180 days of RMD age", async () => {
    const now = new Date();
    const rmdAge = 73;
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + 90);
    const dob = new Date(
      futureDate.getFullYear() - rmdAge,
      futureDate.getMonth(),
      futureDate.getDate()
    );

    mockClients([{
      id: "c2",
      firstName: "Bob",
      lastName: "Jones",
      dateOfBirth: dob.toISOString().split("T")[0],
      advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe("warning");
    expect(result[0].title).toContain("RMD Planning Alert");
  });

  it("should not create alert for young clients", async () => {
    mockClients([{
      id: "c3",
      firstName: "Young",
      lastName: "Client",
      dateOfBirth: "1990-01-01",
      advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should skip clients with invalid DOB", async () => {
    mockClients([{
      id: "c4",
      firstName: "Bad",
      lastName: "Date",
      dateOfBirth: "not-a-date",
      advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should not create alert for clients past 1 year of RMD age", async () => {
    const now = new Date();
    const rmdAge = 73;
    const dob = new Date(now.getFullYear() - rmdAge - 2, now.getMonth(), now.getDate());

    mockClients([{
      id: "c5",
      firstName: "Old",
      lastName: "Client",
      dateOfBirth: dob.toISOString().split("T")[0],
      advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result).toEqual([]);
  });

  it("should handle multiple clients with mixed eligibility", async () => {
    const now = new Date();
    const rmdAge = 73;
    const eligibleDob = new Date(now.getFullYear() - rmdAge, now.getMonth() - 1, now.getDate());

    mockClients([
      {
        id: "c1", firstName: "Eligible", lastName: "One",
        dateOfBirth: eligibleDob.toISOString().split("T")[0], advisorId,
      },
      {
        id: "c2", firstName: "Young", lastName: "Person",
        dateOfBirth: "1990-05-15", advisorId,
      },
      {
        id: "c3", firstName: "No", lastName: "Dob",
        dateOfBirth: null, advisorId,
      },
    ]);

    const result = await generator.generate(advisorId);
    expect(result.length).toBe(1);
    expect(result[0].clientId).toBe("c1");
  });

  it("should set isRead to false on generated alerts", async () => {
    const now = new Date();
    const rmdAge = 73;
    const dob = new Date(now.getFullYear() - rmdAge, now.getMonth() - 1, now.getDate());

    mockClients([{
      id: "c1", firstName: "Test", lastName: "Client",
      dateOfBirth: dob.toISOString().split("T")[0], advisorId,
    }]);

    const result = await generator.generate(advisorId);
    expect(result[0].isRead).toBe(false);
  });
});
