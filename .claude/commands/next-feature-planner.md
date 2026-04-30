Planifie et décompose une nouvelle feature pour l'Claudette by Silver Oak.

## Feature: $ARGUMENTS

## Phase 1 — Analyse (5 min)
1. Comprendre la feature demandée
2. Identifier le scope: frontend / backend / fullstack / infra
3. Lister les composants existants réutilisables
4. Identifier les dépendances externes (APIs, DB, services)
5. Estimer la complexité: S / M / L / XL

## Phase 2 — Design technique (10 min)

### Database (si nécessaire)
- Tables à créer/modifier
- Colonnes, types, contraintes
- RLS policies
- Index nécessaires
- Migration SQL

### Backend (si nécessaire)
- Endpoints API (méthode, path, body, response)
- Services TypeScript à créer/modifier
- Validation (Zod schemas)
- Error handling

### Frontend (si nécessaire)
- Pages à créer (app router)
- Composants à créer/modifier
- Server vs Client Components
- État local vs global
- Data fetching strategy

## Phase 3 — Plan d'exécution
Liste ordonnée de tâches atomiques:
1. [DB] Migration + RLS
2. [BE] Service + endpoints
3. [FE] Pages + composants
4. [TEST] Tests unitaires + E2E
5. [DEPLOY] Build + deploy

Chaque tâche avec:
- Fichier(s) concerné(s)
- Changements précis à faire
- Critère de validation (comment vérifier que c'est fait)

## Phase 4 — Exécution
Exécuter le plan étape par étape, en validant chaque étape avant de passer à la suivante.

## Output
Plan structuré prêt à exécuter, avec estimation de complexité et dépendances.
