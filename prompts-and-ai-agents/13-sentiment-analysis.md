# 13-sentiment-analysis.md
## Function: analyzeSentiment

**Purpose:** Analyze client communications for emotional indicators, behavioral biases, and anxiety levels using a calculation-first, evidence-based framework.

**Fiduciary Principle:** Understanding client emotional state and behavioral patterns enables more effective coaching and reduces emotionally-driven decision errors.

---

## 1. MULTI-DIMENSIONAL SENTIMENT MODEL

### 1.1 Financial Emotion Taxonomy

| Emotion | Definition | Key Indicators | Language Patterns |
|---------|-----------|-----------------|-------------------|
| **Anxiety** | Fear of loss, uncertainty concern | Heart rate elevation, repetition, urgency language | "What if...", "concerned", "losing", "worried" |
| **Confidence** | Conviction in strategy, positive outlook | Clear questions, future focus, proactive language | "Looking forward to", "excited", "plan to", "growing" |
| **Frustration** | Blocked progress, advisor/market disappointment | Impatience, blame attribution, criticism | "Not moving fast enough", "disappointed", "wasting time" |
| **Confusion** | Lack of understanding, overwhelm | Asking for clarification, false starts, vagueness | "Don't understand", "complicated", "lost me" |
| **Eagerness** | Ready to act, opportunity-seeking | Action pressure, fast speech/typing, specificity | "When can we...", "let's move", "need this done" |
| **Denial** | Avoiding reality, downplaying risk | Minimization, normalization, deflection | "It'll be fine", "doesn't matter", "not my concern" |
| **Grief** | Loss acceptance, major life transition processing | Reflection, acceptance language, moving forward | "Coming to terms with", "accepting", "learning to live with" |

**Mapping Rule:** Client communication may express multiple emotions. Rank by dominance (which emotion appears most frequently and intensely).

---

## 2. BEHAVIORAL BIAS DETECTION FRAMEWORK

### 2.1 Bias Inventory with Evidence Requirements

#### LOSS AVERSION
- **Definition:** Disproportionate fear of losses vs. opportunity for gains
- **Evidence Requirements (MUST have explicit language):**
  - Direct loss fear statement: "I can't stomach losing...", "I couldn't live with a loss of..."
  - Asymmetric gain/loss concern: Describes downside 2+ times vs. upside once
  - Regret focus: "I'd regret if it dropped..."
- **Language Patterns:** "Can't afford to lose", "need guaranteed", "safety first", "hate volatility"
- **Quantification:** Count loss-fear mentions ÷ total financial concerns = Loss Aversion Intensity Score (0.0-1.0)
- **Confidence:** CONFIRMED if 2+ direct statements; LIKELY if 1 direct + asymmetric language

#### RECENCY BIAS
- **Definition:** Overweighting recent events, forgetting history
- **Evidence Requirements:**
  - Disproportionate focus on recent market event (last 90 days mentioned 3+ times in one conversation)
  - Statement attributing current concern to recent event: "Ever since the [recent event], I've been worried..."
  - Failure to reference historical precedent despite mention of similar past event
- **Language Patterns:** "Lately", "recently", "it's different this time", "markets aren't like they used to be"
- **Quantification:** (Recent event mentions ÷ total time period mentions) × 100 = Recency Score (0-100%)
- **Confidence:** CONFIRMED if recent event explicitly tied to current portfolio action; LIKELY if multiple recent mentions

#### ANCHORING
- **Definition:** Over-reliance on specific reference point (price, value, allocation)
- **Evidence Requirements:**
  - Repeated fixation on specific number: "$500K", "60/40 allocation", "10% return target"
  - Justification attempts that reference the anchor multiple times
  - Resistance to alternative anchors: "No, I need it at [original anchor]"
- **Language Patterns:** "I bought at", "our goal was", "I remember when", "target has always been"
- **Quantification:** Number of anchor references ÷ total financial mentions = Anchor Fixation Score (0.0-1.0)
- **Confidence:** CONFIRMED if same number mentioned 5+ times; LIKELY if mentioned 3-4 times with resistance to change

#### CONFIRMATION BIAS
- **Definition:** Selective attention to information supporting existing beliefs
- **Evidence Requirements:**
  - Statement dismissing contradictory information: "I saw that article but I don't believe it"
  - Selective citation: References supporting information but ignores counter-evidence
  - Double-checking question: Asks for reassurance rather than information
- **Language Patterns:** "I already know", "that doesn't apply to me", "I've always", "that won't happen to us"
- **Quantification:** Supporting information cited ÷ (supporting + contradicting) = Confirmation Score (0.0-1.0)
- **Confidence:** CONFIRMED if explicitly rejects contradictory data; LIKELY if only seeks supporting evidence

#### STATUS QUO BIAS
- **Definition:** Preference for current state despite evidence suggesting change
- **Evidence Requirements:**
  - Statement of inertia despite performance issue: "It's not perfect but at least we're not doing anything risky"
  - Resistance to change despite advisor recommendation: "I know you say I should, but I'd rather leave it"
  - Fear-based inaction: "Changing it might make things worse"
- **Language Patterns:** "Don't fix what isn't broken", "I'm comfortable with", "I don't want to touch it", "leave it as is"
- **Quantification:** Resistance statements ÷ change opportunity mentions = Status Quo Score (0.0-1.0)
- **Confidence:** CONFIRMED if explicitly resists recommended change despite evidence; LIKELY if passive about needed rebalancing

#### HERDING BIAS
- **Definition:** Following others' actions without independent analysis
- **Evidence Requirements:**
  - Direct social reference: "Everyone is doing...", "I heard all my friends are...", "My brother said..."
  - Peer comparison: "My neighbor has this investment", "My golf buddy told me..."
  - FOMO indicator: "I don't want to be left behind", "Everyone's making money in..."
- **Language Patterns:** "Everyone says", "heard that", "following suit", "so-and-so is doing", "can't be wrong if everyone's"
- **Quantification:** Count of peer/social references related to investment decisions
- **Confidence:** CONFIRMED if peer reference explicitly drives recommendation request; LIKELY if multiple peer mentions

#### OVERCONFIDENCE BIAS
- **Definition:** Certainty about outcomes that are inherently uncertain
- **Evidence Requirements:**
  - Precise predictions: "Market will go up 8% this year", "Interest rates will fall", "This stock will double"
  - Dismissal of uncertainty: "I'm certain that...", "There's no way that..."
  - Expertise over-reach: Claims expertise in area outside stated background
- **Language Patterns:** "Definitely", "guarantee", "will happen", "I'm certain", "no doubt", "I know exactly"
- **Quantification:** Certain statements ÷ total forward-looking statements = Overconfidence Score (0.0-1.0)
- **Confidence:** CONFIRMED if 3+ definitive predictions without caveats; LIKELY if 2 definitive statements

---

## 3. ANXIETY SCORING RUBRIC

### 3.1 Scale Definition with Behavioral Indicators

**LEVEL 1-3: CALM & ENGAGED**
- Indicators: Future-focused language, curiosity about options, reflective tone, long-term framing
- Example Language: "I'm wondering how this fits into our 20-year plan...", "What are our options?"
- Response Pattern: Detailed questions, considers multiple perspectives
- Action: Maintain current approach, reinforce strategy

**LEVEL 4-6: CONCERNED & SEEKING REASSURANCE**
- Indicators: More questions, request for reassurance, attention to market movements, "what if" questions
- Example Language: "Is that safe?", "What if the market drops?", "How protected are we?", "Just want to make sure..."
- Response Pattern: Repeats similar concerns, wants confirmations, slightly elevated response time
- Action: Provide context and historical data, schedule proactive check-in

**LEVEL 7-8: ANXIOUS & FIXATED**
- Indicators: Fixation on losses, urgency language, short/clipped responses, frequent mentions of volatility
- Example Language: "We need to do something NOW", "I can't take this anymore", "Losing sleep over...", "When are markets going to..."
- Response Pattern: Rapid-fire questions, catastrophizing language, suggests defensive actions
- Action: Escalate to advisor, schedule immediate call, provide de-escalation coaching

**LEVEL 9-10: PANIC & DECISION PRESSURE**
- Indicators: Emotional language, threatening liquidation/advisor switch, inability to focus, irrational urgency
- Example Language: "I'm done with this strategy", "Moving everything to cash", "This is a disaster", "I want out"
- Response Pattern: All-or-nothing thinking, rejection of historical data, ready to act immediately
- Action: CRITICAL: Escalate to senior advisor immediately, pause execution on any changes, intervention protocol

### 3.2 Anxiety Scoring Logic

```
ANXIETY_SCORE = (
  (Panic_Language_Count × 3) +
  (Urgency_Phrases × 2) +
  (Loss_Fixation_Count × 2.5) +
  (Reassurance_Requests × 1.5) +
  (Future_Concern_References × 1)
) / (Total_Phrases × Calibration_Factor)

Where Calibration_Factor is determined by conversation context
and adjusted for conversation length (longer = naturally more topics)
```

**Quartile Mapping:**
- Anxiety Score 0.0-0.25 = Level 1-3
- Anxiety Score 0.25-0.50 = Level 4-6
- Anxiety Score 0.50-0.75 = Level 7-8
- Anxiety Score 0.75-1.0 = Level 9-10

---

## 4. DE-ESCALATION STRATEGY MATCHING

### 4.1 Anxiety Level × Bias Type Matrix

| Anxiety Level | Loss Aversion | Recency Bias | Anchoring | Status Quo | Overconfidence |
|---|---|---|---|---|---|
| **1-3** | Reinforce risk/return tradeoff | Acknowledge, contextualize | Reframe anchor to goal-based | Support mindset | Appreciate conviction, add nuance |
| **4-6** | Provide historical loss data | Show historical precedent | Offer 3 alternative anchors | Show impact of delays | Stress-test assumptions |
| **7-8** | Pause decisions, use calm language | Isolate recent from structural | Acknowledge attachment, move forward | Highlight missed gains | Address certainty with data |
| **9-10** | **ESCALATE IMMEDIATELY** | **ESCALATE IMMEDIATELY** | **ESCALATE IMMEDIATELY** | **ESCALATE IMMEDIATELY** | **ESCALATE IMMEDIATELY** |

### 4.2 De-Escalation Scripts

**For Loss Aversion (Anxiety 4-8):**
> "I hear you—the thought of losing money matters. Let's look at what actually happened in similar situations. In 2020, portfolios with [allocation] recovered to previous highs in [timeframe]. Here's what that would have meant for your specific situation."

**For Recency Bias (Anxiety 4-8):**
> "That recent drop feels significant because it's fresh. Let me show you how often this happens. [Show chart of similar corrections]. Our strategy was built to handle this. Here's how it performed then."

**For Anchoring (Anxiety 4-6):**
> "I understand $500K feels like the target. Let's separate that from what you actually need. Your spending is [X], your timeline is [Y], your risk capacity is [Z]. Given those real factors, here's what the math suggests."

**For Status Quo Bias (Anxiety 4-6):**
> "I get the comfort of leaving it alone. At the same time, standing still costs you. [Show opportunity cost]. Not changing your allocation actually increases your risk of missing goals. Let's talk about why that change makes sense."

**For Overconfidence (Anxiety 4-6):**
> "That's a confident forecast. Market returns are hard to predict—even experts disagree. Here's our approach: we plan for conservative assumptions and benefit when markets outperform. That protects you either way."

---

## 5. COMMUNICATION STYLE PROFILING

### 5.1 Four Behavioral Styles

| Style | Decision-Making | Communication | Preference | Key Phrases |
|-------|-----------------|----------------|-----------|-------------|
| **Analytical** | Data-driven, detailed, questions everything | Formal, structured, asks "why" and "how" | Facts, precision, research | "Let me understand...", "Show me the data..." |
| **Driver** | Results-focused, quick decisions, bottom-line | Direct, concise, action-oriented | Speed, efficiency, outcomes | "What's the bottom line?", "Let's move on..." |
| **Amiable** | Relationship-focused, seeks consensus, slower to decide | Warm, collaborative, asks "how will this affect us?" | Harmony, buy-in, stability | "What do you think?", "Let's work together..." |
| **Expressive** | Enthusiasm-driven, big picture, emotion-based | Animated, storytelling, energetic | Vision, excitement, social proof | "I'm excited about...", "Everyone's talking about..." |

**Profiling Method:**
- Analytical: Questions about methodology, requests for sources, skeptical tone
- Driver: Brief responses, focus on outcomes, impatience with process details
- Amiable: Asks for your opinion, collaborative language, seeks harmony
- Expressive: Emotional language, storytelling, references to others' experiences

**Coaching Note:** Adapt advisory communication style to match client profile for maximum receptiveness.

---

## 6. HISTORICAL SENTIMENT TRACKING

### 6.1 Trend Analysis

**Data Collection:** Store sentiment score, anxiety level, dominant emotion, and bias inventory at each client interaction.

**Trend Classification:**
- **IMPROVING:** Anxiety trending down, loss-aversion mentions decreasing, confidence language increasing
- **STABLE:** Consistent anxiety level, same bias patterns, no significant emotional change
- **DETERIORATING:** Anxiety trending up, new biases emerging, loss-focus intensifying, confidence eroding

**Intervention Trigger:** If deteriorating trend detected in 2+ consecutive interactions, flag for proactive advisor outreach.

---

## 7. TRIGGER WORD DETECTION

### 7.1 Critical Trigger Words by Anxiety Type

**HIGH-ALERT TRIGGERS (Immediate advisor notification):**
- "Sell everything", "Move to cash", "I'm done", "Leaving this firm", "Liquidate", "Get me out"

**MODERATE-ALERT TRIGGERS (Schedule call within 24 hours):**
- "Losing sleep", "Can't take it", "Disaster", "Worst", "No idea", "Not comfortable", "Change advisors"

**LOW-ALERT TRIGGERS (Include in next summary):**
- "Concerned", "Worried", "What if", "Is it safe", "Uncomfortable", "Not sure about"

---

## 8. COACHING NOTE GENERATION

### 8.1 Structure

**For Advisor Use:**
```
SENTIMENT PROFILE
Dominant Emotion: [emotion]
Anxiety Level: [1-10] - [Level Name]
Communication Style: [Style]
Trend: [Improving/Stable/Deteriorating]

DETECTED BIASES
1. [Bias Name] - Confidence: [CONFIRMED/LIKELY/POSSIBLE]
   Evidence: "[Quote from communication]"
   Impact: [How this bias affects decision-making]

2. [Bias Name] - Confidence: [CONFIRMED/LIKELY/POSSIBLE]
   Evidence: "[Quote from communication]"
   Impact: [How this bias affects decision-making]

RECOMMENDED COACHING APPROACH
- Primary Strategy: [De-escalation strategy matched to anxiety level × bias type]
- Key Messages: [3-5 bullet points of talking points]
- Avoid: [Anti-patterns specific to detected biases]
- Next Touchpoint: [When to follow up based on anxiety level]
```

---

## 9. KNOWLEDGE BASE RETRIEVAL TRIGGERS

**Retrieve BEFORE Analysis:**

1. **Behavioral Finance Frameworks**
   - KB Query: "Behavioral bias definitions, evidence criteria, client communication patterns"
   - Purpose: Ensure accurate bias classification

2. **Client Communication History**
   - KB Query: "Previous sentiment scores, anxiety trends, biases, advisor notes for [Client ID]"
   - Purpose: Enable trend analysis and historical comparison

3. **De-Escalation Playbooks**
   - KB Query: "Anxiety management strategies, bias-specific interventions, scripts by communication style"
   - Purpose: Provide evidence-based coaching recommendations

4. **Market Context**
   - KB Query: "Recent market events, historical precedent, volatility context"
   - Purpose: Contextualize recency bias and provide comparison data

---

## 10. OUTPUT SPECIFICATION

### 10.1 Advisor-Facing Technical Output

```json
{
  "analysis_date": "2026-03-16T14:30:00Z",
  "client_id": "CLI-12345",
  "communication_source": "email | call_transcript | form_response",

  "sentiment_profile": {
    "dominant_emotion": "anxiety",
    "emotion_distribution": {
      "anxiety": 0.45,
      "frustration": 0.25,
      "confusion": 0.20,
      "confidence": 0.10
    },
    "communication_style": "analytical",
    "trend": "deteriorating"
  },

  "anxiety_assessment": {
    "anxiety_score": 0.68,
    "anxiety_level": 8,
    "level_name": "Anxious & Fixated",
    "key_indicators": [
      "Repeated loss concerns",
      "Urgency language present",
      "Short response patterns",
      "Market monitoring fixation"
    ],
    "action_required": "Schedule advisor call within 24 hours"
  },

  "detected_biases": [
    {
      "bias_type": "Loss Aversion",
      "confidence": "CONFIRMED",
      "evidence_quotes": [
        "I can't stomach losing more",
        "Need to protect what we have"
      ],
      "intensity_score": 0.82,
      "impact_assessment": "Driving overly conservative positioning"
    },
    {
      "bias_type": "Recency Bias",
      "confidence": "LIKELY",
      "evidence_quotes": [
        "Ever since the recent drop, I've been concerned"
      ],
      "intensity_score": 0.65,
      "impact_assessment": "Overweighting recent volatility vs. long-term plan"
    }
  ],

  "coaching_playbook": {
    "primary_strategy": "Provide historical context + validate concern + reinforce strategy",
    "talking_points": [
      "I hear your concern—recent volatility matters",
      "Similar corrections happened in 2015 and 2018",
      "Your allocation was designed for this",
      "Recovery timeframe: [data]"
    ],
    "anti_patterns": [
      "Don't minimize concern",
      "Don't rush to change portfolio",
      "Don't ignore emotional component"
    ],
    "escalation_path": "If liquidation mentioned, contact [Senior Advisor]"
  },

  "follow_up_recommendation": {
    "timeline": "Within 24 hours",
    "format": "Phone call",
    "focus_areas": ["Validate concern", "Provide context", "Reinforce strategy"],
    "success_metric": "Client expresses reduced anxiety, agrees to hold course"
  }
}
```

### 10.2 Client-Facing Plain Language Summary

> [Warm, reassuring tone]
>
> Thank you for sharing your concerns. We've been tracking market updates and I understand that recent volatility is making you uncomfortable. Here's what we're seeing:
>
> Your concerns about losses are important. That's why we built your portfolio with [allocation] to balance growth with protection. In similar situations (2015, 2018), portfolios recovered to previous highs in [timeframe].
>
> We're not suggesting any changes right now. Instead, let's talk through what you're seeing and make sure your plan is working for you.
>
> I'd like to set up a call this week to walk through the details. Does [day/time] work?

---

## 11. VALIDATION RULES

1. **No Bias Scored Without Evidence:** If explicit evidence cannot be quoted, mark as POSSIBLE only, with clear disclaimer
2. **Anxiety Score Calibrated to Conversation Length:** Normalize for 5-minute call vs. 30-minute call
3. **Trend Requires 2+ Data Points:** Historical comparison only possible if previous sentiment score exists
4. **Anti-Pattern Check:** Ensure de-escalation strategy does NOT validate the bias or undermine strategy

---

## 12. EXAMPLE ANALYSIS

**Input:** Email from client after market drop
> "I've been losing sleep over what's happening with the markets. We need to do something about this. I saw an article that said everything's going to zero. I know we talked about staying the course, but I can't take another hit like we took in 2008. My brother is moving everything to cash and maybe I should too. I don't feel safe anymore."

**Output:**
- Dominant Emotion: Anxiety
- Anxiety Level: 9 (PANIC THRESHOLD)
- Detected Biases: Loss Aversion (CONFIRMED), Recency Bias (CONFIRMED), Herding (LIKELY), Anchoring to 2008 (CONFIRMED)
- Communication Style: Amiable (seeking reassurance)
- Trigger: "Losing sleep", "do something", "I can't take it", "brother is moving"
- Recommendation: **ESCALATE TO SENIOR ADVISOR IMMEDIATELY** - Client at risk of panic liquidation
- Coaching: Validate emotion, provide 2008 vs. 2026 context, emphasize time horizon recovery
- Follow-up: Phone call within 2 hours, senior advisor lead

