import { describe, it, expect } from "vitest";
import {
  calculateRothConversion,
  type RothConversionInput,
} from "../calculators/roth-conversion-calculator";

function makeInput(overrides: Partial<RothConversionInput> = {}): RothConversionInput {
  return {
    currentAge: 50,
    retirementAge: 65,
    traditionalIRABalance: 500000,
    rothIRABalance: 100000,
    annualIncome: 150000,
    filingStatus: "single",
    stateRate: 0.05,
    expectedRetirementRate: 0.15,
    conversionAmount: 50000,
    projectionYears: 20,
    expectedGrowthRate: 0.07,
    ...overrides,
  };
}

describe("Roth Conversion Calculator", () => {
  describe("Happy path", () => {
    it("should return a valid result structure", () => {
      const result = calculateRothConversion(makeInput());
      expect(result).toHaveProperty("conversionAmount");
      expect(result).toHaveProperty("taxOnConversion");
      expect(result).toHaveProperty("effectiveTaxRate");
      expect(result).toHaveProperty("marginalBracketBeforeConversion");
      expect(result).toHaveProperty("marginalBracketAfterConversion");
      expect(result).toHaveProperty("breakevenYears");
      expect(result).toHaveProperty("projections");
      expect(result).toHaveProperty("noConversionEndBalance");
      expect(result).toHaveProperty("withConversionEndBalance");
      expect(result).toHaveProperty("netBenefit");
      expect(result).toHaveProperty("bracketImpact");
      expect(result).toHaveProperty("notes");
    });

    it("should produce correct number of projection years", () => {
      const result = calculateRothConversion(makeInput());
      expect(result.projections.length).toBe(20);
    });

    it("should set conversion amount equal to requested amount", () => {
      const result = calculateRothConversion(makeInput({ conversionAmount: 30000 }));
      expect(result.conversionAmount).toBe(30000);
    });
  });

  describe("Tax calculation verification against IRS brackets", () => {
    it("should compute correct federal tax for single at $150k income", () => {
      const result = calculateRothConversion(makeInput({ stateRate: 0 }));
      const expectedTaxBefore =
        11600 * 0.10 +
        (47150 - 11600) * 0.12 +
        (100525 - 47150) * 0.22 +
        (150000 - 100525) * 0.24;
      expect(result.bracketImpact.taxBeforeConversion).toBeCloseTo(expectedTaxBefore, 0);
    });

    it("should compute correct marginal rate at $150k single", () => {
      const result = calculateRothConversion(makeInput());
      expect(result.marginalBracketBeforeConversion).toBe(0.24);
    });

    it("should push into higher bracket with large conversion", () => {
      const result = calculateRothConversion(makeInput({
        annualIncome: 180000,
        conversionAmount: 20000,
      }));
      expect(result.marginalBracketBeforeConversion).toBe(0.24);
      expect(result.marginalBracketAfterConversion).toBe(0.32);
    });

    it("should detect bracket bump and add note", () => {
      const result = calculateRothConversion(makeInput({
        annualIncome: 180000,
        conversionAmount: 20000,
      }));
      expect(result.notes.some(n => n.includes("32%") && n.includes("24%"))).toBe(true);
    });
  });

  describe("Married filing jointly brackets", () => {
    it("should use MFJ brackets for married filing status", () => {
      const result = calculateRothConversion(makeInput({
        filingStatus: "married_filing_jointly",
        annualIncome: 200000,
      }));
      expect(result.marginalBracketBeforeConversion).toBe(0.22);
    });

    it("should have higher bracket threshold for MFJ", () => {
      const singleResult = calculateRothConversion(makeInput({
        filingStatus: "single",
        annualIncome: 200000,
      }));
      const mfjResult = calculateRothConversion(makeInput({
        filingStatus: "married_filing_jointly",
        annualIncome: 200000,
      }));
      expect(mfjResult.marginalBracketBeforeConversion).toBeLessThan(
        singleResult.marginalBracketBeforeConversion
      );
    });
  });

  describe("Breakeven analysis", () => {
    it("should find breakeven when retirement rate exceeds current rate", () => {
      const result = calculateRothConversion(makeInput({
        expectedRetirementRate: 0.30,
        conversionAmount: 30000,
      }));
      expect(result.breakevenYears).toBeLessThan(20);
    });

    it("should note when breakeven exceeds years to retirement", () => {
      const result = calculateRothConversion(makeInput({
        currentAge: 60,
        retirementAge: 62,
        expectedRetirementRate: 0.15,
        conversionAmount: 50000,
        projectionYears: 30,
      }));
      expect(result.notes.some(n => n.includes("Breakeven"))).toBe(true);
    });
  });

  describe("Effective tax rate analysis", () => {
    it("should note favorable conversion when effective rate below retirement rate", () => {
      const result = calculateRothConversion(makeInput({
        annualIncome: 50000,
        conversionAmount: 10000,
        expectedRetirementRate: 0.30,
      }));
      expect(result.notes.some(n => n.includes("generally favorable"))).toBe(true);
    });

    it("should note unfavorable when effective rate exceeds retirement rate", () => {
      const result = calculateRothConversion(makeInput({
        annualIncome: 400000,
        conversionAmount: 200000,
        expectedRetirementRate: 0.10,
      }));
      expect(result.notes.some(n => n.includes("Consider a smaller conversion"))).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should cap conversion at Traditional IRA balance", () => {
      const result = calculateRothConversion(makeInput({
        traditionalIRABalance: 20000,
        conversionAmount: 100000,
      }));
      expect(result.conversionAmount).toBe(20000);
      expect(result.notes.some(n => n.includes("capped"))).toBe(true);
    });

    it("should handle zero conversion amount", () => {
      const result = calculateRothConversion(makeInput({ conversionAmount: 0 }));
      expect(result.taxOnConversion).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
    });

    it("should handle zero Traditional IRA balance", () => {
      const result = calculateRothConversion(makeInput({
        traditionalIRABalance: 0,
        conversionAmount: 50000,
      }));
      expect(result.conversionAmount).toBe(0);
    });

    it("should note 5-year rule for under-59 clients", () => {
      const result = calculateRothConversion(makeInput({ currentAge: 45 }));
      expect(result.notes.some(n => n.includes("5-year holding period"))).toBe(true);
    });

    it("should not note 5-year rule for 59+ clients", () => {
      const result = calculateRothConversion(makeInput({ currentAge: 60 }));
      expect(result.notes.some(n => n.includes("5-year holding period"))).toBe(false);
    });

    it("should handle zero growth rate", () => {
      const result = calculateRothConversion(makeInput({ expectedGrowthRate: 0 }));
      expect(result.projections.length).toBe(20);
      expect(result.projections[0].traditionalBalance).toBe(450000);
    });

    it("should compute bracket impact additionalTax correctly", () => {
      const result = calculateRothConversion(makeInput({ stateRate: 0 }));
      const expected = result.bracketImpact.taxAfterConversion - result.bracketImpact.taxBeforeConversion;
      expect(result.bracketImpact.additionalTax).toBeCloseTo(expected, 2);
    });
  });

  describe("Projection correctness", () => {
    it("should show age incrementing in projections", () => {
      const result = calculateRothConversion(makeInput({ currentAge: 50 }));
      expect(result.projections[0].age).toBe(51);
      expect(result.projections[1].age).toBe(52);
    });

    it("should show conversion amount only in year 1", () => {
      const result = calculateRothConversion(makeInput());
      expect(result.projections[0].convertedAmount).toBe(50000);
      expect(result.projections[1].convertedAmount).toBe(0);
    });

    it("should grow balances at expected growth rate", () => {
      const result = calculateRothConversion(makeInput({
        expectedGrowthRate: 0.10,
        stateRate: 0,
      }));
      const tradYear0 = 500000 - result.conversionAmount;
      const tradYear1 = tradYear0 * 1.10;
      expect(result.projections[0].traditionalBalance).toBeCloseTo(tradYear1, 0);
    });
  });
});
