---
globs: ["**/*.ts", "**/*.tsx"]
---
# TypeScript Rules
- Toujours utiliser des types explicites (pas de `any`)
- Imports absolus avec `@/` alias
- Erreurs gerees avec try/catch, jamais ignorees
- Pas de console.log en production (utiliser le logger)
