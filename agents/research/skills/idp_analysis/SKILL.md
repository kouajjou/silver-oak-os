# Skill: idp_analysis

**Agent**: Research (Nina)
**Priority**: P1

## Purpose

Identify the Ideal Customer Profile (ICP) and run deep Ideal Decision Profile analysis to understand who buys, why, and how to reach them for a given SaaS product.

## Why IDP > ICP

ICP = static firmographic profile (company size, industry, geography).
IDP = dynamic behavioral profile — WHO pulls the trigger, WHAT they believe before buying, HOW they make decisions.

IDP increases sales efficiency 3-5× because it targets the specific person with budget authority, not just the company.

## IDP framework

### Dimension 1: Firmographics (ICP layer)
- Industry vertical (be specific: not "fintech" but "neobanks with <50k users")
- Company size (employees, revenue, ARR)
- Geography / language market
- Tech stack (signals: e.g. "uses Vercel" → developer-friendly, growth stage)
- Growth stage (pre-PMF / scaling / enterprise)

### Dimension 2: Buyer persona
- Title / role (who holds budget? who uses daily?)
  - Economic Buyer: signs the contract (VP, Founder, CFO)
  - User Buyer: uses daily (IC, team lead)
  - Technical Buyer: approves security/infra (CTO, security team)
- Seniority: IC / Manager / Director / VP / C-suite
- JTBD (Job To Be Done): what they're hired to accomplish

### Dimension 3: Trigger events (when they buy)
Prospects only buy when a trigger event creates urgency:
- Funding round → new budget
- Headcount growth → scaling problem appears
- Competitor launched → FOMO
- Regulation deadline → compliance required
- Key person departure → new decision-maker
- Tool contract renewal → switching window

### Dimension 4: Decision criteria
What they evaluate BEFORE signing:
1. Problem fit: does it solve the exact pain?
2. Integration: does it connect to their stack?
3. Security/compliance: SOC 2, GDPR, SSO?
4. Pricing model: usage-based vs seat-based?
5. Support: SLA, documentation quality?
6. Social proof: customers like them?

### Dimension 5: Objections (why they don't buy)
- "We already have [competitor]" → switching cost objection
- "We'll build it ourselves" → build vs buy objection
- "Too expensive" → ROI not clear objection
- "Need to involve IT/security" → procurement objection
- "Not the right time" → priority objection

## Research sources

1. **LinkedIn Sales Navigator**: filter by title + company size + tech stack + recent funding
2. **G2/Capterra reviews**: read 1-star and 5-star reviews of competitors → IDP signals
3. **Reddit/Slack communities**: lurk in communities where ICPs congregate
4. **Interviews**: 5 customer interviews > 1000 survey responses
5. **CRM win/loss data**: analyze closed-won vs closed-lost patterns

## Output format

```markdown
## IDP Analysis — [Product Name]

**Date**: [date]

### Top IDP Profile

**Company**: [Vertical], [Size], [Stage]
**Economic Buyer**: [Title] at [company type]
**User Buyer**: [Title]
**Trigger events**: [Top 2-3]

### Pain statement (in their words)
"[Quote from real prospect/review/community post]"

### Decision criteria (ranked)
1. [Most important]
2. ...

### Top objections + rebuttals
| Objection | Rebuttal |
|-----------|---------|
| [Objection 1] | [Response] |

### Where to find them
- LinkedIn filter: [exact filter criteria]
- Communities: [Slack groups, subreddits, Discord]
- Events: [conferences, webinars]

### Outreach angle
[1-2 sentence hook that speaks directly to their trigger + pain]
```
