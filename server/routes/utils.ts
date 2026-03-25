import multer from "multer";
import { logger } from "../lib/logger";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const SAMPLE_TRANSCRIPT = `Sarah Mitchell: Good morning Robert, Margaret. Thank you both for coming in today. How have you been?

Robert Henderson: Good morning Sarah. We've been well, thank you. We wanted to sit down and review everything before the end of the quarter.

Margaret Henderson: Yes, and we have a few things we'd like to discuss about our estate planning and the charitable giving plan.

Sarah Mitchell: Absolutely. Let's start with a portfolio review and then move into those topics. Looking at your accounts, your total assets under management are currently around $4.8 million. The portfolio has performed well this year.

Robert Henderson: That's good to hear. How are we doing relative to the benchmark?

Sarah Mitchell: Your year-to-date return is approximately 8.2%, which is outperforming the blended benchmark by about 1.5%. The equity allocation has been the primary driver, particularly the technology holdings.

Margaret Henderson: Speaking of technology, I know we've talked before about being too concentrated in that sector. Where do we stand?

Sarah Mitchell: Great question. Technology currently represents about 42% of the overall portfolio, which is above our target of 30%. I'd recommend we begin a systematic rebalancing over the next quarter. We should consider trimming some of the larger positions and reallocating into healthcare and international developed markets, which are underweight.

Robert Henderson: That makes sense. What about the fixed income side?

Sarah Mitchell: The bond portfolio is well-positioned with an average duration of about 5.5 years. With the current rate environment, I'd suggest we maintain our current allocation but consider adding some Treasury Inflation-Protected Securities as an inflation hedge. We should allocate about 5% of the fixed income sleeve to TIPS.

Margaret Henderson: Robert and I have also been thinking more about our estate plan. We need to update our wills — it's been almost two years since the last revision.

Sarah Mitchell: That's a great point. I'd recommend we schedule a meeting with your estate attorney to review the current documents. There have been some changes in estate tax law that could affect your planning. Also, we should review the beneficiary designations on all your retirement accounts to make sure everything is consistent with your wishes.

Robert Henderson: Yes, and Margaret has been wanting to formalize the charitable giving plan we discussed last time.

Margaret Henderson: Right. We'd like to set up a donor-advised fund with an initial contribution of about $100,000. We want to support education initiatives and the local community foundation.

Sarah Mitchell: I think that's a wonderful idea. A donor-advised fund will give you an immediate tax deduction while allowing you to recommend grants over time. I'll prepare the paperwork for a Schwab Charitable account. We should also discuss whether to contribute cash or appreciated securities — donating appreciated stock could provide additional tax benefits by avoiding capital gains.

Robert Henderson: That sounds like a good strategy. We should probably transfer some of the Apple shares since they have significant unrealized gains.

Sarah Mitchell: Excellent thinking. Let me also bring up a few other items. Your risk tolerance questionnaire is due for renewal — it expires next month. I'd like to schedule a time for both of you to complete the updated assessment. Also, your Investment Policy Statement is up for annual review. I'll prepare a draft with any recommended changes and send it over for your review.

Margaret Henderson: Of course. And Sarah, we've been thinking about long-term care insurance. We don't currently have any coverage and we're wondering if we should look into it given our ages.

Sarah Mitchell: That's a very prudent consideration. At your current ages and health status, there are some hybrid life insurance and long-term care products that could work well. I'll connect you with our insurance specialist, David Kim, who can provide some options and quotes. We should schedule that conversation within the next two weeks.

Robert Henderson: One more thing — our grandson is starting college next fall. We set up that 529 plan a few years ago. How is it looking?

Sarah Mitchell: The 529 plan has grown to about $85,000. Given that he'll be starting withdrawals next year, I'd recommend we shift the allocation to a more conservative mix — probably 70% bonds and 30% equity — to protect against any market downturn before he needs the funds. We should make that change within the next month.

Margaret Henderson: That all sounds very thorough, Sarah. Thank you for being so detailed.

Sarah Mitchell: Of course. Let me summarize the action items from today. First, I'll begin the portfolio rebalancing to reduce technology concentration. Second, I'll prepare the donor-advised fund paperwork. Third, we need to schedule the estate attorney meeting. Fourth, I'll send over the risk tolerance questionnaires and updated IPS. Fifth, I'll have David Kim reach out about long-term care options. And sixth, we'll adjust the 529 plan allocation. Does that capture everything?

Robert Henderson: Yes, that's very comprehensive. When should we expect to hear back on these items?

Sarah Mitchell: I'll have the DAF paperwork and the rebalancing proposal ready within a week. The IPS and risk questionnaire will go out tomorrow. I'll coordinate with David Kim and your estate attorney this week as well. Let's plan to touch base again in about three weeks to review progress.

Margaret Henderson: Perfect. Thank you Sarah, as always.

Sarah Mitchell: Thank you both. It's always a pleasure. Have a wonderful day.`;

export function resolveValue(data: any, path: string): any {
  const keys = path.split('.');
  let val: any = data;
  for (const k of keys) {
    if (val == null) return undefined;
    val = val[k];
  }
  return val;
}

export function formatValue(val: any, path: string): string {
  if (val == null) return '';
  if (typeof val === 'number') {
    if (path.toLowerCase().includes('aum') || path.toLowerCase().includes('value')) {
      return val >= 1_000_000 ? `$${(val / 1_000_000).toFixed(2)}M` : val >= 1_000 ? `$${(val / 1_000).toFixed(0)}K` : `$${val.toFixed(0)}`;
    }
    if (path.toLowerCase().includes('pct') || path.toLowerCase().includes('weight') || path.toLowerCase().includes('return')) {
      return `${val.toFixed(2)}%`;
    }
  }
  return String(val);
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderDiagnosticTemplate(template: string, data: any): string {
  let result = template;

  result = result.replace(/\{\{#each\s+([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, arrPath, itemTemplate) => {
    const arr = resolveValue(data, arrPath);
    if (!Array.isArray(arr)) return '';
    return arr.map((item: any) => {
      return itemTemplate.replace(/\{\{([\w.]+)\}\}/g, (_: string, itemPath: string) => {
        const v = resolveValue(item, itemPath);
        return escapeHtml(formatValue(v, itemPath));
      });
    }).join('');
  });

  result = result.replace(/\{\{#list\s+([\w.]+)\}\}([\s\S]*?)\{\{\/list\}\}/g, (_, arrPath, itemTemplate) => {
    const arr = resolveValue(data, arrPath);
    if (!Array.isArray(arr)) return '';
    return arr.map((item: any) => {
      return itemTemplate.replace(/\{\{this\}\}/g, escapeHtml(String(item)));
    }).join('');
  });

  result = result.replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
    const val = resolveValue(data, path);
    return escapeHtml(formatValue(val, path));
  });

  return result;
}

export function getReachableCompletedSteps(steps: any[]): any[] {
  const hasIds = steps.some((s: any) => s.id);
  if (!hasIds) return steps;
  const incomingIds = new Set<string>();
  for (const st of steps) {
    for (const targetId of Object.values(st.connections || {})) {
      incomingIds.add(targetId as string);
    }
  }
  const roots = steps.filter((s: any) => !incomingIds.has(s.id));
  if (roots.length === 0) return steps;
  const reachable: any[] = [];
  const visited = new Set<string>();
  const queue = roots.map((r: any) => r.id);
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const step = steps.find((s: any) => s.id === id);
    if (!step) continue;
    reachable.push(step);
    if (step.completed && step.connections) {
      if (step.outputType === "choice" && step.response) {
        const nextId = step.connections[step.response];
        if (nextId) queue.push(nextId);
      } else {
        const nextId = step.connections["next"];
        if (nextId) queue.push(nextId);
      }
    }
  }
  return reachable;
}

export async function sendWorkflowNotifications(
  clientId: string,
  workflowName: string,
  action: string,
  updatedBy: string,
): Promise<{ notifiedNames: string[]; notifiedEmails: string[] }> {
  const members = await storage.getClientTeamMembers(clientId);
  const client = await storage.getClient(clientId);
  const clientName = client ? `${client.firstName} ${client.lastName}` : "Unknown Client";
  const advisor = client ? await storage.getAdvisor(client.advisorId) : null;

  const recipients: { name: string; email: string }[] = [];

  for (const member of members) {
    recipients.push({ name: member.associate.name, email: member.associate.email });
  }

  if (advisor) {
    const isAdvisorUpdater = updatedBy === advisor.name;
    if (!isAdvisorUpdater) {
      recipients.push({ name: advisor.name, email: advisor.email });
    }
  }

  const filtered = recipients.filter(r => r.name !== updatedBy);

  for (const r of filtered) {
    logger.info({ to: r.email, workflowName, clientName, action, updatedBy }, "Email notification sent");
  }

  return {
    notifiedNames: filtered.map(r => r.name),
    notifiedEmails: filtered.map(r => r.email),
  };
}

export function getStandardChecklist(clientId: string) {
  return [
    { clientId, category: "Identity & KYC", documentName: "Government-Issued Photo ID", description: "Driver's license or passport copy for identity verification", required: true, sortOrder: 1 },
    { clientId, category: "Identity & KYC", documentName: "Social Security Verification", description: "SSN card or W-9 form for tax identification", required: true, sortOrder: 2 },
    { clientId, category: "Identity & KYC", documentName: "Proof of Address", description: "Utility bill or bank statement showing current address", required: true, sortOrder: 3 },
    { clientId, category: "Financial Statements", documentName: "Bank Account Statements", description: "Recent statements from checking and savings accounts (last 3 months)", required: true, sortOrder: 10 },
    { clientId, category: "Financial Statements", documentName: "Brokerage Account Statements", description: "Current brokerage/investment account statements", required: true, sortOrder: 11 },
    { clientId, category: "Financial Statements", documentName: "Retirement Account Statements", description: "401(k), IRA, Roth IRA, pension statements", required: true, sortOrder: 12 },
    { clientId, category: "Financial Statements", documentName: "Mortgage/Loan Statements", description: "Current mortgage, auto loan, student loan, or other debt statements", required: false, sortOrder: 13 },
    { clientId, category: "Financial Statements", documentName: "Credit Card Statements", description: "Recent credit card statements showing balances", required: false, sortOrder: 14 },
    { clientId, category: "Tax Documents", documentName: "Federal Tax Returns (Last 2 Years)", description: "Complete federal tax returns including all schedules", required: true, sortOrder: 20 },
    { clientId, category: "Tax Documents", documentName: "State Tax Returns (Last 2 Years)", description: "State income tax returns", required: true, sortOrder: 21 },
    { clientId, category: "Tax Documents", documentName: "W-2 / 1099 Forms", description: "Current year income documentation from all sources", required: true, sortOrder: 22 },
    { clientId, category: "Tax Documents", documentName: "K-1 Forms", description: "Partnership or S-Corp income forms, if applicable", required: false, sortOrder: 23 },
    { clientId, category: "Insurance", documentName: "Life Insurance Policies", description: "All life insurance policy declarations and beneficiary information", required: true, sortOrder: 30 },
    { clientId, category: "Insurance", documentName: "Health Insurance Coverage", description: "Current health insurance plan details", required: false, sortOrder: 31 },
    { clientId, category: "Insurance", documentName: "Disability Insurance", description: "Short-term and long-term disability coverage details", required: false, sortOrder: 32 },
    { clientId, category: "Insurance", documentName: "Long-Term Care Insurance", description: "LTC policy details, if applicable", required: false, sortOrder: 33 },
    { clientId, category: "Insurance", documentName: "Property & Casualty Insurance", description: "Homeowners, auto, umbrella policy declarations", required: false, sortOrder: 34 },
    { clientId, category: "Estate Planning", documentName: "Will / Last Testament", description: "Current signed will or testament", required: true, sortOrder: 40 },
    { clientId, category: "Estate Planning", documentName: "Trust Documents", description: "Revocable or irrevocable trust agreements", required: false, sortOrder: 41 },
    { clientId, category: "Estate Planning", documentName: "Power of Attorney", description: "Financial and healthcare power of attorney documents", required: true, sortOrder: 42 },
    { clientId, category: "Estate Planning", documentName: "Healthcare Directive", description: "Living will or advance healthcare directive", required: true, sortOrder: 43 },
    { clientId, category: "Estate Planning", documentName: "Beneficiary Designations", description: "Current beneficiary forms for all accounts and policies", required: true, sortOrder: 44 },
    { clientId, category: "Employment & Income", documentName: "Current Pay Stubs", description: "Recent pay stubs (last 2-3 months)", required: true, sortOrder: 50 },
    { clientId, category: "Employment & Income", documentName: "Employee Benefits Summary", description: "Employer benefits package details (401k match, stock options, etc.)", required: false, sortOrder: 51 },
    { clientId, category: "Employment & Income", documentName: "Stock Option/RSU Agreements", description: "Equity compensation agreements and vesting schedules", required: false, sortOrder: 52 },
    { clientId, category: "Employment & Income", documentName: "Business Financials", description: "Profit & loss, balance sheet for business owners", required: false, sortOrder: 53 },
    { clientId, category: "Planning & Suitability", documentName: "Risk Tolerance Questionnaire", description: "Completed risk assessment questionnaire", required: true, sortOrder: 60 },
    { clientId, category: "Planning & Suitability", documentName: "Investment Policy Statement", description: "Signed IPS outlining investment objectives and constraints", required: true, sortOrder: 61 },
    { clientId, category: "Planning & Suitability", documentName: "Financial Goals Worksheet", description: "Documented short-term and long-term financial goals", required: true, sortOrder: 62 },
    { clientId, category: "Planning & Suitability", documentName: "Client Advisory Agreement", description: "Signed advisory/engagement agreement", required: true, sortOrder: 63 },
  ];
}
