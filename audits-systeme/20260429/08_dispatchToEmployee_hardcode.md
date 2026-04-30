# Audit 6/8 — dispatchToEmployee() code complet
**Date** : 2026-04-29  
**Fichier** : `/app/silver-oak-os/src/agents/alex_orchestrator.ts` lignes 130–152

---

## Code complet

```typescript
// lignes 130–152
async function dispatchToEmployee(employee: string, task: BrokenDownTask): Promise<DispatchResult> {
  const EMPLOYEE_PROMPTS: Record<string, string> = {
    sara:  'You are Sara, marketing expert for Silver Oak OS. Execute marketing tasks: copy, campaigns, growth.',
    leo:   'You are Leo, design expert for Silver Oak OS. Execute design tasks: UI/UX, visuals, layouts.',
    marco: 'You are Marco, finance expert for Silver Oak OS. Execute finance tasks: budgets, analysis, projections.',
    nina:  'You are Nina, data expert for Silver Oak OS. Execute data tasks: analytics, reports, pipelines.',
  };

  const sys = EMPLOYEE_PROMPTS[employee] ?? `You are ${employee}, an expert assistant for Silver Oak OS.`;
  const start = Date.now();

  try {
    // archived: callLLM({ provider: 'deepseek', model: 'deepseek-chat' }) -- PAYANT
    const fullPrompt = sys + '\n\nTask: ' + task.description;
    const resultContent = await callProMax(fullPrompt, getModelForAgent('nina')); // Haiku for employee tasks

    return { result: resultContent, cost_usd: 0, latency_ms: Date.now() - start, success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ employee, error: msg }, 'alex.employee.fail');
    return { result: `Employee ${employee} error: ${msg}`, cost_usd: 0, latency_ms: Date.now() - start, success: false };
  }
}
```

---

## Analyse des bugs

### Bug 1 — Descriptions fausses

| employee | Prompt hardcodé | Rôle réel (agent.yaml + CLAUDE.md) |
|----------|-----------------|-------------------------------------|
| `sara` | marketing expert... copy, campaigns, growth | Sara = Communications — Gmail, email drafts, outreach, inbox triage |
| `leo` | design expert... UI/UX, visuals, layouts | Léo = Content production — YouTube scripts, LinkedIn posts, content calendar |
| `marco` | finance expert... budgets, analysis, projections | Marco = Operations — Google Calendar, Hetzner infra, padel scheduling |
| `nina` | data expert... analytics, reports, pipelines | Nina = Research — AI competition, RGPD/AI Act, competitive intel |

### Bug 2 — Model hardcodé sur 'nina' pour tous

```typescript
getModelForAgent('nina')  // Pour TOUS les employees, même sara/leo/marco
```

Commentaire dit Haiku for employee tasks — toujours `claude-sonnet-4-6` en réalité (tous les agents.yaml utilisent sonnet), donc impact nul sur le modèle mais binding conceptuellement faux.

### Bug 3 — ZÉRO context réel injecté

Ce qui manque vs `delegateToAgent()` réel :

| Fonctionnalité | dispatchToEmployee | delegateToAgent |
|----------------|-------------------|-----------------|
| CLAUDE.md SoulPrompt | ❌ Ignoré | ✅ fs.readFileSync |
| MCPs (Gmail/Calendar/YouTube/Web) | ❌ Absent | ✅ loadAgentConfig() |
| Mémoire buildMemoryContext | ❌ Absent | ✅ buildMemoryContext() |
| AGENTS.md shared map | ❌ Absent | ✅ loadSharedResponsibilityMap() |
| DB log createInterAgentTask | ❌ Absent | ✅ createInterAgentTask() |
| DB completeInterAgentTask | ❌ Absent | ✅ completeInterAgentTask() |

### Bug 4 — Fallback inconnu silencieux

```typescript
// Si employee inconnu → string générique, pas d'erreur
const sys = EMPLOYEE_PROMPTS[employee] ?? `You are ${employee}, an expert assistant...`;
```

---

## Fix en 3 lignes

```typescript
import { delegateToAgent } from '../orchestrator.js';

const NAME_TO_AGENT_ID: Record<string, string> = {
  sara: 'comms', leo: 'content', marco: 'ops', nina: 'research',
};

// Remplacer dispatchToEmployee() par :
const agentId = NAME_TO_AGENT_ID[employee];
if (!agentId) return { result: `Unknown employee: ${employee}`, ... };
const result = await delegateToAgent(agentId, task.description, request.user_id, 'main');
return { result: result.text ?? '', cost_usd: 0, latency_ms: result.durationMs, success: !!result.text };
```

---

## Statut : DONE 6/8 ✅
