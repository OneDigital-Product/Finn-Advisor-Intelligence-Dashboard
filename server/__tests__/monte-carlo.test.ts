import { describe, it, expect } from "vitest";
import { runMonteCarloSimulation, createSeededRng, type SimulationParams } from "../monte-carlo";

describe("Monte Carlo Simulation", () => {
  const baseParams: SimulationParams = {
    currentAge: 45,
    retirementAge: 65,
    lifeExpectancy: 90,
    initialPortfolio: 1000000,
    annualSpending: 60000,
    expectedReturn: 0.07,
    returnStdDev: 0.12,
    inflationRate: 0.03,
    preRetirementContribution: 20000,
    seed: 42,
    events: [],
  };

  it("should return correct structure with all required fields", () => {
    const result = runMonteCarloSimulation(baseParams);

    expect(result).toHaveProperty("successRate");
    expect(result).toHaveProperty("numSimulations");
    expect(result).toHaveProperty("percentilePaths");
    expect(result).toHaveProperty("finalBalanceStats");
    expect(result).toHaveProperty("yearOfDepletion");
    expect(result.numSimulations).toBe(1000);
  });

  it("should generate valid percentile paths with correct age range", () => {
    const result = runMonteCarloSimulation(baseParams);
    const totalYears = baseParams.lifeExpectancy - baseParams.currentAge;

    expect(result.percentilePaths.ages.length).toBe(totalYears + 1);
    expect(result.percentilePaths.ages[0]).toBe(baseParams.currentAge);
    expect(result.percentilePaths.ages[totalYears]).toBe(baseParams.lifeExpectancy);

    expect(result.percentilePaths.p10.length).toBe(totalYears + 1);
    expect(result.percentilePaths.p25.length).toBe(totalYears + 1);
    expect(result.percentilePaths.p50.length).toBe(totalYears + 1);
    expect(result.percentilePaths.p75.length).toBe(totalYears + 1);
    expect(result.percentilePaths.p90.length).toBe(totalYears + 1);
  });

  it("should maintain percentile ordering (p10 < p25 < p50 < p75 < p90) at initial year", () => {
    const result = runMonteCarloSimulation(baseParams);

    expect(result.percentilePaths.p10[0]).toBeLessThanOrEqual(result.percentilePaths.p25[0]);
    expect(result.percentilePaths.p25[0]).toBeLessThanOrEqual(result.percentilePaths.p50[0]);
    expect(result.percentilePaths.p50[0]).toBeLessThanOrEqual(result.percentilePaths.p75[0]);
    expect(result.percentilePaths.p75[0]).toBeLessThanOrEqual(result.percentilePaths.p90[0]);
  });

  it("should calculate valid final balance stats with correct ordering", () => {
    const result = runMonteCarloSimulation(baseParams);

    expect(result.finalBalanceStats.min).toBeLessThanOrEqual(result.finalBalanceStats.p10);
    expect(result.finalBalanceStats.p10).toBeLessThanOrEqual(result.finalBalanceStats.median);
    expect(result.finalBalanceStats.median).toBeLessThanOrEqual(result.finalBalanceStats.p90);
    expect(result.finalBalanceStats.p90).toBeLessThanOrEqual(result.finalBalanceStats.max);
    expect(typeof result.finalBalanceStats.mean).toBe("number");
  });

  it("should produce a positive success rate with favorable params", () => {
    const result = runMonteCarloSimulation(baseParams);

    expect(result.successRate).toBeGreaterThan(0);
    expect(result.successRate).toBeLessThanOrEqual(100);
  });

  it("should handle events (expenses and income)", () => {
    const paramsWithEvents: SimulationParams = {
      ...baseParams,
      events: [
        {
          name: "Social Security",
          type: "income",
          amount: 24000,
          startAge: 67,
          endAge: null,
          inflationAdjusted: true,
        },
        {
          name: "College Tuition",
          type: "expense",
          amount: 50000,
          startAge: 50,
          endAge: 53,
          inflationAdjusted: false,
        },
      ],
    };

    const result = runMonteCarloSimulation(paramsWithEvents);

    expect(result.numSimulations).toBe(1000);
    expect(result.percentilePaths.ages.length).toBeGreaterThan(0);
  });

  it("should produce lower success rate with unfavorable params", () => {
    const bearParams: SimulationParams = {
      ...baseParams,
      expectedReturn: -0.02,
      annualSpending: 150000,
    };

    const result = runMonteCarloSimulation(bearParams);

    expect(result.successRate).toBeLessThan(50);
  });

  it("should complete 1000 simulations in under 5 seconds", () => {
    const start = performance.now();
    runMonteCarloSimulation(baseParams);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });

  describe("Seeded RNG and reproducibility", () => {
    it("should produce identical results with the same seed", () => {
      const seededParams = { ...baseParams, seed: 12345 };
      const result1 = runMonteCarloSimulation(seededParams);
      const result2 = runMonteCarloSimulation(seededParams);

      expect(result1.successRate).toBe(result2.successRate);
      expect(result1.finalBalanceStats.mean).toBe(result2.finalBalanceStats.mean);
      expect(result1.finalBalanceStats.median).toBe(result2.finalBalanceStats.median);
      expect(result1.finalBalanceStats.p10).toBe(result2.finalBalanceStats.p10);
      expect(result1.finalBalanceStats.p90).toBe(result2.finalBalanceStats.p90);
      expect(result1.finalBalanceStats.min).toBe(result2.finalBalanceStats.min);
      expect(result1.finalBalanceStats.max).toBe(result2.finalBalanceStats.max);

      for (let i = 0; i < result1.percentilePaths.p50.length; i++) {
        expect(result1.percentilePaths.p50[i]).toBe(result2.percentilePaths.p50[i]);
      }
    });

    it("should produce different results with different seeds", () => {
      const result1 = runMonteCarloSimulation({ ...baseParams, seed: 100 });
      const result2 = runMonteCarloSimulation({ ...baseParams, seed: 999 });

      const sameMean = result1.finalBalanceStats.mean === result2.finalBalanceStats.mean;
      const sameMedian = result1.finalBalanceStats.median === result2.finalBalanceStats.median;
      expect(sameMean && sameMedian).toBe(false);
    });

    it("createSeededRng should produce deterministic sequence", () => {
      const rng1 = createSeededRng(42);
      const rng2 = createSeededRng(42);
      const seq1 = Array.from({ length: 10 }, () => rng1());
      const seq2 = Array.from({ length: 10 }, () => rng2());
      expect(seq1).toEqual(seq2);
    });

    it("createSeededRng should produce values in [0, 1)", () => {
      const rng = createSeededRng(42);
      for (let i = 0; i < 1000; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it("seeded simulation should still produce valid statistical properties", () => {
      const result = runMonteCarloSimulation({ ...baseParams, seed: 777 });
      expect(result.successRate).toBeGreaterThan(0);
      expect(result.successRate).toBeLessThanOrEqual(100);
      expect(result.finalBalanceStats.min).toBeLessThanOrEqual(result.finalBalanceStats.median);
      expect(result.finalBalanceStats.median).toBeLessThanOrEqual(result.finalBalanceStats.max);
    });
  });

  describe("Edge cases — extreme parameters", () => {
    it("should handle 0% expected return", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        expectedReturn: 0,
        returnStdDev: 0,
      });
      expect(result.numSimulations).toBe(1000);
      expect(result.successRate).toBeLessThanOrEqual(100);
    });

    it("should handle 100% withdrawal (spending equals portfolio)", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        initialPortfolio: 100000,
        annualSpending: 100000,
        expectedReturn: 0,
        returnStdDev: 0,
        preRetirementContribution: 0,
        currentAge: 65,
        retirementAge: 65,
        lifeExpectancy: 95,
      });
      expect(result.successRate).toBeLessThan(10);
    });

    it("should return ~100% success rate with zero spending and positive return", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        annualSpending: 0,
        expectedReturn: 0.05,
        returnStdDev: 0.01,
        preRetirementContribution: 0,
      });
      expect(result.successRate).toBeGreaterThanOrEqual(99);
    });

    it("should handle zero initial portfolio with contributions", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        initialPortfolio: 0,
        preRetirementContribution: 50000,
        annualSpending: 20000,
      });
      expect(result.numSimulations).toBe(1000);
      expect(result.percentilePaths.ages.length).toBeGreaterThan(0);
    });

    it("should handle zero volatility (deterministic returns)", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        returnStdDev: 0,
        expectedReturn: 0.05,
      });
      const allP50 = result.percentilePaths.p50;
      const allP10 = result.percentilePaths.p10;
      for (let i = 0; i < allP50.length; i++) {
        expect(allP50[i]).toBe(allP10[i]);
      }
    });

    it("should handle very high volatility", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        returnStdDev: 0.50,
      });
      expect(result.numSimulations).toBe(1000);
      const range = result.finalBalanceStats.max - result.finalBalanceStats.min;
      expect(range).toBeGreaterThan(0);
    });

    it("should handle same current age and retirement age (already retired)", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        currentAge: 65,
        retirementAge: 65,
        lifeExpectancy: 90,
      });
      expect(result.percentilePaths.ages[0]).toBe(65);
      expect(result.percentilePaths.ages.length).toBe(26);
    });

    it("should handle short time horizon (1 year)", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        currentAge: 89,
        retirementAge: 65,
        lifeExpectancy: 90,
      });
      expect(result.percentilePaths.ages.length).toBe(2);
    });

    it("should handle negative expected return", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        expectedReturn: -0.10,
        returnStdDev: 0.05,
      });
      expect(result.successRate).toBeLessThan(50);
    });
  });

  describe("Statistical distribution validation", () => {
    it("should produce a mean close to median for symmetric returns", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        returnStdDev: 0.01,
      });
      const ratio = result.finalBalanceStats.mean / result.finalBalanceStats.median;
      expect(ratio).toBeGreaterThan(0.8);
      expect(ratio).toBeLessThan(1.2);
    });

    it("should maintain percentile ordering at every year", () => {
      const result = runMonteCarloSimulation(baseParams);
      for (let i = 0; i < result.percentilePaths.ages.length; i++) {
        expect(result.percentilePaths.p10[i]).toBeLessThanOrEqual(result.percentilePaths.p25[i]);
        expect(result.percentilePaths.p25[i]).toBeLessThanOrEqual(result.percentilePaths.p50[i]);
        expect(result.percentilePaths.p50[i]).toBeLessThanOrEqual(result.percentilePaths.p75[i]);
        expect(result.percentilePaths.p75[i]).toBeLessThanOrEqual(result.percentilePaths.p90[i]);
      }
    });

    it("should never have negative portfolio values in percentile paths", () => {
      const result = runMonteCarloSimulation(baseParams);
      for (const val of result.percentilePaths.p10) {
        expect(val).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Event handling — advanced", () => {
    it("should improve success rate with Social Security income event", () => {
      const withoutSS = runMonteCarloSimulation(baseParams);
      const withSS = runMonteCarloSimulation({
        ...baseParams,
        events: [{
          name: "Social Security",
          type: "income",
          amount: 30000,
          startAge: 67,
          endAge: null,
          inflationAdjusted: true,
        }],
      });
      expect(withSS.successRate).toBeGreaterThanOrEqual(withoutSS.successRate);
    });

    it("should reduce success rate with large expense event", () => {
      const withoutExpense = runMonteCarloSimulation({
        ...baseParams,
        returnStdDev: 0.05,
      });
      const withExpense = runMonteCarloSimulation({
        ...baseParams,
        returnStdDev: 0.05,
        events: [{
          name: "Long-term care",
          type: "expense",
          amount: 100000,
          startAge: 80,
          endAge: 85,
          inflationAdjusted: true,
        }],
      });
      expect(withExpense.successRate).toBeLessThanOrEqual(withoutExpense.successRate);
    });

    it("should handle non-inflation-adjusted events", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        events: [{
          name: "Fixed Annuity",
          type: "income",
          amount: 12000,
          startAge: 65,
          endAge: null,
          inflationAdjusted: false,
        }],
      });
      expect(result.numSimulations).toBe(1000);
    });

    it("should handle event that spans entire simulation", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        events: [{
          name: "Part-time income",
          type: "income",
          amount: 10000,
          startAge: 45,
          endAge: null,
          inflationAdjusted: true,
        }],
      });
      expect(result.numSimulations).toBe(1000);
    });
  });

  describe("Depletion tracking", () => {
    it("should track year of depletion for failing scenarios", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        initialPortfolio: 200000,
        annualSpending: 80000,
        expectedReturn: 0.02,
        returnStdDev: 0.03,
        preRetirementContribution: 0,
        currentAge: 65,
        retirementAge: 65,
      });
      expect(result.yearOfDepletion.median).not.toBeNull();
    });

    it("should return null depletion for highly successful scenarios", () => {
      const result = runMonteCarloSimulation({
        ...baseParams,
        initialPortfolio: 10000000,
        annualSpending: 50000,
        expectedReturn: 0.07,
        returnStdDev: 0.05,
      });
      if (result.successRate > 99) {
        expect(result.yearOfDepletion.median).toBeNull();
      }
    });
  });
});
