import { describe, it, expect } from "vitest";
import {
  calculateCharitableTaxImpact,
  type CharitableTaxInput,
  type ContributionInput,
} from "../calculators/charitable-tax-calculator";

function makeInput(overrides: Partial<CharitableTaxInput> = {}): CharitableTaxInput {
  return {
    agi: 200000,
    filingStatus: "single",
    contributions: [{ amount: 20000, type: "cash_public" }],
    ...overrides,
  };
}

describe("Charitable Tax Calculator", () => {
  describe("Happy path — basic deduction", () => {
    it("should return a valid result structure", () => {
      const result = calculateCharitableTaxImpact(makeInput());
      expect(result).toHaveProperty("deductions");
      expect(result).toHaveProperty("totalDeductedThisYear");
      expect(result).toHaveProperty("totalCarryforward");
      expect(result).toHaveProperty("itemizingBeneficial");
      expect(result).toHaveProperty("carryforwardSchedule");
      expect(result).toHaveProperty("strategyComparison");
      expect(result).toHaveProperty("crtProjection");
      expect(result).toHaveProperty("qcdOptimization");
      expect(result).toHaveProperty("effectiveTaxRate");
      expect(result).toHaveProperty("marginalRate");
      expect(result).toHaveProperty("taxSavingsFromDeductions");
      expect(result).toHaveProperty("notes");
    });

    it("should fully deduct cash contribution within AGI limits", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 200000,
        contributions: [{ amount: 20000, type: "cash_public" }],
      }));
      expect(result.deductions[0].deductedThisYear).toBe(20000);
      expect(result.deductions[0].carryforward).toBe(0);
    });

    it("should compute tax savings when itemizing is beneficial", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 200000,
        contributions: [{ amount: 30000, type: "cash_public" }],
      }));
      expect(result.itemizingBeneficial).toBe(true);
      expect(result.taxSavingsFromDeductions).toBeGreaterThan(0);
    });
  });

  describe("AGI limits by contribution type", () => {
    it("should apply 60% AGI limit for cash to public charities", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 100000,
        contributions: [{ amount: 70000, type: "cash_public" }],
      }));
      expect(result.deductions[0].maxDeductible).toBe(60000);
      expect(result.deductions[0].deductedThisYear).toBe(60000);
      expect(result.deductions[0].carryforward).toBe(10000);
    });

    it("should apply 30% AGI limit for appreciated property", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 100000,
        contributions: [{ amount: 40000, type: "appreciated_property" }],
      }));
      expect(result.deductions[0].maxDeductible).toBe(30000);
      expect(result.deductions[0].deductedThisYear).toBe(30000);
      expect(result.deductions[0].carryforward).toBe(10000);
    });

    it("should apply 20% AGI limit for private foundation", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 100000,
        contributions: [{ amount: 25000, type: "private_foundation" }],
      }));
      expect(result.deductions[0].maxDeductible).toBe(20000);
      expect(result.deductions[0].deductedThisYear).toBe(20000);
      expect(result.deductions[0].carryforward).toBe(5000);
    });

    it("should enforce overall 60% AGI cap across all types", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 100000,
        contributions: [
          { amount: 50000, type: "cash_public" },
          { amount: 20000, type: "appreciated_property" },
        ],
      }));
      expect(result.totalDeductedThisYear).toBeLessThanOrEqual(60000);
    });
  });

  describe("Carryforward", () => {
    it("should generate carryforward when exceeding AGI limits", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 100000,
        contributions: [{ amount: 80000, type: "cash_public" }],
      }));
      expect(result.totalCarryforward).toBe(20000);
      expect(result.notes.some(n => n.includes("carries forward"))).toBe(true);
    });

    it("should produce carryforward schedule projecting up to 5 years", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 100000,
        contributions: [{ amount: 80000, type: "cash_public" }],
      }));
      expect(result.carryforwardSchedule.length).toBeGreaterThan(0);
      expect(result.carryforwardSchedule.length).toBeLessThanOrEqual(5);
    });

    it("should utilize prior carryforward when capacity allows", () => {
      const currentYear = new Date().getFullYear();
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 200000,
        contributions: [{ amount: 10000, type: "cash_public" }],
        priorCarryforward: [{
          year: currentYear - 1,
          amount: 15000,
          type: "cash_public",
          expiresYear: currentYear + 3,
        }],
      }));
      expect(result.notes.some(n => n.includes("carryforward utilized"))).toBe(true);
    });
  });

  describe("Itemizing vs standard deduction", () => {
    it("should detect when itemizing is NOT beneficial", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 200000,
        contributions: [{ amount: 5000, type: "cash_public" }],
      }));
      expect(result.itemizingBeneficial).toBe(false);
      expect(result.taxSavingsFromDeductions).toBe(0);
    });

    it("should detect when itemizing IS beneficial", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 200000,
        contributions: [{ amount: 25000, type: "cash_public" }],
      }));
      expect(result.itemizingBeneficial).toBe(true);
      expect(result.taxSavingsFromDeductions).toBeGreaterThan(0);
    });

    it("should suggest bunching/DAF when deductions below standard deduction", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        contributions: [{ amount: 5000, type: "cash_public" }],
      }));
      expect(result.notes.some(n => n.includes("bunching") || n.includes("DAF"))).toBe(true);
    });

    it("should use MFJ standard deduction for married filing jointly", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        filingStatus: "married_filing_jointly",
        contributions: [{ amount: 5000, type: "cash_public" }],
      }));
      expect(result.notes.some(n => n.includes("Married Filing Jointly"))).toBe(true);
    });
  });

  describe("Marginal and effective tax rate", () => {
    it("should compute correct marginal rate for $200k single", () => {
      const result = calculateCharitableTaxImpact(makeInput({ agi: 200000 }));
      expect(result.marginalRate).toBe(0.24);
    });

    it("should compute effective rate as fraction of AGI", () => {
      const result = calculateCharitableTaxImpact(makeInput({ agi: 200000 }));
      expect(result.effectiveTaxRate).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeLessThan(result.marginalRate);
    });
  });

  describe("Strategy comparison", () => {
    it("should include Direct Cash Gift strategy", () => {
      const result = calculateCharitableTaxImpact(makeInput());
      expect(result.strategyComparison.some(s => s.strategy === "Direct Cash Gift")).toBe(true);
    });

    it("should include DAF strategy", () => {
      const result = calculateCharitableTaxImpact(makeInput());
      expect(result.strategyComparison.some(s => s.strategy.includes("DAF"))).toBe(true);
    });

    it("should include CRT strategy", () => {
      const result = calculateCharitableTaxImpact(makeInput());
      expect(result.strategyComparison.some(s => s.strategy.includes("Charitable Remainder"))).toBe(true);
    });

    it("should include QCD strategy when age and RMD are provided", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        age: 75,
        rmdAmount: 20000,
      }));
      expect(result.strategyComparison.some(s => s.strategy.includes("QCD"))).toBe(true);
    });

    it("should NOT include QCD strategy when age is below 70.5", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        age: 60,
        rmdAmount: 20000,
      }));
      expect(result.strategyComparison.some(s => s.strategy.includes("QCD"))).toBe(false);
    });

    it("should compute CRT income stream", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        crtFundedValue: 500000,
        crtPayoutRate: 0.05,
        crtTermYears: 20,
        crtType: "CRUT",
      }));
      const crtStrategy = result.strategyComparison.find(s => s.strategy.includes("Charitable Remainder"));
      expect(crtStrategy).toBeDefined();
      expect(crtStrategy!.incomeStream).toBeGreaterThan(0);
    });
  });

  describe("CRT Projection", () => {
    it("should return null when CRT params are not provided", () => {
      const result = calculateCharitableTaxImpact(makeInput());
      expect(result.crtProjection).toBeNull();
    });

    it("should compute CRT projection when all params provided (CRUT)", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        crtFundedValue: 1000000,
        crtPayoutRate: 0.05,
        crtTermYears: 20,
        crtType: "CRUT",
      }));
      expect(result.crtProjection).not.toBeNull();
      expect(result.crtProjection!.charitableDeduction).toBeGreaterThan(0);
      expect(result.crtProjection!.annualIncome).toBe(50000);
      expect(result.crtProjection!.totalIncome).toBe(1000000);
      expect(result.crtProjection!.remainderToCharity).toBeGreaterThan(0);
      expect(result.crtProjection!.presentValueOfIncome).toBeGreaterThan(0);
      expect(result.crtProjection!.taxSavingsFromDeduction).toBeGreaterThan(0);
    });

    it("should compute CRT projection for CRAT", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        crtFundedValue: 500000,
        crtPayoutRate: 0.06,
        crtTermYears: 15,
        crtType: "CRAT",
      }));
      expect(result.crtProjection).not.toBeNull();
      expect(result.crtProjection!.annualIncome).toBe(30000);
      expect(result.crtProjection!.charitableDeduction).toBeGreaterThan(0);
    });

    it("should have CRAT and CRUT produce different deductions for same inputs", () => {
      const baseParams = {
        agi: 200000,
        filingStatus: "single" as const,
        contributions: [{ amount: 10000, type: "cash_public" as const }],
        crtFundedValue: 500000,
        crtPayoutRate: 0.05,
        crtTermYears: 20,
      };
      const crat = calculateCharitableTaxImpact({ ...baseParams, crtType: "CRAT" });
      const crut = calculateCharitableTaxImpact({ ...baseParams, crtType: "CRUT" });
      expect(crat.crtProjection!.charitableDeduction).not.toBe(crut.crtProjection!.charitableDeduction);
    });
  });

  describe("QCD Optimization", () => {
    it("should return null when age/rmdAmount not provided", () => {
      const result = calculateCharitableTaxImpact(makeInput());
      expect(result.qcdOptimization).toBeNull();
    });

    it("should compute QCD optimization for eligible client", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        age: 75,
        rmdAmount: 25000,
      }));
      expect(result.qcdOptimization).not.toBeNull();
      expect(result.qcdOptimization!.qcdEligible).toBe(true);
      expect(result.qcdOptimization!.recommendedQcdAmount).toBeGreaterThan(0);
      expect(result.qcdOptimization!.taxSavings).toBeGreaterThan(0);
    });

    it("should mark client under 70.5 as QCD ineligible", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        age: 65,
        rmdAmount: 20000,
      }));
      expect(result.qcdOptimization).not.toBeNull();
      expect(result.qcdOptimization!.qcdEligible).toBe(false);
      expect(result.qcdOptimization!.recommendedQcdAmount).toBe(0);
    });

    it("should cap QCD at $105,000 annual limit", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 500000,
        age: 75,
        rmdAmount: 200000,
      }));
      expect(result.qcdOptimization!.recommendedQcdAmount).toBeLessThanOrEqual(105000);
    });

    it("should note when AGI is at or below standard deduction", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 10000,
        age: 75,
        rmdAmount: 5000,
        contributions: [{ amount: 1000, type: "cash_public" }],
      }));
      expect(result.qcdOptimization!.notes.some(n => n.includes("no additional tax benefit"))).toBe(true);
    });

    it("should note when full RMD can be satisfied through QCD", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 50000,
        age: 75,
        rmdAmount: 15000,
      }));
      if (result.qcdOptimization!.recommendedQcdAmount >= 15000) {
        expect(result.qcdOptimization!.notes.some(n => n.includes("Full RMD"))).toBe(true);
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle zero contributions", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        contributions: [],
      }));
      expect(result.totalDeductedThisYear).toBe(0);
      expect(result.deductions.length).toBe(0);
    });

    it("should handle very large AGI", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 10000000,
        contributions: [{ amount: 5000000, type: "cash_public" }],
      }));
      expect(result.deductions[0].deductedThisYear).toBeLessThanOrEqual(6000000);
      expect(result.marginalRate).toBe(0.37);
    });

    it("should handle zero AGI", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 0,
        contributions: [{ amount: 1000, type: "cash_public" }],
      }));
      expect(result.effectiveTaxRate).toBe(0);
      expect(result.deductions[0].maxDeductible).toBe(0);
    });

    it("should handle multiple contribution types simultaneously", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        agi: 300000,
        contributions: [
          { amount: 50000, type: "cash_public" },
          { amount: 30000, type: "appreciated_property" },
          { amount: 10000, type: "private_foundation" },
        ],
      }));
      expect(result.deductions.length).toBe(3);
      expect(result.totalDeductedThisYear).toBeGreaterThan(0);
    });

    it("should handle custom standard deduction override", () => {
      const result = calculateCharitableTaxImpact(makeInput({
        standardDeductionOverride: 20000,
        contributions: [{ amount: 25000, type: "cash_public" }],
      }));
      expect(result.itemizingBeneficial).toBe(true);
    });

    it("should include filing status and AGI in notes", () => {
      const result = calculateCharitableTaxImpact(makeInput());
      expect(result.notes.some(n => n.includes("Single"))).toBe(true);
      expect(result.notes.some(n => n.includes("AGI"))).toBe(true);
    });
  });
});
