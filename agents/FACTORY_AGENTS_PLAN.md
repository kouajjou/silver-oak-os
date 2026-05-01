# Silver Oak OS — Factory Agents Plan

> **Statut** : Document de référence — vivant. Mis à jour à chaque ajout d'agent.
> **Dernière révision** : 1er mai 2026 (sprint dynamic routing)

---

## Vision

Silver Oak OS est une **usine à produits SaaS**, pas un projet ponctuel.
C'est une **infrastructure réutilisable** capable de lancer N produits sans réécriture du noyau.

**Principe fondateur** : Karim parle → Alex dispatche → l'équipe exécute.

L'usine doit fonctionner sans que Karim touche au code à chaque fois qu'on ajoute un nouvel agent.

---

## 11 agents permanents

### Noyau opérationnel (6 agents — EXISTANTS)

| Agent | Rôle | Statut |
|-------|------|--------|
| `main` (Alex) | Chief of Staff, routing dynamique, orchestration | ✅ |
| `maestro` | CTO + 18 code workers (MCP Bridge tmux + LLM API) | ✅ |
| `comms` (Sara) | Communications, Gmail, support client, outreach | ✅ |
| `content` (Léo) | Content, YouTube, LinkedIn, marketing | ✅ |
| `ops` (Marco) | Operations, Calendar, Finance, Hetzner, padel | ✅ |
| `research` (Nina) | Research, Deep Research Grok+Gemini, intel, veille | ✅ |

### À créer (5 agents — PROCHAINS SPRINTS)

| Agent | Rôle | Priorité |
|-------|------|----------|
| `sales` (Elena) | Sales, growth, prospects, CRM, onboarding | P1 |
| `product` (Sophie) | Product Manager, UX, specs, roadmap, wireframes | P1 |
| `analytics` (Lina) | Analytics, KPIs, métriques, funnels, data | P2 |
| `legal` (Jules) | Legal, RGPD, contrats, CGV, compliance | P2 |
| `browser` | Web Operator, navigation, scraping, screenshots, clic | P2 |

---

## Règle d'ajout d'un nouvel agent

**Workflow type (zéro code)** :

1. Créer `agents/<id>/agent.yaml` avec :
   - `name` : nom d'affichage
   - `description` : phrase claire qui aide le routeur LLM à comprendre le scope
   - `model` : modèle Claude par défaut
   - `botTokenEnv` (optionnel) : sous-bot Telegram
2. Créer `agents/<id>/CLAUDE.md` :
   - Identity (1er paragraphe : "You are X, the Y agent...")
   - Skills, tools, MCPs autorisés
   - Section Hive mind (logger SQLite)
   - Memory section (rappel des deux systèmes : session + DB)
3. Reload : `pm2 reload silver-oak-os-backend --update-env`

L'agent apparaît automatiquement :
- Dans la War Room (`/api/warroom/agents` lit le registre)
- Dans le dashboard (via `listAgentIds()` qui scanne le dossier `agents/`)
- Dans le routing d'Alex (via `getAvailableAgents()` côté `classifyDomainRoute`)

**Aucune modification de code requise** — c'est ça l'avantage de la factory.

---

## Mécanique du routing dynamique d'Alex

Implémenté dans `src/agents/alex_orchestrator.ts` :

1. **classifyIntent** (binary) : simple_question vs technical_task
   - Si `technical_task` → `maestroHandle()` (route vers Maestro CTO)
2. **classifyDomainRoute** (factory routing dynamique) :
   - **Tentative 1 — LLM** : `classifyDomainRouteDynamic` consulte `getAvailableAgents()`,
     construit un prompt qui liste les agents et leurs descriptions, demande à Pro Max
     (Mode 1 tmux, $0) "quel agent est le plus approprié ?". Validation stricte : 
     l'id retourné doit exister dans le registre, sinon fallback.
   - **Tentative 2 — Regex fallback** : `classifyDomainRouteRegex` (score-based)
     pour les mots-clés évidents (email, youtube, calendrier, etc.). Garde-fou
     en cas d'échec LLM, timeout (8s), ou réponse 'none'.
3. Si aucune route trouvée → Alex répond directement (mode CLI Pro Max ou API).

**Anti-loop** :
- `main` (Alex) et `maestro` sont exclus du registre dynamique
  (Alex ne se délègue pas à lui-même; Maestro est routé par classifyIntent)
- `max_delegation_depth: 3` (chain Alex → A → B → C max)

---

## Patterns de routing prévus pour les futurs agents

À titre indicatif — le routeur LLM dynamique apprend des `description` dans agent.yaml.
Pour bien router, il suffit d'écrire des descriptions précises :

| Type de demande | Agent cible |
|---|---|
| email / inbox / gmail / outreach | comms (Sara) |
| youtube / linkedin / post / contenu | content (Léo) |
| agenda / calendrier / finance / padel / hetzner | ops (Marco) |
| recherche / research / veille / benchmark | research (Nina) |
| code / bug / deploy / tech / worker | maestro |
| vente / client / prospect / deal / CRM | sales (Elena) — à créer |
| product / feature / spec / UX / roadmap | product (Sophie) — à créer |
| métrique / KPI / analytics / funnel | analytics (Lina) — à créer |
| contrat / RGPD / légal / CGV | legal (Jules) — à créer |
| navigue / clique / scrape / screenshot | browser — à créer |

---

## Garanties de stabilité

- Le routeur dynamique est **non-bloquant** : timeout 8s, fallback regex toujours actif
- Tous les ids sont validés contre le registre avant délégation
- Les 412 tests existants restent verts (412/412 passed | 5 skipped)
- Aucun changement breaking — l'ancien comportement regex est préservé en fallback

---

## Sprints à venir

- **N+1** : Créer Elena (sales) + Sophie (product) avec leur agent.yaml + CLAUDE.md
- **N+2** : Lina (analytics) + Jules (legal)
- **N+3** : Browser agent (Web Operator pattern, Playwright + screenshots)
- **N+4** : Test charge — 11 agents simultanés, mesurer latence Alex routing
