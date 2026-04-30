# Règles Sécurité Non-Négociables Claudette

1. **testMode.ts** — ne jamais modifier sans approbation claude-code (Coordinator)
2. **RLS obligatoire** — lancer rlsValidator après CHAQUE migration Supabase
3. **0 secret hardcodé** — toujours process.env, scanner avec securityScanner avant commit
4. **RBAC_ENABLED=true** en production — jamais false, jamais bypass
5. **x-test-mode** — désactivé en production, header x-test-mode: true interdit hors dev
6. **tenant_id** — toute table sans tenant_id RLS = bloquant avant merge
7. **Cross-review obligatoire** sur tout fichier dans src/core/auth/ ou src/middleware/
