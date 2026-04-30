Lance un audit de performance sur la cible spécifiée.

## Cible: $ARGUMENTS
(Si vide, auditer les composants principaux)

## 1. Backend Performance

### API Response Times
- Tester les endpoints critiques avec curl + timing:
  ```
  curl -w "\nTime: %{time_total}s\n" http://localhost:8000/api/health
  ```
- Identifier les endpoints lents (>500ms)

### Memory & CPU
- `pm2 monit` / `pm2 describe claudette-backend`
- Vérifier les fuites mémoire (memory croissante)
- Process CPU usage

### Database
- Queries lentes (si logging activé)
- Index manquants sur les tables fréquemment requêtées
- Connection pool usage

### LLM Calls
- Temps de réponse par provider (Anthropic, OpenAI, etc.)
- Cache hits vs misses (semantic cache)
- Coût par requête

## 2. Frontend Performance

### Build Analysis
- Taille du bundle (`npm run build` output)
- Chunks splitting efficace
- Images optimisées

### Runtime
- Server Components vs Client Components ratio
- Hydration time
- Core Web Vitals estimés

## 3. Infrastructure

### Server Resources
- RAM: free -h
- Disk: df -h
- Network: connections actives
- PM2 restart count (instabilité)

### Redis
- redis-cli INFO stats
- Memory usage
- Hit rate

## 4. Rapport
Pour chaque finding:
- Métrique actuelle vs cible
- Impact estimé
- Action recommandée + effort
- Priorité: P0 (critique) / P1 (important) / P2 (nice-to-have)
