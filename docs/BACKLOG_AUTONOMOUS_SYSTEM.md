# BACKLOG Autonomous System — Documentation technique
**Version** : 1.0 | **Date** : 2026-04-26 | Silver Oak OS

---

## Concept

Le BACKLOG System permet à Karim de déposer UN fichier `BACKLOG.md` et de laisser
Maestro l'exécuter en autonomie totale. Plus besoin de formuler des prompts techniques.
Karim parle en langage naturel, Maestro orchestre.

```
Karim écrit BACKLOG.md          Maestro parse + dispatche
──────────────────────    ──►   ─────────────────────────
### T1 [AUTO] Fix bug...        → detect: AUTO, tier T2
- Description: Le bug X...      → worker: aider-deepseek-1  
- Acceptance: 0 erreurs tsc     → dispatch via mcp-dispatch
                                → poll R36 (60s)
                                → rapport Telegram 1 ligne
```

---

## Mots-clés reconnus par le parser

### Niveau d'autonomie (obligatoire par tâche)

| Mot-clé | Comportement |
|---------|-------------|
| `[AUTO]` | Maestro exécute sans demander. Telegram court à la fin. |
| `[NOTIFY]` | Exécute + 1 Telegram mi-parcours + 1 fin. |
| `[HITL]` | Pause immédiate. Branche conservée. Continue les autres. Reprend sur `/resume T-ID`. |

### Sélection worker (optionnel)

Si `Worker suggéré` est absent, Maestro choisit selon la logique :

```
Description contient "audit" ou "review" → audit-gemini-*
Description contient "DB" ou "migration" → HITL auto-upgrade + aider-deepseek-*
Taille estimée > 200 LOC → claude-backend (T1)
Budget cap ≤ $0.30 → aider-deepseek-* (T2)
Tâches parallèles indépendantes → T3 (gpt4o-*, grok-*, deepseek-r1-*)
Défaut → aider-deepseek-1 (T2, économique)
```

### Triggers de délégation (compatibles parseDelegation)

Le format BACKLOG.md est distinct du format `@agent:` de l'orchestrateur. Le parser
BACKLOG génère des appels `delegateToAgent('maestro', fullPrompt, chatId, 'backlog-parser')`.

Karim peut aussi déclencher manuellement via Telegram :
```
@maestro: exécute BACKLOG.md
/delegate maestro exécute le backlog
```

---

## Flux d'exécution

```
1. DETECTION
   ─────────
   Watcher (file / Telegram / API) détecte un BACKLOG.md
   → Parser lit le fichier
   → Extrait métadonnées (budget, durée, HITL réactivité)
   → Extrait tâches en ordre + dépendances

2. PLANIFICATION
   ─────────────
   Parser construit un DAG (graphe de dépendances) :
   T3 + T4 parallèle → T5 attend T3 (first wins) → T6 attend T4

   Anti-acharnement : 2 fails → SKIP + log "BLOCKED_SKIP_2FAILS"
   Budget check : total estimé > cap → HITL Karim avant de commencer

3. DISPATCH (par tâche)
   ─────────────────────
   Pour chaque tâche prête (dépendances résolues) :
   a. Créer task_id = BACKLOG-[waveId]-[T-N]
   b. Construire prompt complet :
      [AGENTS.md context] + [BACKLOG task] + [acceptance criteria]
   c. POST mcp.silveroak.one/send_to_session → worker choisi
   d. Log createInterAgentTask + logToHiveMind

4. MONITORING (R36)
   ─────────────────
   Poll toutes les 60s :
   GET mcp.silveroak.one/read_session_output?session=[worker]
   → cherche TASK_DONE_* dans output
   → si timeout 5 min → kill + réassigner
   → si HUMAN_INPUT_REQUIRED → BLOCKED_HUMAN + Telegram 1×

5. RAPPORT
   ────────
   Fin de chaque tâche [AUTO] → 1 ligne Telegram courte
   Fin de chaque tâche [NOTIFY] → message complet
   Fin de wave → rapport récap complet :
     ✅ T1 — Fix CronScheduler (aider-deepseek-1, $0.18, 4min)
     ✅ T2 — Ajout parseISODate (aider-deepseek-2, $0.12, 2min)
     ❌ T3 — SKIP (2 fails: worker timeout + tsc errors non résolus)
     Total : $0.30 / $0.40 cap
```

---

## Format du prompt envoyé au worker

Chaque tâche dispatched reçoit ce prompt construit :

```
[Contexte AGENTS.md — responsabilités]
...contenu de AGENTS.md...
[Fin contexte]

[Tâche BACKLOG — T1]
TITRE: Fix bug CronScheduler notifyAdmin
NIVEAU: AUTO
ACCEPTANCE: 0 erreur tsc, curl /api/health = 200
BUDGET CAP: $0.30
BRANCHE: feature/fix-cron-notifyadmin

DESCRIPTION:
Le CronScheduler appelle `notifyAdmin` qui n'existe pas sur l'objet telegram.
Ajouter un alias public ou remplacer par `sendMessage(adminChatId)`.

RÈGLES OBLIGATOIRES:
- Lire le code existant avant de modifier (R7)
- tsc --noEmit après chaque modification
- Commit propre sur feature/fix-cron-notifyadmin
- TASK_DONE_[task_id] quand terminé
```

---

## Déclencher le BACKLOG

### Via fichier (méthode principale)
```bash
# Déposer le fichier à la racine
cp BACKLOG.md /app/silver-oak-os/BACKLOG.md

# Déclencher via Telegram (futur watcher)
@maestro: exécute BACKLOG.md
```

### Via Telegram (immédiat)
```
@maestro: exécute BACKLOG.md
/delegate maestro parse et exécute /app/silver-oak-os/BACKLOG.md
```

### Via API (futur)
```bash
POST https://mcp.silveroak.one/backlog/execute
{"path": "/app/silver-oak-os/BACKLOG.md"}
```

---

## Dépendances entre tâches — Syntaxe

```markdown
## Dépendances entre tâches
T2 attend T1 done          ← T2 ne démarre que quand T1 = DONE
T3 + T4 parallèle          ← T3 et T4 démarrent ensemble
T5 attend T3 OU T4         ← T5 démarre quand le premier des deux est done
T6 attend T3 ET T4         ← T6 attend les deux
```

Le parser lit ces lignes et construit le DAG. Syntaxe permissive : "attend", "after", "requires" sont tous reconnus.

---

## Cas d'usage dictée vocale

Karim peut dicter ses tâches en audio depuis Telegram :

```
"Maestro, nouveau backlog : tâche un auto, fixer le bug dans le cron scheduler,
le notifyAdmin qui plante. Tâche deux notify, faire l'audit sécurité du middleware auth.
Budget total cinquante centimes. Basta."
```

Maestro (via VoicePipeline → STT Whisper → parseBacklogFromTranscript) génère
automatiquement le BACKLOG.md canonique et l'exécute.

---

## Limites actuelles (MVP)

1. **Pas de watcher automatique** : le BACKLOG.md doit être déclenché manuellement via Telegram
2. **Pas de DAG graphe** : les dépendances sont respectées séquentiellement (simple queue ordonnée)
3. **Pas de rollback wave** : si T3 fail et T4 dépend de T3, T4 est SKIP (pas de retry intelligent)
4. **Budget estimation** : cap par tâche mais pas d'estimation pré-dispatch
5. **backlog-parser.ts** : MVP implémenté, pas encore câblé dans l'orchestrateur (next wave)
