Mode FIX BUG activé. Processus systématique de résolution:

## 1. Reproduction
- Comprendre le bug rapporté: $ARGUMENTS
- Identifier les étapes de reproduction
- Vérifier les logs (PM2, backend, frontend, browser console)
- Confirmer que le bug est reproductible

## 2. Diagnostic
- Identifier le fichier et la ligne exacte du problème
- Tracer le flux de données (request -> processing -> response)
- Chercher les erreurs dans:
  - `pm2 logs claudette-backend --lines 50`
  - `pm2 logs claudette-frontend --lines 50`
  - Les fichiers de log dans /app/logs/
- Identifier la cause racine (pas juste le symptôme)

## 3. Fix
- Appliquer le correctif minimal (pas de refactoring non lié)
- S'assurer que le fix ne casse rien d'autre
- Ajouter un commentaire si la cause n'est pas évidente

## 4. Validation
- Tester le fix (curl, tests unitaires, ou vérification manuelle)
- Vérifier qu'il n'y a pas de régressions
- Vérifier les logs post-fix

## 5. Rapport
- Résumé: cause racine, fix appliqué, tests effectués
- Si pertinent: suggestion pour éviter ce type de bug à l'avenir

Bug: $ARGUMENTS
