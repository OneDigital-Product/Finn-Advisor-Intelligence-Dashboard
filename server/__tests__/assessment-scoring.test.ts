import { describe, it, expect } from "vitest";
import { AssessmentEngine } from "../engines/assessment-engine";

interface PrivateEngine {
  parseAIResult(aiResult: string, domain: string, keyMetrics?: Record<string, unknown>): {
    domain: string;
    status: string;
    score: number;
    summary: string;
    keyMetrics: Record<string, unknown>;
    recommendations: Array<{ priority: string; action: string; rationale: string; estimatedImpact?: string; estimatedCost?: string }>;
  };
  placeholderDomain(domain: string, summary: string, recommendation: { priority: string; action: string; rationale: string }): {
    domain: string;
    status: string;
    score: number;
    recommendations: Array<{ priority: string; action: string; rationale: string }>;
  };
  generateExecutiveSummary(domains: unknown[], overallScore: number, clientName: string): string;
  calculateAge(dateOfBirth: string): number | null;
}

const engine: PrivateEngine = new AssessmentEngine() as unknown as PrivateEngine;

describe("Assessment Engine Scoring", () => {
  describe("parseAIResult", () => {
    it("should parse valid JSON AI response", () => {
      const aiResult = JSON.stringify({
        status: "on_track",
        score: 75,
        summary: "Portfolio is well-diversified.",
        recommendations: [
          { priority: "medium", action: "Review allocation", rationale: "Ensure alignment" },
        ],
      });
      const result = engine.parseAIResult(aiResult, "investment", { totalAUM: "$1M" });
      expect(result.domain).toBe("investment");
      expect(result.status).toBe("on_track");
      expect(result.score).toBe(75);
      expect(result.summary).toBe("Portfolio is well-diversified.");
      expect(result.recommendations).toHaveLength(1);
      expect(result.keyMetrics.totalAUM).toBe("$1M");
    });

    it("should handle JSON wrapped in code fences", () => {
      const aiResult = '```json\n{"status":"action_needed","score":30,"summary":"Needs work","recommendations":[]}\n```';
      const result = engine.parseAIResult(aiResult, "cashflow");
      expect(result.status).toBe("action_needed");
      expect(result.score).toBe(30);
    });

    it("should normalize status values", () => {
      const testCases: Array<[string, string]> = [
        ["action_needed", "action_needed"],
        ["critical", "action_needed"],
        ["needs improvement", "action_needed"],
        ["underfunded", "action_needed"],
        ["on_track", "on_track"],
        ["adequate", "on_track"],
        ["good", "on_track"],
        ["excellent", "on_track"],
        ["review", "review"],
        ["unknown", "review"],
        ["", "review"],
      ];

      for (const [input, expected] of testCases) {
        const aiResult = JSON.stringify({ status: input, score: 50, summary: "Test", recommendations: [] });
        const result = engine.parseAIResult(aiResult, "cashflow");
        expect(result.status).toBe(expected);
      }
    });

    it("should clamp score between 0 and 100", () => {
      let result = engine.parseAIResult(JSON.stringify({ status: "ok", score: 150, summary: "T", recommendations: [] }), "tax");
      expect(result.score).toBe(100);

      result = engine.parseAIResult(JSON.stringify({ status: "ok", score: -20, summary: "T", recommendations: [] }), "tax");
      expect(result.score).toBe(0);
    });

    it("should default score to 50 for missing/invalid score", () => {
      const result = engine.parseAIResult(JSON.stringify({ status: "ok", score: "invalid", summary: "T", recommendations: [] }), "tax");
      expect(result.score).toBe(50);
    });

    it("should normalize recommendation priorities", () => {
      const aiResult = JSON.stringify({
        status: "ok",
        score: 50,
        summary: "T",
        recommendations: [
          { priority: "high", action: "A", rationale: "R" },
          { priority: "invalid", action: "B", rationale: "R" },
          { priority: "low", action: "C", rationale: "R" },
        ],
      });
      const result = engine.parseAIResult(aiResult, "investment");
      expect(result.recommendations[0].priority).toBe("high");
      expect(result.recommendations[1].priority).toBe("medium");
      expect(result.recommendations[2].priority).toBe("low");
    });

    it("should return fallback on invalid JSON", () => {
      const result = engine.parseAIResult("Not valid JSON at all", "insurance");
      expect(result.domain).toBe("insurance");
      expect(result.status).toBe("review");
      expect(result.score).toBe(50);
      expect(result.summary).toContain("pending");
      expect(result.recommendations).toHaveLength(0);
    });

    it("should handle empty recommendations array", () => {
      const aiResult = JSON.stringify({ status: "on_track", score: 85, summary: "Good", recommendations: [] });
      const result = engine.parseAIResult(aiResult, "estate");
      expect(result.recommendations).toHaveLength(0);
    });

    it("should handle missing recommendations field", () => {
      const aiResult = JSON.stringify({ status: "on_track", score: 85, summary: "Good" });
      const result = engine.parseAIResult(aiResult, "estate");
      expect(result.recommendations).toHaveLength(0);
    });

    it("should include estimatedImpact and estimatedCost from recommendations", () => {
      const aiResult = JSON.stringify({
        status: "ok", score: 60, summary: "T",
        recommendations: [{ priority: "high", action: "A", rationale: "R", estimatedImpact: "$5k", estimatedCost: "$100" }],
      });
      const result = engine.parseAIResult(aiResult, "tax");
      expect(result.recommendations[0].estimatedImpact).toBe("$5k");
      expect(result.recommendations[0].estimatedCost).toBe("$100");
    });
  });

  describe("placeholderDomain", () => {
    it("should return a review status domain with score 40", () => {
      const result = engine.placeholderDomain("investment", "No data available.", {
        priority: "high",
        action: "Add holdings",
        rationale: "Cannot assess without data",
      });
      expect(result.domain).toBe("investment");
      expect(result.status).toBe("review");
      expect(result.score).toBe(40);
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].priority).toBe("high");
    });
  });

  describe("generateExecutiveSummary", () => {
    it("should generate summary with action needed areas", () => {
      const domains = [
        { domain: "cashflow", status: "action_needed" as const, score: 30, summary: "", keyMetrics: {}, recommendations: [], generatedAt: new Date() },
        { domain: "investment", status: "on_track" as const, score: 80, summary: "", keyMetrics: {}, recommendations: [{ priority: "medium" as const, action: "test", rationale: "r" }], generatedAt: new Date() },
      ];
      const summary = engine.generateExecutiveSummary(domains, 55, "John Doe");
      expect(summary).toContain("John Doe");
      expect(summary).toContain("55/100");
      expect(summary).toContain("1 area requires attention");
      expect(summary).toContain("Cash Flow");
      expect(summary).toContain("1 area is on track");
    });

    it("should handle multiple action needed areas", () => {
      const domains = [
        { domain: "cashflow", status: "action_needed" as const, score: 30, summary: "", keyMetrics: {}, recommendations: [], generatedAt: new Date() },
        { domain: "tax", status: "action_needed" as const, score: 25, summary: "", keyMetrics: {}, recommendations: [], generatedAt: new Date() },
      ];
      const summary = engine.generateExecutiveSummary(domains, 27, "Jane Doe");
      expect(summary).toContain("2 areas require attention");
    });

    it("should include recommendation count", () => {
      const domains = [
        { domain: "cashflow", status: "on_track" as const, score: 80, summary: "", keyMetrics: {}, recommendations: [
          { priority: "medium" as const, action: "a", rationale: "r" },
          { priority: "low" as const, action: "b", rationale: "r" },
        ], generatedAt: new Date() },
      ];
      const summary = engine.generateExecutiveSummary(domains, 80, "Client");
      expect(summary).toContain("2 recommendations");
    });
  });

  describe("calculateAge", () => {
    it("should calculate correct age", () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 45;
      const dob = `${birthYear}-01-01`;
      const age = engine.calculateAge(dob);
      expect(age).toBeGreaterThanOrEqual(44);
      expect(age).toBeLessThanOrEqual(45);
    });

    it("should return null for invalid date", () => {
      expect(engine.calculateAge("not-a-date")).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(engine.calculateAge("")).toBeNull();
    });
  });
});
