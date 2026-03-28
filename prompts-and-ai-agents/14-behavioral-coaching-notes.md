# 14-behavioral-coaching-notes.md
## Function: generateBehavioralCoachingNotes

**Purpose:** Generate evidence-based, situation-specific coaching notes enabling advisors to manage client emotions effectively during meetings and transitions.

**Fiduciary Principle:** Client emotional resilience and confidence in the strategy reduces emotionally-driven errors and improves strategy adherence.

---

## 1. CLIENT BEHAVIORAL PROFILE INTEGRATION

### 1.1 Historical Behavioral Data

**Required Inputs (Retrieved from KB):**
- Previous sentiment scores (trend analysis)
- Detected bias inventory (which biases has this client demonstrated)
- Anxiety history (baseline, recent peaks)
- Communication style profile (analytical, driver, amiable, expressive)
- Prior intervention responses (what worked before)

**Profile Construction:**
```
Client Behavioral Profile = {
  baseline_anxiety: 3.2 (average across last 6 months),
  anxiety_trajectory: "stable" | "improving" | "deteriorating",
  primary_biases: ["Loss Aversion", "Anchoring"],
  communication_style: "analytical",
  prior_trigger_events: ["market corrections", "performance discussions"],
  effective_interventions: ["historical data", "goal-reinforcement"],
  ineffective_interventions: ["generic reassurance", "technical complexity"],
  decision_velocity: "slow" (takes time, seeks consensus),
  risk_tolerance_actual_vs_stated: "stated 70/30, acts 50/50"
}
```

**Application:** Tailor coaching language and evidence type to known client preferences.

---

## 2. SITUATION-SPECIFIC COACHING

### 2.1 Situation Classification

| Situation Type | Triggers | Client Emotional State | Advisor Challenge |
|---|---|---|---|
| **Market Downturn** | Significant negative return in short timeframe | Anxiety spike, loss focus | Reframe losses within long-term context |
| **Performance Miss** | Strategy underperformance vs. stated goal | Disappointment, doubt | Validate goal, recalibrate if needed |
| **Life Event** | Marriage, inheritance, job change | Disorientation, opportunity seeking | Integrate new financial reality |
| **Goal Shortfall** | Projection shows insufficient accumulation | Worry, urgency to "catch up" | Realistic options assessment |
| **Tax Surprise** | Unexpected tax bill or distribution | Frustration, feel-cheated | Education + proactive planning |
| **Advisor Review** | Annual/semi-annual strategy check | Mixed confidence (depends on performance) | Reinforce value, address concerns |
| **Rebalancing Opportunity** | Portfolio drift or strategic allocation shift | Resistance (status quo bias) | Show cost of inaction vs. benefit |
| **Fee Discussion** | Performance discussion coupled with fee question | Price sensitivity, value justification | Tie fees to outcomes delivered |

---

## 3. EVIDENCE-BASED INTERVENTION STRATEGIES

### 3.1 Cognitive Reframing with Research Citations

#### Strategy: Historical Precedent Framing

**When to Use:** Recency bias, panic during market downturns

**Technique:**
```
Reference relevant historical analogue with EXACT DATA:
"You're concerned about [recent event]. Similar situations happened in [year].
Here's what actually occurred: [specific data point].
Recovery timeframe: [specific data].
Impact on a [your_allocation] portfolio: [specific projection]."
```

**Research Foundation:** Kahneman & Tversky (anchoring to recent events); Statman (behavioral finance context)

**Example:**
> "You're worried about inflation reducing returns. That's a valid concern. In the 1970s, when inflation averaged 9%, stocks still returned 7% annually. A 60/40 portfolio recovered within [timeframe]. Your current allocation is designed for this."

#### Strategy: Goal-Based Anchoring

**When to Use:** Loss aversion, overconfidence, performance fixation

**Technique:**
```
Separate from market noise and return to STATED GOAL:
"Let's step back from market returns for a moment.
Your goal is [specific goal with numbers].
Your current plan shows [projection vs. goal].
Current market performance affects the timeline/amount, but not your ability to reach [goal]."
```

**Research Foundation:** Kahneman (mental accounting); Thaler (goal-based planning)

**Example:**
> "You're focused on the 2% underperformance this quarter. Let me refocus us: your goal is $1.2M at retirement. Our projection shows $1.35M. You're actually ahead. Market noise affects the timing, not the outcome."

#### Strategy: Visualization Exercises

**When to Use:** Anxiety during volatility, commitment to strategy

**Technique:**
```
Guided mental exercise:
1. "Imagine we're sitting here in 2031. The markets recovered as they always do."
2. "You held your strategy. Your portfolio is now [projection]."
3. "How does that feel compared to the panic decision you're considering?"
4. "That's why we stick to the plan."
```

**Research Foundation:** Ariely (present bias reduction); Grant (mental simulation)

**Example:**
> "Let's fast-forward 5 years. Markets recovered—they always do. Your portfolio is at [amount]. You're on track for retirement. Now imagine if you'd panic-sold here. You'd be down [amount]. Which version do you prefer?"

#### Strategy: Variability Context (Volatility is Normal)

**When to Use:** First experience with volatility, loss aversion spike

**Technique:**
```
Normalize short-term volatility within long-term pattern:
"In [timeframe], your allocation experienced [number] corrections of [magnitude].
Average recovery time: [timeframe].
Your risk tolerance of [X]% accounts for this.
This is the plan working as designed."
```

**Research Foundation:** Kahneman & Tversky (probability weighting); expected value theory

**Example:**
> "A 60/40 portfolio experiences 3-4 corrections of 10%+ every decade. You're seeing #2 this cycle. The plan accounts for this. Recovery typically takes 6-18 months."

#### Strategy: Social Proof (Appropriate Peer Context)

**When to Use:** Herding bias, FOMO, underconfidence

**Technique:**
```
Provide AGGREGATED, ANONYMIZED peer data:
"Among clients in your situation (similar age, goals, risk profile),
those who held course through similar volatility:
- Reached goals on time [%]
- Those who panic-sold: only [%] recovered to plan."
```

**Research Foundation:** Cialdini (social proof); Sunstein (informational cascades)

**CAUTION:** Never identify specific clients. Never encourage comparison to better-performing peer (only normalize to relevant cohort).

**Example:**
> "Among analytical clients with your risk profile and timeline, 91% who stayed the course through 2015-2016 volatility reached their retirement goals. Those who sold recovered only 78% of the value they lost."

---

## 4. SCRIPT-READY TALKING POINTS

### 4.1 By Situation Type & Bias

#### For Market Downturn + Loss Aversion

**Opening (Validation):**
> "I know what you're seeing—portfolio is down [X]%. That's unsettling. I'm glad you reached out."

**Reframe (Historical):**
> "We've prepared for this. Corrections happen. In fact, since we started together, you've experienced [number] of them. Average depth: [X]%. Average recovery: [timeframe]. Your portfolio is built for this."

**Data Point:**
> "Your allocation experienced this same kind of move in [year] and [year]. In each case, recovery was complete within [timeframe], and you were back to growth shortly after."

**Commitment:**
> "Nothing in our strategy is changing unless the fundamentals changed. Your goals haven't changed. Your timeline hasn't changed. Your ability to ride this out hasn't changed."

**Close:**
> "Here's what I need from you: No changes for the next [timeframe]. We'll talk again in [period]. Can I count on that?"

#### For Performance Miss + Doubt/Disappointment

**Opening (Acknowledgment):**
> "I know the performance against our [benchmark] target isn't what we wanted. Let's talk through what happened."

**Context:**
> "Year-to-date our strategy is [performance]. The benchmark is [performance]. The reason for the gap: [specific attribution]. This is [expected/unexpected] given our positioning."

**Broader View:**
> "Over [longer period], we've delivered [performance] against [benchmark]. That's [number]% better/worse than expected, driven by [factors]. This year is below average, but we're still tracking to [long-term goal]."

**Assessment:**
> "Two questions: First, does the strategy still match your goals? If yes, one-year performance shouldn't change the plan. Second, is there a real reason to change—something about your life or the fundamental economic outlook—or is this just performance anxiety?"

**Reframe:**
> "If this performance makes sense given your situation, let's stay the course. If you genuinely want different returns, we're making a different risk choice. What would that cost you?"

#### For Life Event + Disorientation

**Opening (Acknowledge the Significance):**
> "Congratulations on [life event]. That's significant. We need to integrate this into your plan."

**Recenter:**
> "Let's separate the emotion of the event from the financial impact. What's changed for your goals, timeline, risk tolerance, and cash flow?"

**Quantify:**
> "This inheritance of [amount] affects your plan in [specific ways]: First, your accumulation phase is [shortened/extended]. Second, your risk capacity is [increased/decreased]. Third, your tax situation is [different]."

**Options:**
> "Given the new situation, we have [number] paths forward: [Option A - specific allocation/strategy], [Option B], [Option C]. Here's the trade-off for each..."

**Commit:**
> "Let's get everything updated in the next [timeframe] and then monitor quarterly rather than [previous frequency]."

#### For Goal Shortfall + Urgency/Worry

**Opening (Be Direct):**
> "I want to address something directly. Our current projection shows a shortfall of [amount] against your stated goal of [goal]."

**Attribution:**
> "The drivers: [specific factors]. We're not on track because [reason], not because of poor execution."

**Options (Realistic Assessment):**
> "We have [number] levers to pull:
> 1. Increase savings: Move from [X] to [Y]/month adds [amount]
> 2. Extend timeline: Retire at [age] instead of [age] solves the gap
> 3. Adjust goal: A lifestyle of [X] instead of [Y] is achievable on plan
> 4. Accept risk: Move to [allocation] adds [X] but increases volatility
> 5. Combination: [Example combining options]
>
> Which combination feels realistic to you?"

**Avoid "Catch Up" Mentality:**
> "I'll be direct: taking more risk to 'catch up' usually backfires. Concentrated positions and aggressive allocations do well 70% of the time—but the 30% when they don't can hurt worse. Let's solve this with realistic math, not hope."

#### For Rebalancing + Status Quo Bias

**Opening (Acknowledge the Inertia):**
> "I know rebalancing feels unnecessary—'if it's not broken, don't fix it.' I get it. But here's what's actually happening..."

**Show the Drag:**
> "Your allocation has drifted from [original] to [current]. That means you're now [more/less] stock-exposed than we planned. Over [timeframe], that drift will cost you [amount] in [missed gains / extra volatility]."

**Clarify the Trade-off:**
> "Rebalancing is annoying: it means selling winners and buying losers. But that's how we systematically buy low and sell high. Avoiding the rebalance means staying with the drift—which means giving up [amount]."

**Quantify the Impact:**
> "If markets continue as modeled, this rebalance adds [X]% to your 10-year return. If we skip it, we get [Y]%. That's [difference] on your portfolio."

**Permission to Proceed:**
> "I'm recommending we rebalance. This protects your long-term return. Can I move forward with [specific actions]?"

---

## 5. ANTI-PATTERNS: WHAT NOT TO SAY

### 5.1 By Bias Type

| Bias | What NOT to Say | Why It Fails | What TO Say Instead |
|------|-----------------|-------------|----------------------|
| **Loss Aversion** | "You're being irrational" | Invalidates emotion, triggers defensiveness | "Your concern about losses is valid. Let's look at the historical data." |
| **Loss Aversion** | "Markets always go up long-term" | Dismisses risk, sounds tone-deaf | "Markets do recover, and historically [specifics]. Your timeline supports this." |
| **Recency Bias** | "Don't worry, it always comes back" | Minimizes current pain, lacks specificity | "Similar situations happened in [year]. Recovery took [timeframe]." |
| **Recency Bias** | "This time it's different" | Confirms catastrophizing | "This is similar to [historical event]. Here's how it differs: [specific comparison]." |
| **Anchoring** | "Forget that target, it's not realistic" | Disrespects client's attachment | "I understand that target matters. Let's see if we can hit it with [adjustment]." |
| **Status Quo Bias** | "We should change this" | Activates resistance | "Staying put here costs us [amount]. Changing adds [value]. Here's why the change makes sense..." |
| **Herding Bias** | "Everyone's doing this, so..." | Validates the herding behavior | "Your situation is unique. Based on YOUR goals and timeline, here's what makes sense." |
| **Overconfidence** | "You might be right, but we can't predict" | Seems wishy-washy, weak | "That's a strong conviction. Markets are unpredictable. We plan for conservative assumptions and benefit when they beat assumptions." |
| **Confirmation Bias** | "But what about this research that contradicts..." | Triggers defensive resistance | "I appreciate that study. Let's also look at [contrary evidence] and build a framework that accounts for both." |

---

## 6. ESCALATION PROTOCOL

### 6.1 When to Escalate

**IMMEDIATE ESCALATION (Contact Senior Advisor Now):**
- Client threatens liquidation or advisor switch
- Panic-driven decision pressure ("we need to move within 24 hours")
- Threat to go "all cash" or take extreme action
- Client experiencing severe emotional distress (crying, angry outbursts)
- Family disagreement on strategy causing relationship strain

**ESCALATION WITHIN 24 HOURS:**
- Anxiety level 8+
- Major life event requiring significant reallocation
- Client persistently rejects multiple reframing attempts
- Significant underperformance vs. expectations
- Fee/value questions with implied "shop around" risk

**PROACTIVE OUTREACH (No Escalation Needed):**
- Anxiety level 5-7 with deteriorating trend
- Moderate life event with planning implications
- Scheduled review meeting with identified behavioral risk
- Historical recurrence of anxiety around specific triggers

### 6.2 Escalation Talking Points for Senior Advisor

**Frame for Advisee:**
> "You've raised some important concerns. I want to bring [Senior Advisor Name] in because they can offer an additional perspective that might help. This isn't because anything is wrong—it's because you deserve our best thinking."

**For Senior Advisor (Briefing):**
> "Client behavioral profile: [bias inventory]. Current anxiety level: [score]. Situation: [brief description]. I've attempted [intervention strategies]. Response: [what worked, what didn't]. Recommend: [escalation approach]."

---

## 7. MEETING STRUCTURE RECOMMENDATIONS

### 7.1 Agenda Ordering by Emotional Load

**Principle:** Sequence difficult topics strategically based on emotional resilience during the meeting.

#### For High-Anxiety Client Meeting

**Segment 1 (Rapport Building - First 10%):**
- Express genuine care and understanding
- Acknowledge recent stress
- Confirm meeting agenda
- Set expectation: "We'll address your concerns head-on"

**Segment 2 (Wins & Validation - Next 20%):**
- Lead with what IS working
- Show progress toward goals where it exists
- Acknowledge valid concerns
- "Before we address the tough stuff, I want you to know..."

**Segment 3 (Context & Data - Middle 40%):**
- Provide historical comparisons
- Show modeling and projections
- Quantify risk in historical terms
- "Here's what our research shows..."

**Segment 4 (Difficult Decisions - Next 20%):**
- Address performance misses or shortfalls directly
- Present options clearly
- Let client decide
- "You need to know [X] because it affects [your decision]"

**Segment 5 (Commitment & Next Steps - Final 10%):**
- Confirm decision/strategy
- Set next touchpoint
- Express confidence in plan
- "Here's what happens next..."

#### For Performance-Miss Meeting

**Start with Context:** Global markets, sector rotation, why we underperformed [specific reason]

**Acknowledge:** This isn't what we wanted, and I understand the frustration

**Zoom Out:** Longer-period performance, where we stand vs. goals

**Reassess:** Does the strategy still fit, or do we need changes?

**Commit:** Here's what we're doing next [specific action]

#### For Rebalancing Meeting

**Lead with Drift Data:** Show allocation change in chart form

**Show Opportunity Cost:** What we're missing by not rebalancing

**Explain the Mechanism:** Why we rebalance (buy low, sell high)

**Quantify the Impact:** This rebalance is worth [X] to your plan

**Get Permission:** Can I execute this?

---

## 8. FOLLOW-UP STRATEGY & REINFORCEMENT

### 8.1 Post-Meeting Plan

**Immediate (Within 1 Week):**
- Send written summary of decisions made and next steps
- Reiterate confidence in strategy
- Reference data points discussed
- Confirm any action items

**Short-term (2-4 Weeks):**
- Proactive check-in call: "Wanted to see how you're feeling about our discussion"
- Share relevant market commentary reinforcing discussed themes
- If volatility spike: "Remember our discussion about corrections—this is expected"

**Reinforcement (Quarterly):**
- Portfolio review showing progress toward goals
- Historical performance context
- Reaffirm strategy alignment with life changes

**Success Metric:** Client expresses reduced anxiety, confirms understanding of strategy rationale, agrees to timeline for next review.

---

## 9. KNOWLEDGE BASE RETRIEVAL TRIGGERS

**Retrieve BEFORE Generating Coaching Notes:**

1. **Client Behavioral Profile**
   - KB Query: "Historical sentiment scores, detected biases, anxiety trends, communication style for [Client ID]"

2. **Life Stage Context**
   - KB Query: "Client life stage persona, typical anxieties and biases for [age/stage], peer context"

3. **Intervention Evidence**
   - KB Query: "Behavioral coaching strategies, research citations, effectiveness data by bias type"

4. **Market Context**
   - KB Query: "Recent market events, historical precedent for current volatility, recovery timeframes"

5. **Portfolio Performance**
   - KB Query: "Attribution analysis, benchmark comparison, long-term vs. short-term performance"

6. **Goal & Plan Status**
   - KB Query: "Client goals, current projection, gap analysis, sensitivity scenarios"

---

## 10. OUTPUT SPECIFICATION

### 10.1 Advisor-Facing Coaching Playbook

```json
{
  "coaching_context": {
    "client_id": "CLI-12345",
    "meeting_type": "market_downturn_check_in",
    "meeting_date": "2026-03-16",
    "identified_risks": ["loss_aversion", "recency_bias"],
    "current_anxiety_level": 7,
    "baseline_anxiety": 3.2,
    "trend": "deteriorating"
  },

  "situation_assessment": {
    "trigger": "15% market correction in last 30 days",
    "client_statement": "[Client quote expressing concern]",
    "emotional_state": "anxious, fixated on losses",
    "risk_level": "medium (client at risk of defensive portfolio change)"
  },

  "behavioral_profile_reminder": {
    "communication_style": "analytical",
    "prior_effective_interventions": ["historical data", "quantified goals"],
    "prior_ineffective_interventions": ["generic reassurance"],
    "decision_velocity": "slow (takes time to process)",
    "trigger_history": "[Previous spikes around performance discussions]"
  },

  "coaching_playbook": {
    "primary_strategy": "historical_precedent_framing + goal_anchoring",
    "situation_specific_scripts": [
      {
        "moment": "opening",
        "script": "[Validation script from 4.1]"
      },
      {
        "moment": "reframe",
        "script": "[Historical precedent script from 4.1]"
      },
      {
        "moment": "data_support",
        "data_point": "Similar 15% correction in 2015. Recovery to previous high: 14 months. Portfolio impact: [specific projection]."
      },
      {
        "moment": "commitment",
        "script": "[Commitment script from 4.1]"
      }
    ],
    "anti_patterns": [
      "Do NOT minimize concern with 'markets always recover'",
      "Do NOT suggest portfolio change without deep reassessment",
      "Do NOT use jargon—stick to clear numbers and stories"
    ]
  },

  "meeting_structure": {
    "opening_segment": {
      "duration_minutes": 5,
      "objective": "Build rapport, acknowledge concern",
      "talking_points": ["I'm glad you called", "Your concern is valid", "Let's talk through this"]
    },
    "context_segment": {
      "duration_minutes": 15,
      "objective": "Provide historical context and data",
      "talking_points": [
        "Corrections happen [frequency]",
        "Your allocation is built for this",
        "Here's what happened in [similar year]"
      ]
    },
    "reassessment_segment": {
      "duration_minutes": 10,
      "objective": "Confirm strategy still fits",
      "talking_points": [
        "Does your goal still stand?",
        "Has your timeline changed?",
        "Is there a fundamental reason to change?"
      ]
    },
    "commitment_segment": {
      "duration_minutes": 5,
      "objective": "Secure agreement to stay course",
      "talking_points": ["Here's what we're doing next", "Can I count on you to hold?"]
    }
  },

  "follow_up_plan": {
    "immediate_action": "Send written summary of discussion + historical data chart",
    "timeline": "within 1 week",
    "short_term_touchpoint": "Phone call in 2 weeks: 'How are you feeling about our discussion?'",
    "reinforcement_cadence": "Quarterly review with goal progress data",
    "success_metric": "Client confirms understanding of strategy rationale and agrees to hold course"
  },

  "escalation_flag": {
    "escalate": false,
    "reason": null,
    "recommendation": "Proceed with primary advisor coaching"
  }
}
```

### 10.2 Client-Facing Reinforcement Message (Email Template)

Subject: Following Up on Our Conversation About Markets

> Dear [Client Name],
>
> Thank you for taking the time to discuss your concerns about the recent market correction. I appreciate your directness, and I want to reinforce our conversation in writing.
>
> **Here's what we discussed:**
> Your concern about the 15% market correction is valid. Your portfolio is designed to handle volatility at this level. In fact, similar corrections happened in [years]. Here's what actually happened then: [specific data].
>
> **Why we're staying the course:**
> Your goals haven't changed. Your timeline hasn't changed. Your ability to ride out volatility hasn't changed. One-year performance shouldn't override a 20-year plan.
>
> **Next steps:**
> - No changes to your portfolio
> - Quarterly check-in on [date] (as scheduled)
> - If something material changes in your life or our economic outlook, we'll talk immediately
>
> I'm confident in our strategy. I hope you feel the same.
>
> Best,
> [Advisor Name]

---

## 11. VALIDATION RULES

1. **Scripts Must Be Situation-Specific:** Generic scripts fail. Customize with client data, actual numbers, relevant history.
2. **Anti-Patterns Prevent Harm:** Ensure coaching does NOT validate the bias or undermine the strategy.
3. **Follow-up Is Non-Negotiable:** Coaching is incomplete without post-meeting reinforcement.
4. **Escalation Threshold is Clear:** Anxiety 9+ or liquidation threat = immediate senior advisor involvement.
5. **Meeting Structure Respects Emotional Load:** Don't bury bad news early; don't leave client hanging at the end.

---

## 12. EXAMPLE COACHING SESSION

**Scenario:** Client calls after market drop, mentions moving to cash

**Coaching Notes Generated:**

Meeting Type: Crisis intervention (panic risk)
Anxiety Level: 9 (escalation threshold)
Detected Biases: Loss aversion (CONFIRMED), Recency bias (CONFIRMED), Herding (LIKELY)
Communication Style: Amiable (seeking reassurance, not confident)

**Immediate Actions:**
1. Senior advisor to call within 2 hours
2. Prepare historical data comparing current drop to 2008, 2015, 2020
3. Pull client's actual goal-on-track data (not just performance)

**Opening Strategy:** Validate emotion, establish safety, buy time
**Data Strategy:** Historical precedent (recovery timeframes), goal status (show they're still on track)
**Commitment Strategy:** 30-day hold on any changes, weekly check-in

**Anti-Pattern Script (AVOID):**
> "Don't worry, markets always recover. You're being emotional. Stay the course."

**Recommended Script:**
> "I hear you. The thought of losing more money is terrifying. I'm glad you called before doing anything. Let me show you something: In 2008, investors who panic-sold lost 50%. Those who held lost 30% but recovered completely by 2011. You have a 25-year horizon—time is your biggest advantage. Let's talk about what 'moving to cash' actually means for your retirement."

