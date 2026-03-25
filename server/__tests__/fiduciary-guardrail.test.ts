import { describe, it, expect } from "vitest";
import { applyFiduciaryGuardrails, getDefaultRules } from "../lib/fiduciary-guardrail";

describe("Fiduciary Guardrail", () => {
  describe("Clean output", () => {
    it("should pass clean financial advice through unchanged", () => {
      const output = "Based on the analysis, the client's portfolio is well-diversified across multiple asset classes. Consider reviewing the allocation annually.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(true);
      expect(result.flagged).toBe(false);
      expect(result.violations).toHaveLength(0);
      expect(result.output).toBe(output);
      expect(result.disclaimer).toBeNull();
    });

    it("should pass standard recommendation language", () => {
      const output = "The client may benefit from increasing their bond allocation to reduce volatility as they approach retirement.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe("Guarantee of returns (block)", () => {
    it("should block guaranteed return claims", () => {
      const output = "This investment guarantees a return of 10% annually.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].ruleId).toBe("guarantee-returns");
      expect(result.violations[0].severity).toBe("block");
      expect(result.output).toContain("Past performance does not guarantee future results");
    });

    it("should block guaranteed profit claims", () => {
      const output = "This strategy will definitely earn you money every year.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.ruleId === "guarantee-returns")).toBe(true);
    });

    it("should block promised returns", () => {
      const output = "I promise a return of 8% on this portfolio.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(false);
    });
  });

  describe("Risk-free claims (block)", () => {
    it("should block risk-free investment claims", () => {
      const output = "This is a risk-free investment opportunity.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.ruleId === "no-risk-claim")).toBe(true);
      expect(result.output).toContain("All investments carry risk");
    });

    it("should block zero risk claims", () => {
      const output = "You can invest without any risk in this fund.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(false);
    });

    it("should block 'eliminates all risk' claims", () => {
      const output = "This strategy eliminates all risk from your portfolio.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(false);
    });
  });

  describe("Specific security recommendations (flag)", () => {
    it("should flag specific buy recommendations", () => {
      const output = "You should buy AAPL immediately for maximum growth.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.flagged).toBe(true);
      expect(result.violations.some(v => v.ruleId === "specific-security-recommendation")).toBe(true);
    });

    it("should flag specific sell recommendations", () => {
      const output = "I recommend selling TSLA before it drops further.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.flagged).toBe(true);
    });
  });

  describe("Market timing (block)", () => {
    it("should block definitive market crash predictions", () => {
      const output = "The market will definitely crash next month.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.ruleId === "market-timing")).toBe(true);
    });

    it("should block definitive market rise predictions", () => {
      const output = "Stocks will certainly go up next quarter.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(false);
    });
  });

  describe("Legal advice (block)", () => {
    it("should block legal advice impersonation", () => {
      const output = "As your attorney, I advise you to restructure the trust.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(false);
      expect(result.output).toContain("qualified legal professional");
    });
  });

  describe("Unlicensed advice (block)", () => {
    it("should block AI claiming to be a licensed advisor", () => {
      const output = "As a licensed advisor, I can tell you this is the best strategy.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(false);
      expect(result.output).toContain("AI-generated content");
    });

    it("should block claims of being a CFP", () => {
      const output = "I am a CFP and my analysis shows this is optimal.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.passed).toBe(false);
    });
  });

  describe("Disclaimer handling", () => {
    it("should add disclaimer for flagged content", () => {
      const output = "You should buy AAPL for guaranteed gains.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.disclaimer).not.toBeNull();
      expect(result.output).toContain("does not constitute");
    });

    it("should not duplicate disclaimer if already present", () => {
      const output = "This investment guarantees a return. This does not constitute personalized advice.";
      const result = applyFiduciaryGuardrails(output);
      const disclaimerCount = (result.output.match(/does not constitute/g) || []).length;
      expect(disclaimerCount).toBe(1);
    });
  });

  describe("Multiple violations", () => {
    it("should detect multiple violations in one output", () => {
      const output = "This risk-free investment guarantees a return of 15%. The market will definitely go up.";
      const result = applyFiduciaryGuardrails(output);
      expect(result.violations.length).toBeGreaterThan(1);
      expect(result.passed).toBe(false);
    });
  });

  describe("getDefaultRules", () => {
    it("should return a copy of default rules", () => {
      const rules = getDefaultRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0]).toHaveProperty("id");
      expect(rules[0]).toHaveProperty("pattern");
      expect(rules[0]).toHaveProperty("severity");
    });
  });
});
