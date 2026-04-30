Configure GitHub Actions CI/CD pour le projet.

## Config: $ARGUMENTS
(ex: "basic CI", "full CI/CD", "deploy staging", "tests only")

## Workflows disponibles

### CI basique (.github/workflows/ci.yml)
- Checkout + Node.js setup
- npm install + npm run build
- npm run test (si tests existent)
- TypeScript type-check
- ESLint

### CI complet (.github/workflows/ci-full.yml)
- Tout le CI basique +
- Tests E2E (Playwright)
- Security audit (npm audit)
- Bundle size check
- Lighthouse CI

### Deploy staging (.github/workflows/deploy-staging.yml)
- Trigger: push sur develop
- Build + tests
- Deploy vers serveur staging
- Smoke tests post-deploy
- Notification Telegram

### Deploy production (.github/workflows/deploy-prod.yml)
- Trigger: tag v*
- Build + tests complets
- Deploy vers production
- Health check post-deploy
- Notification Telegram
- Rollback automatique si health check échoue

## Process
1. Détecter la config actuelle du projet
2. Créer le workflow approprié
3. Configurer les secrets GitHub nécessaires (lister)
4. Tester localement avec `act` si disponible
5. Commit le workflow
