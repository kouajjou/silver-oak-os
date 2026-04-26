# Guide Karim — Comment utiliser le BACKLOG System
**Pour les humains pressés** | Silver Oak OS | 2026-04-26

---

## En 30 secondes

1. Copie `templates/BACKLOG_TEMPLATE.md` → `BACKLOG.md`
2. Remplis tes tâches en langage naturel (comme à un collègue)
3. Envoie `@maestro: exécute BACKLOG.md` sur Telegram
4. Va boire ton café ☕

---

## Comment écrire une bonne tâche

### ✅ DO — Ce qui marche bien

```markdown
### T1 [AUTO] Fix le bug CronScheduler
- Description: Le cron plante avec "notifyAdmin is not a function". 
  C'est dans src/services/cron/CronScheduler.ts ligne ~45. 
  Remplacer par sendMessage(adminChatId).
- Acceptance: 0 erreur dans pm2 logs, tsc vert
- Budget cap: $0.30
```

Pourquoi ça marche :
- Titre clair (action + objet)
- Description avec CONTEXTE (fichier, ligne, ce qu'il faut faire)
- Acceptance précis et vérifiable

### ❌ DON'T — Ce qui coince

```markdown
### T1 [AUTO] Améliorer le système
- Description: Rendre le truc mieux
```

Pourquoi ça coince : trop vague. Maestro ne sait pas quoi chercher,
où toucher, ni quand s'arrêter.

---

## Quand utiliser AUTO / NOTIFY / HITL

| Situation | Niveau |
|-----------|--------|
| Bug simple, fichier connu, solution claire | AUTO |
| Feature nouvelle, pas de risque prod | AUTO |
| Changement de comportement visible par utilisateur | NOTIFY |
| Touche à plusieurs modules (>3 fichiers) | NOTIFY |
| Impact base de données (migration, ALTER) | HITL |
| Impact sécurité / credentials | HITL |
| Coût estimé > $1 | HITL auto-upgrade |
| Tu as des doutes sur l'impact | HITL |

---

## Comment éviter les pièges courants

### Piège 1 — Tâche trop large
```markdown
# ❌ Trop large
### T1 [AUTO] Refactor toute l'architecture LLM

# ✅ Bien découpé
### T1 [AUTO] Fixer AVAILABLE_MODELS dans constants.ts
### T2 [AUTO] Câbler IntelligentRouter dans TaskDispatcher  
### T3 [NOTIFY] Mettre à jour les tests LLM routing
```

**Règle** : une tâche = un fichier principal modifié. Si tu en as 3, fais 3 tâches.

### Piège 2 — Acceptance trop vague
```markdown
# ❌ Vague
- Acceptance: ça marche

# ✅ Précis
- Acceptance: tsc --noEmit 0 erreurs, curl /api/health = 200, logs pm2 sans "TypeError"
```

### Piège 3 — Oublier les dépendances
```markdown
# ❌ T2 dépend de T1 mais pas de section Dépendances
# → Maestro lance les deux en parallèle → conflit

# ✅ Section Dépendances remplie
## Dépendances entre tâches
T2 attend T1 done
```

---

## Dicter depuis Telegram (mode vocal)

Parle naturellement, Maestro transcrit et structure :

```
"Karim à Maestro : prépare un backlog pour ce soir.

Tâche un : auto. Fix le bug CronScheduler — le notifyAdmin qui plante.
Budget 30 cents. Worker deepseek.

Tâche deux : notify. Auditer le middleware auth pour OWASP.
Budget 10 cents. Worker gemini audit.

Tâche trois : notify. Écrire un test E2E pour la route /api/agents.
Budget 40 cents. Pas de préférence worker.

Budget total : 1 dollar. Pas besoin de me déranger sauf si ça dépasse."
```

---

## Commandes Telegram utiles

```
@maestro: exécute BACKLOG.md                 ← lancer la wave
@maestro: status wave                         ← voir l'avancement
@maestro: pause                               ← stopper après tâche en cours
/resume T3                                    ← reprendre une tâche HITL en attente
/resume T3 --approve                          ← approuver + continuer
/resume T3 --deny                             ← annuler + passer à la suivante
@maestro: budget wave                         ← voir le coût courant
```

---

## Format des rapports Telegram

### Tâche AUTO (fin de tâche)
```
✅ T1 — Fix CronScheduler | aider-deepseek-1 | $0.18 | 4min
```

### Tâche NOTIFY (mi-parcours + fin)
```
⚙️ T2 en cours — Audit auth (audit-gemini-1)...
✅ T2 — Audit auth | 3 findings OWASP A01 | rapport: /app/audits/rapports/...
```

### HITL requis
```
⏸️ T3 — Migration DB en pause
Diff: feature/migration-users-preferences (+45 LOC)
→ /resume T3 --approve pour continuer
→ /resume T3 --deny pour annuler
```

### Fin de wave
```
📊 Wave 2026-04-26-2100 terminée
✅ T1 Fix CronScheduler ($0.18)
✅ T2 Audit auth ($0.08)  
⏸️ T3 Migration DB — attente Karim
Total: $0.26 / $1.00 cap (26%)
```

---

## Foire aux questions

**Q: Je peux mixer AUTO et HITL dans le même BACKLOG ?**  
R: Oui. HITL met cette tâche en pause mais Maestro continue les autres. Tu reprends quand tu veux.

**Q: Et si Maestro fait une erreur sur un AUTO ?**  
R: Il y a l'anti-acharnement (2 fails = SKIP) et le R44 auto-rollback. La branche feature est conservée. Tu peux la revoir et /resume.

**Q: Je peux avoir plusieurs BACKLOG.md en attente ?**  
R: Oui. Maestro les exécute en queue (premier arrivé, premier servi).

**Q: Maestro peut modifier master directement ?**  
R: Jamais. Toujours feature branch → PR. Tu merges quand tu veux.

**Q: Budget dépassé en cours de wave ?**  
R: STOP immédiat (R5), alerte Telegram, attente HITL Karim.
