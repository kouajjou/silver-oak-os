---
globs: ["**/migrations/**", "**/*.sql"]
---
# Supabase Rules
- Toujours ajouter RLS policies avec les migrations
- Tester les migrations sur une branche avant production
- Jamais de DROP TABLE sans backup
- Utiliser les types generes (npm run generate:types)
