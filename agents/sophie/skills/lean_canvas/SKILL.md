# Skill: lean_canvas

**Agent**: Sophie (Product & UX)
**Priority**: P1

## Purpose

Generate a Lean Canvas for a SaaS idea — one-page business model that forces clarity.

## The 9 boxes

1. **Problem** — top 3 problems you're solving (ranked by severity)
2. **Customer Segments** — who has these problems? (be specific, not "SMBs")
3. **Unique Value Proposition** — single, clear, compelling message (why buy from you?)
4. **Solution** — top 3 features solving the top 3 problems (one-to-one mapping)
5. **Channels** — how will you reach customers? (Product Hunt, LinkedIn, cold email, SEO)
6. **Revenue Streams** — how do you make money? (pricing model, price point)
7. **Cost Structure** — what does it cost to run? (LLM costs, hosting, time)
8. **Key Metrics** — how do you know if it's working? (Activation, Retention, Revenue)
9. **Unfair Advantage** — what's hard to copy? (network effects, proprietary data, brand)

## Output format

Saved to `saas/<saas-id>/CONTEXT.md` under a "Lean Canvas" section.

```markdown
## Lean Canvas — [SaaS Name]

| Box | Content |
|-----|---------|
| Problem | 1. [X] / 2. [Y] / 3. [Z] |
| Customer | [specific segment] |
| UVP | [one sentence] |
| Solution | 1. [A] / 2. [B] / 3. [C] |
| Channels | [list] |
| Revenue | [model + price] |
| Costs | [main costs] |
| Metrics | [3 KPIs] |
| Unfair Advantage | [one differentiator] |
```
