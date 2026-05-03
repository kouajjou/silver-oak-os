# Skill: privacy_policy

**Agent**: Jules (Legal & Compliance)
**Priority**: P0

## Purpose

Generate a RGPD-compliant privacy policy for a SaaS product (FR + EN).

## Required sections

1. **Who we are** — company name, address, DPO contact if applicable
2. **Data we collect** — exhaustive list with purpose and legal basis for each
3. **How we use your data** — specific use cases (not vague "improve our service")
4. **Who we share data with** — named third parties (not "trusted partners")
5. **Data transfers** — where data is processed (EU vs. non-EU)
6. **Retention periods** — specific durations per data type
7. **Your rights** — Art.15-22 (access, rectification, erasure, portability, objection)
8. **How to exercise rights** — email address + response time (max 30 days)
9. **Cookies** — types used, consent mechanism
10. **Updates** — how policy changes are communicated

## LLM providers special section

For AI SaaS, always include:
- Which LLM providers process user data
- Whether data is used for training (and how to opt out)
- Data retention at provider level
- Links to provider DPAs

## Output format

Full markdown privacy policy, ready to publish.
Bilingual: FR (primary) + EN translation.
Saved to `saas/<saas-id>/` as `privacy_policy_fr.md` and `privacy_policy_en.md`.

## Guard-rails

- Never use "trusted partners" — always name them
- Retention "as long as necessary" is RGPD non-compliant — use specific periods
- Always mention right to lodge complaint with CNIL
