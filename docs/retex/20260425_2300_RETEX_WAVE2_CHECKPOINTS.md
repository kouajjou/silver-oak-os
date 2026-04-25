# 📋 RETEX — Wave 2 Divergence Checkpoints HITL

**Date**: 2026-04-25 23:00 UTC
**Sévérité**: Mineure (résultat livré, process imparfait)

## INCIDENT
Maestro a envoyé 1 Telegram final au lieu de 3 checkpoints HITL temps réel demandés par Karim.

## ROOT CAUSE
Prompt Maestro contenait 2 règles contradictoires (mode nuit autonome "1 Telegram final" du draft initial vs 3 checkpoints HITL ajustés par Karim après) — Maestro a suivi la première sans détecter la contradiction.

## FIX FUTUR
Règle ajoutée à la SOP Maestro: avant chaque Wave, lister explicitement les checkpoints HITL temps réel attendus dans une section dédiée "## CHECKPOINTS" en tête du prompt, et Maestro doit les confirmer dans son ack. Si contradiction détectée → STOP + clarification HITL.

## IMPACT RÉEL
Mineur — Wave 2 livrée 5/5 vert, 0 régression, 0 budget dépassé. Mais Karim n'a pas pu valider intermédiaire, perte de capacité de pilotage temps réel.

## DÉCISION KARIM
Hybride pragmatique: Wave courte (<2h, faible risque) → 1 Telegram final OK. Wave longue (>2h) OU touche orchestrator/DB → checkpoints HITL obligatoires. Règle écrite dans userMemories Cowork.

---

## Annexe — Détection automatique (pour Maestro futur)

Avant chaque Wave, Maestro doit:
1. Estimer durée totale (somme sous-tâches)
2. Identifier si touche orchestrator.ts / db.ts / agents/*/CLAUDE.md
3. Si durée >2h OU touche fichier critique → mode CHECKPOINTS HITL obligatoire
4. Ack à Karim au début: "Wave X durée estimée Yh, checkpoints HITL: oui/non, raison: Z"

Cette ack permet de catch les contradictions de prompt AVANT exécution.
