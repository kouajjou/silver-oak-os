Test visuel E2E complet avec validation automatique backend + frontend.

## Paramètres
- URL cible: $ARGUMENTS (default: http://localhost:3002)
- Scope: page / feature / full

## Process

### 1. Backend Validation
- Tester les endpoints API utilisés par la page:
  ```bash
  curl -s http://localhost:8000/api/health
  ```
- Vérifier les réponses (status codes, format JSON)
- Vérifier les erreurs dans les logs PM2

### 2. Frontend Loading
- Vérifier que la page charge (HTTP 200)
- Vérifier le HTML retourné (titre, meta, structure)
- Checker les assets (CSS, JS chargés)

### 3. Functional Testing
- Naviguer vers chaque section de la page
- Tester les interactions (boutons, formulaires, navigation)
- Vérifier les états (loading, empty, error, success)
- Tester le responsive (mobile, tablet, desktop)

### 4. Console & Network
- Vérifier: aucune erreur JavaScript en console
- Vérifier: tous les appels réseau réussis (pas de 4xx/5xx)
- Vérifier: pas de requêtes bloquées (CORS, CSP)
- Vérifier: pas de ressources 404

### 5. Visual Check
- Layout correct (pas d'overflow, pas de chevauchement)
- Texte lisible (taille, contraste)
- Images affichées correctement
- Dark mode (si applicable)

### 6. Accessibility
- Navigation clavier fonctionnelle
- ARIA labels présents
- Contraste suffisant
- Focus indicators visibles

## Rapport
Pour chaque test:
- PASS / FAIL / WARNING
- Capture d'écran (description textuelle)
- Action corrective si FAIL
