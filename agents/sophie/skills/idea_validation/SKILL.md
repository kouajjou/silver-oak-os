# Skill: idea_validation

**Agent**: Sophie (Product & UX)
**Priority**: P0

## Purpose

Validate a SaaS idea before committing any engineering resources.
Output: GO / NO-GO decision with evidence.

## When to use

Karim has a new idea and wants to know if it's worth building.
Always run this BEFORE `prd_writer`.

## Steps

1. **Problem statement** — restate the idea as a job-to-be-done: "When [situation], I want to [motivation], so I can [outcome]."
2. **6 hypotheses** — list the 6 assumptions that must be true for this to work (customer, problem, solution, channel, revenue, scale)
3. **Smoke test** — identify the fastest way to validate the top 2 hypotheses (landing page, 10 interviews, waitlist, etc.)
4. **Competitor check** — find 3 existing solutions. If none exist: red flag (no market) or blue ocean (validate harder)
5. **Willingness to pay** — is there evidence users pay for this? How much?
6. **GO / NO-GO verdict** — clear recommendation with confidence score (0-100%)

## Output format

```
💡 IDEA: [name]
📋 JOB: [JTBD statement]
🔬 6 HYPOTHESES: [numbered list]
🏆 COMPETITORS: [3 examples with pricing]
💰 WILLINGNESS TO PAY: [evidence or gap]
🎯 VERDICT: GO (85%) / NO-GO (reason)
🚀 NEXT: [specific next action if GO]
```

## Guard-rails

- Never output GO without at least 2 competitor references
- Never output GO if there's zero evidence of willingness to pay
- If NO-GO: always suggest a pivot or alternative framing
