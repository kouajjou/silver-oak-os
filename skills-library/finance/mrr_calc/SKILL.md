---
name: mrr_calc
description: Calculate Monthly Recurring Revenue from Stripe subscriptions. Returns MRR, ARR, churn, and growth metrics.
triggers: [mrr, arr, revenu récurrent, monthly recurring, churn, croissance revenue, revenus mensuels]
allowed-tools: Bash(curl * python3 *)
---

# MRR Calculator Skill

## Purpose

Calculate MRR (Monthly Recurring Revenue) and key SaaS revenue metrics from Stripe data.

## MRR Calculation

```bash
# Raw MRR from active subscriptions (in EUR cents → EUR)
MRR=$(curl -s "https://api.stripe.com/v1/subscriptions?status=active&limit=100" \
  -u "${STRIPE_SECRET_KEY}:" | python3 -c "
import json, sys
data = json.load(sys.stdin)
total = sum(s['plan']['amount'] * s['quantity'] / 100 for s in data['data'])
print(f'{total:.2f}')
")
echo "MRR: €${MRR}"
```

## Key Metrics

| Metric | Formula |
|--------|---------|
| MRR | Sum of all active subscription monthly amounts |
| ARR | MRR × 12 |
| New MRR | MRR from subscriptions created this month |
| Churn | Cancelled subscriptions value this month |
| Net New MRR | New MRR - Churn |
| MRR Growth % | (Current MRR - Last Month MRR) / Last Month MRR × 100 |

## Output Format

```
MRR Report — [Date]
MRR:        €X,XXX
ARR:        €XX,XXX
New MRR:    €XXX
Churn:      €XX
Net New:    €XXX
Growth:     +X.X%
```
