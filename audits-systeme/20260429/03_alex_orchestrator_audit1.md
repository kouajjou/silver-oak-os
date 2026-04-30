# Audit 1/8 — alex_orchestrator.ts
**Date** : 2026-04-29  
**Fichier** : `/app/silver-oak-os/src/agents/alex_orchestrator.ts`  
**Objectif** : Audit ciblé — imports, exports, maestroHandle, delegateToAgent, dispatchToEmployee, intent classifier

---

## Métriques

| Item | Valeur |
|------|--------|
| Lignes totales | 541 |
| Exports fonctions | `alexHandle`, `alexHandleAutonomous` |
| Exports interfaces | `AlexRequest`, `AlexResponse`, `AlexAutonomousRequest`, `AlexAutonomousResponse` |
| Export default | `alexHandle` |

---

## Imports clés

| Import | Source | Note |
|--------|--------|------|
| `query` | `@anthropic-ai/claude-agent-sdk` | SDK Claude Code — $0 forfait Karim |
| `classifyIntent` | `./intent_classifier.js` | Binaire: simple_question / technical_task |
| `dispatchToMaestro` | `./maestro_dispatcher.js` | Fallback legacy |
| `maestroHandle` | `./maestro_orchestrator.js` | V3 Phase 5B.3 — principal |
| `breakDownTasks` | `./task_breaker.js` | Décomposition tâches autonomes |
| `llmJudge` | `../services/llm_judge.js` | Gemini cross-LLM (SOP R14) |
| `dispatchToTmuxSession` | `../services/cli_tmux_dispatcher.js` | Dispatch tmux |
| ❌ `delegateToAgent` | **NON IMPORTÉ** | GAP CRITIQUE |
| ❌ `getAvailableAgents` | **NON IMPORTÉ** | GAP CRITIQUE |

---

## Flux alexHandle() — V1 (lignes ~156–291)

```
classifyIntent(message)
  └─ intent === 'technical_task' && confidence > 0.6
       ├─ maestroHandle(message)           ← V3 Phase 5B.3 (ligne 174)
       │   └─ catch → dispatchToMaestro()  ← fallback legacy (ligne 205)
       └─ else → callProMax(message, model) ← direct Claude Code SDK
```

---

## Flux alexHandleAutonomous() — V2 (lignes ~292+)

```
breakDownTasks(message)
  └─ for each task:
       ├─ task.agent_target === 'maestro'
       │   └─ maestroHandle(task.description)       ← ligne 399
       ├─ task.agent_target in ['sara','leo','marco','nina']
       │   └─ dispatchToEmployee(agent, task)        ← HARDCODED PROMPTS (ligne 410)
       └─ else → 'Unknown agent target'
```

---

## ⚠️ BUG CRITIQUE — dispatchToEmployee() (lignes 130–152)

```typescript
const EMPLOYEE_PROMPTS: Record<string, string> = {
  sara:  'You are Sara, marketing expert for Silver Oak OS...',  // ❌ ≠ agent.yaml: Communications Officer / comms
  leo:   'You are Leo, design expert for Silver Oak OS...',     // ❌ ≠ agent.yaml: Content Creator / content
  marco: 'You are Marco, finance expert for Silver Oak OS...', // ❌ ≠ agent.yaml: Operations Manager / ops
  nina:  'You are Nina, data expert for Silver Oak OS...',     // ❌ ≠ agent.yaml: Research Analyst / research
};

// Model hardcodé pour TOUS les employés :
const resultContent = await callProMax(fullPrompt, getModelForAgent('nina'));
// ↑ 'nina' hardcodé — pas le bon model pour sara/leo/marco
```

**Résumé des gaps** :
- ❌ Descriptions fausses (ne correspondent pas aux `agent.yaml` réels)
- ❌ Model hardcodé `getModelForAgent('nina')` pour tous — au lieu de `getModelForAgent(employee)`
- ❌ ZÉRO CLAUDE.md chargé (les SoulPrompts trilingues FR/ES/EN sont ignorés)
- ❌ ZÉRO MCPs (les outils Gmail/Calendar/YouTube sont absents)
- ❌ ZÉRO mémoire (buildMemoryContext non appelé)
- ❌ ZÉRO AGENTS.md (shared responsibility map non injectée)
- ❌ ZÉRO DB log (createInterAgentTask non appelé)

---

## Fix requis

1. Importer `delegateToAgent` depuis `../orchestrator.js`
2. Ajouter mapping nom→agentId :
   ```typescript
   const NAME_TO_AGENT_ID: Record<string, string> = {
     sara: 'comms', leo: 'content', marco: 'ops', nina: 'research',
   };
   ```
3. Remplacer `dispatchToEmployee()` par appel `delegateToAgent(agentId, task.description, request.user_id, 'main')`

---

## Statut : DONE 1/8 ✅
