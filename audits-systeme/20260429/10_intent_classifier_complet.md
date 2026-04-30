# Audit 8/8 — Intent Classifier complet
**Date** : 2026-04-29  
**Fichier** : `/app/silver-oak-os/src/agents/intent_classifier.ts`

---

## Architecture générale

```
classifyIntent(message)
  │
  ├─ 1. Cache hit? → return cached result [cached]
  │
  ├─ 2. Regex fast-path (instant, $0)
  │   ├─ SIMPLE_QUESTION_PATTERNS → { intent: 'simple_question', confidence: 0.95 }
  │   ├─ TECHNICAL_TASK_PATTERNS (≥2 matches) → { intent: 'technical_task', confidence: 0.85 }
  │   └─ message < 30 chars + 0 tech keywords → { intent: 'simple_question', confidence: 0.75 }
  │
  ├─ 3. LLM claude-haiku-4-5 via SDK (5s timeout)
  │   └─ JSON: { intent, confidence, reasoning }
  │
  └─ 4. Timeout fallback → { intent: 'simple_question', confidence: 0.5 }
```

---

## Types

```typescript
export type IntentType = 'simple_question' | 'technical_task' | 'unknown';

export interface IntentResult {
  intent: IntentType;
  confidence: number;      // 0.0–1.0
  reasoning: string;
  cost_usd: number;        // toujours 0 ($0 SDK forfait)
}
```

---

## Regex fast-path

### SIMPLE_QUESTION_PATTERNS (6 patterns)
```
bonjour|bonsoir|salut|hello|hi|hey|coucou
comment tu vas|how are you
merci|thanks|ok|d'accord|parfait|super|génial|cool
oui|non|yes|no|peut-être|maybe
présente-toi
qui es-tu|who are you|what are you
```

### TECHNICAL_TASK_PATTERNS (5 patterns)
```
déploie|deploy|refactor|corrige|fix|debug|migre|install
pr|pull request|commit|push|branch|merge
bug|erreur|error|crash|broken|failed
code|script|function|class|module|api|endpoint
pm2|docker|nginx|redis|supabase|database|db
```

Seuil : **≥ 2 matches** → technical_task (confidence 0.85)

---

## Cache

- Clé : 200 premiers caractères du message
- TTL : 5 minutes
- Max : 100 entrées (FIFO)
- Retour : result +  [cached] dans reasoning

---

## LLM fallback

```typescript
model: 'claude-haiku-4-5'   // via Claude Code SDK, $0 forfait
maxTurns: 1
timeout: 5000ms             // Promise.race avec null fallback
// System prompt : classify into simple_question or technical_task, JSON only
// Sortie attendue : {intent: ..., confidence: 0.95, reasoning: ...}
```

---

## Gap critique pour délégation multi-agent

**Problème** : Le classifier est **binaire** — il ne reconnaît que 2 intents :
- `simple_question` → callProMax direct (Alex répond lui-même)
- `technical_task` → maestroHandle (CTO workers)

**Ce qui manque** pour déclencher automatiquement la délégation aux 4 agents :

| Intent manquant | Agent cible | Exemples déclencheurs |
|-----------------|------------|----------------------|
| `comms_task` | Sara (comms) | envoie un email, rédige une réponse, check ma boîte |
| `content_task` | Léo (content) | crée un script YouTube, rédige un post LinkedIn |
| `ops_task` | Marco (ops) | planifie un meeting, check mon agenda, padel demain |
| `research_task` | Nina (research) | analyse la concurrence, fais un brief sur, veille IA |

**Flux actuel** :
```
envoie un email à...
  → regex: 0 tech keywords, >30 chars → LLM
  → LLM: simple_question (car pas de code/deploy)
  → Alex répond lui-même ❌ (devrait déléguer à Sara)
```

**Flux souhaité** :
```
envoie un email à...
  → classifyIntent → { intent: 'comms_task', confidence: 0.9 }
  → alexHandle → delegateToAgent('comms', message, ...)
  → Sara + Gmail MCP → email envoyé ✅
```

---

## Évolution requise (non implémentée)

Option A — Étendre IntentType :
```typescript
export type IntentType = 'simple_question' | 'technical_task' | 'comms_task' | 'content_task' | 'ops_task' | 'research_task' | 'unknown';
```

Option B — Routing table dans Alex CLAUDE.md (déjà présent) + parseDelegation auto-inféré depuis le contenu du message (sans classifier LLM). C'est ce que fait main/CLAUDE.md via `delegateToAgent()` dans bot.ts pour les messages `@agentId:` — mais pas pour l'intent implicite.

---

## Statut : DONE 8/8 ✅
