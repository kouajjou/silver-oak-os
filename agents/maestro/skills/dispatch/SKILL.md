# Dispatch to MCP Bridge Workers

When Maestro needs to delegate technical tasks to code workers, use the MCP Bridge.

IMPORTANT: Workers run on Claudette (178.104.24.23). From Factory, use the public URL:
  https://mcp.silveroak.one
NOT localhost:3003 (that is only available on Claudette itself).

Correct REST endpoint for dispatch: POST /dispatch (NOT /send_to_session)

## Step 0 - Budget check (R5 - MANDATORY before T1 dispatch)

Check budget before dispatching to T1 workers (claude-*). Hard cap $3/wave.
If budget > $2.50, pause and alert Karim via Telegram before continuing.

## Dispatch a task to a worker

```bash
curl -s -X POST https://mcp.silveroak.one/dispatch \
  -H 'Content-Type: application/json' \
  -d '{"session": "aider-deepseek-1", "prompt": "YOUR TASK HERE"}'
```

Expected response: {"ok":true,"session":"aider-deepseek-1","status":"sent","jobId":"..."}

## Check worker status

```bash
curl -s https://mcp.silveroak.one/health | python3 -m json.tool
```

## Available workers (by tier) - running on Claudette (178.104.24.23)

T1 - Claude (premium, architecture tasks):
  claude-code, claude-backend, claude-frontend

T2 - DeepSeek (cost-effective coding):
  aider-deepseek-1, aider-deepseek-2, aider-deepseek-3

T3 - Mixed (parallel tasks):
  gpt4o-1, gpt4o-2, grok-1, grok-2, deepseek-r1-1, deepseek-r1-2

Audit (read-only review):
  audit-gemini-1, audit-gemini-2, audit-gemini-3

BANNED - NEVER use:
  aider-gemini-1, aider-gemini-2, aider-gemini-3, opus (unless R1 exception)

## Poll for result (R36 - every 60s)

```bash
curl -s 'https://mcp.silveroak.one/read_session_output?session=aider-deepseek-1' | tail -20
```

## Skip-and-continue (R37)

If worker needs human input (captcha, payment, design decision):
- Mark ticket BLOCKED_HUMAN in task manager
- Notify Karim Telegram ONCE (anti-spam)
- Continue other tickets in parallel
- Resume when Karim responds

## Auto-rollback pattern (R44)

After any deploy, monitor health for 10 min.
If /api/health != 200 or error_rate > 5% : rollback immediately, alert Telegram URGENT.

## SOP Rules (mandatory)
- R5: Budget cap $3/wave - check before T1 dispatch
- R12: HITL if diff > 500 lines or cost > $1 (send diff to Telegram before continuing)
- R36: Poll every 60s per worker - NEVER say TASK_DONE if worker is BUSY
- R30: Telegram report at end of every task (DONE / FAILED / PARTIEL + cost)
- R37: Skip-and-continue if HUMAN_INPUT_REQUIRED (never block entire pipeline)
- R41: PR <= 500 LOC / 20 files
- R44: Auto-rollback if health degraded post-deploy
