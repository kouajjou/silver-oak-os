# Skill: data_processing_register

**Agent**: Jules (Legal)
**Priority**: P1

## Purpose

Generate the GDPR Article 30 Record of Processing Activities (ROPA) for a SaaS product — the mandatory internal document mapping all data processing operations.

## Legal basis

GDPR Art. 30 requires controllers and processors to maintain a written record of processing activities. Mandatory for organisations with >250 employees OR whose processing is likely to result in a risk to rights and freedoms, or involves special categories.

In practice: **required for all SaaS products processing EU personal data**.

## ROPA structure (Art. 30(1) checklist)

Each processing activity must include:

| Field | Description |
|-------|-------------|
| Activity name | e.g. "User account management", "Analytics", "Support tickets" |
| Controller | Legal entity name + address + DPO contact |
| Purpose | Why this data is processed |
| Legal basis | Consent / Contract / Legitimate interest / Legal obligation |
| Data categories | Email, IP, usage data, payment data, etc. |
| Data subjects | Users, prospects, employees, etc. |
| Recipients | Third parties receiving this data |
| Third-country transfers | Countries outside EU + safeguards (SCCs, adequacy) |
| Retention period | How long data is kept |
| Security measures | Encryption, access control, backups |

## Standard processing activities for SaaS

### 1. Account creation & authentication
- Legal basis: Contract (Art. 6(1)(b))
- Data: email, name, hashed password, creation date
- Recipients: authentication provider (e.g. Supabase/Auth0)
- Retention: duration of account + 30 days after deletion

### 2. Product usage & analytics
- Legal basis: Legitimate interest (Art. 6(1)(f)) or Consent
- Data: IP, browser, feature usage events, session duration
- Recipients: analytics tool (PostHog, Mixpanel, etc.)
- Retention: 13 months rolling

### 3. Billing & payments
- Legal basis: Contract (Art. 6(1)(b)) + Legal obligation (accounting)
- Data: email, billing address, last 4 digits, invoice history
- Recipients: Stripe or payment processor
- Retention: 10 years (accounting obligation)

### 4. Customer support
- Legal basis: Legitimate interest (Art. 6(1)(f))
- Data: email, messages, attached files, issue context
- Recipients: support tool (Intercom, Crisp, etc.)
- Retention: 3 years after last ticket

### 5. Marketing emails
- Legal basis: Consent (Art. 6(1)(a)) or Soft opt-in (ePrivacy)
- Data: email, name, opens/clicks
- Recipients: email provider (Resend, Sendgrid, etc.)
- Retention: until unsubscribe + 3 years

## Output format

Generate a CSV or Markdown table per processing activity, plus a cover page:

```markdown
# Record of Processing Activities
**Controller**: [Company name, address]
**DPO/Contact**: [Name or email]
**Last updated**: [Date]
**Version**: [N]

---

| # | Activity | Purpose | Legal basis | Data | Subjects | Recipients | Retention | Third countries |
|---|----------|---------|------------|------|----------|-----------|-----------|----------------|
| 1 | Account mgmt | Auth | Contract | Email, PW hash | Users | Supabase (EU) | Account lifetime +30d | None |
| 2 | Analytics | Product improvement | Legitimate interest | IP, events | Users | PostHog (EU) | 13 months | None |
...
```

## Maintenance rules

- Review ROPA every 6 months or when adding a new processing activity
- New third-party tool → add to ROPA before going live
- CNIL can request ROPA during an audit — it must be current
