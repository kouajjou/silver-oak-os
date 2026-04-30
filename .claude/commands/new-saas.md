Scaffold un nouveau projet SaaS en utilisant l'infrastructure Claudette by Silver Oak.

## Nouveau SaaS: $ARGUMENTS

## Process

### 1. Validation du concept
- Nom du SaaS et proposition de valeur
- Public cible
- Fonctionnalités MVP (max 3-5)
- Modèle de monétisation (freemium, subscription, usage-based)

### 2. Architecture technique
Basée sur l'Claudette by Silver Oak:
- Frontend: Fork de claudette-ui (Next.js 16, React 19, TailwindCSS 4)
- Backend: Services TypeScript depuis clawd/
- Database: Supabase (tables, RLS, auth)
- API: REST endpoints nécessaires

### 3. Scaffold
Créer la structure:
```
new-saas-name/
├── frontend/          # Fork claudette-ui adapté
│   ├── app/          # Pages Next.js
│   ├── components/   # Composants UI
│   └── package.json
├── backend/           # Services TypeScript
│   ├── src/
│   └── package.json
├── migrations/        # SQL Supabase
├── .env.example       # Variables nécessaires
├── CLAUDE.md          # Instructions pour Claude Code
└── README.md          # Documentation
```

### 4. Setup initial
- Créer les tables Supabase avec RLS
- Configurer l'auth (Supabase Auth)
- Créer les endpoints API de base (CRUD)
- Page landing + page principale
- Intégration Stripe (plans tarifaires)

### 5. Checklist lancement
- [ ] Landing page
- [ ] Auth (signup/login/logout)
- [ ] Feature principale MVP
- [ ] Stripe integration
- [ ] Deployment config
- [ ] Monitoring basique
