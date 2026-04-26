# AgentFactory Gap Analysis — Silver Oak OS

**Date** : 2026-04-25
**Auteur** : @api-backend subagent (Claudette / Silver Oak)
**Branche** : feature/docs-agent-factory-gap
**Basé sur** : analyse READ-ONLY du code source, agents/, src/, docs/

---

## État actuel

### Ce qui existe aujourd'hui

Silver Oak OS dispose d'un système multi-agent **statique** composé de 6 agents fixes :

| Agent | ID | Rôle | Telegram |
|-------|----|------|----------|
| Alex | `main` | Chief of Staff, triage + délégation | Bot principal |
| Sara | `comms` | Communications, Gmail | Bot dédié |
| Léo | `content` | Contenu YouTube / LinkedIn | Bot dédié |
| Marco | `ops` | Calendrier, finance, infra | Bot dédié |
| Nina | `research` | Recherche, veille, analyse | Bot dédié |
| Maestro | `maestro` | CTO, orchestration 18 workers MCP | Bot dédié |

### Architecture de délégation (ADR-002, Wave 1-3, avril 2026)

**Orchestrateur** (`src/orchestrator.ts`) :
- `initOrchestrator()` : scan statique du dossier `agents/` au démarrage, charge un registre immuable en mémoire.
- `delegateToAgent(agentId, prompt, ...)` : délégation synchrone in-process via Anthropic SDK, avec AbortController (timeout 5 min).
- `parseDelegation(message)` : routing par syntaxe `@agentId:`, `/delegate agentId`, ou `@agentId` (si dans le registre).
- Protection anti-boucle : `max_delegation_depth: 3` (par depth structurelle dans CLAUDE.md d'Alex).

**Configuration agents** (`src/agent-config.ts`) :
- Chaque agent est un dossier `agents/<id>/` avec `agent.yaml` + `CLAUDE.md`.
- `listAgentIds()` : scan FS à l'init — pas de découverte dynamique à l'exécution.
- `loadAgentConfig(id)` : charge name, description, botToken, model, mcpServers, skillsAllowlist depuis YAML.
- Deux emplacements supportés : `PROJECT_ROOT/agents/` et `CLAUDECLAW_CONFIG/agents/` (externe).

**Création d'agents** (`src/agent-create.ts`) :
- `createAgent(opts)` : crée un dossier agent avec YAML, CLAUDE.md (depuis template), launchd/systemd service.
- Accessible via CLI (`agent-create-cli.ts`) et dashboard web (`dashboard.ts`).
- Limite : **max 20 agents**. Validation ID, token Telegram, collision check.
- Processus : FS write → `.env` update → service OS (launchd macOS / systemd Linux).

**Ce qui NE peut PAS être fait aujourd'hui** :
- Créer un agent à chaud (runtime) sans redémarrage du processus principal.
- Spawner un sous-agent temporaire (TTL) depuis la conversation Telegram.
- Créer automatiquement un "directeur silencieux" par domaine sans intervention manuelle.
- Instancier un agent sans bot Telegram dédié (tous les agents actuels = un bot = un token).
- Orchestration parallèle : délégations séquentielles uniquement (pas de fan-out concurrent).

---

## Vision Karim

D'après les CLAUDE.md, l'architecture conversationnelle, et les patterns SOP Claudette :

### 1. Alex crée des agents à la demande

Karim devrait pouvoir dire à Alex :
> "Crée un agent fiscal qui connaît la législation espagnole."

Alex devrait :
1. Valider la demande (nom, domaine, périmètre).
2. Appeler une primitive `AgentFactory.create({ id, name, soulPrompt, skills })`.
3. L'agent est actif **dans la session courante**, sans redémarrage.
4. L'agent répond sur le même canal Telegram (pas forcément un bot séparé).

### 2. Agents silencieux par directeur (sub-agents)

Chaque directeur (Marco, Nina, Sara…) devrait pouvoir spawner des **micro-agents silencieux** pour des sous-tâches :
> Marco → spawne un agent de réconciliation Stripe → retourne le résultat → agent détruit.

Ces agents n'ont pas de bot Telegram, pas de TTL long : ils sont **éphémères**, orientés tâche.

### 3. Orchestration parallèle (fan-out)

Pour des requêtes complexes, Alex devrait déléguer en parallèle :
> "Nina: analyse le marché" + "Marco: vérifie le budget" → merger les résultats.

Actuellement les délégations sont séquentielles (A → B → C).

### 4. Registre dynamique (hot-reload)

Ajouter un agent ne devrait pas nécessiter `systemctl restart` ou redémarrage du processus Node.js.
Le registre doit être rechargeable à chaud via signal ou API.

---

## Gap

### Gap 1 — Pas d'AgentFactory runtime

**Actuel** : `createAgent()` écrit des fichiers sur FS et crée un service OS. Nécessite redémarrage.
**Manque** : une primitive `AgentFactory.spawn(config)` qui instancie un agent en mémoire, sans FS, sans bot Telegram séparé.

### Gap 2 — Registre statique (init-time only)

**Actuel** : `initOrchestrator()` est appelé une seule fois au démarrage. Nouveaux agents invisibles.
**Manque** : `reloadRegistry()` callable à chaud (API ou IPC signal).

### Gap 3 — Délégation séquentielle uniquement

**Actuel** : `delegateToAgent()` est un appel `await` bloquant. Un seul agent à la fois.
**Manque** : `delegateToAgents(targets[])` avec `Promise.all()` pour fan-out parallèle et merge des résultats.

### Gap 4 — Agents = bots Telegram (1:1 obligatoire)

**Actuel** : chaque agent a un `botTokenEnv` obligatoire dans `agent.yaml`. Pas de token = pas d'agent.
**Manque** : agents "headless" (sans bot) utilisables comme sous-agents internes seulement.

### Gap 5 — Pas de TTL / cycle de vie agent

**Actuel** : un agent créé est permanent jusqu'à `deleteAgent()` manuel.
**Manque** : `AgentFactory.spawn({ ttlMs: 60000 })` — agent auto-détruit après expiration ou completion.

### Gap 6 — Pas de SoulPrompt injection dynamique

**Actuel** : `CLAUDE.md` est un fichier statique chargé à l'init. Immuable en session.
**Manque** : injection de persona dynamique à la création (`soulPrompt: string`) sans passer par le FS.

---

## Plan d'implémentation

### Étape 1 — AgentFactory headless (priorité HAUTE)

**Fichier** : `src/agent-factory.ts` (nouveau)

```typescript
interface SpawnOpts {
  id: string;
  name: string;
  soulPrompt: string;           // persona injectée directement
  mcpServers?: string[];
  ttlMs?: number;               // auto-destroy après N ms
  parentAgentId?: string;       // pour traçabilité hive_mind
}

interface SpawnedAgent {
  id: string;
  delegate: (prompt: string) => Promise<string>;
  destroy: () => void;
}

export async function spawnAgent(opts: SpawnOpts): Promise<SpawnedAgent>;
```

- Pas d'écriture FS, pas de bot Telegram.
- Agent stocké en Map en mémoire (`agentPool: Map<string, SpawnedAgent>`).
- TTL géré via `setTimeout(() => destroy(), ttlMs)`.
- Intégrer dans `orchestrator.ts` : `agentRegistry` enrichi avec les agents spawned.

**DoD** : `spawnAgent()` + `delegateToAgent()` fonctionnel sur agent headless. Test unitaire Vitest.

### Étape 2 — Hot-reload du registre (priorité HAUTE)

**Fichier** : `src/orchestrator.ts` (modification)

- Extraire `initOrchestrator()` en `reloadRegistry()` callable à tout moment.
- Exposer `POST /api/agents/reload` dans `src/api/` (admin-only).
- Ou : écouter `SIGHUP` pour recharger sans downtime.

**DoD** : créer un fichier `agents/fiscal/agent.yaml` → `POST /api/agents/reload` → agent disponible sans restart.

### Étape 3 — Délégation parallèle fan-out (priorité MOYENNE)

**Fichier** : `src/orchestrator.ts` (modification)

```typescript
export async function delegateToAgents(
  targets: Array<{ agentId: string; prompt: string }>,
  chatId: string,
  fromAgent: string,
): Promise<DelegationResult[]>;
```

- `Promise.all()` sur les délégations.
- Merger les résultats dans un objet structuré retourné à l'agent parent.
- Ajouter `onProgress` agrégé pour le feedback UX Telegram.

**DoD** : Alex peut demander à Nina + Marco en parallèle et recevoir les deux réponses merged.

### Étape 4 — Commande Telegram `/new-agent` (priorité MOYENNE)

**Fichier** : skill ou route Telegram dans `src/`

```
/new-agent fiscal "Expert en fiscalité espagnole pour résidents étrangers"
```

- Appelle `spawnAgent()` avec soulPrompt généré ou fourni.
- Répond : "Agent @fiscal créé, TTL 24h. Utilisez @fiscal: votre question."
- Stocke dans hive_mind pour traçabilité.
- Scope : admin Karim uniquement (gate sécurité).

**DoD** : Karim crée un agent via Telegram, le délègue dans la même session, résultat visible.

### Étape 5 — Sous-agents silencieux par directeur (priorité BASSE — Wave 5+)

**Fichier** : CLAUDE.md de chaque directeur + `src/agent-factory.ts`

- Permettre à Marco, Nina, etc. de spawner des micro-agents headless pour sous-tâches.
- Pattern : `const sub = await spawnAgent({ id: 'stripe-reconciler', soulPrompt: '...', ttlMs: 120000 })`.
- Le résultat remonte au directeur, qui le consolide avant de répondre à Alex.
- Contrainte : `max_delegation_depth: 3` toujours respectée (directeur + sub-agent = 2 hops).

**DoD** : Marco spawne un agent Stripe silencieux, récupère la réconciliation, répondà Karim.

---

## Résumé des priorités

| # | Feature | Priorité | Effort | Wave cible |
|---|---------|----------|--------|-----------|
| 1 | AgentFactory headless (spawnAgent) | HAUTE | M | Wave 4 |
| 2 | Hot-reload registre | HAUTE | S | Wave 4 |
| 3 | Délégation parallèle fan-out | MOYENNE | M | Wave 5 |
| 4 | Commande Telegram /new-agent | MOYENNE | S | Wave 5 |
| 5 | Sous-agents silencieux par directeur | BASSE | L | Wave 6+ |

**Contraintes transverses** :
- Respecter `max_delegation_depth: 3` (ADR-002).
- Tout agent spawned loggé dans `hive_mind` (traçabilité).
- Budget cap : un agent headless consomme des tokens LLM — intégrer dans BudgetTracker si activé.
- Sécurité : la commande `/new-agent` est admin-only (gate Telegram).

---

*Document généré le 2026-04-25 — analyse READ-ONLY du code Silver Oak OS v1 (vision-pipeline-p1).*
