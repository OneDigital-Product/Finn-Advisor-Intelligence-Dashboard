import { NextResponse } from "next/server";
import { requireAuth } from "@lib/auth-helpers";
import { logger } from "@server/lib/logger";

export async function GET() {
  try {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  // Returns all default questionnaire templates (same as Express version)
  return NextResponse.json([
    { name: "Individual Client Discovery", clientType: "individual", sections: [
      { title: "Personal Background", description: "Basic information about the prospect", questions: [
        { id: "occupation", label: "Current occupation", type: "text", required: true, placeholder: "e.g., Software Engineer" },
        { id: "employer", label: "Employer", type: "text", placeholder: "Company name" },
        { id: "maritalStatus", label: "Marital status", type: "select", options: ["Single", "Married", "Divorced", "Widowed", "Domestic Partnership"], required: true },
        { id: "dependents", label: "Number of dependents", type: "number", placeholder: "0" },
        { id: "referralSource", label: "How did you hear about us?", type: "text", placeholder: "Referral, online search, etc." },
      ]},
      { title: "Financial Snapshot", description: "High-level financial picture", questions: [
        { id: "estimatedAssets", label: "Estimated investable assets ($)", type: "number", required: true, placeholder: "500000" },
        { id: "annualIncome", label: "Estimated annual household income ($)", type: "number", placeholder: "150000" },
        { id: "hasRetirementAccounts", label: "Do you have retirement accounts (401k, IRA)?", type: "boolean" },
        { id: "hasExistingAdvisor", label: "Do you currently work with a financial advisor?", type: "boolean" },
        { id: "reasonForChange", label: "What prompted you to seek financial advice now?", type: "textarea", placeholder: "Life event, dissatisfaction, new goals..." },
      ]},
      { title: "Values & Priorities", description: "Understanding what matters most", questions: [
        { id: "topPriorities", label: "What are your top 3 financial priorities?", type: "textarea", required: true },
        { id: "financialConcerns", label: "What financial concerns keep you up at night?", type: "textarea" },
        { id: "philanthropic", label: "Is charitable giving important to you?", type: "boolean" },
      ]},
      { title: "Risk & Investment Experience", description: "Understanding investment comfort level", questions: [
        { id: "investmentExperience", label: "How would you describe your investment experience?", type: "select", options: ["Novice", "Some experience", "Experienced", "Very experienced"], required: true },
        { id: "riskTolerance", label: "Risk tolerance level", type: "select", options: ["Conservative", "Moderately Conservative", "Moderate", "Moderately Aggressive", "Aggressive"], required: true },
        { id: "marketReaction", label: "If your portfolio dropped 20%, what would you do?", type: "select", options: ["Sell everything", "Sell some positions", "Hold steady", "Buy more"] },
      ]},
    ]},
    { name: "Couple Discovery", clientType: "couple", sections: [
      { title: "Couple Background", questions: [{ id: "partner1Name", label: "Partner 1 full name", type: "text", required: true }, { id: "partner2Name", label: "Partner 2 full name", type: "text", required: true }] },
    ]},
    { name: "Business Owner Discovery", clientType: "business_owner", sections: [
      { title: "Business Information", questions: [{ id: "businessName", label: "Business name", type: "text", required: true }, { id: "businessType", label: "Type of business", type: "select", options: ["Sole Proprietorship", "Partnership", "LLC", "S-Corp", "C-Corp", "Other"], required: true }] },
    ]},
    { name: "Inheritor Discovery", clientType: "inheritor", sections: [
      { title: "Inheritance Details", questions: [{ id: "inheritanceSource", label: "Relationship to the person who left the inheritance", type: "select", options: ["Parent", "Grandparent", "Spouse", "Other family", "Non-family"], required: true }] },
    ]},
  ]);
} catch (err) {
    logger.error({ err }, "[discovery/templates] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
