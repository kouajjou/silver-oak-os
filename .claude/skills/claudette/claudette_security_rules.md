# Regles Securite Non-Negociables

1. Ne jamais modifier testMode.ts sans approbation claude-code
2. RLS obligatoire : lancer rlsValidator apres chaque migration
3. 0 secret hardcode — toujours process.env
4. Scanner avec securityScanner avant chaque commit sur src/
5. RBAC_ENABLED=true en production — jamais false
