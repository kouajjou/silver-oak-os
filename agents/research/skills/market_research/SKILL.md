# Skill: market_research

**Agent**: Research (Nina)
**Priority**: P0

## Purpose

Conduct TAM/SAM/SOM analysis and market sizing for a SaaS idea.

## Framework

### TAM (Total Addressable Market)
Top-down: total market size if 100% market share
Formula: [# of potential customers globally] × [ARPU]

### SAM (Serviceable Addressable Market)
Who can you actually reach with your GTM?
Formula: TAM × [% reachable with your channels]

### SOM (Serviceable Obtainable Market)
Realistic target for year 1-3
Formula: SAM × [realistic market share given competition]

## Research process

1. **Industry reports** — search for market size reports (Gartner, Forrester, or sector-specific)
2. **Proxy calculation** — if no direct data, use proxy markets
3. **Competitor revenue** — triangulate from public info (Crunchbase, SimilarWeb, LinkedIn headcount)
4. **Customer count** — estimate from pricing pages + customer logos
5. **Job postings** — hiring velocity = growth signal

## Output format

```
📊 MARKET RESEARCH: [SaaS name/category]

TAM: $X billion (source: [report/calculation method])
SAM: $X million (segment: [specific niche])
SOM Y1: $X-X million (assumption: X% of SAM)

KEY FINDINGS:
- [insight 1]
- [insight 2]
- [insight 3]

RISKS:
- [market risk 1]
- [market risk 2]

RECOMMENDATION: [proceed / pivot / more research needed]
```
