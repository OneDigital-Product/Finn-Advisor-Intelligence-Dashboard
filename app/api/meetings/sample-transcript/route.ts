import { NextResponse } from "next/server";
import { getSession } from "@lib/session";
import { logger } from "@server/lib/logger";

const SAMPLE_TRANSCRIPT = `Sarah Mitchell: Good morning Robert, Margaret. Thank you both for coming in today. How have you been?

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

export async function GET(request: Request) {
  try {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  return new Response(SAMPLE_TRANSCRIPT, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": "attachment; filename=sample_meeting_transcript.txt",
    },
  });
} catch (err) {
    logger.error({ err }, "[meetings/sample-transcript] GET failed");
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
