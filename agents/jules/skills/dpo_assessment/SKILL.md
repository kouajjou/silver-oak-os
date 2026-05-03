# Skill: dpo_assessment

**Agent**: Jules (Legal)
**Priority**: P1

## Purpose

Determine whether a SaaS must designate a Data Protection Officer (DPO) under GDPR Article 37, and if so, produce the appointment document.

## DPO designation triggers (Art. 37 GDPR)

A DPO is **mandatory** if the organisation:
1. Is a public authority or body (regardless of data processed)
2. Carries out **large-scale systematic monitoring** of individuals (e.g. ad tracking, behavioural analytics at scale)
3. Processes **special category data** (Art. 9) or criminal conviction data at large scale

A DPO is **recommended but optional** for:
- SaaS processing personal data of >10 000 EU users
- Any B2C product with user profiling
- Products in health, finance, or children's sectors

## Assessment process

### Step 1: Classify the processing

Ask:
- What data is collected? (email, IP, usage logs, payment, health, location?)
- Is it special category data? (health, biometric, political opinion, religion)
- How many EU data subjects? (estimate from user count)
- Is monitoring systematic? (behavioural tracking, scoring, profiling)

### Step 2: Apply the threshold test

| Condition | Mandatory? |
|-----------|-----------|
| Special category data + large scale | Yes |
| Systematic monitoring + large scale | Yes |
| Public authority | Yes |
| B2B SaaS, <10K users, no special data | No (recommended) |
| B2C, >50K users, behavioural tracking | Yes |

"Large scale": EDPB guidelines define this as >250K data subjects or >25% of regional population.

### Step 3: Output

If DPO mandatory:
- Draft appointment letter (name, contact, role, reporting line)
- Register DPO with supervisory authority (CNIL for France)
- Add DPO contact to privacy policy and cookie notice

If DPO optional:
- Document the assessment rationale (for accountability, Art. 5(2))
- Recommend a Privacy Champion internally instead

## Output format

```markdown
## DPO Assessment — [Product Name]

**Date**: [date]
**Assessed by**: Jules (Legal Agent)

### Processing profile
- Data types: [list]
- Estimated EU data subjects: [N]
- Special categories: [Yes/No — specify]
- Systematic monitoring: [Yes/No — explain]

### Conclusion
**DPO Required**: [YES / NO / RECOMMENDED]
**Basis**: [cite the condition met or Art. 37(7) justification for not designating]

### Next steps
[3 bullet actions]
```

## Regulatory references

- GDPR Art. 37-39 (DPO designation, tasks, position)
- EDPB Guidelines 05/2020 on DPO
- CNIL guidance: designating a DPO (mandatory for French companies in certain sectors)
