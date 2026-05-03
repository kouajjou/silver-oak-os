# Skill: mom_test

**Agent**: Research (Nina)
**Priority**: P1

## Purpose

Design and analyze customer discovery interviews using The Mom Test methodology — extracting honest market signals without leading questions or false validation.

## The Mom Test (Rob Fitzpatrick)

The core insight: your mom will lie to make you feel good. Most prospects do too. The Mom Test forces interviews to reveal truth.

### 3 rules of a good interview

1. **Talk about their life, not your idea** — ask about actual past behavior, not hypothetical future behavior
2. **Ask about specifics, not generics** — "How often do you actually do X?" not "Would you want X?"
3. **Listen, don't pitch** — if you find yourself defending your idea, you've lost the interview

### Questions that fail the Mom Test

❌ "Would you use a tool that does X?" (hypothetical)
❌ "Do you think this would be useful?" (validation-seeking)
❌ "Would you pay for something like this?" (hypothetical)
❌ "What features would you want?" (asking them to spec your product)

### Questions that pass the Mom Test

✅ "Tell me about the last time you had to do X manually. Walk me through it."
✅ "How much time did that take you last month?"
✅ "What did you try before? Why didn't it work?"
✅ "How are you solving this today?"
✅ "What's the hardest part of your current process?"
✅ "How much does not solving this cost you? (time, money, stress)"

## Interview script template

### Opening (2 min)
"I'm researching [problem space], not selling anything. I want to understand how you currently handle [problem]. This is for my research. Mind if I ask you about your experience?"

### Core questions (15-20 min)

**Problem discovery**
1. "When did you last deal with [problem]? What happened?"
2. "How are you solving it today?"
3. "What have you already tried?"

**Pain depth**
4. "What's the most frustrating part of how you handle it now?"
5. "How often does this come up?"
6. "If you could wave a magic wand, what would be different?"

**Current behavior + budget signal**
7. "Are you paying for anything related to this problem right now? What?"
8. "Who else in your company is affected by this?"
9. "Is this something your boss cares about?"

### Closing (3 min)
"Is there anyone else you'd recommend I talk to who deals with this?"

## Signals to watch for

### Strong signals (buy signal)
- They describe the problem in detail without prompting
- They've already tried to solve it (built something, paid for a workaround)
- They quantify the pain (hours lost, money wasted, clients angry)
- They ask "when is this available?"
- They offer to introduce you to others with the same problem

### Weak signals (politeness, not signal)
- "That sounds interesting"
- "I'd probably use that"
- "Yeah we definitely have that problem" (with no specifics)
- They suggest features immediately (spec mode = not actually painful enough)

### Red flags (pivot signals)
- "I'd use it if..." (conditional = no real pain)
- "We do X once a year" (not frequent enough to build a habit)
- "My company would never pay for that" (budget doesn't exist)

## Analysis framework

After 5+ interviews, pattern-map:

| Theme | Frequency | Intensity | Quotes |
|-------|-----------|-----------|--------|
| [Pain 1] | 4/5 | High (hours/week) | "[exact quote]" |
| [Pain 2] | 2/5 | Medium | "[exact quote]" |
| [Non-pain] | 5/5 | None (nice-to-have) | "[exact quote]" |

**PMF signal**: If 3+ interviewees say the same unsolicited thing → build it.

## Output format

```markdown
## Mom Test Analysis — [Product Idea]

**Interviews completed**: [N]
**Date range**: [Start – End]

### Top validated pains (buy-worthy)
1. [Pain] — mentioned by [N/N], intensity [High/Medium]
   Quote: "[verbatim]"

### Hypotheses invalidated
- [Assumption you had that nobody confirmed]

### Unexpected findings
- [Things you didn't expect to hear]

### Recommendation
[Build / Pivot / More discovery needed] — because [evidence]
```
