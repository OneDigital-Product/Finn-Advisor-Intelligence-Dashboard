import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateQSBS,
  type QSBSInput,
  type QSBSHolding,
} from "../calculators/qsbs-calculator";

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function yearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().split("T")[0];
}

function makeHolding(overrides: Partial<QSBSHolding> = {}): QSBSHolding {
  return {
    companyName: "TechCo",
    sharesOwned: 10000,
    costBasis: 100000,
    currentValue: 500000,
    acquisitionDate: yearsAgo(6),
    qualifiedSmallBusiness: true,
    cCorpAtAcquisition: true,
    grossAssetsUnder50M: true,
    activeBusinessRequirement: true,
    originalHolder: true,
    ...overrides,
  };
}

function makeInput(overrides: Partial<QSBSInput> = {}): QSBSInput {
  return {
    holdings: [makeHolding()],
    federalCapitalGainsRate: 0.20,
    stateCapitalGainsRate: 0.05,
    ...overrides,
  };
}

describe("QSBS Calculator", () => {
  describe("Happy path — fully qualified holding", () => {
    it("should return qualified status for 6-year holding meeting all criteria", () => {
      const result = calculateQSBS(makeInput());
      expect(result.analyses[0].status).toBe("qualified");
      expect(result.analyses[0].section1202Eligible).toBe(true);
      expect(result.analyses[0].meetsHoldingPeriod).toBe(true);
    });

    it("should compute excludable gain as min(unrealized gain, max exclusion)", () => {
      const result = calculateQSBS(makeInput());
      const analysis = result.analyses[0];
      expect(analysis.unrealizedGain).toBe(400000);
      expect(analysis.maxExclusion).toBe(Math.max(10000000, 100000 * 10));
      expect(analysis.excludableGain).toBe(400000);
      expect(analysis.taxableGain).toBe(0);
    });

    it("should compute tax savings at combined federal + state rate", () => {
      const result = calculateQSBS(makeInput());
      const analysis = result.analyses[0];
      expect(analysis.estimatedTaxSavings).toBeCloseTo(400000 * 0.25, 0);
    });
  });

  describe("Section 1202 exclusion limits", () => {
    it("should use $10M exclusion for low cost basis", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ costBasis: 500000, currentValue: 15000000 })],
      }));
      const analysis = result.analyses[0];
      expect(analysis.maxExclusion).toBe(10000000);
      expect(analysis.excludableGain).toBe(10000000);
      expect(analysis.taxableGain).toBe(4500000);
    });

    it("should use 10x basis when basis > $1M", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ costBasis: 2000000, currentValue: 30000000 })],
      }));
      const analysis = result.analyses[0];
      expect(analysis.maxExclusion).toBe(20000000);
      expect(analysis.excludableGain).toBe(20000000);
      expect(analysis.taxableGain).toBe(8000000);
    });
  });

  describe("Holding period validation", () => {
    it("should mark as pending if under 5 years", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ acquisitionDate: yearsAgo(3) })],
      }));
      expect(result.analyses[0].status).toBe("pending");
      expect(result.analyses[0].meetsHoldingPeriod).toBe(false);
      expect(result.analyses[0].excludableGain).toBe(0);
    });

    it("should calculate days until qualification for pending holdings", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ acquisitionDate: yearsAgo(4) })],
      }));
      expect(result.analyses[0].daysUntilQualified).toBeGreaterThan(300);
      expect(result.analyses[0].daysUntilQualified).toBeLessThan(400);
    });

    it("should generate high-severity alert within 180 days of qualification", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ acquisitionDate: daysAgo(5 * 365 + 1 - 90) })],
      }));
      expect(result.alerts.some(a => a.severity === "high")).toBe(true);
    });

    it("should generate medium-severity alert between 180-365 days of qualification", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ acquisitionDate: daysAgo(5 * 365 + 1 - 300) })],
      }));
      expect(result.alerts.some(a => a.severity === "medium")).toBe(true);
    });
  });

  describe("Eligibility requirements", () => {
    it("should flag non-qualified small business", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ qualifiedSmallBusiness: false })],
      }));
      expect(result.analyses[0].status).toBe("ineligible");
      expect(result.analyses[0].eligibilityIssues).toContain(
        "Company may not meet qualified small business criteria"
      );
    });

    it("should flag non-C-Corp at acquisition", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ cCorpAtAcquisition: false })],
      }));
      expect(result.analyses[0].status).toBe("ineligible");
      expect(result.analyses[0].eligibilityIssues.some(i => i.includes("C-Corporation"))).toBe(true);
    });

    it("should flag gross assets over $50M", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ grossAssetsUnder50M: false })],
      }));
      expect(result.analyses[0].status).toBe("ineligible");
    });

    it("should flag non-active business", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ activeBusinessRequirement: false })],
      }));
      expect(result.analyses[0].status).toBe("ineligible");
    });

    it("should flag non-original holder", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ originalHolder: false })],
      }));
      expect(result.analyses[0].status).toBe("ineligible");
    });

    it("should accumulate multiple eligibility issues", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({
          qualifiedSmallBusiness: false,
          cCorpAtAcquisition: false,
          originalHolder: false,
        })],
      }));
      expect(result.analyses[0].eligibilityIssues.length).toBe(3);
    });
  });

  describe("Summary and aggregation", () => {
    it("should correctly count qualified, pending, ineligible", () => {
      const result = calculateQSBS(makeInput({
        holdings: [
          makeHolding({ companyName: "A" }),
          makeHolding({ companyName: "B", acquisitionDate: yearsAgo(2) }),
          makeHolding({ companyName: "C", qualifiedSmallBusiness: false }),
        ],
      }));
      expect(result.summary.qualifiedCount).toBe(1);
      expect(result.summary.pendingCount).toBe(1);
      expect(result.summary.ineligibleCount).toBe(1);
    });

    it("should sum total excludable gain and tax savings", () => {
      const result = calculateQSBS(makeInput({
        holdings: [
          makeHolding({ companyName: "A", costBasis: 50000, currentValue: 200000 }),
          makeHolding({ companyName: "B", costBasis: 100000, currentValue: 300000 }),
        ],
      }));
      expect(result.totalExcludableGain).toBe(
        result.analyses.reduce((s, a) => s + a.excludableGain, 0)
      );
      expect(result.totalTaxSavings).toBeCloseTo(
        result.analyses.reduce((s, a) => s + a.estimatedTaxSavings, 0), 0
      );
    });
  });

  describe("Edge cases", () => {
    it("should throw for empty holdings", () => {
      expect(() => calculateQSBS(makeInput({ holdings: [] }))).toThrow(
        "At least one QSBS holding is required"
      );
    });

    it("should handle negative unrealized gain (loss)", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ costBasis: 500000, currentValue: 200000 })],
      }));
      expect(result.analyses[0].unrealizedGain).toBe(-300000);
      expect(result.analyses[0].excludableGain).toBe(0);
      expect(result.analyses[0].taxableGain).toBe(0);
    });

    it("should handle zero state rate", () => {
      const result = calculateQSBS(makeInput({ stateCapitalGainsRate: 0 }));
      expect(result.analyses[0].estimatedTaxSavings).toBeCloseTo(400000 * 0.20, 0);
    });

    it("should include stacking strategy note for large excludable gains", () => {
      const result = calculateQSBS(makeInput({
        holdings: [makeHolding({ costBasis: 100000, currentValue: 6000000 })],
      }));
      expect(result.alerts.some(a => a.message.includes("stacking strategies"))).toBe(true);
    });

    it("should include milestone data for each holding", () => {
      const result = calculateQSBS(makeInput());
      expect(result.analyses[0].milestones.length).toBe(3);
      expect(result.analyses[0].milestones[0].label).toBe("Acquisition");
      expect(result.analyses[0].milestones[1].label).toBe("1-Year Mark");
      expect(result.analyses[0].milestones[2].label).toBe("5-Year Qualification");
    });

    it("should include educational notes about Section 1202", () => {
      const result = calculateQSBS(makeInput());
      expect(result.notes.some(n => n.includes("Section 1202"))).toBe(true);
      expect(result.notes.some(n => n.includes("$50M"))).toBe(true);
    });
  });
});
