# Dispatch to MCP Bridge Workers

When Maestro needs to delegate technical tasks to code workers, use the MCP Bridge at http://localhost:3003.

## Dispatch a task to a worker
```bash
curl -s -X POST http://localhost:3003/send_to_session \
  -H "Content-Type: application/json" \
  -d '{"session": "aider-deepseek-1", "prompt": "YOUR TASK HERE"}'
```

## Check worker status
```bash
curl -s http://localhost:3003/health | python3 -m json.tool | grep -A3 '"sessions"'
```

## Available workers (by tier)

T1 — Claude (premium, architecture tasks):
  claude-code, claude-backend, claude-frontend

T2 — DeepSeek (cost-effective coding):
  aider-deepseek-1, aider-deepseek-2, aider-deepseek-3

T3 — Mixed (parallel tasks):
  gpt4o-1, gpt4o-2, grok-1, grok-2, deepseek-r1-1, deepseek-r1-2

Audit:
  audit-gemini-1, audit-gemini-2, audit-gemini-3

⛔ BANNED — NEVER use:
  aider-gemini-1, aider-gemini-2, aider-gemini-3, opus

## Poll for result (R36 — every 60s)
```bash
curl -s http://localhost:3003/read_session_output?session=aider-deepseek-1
```

## SOP Rules (mandatory)
- R12: HITL if diff > 500 lines or cost > €1 (send diff to Telegram before continuing)
- R36: Poll every 60s per worker — NEVER say TASK_DONE if worker is BUSY
- R30: Telegram report at end of every task (✅ DONE / ❌ FAILED / ⚠️ PARTIEL + cost)
- R41: PR ≤ 500 LOC / 20 files
