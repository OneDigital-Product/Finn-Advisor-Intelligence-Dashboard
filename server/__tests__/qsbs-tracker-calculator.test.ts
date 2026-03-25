import { describe, it, expect } from "vitest";
import {
  calculateQSBS,
  type QSBSInput,
  type QSBSPosition,
} from "../calculators/qsbs-tracker-calculator";

function makePosition(overrides: Partial<QSBSPosition> = {}): QSBSPosition {
  return {
    companyName: "StartupCo",
    sharesOwned: 5000,
    costBasis: 200000,
    currentValue: 800000,
    acquisitionDate: "2019-01-01",
    isOriginalIssue: true,
    companyGrossAssets: "under_50m",
    isCCorporation: true,
    qualifiedTradeOrBusiness: true,
    ...overrides,
  };
}

function makeInput(overrides: Partial<QSBSInput> = {}): QSBSInput {
  return {
    positions: [makePosition()],
    ...overrides,
  };
}

describe("QSBS Tracker Calculator", () => {
  describe("Happy path — qualified position", () => {
    it("should return qualified status for position held 5+ years", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ acquisitionDate: "2019-01-01" })],
        analysisDate: "2025-06-01",
      }));
      expect(result.positions[0].status).toBe("qualified");
      expect(result.positions[0].holdingPeriodMet).toBe(true);
    });

    it("should compute unrealized gain correctly", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ costBasis: 100000, currentValue: 500000 })],
        analysisDate: "2025-06-01",
      }));
      expect(result.positions[0].unrealizedGain).toBe(400000);
    });

    it("should compute excludable gain at combined LTCG + NIIT rate", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ costBasis: 100000, currentValue: 500000 })],
        analysisDate: "2025-06-01",
      }));
      expect(result.positions[0].estimatedTaxSavings).toBeCloseTo(400000 * 0.238, 0);
    });
  });

  describe("Section 1202 exclusion limits", () => {
    it("should use $10M cap for low basis", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({
          costBasis: 500000,
          currentValue: 20000000,
          acquisitionDate: "2019-01-01",
        })],
        analysisDate: "2025-06-01",
      }));
      expect(result.positions[0].maxExclusionPerIssuer).toBe(10000000);
      expect(result.positions[0].excludableGain).toBe(10000000);
      expect(result.positions[0].taxableGain).toBe(9500000);
    });

    it("should use 10x basis when basis is high", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({
          costBasis: 3000000,
          currentValue: 40000000,
          acquisitionDate: "2019-01-01",
        })],
        analysisDate: "2025-06-01",
      }));
      expect(result.positions[0].maxExclusionPerIssuer).toBe(30000000);
    });
  });

  describe("Holding period — pending status", () => {
    it("should mark as pending if under 5 years", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ acquisitionDate: "2023-01-01" })],
        analysisDate: "2025-06-01",
      }));
      expect(result.positions[0].status).toBe("pending");
      expect(result.positions[0].holdingPeriodMet).toBe(false);
      expect(result.positions[0].excludableGain).toBe(0);
      expect(result.positions[0].daysUntilQualified).toBeGreaterThan(0);
    });

    it("should compute qualification date correctly", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ acquisitionDate: "2023-06-15" })],
        analysisDate: "2025-06-01",
      }));
      expect(result.positions[0].qualificationDate).toMatch(/^2028-/);
    });
  });

  describe("Eligibility requirements", () => {
    it("should flag non-original issuance", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ isOriginalIssue: false })],
      }));
      expect(result.positions[0].status).toBe("ineligible");
      expect(result.positions[0].eligibilityIssues.some(i => i.includes("original issuance"))).toBe(true);
    });

    it("should flag non-C-Corporation", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ isCCorporation: false })],
      }));
      expect(result.positions[0].status).toBe("ineligible");
      expect(result.positions[0].eligibilityIssues.some(i => i.includes("C-Corporation"))).toBe(true);
    });

    it("should flag gross assets over $50M", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ companyGrossAssets: "over_50m" })],
      }));
      expect(result.positions[0].status).toBe("ineligible");
    });

    it("should not flag unknown gross assets", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ companyGrossAssets: "unknown" })],
        analysisDate: "2025-06-01",
      }));
      expect(result.positions[0].eligibilityIssues.some(i => i.includes("$50M"))).toBe(false);
    });

    it("should flag non-qualified trade or business", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ qualifiedTradeOrBusiness: false })],
      }));
      expect(result.positions[0].status).toBe("ineligible");
    });

    it("should accumulate multiple issues", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({
          isOriginalIssue: false,
          isCCorporation: false,
        })],
      }));
      expect(result.positions[0].eligibilityIssues.length).toBe(2);
    });
  });

  describe("Summary aggregation", () => {
    it("should correctly count positions by status", () => {
      const result = calculateQSBS(makeInput({
        positions: [
          makePosition({ companyName: "Qualified", acquisitionDate: "2019-01-01" }),
          makePosition({ companyName: "Pending", acquisitionDate: "2023-01-01" }),
          makePosition({ companyName: "Ineligible", isOriginalIssue: false }),
        ],
        analysisDate: "2025-06-01",
      }));
      expect(result.summary.qualifiedPositions).toBe(1);
      expect(result.summary.pendingPositions).toBe(1);
      expect(result.summary.ineligiblePositions).toBe(1);
      expect(result.summary.totalPositions).toBe(3);
    });

    it("should sum cost basis and current value", () => {
      const result = calculateQSBS(makeInput({
        positions: [
          makePosition({ costBasis: 100000, currentValue: 300000 }),
          makePosition({ costBasis: 200000, currentValue: 500000 }),
        ],
        analysisDate: "2025-06-01",
      }));
      expect(result.summary.totalCostBasis).toBe(300000);
      expect(result.summary.totalCurrentValue).toBe(800000);
      expect(result.summary.totalUnrealizedGain).toBe(500000);
    });

    it("should sum excludable gain across qualified positions only", () => {
      const result = calculateQSBS(makeInput({
        positions: [
          makePosition({ costBasis: 100000, currentValue: 500000, acquisitionDate: "2019-01-01" }),
          makePosition({ costBasis: 100000, currentValue: 300000, isOriginalIssue: false }),
        ],
        analysisDate: "2025-06-01",
      }));
      expect(result.summary.totalExcludableGain).toBe(400000);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty positions array", () => {
      const result = calculateQSBS(makeInput({ positions: [] }));
      expect(result.positions.length).toBe(0);
      expect(result.summary.totalPositions).toBe(0);
    });

    it("should handle negative unrealized gain (loss position)", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ costBasis: 500000, currentValue: 200000 })],
        analysisDate: "2025-06-01",
      }));
      expect(result.positions[0].unrealizedGain).toBe(-300000);
      expect(result.positions[0].excludableGain).toBe(0);
      expect(result.positions[0].taxableGain).toBe(0);
    });

    it("should handle zero cost basis", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ costBasis: 0, currentValue: 100000 })],
        analysisDate: "2025-06-01",
      }));
      expect(result.positions[0].maxExclusionPerIssuer).toBe(10000000);
      expect(result.positions[0].unrealizedGain).toBe(100000);
    });

    it("should include educational notes", () => {
      const result = calculateQSBS(makeInput({ analysisDate: "2025-06-01" }));
      expect(result.notes.some(n => n.includes("Section 1202"))).toBe(true);
      expect(result.notes.some(n => n.includes("23.8%"))).toBe(true);
    });

    it("should note nearest qualification for pending positions", () => {
      const result = calculateQSBS(makeInput({
        positions: [
          makePosition({ companyName: "Soon", acquisitionDate: "2021-01-01" }),
          makePosition({ companyName: "Later", acquisitionDate: "2023-01-01" }),
        ],
        analysisDate: "2025-06-01",
      }));
      expect(result.notes.some(n => n.includes("Nearest qualification"))).toBe(true);
    });

    it("should note ineligible position review needed", () => {
      const result = calculateQSBS(makeInput({
        positions: [makePosition({ isOriginalIssue: false })],
      }));
      expect(result.notes.some(n => n.includes("eligibility issues"))).toBe(true);
    });

    it("should use current date when analysisDate not provided", () => {
      const result = calculateQSBS(makeInput());
      expect(result.positions[0].holdingPeriodDays).toBeGreaterThan(0);
    });
  });
});
