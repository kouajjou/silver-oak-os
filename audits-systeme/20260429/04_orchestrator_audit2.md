# Audit 2/8 — orchestrator.ts
**Date** : 2026-04-29  
**Fichier** : `/app/silver-oak-os/src/orchestrator.ts`  
**Objectif** : Signatures complètes delegateToAgent, getAvailableAgents, parseDelegation, types, exports

---

## Métriques

| Item | Valeur |
|------|--------|
| Lignes totales | 262 |
| Exports fonctions | `initOrchestrator`, `getAvailableAgents`, `parseDelegation`, `delegateToAgent` |
| Exports interfaces | `DelegationResult`, `AgentInfo` |

---

## Imports

```typescript
import { runAgent, UsageInfo } from './agent.js';
import { loadAgentConfig, listAgentIds, resolveAgentClaudeMd } from './agent-config.js';
import { PROJECT_ROOT } from './config.js';
import { logToHiveMind, createInterAgentTask, completeInterAgentTask } from './db.js';
import { logger } from './logger.js';
import { buildMemoryContext } from './memory.js';
```

---

## Types exportés

```typescript
export interface DelegationResult {
  agentId: string;
  text: string | null;
  usage: UsageInfo | null;
  taskId: string;
  durationMs: number;
}

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
}
```

---

## initOrchestrator() — ligne 57

```typescript
export function initOrchestrator(): void {
  const ids = listAgentIds();   // scan filesystem agents/
  agentRegistry = [];
  for (const id of ids) {
    const config = loadAgentConfig(id);  // lit agent.yaml
    agentRegistry.push({ id, name: config.name, description: config.description });
  }
}
// Lancé au démarrage du process
// agentRegistry résultant = ['main','comms','content','ops','research','maestro']
```

---

## getAvailableAgents() — ligne 82

```typescript
export function getAvailableAgents(): AgentInfo[] {
  return [...agentRegistry];
}
// Retourne copie de l'array
// AgentInfo = { id: string, name: string, description: string }
```

---

## parseDelegation() — ligne 98

```typescript
export function parseDelegation(
  message: string,
): { agentId: string; prompt: string } | null

// Patterns supportés :
//   /delegate agentId prompt    → regex: /^\/delegate\s+(\S+)\s+([\s\S]+)/i
//   @agentId: prompt            → regex: /^@(\S+?):\s*([\s\S]+)/
//   @agentId prompt             → regex: /^@(\S+)\s+([\s\S]+)/ (si agentId connu)
```

---

## delegateToAgent() — ligne 145 (FONCTION CLÉE)

```typescript
export async function delegateToAgent(
  agentId: string,           // ID agent cible: 'comms','content','ops','research','maestro'
  prompt: string,            // La tâche à exécuter
  chatId: string,            // ID chat Telegram (pour DB + mémoire)
  fromAgent: string,         // Agent source (ex: 'main')
  onProgress?: (msg: string) => void,  // Callback optionnel progression
  timeoutMs = DEFAULT_TIMEOUT_MS,      // 5 min par défaut
): Promise<DelegationResult>
```

**Ce que la fonction fait** :
1. Vérifie `agentId` dans `agentRegistry` → throw si absent
2. `createInterAgentTask(taskId, fromAgent, agentId, chatId, prompt)` → log DB
3. `logToHiveMind(fromAgent, chatId, 'delegate', ...)` → hive mind log
4. `loadAgentConfig(agentId)` → lit `agent.yaml` réel
5. `resolveAgentClaudeMd(agentId)` → chemin CLAUDE.md → `fs.readFileSync()` → `systemPrompt`
6. `buildMemoryContext(chatId, prompt, agentId)` → mémoire personnalisée
7. `loadSharedResponsibilityMap()` → charge AGENTS.md (7042 bytes)
8. Construit `contextParts` = [AGENTS.md + memory] → injecté dans prompt enrichi
9. `runAgent()` via Claude Code SDK avec config agent complète
10. `completeInterAgentTask(taskId, result)` → update DB
11. Retourne `DelegationResult { agentId, text, usage, taskId, durationMs }`

---

## Mapping pour fix alex_orchestrator.ts

| Nom dans alex_orchestrator | agentId réel dans orchestrator |
|---------------------------|-------------------------------|
| `'sara'` | `'comms'` |
| `'leo'` | `'content'` |
| `'marco'` | `'ops'` |
| `'nina'` | `'research'` |
| `'maestro'` | `'maestro'` |

**Paramètre chatId** : absent dans `AlexAutonomousRequest`. Solution = passer `request.user_id` (string).

**Import à ajouter dans alex_orchestrator.ts** :
```typescript
import { delegateToAgent } from '../orchestrator.js';
```

---

## Statut : DONE 2/8 ✅
