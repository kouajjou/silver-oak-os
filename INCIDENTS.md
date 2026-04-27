# Silver Oak OS — Incidents Log

## 2026-04-24 — INCIDENT-001 : Bots se tuaient mutuellement (SIGTERM ping-pong)

**Durée** : ~2h (18:25 → 18:39)
**Sévérité** : HIGH — bots instables, restartaient en boucle

### Root Cause
`claudeclaw-maestro` et `claudeclaw-ops` utilisaient tous deux `AGENT_ID='main'`
→ Partagaient le même PID file `store/claudeclaw.pid`
→ À chaque démarrage, le nouveau process envoyait SIGTERM à l'ancien via `acquireLock()`
→ Les deux bots se tuaient en boucle (ping-pong)

### Symptômes
- "Starting ClaudeClaw..." → 19ms → "Shutting down..." (exit code 0)
- Impossible de faire tourner les deux simultanément
- `Restart=on-failure` ne relançait pas (exit code 0 = clean, non-failure)

### Fix
1. Ajout de `CLAUDECLAW_STORE_DIR` séparé par agent :
   - maestro → `store/maestro/`
   - main → `store/main/`
   - ops → `store/ops/`
   - comms/content/research → `store/{agent}/`
2. Changement `Restart=on-failure` → `Restart=always` + `StartLimitIntervalSec=0`

### Resolution
@claudettekarim_bot (maestro) + @sok_ops_bot (main) stables depuis 18:39

---

## 2026-04-24 — INCIDENT-002 : 4 tokens Telegram 401 Unauthorized

**Durée** : En cours
**Sévérité** : MEDIUM — 4/6 bots inactifs (main, comms, content, research)

### Root Cause
Tokens générés trop rapidement via BotFather → rate limit ou tokens expirés

### Workaround
Token OPS (valide) utilisé comme token MAIN temporairement
- claudeclaw-main → @sok_ops_bot (8648150174)
- claudeclaw-maestro → @claudettekarim_bot (8448099294)

### Fix requis
Karim doit régénérer les 4 tokens depuis BotFather :
`/mybots` → @sok_main_bot / @sok_comms_bot / @sok_content_bot / @sok_research_bot → Revoke → Copy
