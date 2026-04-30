# Audit 7/8 — parseDelegation + bot.ts Telegram
**Date** : 2026-04-29  
**Fichiers** : `/app/silver-oak-os/src/orchestrator.ts` + `src/bot.ts`

---

## parseDelegation() — Patterns supportés

```typescript
// orchestrator.ts lignes 98–128
export function parseDelegation(message: string): { agentId: string; prompt: string } | null

// Pattern 1 : commande explicite
/^\/delegate\s+(\S+)\s+([\s\S]+)/i
// ex: /delegate comms envoie un email à...

// Pattern 2 : @agentId: avec deux-points
/^@(\S+?):\s*([\s\S]+)/
// ex: @sara: rédige une réponse à...

// Pattern 3 : @agentId sans deux-points (seulement si agentId connu dans registry)
/^@(\S+)\s+([\s\S]+)/
// ex: @nina recherche les dernières news sur...
// → validé via agentRegistry.some((a) => a.id === candidate) — anti-faux-positifs
```

---

## Comment bot.ts utilise parseDelegation

**Import** (bot.ts ligne 47) :
```typescript
import { parseDelegation, delegateToAgent, getAvailableAgents } from './orchestrator.js';
```

**Usage** (bot.ts lignes 431–444) :
```typescript
// ── Delegation detection ────────────────────────────────────────────
// Intercept @agentId or /delegate syntax before running the main agent.
const delegation = parseDelegation(message);
if (delegation) {
  setProcessing(chatIdStr, true);
  await sendTyping(ctx.api, chatId);
  try {
    const delegationResult = await delegateToAgent(
      delegation.agentId,
      delegation.prompt,
      // ... (chatId, fromAgent etc.)
    );
```

---

## Architecture de délégation Telegram (bot.ts)

```
Message Telegram entrant
  ↓
parseDelegation(message)
  ├─ match @agentId: / @agentId / /delegate → delegateToAgent() via orchestrator.ts
  │   ├─ Charge CLAUDE.md réel
  │   ├─ MCPs réels
  │   ├─ Mémoire + AGENTS.md
  │   └─ runAgent() SDK → réponse complète
  └─ pas de match → alexHandle() (intent classifier → maestro ou callProMax)
```

---

## Dissymétrie Telegram vs alexHandleAutonomous

| Chemin | parseDelegation | delegateToAgent | CLAUDE.md réel | MCPs |
|--------|-----------------|-----------------|----------------|------|
| **bot.ts Telegram** | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui |
| **alexHandleAutonomous (API)** | ❌ Non | ❌ Non | ❌ Non | ❌ Non |

**Conclusion** : Un utilisateur qui tape `@sara: envoie un email` sur Telegram obtient la vraie Sara (Gmail MCP, CLAUDE.md). Mais si Maestro dispatche une tâche via `alexHandleAutonomous()` (API /api/chat), Sara reçoit un prompt hardcodé marketing expert sans Gmail. **Rupture de cohérence totale entre Telegram et l'API autonome.**

---

## Logs délégations réelles

Aucun log de délégation `@agent:` dans journalctl sur les 7 derniers jours — soit la feature n'a pas été utilisée en prod, soit les logs sont dans pm2/app logs plutôt que journald.

---

## Statut : DONE 7/8 ✅
