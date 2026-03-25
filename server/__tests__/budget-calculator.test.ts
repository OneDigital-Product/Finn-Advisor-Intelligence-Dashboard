import { describe, it, expect } from "vitest";
import {
  calculateBudget,
  type BudgetInput,
  type PreRetirementProjection,
  type BudgetProjection,
} from "../calculators/budget-calculator";

const baseScenarios = {
  base: { growthRate: 0.06, inflationRate: 0.03 },
  optimistic: { growthRate: 0.08, inflationRate: 0.02 },
  conservative: { growthRate: 0.03, inflationRate: 0.04 },
};

const baseExpenses: Record<string, number> = {
  housing: 24000,
  food: 12000,
  healthcare: 6000,
  transportation: 4000,
  discretionary: 6000,
};

describe("Budget Calculator", () => {
  describe("Input validation", () => {
    it("should throw for invalid mode", () => {
      // @ts-expect-error testing invalid mode value
      const input: BudgetInput = {
        mode: "invalid",
        currentAge: 45,
        expenses: baseExpenses,
        scenarios: baseScenarios,
        projectionYears: 30,
      };
      expect(() => calculateBudget(input)).toThrow("valid calculation mode");
    });

    it("should throw for empty expenses", () => {
      const input: BudgetInput = {
        mode: "pre_retirement",
        currentAge: 45,
        expenses: {},
        scenarios: baseScenarios,
        projectionYears: 30,
      };
      expect(() => calculateBudget(input)).toThrow("at least one expense category");
    });

    it("should throw for missing scenarios", () => {
      // @ts-expect-error testing incomplete scenarios
      const input: BudgetInput = {
        mode: "pre_retirement",
        currentAge: 45,
        expenses: baseExpenses,
        scenarios: { base: baseScenarios.base },
        projectionYears: 30,
      };
      expect(() => calculateBudget(input)).toThrow("All three scenario assumptions");
    });

    it("should throw for age below 18", () => {
      const input: BudgetInput = {
        mode: "pre_retirement",
        currentAge: 10,
        expenses: baseExpenses,
        scenarios: baseScenarios,
        projectionYears: 30,
      };
      expect(() => calculateBudget(input)).toThrow("between 18 and 120");
    });

    it("should throw for age above 120", () => {
      const input: BudgetInput = {
        mode: "pre_retirement",
        currentAge: 130,
        expenses: baseExpenses,
        scenarios: baseScenarios,
        projectionYears: 30,
      };
      expect(() => calculateBudget(input)).toThrow("between 18 and 120");
    });
  });

  describe("Pre-retirement mode", () => {
    const preRetInput: BudgetInput = {
      mode: "pre_retirement",
      currentAge: 45,
      retirementAge: 65,
      currentIncome: 120000,
      annualSavingsAmount: 20000,
      currentSavings: 200000,
      expenses: baseExpenses,
      scenarios: baseScenarios,
      projectionYears: 30,
    };

    it("should return pre_retirement mode", () => {
      const result = calculateBudget(preRetInput);
      expect(result.mode).toBe("pre_retirement");
    });

    it("should have all three scenarios", () => {
      const result = calculateBudget(preRetInput);
      expect(result.summaryByScenario).toHaveProperty("base");
      expect(result.summaryByScenario).toHaveProperty("optimistic");
      expect(result.summaryByScenario).toHaveProperty("conservative");
    });

    it("should project balance growing over time with positive growth", () => {
      const result = calculateBudget(preRetInput);
      const baseProjections = result.projections.base as PreRetirementProjection[];

      expect(baseProjections.length).toBeGreaterThan(0);
      const first = baseProjections[0];
      const last = baseProjections[baseProjections.length - 1];
      expect(last.balance).toBeGreaterThan(first.balance);
    });

    it("should have optimistic scenario yield higher balance than conservative", () => {
      const result = calculateBudget(preRetInput);
      expect(result.summaryByScenario.optimistic.accountBalanceAtEnd).toBeGreaterThan(
        result.summaryByScenario.conservative.accountBalanceAtEnd
      );
    });

    it("should throw when currentAge >= retirementAge", () => {
      const input: BudgetInput = {
        ...preRetInput,
        currentAge: 65,
        retirementAge: 65,
      };
      expect(() => calculateBudget(input)).toThrow("Current age must be less than retirement age");
    });

    it("should have correct projection years count", () => {
      const result = calculateBudget(preRetInput);
      const baseProjections = result.projections.base;
      expect(baseProjections.length).toBe(21);
    });

    it("should include expense summary with correct total", () => {
      const result = calculateBudget(preRetInput);
      const total = Object.values(baseExpenses).reduce((s, v) => s + v, 0);
      expect(result.expenseSummary.totalAnnualExpenses).toBe(total);
      expect(result.expenseSummary.categories.length).toBe(Object.keys(baseExpenses).length);
    });

    it("should have expense categories sorted by amount descending", () => {
      const result = calculateBudget(preRetInput);
      const amounts = result.expenseSummary.categories.map((c) => c.amount);
      for (let i = 1; i < amounts.length; i++) {
        expect(amounts[i]).toBeLessThanOrEqual(amounts[i - 1]);
      }
    });

    it("should handle zero savings amount", () => {
      const input: BudgetInput = {
        ...preRetInput,
        annualSavingsAmount: 0,
        currentSavings: 0,
      };
      const result = calculateBudget(input);
      expect(result.summaryByScenario.base.accountBalanceAtEnd).toBe(0);
    });

    it("should handle zero growth rate without errors", () => {
      const input: BudgetInput = {
        ...preRetInput,
        scenarios: {
          base: { growthRate: 0, inflationRate: 0.03 },
          optimistic: { growthRate: 0, inflationRate: 0.02 },
          conservative: { growthRate: 0, inflationRate: 0.04 },
        },
      };
      const result = calculateBudget(input);
      const baseProjections = result.projections.base as PreRetirementProjection[];
      const lastBalance = baseProjections[baseProjections.length - 1].balance;
      expect(lastBalance).toBeCloseTo(200000 + 20000 * 20, -1);
    });
  });

  describe("Post-retirement mode", () => {
    const postRetInput: BudgetInput = {
      mode: "post_retirement",
      currentAge: 65,
      portfolioBalance: 1000000,
      retirementIncome: {
        socialSecurity: 24000,
        pension: 12000,
        dividends: 6000,
      },
      expenses: baseExpenses,
      scenarios: baseScenarios,
      projectionYears: 30,
    };

    it("should return post_retirement mode", () => {
      const result = calculateBudget(postRetInput);
      expect(result.mode).toBe("post_retirement");
    });

    it("should calculate annual shortfall correctly", () => {
      const result = calculateBudget(postRetInput);
      const totalExpenses = Object.values(baseExpenses).reduce((s, v) => s + v, 0);
      const totalIncome = 24000 + 12000 + 6000;
      const expectedShortfall = Math.max(0, totalExpenses - totalIncome);
      expect(result.summaryByScenario.base.annualShortfall).toBe(expectedShortfall);
    });

    it("should calculate safe withdrawal rate", () => {
      const result = calculateBudget(postRetInput);
      expect(result.summaryByScenario.base.safeWithdrawalRate).toBeGreaterThan(0);
    });

    it("should throw for zero portfolio balance", () => {
      const input: BudgetInput = {
        ...postRetInput,
        portfolioBalance: 0,
      };
      expect(() => calculateBudget(input)).toThrow("Portfolio balance must be greater than $0");
    });

    it("should throw for zero expenses", () => {
      const input: BudgetInput = {
        ...postRetInput,
        expenses: { housing: 0, food: 0 },
      };
      expect(() => calculateBudget(input)).toThrow("Total annual expenses must be greater than $0");
    });

    it("should mark as at_risk when portfolio depletes quickly", () => {
      const input: BudgetInput = {
        ...postRetInput,
        portfolioBalance: 50000,
        retirementIncome: { socialSecurity: 0, pension: 0, dividends: 0 },
        expenses: { housing: 60000 },
      };
      const result = calculateBudget(input);
      expect(result.summaryByScenario.conservative.status).toBe("at_risk");
    });

    it("should mark as sustainable with large portfolio and low expenses", () => {
      const input: BudgetInput = {
        ...postRetInput,
        portfolioBalance: 5000000,
        expenses: { housing: 12000 },
      };
      const result = calculateBudget(input);
      expect(result.summaryByScenario.base.status).toBe("sustainable");
    });

    it("should have projections with correct year count", () => {
      const result = calculateBudget(postRetInput);
      const baseProjections = result.projections.base;
      expect(baseProjections.length).toBe(30);
    });

    it("should inflate expenses over time", () => {
      const result = calculateBudget(postRetInput);
      const baseProjections = result.projections.base as BudgetProjection[];
      expect(baseProjections[10].annualExpenses).toBeGreaterThan(baseProjections[0].annualExpenses);
    });

    it("should include notes about Social Security indexing", () => {
      const result = calculateBudget(postRetInput);
      expect(result.notes.some((n) => n.includes("Social Security"))).toBe(true);
    });

    it("should detect depletion year correctly", () => {
      const input: BudgetInput = {
        ...postRetInput,
        portfolioBalance: 100000,
        retirementIncome: { socialSecurity: 0, pension: 0, dividends: 0 },
        expenses: { housing: 30000, food: 20000 },
      };
      const result = calculateBudget(input);
      const conservativeSummary = result.summaryByScenario.conservative;
      expect(conservativeSummary.yearsUntilDepletion).not.toBeNull();
      expect(conservativeSummary.yearsUntilDepletion!).toBeLessThan(30);
    });

    it("should handle income exceeding expenses (no shortfall)", () => {
      const input: BudgetInput = {
        ...postRetInput,
        retirementIncome: { socialSecurity: 60000, pension: 30000, dividends: 20000 },
        expenses: { housing: 24000, food: 12000 },
      };
      const result = calculateBudget(input);
      expect(result.summaryByScenario.base.annualShortfall).toBe(0);
    });

    it("should handle very large portfolio with tiny expenses", () => {
      const input: BudgetInput = {
        ...postRetInput,
        portfolioBalance: 50000000,
        expenses: { food: 1000 },
      };
      const result = calculateBudget(input);
      expect(result.summaryByScenario.base.status).toBe("sustainable");
      expect(result.summaryByScenario.base.safeWithdrawalRate).toBeLessThan(1);
    });
  });

  describe("Stress tests and edge cases", () => {
    it("should handle a single expense category", () => {
      const input: BudgetInput = {
        mode: "post_retirement",
        currentAge: 65,
        portfolioBalance: 500000,
        retirementIncome: { socialSecurity: 0, pension: 0, dividends: 0 },
        expenses: { housing: 30000 },
        scenarios: baseScenarios,
        projectionYears: 20,
      };
      const result = calculateBudget(input);
      expect(result.expenseSummary.categories.length).toBe(1);
      expect(result.expenseSummary.totalAnnualExpenses).toBe(30000);
    });

    it("should handle very long projection period (50 years)", () => {
      const input: BudgetInput = {
        mode: "pre_retirement",
        currentAge: 25,
        retirementAge: 65,
        currentIncome: 80000,
        annualSavingsAmount: 15000,
        currentSavings: 10000,
        expenses: baseExpenses,
        scenarios: baseScenarios,
        projectionYears: 50,
      };
      const result = calculateBudget(input);
      expect(result.projections.base.length).toBe(41);
    });

    it("should handle very high inflation scenario", () => {
      const input: BudgetInput = {
        mode: "post_retirement",
        currentAge: 65,
        portfolioBalance: 1000000,
        retirementIncome: { socialSecurity: 24000, pension: 0, dividends: 0 },
        expenses: baseExpenses,
        scenarios: {
          base: { growthRate: 0.06, inflationRate: 0.08 },
          optimistic: { growthRate: 0.10, inflationRate: 0.06 },
          conservative: { growthRate: 0.02, inflationRate: 0.10 },
        },
        projectionYears: 30,
      };
      const result = calculateBudget(input);
      expect(["at_risk", "caution"]).toContain(result.summaryByScenario.conservative.status);
    });

    it("should handle negative growth rate scenario", () => {
      const input: BudgetInput = {
        mode: "pre_retirement",
        currentAge: 55,
        retirementAge: 65,
        currentIncome: 100000,
        annualSavingsAmount: 10000,
        currentSavings: 500000,
        expenses: baseExpenses,
        scenarios: {
          base: { growthRate: -0.02, inflationRate: 0.03 },
          optimistic: { growthRate: 0.02, inflationRate: 0.02 },
          conservative: { growthRate: -0.05, inflationRate: 0.04 },
        },
        projectionYears: 15,
      };
      const result = calculateBudget(input);
      expect(result.summaryByScenario.conservative.accountBalanceAtEnd).toBeLessThan(
        result.summaryByScenario.optimistic.accountBalanceAtEnd
      );
    });

    it("should produce scenario summaries with correct structure", () => {
      const input: BudgetInput = {
        mode: "post_retirement",
        currentAge: 65,
        portfolioBalance: 1000000,
        retirementIncome: { socialSecurity: 24000, pension: 0, dividends: 0 },
        expenses: baseExpenses,
        scenarios: baseScenarios,
        projectionYears: 30,
      };
      const result = calculateBudget(input);
      for (const scenario of ["base", "optimistic", "conservative"] as const) {
        expect(result.summaryByScenario[scenario]).toHaveProperty("accountBalanceAtEnd");
        expect(result.summaryByScenario[scenario]).toHaveProperty("status");
      }
    });

    it("should produce notes array with guidance", () => {
      const input: BudgetInput = {
        mode: "post_retirement",
        currentAge: 65,
        portfolioBalance: 1000000,
        retirementIncome: { socialSecurity: 24000, pension: 0, dividends: 0 },
        expenses: baseExpenses,
        scenarios: baseScenarios,
        projectionYears: 30,
      };
      const result = calculateBudget(input);
      expect(result.notes.length).toBeGreaterThan(0);
    });
  });
});
