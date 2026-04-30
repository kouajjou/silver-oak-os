---
name: auto-code
description: Pipeline de codage autonome Claudette. Utilise automatiquement quand une tache de codage est detectee. Reflexion approfondie, analyse du code existant via MCP, delegation aux subagents, audit securite, tests, commit.
---

# Auto-Code -- Pipeline Claudette (Full Arsenal)

Tu es en mode **pipeline autonome** pour Claudette by Silver Oak (Claudette).

## ETAPES OBLIGATOIRES (dans cet ordre) :

### 1. Reflexion approfondie (equivalent /ultrathink)
Avant TOUTE action :
- Liste les objectifs de la tache
- Identifie les risques et inconnues
- Analyse les fichiers qui seront impactes
- Produis un plan d'actions numerote

### 2. Analyse du code existant
- Utilise le MCP **filesystem** pour lire les fichiers existants similaires
- Cherche les patterns deja utilises dans le projet (conventions d'endpoints, structure, naming)
- Utilise **grep/find** pour trouver les fichiers lies

### 3. Delegation aux subagents si pertinent
- Tache UI/React/Next.js -> delegue a **@frontend-ui**
- Tache API/backend/TypeScript -> delegue a **@api-backend**
- Tache DB/Supabase/SQL -> delegue a **@db-supabase**
- Audit securite -> delegue a **@security-review**

### 4. Codage
- Respecte les conventions TypeScript du projet (voir CLAUDE.md)
- Importe les modules existants au lieu de reinventer
- Gere les erreurs avec try/catch
- Ajoute les types explicites

### 5. Tests
- Ecris ou mets a jour les tests associes
- Lance `npx tsc --noEmit --skipLibCheck` pour verifier les types
- Lance les tests existants pour verifier la non-regression

### 6. Diagnostic d'erreur (si un test/build echoue)
- Identifie la CAUSE RACINE (pas juste le symptome)
- Propose 2-3 corrections possibles
- Applique la meilleure
- Re-teste
- MAX 3 tentatives avant d'escalader

### 7. Securite
- Verifie l'absence de secrets en dur
- Verifie que les inputs sont valides
- Si fichier sensible (config, auth, .env) -> audit renforce

### 8. Commit
- Message de commit descriptif en anglais
- Format : `feat|fix|refactor: description courte`
- Git add uniquement les fichiers modifies (pas git add -A aveugle)

## OUTILS DISPONIBLES (utilise-les !) :
- **MCP filesystem** : lire/ecrire fichiers
- **MCP postgres** : requetes DB directes
- **MCP supabase** : migrations, schema, RLS
- **MCP github** : PR, issues, branches
- **MCP puppeteer/playwright** : screenshots, tests E2E
- **MCP axon** : knowledge graph du codebase
- **MCP contextplus** : graphe hierarchique semantique
- **Subagents** : @frontend-ui, @api-backend, @db-supabase, @security-review

## CE QUI EST INTERDIT :
- Coder sans avoir d'abord analyse le code existant
- Ignorer les erreurs de type
- Committer du code qui ne compile pas
- Utiliser `any` en TypeScript
- Supprimer des fichiers sans verification
