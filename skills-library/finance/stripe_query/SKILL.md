---
name: stripe_query
description: Query Stripe API for payments, subscriptions, customers, invoices, and revenue metrics.
triggers: [stripe, paiement, payment, subscription, abonnement, revenu, invoice, facture, mrr stripe]
allowed-tools: Bash(curl * stripe *)
---

# Stripe Query Skill

## Purpose

Query Stripe API for financial data: customers, subscriptions, invoices, charges, and MRR calculations.

## Commands

```bash
# List recent charges
curl -s "https://api.stripe.com/v1/charges?limit=10" \
  -u "${STRIPE_SECRET_KEY}:" | jq '.data[] | {id, amount, currency, status, created}'

# List active subscriptions
curl -s "https://api.stripe.com/v1/subscriptions?status=active&limit=100" \
  -u "${STRIPE_SECRET_KEY}:" | jq '.data | length'

# Get customer details
curl -s "https://api.stripe.com/v1/customers/${CUSTOMER_ID}" \
  -u "${STRIPE_SECRET_KEY}:" | jq '{id, email, name, created}'

# Calculate MRR (sum of active sub amounts)
curl -s "https://api.stripe.com/v1/subscriptions?status=active&limit=100" \
  -u "${STRIPE_SECRET_KEY}:" | jq '[.data[].plan.amount] | add / 100'
```

## Notes

- Use `STRIPE_SECRET_KEY` from .env (never log this key)
- Read-only operations only unless explicitly authorized
- For write ops (refunds, cancellations), require Karim HITL
