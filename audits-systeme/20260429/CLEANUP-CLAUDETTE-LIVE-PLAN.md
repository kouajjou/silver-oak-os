# 🧹 Plan Cleanup Claudette — En cours d'exécution

> 29/04/2026 ~22h30 — Karim insiste pour finir avant dodo

## ✅ Décisions PhD prises

### À TUER (services dev migrés vers Factory)
- ❌ `mcp-bridge` (PM2 + tmux) — remplacé par mcp-bridge-factory
- ❌ `dispatcher-v2` — dev uniquement
- ❌ `reviewer-v2` — dev uniquement
- ❌ `beads-memory` — dev uniquement
- ❌ `hitl-webhook` — dev uniquement
- ❌ `guardrails-l1`, `guardrails-l2` — dev uniquement
- ❌ Toutes les sessions tmux du SessionManager (19) :
  - audit-gemini-1/2/3
  - aider-gemini-1/2/3
  - aider-deepseek-1/2/3
  - gpt4o-1/2
  - deepseek-r1-1/2
  - grok-1/2
  - claude-code, claude-backend, claude-frontend, opus

### À GARDER (prod beta)
- ✅ `claudette-api` — backend prod clients
- ✅ `claudette-frontend` (Next.js) — UI prod
- ✅ Caddy/nginx — reverse proxy public
- ✅ Redis — cache + queues prod
- ✅ Supabase — DB prod (cloud)

### À VÉRIFIER
- 🤔 Crons Karim → garder ceux qui font de la prod
- 🤔 Cohort Memory — utilisé par claudette-api ?
- 🤔 Wave F Paperclip Fusion — dev ou prod ?

## 🛡️ Stratégie Strangler Fig

1. **Tag git pre-cleanup** (rollback safe)
2. **Backup ecosystem.config.cjs** (PM2 config full)
3. **Kill par batch** :
   - Batch 1 : audit-gemini-* (3 sessions, zéro impact)
   - Batch 2 : APIs tier (gpt4o-*, grok-*, deepseek-r1-*) (6 sessions)
   - Batch 3 : aider-* (6 sessions)
   - Batch 4 : claude-code/backend/frontend/opus (4 sessions)
   - Batch 5 : PM2 services dev (mcp-bridge, dispatcher, reviewer, etc.)
4. **Vérification après chaque batch** :
   - `curl localhost:80/api/health` → 200
   - `curl localhost:3000/api/health` → 200
5. **Save PM2 + Telegram récap** après chaque batch

## ⚠️ Garde-fous

- JAMAIS `pm2 delete all`
- JAMAIS `pm2 restart all`
- JAMAIS toucher `/app/produits-saas/factory/claudette` (le code SaaS)
- TOUJOURS `pm2 save` après chaque kill
- Pause 10s entre chaque batch pour laisser la stabilité revenir
