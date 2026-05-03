# Skill: pricing_analysis

**Agent**: Ops (Marco)
**Priority**: P1

## Purpose

Analyze pricing strategy for a SaaS product and recommend optimal pricing.

## Framework

### 1. Value-based pricing anchors
- What does the product save in time? (hours × hourly rate)
- What does the product generate in revenue?
- What's the cost of NOT using it?
- Rule: price at 10-20% of value delivered

### 2. Competitive benchmarking
- Find 5 closest competitors
- Map their pricing tiers
- Identify: price leader, quality leader, value player

### 3. Pricing models analysis
| Model | Best for | Risk |
|-------|---------|------|
| Flat monthly | Simple products | Low expansion revenue |
| Per seat | Team tools | Pressure on larger teams |
| Usage-based | API/AI tools | Unpredictable for users |
| Hybrid (seat + usage) | Complex products | Billing complexity |

### 4. Tier recommendations
- **Starter**: self-serve, low price, limited features
- **Pro**: most features, most popular (anchor pricing)
- **Enterprise**: unlimited + SLA + support (contact sales)

### 5. Price sensitivity test
- Van Westendorp method: "too cheap / cheap / expensive / too expensive" price points
- Simulate on 20+ interviews (can be async via form)

## Output format

Pricing recommendation document with:
- 3 tiers with names, prices (monthly + annual), and feature list
- Rationale for each price point
- Expected ARPU impact
- A/B test suggestion for validation
