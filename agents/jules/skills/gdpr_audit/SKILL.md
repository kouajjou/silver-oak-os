# Skill: gdpr_audit

**Agent**: Jules (Legal & Compliance)
**Priority**: P0

## Purpose

Conduct a full RGPD audit of a SaaS product or website before launch.

## Audit checklist (RGPD Articles)

### Art.13 — Information at collection
- [ ] Privacy notice shown at data collection point
- [ ] Legal basis stated (consent / legitimate interest / contract)
- [ ] Data retention periods specified
- [ ] DPO contact if applicable

### Art.17 — Right to erasure
- [ ] Delete account flow exists
- [ ] All data deleted within 30 days
- [ ] Third-party processors notified of deletion

### Art.20 — Data portability
- [ ] Export feature exists (JSON or CSV)
- [ ] Export delivered within 30 days

### Art.25 — Privacy by design
- [ ] Only necessary data collected
- [ ] Data minimization applied
- [ ] Default settings privacy-friendly

### Art.30 — Records of processing
- [ ] Processing register maintained
- [ ] All data flows documented

### Art.33 — Breach notification
- [ ] Breach response procedure exists
- [ ] 72-hour CNIL notification process defined

## Output format

Audit report in markdown with:
- Summary score (compliant / partially / non-compliant)
- Per-article findings
- Prioritized action list (P0 = blocking launch, P1 = fix in 30 days, P2 = best practice)
