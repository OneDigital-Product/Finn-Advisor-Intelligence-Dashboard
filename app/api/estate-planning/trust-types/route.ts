import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";

const TRUST_TYPE_INFO: Record<string, { label: string; description: string; taxBenefits: string[] }> = {
  GRAT: { label: "Grantor Retained Annuity Trust", description: "Transfers appreciation to beneficiaries with minimal gift tax cost by retaining an annuity interest.", taxBenefits: ["Freezes estate value at creation", "Excess growth passes tax-free", "Useful for appreciating assets"] },
  SLAT: { label: "Spousal Lifetime Access Trust", description: "Irrevocable trust for spouse's benefit that removes assets from grantor's estate while maintaining indirect access.", taxBenefits: ["Removes assets from taxable estate", "Spouse retains access to funds", "Uses lifetime gift tax exemption"] },
  QPRT: { label: "Qualified Personal Residence Trust", description: "Transfers residence to beneficiaries at reduced gift tax cost while grantor retains right to live in home.", taxBenefits: ["Reduced gift tax value", "Removes home appreciation from estate", "Grantor retains residence right"] },
  ILIT: { label: "Irrevocable Life Insurance Trust", description: "Holds life insurance policy outside the estate to provide tax-free death benefit to beneficiaries.", taxBenefits: ["Insurance proceeds excluded from estate", "Provides estate liquidity", "No estate tax on proceeds"] },
  CRT: { label: "Charitable Remainder Trust", description: "Provides income stream to donor, then remainder to charity, with upfront charitable deduction.", taxBenefits: ["Immediate charitable deduction", "Avoids capital gains on contributed assets", "Income stream for life or term"] },
  DAF: { label: "Donor-Advised Fund", description: "Charitable giving vehicle providing immediate tax deduction with advisory privileges on grants.", taxBenefits: ["Immediate tax deduction", "Tax-free growth", "Flexible charitable giving"] },
  REVOCABLE: { label: "Revocable Living Trust", description: "Flexible trust that avoids probate while allowing grantor full control during lifetime.", taxBenefits: ["Avoids probate", "Maintains privacy", "No estate tax benefit (included in estate)"] },
  DYNASTY: { label: "Dynasty Trust", description: "Multi-generational trust designed to pass wealth for many generations while minimizing transfer taxes.", taxBenefits: ["Multi-generational wealth transfer", "GST exemption leveraged", "Avoids estate tax at each generation"] },
};

export async function GET() {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  return NextResponse.json(TRUST_TYPE_INFO);
} catch (err) {
    logger.error({ err }, "[estate-planning/trust-types] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
