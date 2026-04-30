# Audit 3/8 — agent.yaml des 6 agents
**Date** : 2026-04-29  
**Répertoire** : `/app/silver-oak-os/agents/`  
**Agents** : main, comms, content, ops, research, maestro, _template

---

## Tableau récapitulatif

| agentId | name | description | model | telegram_token_env |
|---------|------|-------------|-------|--------------------|
| `main` | Alex | Chief of Staff — primary interface for Karim, triage and delegation to Sara/Léo/Marco/Nina/Maestro | claude-sonnet-4-6 | TELEGRAM_BOT_TOKEN |
| `comms` | Sara | Communications — Gmail karim@silveroak.one, email drafts, outreach, inbox triage | claude-sonnet-4-6 | COMMS_TELEGRAM_TOKEN |
| `content` | Léo | Content production — YouTube scripts, LinkedIn posts, content calendar, RGPD-native AI SaaS audience | claude-sonnet-4-6 | CONTENT_TELEGRAM_TOKEN |
| `ops` | Marco | Operations — Google Calendar, finance monitoring, Hetzner infra, padel Marbella scheduling | claude-sonnet-4-6 | OPS_TELEGRAM_TOKEN |
| `research` | Nina | Research — AI multi-agent competition, EU ecosystem, RGPD/AI Act, competitive intel, source-cited briefs | claude-sonnet-4-6 | RESEARCH_TELEGRAM_TOKEN |
| `maestro` | Maestro | CTO interne Silver Oak OS — orchestrates 19 workers via MCP Bridge (mcp.silveroak.one) | claude-sonnet-4-6 | MAESTRO_TELEGRAM_TOKEN |

---

## Détails complets

### main (Alex)
```yaml
name: Alex
description: Chief of Staff — primary interface for Karim, triage and delegation to Sara/Léo/Marco/Nina/Maestro
telegram_bot_token_env: TELEGRAM_BOT_TOKEN
model: claude-sonnet-4-6
meet_voice_id: onwK4e9ZLuTAKqWW03F9
meet_bot_name: Alex
```

### comms (Sara)
```yaml
name: Sara
description: Communications — Gmail karim@silveroak.one, email drafts, outreach, inbox triage
telegram_bot_token_env: COMMS_TELEGRAM_TOKEN
model: claude-sonnet-4-6
meet_voice_id: EXAVITQu4vr4xnSDxMaL
meet_bot_name: Sara
```

### content (Léo)
```yaml
name: Léo
description: Content production — YouTube scripts, LinkedIn posts, content calendar, RGPD-native AI SaaS audience
telegram_bot_token_env: CONTENT_TELEGRAM_TOKEN
model: claude-sonnet-4-6
meet_voice_id: TX3LPaxmHKxFdv7VOQHJ
meet_bot_name: Léo
```

### ops (Marco)
```yaml
name: Marco
description: Operations — Google Calendar, finance monitoring, Hetzner infra, padel Marbella scheduling
telegram_bot_token_env: OPS_TELEGRAM_TOKEN
model: claude-sonnet-4-6
meet_voice_id: pNInz6obpgDQGcFmaJgB
meet_bot_name: Marco
```

### research (Nina)
```yaml
name: Nina
description: Research — AI multi-agent competition, EU ecosystem, RGPD/AI Act, competitive intel, source-cited briefs
telegram_bot_token_env: RESEARCH_TELEGRAM_TOKEN
model: claude-sonnet-4-6
meet_voice_id: hpp4J3VqNfWAUOO0d1Us
meet_bot_name: Nina
```

### maestro (Maestro)
```yaml
name: Maestro
description: CTO interne Silver Oak OS --- orchestrates 19 workers via MCP Bridge (mcp.silveroak.one). Strangler Fig: workers run on Claudette (178.104.24.23).
telegram_bot_token_env: MAESTRO_TELEGRAM_TOKEN
model: claude-sonnet-4-6
skills_allowlist:
  - mcp-dispatch
meet_voice_id: nPczCjzI2devNBz1zQrb
meet_bot_name: Maestro
max_workers: 19
budget_cap_usd: 3.0
architecture: strangler-fig
workers_host: claudette-178.104.24.23
```

---

## Gap confirmé — dispatchToEmployee vs agent.yaml réel

| Nom | Description hardcodée dans dispatchToEmployee | Description réelle dans agent.yaml |
|-----|----------------------------------------------|-------------------------------------|
| sara | "marketing expert" | "Communications — Gmail, email drafts, outreach, inbox triage" |
| leo | "design expert" | "Content production — YouTube scripts, LinkedIn posts, content calendar" |
| marco | "finance expert" | "Operations — Google Calendar, finance monitoring, Hetzner infra" |
| nina | "data expert" | "Research — AI competition, EU ecosystem, RGPD/AI Act, competitive intel" |

**Tous les agents utilisent** `claude-sonnet-4-6` — le model hardcodé `getModelForAgent('nina')` dans dispatchToEmployee
est donc accidentellement correct en valeur, mais conceptuellement faux (binding dur sur 'nina').

---

## Statut : DONE 3/8 ✅
