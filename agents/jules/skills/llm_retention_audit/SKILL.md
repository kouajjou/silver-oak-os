# Skill: llm_retention_audit

**Agent**: Jules (Legal)
**Priority**: P1

## Purpose

Audit the personal data retention practices specific to LLM-powered SaaS products — conversation logs, embeddings, fine-tuning data, and training contributions — for GDPR compliance.

## Why LLM retention is different

Standard SaaS retention audits cover database rows. LLM products create additional retention risks:

1. **Conversation logs** — raw text stored for debugging, fine-tuning, or replay
2. **Embeddings** — vector representations of user content (not "raw" data but re-identifiable)
3. **Prompt/completion pairs** — used for fine-tuning; may contain PII
4. **Model weights** — after fine-tuning on user data, PII is "baked in" and cannot be deleted
5. **Third-party LLM provider** — does the API provider (Anthropic, OpenAI, Google) retain inputs?

## Audit checklist

### 1. Conversation storage

| Question | Compliant | Action if No |
|---------|-----------|-------------|
| Are conversation logs stored? | | Document retention period |
| Is there a maximum retention period (≤ 90 days recommended)? | | Set TTL or cron deletion |
| Are logs encrypted at rest? | | Enable encryption |
| Can a user delete their conversation history? | | Add deletion endpoint |
| Are logs scoped per user (no cross-contamination)? | | Fix data isolation |

### 2. Embeddings and vector databases

| Question | Compliant | Action if No |
|---------|-----------|-------------|
| Are user-generated embeddings isolated per user/org? | | Namespace by user_id |
| Can embeddings be deleted when user requests deletion? | | Add vector delete on user delete |
| Are embeddings stored in EU? (if EU users) | | Check Pinecone/Weaviate region |
| Is there a retention policy for embeddings? | | Add TTL |

### 3. Third-party LLM provider data retention

Review the provider's data processing terms:

| Provider | Default retention | Zero-retention option |
|---------|-----------------|----------------------|
| Anthropic Claude API | 30 days (logs for safety) | Available via DPA |
| OpenAI API | 30 days | Zero-day option with enterprise plan |
| Google Gemini API | As per Google Cloud DPA | Configurable |
| Mistral API | Per their DPA | Check on sign-up |

Action: **Sign the provider's DPA** and confirm you're on the zero-retention or minimum-retention tier.

### 4. Fine-tuning data (if applicable)

- **Never fine-tune on raw user conversations** without explicit consent
- If fine-tuning: scrub PII before preparing training data (use NER / regex + manual review)
- Document the fine-tuning data provenance in ROPA
- If user requests deletion: can you remove their data's influence from the model? (Currently impossible for weights → document as known limitation, add to privacy policy)

### 5. Data subject rights in LLM context

| Right | Standard SaaS | LLM SaaS challenge |
|-------|-------------|-------------------|
| Right to erasure (Art. 17) | Delete DB row | Cannot delete from model weights |
| Right to access (Art. 15) | Export user data | Must include conversation logs + embeddings |
| Right to portability (Art. 20) | Export as JSON/CSV | Include conversation history |
| Right to object (Art. 21) | Opt-out flag | Must stop using data for model improvement |

## Audit report format

```markdown
## LLM Data Retention Audit — [Product Name]

**Date**: [date]
**Auditor**: Jules (Legal Agent)

### Risk summary
🔴 High risk: [N issues]
🟡 Medium risk: [N issues]
🟢 Low risk / Compliant: [N checks]

### Critical findings
1. [Finding + recommended action]
2. ...

### Provider DPAs status
- Anthropic: [Signed / Not signed]
- [Other providers]: [Status]

### Retention schedule (updated)
| Data type | Location | Retention | Deletion mechanism |
|-----------|---------|-----------|-------------------|
| Conversation logs | [DB] | [N days] | [Cron / On-delete] |
| Embeddings | [Vector DB] | [N days] | [API delete] |
| Fine-tuning data | [N/A or location] | [N/A or period] | [N/A] |
```
