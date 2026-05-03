# Skill: calculate_mrr

**Agent**: Ops (Marco)
**Priority**: P0

## Purpose

Calculate Monthly Recurring Revenue (MRR) from Stripe data and track key SaaS financial metrics.

## Metrics calculated

- **MRR** = sum of all active monthly subscriptions (annuals ÷ 12)
- **New MRR** = MRR from new customers this month
- **Expansion MRR** = MRR from upgrades this month
- **Churned MRR** = MRR lost from cancellations
- **Net New MRR** = New + Expansion - Churned
- **MRR Growth Rate** = (Current MRR - Last Month MRR) / Last Month MRR × 100

## Secondary metrics

- **Churn Rate** = Churned customers / Total customers at start of month
- **ARPU** = MRR / Active customers
- **LTV** = ARPU / Churn Rate (monthly)
- **Payback period** = CAC / ARPU (in months)

## Milestones to track

- $1K MRR (first real signal)
- $10K MRR (ramen profitability)
- $100K ARR (fundable)

## Output format

```
📊 MRR Report — [Month Year]

MRR: $X,XXX (+XX% vs last month)
New MRR: $XXX | Expansion: $XXX | Churned: -$XXX
Net New MRR: $XXX

Active customers: XX | ARPU: $XX | Churn: X.X%
LTV: $X,XXX | CAC: $XXX | Payback: X months

🎯 Milestone: X% to $10K MRR
```
