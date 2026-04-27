# MCP Bridge Usage — Silver Oak OS Factory

> gap-013 | Date : 2026-04-27 | Status : validated by daily use

## Architecture

```
Karim (Cowork, MacBook)
  → Claude.ai session (BIST 3) + MCP Claudette tool activated
    → MCP Bridge : https://mcp.silveroak.one/sse  (SSE protocol)
      → Claudette server (178.104.24.23) — tmux worker sessions
        → Execute tasks on Factory (178.104.255.59) via SSH
          → Return results → BIST 3 → Karim
```

## MCP Bridge endpoint

| Property | Value |
|----------|-------|
| URL | `https://mcp.silveroak.one/sse` |
| Protocol | SSE (Server-Sent Events) |
| Available tools | ~73 (workers, files, git, system, DB) |
| Uptime | 58h+ as of 2026-04-27 |
| Reverse proxy | Nginx on Claudette (port 443 → internal) |

## Worker tier system

### T1 Premium (Pro Max forfait flat — $0 / session)
| Session | Model | Use case |
|---------|-------|----------|
| `claude-code` | claude-sonnet-4-6 | Orchestration, audits, commits |
| `claude-backend` | claude-sonnet-4-6 | TypeScript src/ patches |
| `claude-frontend` | claude-sonnet-4-6 | Next.js UI changes |
| `opus` | claude-opus-4-6 | **BANNED** — requires `USINE_OPUS_ALLOWED=true` (gap-004) |

### T2 Économique (~$0.14-0.28/M tokens)
| Session | Model | Use case |
|---------|-------|----------|
| `aider-deepseek-1/2/3` | deepseek-chat | Codage rapide, patches fichiers |
| `aider-minimax-1/2/3` | minimax | Alternative T2 (if available) |
| ~~`aider-gemini-1/2/3`~~ | ~~gemini-2.5-pro~~ | **BANNED DÉFINITIVEMENT** (see below) |

### T3 Parallèle (~$0.50-2/M tokens)
| Session | Model | Use case |
|---------|-------|----------|
| `gpt4o-1/2` | GPT-4o | Tâches générales parallèles |
| `grok-1/2` | Grok | Bash scripts, infra |
| `deepseek-r1-1/2` | DeepSeek-R1 | Raisonnement, tâches logiques |

### Audit (read-only, multi-LLM)
| Session | Use case |
|---------|----------|
| `audit-gemini-1/2/3` | Code review, audits lecture seule — PAS de codage |

## ⛔ BANNED — aider-gemini-1/2/3

**Supprimés définitivement le 2026-04-24** après 2 incidents critiques :
1. `aider-gemini` modifié `model-pricing.ts` hors-tâche → routing LLM cassé ~30min en prod
2. `aider-gemini` a tronqué `server.ts` de 1299 → 51 lignes + facture Google €100 (gemini-2.5-pro × 16122 fichiers)

**Règle** : NEVER dispatch `send_to_session` avec `aider-gemini-*`.
Alternative : utiliser `aider-deepseek-1/2/3` pour tâches T2.

## Validation accessibility (gap-013)

MCP Bridge accessibility validée **implicitement par usage quotidien** :
- 5+ dispatches workers réussis le 2026-04-27 (claude-backend, aider-deepseek-*)
- Pipeline autonome complète : branch → code → tsc → pm2 reload → test → push
- Session uptime BIST 3 stable tout au long de la journée

Tests E2E explicites skippés par décision Karim (bridge already proven by use).

## Workflow de dispatch type

```bash
# Via Claude.ai BIST 3 (MCP Claudette tool) :
# 1. Préparer le prompt de tâche
# 2. Appeler mcp__claude_ai_MCP_Claudette__send_to_claude_backend(prompt)
# 3. Poll toutes les 60s : mcp__claude_ai_MCP_Claudette__read_session_output(session="claude-backend")
# 4. Attendre TASK_DONE dans l'output
```

## Related gaps

| Gap | Status | Description |
|-----|--------|-------------|
| gap-001 | ✅ merged | /api/chat/sync max_tokens 256→1024 |
| gap-003 | ✅ merged | SOUL_PROMPTS → CLAUDE.md single source |
| gap-004 | ✅ merged | Opus banni (USINE_OPUS_ALLOWED guard) |
| gap-005 | ⏳ branch | HITL Telegram callback_query |
| gap-013 | ⏳ branch | MCP Bridge validation + cleanup (this file) |
| gap-018 | ⏳ branch | Auto-rollback script (scripts/auto-rollback.sh) |
