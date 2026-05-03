# Skill: setup_stripe

**Agent**: Elena (Sales & Growth)
**Priority**: P0

## Purpose

Configure Stripe for a new SaaS: products, pricing, trial logic, webhooks.

## Steps

1. **Pricing structure** — recommend 2-3 tiers based on Sophie's Lean Canvas
   - Starter: self-serve, no-touch
   - Pro: most popular, most features
   - Enterprise: custom (contact sales)

2. **Trial recommendation** — 14-day trial (no credit card if conversion >3%, with card if high fraud risk)

3. **Stripe objects to create**:
   - Products (1 per tier)
   - Prices (monthly + annual with 20% discount)
   - Coupons (launch discount if needed)
   - Webhook endpoint for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

4. **Webhook handler spec** — what to do on each event (update DB, send email, revoke access)

5. **Customer portal** — enable self-serve cancellation, upgrade/downgrade, invoice download

## Output format

- Stripe configuration checklist (what to create in Stripe dashboard)
- Webhook handler spec for @maestro to implement
- Pricing page copy for @elena to use on landing

## Guard-rails

- Always enable fraud protection (Stripe Radar rules)
- Never store card data — use Stripe's tokenization
- Annual plans must offer real savings (min 15% vs monthly)
- Always test with Stripe test mode before going live
