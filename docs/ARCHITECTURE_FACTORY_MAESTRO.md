# 🏭 Architecture Factory MCP + Maestro — Source of Truth (2026-04-30)

> **Document PhD-grade** consolidant l'architecture finale après le refacto du 30 avril 2026.
> Lis ce fichier en premier pour comprendre comment dispatcher du code dans Silver Oak OS.

---

## 🎯 TL;DR (caveman style)

```
2 modes. 1 router. 0 Anthropic API.

Mode 1 = tmux Pro Max forfait $0/h (4 sessions: claude-code, claude-backend, claude-frontend, opus)
Mode 2 = LLM API non-Anthropic (12 adapters: openai, deepseek, google, xai, mistral, ...)

Router unique = silver-oak-os/src/agents/maestro_dispatcher.ts::dispatchToMaestro()
```

---

## 📐 Diagramme architecture

```
                        Karim → Cowork
                              ↓
         ┌────────────────────┴────────────────────┐
         ↓                                         ↓
    MCP Bridge                              dispatchToMaestro()
    (Factory:3004)                          (silver-oak-os runtime)
         ↓                                         ↓
    77 tools                              ┌────────┴────────┐
    incl. send_to_session,                ↓                 ↓
    dispatch_to_api                   Mode 1            Mode 2
    (deprecated for                   tmux               API
    direct MCP calls)                    ↓                 ↓
                                  ┌──────┴──────┐    callLLM()
                                  ↓             ↓     ↓
                            claude-backend   opus    12 adapters
                            (Sonnet 4.6)   (Opus 4.7) (Anthropic
                            $0/h forfait   $0/h        DISABLED)
```

---

## 🔧 Composants

### 1. MCP Bridge Factory (port 3004)

- **Path** : `/app/mcp-bridge-factory/`
- **GitHub** : `kouajjou/mcp-bridge-factory` (private, master 525fe0f)
- **PM2** : `mcp-bridge-factory`
- **77 tools** dont :
  - `send_to_session` (claude-code/backend/frontend/opus)
  - `read_session_output`, `restart_session`, `kill_session`
  - `dispatch_to_api` (DEPRECATED pour code silver-oak-os, gardé pour MCP standalone)
  - `git_status`, `git_commit_push`, `tsc_errors`, `pm2_logs`, `run_command`
  - `agent_status`, `alex_chat`, `memory_search`, `auto_recover`

### 2. Mode 1 — 4 sessions tmux Pro Max

| Session | Modèle | Coût | CWD |
|---|---|---|---|
| `claude-code` | `claude-sonnet-4-6` | $0/h forfait | `/app/silver-oak-os` |
| `claude-backend` | `claude-sonnet-4-6` | $0/h forfait | `/app/silver-oak-os` |
| `claude-frontend` | `claude-sonnet-4-6` | $0/h forfait | `/app/silver-oak-os/frontend` |
| `opus` | `claude-opus-4-7` | $0/h forfait | `/app/silver-oak-os` |

- **User** : `claudeclaw` (uid 1000) — login Pro Max OAuth `kouajjou@gmail.com`
- **Permission mode** : `auto` (classifier IA Anthropic, mars 2026)
- **Caveman skill** : auto-loaded via `/app/silver-oak-os/CLAUDE.md` always-on snippet
- **Claude CLI** : 2.1.123 (latest)

### 3. Mode 2 — 12 LLM API adapters

Path : `/app/silver-oak-os/src/adapters/llm/`

| Adapter | API key env | Status (2026-04-30) |
|---|---|---|
| `anthropic` | — | 🔴 **HARD DISABLED** (zero-anthropic policy) |
| `openai` | `OPENAI_API_KEY` | ✅ Available |
| `deepseek` | `DEEPSEEK_API_KEY` | ✅ Available (balance épuisé attention) |
| `google` (Gemini) | `GOOGLE_API_KEY` | ✅ Available |
| `xai` (Grok) | `XAI_API_KEY` | ✅ Available |
| `mistral` | `MISTRAL_API_KEY` | ❌ Key absente |
| `cohere` | `COHERE_API_KEY` | ❌ Key absente |
| `together` | `TOGETHER_API_KEY` | ❌ Key absente |
| `groq` | `GROQ_API_KEY` | ❌ Key absente |
| `qwen` | `QWEN_API_KEY` | ✅ Available |
| `minimax` | `MINIMAX_API_KEY` | ❌ Key absente |
| `perplexity` | `PERPLEXITY_API_KEY` | ✅ Available |

**6/12 providers disponibles. Anthropic interdit.**

### 4. Router unique : `dispatchToMaestro()`

Path : `/app/silver-oak-os/src/agents/maestro_dispatcher.ts`

```typescript
import { dispatchToMaestro } from './src/agents/maestro_dispatcher.js';

// Mode 2 explicite
const r1 = await dispatchToMaestro({
  task_description: 'Question courte',
  user_id: 'agent-name',
  preferred_provider: 'google',  // ou openai, deepseek, xai, qwen, perplexity
  max_tokens: 500,
});

// Mode 1 forcé (Pro Max claude-backend/opus)
const r2 = await dispatchToMaestro({
  task_description: 'Tâche complexe avec code',
  user_id: 'agent-name',
  mode: 'mode_1_tmux',
});

// Auto-routing (default Mode 2 si USE_MAESTRO_PRO_MAX=false)
const r3 = await dispatchToMaestro({
  task_description: 'Tâche x',
  user_id: 'agent-name',
});
```

Le routeur :
- Si `task.mode === 'mode_1_tmux'` → Mode 1 tmux Pro Max
- Sinon, si `USE_MAESTRO_PRO_MAX=true` (env) → Mode 1
- Sinon → Mode 2 API

---

## 🔐 Politique zero-Anthropic (2026-04-30)

**RÈGLE ABSOLUE** : aucun appel direct à `api.anthropic.com` depuis Silver Oak OS.

Implementation :
1. ✅ `ANTHROPIC_API_KEY` commentée dans `/app/silver-oak-os/.env`
2. ✅ `anthropicAdapter.available = false` (HARD DISABLED)
3. ✅ `anthropicAdapter.call()` throw immédiat avec message explicite
4. ✅ `dispatchToApi(provider='anthropic'|'claude')` throw immédiat
5. ✅ Mode 1 (tmux Pro Max OAuth claudeclaw) = seul moyen autorisé d'utiliser Claude

**Tout passage par Anthropic API = quota Pro Max gaspillé + facture inattendue.**

---

## ⚙️ Variables d'environnement clés

Dans `/app/silver-oak-os/.env` :

```bash
# Bridge MCP local (PAS https://mcp.silveroak.one — c'est Claudette)
MCP_BRIDGE_URL=http://127.0.0.1:3004

# Mode default : false → Mode 2 par défaut, true → Mode 1 forcé
USE_MAESTRO_PRO_MAX=false

# Anthropic API : DESACTIVEE (commentée)
# ANTHROPIC_API_KEY=DISABLED-2026-04-30-zero-anthropic-policy

# API keys actives
GOOGLE_API_KEY=...
OPENAI_API_KEY=...
DEEPSEEK_API_KEY=...
XAI_API_KEY=...
QWEN_API_KEY=...
PERPLEXITY_API_KEY=...
```

---

## 📦 Tests E2E validés (2026-04-30)

### Test 1 — Mode 2 Gemini
```
Provider: google | Cost: $0.000017 | Latency: 894ms | Success: true
```

### Test 2 — Mode 1 forced (Opus tmux)
```
Provider: null (Pro Max) | Cost: $0 | Latency: 66s | Success: true
Output: "● pong\n● Bash(echo TASK_DONE...)" — SOP V26 injected automatiquement
```

### Test 3 — Bash auto-mode classifier
```
mkdir -p /app/audits/rapports && echo TASK_DONE → exécuté sans prompt utilisateur
```

---

## 🚨 Gotchas connus

1. **`MCP_BRIDGE_URL` default = `https://mcp.silveroak.one`** (Claudette bridge legacy).
   → Toujours fixer à `http://127.0.0.1:3004` côté Factory dans `.env`.

2. **`process.env` figé au top-level import**.
   → Toujours charger `.env` AVANT `import` des modules qui lisent `process.env` au top-level.

3. **`USE_MAESTRO_PRO_MAX=true`** override `task.mode='mode_2_api'`.
   → Default `false`, n'utilise `true` que si tu veux forcer tout en Mode 1.

4. **Bridge 502 transitoire** après reload PM2.
   → Attendre 2-3s avant de retester.

5. **`pm2 restart all` INTERDIT**.
   → Toujours `pm2 reload <name> --update-env`.

6. **Sessions tmux Mode 1** appartiennent à `claudeclaw` (uid 1000), socket `/tmp/tmux-1000/default`.
   → Pour debug manuel : `sudo -u claudeclaw tmux ls`.

---

## 🔗 Références code

| Fichier | Role |
|---|---|
| `/app/silver-oak-os/src/agents/maestro_dispatcher.ts` | **Router unique** Mode 1 ↔ Mode 2 |
| `/app/silver-oak-os/src/agents/maestro_orchestrator.ts` | Classifier complexité (length<150 → Mode 2) |
| `/app/silver-oak-os/src/services/cli_tmux_dispatcher.ts` | Mode 1 implementation (HTTP /dispatch + MCP poll) |
| `/app/silver-oak-os/src/adapters/llm/index.ts` | `callLLM()` + `getAvailableProviders()` |
| `/app/silver-oak-os/src/adapters/llm/anthropic.ts` | HARD DISABLED |
| `/app/silver-oak-os/CLAUDE.md` | SOP injection (incl. Caveman snippet) |
| `/app/mcp-bridge-factory/src/core/SessionManager.ts` | 4 sessions Mode 1 + permission-mode auto |
| `/app/mcp-bridge-factory/src/tools/silverOak.ts` | `dispatchToApi` (DEPRECATED for new code) |

---

## 🎓 Pour Cowork — règles de dispatch

Quand tu veux que Maestro fasse coder quelque chose :

```typescript
// Si tâche complexe (refacto, multi-fichier, architecture)
await dispatchToMaestro({
  task_description: '...',
  user_id: 'cowork',
  mode: 'mode_1_tmux',  // → claude-backend ou opus tmux Pro Max
});

// Si tâche courte (Q/A, summary, classification)
await dispatchToMaestro({
  task_description: '...',
  user_id: 'cowork',
  preferred_provider: 'google',  // → Gemini Flash (le moins cher)
});
```

**Tu n'as JAMAIS besoin de :**
- ❌ Appeler `api.anthropic.com` directement
- ❌ Utiliser `anthropicAdapter` (HARD DISABLED)
- ❌ Choisir entre `dispatchToApi` et `dispatchToMaestro` (utilise toujours `dispatchToMaestro`)
- ❌ Demander à Karim "va sur Termius" (Cowork peut tout faire via MCP)

---

**Document maintenu par Cowork. Dernière update : 2026-04-30 09:30 UTC.**
