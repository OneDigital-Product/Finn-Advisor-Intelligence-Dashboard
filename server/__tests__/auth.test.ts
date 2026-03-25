import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../auth";

describe("Authentication Security", () => {
  const password = "MySecurePassword123!";

  it("should hash password with unique salt each time", () => {
    const hash1 = hashPassword(password);
    const hash2 = hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });

  it("should produce hash in salt:hash format", () => {
    const hash = hashPassword(password);
    const parts = hash.split(":");

    expect(parts.length).toBe(2);
    expect(parts[0].length).toBe(32);
    expect(parts[1].length).toBe(128);
  });

  it("should verify correct password", () => {
    const hash = hashPassword(password);
    const isValid = verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });

  it("should reject incorrect password", () => {
    const hash = hashPassword(password);
    const isValid = verifyPassword("WrongPassword", hash);

    expect(isValid).toBe(false);
  });

  it("should be case-sensitive", () => {
    const hash = hashPassword(password);
    const isValid = verifyPassword(password.toLowerCase(), hash);

    expect(isValid).toBe(false);
  });

  it("should use timing-safe comparison (similar timing for correct/incorrect)", () => {
    const hash = hashPassword(password);

    const iterations = 10;
    let correctTotal = 0;
    let wrongTotal = 0;

    for (let i = 0; i < iterations; i++) {
      const start1 = performance.now();
      verifyPassword(password, hash);
      correctTotal += performance.now() - start1;

      const start2 = performance.now();
      verifyPassword("WrongPassword", hash);
      wrongTotal += performance.now() - start2;
    }

    const avgCorrect = correctTotal / iterations;
    const avgWrong = wrongTotal / iterations;

    expect(Math.abs(avgCorrect - avgWrong)).toBeLessThan(10);
  });

  it("should handle empty password", () => {
    const hash = hashPassword("");
    expect(verifyPassword("", hash)).toBe(true);
    expect(verifyPassword("notempty", hash)).toBe(false);
  });

  it("should handle special characters", () => {
    const specialPassword = "p@$$w0rd!#%^&*()_+-={}[]|\\:\";<>?,./~`";
    const hash = hashPassword(specialPassword);

    expect(verifyPassword(specialPassword, hash)).toBe(true);
    expect(verifyPassword("different", hash)).toBe(false);
  });
});
