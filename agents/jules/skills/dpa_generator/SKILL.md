# Skill: dpa_generator

**Agent**: Jules (Legal & Compliance)
**Priority**: P0

## Purpose

Generate Data Processing Agreements (DPA) for API providers that process personal data on behalf of the SaaS.

## When required

A DPA is required whenever you send personal data to a third-party processor:
- OpenAI / Anthropic (if sending user content)
- Google (Gmail, Drive, Analytics)
- Stripe (payment data)
- Any email provider (Brevo, SendGrid)
- Any analytics tool (PostHog, Mixpanel)

## DPA structure (RGPD Art.28)

1. **Parties** — controller (the SaaS) and processor (the API provider)
2. **Subject matter** — what processing is done, for what purpose
3. **Duration** — how long processing lasts
4. **Nature and purpose** — specific operations performed
5. **Type of data** — categories of personal data
6. **Categories of data subjects** — who the data relates to
7. **Processor obligations** — security, confidentiality, sub-processors
8. **Sub-processors** — list of approved sub-processors
9. **Data transfers** — adequacy decisions or SCCs for non-EU transfers
10. **Return/deletion** — what happens to data at contract end

## Practical note

Most major providers (OpenAI, Google, Stripe) have standard DPAs you can sign through their admin panel. Jules generates:
1. A checklist of DPAs to sign with links
2. A custom DPA template for smaller providers without standard DPAs
