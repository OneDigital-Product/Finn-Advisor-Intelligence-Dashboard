import { describe, it, expect } from "vitest";
import {
  calculateTaxBracket,
  type TaxBracketInput,
} from "../calculators/tax-bracket-calculator";

function makeInput(overrides: Partial<TaxBracketInput> = {}): TaxBracketInput {
  return {
    grossIncome: 150000,
    filingStatus: "single",
    deductions: 0,
    additionalIncome: 0,
    stateRate: 0.05,
    projectionYears: 5,
    expectedIncomeGrowth: 0.03,
    expectedBracketInflation: 0.02,
    ...overrides,
  };
}

describe("Tax Bracket Calculator", () => {
  describe("Known-answer verification against 2024 IRS brackets (Single)", () => {
    it("should compute correct federal tax at $50,000 income (after standard deduction)", () => {
      const result = calculateTaxBracket(makeInput({
        grossIncome: 50000,
        stateRate: 0,
      }));
      const taxableIncome = 50000 - 14600;
      const expectedTax =
        11600 * 0.10 +
        (taxableIncome - 11600) * 0.12;
      expect(result.currentYear.federalTax).toBeCloseTo(expectedTax, 0);
    });

    it("should compute correct tax at $100,000 income", () => {
      const result = calculateTaxBracket(makeInput({
        grossIncome: 100000,
        stateRate: 0,
      }));
      const taxableIncome = 100000 - 14600;
      const expectedTax =
        11600 * 0.10 +
        (47150 - 11600) * 0.12 +
        (taxableIncome - 47150) * 0.22;
      expect(result.currentYear.federalTax).toBeCloseTo(expectedTax, 0);
    });

    it("should compute correct tax at $250,000 income", () => {
      const result = calculateTaxBracket(makeInput({
        grossIncome: 250000,
        stateRate: 0,
      }));
      const taxableIncome = 250000 - 14600;
      const expectedTax =
        11600 * 0.10 +
        (47150 - 11600) * 0.12 +
        (100525 - 47150) * 0.22 +
        (191950 - 100525) * 0.24 +
        (taxableIncome - 191950) * 0.32;
      expect(result.currentYear.federalTax).toBeCloseTo(expectedTax, 0);
    });

    it("should identify correct marginal rate at each bracket boundary", () => {
      expect(calculateTaxBracket(makeInput({ grossIncome: 25000, stateRate: 0 })).currentYear.marginalRate).toBe(0.10);
      expect(calculateTaxBracket(makeInput({ grossIncome: 30000, stateRate: 0 })).currentYear.marginalRate).toBe(0.12);
      expect(calculateTaxBracket(makeInput({ grossIncome: 65000, stateRate: 0 })).currentYear.marginalRate).toBe(0.22);
      expect(calculateTaxBracket(makeInput({ grossIncome: 120000, stateRate: 0 })).currentYear.marginalRate).toBe(0.24);
      expect(calculateTaxBracket(makeInput({ grossIncome: 220000, stateRate: 0 })).currentYear.marginalRate).toBe(0.32);
      expect(calculateTaxBracket(makeInput({ grossIncome: 300000, stateRate: 0 })).currentYear.marginalRate).toBe(0.35);
      expect(calculateTaxBracket(makeInput({ grossIncome: 650000, stateRate: 0 })).currentYear.marginalRate).toBe(0.37);
    });
  });

  describe("Known-answer verification against 2024 IRS brackets (MFJ)", () => {
    it("should use MFJ standard deduction of $29,200", () => {
      const result = calculateTaxBracket(makeInput({
        filingStatus: "married_filing_jointly",
        grossIncome: 100000,
      }));
      expect(result.currentYear.deductions).toBe(29200);
    });

    it("should compute correct MFJ marginal rate at $100k", () => {
      const result = calculateTaxBracket(makeInput({
        filingStatus: "married_filing_jointly",
        grossIncome: 100000,
        stateRate: 0,
      }));
      const taxableIncome = 100000 - 29200;
      expect(result.currentYear.marginalRate).toBe(0.12);
      expect(result.currentYear.taxableIncome).toBe(taxableIncome);
    });

    it("should have lower tax than single for same income", () => {
      const singleResult = calculateTaxBracket(makeInput({ grossIncome: 200000, stateRate: 0 }));
      const mfjResult = calculateTaxBracket(makeInput({
        filingStatus: "married_filing_jointly",
        grossIncome: 200000,
        stateRate: 0,
      }));
      expect(mfjResult.currentYear.federalTax).toBeLessThan(singleResult.currentYear.federalTax);
    });
  });

  describe("Effective rate calculations", () => {
    it("should compute effective rate as totalTax / totalIncome", () => {
      const result = calculateTaxBracket(makeInput({ stateRate: 0.05 }));
      const expected = result.currentYear.totalTax / result.currentYear.totalIncome;
      expect(result.currentYear.effectiveRate).toBeCloseTo(expected, 4);
    });

    it("should have effective rate lower than marginal rate", () => {
      const result = calculateTaxBracket(makeInput({ grossIncome: 200000 }));
      expect(result.currentYear.effectiveRate).toBeLessThan(result.currentYear.marginalRate);
    });

    it("should return 0 effective rate for zero income", () => {
      const result = calculateTaxBracket(makeInput({ grossIncome: 0, stateRate: 0 }));
      expect(result.currentYear.effectiveRate).toBe(0);
    });
  });

  describe("Standard deduction vs itemized", () => {
    it("should use standard deduction when deductions is 0", () => {
      const result = calculateTaxBracket(makeInput({ deductions: 0 }));
      expect(result.currentYear.deductions).toBe(14600);
      expect(result.notes.some(n => n.includes("standard deduction"))).toBe(true);
    });

    it("should use provided deductions when > 0", () => {
      const result = calculateTaxBracket(makeInput({ deductions: 30000 }));
      expect(result.currentYear.deductions).toBe(30000);
      expect(result.currentYear.taxableIncome).toBe(150000 - 30000);
    });
  });

  describe("Additional income", () => {
    it("should add additional income to total income", () => {
      const result = calculateTaxBracket(makeInput({
        grossIncome: 100000,
        additionalIncome: 50000,
      }));
      expect(result.currentYear.totalIncome).toBe(150000);
    });
  });

  describe("Bracket headroom", () => {
    it("should calculate correct headroom before next bracket", () => {
      const result = calculateTaxBracket(makeInput({
        grossIncome: 60000,
        stateRate: 0,
      }));
      const taxableIncome = 60000 - 14600;
      const headroom = 47150 - taxableIncome;
      expect(result.currentYear.bracketHeadroom).toBe(Math.round(headroom));
    });

    it("should warn when headroom is under $25k", () => {
      const result = calculateTaxBracket(makeInput({
        grossIncome: 105000,
        stateRate: 0,
      }));
      const taxableIncome = 105000 - 14600;
      if (100525 > taxableIncome) {
        const headroom = 100525 - taxableIncome;
        if (headroom < 25000) {
          expect(result.notes.some(n => n.includes("headroom"))).toBe(true);
        }
      }
    });

    it("should return 0 headroom in top bracket", () => {
      const result = calculateTaxBracket(makeInput({ grossIncome: 700000, stateRate: 0 }));
      expect(result.currentYear.bracketHeadroom).toBe(0);
    });
  });

  describe("Bracket breakdown", () => {
    it("should return 7 brackets for single filer", () => {
      const result = calculateTaxBracket(makeInput());
      expect(result.currentYear.bracketBreakdown.length).toBe(7);
    });

    it("should mark exactly one bracket as current", () => {
      const result = calculateTaxBracket(makeInput({ grossIncome: 100000 }));
      const currentBrackets = result.currentYear.bracketBreakdown.filter(b => b.isCurrentBracket);
      expect(currentBrackets.length).toBe(1);
    });

    it("should sum bracket taxes to equal total federal tax", () => {
      const result = calculateTaxBracket(makeInput({ grossIncome: 200000, stateRate: 0 }));
      const bracketTaxSum = result.currentYear.bracketBreakdown.reduce(
        (s, b) => s + b.taxInBracket, 0
      );
      expect(bracketTaxSum).toBeCloseTo(result.currentYear.federalTax, 0);
    });
  });

  describe("Projections", () => {
    it("should produce correct number of projection years", () => {
      const result = calculateTaxBracket(makeInput({ projectionYears: 10 }));
      expect(result.projections.length).toBe(10);
    });

    it("should increase gross income by growth rate each year", () => {
      const result = calculateTaxBracket(makeInput({
        grossIncome: 100000,
        additionalIncome: 0,
        expectedIncomeGrowth: 0.05,
        projectionYears: 3,
      }));
      expect(result.projections[0].grossIncome).toBeCloseTo(105000, -2);
      expect(result.projections[1].grossIncome).toBeCloseTo(110250, -2);
      expect(result.projections[2].grossIncome).toBeCloseTo(115763, -2);
    });

    it("should always include projection inflation note", () => {
      const result = calculateTaxBracket(makeInput());
      expect(result.notes.some(n => n.includes("inflation adjustments"))).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero income", () => {
      const result = calculateTaxBracket(makeInput({ grossIncome: 0, stateRate: 0 }));
      expect(result.currentYear.federalTax).toBe(0);
      expect(result.currentYear.taxableIncome).toBe(0);
    });

    it("should handle very high income ($10M)", () => {
      const result = calculateTaxBracket(makeInput({ grossIncome: 10000000, stateRate: 0 }));
      expect(result.currentYear.marginalRate).toBe(0.37);
      expect(result.currentYear.federalTax).toBeGreaterThan(3000000);
    });

    it("should not produce negative taxable income with large deductions", () => {
      const result = calculateTaxBracket(makeInput({
        grossIncome: 10000,
        deductions: 50000,
      }));
      expect(result.currentYear.taxableIncome).toBe(0);
      expect(result.currentYear.federalTax).toBe(0);
    });

    it("should handle state tax as flat rate on total income", () => {
      const result = calculateTaxBracket(makeInput({
        grossIncome: 100000,
        stateRate: 0.10,
      }));
      expect(result.currentYear.stateTax).toBeCloseTo(10000, 0);
    });

    it("should combine federal and state for total tax", () => {
      const result = calculateTaxBracket(makeInput());
      expect(result.currentYear.totalTax).toBeCloseTo(
        result.currentYear.federalTax + result.currentYear.stateTax,
        2
      );
    });
  });
});
