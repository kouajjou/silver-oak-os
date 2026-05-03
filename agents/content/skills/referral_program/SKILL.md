# Skill: referral_program

**Agent**: Content (Léo)
**Priority**: P2

## Purpose

Design and launch a referral program to turn existing customers into acquisition channels.

## When to launch

Only after achieving:
- ≥ 20 active paying customers
- NPS > 30 (customers actually like the product)
- Aha moment is clear and consistent (J7 retention > 40%)

## Program design

### Incentive structure
| Model | Best for | Risk |
|-------|---------|------|
| Two-sided (referrer + referee) | B2C viral | Cost if abused |
| One-sided credit (only referrer) | B2B SaaS | Lower conversion |
| Feature unlock | Limited product | Feels cheap |

Recommended for bootstrapped SaaS: **Two-sided discount** (20% off first month for referee, €20 credit for referrer)

### Mechanics
1. Unique referral link per user (tracked via UTM + cookie)
2. Referral dashboard in user account
3. Reward triggered when referee's trial converts to paid
4. Email confirmation to both parties

### Tool recommendation
- **Rewardful** (simplest, Stripe-native, €29/month)
- **ReferralHero** (more features, €79/month)
- Custom (free, 1 week to build, use if budget tight)

## Launch playbook
1. Email existing customers announcing the program
2. Add referral widget to dashboard
3. Include referral link in every product email
4. Monthly "top referrers" leaderboard (if > 10 referrers)

## Guard-rails

- Cap: max €100 credit per user per month (anti-abuse)
- KYC: verify referee is a real new customer (no self-referrals)
- Never launch before product-market fit — referrals amplify both good and bad experiences
