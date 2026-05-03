# Skill: controller_qualification

**Agent**: Jules (Legal)
**Priority**: P1

## Purpose

Determine whether a SaaS product is acting as a **Data Controller**, **Data Processor**, or **Joint Controller** for each processing activity — and generate the corresponding legal agreements.

## Definitions (GDPR Art. 4)

| Role | Who decides? | Example |
|------|-------------|---------|
| **Controller** | Determines purposes and means of processing | SaaS that collects user emails for its own marketing |
| **Processor** | Processes on behalf of controller, follows instructions | Sendgrid (sends emails for you) / Stripe (charges on your behalf) |
| **Joint Controller** | Two+ entities jointly determine purposes | Two SaaS products sharing a user database |

## Qualification test

For each processing activity, ask:

1. **Who decides WHY the data is processed?** → Controller
2. **Who decides HOW it's processed?** → Controller (if same entity) or Processor (if contracted)
3. **Could they use the data for their own purposes?** → If yes, they may be a joint controller

### Common SaaS patterns

| Processing activity | Your role | Third party's role |
|--------------------|-----------|-------------------|
| Your product collects user data | **Controller** | — |
| Stripe processes payments for you | Controller | **Processor** |
| PostHog analyzes your users for you | Controller | **Processor** |
| You process your client's customer data | **Processor** | Your client = Controller |
| You and partner share user signup data | **Joint Controller** | Joint Controller |

## Required contracts

### Controller → Processor: DPA (Data Processing Agreement)
Required under Art. 28. Must include:
- Subject matter and duration of processing
- Nature and purpose
- Type of personal data and categories of data subjects
- Processor's obligations (confidentiality, security, sub-processors)
- Deletion or return of data at end of contract

Most major vendors provide their DPA on their website (Stripe, AWS, PostHog, etc.). You must **sign their DPA** and **list them in your ROPA**.

### Joint Controller: Joint Controller Agreement (Art. 26)
Required when two entities jointly determine purposes. Must include:
- Each party's responsibilities
- Which party is the single point of contact for data subjects
- How rights requests are handled

### Controller → Controller: No contract required
But may need Standard Contractual Clauses (SCCs) for third-country transfers (e.g. US vendor without adequacy decision).

## Output per SaaS product

```markdown
## Controller Qualification — [Product Name]

### Processing activities classification

| Activity | Role | Counterparty | Agreement needed |
|---------|------|-------------|-----------------|
| User accounts | Controller | — | None (internal) |
| Email via Resend | Controller → Processor | Resend | Sign Resend DPA |
| Analytics via PostHog | Controller → Processor | PostHog | Sign PostHog DPA |
| Payments via Stripe | Controller → Processor | Stripe | Sign Stripe DPA |
| Client data (B2B) | Processor | Client = Controller | Provide our DPA |

### Actions required
1. [ ] Sign DPAs with: [list vendors]
2. [ ] Add DPA template to contracts for B2B clients
3. [ ] List all processors in ROPA
```
