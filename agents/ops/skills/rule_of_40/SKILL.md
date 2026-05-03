# Skill: rule_of_40

**Agent**: Ops (Marco)
**Priority**: P2

## Purpose

Calculate and track the Rule of 40 — the primary health metric for SaaS businesses.

## Formula

**Rule of 40 Score = Revenue Growth Rate % + Profit Margin %**

Where:
- Revenue Growth Rate = (This month MRR - Last month MRR) / Last month MRR × 100 × 12 (annualized)
- Profit Margin = Net Profit / Revenue × 100

## Interpretation

| Score | Status | Meaning |
|-------|--------|---------|
| ≥ 40 | ✅ Excellent | Healthy SaaS — fundable, acquirable |
| 20-40 | 🟡 Good | On track but room to improve |
| 0-20 | 🟠 Warning | Prioritize either growth or profitability |
| < 0 | 🔴 Critical | Burning cash without growth |

## For bootstrapped solo founder

At early stage (< €10K MRR), Rule of 40 is less meaningful. Use:
- **Short-term**: MRR growth rate > 15%/month
- **Medium-term** (€10K+ MRR): Rule of 40 > 40
- **Long-term** (€100K ARR): Rule of 40 > 60

## Milestone tracking

Track Rule of 40 monthly. Graph trend over 6 months to see if business is improving.

## Output format

```
📐 RULE OF 40 — [Month]

Revenue Growth (annualized): +XX%
Net Profit Margin: XX%
Rule of 40 Score: XX [✅/🟡/🟠/🔴]

6-month trend: [graph as ASCII or numbers]
Recommendation: [growth or profitability focus]
```
