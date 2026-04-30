# Standards Tests Claudette

## Format obligatoire Given/When/Then
```
Given: état initial du système
When: action exécutée (commande bash)
Then: résultat mesurable attendu
Command: commande bash exécutable
ExpectedExitCode: 0 ou 1
```

## Couverture minimum par priorité
- P0 sécurité : 100% — aucune exception
- P1 critique : 80%
- P2 important : 60%
- P3 amélioration : best effort

## Outils
- Unit : Vitest — `npx vitest run --reporter=json`
- E2E : Playwright — `npx playwright test`
- DB : rlsValidator — vérification RLS après migrations
- Sécurité : securityScanner — avant chaque commit

## Règle d'or
Ne jamais marquer une tâche "completed" sans avoir exécuté TOUS les acceptanceCriteria.command et vérifié les exit codes.
