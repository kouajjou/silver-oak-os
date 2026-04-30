---
globs: ["**/security/**", "**/auth/**", "**/.env*", "**/config/**"]
---
# Security Rules
- JAMAIS de secrets en dur dans le code
- Toujours valider les inputs (zod/joi)
- RLS active sur toutes les tables Supabase
- Rate limiting sur tous les endpoints publics
