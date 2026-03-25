import { NextResponse } from "next/server";
import { requireAuth, isSalesforceUser, getSalesforceUsername } from "@lib/auth-helpers";
import { validateId } from "@lib/validation";
import { storage } from "@server/storage";
import { isMulesoftEnabled } from "@server/integrations/mulesoft/client";
import { getHouseholdMembers as getLiveHouseholdMembers } from "@server/integrations/mulesoft/api";
import { isSalesforceEnabled } from "@server/integrations/salesforce/client";
import { getPersonAccountsByHousehold } from "@server/integrations/salesforce/queries";
import { isValidSalesforceId } from "@server/integrations/salesforce/validate-salesforce-id";
import { logger } from "@server/lib/logger";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/clients/[id]/members — Tier 2 (1-3 seconds)
// ---------------------------------------------------------------------------
export async function GET(request: Request, { params }: RouteContext) {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const session = auth.session;
  const { id } = await params;

  const idCheck = validateId(id);
  if (!idCheck.valid) return idCheck.error;

  const userEmail = session.userEmail;
  const sfUsername = userEmail ? getSalesforceUsername(userEmail) : userEmail;

  // -----------------------------------------------------------------------
  // Salesforce household members for UAT advisors
  // -----------------------------------------------------------------------
  if (isSalesforceUser(userEmail) && isMulesoftEnabled()) {
    try {
      let sfMembers: any[] = [];
      try {
        const membersResult = await getLiveHouseholdMembers({
          username: sfUsername!,
          householdId: id,
        });
        if (membersResult?.members) {
          sfMembers = membersResult.members;
        }
      } catch (err: any) {
        logger.error({ err: err?.message }, `[Members] Failed to fetch household members for ${id}`);
        return NextResponse.json({
          members: [],
          memberCount: 0,
          isLiveData: false,
          _errors: [`Salesforce: ${err?.message || 'Unknown error'}`],
          _dataSources: { salesforce: "error" },
        });
      }

      const members = sfMembers.map((m: any) => ({
        id: m.Id,
        clientId: m.Id,
        householdId: id,
        firstName: m.FirstName || "",
        lastName: m.LastName || "",
        email: m.PersonEmail || "",
        phone: m.Phone || "",
        birthdate: m.PersonBirthdate || null,
        city: m.PersonMailingCity || "",
        state: m.PersonMailingState || "",
        occupation: m.Occupation || m.Title || "",
        employer: m.Employer || m.Company || "",
        address: m.PersonMailingStreet || "",
        zip: m.PersonMailingPostalCode || "",
        relationship: m.FinServ__Role__c || "household_member",
        isLive: true,
      }));

      return NextResponse.json({
        members,
        memberCount: members.length,
        isLiveData: true,
      }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
    } catch (err) {
      logger.error({ err }, `[Members] SF member fetch failed for ${id}, trying direct SF`);
    }

    // ── Direct SF SOQL fallback — MuleSoft down but SF up ──
    if (isSalesforceEnabled() && isValidSalesforceId(id)) {
      try {
        const personAccounts = await getPersonAccountsByHousehold(id);
        if (personAccounts.length > 0) {
          const members = personAccounts.map((p: any) => ({
            id: p.Id,
            clientId: p.Id,
            householdId: id,
            firstName: p.FirstName || "",
            lastName: p.LastName || "",
            email: p.PersonEmail || "",
            phone: p.Phone || "",
            birthdate: p.PersonBirthdate || null,
            city: p.PersonMailingCity || "",
            state: p.PersonMailingState || "",
            occupation: p.FinServ__Occupation__c || "",
            employer: p.FinServ__EmployerName__c || "",
            relationship: "household_member",
            isLive: true,
          }));
          return NextResponse.json({
            members,
            memberCount: members.length,
            isLiveData: true,
            source: "sf-direct",
          }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
        }
      } catch (err) {
        logger.warn({ err }, `[Members] Direct SF fallback also failed for ${id}`);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Local DB fallback — return client as single member
  // -----------------------------------------------------------------------
  const client = await storage.getClient(id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const member = {
    id: client.id,
    firstName: client.firstName || "",
    lastName: client.lastName || "",
    email: client.email || "",
    phone: client.phone || "",
    birthdate: (client as any).birthdate || null,
    city: client.city || "",
    state: client.state || "",
  };

  return NextResponse.json({
    members: [member],
    memberCount: 1,
    isLiveData: false,
  }, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" } });
} catch (err) {
    logger.error({ err }, "[clients/[id]/members] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
