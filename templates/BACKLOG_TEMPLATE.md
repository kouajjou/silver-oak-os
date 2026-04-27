# BACKLOG.md — Template autonome Maestro
<!-- Copier ce fichier en BACKLOG.md à la racine du projet et remplir -->

## Métadonnées
- **Auteur** : Karim
- **Date** : YYYY-MM-DD HH:MM
- **Budget cap** : $X.XX
- **Durée max** : Xh
- **HITL réactivité** : haute / normale / faible (Karim sorti)
- **Max parallélisme** : 3 tâches simultanées (défaut)

---

## Règles globales de cette wave

> Ces règles s'appliquent à toutes les tâches sauf override local.

- **AUTO** : Maestro fait sans demander. Telegram 1 ligne courte en fin.
- **NOTIFY** : Maestro fait + 1 message Telegram à mi-parcours + 1 à la fin.
- **HITL** : Maestro met la tâche en pause, branche conservée, passe à la suivante. Reprend sur `/resume T-ID`.

**Anti-acharnement** : 2 échecs consécutifs sur une tâche → SKIP automatique + log + suivant.  
**Anti-hallucination** : ZÉRO simulation. Si le worker ne peut pas exécuter → CANNOT_EXECUTE immédiat.  
**Merge** : Jamais auto sur master. Feature branch + PR. Karim approuve quand il veut.

---

## Tâches

### T1 [AUTO] [titre court — max 60 chars]
- **Description** : [1-2 phrases en langage naturel. Karim parle comme à un collègue.]
- **Acceptance criteria** : [Comment savoir que c'est done. Ex: "0 erreur tsc, curl /api/health = 200"]
- **Worker suggéré** : [optionnel — sinon Maestro choisit selon tier]
- **Budget cap** : $X.XX (hérite global si absent)
- **Branche feature** : feature/[slug] (auto-générée si absent)
- **Tests** : [optionnel — défaut: tsc ✅ + curl ✅ + logs ✅]
- **Notes Karim** : [contexte additionnel, liens, décisions déjà prises]

### T2 [NOTIFY] [titre]
- **Description** :
- **Acceptance criteria** :
- **Worker suggéré** :
- **Budget cap** :
- **Branche feature** :
- **Tests** :
- **Notes Karim** :

### T3 [HITL] [titre]
- **Description** :
- **Acceptance criteria** :
- **Worker suggéré** :
- **Budget cap** :
- **Branche feature** :
- **Tests** :
- **Notes Karim** :

---

## Constraints (contraintes de cette wave)

```
- ZÉRO touche serveur Claudette 178.104.24.23 (si applicable)
- Budget cap total : $X.XX
- Max parallélisme : N tâches simultanées
- Anti-acharnement : 2 fails = SKIP + next
- Anti-hallucination : ZÉRO simulation, output validator actif
- Branches : feature/* uniquement, jamais commit direct master
```

---

## Dépendances entre tâches

```
T2 attend T1 done
T3 + T4 parallèle (indépendants)
T5 attend T3 OU T4 (premier fini)
```

---

## Exemples concrets

### Exemple 1 — Tâche AUTO simple (bug fix)
```markdown
### T1 [AUTO] Fix bug CronScheduler notifyAdmin
- **Description** : Le CronScheduler appelle `notifyAdmin` qui n'existe pas sur l'objet telegram.
  Ajouter un alias public ou remplacer par `sendMessage(adminChatId)`.
- **Acceptance criteria** : 0 erreur "notifyAdmin is not a function" dans les logs pm2. tsc ✅
- **Worker suggéré** : aider-deepseek-1
- **Budget cap** : $0.30
```

### Exemple 2 — Tâche NOTIFY (feature minor)
```markdown
### T2 [NOTIFY] Ajout fonction parseISODate dans utils
- **Description** : Ajouter une fonction utilitaire `parseISODate(str)` dans `src/utils/dates.ts`
  qui parse une date ISO 8601 et retourne un objet Date ou null si invalide.
- **Acceptance criteria** : types OK, tests unitaires verts, exportée depuis `src/utils/index.ts`
- **Notes Karim** : sera utilisée par T7 MeetScribe pour normaliser les dates de réunion
```

### Exemple 3 — Tâche HITL (impact DB/prod)
```markdown
### T3 [HITL] Migration DB — ajout colonne preferences
- **Description** : Migrer la table `users` pour ajouter une colonne `preferences JSONB DEFAULT '{}'`.
- **Acceptance criteria** : migration appliquée sur staging, rollback testé, données préservées, RLS policy mise à jour
- **Notes Karim** : SURTOUT vérifier que rollback fonctionne avant merge prod. Pas de downtime.
```

### Exemple 4 — Tâches parallèles
```markdown
### T4 [AUTO] Audit sécurité AuthMiddleware
- **Description** : Lire `src/api/middleware/auth.ts` et vérifier les 4 points OWASP A01/A02/A03/A05.
  Rapport dans `/app/audits/rapports/YYYYMMDD_auth_audit.md`.
- **Worker suggéré** : audit-gemini-1
- **Budget cap** : $0.10

### T5 [AUTO] Audit performance LLMRouter
- **Description** : Mesurer le p95 du DynamicMLRouter sur les 100 derniers appels Redis.
  Rapport dans `/app/audits/rapports/YYYYMMDD_llm_perf.md`.
- **Worker suggéré** : audit-gemini-2
- **Budget cap** : $0.10

# Dépendances :
# T4 + T5 parallèle
# T6 attend T4 + T5 (synthèse)
```

---

## Notes pour Maestro (laisser vide — rempli automatiquement)

```
Wave ID      : auto-YYYYMMDD-HHMM
Total budget : $0.00 / $X.XX cap
Workers used : []
Tasks status : []
Started at   : 
Completed at : 
```
