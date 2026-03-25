import type {
  V33DataFreshness,
  V33DriftAlert,
  V33GoalProgress,
  V33ComplianceFlag,
  V33SummaryDecision,
  V33ComplianceMoment,
  V33SentimentAnalysis,
  V33SummaryActionItem,
  V33TalkingPoint,
  V33ActionItem,
  V33EmailActionItem,
  DataFreshnessStatus,
  DriftStatus,
  GoalTrackStatus,
  ComplianceSeverity,
  ConversationPhase,
  ActionOwner,
  DeadlineType,
  ActionStatus,
  PlanningDomain,
  SentimentLevel,
  MeetingType,
  EmailFormat,
  DecisionStatus,
} from "./types";

export function parseMeetingType(raw: string): MeetingType {
  const normalized = raw.toLowerCase().replace(/[\s-]+/g, "_");
  const valid: MeetingType[] = [
    "annual_review", "discovery", "problem_solving", "life_event",
    "retirement_transition", "rebalancing", "general",
  ];
  return valid.includes(normalized as MeetingType) ? (normalized as MeetingType) : "general";
}

export function parseDataFreshness(content: string): V33DataFreshness {
  const check = (label: string): DataFreshnessStatus => {
    const pattern = new RegExp(`${label}[^\\n]*?(CRITICAL_STALE|critical_stale|🚨)`, "i");
    if (pattern.test(content)) return "critical_stale";
    const stalePattern = new RegExp(`${label}[^\\n]*?(STALE|stale|⚠️)`, "i");
    if (stalePattern.test(content)) return "stale";
    return "fresh";
  };
  const confMatch = content.match(/confidence[^:]*:\s*(\d)/i);
  return {
    holdings: check("holding"),
    goals: check("goal"),
    lifeEvents: check("life.?event"),
    confidenceScore: confMatch ? Math.min(5, Math.max(1, parseInt(confMatch[1]))) : 3,
  };
}

export function parseDriftAlerts(content: string): V33DriftAlert[] {
  const alerts: V33DriftAlert[] = [];
  const driftSection = content.match(/drift[^]*?(?=###|$)/i)?.[0] || "";
  const lines = driftSection.split("\n");
  for (const line of lines) {
    const match = line.match(/([A-Za-z\s]+)[:|]\s*([\d.]+)%.*?(in.?tolerance|warning|urgent|rebalance)/i);
    if (match) {
      const statusRaw = match[3].toLowerCase();
      let status: DriftStatus = "in_tolerance";
      if (statusRaw.includes("urgent") || statusRaw.includes("rebalance")) status = "rebalance_urgent";
      else if (statusRaw.includes("warning")) status = "drift_warning";
      alerts.push({
        assetClass: match[1].trim(),
        driftPct: parseFloat(match[2]),
        status,
        recommendation: line.trim(),
      });
    }
  }
  return alerts;
}

export function parseGoalProgress(content: string): V33GoalProgress[] {
  const goals: V33GoalProgress[] = [];
  const goalSection = content.match(/goal[^]*?(?=###|$)/i)?.[0] || "";
  const lines = goalSection.split("\n");
  for (const line of lines) {
    const match = line.match(/([^|:]+)[:|]\s*([\d.]+)%.*?(ahead|on.?track|at.?risk)/i);
    if (match) {
      const statusRaw = match[3].toLowerCase().replace(/\s+/g, "_");
      let onTrackStatus: GoalTrackStatus = "on_track";
      if (statusRaw.includes("ahead")) onTrackStatus = "ahead";
      else if (statusRaw.includes("risk")) onTrackStatus = "at_risk";
      goals.push({
        goalName: match[1].trim(),
        progressPct: parseFloat(match[2]),
        onTrackStatus,
        gapAmount: null,
        monthsRemaining: null,
      });
    }
  }
  return goals;
}

export function parseComplianceFlags(content: string): V33ComplianceFlag[] {
  const flags: V33ComplianceFlag[] = [];
  const compSection = content.match(/compliance[^]*?(?=###\s|$)/i)?.[0] || "";
  const lines = compSection.split("\n");
  for (const line of lines) {
    if (line.includes("CRITICAL") || line.includes("🚨")) {
      flags.push({ flagType: extractFlagType(line), severity: "critical", actionRequired: line.trim() });
    } else if (line.includes("WARNING") || line.includes("⚠️")) {
      flags.push({ flagType: extractFlagType(line), severity: "warning", actionRequired: line.trim() });
    } else if (line.match(/info|note|✓/i) && line.includes(":")) {
      flags.push({ flagType: extractFlagType(line), severity: "info", actionRequired: line.trim() });
    }
  }
  return flags;
}

function extractFlagType(line: string): string {
  const types = ["suitability", "kyc", "beneficiary", "disclosure", "rmd", "regulatory"];
  for (const t of types) {
    if (line.toLowerCase().includes(t)) return t;
  }
  return "general";
}

export function countTalkingPoints(content: string): number {
  const matches = content.match(/^\d+\.\s/gm);
  return matches ? matches.length : 0;
}

export function parseDecisions(content: string): V33SummaryDecision[] {
  const decisions: V33SummaryDecision[] = [];
  const decisionSection = content.match(/decision[^]*?(?=##\s|$)/i)?.[0] || "";
  const blocks = decisionSection.split(/###\s+Decision\s+\d+/i).slice(1);
  blocks.forEach((block, i) => {
    const statusMatch = block.match(/status[:\s]*(AGREED|TENTATIVE|PROPOSED_UNCONFIRMED|unconfirmed)/i);
    let status: DecisionStatus = "PROPOSED_UNCONFIRMED";
    if (statusMatch) {
      const raw = statusMatch[1].toUpperCase();
      if (raw === "AGREED") status = "AGREED";
      else if (raw === "TENTATIVE") status = "TENTATIVE";
    }
    const whatMatch = block.match(/what[:\s]*([^\n]+)/i);
    const whyMatch = block.match(/why[:\s]*([^\n]+)/i);
    const quoteMatch = block.match(/evidence[^:]*:[:\s]*"([^"]+)"/i);
    decisions.push({
      decisionId: `D_${String(i + 1).padStart(3, "0")}`,
      decision: whatMatch?.[1]?.trim() || block.split("\n").find(l => l.trim())?.trim() || `Decision ${i + 1}`,
      decisionStatus: status,
      rationale: whyMatch?.[1]?.trim() || "",
      evidenceQuote: quoteMatch?.[1] || null,
    });
  });
  return decisions;
}

export function parseComplianceMoments(content: string): V33ComplianceMoment[] {
  const moments: V33ComplianceMoment[] = [];
  const section = content.match(/compliance.?critical[^]*?(?=##\s|$)/i)?.[0] || "";
  const rows = section.split("\n").filter(l => l.includes("|") && !l.includes("---"));
  for (const row of rows.slice(1)) {
    const cols = row.split("|").map(c => c.trim()).filter(Boolean);
    if (cols.length >= 3) {
      moments.push({
        momentType: cols[0] || "general",
        quote: cols.length > 2 ? cols[2] || null : null,
        clientUnderstandingConfirmed: row.includes("✓") || row.toLowerCase().includes("confirmed"),
        followUpAction: cols.length > 4 ? cols[4] || null : null,
      });
    }
  }
  return moments;
}

export function parseSentimentAnalysis(content: string): V33SentimentAnalysis {
  const section = content.match(/sentiment[^]*?(?=##\s|$)/i)?.[0] || "";
  const overallMatch = section.match(/overall[^:]*:\s*(positive|neutral|anxious|frustrated)/i);
  let overallSentiment: SentimentLevel = "neutral";
  if (overallMatch) overallSentiment = overallMatch[1].toLowerCase() as SentimentLevel;
  const topicSentiments: V33SentimentAnalysis["topicSentiments"] = [];
  const topicLines = section.split("\n").filter(l => l.match(/^\s*-\s*\w+.*?:/));
  for (const line of topicLines) {
    const match = line.match(/-\s*([^:]+):\s*(positive|neutral|anxious|frustrated)/i);
    if (match) {
      topicSentiments.push({
        topic: match[1].trim(),
        sentiment: match[2].toLowerCase() as SentimentLevel,
        evidence: line.match(/"([^"]+)"/)?.[1] || "",
      });
    }
  }
  const anxietyLines = section.match(/anxiety[^:]*:[^\n]*/gi) || [];
  const anxietyTriggers = anxietyLines.map(l => l.replace(/anxiety[^:]*:\s*/i, "").trim()).filter(Boolean);
  return { overallSentiment, topicSentiments, anxietyTriggers };
}

export function parseSummaryActionItems(content: string): V33SummaryActionItem[] {
  const items: V33SummaryActionItem[] = [];
  const section = content.match(/action.?item[^]*?(?=##\s(?!#)|$)/i)?.[0] || "";
  const rows = section.split("\n").filter(l => l.includes("|") && !l.includes("---") && !l.match(/^\s*\|?\s*ID/i));
  for (const row of rows) {
    const cols = row.split("|").map(c => c.trim()).filter(Boolean);
    if (cols.length >= 4) {
      const ownerRaw = (cols[2] || "advisor").toLowerCase();
      let owner: ActionOwner = "advisor";
      if (ownerRaw.includes("client")) owner = "client";
      else if (ownerRaw.includes("operation")) owner = "operations";
      else if (ownerRaw.includes("compliance")) owner = "compliance";
      items.push({
        actionId: cols[0] || `A_${items.length + 1}`,
        description: cols[1] || "",
        owner,
        deadline: cols[3] || null,
        priority: parseInt(cols[4]) || 3,
        complianceReviewRequired: row.toLowerCase().includes("compliance") || row.includes("Yes"),
      });
    }
  }
  return items;
}

export function parseTalkingPoints(content: string): V33TalkingPoint[] {
  const points: V33TalkingPoint[] = [];
  const pointBlocks = content.split(/####?\s+(?:Opening\s+)?(?:Core\s+)?(?:Transition\s+)?(?:Closing\s+)?Point\s+/i).slice(1);
  let seq = 0;
  for (const block of pointBlocks) {
    seq++;
    let phase: ConversationPhase = "core";
    if (block.match(/opening/i) || seq <= 2) phase = "opening";
    else if (block.match(/transition/i)) phase = "transition";
    else if (block.match(/closing/i)) phase = "closing";
    const pointMatch = block.match(/\*\*Point:\*\*\s*([^\n]+)/i);
    const toneMatch = block.match(/tone[:\s]*([^\n,]+)/i);
    const detailMatch = block.match(/detail[^:]*:\s*(high|medium|summary)/i);
    const complexityMatch = block.match(/complexity[:\s]*(high|medium|low)/i);
    const objections: V33TalkingPoint["anticipatedObjections"] = [];
    const objMatches = block.matchAll(/if client (?:says|asks)[:\s]*"([^"]+)"[^"]*respond[^"]*"([^"]+)"/gi);
    for (const m of objMatches) {
      objections.push({ objection: m[1], response: m[2] });
    }
    points.push({
      pointId: `TP_${String(seq).padStart(3, "0")}`,
      sequence: seq,
      conversationPhase: phase,
      topicCategory: extractTopicCategory(block),
      priority: Math.min(5, Math.ceil(seq / 2)),
      pointStatement: pointMatch?.[1]?.trim() || block.split("\n").find(l => l.trim())?.trim() || "",
      supportingData: extractSupportingData(block),
      deliveryGuidance: {
        tone: toneMatch?.[1]?.trim() || "collaborative",
        detailLevel: (detailMatch?.[1]?.toLowerCase() || "medium") as "high" | "medium" | "summary",
        complexity: (complexityMatch?.[1]?.toLowerCase() || "medium") as "high" | "medium" | "low",
      },
      anticipatedObjections: objections,
    });
  }
  return points;
}

function extractTopicCategory(block: string): string {
  const categories = [
    "portfolio_performance", "goal_progress", "allocation", "risk",
    "retirement", "tax", "estate", "insurance", "cash_flow", "life_event",
  ];
  const lower = block.toLowerCase();
  for (const cat of categories) {
    if (lower.includes(cat.replace("_", " ")) || lower.includes(cat)) return cat;
  }
  return "general";
}

function extractSupportingData(block: string): Array<{ label: string; value: string }> {
  const data: Array<{ label: string; value: string }> = [];
  const lines = block.split("\n").filter(l => l.match(/^\s*-\s*.+:/));
  for (const line of lines.slice(0, 5)) {
    const match = line.match(/-\s*([^:]+):\s*(.+)/);
    if (match) data.push({ label: match[1].trim(), value: match[2].trim() });
  }
  return data;
}

export function parseConversationFlow(content: string): V33TalkingPoint["deliveryGuidance"] & {
  totalDurationMinutes: number;
  openingMinutes: number;
  coreMinutes: number;
  transitionMinutes: number;
  closingMinutes: number;
} {
  const totalMatch = content.match(/total.*?(\d+)\s*minute/i);
  const openMatch = content.match(/opening.*?(\d+)\s*(?:minute|-)/i);
  const coreMatch = content.match(/core.*?(\d+)\s*(?:minute|-)/i);
  const transMatch = content.match(/transition.*?(\d+)\s*(?:minute|-)/i);
  const closeMatch = content.match(/closing.*?(\d+)\s*(?:minute|-)/i);
  const total = totalMatch ? parseInt(totalMatch[1]) : 40;
  return {
    totalDurationMinutes: total,
    openingMinutes: openMatch ? parseInt(openMatch[1]) : Math.round(total * 0.12),
    coreMinutes: coreMatch ? parseInt(coreMatch[1]) : Math.round(total * 0.62),
    transitionMinutes: transMatch ? parseInt(transMatch[1]) : Math.round(total * 0.13),
    closingMinutes: closeMatch ? parseInt(closeMatch[1]) : Math.round(total * 0.13),
    tone: "collaborative",
    detailLevel: "medium" as const,
    complexity: "medium" as const,
  };
}

export function parseExtractedActions(content: string): V33ActionItem[] {
  const actions: V33ActionItem[] = [];
  const actionBlocks = content.split(/###\s+Action\s+\d+/i).slice(1);
  actionBlocks.forEach((block, i) => {
    const descMatch = block.match(/description[:\s]*([^\n]+)/i);
    const domainMatch = block.match(/planning.?domain[:\s]*([^\n]+)/i);
    const ownerMatch = block.match(/owner[:\s]*(advisor|client|operations|compliance)/i);
    const deadlineMatch = block.match(/deadline[:\s]*([^\n(]+)/i);
    const deadlineTypeMatch = block.match(/deadline.?type[:\s]*(explicit|regulatory|market.?window|contextual|default)/i);
    const priorityMatch = block.match(/priority[:\s]*(\d)/i);
    const complianceMatch = block.match(/compliance.?flag[:\s]*(yes|true)/i);
    const flagTypeMatch = block.match(/flag.?type[:\s]*([^\n|]+)/i);
    const statusMatch = block.match(/status[:\s]*(pending|in.?progress|on.?track|at.?risk|completed|blocked)/i);
    const quoteMatch = block.match(/evidence[^"]*"([^"]+)"/i);
    const criteriaMatch = block.match(/acceptance[^:]*:\s*([^\n]+)/i);
    const blockingMatch = block.match(/blocks[:\s]*([^\n]+)/i);
    const requiresMatch = block.match(/requires[^:]*from[:\s]*([^\n]+)/i);
    const relatedMatch = block.match(/related[^:]*:\s*([^\n]+)/i);
    const daysMatch = block.match(/days.?until[^:]*:\s*(\d+)/i);
    let owner: ActionOwner = "advisor";
    if (ownerMatch) {
      const raw = ownerMatch[1].toLowerCase();
      if (raw.includes("client")) owner = "client";
      else if (raw.includes("operation")) owner = "operations";
      else if (raw.includes("compliance")) owner = "compliance";
    }
    let deadlineType: DeadlineType = "contextual";
    if (deadlineTypeMatch) {
      deadlineType = deadlineTypeMatch[1].toLowerCase().replace(/\s+/g, "_") as DeadlineType;
    }
    let status: ActionStatus = "pending";
    if (statusMatch) {
      status = statusMatch[1].toLowerCase().replace(/\s+/g, "_") as ActionStatus;
    }
    const parseDomain = (raw: string): PlanningDomain => {
      const normalized = raw.toLowerCase().replace(/[\s/]+/g, "_");
      const map: Record<string, PlanningDomain> = {
        investment: "investment", tax: "tax", estate: "estate",
        insurance: "insurance", retirement: "retirement_income", retirement_income: "retirement_income",
        risk: "risk_protection", risk_protection: "risk_protection",
        cash_flow: "cash_flow", cash: "cash_flow", budgeting: "cash_flow",
        estate_administration: "estate_administration", administration: "estate_administration",
        goal: "goal_planning", goal_planning: "goal_planning",
        administrative: "administrative_compliance", compliance: "administrative_compliance",
        administrative_compliance: "administrative_compliance",
      };
      for (const [key, val] of Object.entries(map)) {
        if (normalized.includes(key)) return val;
      }
      return "administrative_compliance";
    };

    actions.push({
      actionId: `A_${String(i + 1).padStart(3, "0")}`,
      sequence: i + 1,
      description: descMatch?.[1]?.trim() || block.split("\n").find(l => l.trim())?.trim() || `Action ${i + 1}`,
      detailedDescription: block.trim().substring(0, 500),
      planningDomain: domainMatch ? parseDomain(domainMatch[1].trim()) : "administrative_compliance",
      owner,
      deadline: deadlineMatch?.[1]?.trim() || null,
      deadlineType,
      daysUntilDeadline: daysMatch ? parseInt(daysMatch[1]) : null,
      priorityScore: priorityMatch ? parseInt(priorityMatch[1]) : 3,
      complianceFlag: !!complianceMatch,
      complianceFlagType: flagTypeMatch?.[1]?.trim() || null,
      status,
      dependencies: {
        blockingDependencies: blockingMatch ? blockingMatch[1].split(",").map(s => s.trim()).filter(Boolean) : [],
        informationDependencies: requiresMatch ? requiresMatch[1].split(",").map(s => s.trim()).filter(Boolean) : [],
        relatedActions: relatedMatch ? relatedMatch[1].split(",").map(s => s.trim()).filter(Boolean) : [],
      },
      evidenceQuote: quoteMatch?.[1] || null,
      acceptanceCriteria: criteriaMatch?.[1]?.trim() || "",
    });
  });
  return actions;
}

export function parseOwnerWorkload(_content: string, actions: V33ActionItem[]): {
  advisor: { total: number; dueWithin7Days: number; dueWithin30Days: number };
  client: { total: number; dueWithin7Days: number; dueWithin30Days: number };
  operations: { total: number; dueWithin7Days: number; dueWithin30Days: number };
  compliance: { total: number; dueWithin7Days: number; dueWithin30Days: number };
} {
  const workload = {
    advisor: { total: 0, dueWithin7Days: 0, dueWithin30Days: 0 },
    client: { total: 0, dueWithin7Days: 0, dueWithin30Days: 0 },
    operations: { total: 0, dueWithin7Days: 0, dueWithin30Days: 0 },
    compliance: { total: 0, dueWithin7Days: 0, dueWithin30Days: 0 },
  };
  for (const action of actions) {
    workload[action.owner].total++;
    if (action.daysUntilDeadline !== null) {
      if (action.daysUntilDeadline <= 7) workload[action.owner].dueWithin7Days++;
      if (action.daysUntilDeadline <= 30) workload[action.owner].dueWithin30Days++;
    }
  }
  return workload;
}

export function parseEmailActionItems(content: string): V33EmailActionItem[] {
  const items: V33EmailActionItem[] = [];
  const section = content.match(/action.?item[^]*?(?=##\s|$)/i)?.[0] || "";
  const rows = section.split("\n").filter(l => l.includes("|") && !l.includes("---") && !l.match(/^\s*\|?\s*(What|Action|Item)/i));
  for (const row of rows) {
    const cols = row.split("|").map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      items.push({
        action: cols[0],
        deadline: cols.length > 1 ? cols[1] : null,
        responsibleParty: row.toLowerCase().includes("client") ? "client" : "advisor",
        plainLanguageInstruction: cols.length > 2 ? cols[2] : cols[0],
      });
    }
  }
  return items;
}

export function parseSubjectLine(content: string): string {
  const match = content.match(/subject[:\s]*(.+)/i);
  return match?.[1]?.trim() || "Meeting Follow-Up";
}

export function parseEmailFormat(content: string): EmailFormat {
  if (content.match(/urgent|action.?needed|immediately/i)) return "urgent";
  if (content.match(/great meeting|nice talking|enjoyed/i)) return "casual";
  if (content.match(/emotional|support|difficult time/i)) return "emotional_support";
  return "formal";
}

export function parseComplianceReview(content: string): {
  forwardLookingStatementsFlagged: number;
  guaranteesFlagged: number;
  requiredDisclaimersIncluded: string[];
  complianceStatus: "passed" | "requires_review" | "rewrite_required";
} {
  const disclaimers: string[] = [];
  if (content.match(/past performance/i)) disclaimers.push("past_performance");
  if (content.match(/not (tax|legal) advice/i)) disclaimers.push("tax_advice");
  if (content.match(/risk.*loss|loss.*principal/i)) disclaimers.push("risk_disclosure");
  if (content.match(/fiduciary/i)) disclaimers.push("fiduciary_commitment");
  const forwardLooking = (content.match(/will (return|earn|grow|generate|produce)\b/gi) || []).length;
  const guarantees = (content.match(/guarante|certain|assured|definitely will/gi) || []).length;
  let status: "passed" | "requires_review" | "rewrite_required" = "passed";
  if (guarantees > 0) status = "rewrite_required";
  else if (forwardLooking > 2) status = "requires_review";
  return { forwardLookingStatementsFlagged: forwardLooking, guaranteesFlagged: guarantees, requiredDisclaimersIncluded: disclaimers, complianceStatus: status };
}
