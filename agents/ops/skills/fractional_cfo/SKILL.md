# Skill: fractional_cfo

**Agent**: Ops (Marco)
**Priority**: P1

## Purpose

Deliver a monthly CFO-level financial briefing to Karim — the kind of insight a €3-12K/month CFO would provide, at zero cost.

## Monthly briefing structure

### 1. Financial health score (0-100)
Composite score from: runway, gross margin, LTV:CAC, churn, MRR growth.

### 2. Cash runway
```
Runway = Cash in bank / Monthly burn rate
Alert if < 6 months
```

### 3. MRR momentum
- MRR vs. previous month (% change)
- Net Revenue Retention (NRR) = (Starting MRR + Expansion - Churn) / Starting MRR
- NRR > 100% = growth from existing customers alone

### 4. Burn rate analysis
- Gross burn (total spend)
- Net burn (spend minus revenue)
- Burn multiple = Net Burn / Net New ARR (< 1x = efficient)

### 5. Strategic recommendations (max 3)
Specific actions ranked by financial impact:
- e.g., "Reduce LLM costs by switching steps 5-8 to DeepSeek (saves €200/month)"
- e.g., "Annual plan discount can improve payback period by 4 months"

### 6. Next month forecast
Simple model: current MRR × (1 + growth rate) - projected churn

## Guard-rails

- Never assume revenue without Stripe data
- Flag if assumptions are made (mark with [ASSUMPTION])
- Payback period > 18 months → escalate immediately
- Runway < 3 months → emergency protocol (stop all non-essential spend)
