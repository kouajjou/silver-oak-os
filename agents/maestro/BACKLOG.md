# Maestro Backlog
> Updated: 2026-04-27 by gap-014 dispatch

## Architecture
Maestro is the CTO orchestrator agent. Reports to Alex (Chief of Staff).
Manages worker dispatch via MCP Bridge (gap-013).
Tracks costs via SQLite budget-tracker (gap-020, in progress).
Auto-rollback via scripts/auto-rollback.sh (gap-018).

## Active Tasks (P1)
- [ ] SOP V26 inline (47 rules in CLAUDE.md)
- [ ] gap-002 budget enforcement (depends gap-020)
- [ ] gap-010 Multi-LLM API adapters (9 providers)
- [ ] gap-011 3 auditors pattern
- [ ] gap-012 Cross-LLM judge Gemini

## Active Tasks (P2)
- [ ] gap-006 T3 cheap workers (gpt4o-mini, gemini-flash)
- [ ] gap-007 E2E real Telegram bot test
- [ ] gap-019 Stop referencing Claudette server in code
- [ ] gap-015 E2E external machine tests
- [ ] Item 2 reply->response renaming

## In Progress (27/04/2026)
- [ ] gap-014 Maestro BACKLOG.md (this file)
- [ ] gap-020 SQLite budget tracker
- [ ] gap-021 Maestro README.md

## Done (27/04/2026)
- [x] gap-001 route /api/chat/sync
- [x] gap-004 Ban Opus (USINE_OPUS_ALLOWED)
- [x] Item 1 max_tokens 256->1024
- [x] voiceRouter security P0 disabled
- [x] gap-018 auto-rollback git workflow
- [x] gap-005 Telegram callback_query handler
- [x] gap-013 MCP Bridge validation + docs

## Reading Order for New Workers
1. agents/maestro/CLAUDE.md (persona + SOP)
2. agents/maestro/README.md (overview)
3. THIS FILE (current backlog)
4. scripts/mcp-bridge-usage.md (worker dispatch)
5. scripts/auto-rollback.sh README (gap-018)
