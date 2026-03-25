import { storage } from "../storage";
import { logger } from "../lib/logger";
import { analyzeSentiment, generateBehavioralCoachingNotes } from "../openai";
import type { InsertBehavioralAnalysis } from "@shared/schema";

export interface DeEscalationScript {
  id: string;
  bias: string;
  title: string;
  situation: string;
  script: string;
  evidenceBasis: string;
  tags: string[];
}

const DE_ESCALATION_SCRIPTS: DeEscalationScript[] = [
  {
    id: "loss-aversion-1",
    bias: "Loss Aversion",
    title: "Market Downturn Anxiety",
    situation: "Client wants to sell after significant market decline",
    script: "I understand your concern about the recent decline. Let me show you something important: since 1950, the S&P 500 has experienced declines of 10% or more about once every 1.5 years, yet it has recovered every single time. Your portfolio was designed specifically for moments like these. Let's review how your allocation aligns with your long-term goals and timeline.",
    evidenceBasis: "Kahneman & Tversky (1979) - Prospect Theory; Historical market recovery data",
    tags: ["market-decline", "selling-pressure", "fear"],
  },
  {
    id: "loss-aversion-2",
    bias: "Loss Aversion",
    title: "Portfolio Loss Focus",
    situation: "Client fixates on unrealized losses rather than overall portfolio health",
    script: "I notice you're focused on that particular position. Let me reframe this: your overall portfolio is [performing well/on track]. Individual positions will fluctuate, but what matters is how the entire portfolio works together toward your goals. Let's look at your total return picture and progress toward [specific goal].",
    evidenceBasis: "Thaler (1999) - Mental Accounting; Benartzi & Thaler (1995) - Myopic Loss Aversion",
    tags: ["unrealized-loss", "position-focus", "mental-accounting"],
  },
  {
    id: "recency-bias-1",
    bias: "Recency Bias",
    title: "Chasing Recent Performance",
    situation: "Client wants to shift portfolio based on recent market trends",
    script: "It's natural to be influenced by what's happened recently. However, research shows that last year's top performers are often next year's underperformers. Let me show you the 20-year performance data — it tells a very different story than the last few months. Your diversified approach is designed to capture long-term growth while managing risk.",
    evidenceBasis: "DeBondt & Thaler (1985) - Mean Reversion; Dalbar Studies on investor behavior",
    tags: ["performance-chasing", "trend-following", "short-term"],
  },
  {
    id: "recency-bias-2",
    bias: "Recency Bias",
    title: "News-Driven Anxiety",
    situation: "Client reacts to alarming financial headlines",
    script: "Headlines are designed to get attention, not to guide investment decisions. Let me put this in perspective: if you had sold every time there was alarming news over the past 30 years, you would have missed some of the best recovery days in market history. Missing just the 10 best days in a decade can cut your returns in half. Let's focus on what we can control — your plan.",
    evidenceBasis: "J.P. Morgan Asset Management research on missing best market days; Behavioral gap studies",
    tags: ["media-reaction", "headline-anxiety", "news-cycle"],
  },
  {
    id: "herd-mentality-1",
    bias: "Herd Mentality",
    title: "Following the Crowd",
    situation: "Client wants to do what 'everyone else' is doing",
    script: "I understand the appeal of following what seems popular. But here's the key insight: by the time 'everyone' is doing something, the opportunity has usually passed. Warren Buffett's famous advice to 'be fearful when others are greedy, and greedy when others are fearful' is backed by decades of evidence. Your plan is personalized to your goals, timeline, and risk tolerance — not anyone else's.",
    evidenceBasis: "Banerjee (1992) - Herd Behavior; Bikhchandani et al. (1992) - Informational Cascades",
    tags: ["peer-pressure", "fomo", "crowd-following"],
  },
  {
    id: "overconfidence-1",
    bias: "Overconfidence",
    title: "Excessive Risk Taking",
    situation: "Client wants to concentrate in a 'sure thing' investment",
    script: "I appreciate your conviction, and it's great to be enthusiastic about opportunities. However, even the most successful investors maintain diversification. History is full of 'sure things' that didn't work out — from Enron to certain tech stocks in 2000. Let's discuss how we can capture upside while protecting against the unexpected. Your financial goals are too important to concentrate in a single bet.",
    evidenceBasis: "Barber & Odean (2001) - Overconfidence in Trading; Diversification studies",
    tags: ["concentration-risk", "overconfidence", "high-conviction"],
  },
  {
    id: "anchoring-1",
    bias: "Anchoring",
    title: "Anchored to Purchase Price",
    situation: "Client refuses to sell a losing position because of original cost",
    script: "I understand the instinct to wait until you 'get back to even.' But the market doesn't know what you paid for a position. The key question is: if you had this cash today, would you buy this same investment? If not, it may make sense to redirect those funds to something better aligned with your goals. This could also create a tax benefit through loss harvesting.",
    evidenceBasis: "Tversky & Kahneman (1974) - Anchoring; Disposition Effect (Shefrin & Statman, 1985)",
    tags: ["purchase-price", "break-even", "disposition-effect"],
  },
  {
    id: "status-quo-1",
    bias: "Status Quo Bias",
    title: "Resistance to Rebalancing",
    situation: "Client resists making necessary portfolio changes",
    script: "I understand the comfort of keeping things as they are. However, your portfolio has drifted from its target allocation, which means your risk level has changed from what we originally agreed was right for you. Rebalancing isn't about predicting the market — it's about maintaining the risk-reward profile that matches your goals. Think of it as maintenance, like servicing a car to keep it running well.",
    evidenceBasis: "Samuelson & Zeckhauser (1988) - Status Quo Bias; Rebalancing premium studies",
    tags: ["inertia", "change-resistance", "rebalancing"],
  },
];

export class BehavioralFinanceEngine {
  async analyzeClientCommunication(
    clientId: string,
    advisorId: string,
    communicationText: string,
    sourceType: string,
    sourceId?: string,
    marketContext?: string
  ): Promise<InsertBehavioralAnalysis> {
    const client = await storage.getClient(clientId);
    if (!client) throw new Error("Client not found");

    const result = await analyzeSentiment({
      clientName: `${client.firstName} ${client.lastName}`,
      communicationText,
      sourceType,
      clientInfo: client,
      marketContext,
    });

    const analysis: InsertBehavioralAnalysis = {
      clientId,
      advisorId,
      sentiment: result.sentiment,
      sentimentScore: result.sentimentScore,
      behavioralRiskScore: result.behavioralRiskScore,
      dominantBias: result.dominantBias,
      biasIndicators: result.biasIndicators,
      anxietyLevel: result.anxietyLevel,
      sourceType,
      sourceId: sourceId || null,
      sourceSnippet: communicationText.substring(0, 500),
      coachingNotes: result.coachingNotes,
      deEscalationStrategy: result.deEscalationStrategy,
      marketCondition: marketContext ? "volatile" : "normal",
      metrics: {
        biasCount: result.biasIndicators.length,
        analysisTimestamp: new Date().toISOString(),
      },
    };

    return analysis;
  }

  async analyzeMeetingTranscript(
    meetingId: string,
    advisorId: string
  ): Promise<InsertBehavioralAnalysis | null> {
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting || !meeting.clientId) return null;

    const content = meeting.transcriptRaw || meeting.notes || meeting.transcriptSummary;
    if (!content) return null;

    return this.analyzeClientCommunication(
      meeting.clientId,
      advisorId,
      content,
      "meeting_transcript",
      meetingId
    );
  }

  async getClientBehavioralProfile(clientId: string): Promise<{
    currentRiskScore: number;
    averageSentiment: number;
    anxietyTrend: string;
    dominantBiases: string[];
    analysisCount: number;
    timeline: Array<{
      date: string;
      sentiment: string;
      sentimentScore: number;
      behavioralRiskScore: number;
      anxietyLevel: string;
      sourceType: string;
    }>;
    latestAnalysis: any | null;
  }> {
    const analyses = await storage.getBehavioralAnalysesByClient(clientId);

    if (analyses.length === 0) {
      return {
        currentRiskScore: 0,
        averageSentiment: 50,
        anxietyTrend: "stable",
        dominantBiases: [],
        analysisCount: 0,
        timeline: [],
        latestAnalysis: null,
      };
    }

    const sorted = [...analyses].sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );

    const latest = sorted[0];
    const avgSentiment = Math.round(
      sorted.reduce((sum, a) => sum + a.sentimentScore, 0) / sorted.length
    );

    const biasMap: Record<string, number> = {};
    sorted.forEach((a) => {
      if (a.dominantBias) {
        biasMap[a.dominantBias] = (biasMap[a.dominantBias] || 0) + 1;
      }
    });
    const dominantBiases = Object.entries(biasMap)
      .sort((a, b) => b[1] - a[1])
      .map(([bias]) => bias);

    let anxietyTrend = "stable";
    if (sorted.length >= 3) {
      const recentScores = sorted.slice(0, 3).map((a) => a.behavioralRiskScore);
      const olderScores = sorted.slice(3, 6).map((a) => a.behavioralRiskScore);
      if (olderScores.length > 0) {
        const recentAvg = recentScores.reduce((s, v) => s + v, 0) / recentScores.length;
        const olderAvg = olderScores.reduce((s, v) => s + v, 0) / olderScores.length;
        if (recentAvg > olderAvg + 10) anxietyTrend = "increasing";
        else if (recentAvg < olderAvg - 10) anxietyTrend = "decreasing";
      }
    }

    const timeline = sorted.map((a) => ({
      date: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
      sentiment: a.sentiment,
      sentimentScore: a.sentimentScore,
      behavioralRiskScore: a.behavioralRiskScore,
      anxietyLevel: a.anxietyLevel,
      sourceType: a.sourceType,
    }));

    return {
      currentRiskScore: latest.behavioralRiskScore,
      averageSentiment: avgSentiment,
      anxietyTrend,
      dominantBiases,
      analysisCount: sorted.length,
      timeline,
      latestAnalysis: latest,
    };
  }

  async checkVolatilityAlerts(
    clientId: string,
    advisorId: string
  ): Promise<{
    shouldAlert: boolean;
    alertLevel: string;
    reason: string;
    recommendedAction: string;
  }> {
    const analyses = await storage.getBehavioralAnalysesByClient(clientId);
    const recent = analyses
      .filter((a) => {
        const created = new Date(a.createdAt!);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return created >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    if (recent.length === 0) {
      return {
        shouldAlert: false,
        alertLevel: "none",
        reason: "No recent behavioral data",
        recommendedAction: "Run sentiment analysis on recent communications",
      };
    }

    const avgRisk = recent.reduce((s, a) => s + a.behavioralRiskScore, 0) / recent.length;
    const highAnxietyCount = recent.filter(
      (a) => a.anxietyLevel === "high" || a.anxietyLevel === "critical"
    ).length;
    const latest = recent[0];

    if (latest.anxietyLevel === "critical" || avgRisk > 75) {
      return {
        shouldAlert: true,
        alertLevel: "critical",
        reason: `Client showing critical anxiety levels. Average behavioral risk: ${Math.round(avgRisk)}. ${highAnxietyCount} high-anxiety communications in the last 30 days.`,
        recommendedAction: "Schedule immediate check-in call. Prepare de-escalation talking points focused on long-term plan reaffirmation.",
      };
    }

    if (highAnxietyCount >= 2 || avgRisk > 55) {
      return {
        shouldAlert: true,
        alertLevel: "warning",
        reason: `Elevated anxiety pattern detected. ${highAnxietyCount} high-anxiety communications. Average behavioral risk: ${Math.round(avgRisk)}.`,
        recommendedAction: "Proactive outreach recommended within the week. Prepare data showing historical portfolio resilience.",
      };
    }

    return {
      shouldAlert: false,
      alertLevel: "normal",
      reason: "Client sentiment within normal range",
      recommendedAction: "Continue regular engagement schedule",
    };
  }

  async generateMeetingBehavioralNotes(clientId: string): Promise<string> {
    const client = await storage.getClient(clientId);
    if (!client) return "Client not found.";

    const analyses = await storage.getBehavioralAnalysesByClient(clientId);
    if (analyses.length === 0) {
      return "No behavioral analysis data available for this client. Run sentiment analysis on recent communications to generate coaching notes.";
    }

    const sorted = [...analyses].sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
    const latest = sorted[0];
    const recentSentiments = sorted.slice(0, 10).map((a) => ({
      sentiment: a.sentiment,
      date: a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : "unknown",
      score: a.sentimentScore,
    }));

    return generateBehavioralCoachingNotes({
      clientName: `${client.firstName} ${client.lastName}`,
      anxietyLevel: latest.anxietyLevel,
      dominantBias: latest.dominantBias,
      recentSentiments,
      riskTolerance: client.riskTolerance,
    });
  }

  getDeEscalationScripts(bias?: string, tag?: string): DeEscalationScript[] {
    let scripts = DE_ESCALATION_SCRIPTS;
    if (bias) {
      scripts = scripts.filter((s) => s.bias.toLowerCase() === bias.toLowerCase());
    }
    if (tag) {
      scripts = scripts.filter((s) => s.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase())));
    }
    return scripts;
  }

  getAvailableBiases(): string[] {
    return [...new Set(DE_ESCALATION_SCRIPTS.map((s) => s.bias))];
  }
}
