import { storage } from "../../storage";
import { logger } from "../../lib/logger";
import type { InsertInsight } from "@shared/schema";

export class UnderinsuranceGenerator {
  async generate(client: any, advisorId: string): Promise<InsertInsight[]> {
    try {
      const accounts = await storage.getAccountsByClient(client.id);
      const totalAUM = accounts.reduce((s: number, a: any) => s + parseFloat(String(a.balance || "0")), 0);

      if (totalAUM <= 0) return [];

      const estimatedIncome = Math.round(totalAUM * 0.04);

      const notes = (client.notes || "").toLowerCase();
      let dependentCount = 0;
      const dependentPatterns = [
        /(\d+)\s*(?:children|kids|dependents)/i,
        /(?:children|kids|dependents).*?(\d+)/i,
      ];
      for (const pat of dependentPatterns) {
        const match = (client.notes || "").match(pat);
        if (match) { dependentCount = parseInt(match[1]); break; }
      }
      if (dependentCount === 0) {
        const familyMentions = (client.notes || "").match(/child|kid|baby|son|daughter|dependent/gi);
        if (familyMentions) dependentCount = familyMentions.length;
      }
      const hasSpouse = /spouse|wife|husband|married|partner/i.test(client.notes || "");

      if (dependentCount === 0 && !hasSpouse) return [];

      const incomeMultiplier = dependentCount > 0 ? 10 + dependentCount : 8;
      const recommendedCoverage = estimatedIncome * incomeMultiplier;

      const insuranceAccounts = accounts.filter((a: any) =>
        /insurance|life|annuity/i.test(a.accountType || "")
      );
      const existingCoverage = insuranceAccounts.reduce(
        (s: number, a: any) => s + parseFloat(String(a.balance || "0")), 0
      );

      let inferredCoverage = existingCoverage;
      const coverageMatch = (client.notes || "").match(/(?:life\s*insurance|coverage).*?\$([0-9,.]+[kKmM]?)/i);
      if (coverageMatch) {
        let val = coverageMatch[1].replace(/,/g, "");
        if (/[kK]$/.test(val)) val = String(parseFloat(val) * 1000);
        else if (/[mM]$/.test(val)) val = String(parseFloat(val) * 1000000);
        inferredCoverage = Math.max(inferredCoverage, parseFloat(val) || 0);
      }

      const gap = Math.max(0, recommendedCoverage - inferredCoverage);
      if (gap < 50000) return [];

      const severity = gap >= 250000 ? "high" : gap >= 100000 ? "medium" : "low";
      const estimatedMonthlyCost = (gap / 100000) * 15;

      const clientAge = client.dateOfBirth ? this.calcAge(client.dateOfBirth) : null;
      const confidence = dependentCount > 0 ? 85 : 70;

      return [{
        clientId: client.id,
        advisorId,
        insightType: "underinsured",
        severity,
        title: `Life Insurance Gap — $${Math.round(gap / 1000)}k`,
        description: `Client has $${Math.round(inferredCoverage / 1000)}k in estimated coverage; recommend $${Math.round(recommendedCoverage / 1000)}k based on ${dependentCount || "unknown"} dependents and estimated $${Math.round(estimatedIncome / 1000)}k annual income.`,
        opportunity: `Estimated $${Math.round(estimatedMonthlyCost * 12)}/year in premiums for additional coverage.`,
        recommendedAction: "Schedule insurance review meeting; obtain quotes for term life policy.",
        estimatedValue: String(Math.round(estimatedMonthlyCost * 12)),
        metrics: {
          currentCoverage: inferredCoverage,
          recommendedCoverage,
          coverageGap: gap,
          dependents: dependentCount,
          estimatedIncome,
          clientAge,
        },
        confidence,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }];
    } catch (err) {
      logger.error({ err }, "API error");
      return [];
    }
  }

  private calcAge(dob: string): number | null {
    try {
      const d = new Date(dob);
      if (isNaN(d.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
      return age;
    } catch { return null; }
  }
}
