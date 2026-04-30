Clone et setup complet d'un projet pour un nouveau développeur/environnement.

## Projet: $ARGUMENTS

## Process

### 1. Clone
```bash
git clone [repo-url] && cd [repo-name]
```

### 2. Détection automatique du stack
- Lire package.json, tsconfig.json, docker-compose.yml
- Identifier: framework, runtime, databases, services externes

### 3. Installation des dépendances
- `npm install` pour chaque package.json trouvé
- Installer les outils globaux nécessaires (tsx, pm2, etc.)

### 4. Configuration environnement
- Copier .env.example vers .env
- Lister les variables à remplir
- Vérifier les connexions DB

### 5. Setup databases
- Docker compose up pour les services locaux
- Appliquer les migrations Supabase
- Seed data si disponible

### 6. Premier lancement
- Démarrer le dev server
- Vérifier health endpoints
- Ouvrir dans le navigateur

### 7. Rapport
- Stack détecté
- Services lancés
- URLs d'accès
- Prochaines étapes suggérées
