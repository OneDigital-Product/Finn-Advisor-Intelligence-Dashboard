// =============================================================================
// JSON RENDER SCHEMAS — AI Structured Output Contracts
// =============================================================================
//
// SOURCE: Torin Taylor, Weekly Product & Technical Sync, Mar 12 2026, 19:41
//   "The JSON render package is critically important and is what is also
//    used in here. So we can define via a JSON schema what exactly we want
//    to come back from the AI consistently."
//
// SOURCE: Torin Taylor, Weekly Product & Technical Sync, Mar 12 2026, 19:41
//   "Plan to — any app that we use is going to use that heavily."
//
// HOW THIS WORKS:
//   1. You define a TypeScript interface (the "schema")
//   2. You convert it to a JSON schema string for the AI prompt
//   3. The @od-oneapp/ai-platform package sends the prompt + schema to the AI
//   4. The AI returns JSON conforming EXACTLY to the schema
//   5. Your React component renders the typed result — no parsing, no guessing
//
// WHEN TO USE:
//   - Portfolio risk analysis (AI analyzes holdings vs targets)
//   - Meeting transcript analysis (AI extracts action items from transcript)
//   - Client engagement scoring (AI scores engagement from activity data)
//   - Wealth diagnostic reports (AI generates comprehensive analysis)
//   - Any time you need the AI to return structured, predictable data
//
// THESE SCHEMAS ARE NOT YET CONNECTED TO THE AI PLATFORM PACKAGE.
// They are ready for Phase 3 when Torin walks you through @od-oneapp/ai-platform.
// Today, the mock data in mock-data-master.ts simulates what these would return.
// =============================================================================


// =============================================================================
// SCHEMA 1: Portfolio Risk Analysis
// =============================================================================
// WHEN USED: Advisor clicks "Analyze Risk" on Portfolio page
// INPUT: Client's holdings, allocation, targets from Orion
// OUTPUT: Structured risk assessment with scored factors and actions
// =============================================================================

export interface PortfolioRiskResult {
  riskScore: number;                    // 0-100, overall portfolio risk score
  riskLevel: "low" | "moderate" | "elevated" | "high" | "critical";
  factors: {
    factor: string;                     // "Equity overweight +13%"
    severity: "low" | "medium" | "high";
    category: "concentration" | "drift" | "volatility" | "liquidity" | "compliance";
  }[];
  actionItems: {
    action: string;                     // "Rebalance joint brokerage — sell $552K VTI"
    priority: "critical" | "high" | "medium" | "low";
    deadline: string;                   // "Within 2 weeks"
    estimatedImpact: string;            // "Reduces equity overweight from 78% to 65%"
    accountsAffected: string[];         // ["acc-001", "acc-005"]
  }[];
  recommendation: string;               // 1-2 sentence summary recommendation
  urgency: "low" | "medium" | "high";
}

export const portfolioRiskSchema = {
  name: "Portfolio Risk Analysis",
  description: "Analyzes portfolio risk, drift, and concentration for a household",
  jsonSchema: {
    type: "object",
    properties: {
      riskScore: { type: "number", minimum: 0, maximum: 100 },
      riskLevel: { type: "string", enum: ["low", "moderate", "elevated", "high", "critical"] },
      factors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            factor: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high"] },
            category: { type: "string", enum: ["concentration", "drift", "volatility", "liquidity", "compliance"] },
          },
          required: ["factor", "severity", "category"],
        },
      },
      actionItems: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string" },
            priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
            deadline: { type: "string" },
            estimatedImpact: { type: "string" },
            accountsAffected: { type: "array", items: { type: "string" } },
          },
          required: ["action", "priority", "deadline", "estimatedImpact"],
        },
      },
      recommendation: { type: "string" },
      urgency: { type: "string", enum: ["low", "medium", "high"] },
    },
    required: ["riskScore", "riskLevel", "factors", "actionItems", "recommendation", "urgency"],
  },

  // Sample prompt that would be sent with this schema
  samplePrompt: `Analyze portfolio risk for the Chen Household:
- Total AUM: $4,250,000
- Current allocation: U.S. Large Cap 35% (target 30%), International 12% (target 15%),
  Fixed Income 18% (target 22%), Cash 8% (target 3%), Alternatives 4% (target 3%)
- Holdings: VTI 17.5%, VOO 17.5%, VO 6%, VB 5%, VXUS 12%, VWO 5%, BND 9%,
  VTIP 4.5%, VCSH 4.5%, VNQ 4%, IAU 3%, QAI 4%, Cash 8%
- Risk tolerance: Moderately Aggressive
- Key concern: RSU vesting cliff in November adds $280K more equity exposure
- Margaret age 55, David age 56, target retirement 65 and 64 respectively`,
};


// =============================================================================
// SCHEMA 2: Meeting Transcript Analysis
// =============================================================================
// WHEN USED: After a client meeting, advisor uploads/pastes transcript
// INPUT: Raw meeting transcript text
// OUTPUT: Structured analysis with action items, sentiment, compliance flags
// =============================================================================

export interface TranscriptAnalysisResult {
  title: string;                        // "Henderson Quarterly Review — Q1 2026"
  type: "Annual Review" | "Quarterly Review" | "Ad Hoc" | "Onboarding" | "Tax Planning" | "Estate Review";
  clientSentiment: "positive" | "neutral" | "negative" | "mixed";
  summary: string;                      // 2-3 paragraph summary
  keyTopics: string[];                  // ["Portfolio rebalancing", "DAF setup", "Estate plan update"]
  actionItems: {
    description: string;                // "Prepare DAF paperwork for $50K contribution"
    owner: string;                      // "Sarah Mitchell"
    priority: "high" | "medium" | "low";
    dueDate: string | null;             // "2026-03-25" or null
    category: "planning" | "compliance" | "administrative" | "follow-up";
  }[];
  followUpNeeded: boolean;
  nextMeetingDate: string | null;       // "2026-04-07"
  complianceNotes: string[];            // ["Risk questionnaire renewal discussed", "IPS update required"]
  clientRequests: string[];             // Explicit things the client asked for
}

export const transcriptAnalysisSchema = {
  name: "Meeting Transcript Analysis",
  description: "Extracts structured data from client meeting transcripts",
  jsonSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      type: { type: "string", enum: ["Annual Review", "Quarterly Review", "Ad Hoc", "Onboarding", "Tax Planning", "Estate Review"] },
      clientSentiment: { type: "string", enum: ["positive", "neutral", "negative", "mixed"] },
      summary: { type: "string" },
      keyTopics: { type: "array", items: { type: "string" } },
      actionItems: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            owner: { type: "string" },
            priority: { type: "string", enum: ["high", "medium", "low"] },
            dueDate: { type: ["string", "null"] },
            category: { type: "string", enum: ["planning", "compliance", "administrative", "follow-up"] },
          },
          required: ["description", "owner", "priority"],
        },
      },
      followUpNeeded: { type: "boolean" },
      nextMeetingDate: { type: ["string", "null"] },
      complianceNotes: { type: "array", items: { type: "string" } },
      clientRequests: { type: "array", items: { type: "string" } },
    },
    required: ["title", "type", "clientSentiment", "summary", "keyTopics", "actionItems", "followUpNeeded", "complianceNotes"],
  },

  // Uses sampleTranscript from mock-data-master.ts
  samplePromptPrefix: "Analyze this wealth management client meeting transcript and extract structured data:",
};


// =============================================================================
// SCHEMA 3: Client Engagement Scoring
// =============================================================================
// WHEN USED: Nightly batch job or on-demand per client
// INPUT: Client activity data, meeting history, portal usage
// OUTPUT: Composite engagement score with churn risk and recommendations
// =============================================================================

export interface EngagementAnalysisResult {
  clientName: string;
  compositeScore: number;               // 0-100
  frequency: number;                    // 0-100 — how often they interact
  recency: number;                      // 0-100 — how recently they interacted
  diversity: number;                    // 0-100 — variety of interaction types
  trend: "improving" | "declining" | "stable";
  riskOfChurn: "low" | "moderate" | "high" | "critical";
  signals: {
    type: string;                       // "Life Event", "Engagement Drop", etc.
    description: string;
    confidence: number;                 // 0.0 - 1.0
  }[];
  recommendedActions: {
    action: string;
    priority: "critical" | "high" | "medium" | "low";
    category: "outreach" | "planning" | "opportunity" | "compliance";
  }[];
  reasoning: string;                    // Why this score and these recommendations
}

export const engagementScoringSchema = {
  name: "Client Engagement Scoring",
  description: "Scores client engagement and generates recommended actions",
  jsonSchema: {
    type: "object",
    properties: {
      clientName: { type: "string" },
      compositeScore: { type: "number", minimum: 0, maximum: 100 },
      frequency: { type: "number", minimum: 0, maximum: 100 },
      recency: { type: "number", minimum: 0, maximum: 100 },
      diversity: { type: "number", minimum: 0, maximum: 100 },
      trend: { type: "string", enum: ["improving", "declining", "stable"] },
      riskOfChurn: { type: "string", enum: ["low", "moderate", "high", "critical"] },
      signals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            description: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["type", "description", "confidence"],
        },
      },
      recommendedActions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string" },
            priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
            category: { type: "string", enum: ["outreach", "planning", "opportunity", "compliance"] },
          },
          required: ["action", "priority", "category"],
        },
      },
      reasoning: { type: "string" },
    },
    required: ["clientName", "compositeScore", "frequency", "recency", "diversity", "trend", "riskOfChurn", "signals", "recommendedActions", "reasoning"],
  },

  samplePrompt: `Score engagement for Harold Brinkley:
- Tier A client, AUM $1.89M
- Last contact: 127 days ago
- Last 6 months: 0 meetings attended, 1 email opened, 0 portal logins
- Spouse mentioned retirement in email thread with assistant (detected by NLP)
- Risk profile review overdue by 3 months
- Previously active client — attended all quarterly reviews until Q3 2025
- Insurance coverage gap identified — term policy expires in 18 months`,
};


// =============================================================================
// SCHEMA 4: Comprehensive Wealth Diagnostic
// =============================================================================
// WHEN USED: On-demand full diagnostic for a household
// INPUT: All client data — profile, accounts, holdings, performance, life events
// OUTPUT: Full diagnostic report with scoring across multiple dimensions
// =============================================================================

export interface WealthDiagnosticResult {
  summary: {
    clientName: string;
    householdAUM: number;
    overallHealthScore: number;         // 0-100
    topPriority: string;
  };
  portfolioAnalysis: {
    diversificationScore: number;       // 0-100
    concentrationRisks: string[];
    rebalancingNeeded: boolean;
    driftSummary: string;
  };
  performanceAnalysis: {
    vsExpectation: "above" | "meeting" | "below";
    alphaGenerated: number;
    keyInsight: string;
  };
  riskAssessment: {
    overallRisk: "low" | "moderate" | "elevated" | "high";
    suitabilityAligned: boolean;
    complianceGaps: string[];
  };
  recommendations: {
    action: string;
    priority: "critical" | "high" | "medium" | "low";
    category: string;
    estimatedBenefit: string;
  }[];
}

export const wealthDiagnosticSchema = {
  name: "Comprehensive Wealth Diagnostic",
  description: "Full household wealth diagnostic with multi-dimensional scoring",
  // This maps to diagnosticConfig.analysisPrompt in mock-data-master.ts
  // The HTML report template is in diagnosticConfig.htmlTemplate
};


// =============================================================================
// EXPORT ALL SCHEMAS
// =============================================================================

export const JSON_RENDER_SCHEMAS = {
  portfolioRisk: portfolioRiskSchema,
  transcriptAnalysis: transcriptAnalysisSchema,
  engagementScoring: engagementScoringSchema,
  wealthDiagnostic: wealthDiagnosticSchema,
} as const;
