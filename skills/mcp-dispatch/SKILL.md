---
name: MCP Dispatch
description: Dispatch tasks to code workers via MCP Bridge at localhost:3003
triggers:
  - dispatch
  - delegate to worker
  - send to claude-backend
  - send to deepseek
  - mcp dispatch
---

# MCP Dispatch — Envoyer des tâches aux workers

Use this skill to dispatch technical tasks to the 18 code workers via the MCP Bridge.

## Dispatch a task

```bash
curl -s -X POST http://localhost:3003/send_to_session \
  -H "Content-Type: application/json" \
  -d '{"session": "WORKER_NAME", "prompt": "YOUR TASK"}'
```

## Check worker availability

```bash
curl -s http://localhost:3003/health | python3 -c "
import sys,json
d=json.load(sys.stdin)
for s in d['sessions']:
    print(f'{s[\"session\"]}: {\"BUSY\" if s[\"busy\"] else \"idle\"}')"
```

## Workers disponibles par tier

| Tier | Workers | Usage |
|------|---------|-------|
| T1 Premium | claude-backend, claude-frontend, claude-code | Architecture, code complex |
| T2 Économique | aider-deepseek-1/2/3 | Codage rapide, patches |
| T3 Parallèle | gpt4o-1/2, grok-1/2, deepseek-r1-1/2 | Tâches parallèles |
| Audit | audit-gemini-1/2/3 | Review, audit seulement |

⛔ INTERDIT : aider-gemini-1/2/3, opus (supprimés — incidents critiques)

## Lire le résultat (poll R36 — toutes les 60s)

```bash
curl -s "http://localhost:3003/read_session_output?session=aider-deepseek-1" | tail -20
```

## Règles SOP obligatoires

- **R12** : Si diff > 500 lignes OU coût > €1 → HITL (envoyer diff Telegram avant de continuer)
- **R36** : Poll 60s — JAMAIS TASK_DONE si worker BUSY
- **R30** : Rapport Telegram fin de tâche (✅ DONE / ❌ FAILED + coût)
- **R41** : PR ≤ 500 LOC / 20 fichiers
