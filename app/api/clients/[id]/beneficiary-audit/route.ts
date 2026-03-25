import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getSessionAdvisor, isSalesforceUser } from "@lib/auth-helpers";
import { storage } from "@server/storage";
import { logger } from "@server/lib/logger";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { getBeneficiaryDesignations } from "@server/integrations/salesforce/queries";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getAccountGroupInfo } from "@server/integrations/mulesoft/api";

async function verifyClientAccess(session: any, clientId: string): Promise<boolean> {
  const advisor = await getSessionAdvisor(session);
  if (!advisor) return false;
  const client = await storage.getClient(clientId);
  if (!client) return false;
  return client.advisorId === advisor.id;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id: clientId } = await params;
    const hasAccess = await verifyClientAccess(auth.session, clientId);
    if (!hasAccess) return NextResponse.json({ message: "Access denied" }, { status: 403 });

    const [accounts, clientTrusts, checklistItems] = await Promise.all([
      storage.getAccountsByClient(clientId),
      storage.getTrustsByClient(clientId),
      storage.getDocumentChecklist(clientId),
    ]);

    const trustsWithRelationships = await Promise.all(
      clientTrusts.map(async (trust) => {
        const relationships = await storage.getTrustRelationships(trust.id);
        return { ...trust, relationships };
      })
    );

    const beneficiaryEligibleTypes = ["ira", "401k", "retirement", "trust", "life", "annuity", "roth", "pension"];
    const eligibleAccounts = accounts.filter((a) => {
      const type = (a.accountType || "").toLowerCase();
      return beneficiaryEligibleTypes.some((t) => type.includes(t));
    });

    const beneficiaryDocs = checklistItems.filter((d) => {
      const name = (d.documentName || "").toLowerCase();
      const cat = (d.category || "").toLowerCase();
      return name.includes("beneficiary") || cat.includes("beneficiary");
    });

    const receivedBeneficiaryDocs = beneficiaryDocs.filter((d) => d.received);

    const latestReviewDate = receivedBeneficiaryDocs.reduce((latest: string | null, d) => {
      if (!d.receivedDate) return latest;
      if (!latest || d.receivedDate > latest) return d.receivedDate;
      return latest;
    }, null);

    const isStaleReview = latestReviewDate ? (() => {
      const reviewDate = new Date(latestReviewDate);
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      return reviewDate < threeYearsAgo;
    })() : false;

    const allBeneficiaries = trustsWithRelationships.flatMap((t) =>
      (t.relationships || [])
        .filter((r: any) => r.role === "beneficiary")
        .map((r: any) => ({
          personName: r.personName,
          role: r.role,
          generation: r.generation,
          trustId: t.id,
          trustName: t.name,
          trustType: t.trustType,
        }))
    );

    const accountAuditResults = eligibleAccounts.map((acct) => {
      const type = (acct.accountType || "").toLowerCase();
      const conflicts: Array<{ type: string; severity: string; message: string }> = [];

      const linkedTrust = trustsWithRelationships.find((t) =>
        t.trustType === "REVOCABLE" && type.includes("trust")
      );

      const accountBeneficiaries = linkedTrust
        ? (linkedTrust.relationships || [])
            .filter((r: any) => r.role === "beneficiary")
            .map((r: any) => ({ personName: r.personName, generation: r.generation, source: `Trust: ${linkedTrust.name}` }))
        : [];

      if (receivedBeneficiaryDocs.length === 0) {
        conflicts.push({
          type: "missing_designation",
          severity: "critical",
          message: `No beneficiary designation document on file for ${acct.accountType} account`,
        });
      }

      if (isStaleReview && receivedBeneficiaryDocs.length > 0) {
        conflicts.push({
          type: "stale_review",
          severity: "warning",
          message: `Beneficiary designation last reviewed ${latestReviewDate} — over 3 years ago`,
        });
      }

      const hasMinorBeneficiary = accountBeneficiaries.some((b: any) =>
        b.generation !== null && b.generation !== undefined && b.generation >= 2
      );
      if (hasMinorBeneficiary && (type.includes("ira") || type.includes("401k") || type.includes("retirement"))) {
        conflicts.push({
          type: "minor_direct",
          severity: "warning",
          message: "Potential minor as direct beneficiary — consider a trust as beneficiary instead",
        });
      }

      return {
        accountId: acct.id,
        accountNumber: acct.accountNumber,
        accountType: acct.accountType,
        custodian: acct.custodian,
        balance: acct.balance,
        hasBeneficiaryDoc: receivedBeneficiaryDocs.length > 0,
        lastReviewedDate: latestReviewDate,
        designations: accountBeneficiaries,
        conflicts,
      };
    });

    // ── Enrich with live SF beneficiary designations + Orion account group info ──
    let sfDesignations: any[] = [];
    let orionGroupInfo: any[] = [];
    let liveDataSource: string[] = [];

    // Get Salesforce financial account IDs from accounts that have SF IDs
    const sfAccountIds = accounts
      .map((a: any) => a.sfAccountId || a.externalId)
      .filter(Boolean);

    // Get Orion entity IDs from accounts
    const orionEntityIds = accounts
      .map((a: any) => Number(a.orionAccountId || a.externalOrionId))
      .filter((id: number) => !isNaN(id) && id > 0);

    const enrichmentPromises: Promise<void>[] = [];

    if (isSalesforceEnabled() && sfAccountIds.length > 0) {
      enrichmentPromises.push(
        getBeneficiaryDesignations(sfAccountIds)
          .then((designations) => {
            sfDesignations = designations;
            liveDataSource.push("salesforce");
          })
          .catch((err) => {
            logger.warn({ err }, "[Beneficiary Audit] SF designations fetch failed — using local data only");
          })
      );
    }

    if (isMulesoftEnabled() && orionEntityIds.length > 0) {
      enrichmentPromises.push(
        getAccountGroupInfo(orionEntityIds)
          .then((info) => {
            orionGroupInfo = info;
            liveDataSource.push("orion");
          })
          .catch((err) => {
            logger.warn({ err }, "[Beneficiary Audit] Orion group-info fetch failed — using local data only");
          })
      );
    }

    // Run enrichment in parallel (non-blocking — local data always returned)
    await Promise.allSettled(enrichmentPromises);

    // Merge SF designations into account audit results
    if (sfDesignations.length > 0) {
      for (const audit of accountAuditResults) {
        const matchingDesignations = sfDesignations.filter(
          (d: any) => d.FinancialAccountId === (accounts.find((a: any) => a.id === audit.accountId)?.sfAccountId)
        );
        if (matchingDesignations.length > 0) {
          audit.designations = [
            ...audit.designations,
            ...matchingDesignations.map((d: any) => ({
              personName: d.RelatedAccount?.Name || "Unknown",
              role: d.Role || "Beneficiary",
              source: "Salesforce",
            })),
          ];
          // If SF shows designations, remove "missing_designation" conflict
          audit.conflicts = audit.conflicts.filter((c: { type: string }) => c.type !== "missing_designation");
          audit.hasBeneficiaryDoc = true;
        }
      }
    }

    return NextResponse.json({
      accounts: accountAuditResults,
      trusts: trustsWithRelationships.map((t) => ({
        id: t.id,
        name: t.name,
        trustType: t.trustType,
        beneficiaries: (t.relationships || [])
          .filter((r: any) => r.role === "beneficiary")
          .map((r: any) => ({ personName: r.personName, generation: r.generation, id: r.id })),
      })),
      allBeneficiaries,
      documentStatus: {
        totalDocs: beneficiaryDocs.length,
        receivedDocs: receivedBeneficiaryDocs.length,
        latestReviewDate,
        isStaleReview,
      },
      summary: {
        totalEligible: eligibleAccounts.length,
        criticalIssues: accountAuditResults.reduce((sum, a) => sum + a.conflicts.filter((c) => c.severity === "critical").length, 0),
        warnings: accountAuditResults.reduce((sum, a) => sum + a.conflicts.filter((c) => c.severity === "warning").length, 0),
        clean: accountAuditResults.filter((a) => a.conflicts.length === 0).length,
      },
      // Live enrichment data
      sfDesignations: sfDesignations.map((d: any) => ({
        financialAccountId: d.FinancialAccountId,
        role: d.Role,
        beneficiaryName: d.RelatedAccount?.Name || "Unknown",
      })),
      orionGroupInfo,
      liveDataSource,
    });
  } catch (error: any) {
    logger.error({ err: error }, "Error fetching beneficiary audit data:");
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
