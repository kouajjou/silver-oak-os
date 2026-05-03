# Skill: milestone_tracker

**Agent**: Ops (Marco)
**Priority**: P2

## Purpose

Track progress toward key SaaS milestones and calculate ETA for each.

## Standard milestones

| Milestone | Meaning | Celebration |
|-----------|---------|-------------|
| First paying customer | Proof of value | 🎯 |
| 10 customers | Early traction | 🏃 |
| €1K MRR | Ramen profitability possible | 🍜 |
| €10K MRR | Real business signal | 🚀 |
| 100 customers | Community building viable | 👥 |
| €100K ARR | Fundable if needed | 💰 |
| 1K customers | Scalable distribution | 🌊 |

## ETA calculation

Based on current growth rate (last 30-day CAGR):
```
Monthly Growth Rate = (Current MRR / Previous MRR) - 1
Months to milestone = log(Target MRR / Current MRR) / log(1 + Monthly Growth Rate)
```

⚠️ Always present pessimistic (50% of current growth rate) and optimistic (150%) scenarios.

## Per-SaaS tracking

For each SaaS in `saas_projects`:
- Current MRR, current users
- Next milestone + ETA
- Growth rate last 30 days

## Output format

```
🎯 MILESTONE TRACKER — [SaaS Name]

Current: €X,XXX MRR | XX customers
Next milestone: €10K MRR

Progress: [███████░░░] 72%
ETA optimistic: 2 months | ETA realistic: 4 months | ETA pessimistic: 8 months

All milestones:
✅ First customer (Jan 15)
✅ €1K MRR (Feb 3)
🎯 €10K MRR — ETA: ~4 months
⬜ €100K ARR
⬜ 1K customers
```
