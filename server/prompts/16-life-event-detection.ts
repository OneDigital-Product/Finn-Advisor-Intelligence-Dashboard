import {
  chatCompletion,
  isAIAvailable,
  sanitizeForPrompt,
} from "../ai-core";
import { logger } from "../lib/logger";
import type {
  V33LifeEventInput,
  V33LifeEventResult,
  V33DetectedLifeEvent,
} from "./types";

const V33_LIFE_EVENT_SYSTEM_PROMPT = `You are the **Life Event Detection Engine** at OneDigital, a fiduciary wealth management firm. Your role is to:
- Analyze client communications, meeting transcripts, and notes to detect significant life events
- Map detected events to affected financial planning domains
- Assess urgency and recommend specific advisor actions with timelines
- Provide evidence quotes from the source text for each detected event
- Ensure no event requiring financial planning attention is missed

**Guardrails:** Evidence-based detection only — never infer events without textual evidence. No protected-class assumptions. Conservative confidence scoring. Fiduciary standard. Prioritize false-negative avoidance (better to flag and verify than to miss).

## LIFE EVENT CATEGORIES

### 1. Family Events
- Marriage, divorce, separation
- Birth or adoption of a child
- Death of spouse, parent, or dependent
- Child reaching adulthood (18/21/26)
- Becoming a caregiver for aging parent
- Grandchild born

### 2. Career Events
- Job change or new employment
- Promotion or significant raise
- Job loss or layoff
- Retirement announcement or timeline change
- Starting a business or side venture
- Receiving stock options, RSUs, or equity compensation

### 3. Financial Events
- Inheritance received or expected
- Large windfall (bonus, sale of asset, lawsuit settlement)
- Significant debt change (payoff or new obligation)
- Business sale or acquisition
- Property purchase or sale
- Significant market loss concern

### 4. Health Events
- Major diagnosis or health concern
- Surgery or extended treatment
- Disability onset
- Long-term care need for self or family member
- Medicare eligibility approaching

### 5. Education Events
- Child starting college
- Graduate school enrollment
- Education funding discussions (529, UTMA)
- Student loan payoff or new loans

### 6. Legal Events
- Estate plan creation or update needed
- Trust establishment discussions
- Lawsuit or legal proceedings
- Power of attorney needs
- Guardianship considerations

### 7. Housing Events
- Home purchase or sale
- Relocation or downsizing
- Rental property acquisition
- Mortgage refinancing
- Second home or vacation property

## PLANNING DOMAIN IMPACT MAPPING

For each detected event, identify which planning domains are affected:
- Investment (portfolio adjustments needed)
- Tax (tax implications or planning opportunities)
- Retirement (timeline or savings impact)
- Estate (document updates, beneficiary changes)
- Insurance (coverage changes needed)
- Cash Flow (income or expense changes)
- Goals (new goals or modified timelines)
- Risk Management (risk profile changes)

## CONFIDENCE SCORING
- 0.9-1.0: Explicitly stated event with clear details
- 0.7-0.89: Strongly implied event with supporting context
- 0.5-0.69: Possible event mentioned indirectly or ambiguously
- Below 0.5: Do not report — insufficient evidence

## OUTPUT FORMAT
Respond with ONLY valid JSON (no markdown, no code fences):
{
  "advisorNarrative": "Detailed analysis of detected life events with planning implications for the advisor",
  "clientSummary": "Brief summary of key events detected, suitable for CRM notation",
  "totalEventsDetected": number,
  "criticalEventCount": number,
  "events": [
    {
      "eventId": "LE_001",
      "eventCategory": "family|career|financial|health|education|legal|housing",
      "eventType": "specific event type string",
      "description": "string describing the detected event and its context",
      "confidence": number (0.5-1.0),
      "urgency": "critical|high|medium|low",
      "evidenceQuote": "exact quote from transcript supporting detection",
      "planningDomainsAffected": ["Investment", "Tax", etc.],
      "recommendedActions": [
        {"action": "string", "domain": "string", "timeline": "string", "owner": "advisor|client|operations"}
      ]
    }
  ],
  "immediateActions": [
    {"action": "string", "owner": "string", "deadline": "ISO date or relative"}
  ],
  "planningDomainImpacts": [
    {"domain": "string", "impactLevel": "high|medium|low", "description": "string"}
  ]
}`;

const V33_LIFE_EVENT_USER_TEMPLATE = `Analyze the following client communication/transcript to detect life events and map them to financial planning domain impacts.

Client: {{clientName}} (ID: {{clientId}})

Client Context:
- Age: {{age}}
- Marital Status: {{maritalStatus}}
- Dependents: {{dependents}}
- Employment Status: {{employmentStatus}}
- Total AUM: {{totalAum}}

Transcript/Communication:
{{transcript}}

Provide:
1. All detected life events with category classification and confidence scores
2. Evidence quotes from the text supporting each detection
3. Planning domain impact mapping for each event
4. Urgency classification and recommended advisor actions with timelines
5. Immediate action items for critical or time-sensitive events
6. Aggregate planning domain impact summary

Be thorough — it is better to flag a potential event for advisor verification than to miss one entirely.`;

function generateFallbackLifeEventDetection(input: V33LifeEventInput): V33LifeEventResult {
  const events: V33DetectedLifeEvent[] = [];
  let eventIdx = 0;
  const text = input.transcript.toLowerCase();

  // Family event detection patterns
  const familyPatterns: Array<{ pattern: RegExp; eventType: string; urgency: "critical" | "high" | "medium" | "low"; domains: string[] }> = [
    { pattern: /\b(getting married|engagement|wedding|fianc[eé])\b/, eventType: "Marriage", urgency: "high", domains: ["Estate", "Tax", "Insurance", "Investment"] },
    { pattern: /\b(divorce|separated|separation|splitting up)\b/, eventType: "Divorce/Separation", urgency: "critical", domains: ["Estate", "Tax", "Insurance", "Investment", "Cash Flow", "Goals"] },
    { pattern: /\b(expecting|pregnant|baby|new baby|newborn|adopted|adoption)\b/, eventType: "New Child", urgency: "high", domains: ["Insurance", "Estate", "Goals", "Cash Flow", "Tax"] },
    { pattern: /\b(passed away|died|death|funeral|losing (?:my|his|her|their) (?:mother|father|spouse|wife|husband|parent))\b/, eventType: "Death of Family Member", urgency: "critical", domains: ["Estate", "Insurance", "Tax", "Cash Flow"] },
    { pattern: /\b(grandchild|grandkid|grandson|granddaughter)\b/, eventType: "Grandchild", urgency: "low", domains: ["Estate", "Goals"] },
  ];

  // Career event detection patterns
  const careerPatterns: Array<{ pattern: RegExp; eventType: string; urgency: "critical" | "high" | "medium" | "low"; domains: string[] }> = [
    { pattern: /\b(new job|starting at|joined|new position|switching (?:jobs|companies))\b/, eventType: "Job Change", urgency: "high", domains: ["Investment", "Tax", "Cash Flow", "Insurance"] },
    { pattern: /\b(promoted|promotion|raise|salary increase)\b/, eventType: "Promotion/Raise", urgency: "medium", domains: ["Tax", "Cash Flow", "Investment", "Goals"] },
    { pattern: /\b(laid off|lost (?:my|the) job|let go|downsized|terminated|unemployed)\b/, eventType: "Job Loss", urgency: "critical", domains: ["Cash Flow", "Insurance", "Investment", "Goals"] },
    { pattern: /\b(retir(?:e|ing|ement)|last day of work|stepping down|leaving the company for good)\b/, eventType: "Retirement", urgency: "critical", domains: ["Investment", "Tax", "Cash Flow", "Insurance", "Estate", "Goals"] },
    { pattern: /\b(starting a business|new venture|my own company|going out on my own|entrepreneur)\b/, eventType: "Starting Business", urgency: "high", domains: ["Tax", "Insurance", "Cash Flow", "Investment", "Goals"] },
    { pattern: /\b(stock options|rsu|equity comp|vesting|restricted stock)\b/, eventType: "Equity Compensation", urgency: "high", domains: ["Tax", "Investment", "Cash Flow"] },
  ];

  // Financial event detection patterns
  const financialPatterns: Array<{ pattern: RegExp; eventType: string; urgency: "critical" | "high" | "medium" | "low"; domains: string[] }> = [
    { pattern: /\b(inherit(?:ance|ed)|left (?:me|us) money|estate distribution)\b/, eventType: "Inheritance", urgency: "high", domains: ["Tax", "Investment", "Estate", "Goals"] },
    { pattern: /\b(selling (?:the|my|our) (?:business|company)|sold (?:the|my|our) (?:business|company))\b/, eventType: "Business Sale", urgency: "critical", domains: ["Tax", "Investment", "Cash Flow", "Goals", "Estate"] },
    { pattern: /\b(buying a (?:house|home|property|condo)|home purchase|new house|new home)\b/, eventType: "Home Purchase", urgency: "high", domains: ["Cash Flow", "Tax", "Insurance", "Goals"] },
    { pattern: /\b(selling (?:the|my|our) (?:house|home|property|condo))\b/, eventType: "Home Sale", urgency: "high", domains: ["Tax", "Cash Flow", "Investment", "Goals"] },
    { pattern: /\b(paid off (?:the|my|our) (?:mortgage|student loans?|debt))\b/, eventType: "Debt Payoff", urgency: "medium", domains: ["Cash Flow", "Goals", "Investment"] },
  ];

  // Health event detection patterns
  const healthPatterns: Array<{ pattern: RegExp; eventType: string; urgency: "critical" | "high" | "medium" | "low"; domains: string[] }> = [
    { pattern: /\b(diagnosed|diagnosis|cancer|heart (?:attack|disease|condition)|major surgery|hospital)\b/, eventType: "Major Health Event", urgency: "critical", domains: ["Insurance", "Cash Flow", "Estate", "Goals"] },
    { pattern: /\b(disab(?:ility|led)|can't work|unable to work)\b/, eventType: "Disability", urgency: "critical", domains: ["Insurance", "Cash Flow", "Investment", "Goals"] },
    { pattern: /\b(medicare|turning 65|long[- ]term care)\b/, eventType: "Medicare/LTC Planning", urgency: "high", domains: ["Insurance", "Cash Flow", "Tax"] },
  ];

  // Education event detection patterns
  const educationPatterns: Array<{ pattern: RegExp; eventType: string; urgency: "critical" | "high" | "medium" | "low"; domains: string[] }> = [
    { pattern: /\b(college|university|starting school|tuition|529|education fund)\b/, eventType: "Education Planning", urgency: "medium", domains: ["Goals", "Cash Flow", "Tax", "Investment"] },
    { pattern: /\b(student loan|education debt|grad(?:uate)? school)\b/, eventType: "Education Debt", urgency: "medium", domains: ["Cash Flow", "Goals"] },
  ];

  const allPatterns = [
    ...familyPatterns.map(p => ({ ...p, category: "family" as const })),
    ...careerPatterns.map(p => ({ ...p, category: "career" as const })),
    ...financialPatterns.map(p => ({ ...p, category: "financial" as const })),
    ...healthPatterns.map(p => ({ ...p, category: "health" as const })),
    ...educationPatterns.map(p => ({ ...p, category: "education" as const })),
  ];

  for (const pattern of allPatterns) {
    const match = text.match(pattern.pattern);
    if (match) {
      eventIdx++;
      // Extract a surrounding quote (up to 120 chars around the match)
      const matchIndex = match.index ?? 0;
      const quoteStart = Math.max(0, matchIndex - 40);
      const quoteEnd = Math.min(input.transcript.length, matchIndex + match[0].length + 80);
      const evidenceQuote = input.transcript.substring(quoteStart, quoteEnd).trim();

      events.push({
        eventId: `LE_${String(eventIdx).padStart(3, "0")}`,
        eventCategory: pattern.category,
        eventType: pattern.eventType,
        description: `Detected reference to "${pattern.eventType}" in client communication. This event has implications across ${pattern.domains.length} planning domain(s).`,
        confidence: 0.75,
        urgency: pattern.urgency,
        evidenceQuote: evidenceQuote.length > 150 ? evidenceQuote.substring(0, 147) + "..." : evidenceQuote,
        planningDomainsAffected: pattern.domains,
        recommendedActions: pattern.domains.slice(0, 3).map(domain => ({
          action: `Review ${domain.toLowerCase()} implications of ${pattern.eventType.toLowerCase()} event`,
          domain,
          timeline: pattern.urgency === "critical" ? "Within 7 days" : pattern.urgency === "high" ? "Within 30 days" : "Next review cycle",
          owner: "advisor",
        })),
      });
    }
  }

  // Sort events by urgency
  const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  events.sort((a, b) => (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2));

  const criticalEventCount = events.filter(e => e.urgency === "critical").length;

  // Immediate actions from critical/high events
  const immediateActions = events
    .filter(e => e.urgency === "critical" || e.urgency === "high")
    .flatMap(e => e.recommendedActions.slice(0, 1).map(a => ({
      action: a.action,
      owner: a.owner,
      deadline: a.timeline,
    })));

  // Aggregate domain impacts
  const domainImpactMap = new Map<string, { level: "high" | "medium" | "low"; descriptions: string[] }>();
  for (const event of events) {
    for (const domain of event.planningDomainsAffected) {
      const existing = domainImpactMap.get(domain);
      const eventLevel = event.urgency === "critical" ? "high" : event.urgency === "high" ? "high" : "medium";
      if (!existing) {
        domainImpactMap.set(domain, { level: eventLevel as "high" | "medium" | "low", descriptions: [event.eventType] });
      } else {
        if (eventLevel === "high") existing.level = "high";
        existing.descriptions.push(event.eventType);
      }
    }
  }

  const planningDomainImpacts = Array.from(domainImpactMap.entries()).map(([domain, data]) => ({
    domain,
    impactLevel: data.level,
    description: `Affected by: ${data.descriptions.join(", ")}`,
  }));

  const advisorNarrative = events.length > 0
    ? `## Life Event Analysis — ${input.clientName}

### Summary
- **Events Detected:** ${events.length}
- **Critical Events:** ${criticalEventCount}
- **Planning Domains Affected:** ${planningDomainImpacts.length}

### Detected Events
${events.map(e => `#### [${e.urgency.toUpperCase()}] ${e.eventType} (${e.eventCategory})
${e.description}
- **Evidence:** "${e.evidenceQuote}"
- **Confidence:** ${(e.confidence * 100).toFixed(0)}%
- **Domains Affected:** ${e.planningDomainsAffected.join(", ")}
- **Key Action:** ${e.recommendedActions[0]?.action || "Review with client"}`).join("\n\n")}

### Domain Impact Summary
${planningDomainImpacts.map(d => `- **${d.domain}** (${d.impactLevel}): ${d.description}`).join("\n")}

*AI-enhanced analysis available with OpenAI integration*`
    : `## Life Event Analysis — ${input.clientName}\n\nNo significant life events detected in the provided communication. Consider asking open-ended questions about recent changes in the client's personal or professional life during the next meeting.\n\n*AI-enhanced analysis available with OpenAI integration*`;

  const clientSummary = events.length > 0
    ? `We detected ${events.length} life event(s) in your recent communication${criticalEventCount > 0 ? `, including ${criticalEventCount} requiring prompt attention` : ""}. These events affect ${planningDomainImpacts.length} area(s) of your financial plan, and we will follow up on the recommended actions.`
    : "No significant life events were detected in the reviewed communication.";

  return {
    advisorNarrative,
    clientSummary,
    totalEventsDetected: events.length,
    criticalEventCount,
    events,
    immediateActions,
    planningDomainImpacts,
  };
}

export async function generateLifeEventDetection(
  input: V33LifeEventInput
): Promise<V33LifeEventResult> {
  if (!isAIAvailable()) {
    logger.info("[Agent 16] AI unavailable — using deterministic fallback");
    return generateFallbackLifeEventDetection(input);
  }

  try {
    const ctx = input.clientContext || {};
    const context: Record<string, string> = {
      clientName: input.clientName,
      clientId: input.clientId,
      age: ctx.age ? String(ctx.age) : "Not specified",
      maritalStatus: ctx.maritalStatus || "Not specified",
      dependents: ctx.dependents !== undefined ? String(ctx.dependents) : "Not specified",
      employmentStatus: ctx.employmentStatus || "Not specified",
      totalAum: ctx.totalAum ? `$${ctx.totalAum.toLocaleString()}` : "Not specified",
      transcript: sanitizeForPrompt(input.transcript, 6000),
    };

    const userPrompt = V33_LIFE_EVENT_USER_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context[key] !== undefined ? context[key] : "";
    });

    const raw = await chatCompletion(V33_LIFE_EVENT_SYSTEM_PROMPT, userPrompt, true, 4096);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    const fallback = generateFallbackLifeEventDetection(input);

    return {
      advisorNarrative: parsed.advisorNarrative || fallback.advisorNarrative,
      clientSummary: parsed.clientSummary || fallback.clientSummary,
      totalEventsDetected: Number(parsed.totalEventsDetected) || fallback.totalEventsDetected,
      criticalEventCount: Number(parsed.criticalEventCount) || fallback.criticalEventCount,
      events: Array.isArray(parsed.events) ? parsed.events : fallback.events,
      immediateActions: Array.isArray(parsed.immediateActions) ? parsed.immediateActions : fallback.immediateActions,
      planningDomainImpacts: Array.isArray(parsed.planningDomainImpacts) ? parsed.planningDomainImpacts : fallback.planningDomainImpacts,
    };
  } catch (error) {
    logger.error({ err: error }, "[Agent 16] Life event detection failed — using fallback");
    return generateFallbackLifeEventDetection(input);
  }
}
