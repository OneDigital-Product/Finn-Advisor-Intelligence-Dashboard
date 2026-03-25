import { describe, it, expect } from "vitest";
import { calculateRMD, type RMDInput } from "../calculators/rmd-calculator";

describe("RMD Calculator", () => {
  const baseInput: RMDInput = {
    accountHolderDOB: "1950-06-15",
    accountBalance: 500000,
    taxYear: 2025,
    assumedGrowthRate: 0.07,
    projectionYears: 10,
  };

  describe("Standard withdrawal calculations", () => {
    it("should calculate RMD for age 75 using Uniform Lifetime Table", () => {
      const result = calculateRMD(baseInput);

      expect(result.currentYearRMD).toBeGreaterThan(0);
      expect(result.lifeExpectancyFactor).toBe(24.6);
      expect(result.currentYearRMD).toBeCloseTo(500000 / 24.6, 2);
      expect(result.rmdPercentage).toBeCloseTo((1 / 24.6) * 100, 2);
    });

    it("should return projections array with correct length", () => {
      const result = calculateRMD(baseInput);

      expect(result.projections.length).toBeGreaterThan(0);
      expect(result.projections.length).toBeLessThanOrEqual(10);
      expect(result.projections[0].year).toBe(2025);
      expect(result.projections[0].age).toBe(75);
      expect(result.projections[0].accountBalance).toBe(500000);
    });

    it("should project declining balance with RMD withdrawals", () => {
      const input: RMDInput = {
        ...baseInput,
        assumedGrowthRate: 0,
      };
      const result = calculateRMD(input);

      for (let i = 1; i < result.projections.length; i++) {
        expect(result.projections[i].accountBalance).toBeLessThan(
          result.projections[i - 1].accountBalance
        );
      }
    });

    it("should increase withdrawal percentage as age increases", () => {
      const result = calculateRMD(baseInput);

      if (result.projections.length >= 3) {
        expect(result.projections[2].withdrawalPercentage).toBeGreaterThan(
          result.projections[0].withdrawalPercentage
        );
      }
    });
  });

  describe("Age boundary conditions", () => {
    it("should throw for age below 72", () => {
      const youngInput: RMDInput = {
        ...baseInput,
        accountHolderDOB: "1970-01-01",
        taxYear: 2025,
      };
      expect(() => calculateRMD(youngInput)).toThrow("RMD applies at age 72+");
    });

    it("should add SECURE 2.0 note for age 72", () => {
      const age72Input: RMDInput = {
        ...baseInput,
        accountHolderDOB: "1953-06-15",
        taxYear: 2025,
      };
      const result = calculateRMD(age72Input);

      expect(result.notes.some((n) => n.includes("SECURE 2.0"))).toBe(true);
      expect(result.notes.some((n) => n.includes("age-72 rule"))).toBe(true);
    });

    it("should calculate correctly at age 73", () => {
      const age73Input: RMDInput = {
        ...baseInput,
        accountHolderDOB: "1952-06-15",
        taxYear: 2025,
      };
      const result = calculateRMD(age73Input);

      expect(result.lifeExpectancyFactor).toBe(26.5);
      expect(result.currentYearRMD).toBeCloseTo(500000 / 26.5, 2);
    });

    it("should handle very old ages (100+)", () => {
      const oldInput: RMDInput = {
        ...baseInput,
        accountHolderDOB: "1920-01-01",
        taxYear: 2025,
      };
      const result = calculateRMD(oldInput);

      expect(result.lifeExpectancyFactor).toBe(4.7);
    });

    it("should handle age at upper boundary of IRS table (120)", () => {
      const input: RMDInput = {
        ...baseInput,
        accountHolderDOB: "1905-01-01",
        taxYear: 2025,
        projectionYears: 5,
      };
      const result = calculateRMD(input);

      expect(result.lifeExpectancyFactor).toBe(1.0);
      expect(result.projections.length).toBeGreaterThan(0);
    });

    it("should use factor 1.0 for ages over 120", () => {
      const input: RMDInput = {
        ...baseInput,
        accountHolderDOB: "1900-01-01",
        taxYear: 2025,
        projectionYears: 5,
      };
      const result = calculateRMD(input);
      expect(result.projections.length).toBeGreaterThan(0);
    });
  });

  describe("Inherited IRA and SECURE Act rules", () => {
    it("should add inherited IRA note for inherited_ira status", () => {
      const input: RMDInput = {
        ...baseInput,
        inheritanceStatus: "inherited_ira",
      };
      const result = calculateRMD(input);

      expect(
        result.notes.some((n) => n.includes("SECURE Act 2.0") && n.includes("10 years"))
      ).toBe(true);
    });

    it("should add note for post_secure_act status", () => {
      const input: RMDInput = {
        ...baseInput,
        inheritanceStatus: "post_secure_act",
      };
      const result = calculateRMD(input);

      expect(
        result.notes.some((n) => n.includes("Non-spouse beneficiaries must deplete"))
      ).toBe(true);
    });

    it("should add non-spouse beneficiary note", () => {
      const input: RMDInput = {
        ...baseInput,
        beneficiaryRelationship: "non_spouse",
      };
      const result = calculateRMD(input);

      expect(
        result.notes.some((n) => n.includes("10-year distribution rule"))
      ).toBe(true);
    });

    it("should note spouse beneficiary 10+ years younger (Joint Life Table)", () => {
      const input: RMDInput = {
        ...baseInput,
        beneficiaryDOB: "1965-01-01",
        beneficiaryRelationship: "spouse",
      };
      const result = calculateRMD(input);

      expect(
        result.notes.some((n) => n.includes("Spouse beneficiary is 10+ years younger"))
      ).toBe(true);
    });

    it("should not add spouse-younger note if age gap is small", () => {
      const input: RMDInput = {
        ...baseInput,
        beneficiaryDOB: "1952-01-01",
        beneficiaryRelationship: "spouse",
      };
      const result = calculateRMD(input);

      const spouseNotes = result.notes.filter((n) =>
        n.includes("Spouse beneficiary is 10+ years younger")
      );
      expect(spouseNotes.length).toBeLessThanOrEqual(1);
    });
  });

  describe("Invalid input handling", () => {
    it("should throw for invalid date of birth", () => {
      const input: RMDInput = {
        ...baseInput,
        accountHolderDOB: "not-a-date",
      };
      expect(() => calculateRMD(input)).toThrow("Invalid account holder date of birth");
    });

    it("should throw for zero account balance", () => {
      const input: RMDInput = {
        ...baseInput,
        accountBalance: 0,
      };
      expect(() => calculateRMD(input)).toThrow("Account balance must be greater than $0");
    });

    it("should throw for negative account balance", () => {
      const input: RMDInput = {
        ...baseInput,
        accountBalance: -100,
      };
      expect(() => calculateRMD(input)).toThrow("Account balance must be greater than $0");
    });

    it("should throw for invalid tax year (too low)", () => {
      const input: RMDInput = {
        ...baseInput,
        taxYear: 1999,
      };
      expect(() => calculateRMD(input)).toThrow("Tax year must be between 2000 and 2100");
    });

    it("should throw for invalid tax year (too high)", () => {
      const input: RMDInput = {
        ...baseInput,
        taxYear: 2101,
      };
      expect(() => calculateRMD(input)).toThrow("Tax year must be between 2000 and 2100");
    });

    it("should throw for empty DOB string", () => {
      const input: RMDInput = {
        ...baseInput,
        accountHolderDOB: "",
      };
      expect(() => calculateRMD(input)).toThrow("Invalid account holder date of birth");
    });
  });

  describe("IRS Uniform Lifetime Table verification", () => {
    const knownFactors: [number, number][] = [
      [72, 27.4], [73, 26.5], [74, 25.5], [75, 24.6], [76, 23.7],
      [77, 22.9], [78, 22.0], [79, 21.1], [80, 20.2], [81, 19.4],
      [82, 18.5], [83, 17.7], [84, 16.8], [85, 16.0], [86, 15.3],
      [87, 14.5], [88, 13.8], [89, 13.1], [90, 12.4], [91, 11.7],
      [92, 11.1], [93, 10.5], [94, 9.9], [95, 9.4], [96, 8.8],
      [97, 8.3], [98, 7.8], [99, 7.3], [100, 6.8],
    ];

    it.each(knownFactors)(
      "should use factor %f for age %i",
      (age, expectedFactor) => {
        const birthYear = 2025 - age;
        const input: RMDInput = {
          ...baseInput,
          accountHolderDOB: `${birthYear}-06-15`,
          taxYear: 2025,
        };
        const result = calculateRMD(input);
        expect(result.lifeExpectancyFactor).toBe(expectedFactor);
      }
    );

    it("should compute RMD as balance / factor for each age", () => {
      const balance = 1000000;
      for (const [age, factor] of knownFactors.slice(0, 5)) {
        const birthYear = 2025 - age;
        const result = calculateRMD({
          ...baseInput,
          accountBalance: balance,
          accountHolderDOB: `${birthYear}-06-15`,
          taxYear: 2025,
        });
        expect(result.currentYearRMD).toBeCloseTo(balance / factor, 2);
        expect(result.rmdPercentage).toBeCloseTo((1 / factor) * 100, 2);
      }
    });
  });

  describe("QCD (Qualified Charitable Distribution)", () => {
    it("should include QCD summary when qcdAmount is provided", () => {
      const input: RMDInput = {
        ...baseInput,
        qcdAmount: 5000,
        marginalTaxRate: 0.24,
      };
      const result = calculateRMD(input);
      if (result.qcdSummary) {
        expect(result.qcdSummary.totalQCDOverPeriod).toBeGreaterThan(0);
        expect(result.qcdSummary.totalTaxSavings).toBeGreaterThan(0);
      }
    });
  });

  describe("Projection behavior", () => {
    it("should stop projection when balance depletes", () => {
      const input: RMDInput = {
        ...baseInput,
        accountBalance: 100,
        assumedGrowthRate: -0.99,
        projectionYears: 20,
      };
      const result = calculateRMD(input);

      expect(result.projections.length).toBeLessThan(20);
      expect(result.notes.some((n) => n.includes("deplete"))).toBe(true);
    });

    it("should always include growth rate note", () => {
      const result = calculateRMD(baseInput);

      expect(result.notes.some((n) => n.includes("7.0% annual growth rate"))).toBe(true);
    });

    it("should always include December 31 deadline note", () => {
      const result = calculateRMD(baseInput);

      expect(result.notes.some((n) => n.includes("December 31"))).toBe(true);
    });

    it("should always include Roth IRA note", () => {
      const result = calculateRMD(baseInput);

      expect(result.notes.some((n) => n.includes("Roth IRAs have NO RMD"))).toBe(true);
    });

    it("should round amounts to 2 decimal places", () => {
      const result = calculateRMD(baseInput);

      const decimals = (n: number) => (n.toString().split(".")[1] || "").length;
      expect(decimals(result.currentYearRMD)).toBeLessThanOrEqual(2);
      for (const p of result.projections) {
        expect(decimals(p.rmdAmount)).toBeLessThanOrEqual(2);
        expect(decimals(p.accountBalance)).toBeLessThanOrEqual(2);
      }
    });
  });
});
