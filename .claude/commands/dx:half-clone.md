Setup partiel d'un projet - uniquement la partie spécifiée (frontend OU backend OU infrastructure).

## Scope: $ARGUMENTS
(ex: "frontend only", "backend only", "infra only")

## Process

### Si "frontend"
1. Installer uniquement les dépendances frontend
2. Configurer les variables d'env frontend
3. Lancer le dev server frontend
4. Mocker les APIs backend si nécessaire (MSW ou json-server)

### Si "backend"
1. Installer uniquement les dépendances backend
2. Configurer les connexions DB
3. Lancer les services backend
4. Tester les endpoints avec curl

### Si "infra"
1. Docker compose up pour les services
2. Vérifier les health checks
3. Configurer les accès réseau
4. Rapport des services disponibles

### Rapport
- Ce qui a été installé
- Ce qui a été ignoré (et pourquoi)
- Comment compléter le setup plus tard
