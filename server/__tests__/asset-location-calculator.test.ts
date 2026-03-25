import { describe, it, expect } from "vitest";
import {
  calculateAssetLocation,
  type AssetLocationInput,
  type AssetHolding,
} from "../calculators/asset-location-calculator";

function makeHolding(overrides: Partial<AssetHolding> = {}): AssetHolding {
  return {
    name: "Test Fund",
    ticker: "TST",
    marketValue: 100000,
    assetClass: "equity",
    currentAccountType: "taxable",
    expectedReturn: 0.07,
    dividendYield: 0.02,
    turnoverRate: 0.1,
    taxEfficiency: "high",
    ...overrides,
  };
}

function makeInput(overrides: Partial<AssetLocationInput> = {}): AssetLocationInput {
  return {
    holdings: [makeHolding()],
    taxableCapacity: 500000,
    traditionalCapacity: 500000,
    rothCapacity: 200000,
    marginalTaxRate: 0.37,
    capitalGainsTaxRate: 0.20,
    investmentHorizon: 20,
    ...overrides,
  };
}

describe("Asset Location Calculator", () => {
  describe("Happy path", () => {
    it("should return a valid result structure", () => {
      const result = calculateAssetLocation(makeInput());
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("currentAllocation");
      expect(result).toHaveProperty("optimizedAllocation");
      expect(result).toHaveProperty("estimatedAnnualTaxSavings");
      expect(result).toHaveProperty("estimatedLifetimeSavings");
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("notes");
    });

    it("should analyze the correct number of holdings", () => {
      const input = makeInput({
        holdings: [
          makeHolding({ name: "A", ticker: "A" }),
          makeHolding({ name: "B", ticker: "B" }),
          makeHolding({ name: "C", ticker: "C" }),
        ],
      });
      const result = calculateAssetLocation(input);
      expect(result.summary.holdingsAnalyzed).toBe(3);
      expect(result.recommendations.length).toBe(3);
    });

    it("should calculate lifetime savings as annual savings times horizon", () => {
      const result = calculateAssetLocation(makeInput());
      expect(result.estimatedLifetimeSavings).toBeCloseTo(
        result.estimatedAnnualTaxSavings * 20,
        2
      );
    });
  });

  describe("Tax-inefficient assets should prefer Traditional", () => {
    it("should recommend Traditional for high-dividend yield assets", () => {
      const holding = makeHolding({
        name: "High Div REIT",
        ticker: "REIT",
        dividendYield: 0.06,
        taxEfficiency: "low",
        currentAccountType: "taxable",
      });
      const result = calculateAssetLocation(makeInput({ holdings: [holding] }));
      const rec = result.recommendations[0];
      expect(rec.recommendedAccountType).toBe("traditional");
      expect(rec.needsMove).toBe(true);
      expect(rec.estimatedAnnualTaxSavings).toBeGreaterThan(0);
    });

    it("should recommend Traditional for bonds/fixed income", () => {
      const holding = makeHolding({
        name: "Bond Fund",
        ticker: "BND",
        assetClass: "bond",
        dividendYield: 0.03,
        taxEfficiency: "low",
        currentAccountType: "taxable",
      });
      const result = calculateAssetLocation(makeInput({ holdings: [holding] }));
      expect(result.recommendations[0].recommendedAccountType).toBe("traditional");
    });

    it("should recommend Traditional for REITs", () => {
      const holding = makeHolding({
        name: "REIT Index",
        ticker: "VNQ",
        assetClass: "reit",
        dividendYield: 0.04,
        taxEfficiency: "low",
        currentAccountType: "taxable",
      });
      const result = calculateAssetLocation(makeInput({ holdings: [holding] }));
      expect(result.recommendations[0].recommendedAccountType).toBe("traditional");
    });

    it("should recommend Traditional for high turnover assets", () => {
      const holding = makeHolding({
        name: "Active Fund",
        ticker: "ACT",
        turnoverRate: 0.8,
        taxEfficiency: "low",
        currentAccountType: "taxable",
      });
      const result = calculateAssetLocation(makeInput({ holdings: [holding] }));
      expect(result.recommendations[0].recommendedAccountType).toBe("traditional");
    });
  });

  describe("Tax-efficient assets should prefer Taxable", () => {
    it("should keep tax-efficient low-dividend equities in taxable", () => {
      const holding = makeHolding({
        name: "Total Market ETF",
        ticker: "VTI",
        dividendYield: 0.01,
        taxEfficiency: "high",
        currentAccountType: "taxable",
      });
      const result = calculateAssetLocation(makeInput({ holdings: [holding] }));
      expect(result.recommendations[0].recommendedAccountType).toBe("taxable");
      expect(result.recommendations[0].needsMove).toBe(false);
    });
  });

  describe("High-growth assets should prefer Roth", () => {
    it("should recommend Roth for high expected return assets", () => {
      const holding = makeHolding({
        name: "Growth Fund",
        ticker: "GROW",
        expectedReturn: 0.15,
        dividendYield: 0.005,
        taxEfficiency: "medium",
        currentAccountType: "taxable",
      });
      const result = calculateAssetLocation(makeInput({ holdings: [holding] }));
      expect(result.recommendations[0].recommendedAccountType).toBe("roth");
    });
  });

  describe("Capacity constraints", () => {
    it("should use fallback accounts when preferred is full", () => {
      const holdings = [
        makeHolding({ name: "Bond A", assetClass: "bond", marketValue: 200000, taxEfficiency: "low", dividendYield: 0.03, currentAccountType: "taxable" }),
        makeHolding({ name: "Bond B", assetClass: "bond", marketValue: 200000, taxEfficiency: "low", dividendYield: 0.03, currentAccountType: "taxable" }),
      ];
      const result = calculateAssetLocation(makeInput({
        holdings,
        traditionalCapacity: 200000,
        rothCapacity: 200000,
      }));
      const accountTypes = result.recommendations.map(r => r.recommendedAccountType);
      expect(accountTypes).toContain("traditional");
      expect(accountTypes).toContain("roth");
    });

    it("should fall through to roth when all taxable and traditional are full", () => {
      const holding = makeHolding({
        name: "Overflow",
        marketValue: 500000,
        currentAccountType: "taxable",
      });
      const result = calculateAssetLocation(makeInput({
        holdings: [holding],
        taxableCapacity: 0,
        traditionalCapacity: 0,
        rothCapacity: 1000000,
      }));
      expect(result.recommendations[0].recommendedAccountType).toBe("roth");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty holdings array", () => {
      const result = calculateAssetLocation(makeInput({ holdings: [] }));
      expect(result.summary.holdingsAnalyzed).toBe(0);
      expect(result.summary.holdingsToMove).toBe(0);
      expect(result.estimatedAnnualTaxSavings).toBe(0);
      expect(result.notes).toContain("Current asset location is already well-optimized.");
    });

    it("should handle zero market value holdings", () => {
      const holding = makeHolding({ marketValue: 0 });
      const result = calculateAssetLocation(makeInput({ holdings: [holding] }));
      expect(result.summary.totalPortfolioValue).toBe(0);
    });

    it("should handle zero tax rates", () => {
      const result = calculateAssetLocation(makeInput({
        marginalTaxRate: 0,
        capitalGainsTaxRate: 0,
      }));
      expect(result.estimatedAnnualTaxSavings).toBe(0);
    });

    it("should handle zero investment horizon (no lifetime savings)", () => {
      const result = calculateAssetLocation(makeInput({ investmentHorizon: 0 }));
      expect(result.estimatedLifetimeSavings).toBe(0);
    });

    it("should produce negative savings if moving from sheltered to taxable", () => {
      const holding = makeHolding({
        name: "Bond in Traditional",
        assetClass: "equity",
        dividendYield: 0.01,
        taxEfficiency: "high",
        currentAccountType: "traditional",
      });
      const result = calculateAssetLocation(makeInput({
        holdings: [holding],
        traditionalCapacity: 0,
        taxableCapacity: 500000,
      }));
      const rec = result.recommendations[0];
      if (rec.needsMove && rec.recommendedAccountType === "taxable") {
        expect(rec.estimatedAnnualTaxSavings).toBeLessThan(0);
      }
    });

    it("should include advisory notes about taxable events and limitations", () => {
      const result = calculateAssetLocation(makeInput());
      expect(result.notes.some(n => n.includes("taxable events"))).toBe(true);
      expect(result.notes.some(n => n.includes("state taxes or AMT"))).toBe(true);
    });
  });

  describe("Current allocation tracking", () => {
    it("should correctly tally current allocation by account type", () => {
      const holdings = [
        makeHolding({ marketValue: 100000, currentAccountType: "taxable" }),
        makeHolding({ marketValue: 200000, currentAccountType: "traditional" }),
        makeHolding({ marketValue: 50000, currentAccountType: "roth" }),
      ];
      const result = calculateAssetLocation(makeInput({ holdings }));
      expect(result.currentAllocation.taxable).toBe(100000);
      expect(result.currentAllocation.traditional).toBe(200000);
      expect(result.currentAllocation.roth).toBe(50000);
    });

    it("should have optimized allocation sum equal total portfolio value", () => {
      const holdings = [
        makeHolding({ marketValue: 100000 }),
        makeHolding({ marketValue: 200000 }),
      ];
      const result = calculateAssetLocation(makeInput({ holdings }));
      const optimizedTotal =
        result.optimizedAllocation.taxable +
        result.optimizedAllocation.traditional +
        result.optimizedAllocation.roth;
      expect(optimizedTotal).toBe(300000);
    });
  });
});
