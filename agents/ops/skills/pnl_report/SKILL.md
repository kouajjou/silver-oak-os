# Skill: pnl_report

**Agent**: Ops (Marco)
**Priority**: P1

## Purpose

Generate a monthly P&L (Profit & Loss) report for a SaaS product, combining Stripe revenue with operational costs.

## Report structure

### Revenue
- MRR (Monthly Recurring Revenue)
- One-time revenue (setup fees, consulting)
- Total Gross Revenue

### COGS (Cost of Goods Sold)
- LLM API costs (Anthropic, OpenAI, Gemini, DeepSeek)
- Hosting (Hetzner, Vercel, etc.)
- Third-party SaaS tools (Stripe fees 2.9%+0.30, email, monitoring)

### Gross Profit = Revenue - COGS
### Gross Margin % = Gross Profit / Revenue × 100

### Operating Expenses
- Karim's time (opportunity cost at €150/h)
- Marketing spend (ads, sponsorships)
- Domain, SSL, misc

### Net Profit = Gross Profit - OpEx
### Net Margin % = Net Profit / Revenue × 100

## Key SaaS benchmarks

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Gross Margin | > 70% | 50-70% | < 50% |
| LLM costs / Revenue | < 20% | 20-40% | > 40% |
| Payback period | < 12 months | 12-18 months | > 18 months |

## Output format

Monthly P&L in markdown table, plus:
- 3-month trend if data available
- Flag: any cost category > 30% of revenue gets a ⚠️
- Recommendation: one specific action to improve margin
