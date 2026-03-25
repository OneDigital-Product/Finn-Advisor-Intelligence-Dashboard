import { storage } from "../../storage";
import { logger } from "../../lib/logger";
import type { InsertInsight } from "@shared/schema";

export class EstateGapGenerator {
  async generate(client: any, advisorId: string): Promise<InsertInsight[]> {
    try {
      const accounts = await storage.getAccountsByClient(client.id);
      const totalAUM = accounts.reduce((s: number, a: any) => s + parseFloat(String(a.balance || "0")), 0);

      if (totalAUM < 100000) return [];

      const insights: InsertInsight[] = [];
      const clientAge = client.dateOfBirth ? this.calcAge(client.dateOfBirth) : null;
      const notes = (client.notes || "").toLowerCase();

      const hasTrust = /trust|revocable|irrevocable/i.test(notes);
      const hasWill = /will|testament/i.test(notes);
      const hasPOA = /power of attorney|poa|healthcare proxy/i.test(notes);
      const hasEstatePlan = hasTrust || hasWill || hasPOA;

      const retirementAccounts = accounts.filter((a: any) =>
        /ira|401k|403b|pension|retirement/i.test(a.accountType || "")
      );
      const retirementBalance = retirementAccounts.reduce(
        (s: number, a: any) => s + parseFloat(String(a.balance || "0")), 0
      );

      const hasDependents = /child|kid|baby|son|daughter|dependent|spouse|wife|husband/i.test(client.notes || "");

      const isHighNetWorth = totalAUM > 1000000;
      const isElder = clientAge && clientAge >= 60;
      const needsEstatePlanning = (isHighNetWorth || isElder || hasDependents) && !hasEstatePlan;

      if (needsEstatePlanning) {
        const severity = isHighNetWorth && isElder ? "high" : isHighNetWorth || isElder ? "medium" : "low";

        const reasons: string[] = [];
        if (isHighNetWorth) reasons.push(`high net worth ($${Math.round(totalAUM / 1000)}k)`);
        if (isElder) reasons.push(`age ${clientAge}`);
        if (hasDependents) reasons.push("has dependents");

        insights.push({
          clientId: client.id,
          advisorId,
          insightType: "estate_gap",
          severity,
          title: `Estate Planning Gap — ${client.firstName} ${client.lastName}`,
          description: `No estate planning documentation detected for client with ${reasons.join(", ")}. Missing: ${[!hasTrust ? "trust" : "", !hasWill ? "will" : "", !hasPOA ? "power of attorney" : ""].filter(Boolean).join(", ")}.`,
          opportunity: "Prevent probate delays, minimize estate taxes, and ensure assets pass to intended beneficiaries.",
          recommendedAction: "Schedule estate planning review; refer to estate attorney for trust and will preparation.",
          estimatedValue: null,
          metrics: {
            totalAssets: totalAUM,
            retirementBalance,
            hasTrust,
            hasWill,
            hasPOA,
            clientAge,
            hasDependents,
            isHighNetWorth,
          },
          confidence: 90,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      }

      if (retirementAccounts.length > 0 && isElder) {
        const beneficiaryMentioned = /beneficiar/i.test(notes);
        if (!beneficiaryMentioned) {
          insights.push({
            clientId: client.id,
            advisorId,
            insightType: "estate_gap",
            severity: "medium",
            title: `Beneficiary Review Needed — ${retirementAccounts.length} Retirement Account${retirementAccounts.length > 1 ? "s" : ""}`,
            description: `${retirementAccounts.length} retirement account${retirementAccounts.length > 1 ? "s" : ""} totaling $${Math.round(retirementBalance / 1000)}k may have outdated or missing beneficiary designations.`,
            opportunity: "Ensure retirement assets pass directly to intended beneficiaries, avoiding probate.",
            recommendedAction: "Review and update beneficiary designations on all retirement accounts.",
            estimatedValue: null,
            metrics: {
              retirementAccountCount: retirementAccounts.length,
              retirementBalance,
              accountTypes: retirementAccounts.map((a: any) => a.accountType),
            },
            confidence: 80,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        }
      }

      return insights;
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
