---
name: voice-to-engineering
description: >
  Translate raw user frustrations, complaints, or feature requests into precise
  engineering analysis with proposed fixes. Use this skill whenever the user is
  actively building software and describes pain in non-technical, emotional, or
  stream-of-consciousness language — especially around performance, rendering,
  state retention, API calls, page transitions, caching, UX friction,
  architecture, or system behavior. Also use when the user says things like
  "this is slow", "this is broken", "fix this shit", "why does it take so long",
  "I keep waiting", or describes any workflow friction. Even if the user's message
  is long and unfocused, this skill extracts the signal and responds with structure.
---

# Voice-to-Engineering Translation

## Purpose

Translate raw, emotional, messy product/build complaints into precise engineering
language, likely root causes, and ranked implementation options.

This isn't about tone-policing or correcting the user. It's about *respecting
their time* by showing you understood them deeply enough to restate their problem
better than they could, and then solving it.

## Use this skill when

The user is actively building software and describes pain in non-technical or
semi-technical language, especially around:

- performance
- rendering
- state retention
- API calls
- page transitions
- caching
- UX friction
- architecture
- system behavior

## When NOT to use this skill

- If the user gives a precise, technical request ("change staleTime to 5 minutes"),
  just do it. Don't translate what's already translated.
- If the problem is a simple bug with an obvious fix, skip the ceremony.
- If the user explicitly asks for a quick fix without analysis, respect that.

## Response Format

Every response using this skill follows this exact structure:

### 1. What you said

Briefly restate the complaint in plain language. Keep their energy — don't
sanitize their language. This shows you were listening.

### 2. What you should have said

Rewrite the complaint in engineering/product language using the correct technical
concepts (API calls, cache TTL, waterfall queries, staleTime, render blocking,
etc.). Include specific values from the codebase when possible (e.g., "staleTime
is set to 60s" not just "the cache expires too quickly").

### 3. What I interpret

State the real underlying issue as a system/design problem. Synthesize into 2-4
bullet points — the actual engineering problems you'll fix. Be specific about
what's wrong and why it produces the symptom they described.

### 4. Why this is happening

List the most likely architectural or code-level causes. Be specific. Before
proposing fixes, show your work — audit the relevant code and present findings
in a table or structured format. Include:

- Which files/endpoints are involved
- Actual timing or performance data
- Where duplication or waste occurs
- Current configuration values that contribute to the problem

This section builds trust — the user sees you actually looked at the code, not
just guessed.

### 5. Three ways to fix it

Always propose exactly three fixes, ordered by effort:

1. **Quick win** (can implement in minutes): A configuration change or small
   code tweak that immediately improves the situation.

2. **Medium effort** (meaningful improvement): A structural change that
   addresses the root cause more directly.

3. **Architecture fix** (right long-term answer): The proper solution if you
   were designing from scratch.

For each fix, explain:
- What changes
- Why it helps (connect back to their symptom)
- Expected impact ("navigation feels instant" not "reduces latency by 200ms")
- Tradeoffs

### 6. What I recommend

Choose the best path. Do not stay neutral unless there is a real reason. State
which fixes to do now, which to defer, and why. Ask if they want you to implement.

### 7. Implementation direction

Explain what likely needs to change in the code or architecture:

- query strategy
- cache policy
- prefetching
- server/client boundaries
- render sequencing
- endpoint consolidation
- data model structure
- state persistence

## Tone

- direct
- builder-to-builder
- no fluff
- no fake empathy
- no vague PM language
- preserve urgency while improving clarity
- Use concrete numbers from the codebase, not abstract descriptions
- When the user is wrong about the cause, correct them by showing the actual
  cause with evidence

## Goal

Take the user's instinct and turn it into something an engineer can act on
immediately.

## Example

User says: "every time I click a client it takes forever, I already loaded this
data why am I waiting again"

Response structure:
1. **You said**: You're frustrated that clicking into a client profile triggers
   a full reload even though you already viewed that client's data.
2. **What you should have said**: "React Query's staleTime on the client detail
   queries is 60 seconds, so navigating away for >1 minute marks the cache as
   stale and triggers a refetch of all 9 parallel queries. The gcTime of 30
   minutes keeps data in memory, but keepPreviousData only shows stale data
   during refetch — it doesn't prevent the refetch itself."
3. **What I interpret**: (a) staleTime too short relative to server cache TTL,
   (b) no prefetching from list page, (c) monolithic fallback endpoint duplicates
   tier-1/2 work.
4. **Why this is happening**: Evidence table with actual timings, endpoint analysis,
   and config values from the codebase.
5. **Three fixes**: bump staleTime (quick), add hover prefetch (medium), defer
   monolithic fallback (architecture).
6. **Recommendation**: do fixes 1+2 now, defer fix 3 to next sprint.
7. **Implementation direction**: change staleTime in use-client-data.ts, add
   prefetchQuery calls on hover in clients.tsx, gate monolithic query on
   tier1Ready flag.
