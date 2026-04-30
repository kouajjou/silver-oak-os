Gère le workflow Git pour l'action demandée.

## Action: $ARGUMENTS

## Workflows disponibles

### "status" — État complet
- git status, git log --oneline -10, branches, stash list
- Fichiers modifiés non commités
- Diff résumé

### "save" ou "commit" — Commit intelligent
- Analyser tous les changements (staged + unstaged)
- Générer un message de commit conventionnel:
  - feat: nouvelle fonctionnalité
  - fix: correction de bug
  - refactor: restructuration
  - docs: documentation
  - test: ajout/modification de tests
  - chore: maintenance
  - security: correction sécurité
  - perf: amélioration performance
  - merge: fusion de branches/features
- Commit avec Co-Authored-By

### "pr" — Créer une Pull Request
- Push la branche courante
- Créer la PR avec gh pr create
- Description auto-générée avec résumé des changements

### "sync" — Synchroniser avec main
- git fetch origin
- git rebase origin/master (ou merge selon le contexte)
- Résoudre les conflits si nécessaire

### "branch" — Créer une branche feature
- Créer: git checkout -b feature/[nom]
- Basée sur master

### "cleanup" — Nettoyer
- Supprimer les branches mergées localement
- Prune les branches remote supprimées
