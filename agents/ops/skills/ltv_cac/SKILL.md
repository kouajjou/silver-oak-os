# Skill: ltv_cac

**Agent**: Ops (Marco)
**Priority**: P0

## Purpose

Calculate LTV (Lifetime Value) and CAC (Customer Acquisition Cost) to measure unit economics health.

## Formulas

**LTV (Monthly Churn method)**
```
LTV = ARPU / Monthly Churn Rate
where ARPU = MRR / Active Customers
```

**LTV (Gross Margin adjusted)**
```
LTV = ARPU × Gross Margin % / Monthly Churn Rate
(preferred — accounts for actual profit per customer)
```

**CAC**
```
CAC = Total Acquisition Spend (last 90 days) / New Customers Acquired (last 90 days)
Acquisition Spend: ads, PH sponsorship, cold outreach time @ €150/h
```

**LTV:CAC Ratio** = LTV / CAC
- > 3:1 = healthy
- 2-3:1 = watch
- < 2:1 = acquisition model broken

**Payback Period** = CAC / (ARPU × Gross Margin %)
- < 12 months = good for bootstrapped
- > 18 months = problematic without funding

## When to alert

- LTV:CAC < 2 → immediate @marco alert
- Payback > 18 months → strategy session with @sophie and @elena
- Churn > 5% monthly → @sophie for product audit

## Output format

```
💰 LTV/CAC ANALYSIS — [Month]

ARPU: €XX/month | Churn: X.X%/month
LTV: €X,XXX (gross margin adjusted)
CAC: €XXX (last 90 days)
LTV:CAC: X.X:1 [🟢/🟡/🔴]
Payback: XX months [🟢/🟡/🔴]

TREND: [improving / stable / deteriorating]
ACTION: [specific recommendation]
```
