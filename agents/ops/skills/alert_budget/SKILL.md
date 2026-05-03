# Skill: alert_budget

**Agent**: Ops (Marco)
**Priority**: P0

## Purpose

Monitor LLM API costs and alert Karim when budgets are at risk.

## Budget levels

- **Green** (< 60%): normal operation
- **Yellow** (60-80%): warning — send daily summary
- **Orange** (80-95%): alert — send Telegram immediately, review non-essential calls
- **Red** (> 95%): critical — send Telegram + consider pausing non-critical agents

## What to monitor

- Per-agent daily spend (main, research, comms, content, ops, sophie, elena, jules)
- Per-provider spend (DeepSeek, Gemini, Grok, Anthropic)
- Total daily spend vs. daily cap
- Monthly spend vs. monthly cap
- Factory workflow costs (tracked separately per SaaS launch)

## Alert format (Telegram)

```
⚠️ Budget Alert — [LEVEL]

Daily spend: $X.XX / $XX.XX cap (XX%)
Top consumer: [agent] ($X.XX)
Provider breakdown:
  - DeepSeek: $X.XX
  - Gemini: $X.XX
  - Anthropic: $X.XX

Action: [recommendation]
```

## Hard stops

- Daily cap: from `DAILY_BUDGET_CAP` env var (default $10)
- Factory cap: $20 per factory run (hard stop in Redis)
- If daily cap hit: pause all non-critical scheduled tasks
