# ADR-002 — Architecture Délégation Native Multi-Agent

**Status** : Accepted
**Date** : 2026-04-25
**Auteur** : Karim Kouajjou — Silver Oak, Marbella
**Implémenté dans** : vision-pipeline-p1 (Wave 1 + Wave 2)

---

## Contexte

Silver Oak OS est une plateforme multi-agent (6 agents : Alex, Sara, Leo, Marco, Nina, Maestro).
Avant cette décision, la délégation entre agents était hardcodée ou absente.

**Alternatives évaluées :**

1. ChatGPT Plugins — verrouillage vendeur, coût supérieur
2. Routing hardcodé — ne passe pas à l'échelle
3. Délégation native via Anthropic SDK (choix retenu) — traçable, découplée, scalable

---

## Décision

Deux primitives dans orchestrator.ts :

- parseDelegation(response) : DelegationIntent | null
- delegateToAgent(targetAgent, message, depth) : Promise<AgentResponse>

Protection anti-boucle : AbortController avec DEFAULT_TIMEOUT_MS = 5 * 60 * 1000 par délégation.
Attribution UI : préfixe "Agent -> Pair:" visible dans le chat.

---

## Conséquences positives

- Traçabilité hive_mind via ActivityFeed
- Attribution visible UX (utilisateur voit qui répond)
- Scalable : ajouter un agent = créer CLAUDE.md + agent.yaml, zéro modif du routing
- Testable : Playwright E2E validé W3.1-W3.5 (2026-04-25)

---

## Conséquences négatives

- Latence : +2-5s par hop de délégation (appel LLM supplémentaire)
- Coût : ~2x tokens par délégation vs réponse directe
- DelegationTrace : wiring UI partiellement complet (backlog Wave 4)
- max_delegation_depth : protection temporelle (5min) plutôt que structurelle (hops)

---

## Migration future

Pour ajouter un nouvel agent :
1. Créer src/agents/X/CLAUDE.md (persona, compétences)
2. Créer src/agents/X/agent.yaml (configuration)
3. Ajouter la route /agent/X dans Next.js
Aucune modification de orchestrator.ts requise.

---

## Rollback

git checkout pre-wave1-merge-20260425_205358

---

## Références

- Tests E2E : tests/e2e/auto-delegation-alex-marco.spec.ts
- Tests trilingues : tests/e2e/trilingual.spec.ts
- Tests anti-boucle : tests/e2e/max-delegation-depth.spec.ts
- Smoke regression : tests/e2e/regression-6-agents.spec.ts
