Review de design frontend pour le composant ou la page spécifiée.

## Cible: $ARGUMENTS
(Chemin du composant ou URL de la page)

## Grille d'évaluation (Score /50)

### 1. Structure & Architecture (10 pts)
- Server vs Client Component (bon choix ?)
- Séparation des responsabilités
- Réutilisabilité des composants
- Props typing (TypeScript strict)
- Pas de logique métier dans les composants UI

### 2. UI/UX Quality (10 pts)
- Layout cohérent avec le reste de l'app
- Spacing et alignment (TailwindCSS classes)
- Typography hierarchy
- Color usage (design tokens vs hardcoded)
- Loading states et empty states

### 3. Responsive Design (10 pts)
- Mobile-first approach
- Breakpoints TailwindCSS (sm, md, lg, xl)
- Touch targets (min 44x44px)
- Pas de scroll horizontal
- Images responsive

### 4. Accessibilité WCAG AA (10 pts)
- Contraste couleurs (4.5:1 text, 3:1 large)
- ARIA labels sur les éléments interactifs
- Keyboard navigation
- Screen reader compatible
- Focus visible indicators

### 5. Performance (10 pts)
- Pas de re-renders inutiles
- Images optimisées (next/image)
- Lazy loading si approprié
- Bundle impact minimal
- Pas de dépendances lourdes inutiles

## Output
- Score /50 avec détail par catégorie
- Issues trouvées avec sévérité (critique/majeur/mineur)
- Fix suggéré pour chaque issue (avec code)
- Screenshot mental de l'état actuel vs amélioré
