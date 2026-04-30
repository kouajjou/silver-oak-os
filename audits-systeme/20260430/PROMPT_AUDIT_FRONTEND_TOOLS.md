# 🎯 MISSION : Audit outils frontend testing pour Maestro + équipe

**Date** : 30 avril 2026
**Demandeur** : Karim Kouajjou (Silver Oak SL)
**Cible** : équiper Maestro + workers Mode 1 + (potentiel) Mode 3 dédié frontend
**Contrainte** : zero-Anthropic API en Mode 2 (Pro Max forfait Mode 1 only pour Anthropic)

---

## 📋 CONTEXTE

Silver Oak OS tourne sur Factory (Hetzner ARM64, 178.104.255.59). Maestro est l'orchestrateur CTO interne.

**Architecture Maestro actuelle (vérifiée live le 30 avril 2026) :**

### Mode 1 — 4 workers tmux Pro Max ($0/h forfait Karim)
- `claude-code` (Sonnet 4.6 — architecture, review)
- `claude-backend` (Sonnet 4.6 — backend TS, @api-backend)
- `claude-frontend` (Sonnet 4.6 — frontend code, @frontend-ui)
- `opus` (Opus 4.7 — décisions critiques)

### Mode 2 — 12 adapters LLM (API calls, pas tmux)
- Actifs HTTP 200 : `google` (Gemini), `openai` (GPT-4o), `deepseek`, `xai` (Grok)
- Présents mais HTTP 401 keys invalides : `qwen`, `perplexity`
- Adapters codés non-configurés : `cohere`, `mistral`, `groq`, `minimax`, `together`
- HARD DISABLED : `anthropic` (zero-Anthropic policy)

### Workers logiques (workers-config.ts)
T1 (×4 Pro Max) + T1.5 reasoning (deepseek-r1) + T2 cheap (aider-deepseek) + T3 bash (grok)

---

## 🎯 OBJECTIF DE L'AUDIT

Karim veut que Maestro et son équipe puissent **tester un frontend comme un humain le ferait** :
- Ouvrir une URL dans un browser
- Cliquer sur des boutons
- Remplir des formulaires
- Prendre des screenshots
- Vérifier le rendu visuel
- Détecter les bugs UI
- Mesurer la perf
- Auditer l'accessibilité
- Faire du visual regression

**Question stratégique** : Karim envisage de créer un **Mode 3** dédié frontend testing (5ème session tmux `claude-browser` ou similar) avec tous les outils browser. Donne ton avis honnête là-dessus.

---

## 📚 LISTE DE BASE DÉJÀ IDENTIFIÉE (à valider et enrichir)

### Browser automation
- **Playwright** — Le standard 2024-2026 pour browser automation. Déjà installé chez nous (Chromium ARM64).
- **Puppeteer** — Alternative Google. Probablement aussi installé.

### Testing visuel
- **`@axe-core/playwright`** — Accessibility (WCAG 2.1 AA, ARIA, contraste)
- **`pixelmatch`** — Visual regression pixel-by-pixel
- **`playwright-visual-comparisons`** — Visual diff intégré Playwright

### Performance
- **Lighthouse** (Chrome DevTools) — Performance/SEO/a11y scores
- **Web Vitals** (LCP, FID, CLS, INP)

### MCP custom
- Tool MCP `browser_test` à créer côté `mcp-bridge-factory`

### Skill Maestro
- Skill `frontend-tester` à créer dans `~/.claude/skills/`

---

## 🔍 CE QUE JE TE DEMANDE DE FAIRE

### 1. Recherche exhaustive (web search obligatoire)

Cherche les **nouveautés depuis janvier 2026** dans ces catégories :
- Browser automation (alternatives à Playwright/Puppeteer)
- AI-driven UI testing (genre "Stagehand", "Browser-Use", "Bytebot", "Skyvern")
- Visual regression next-gen (alternatives Percy, Chromatic, Argos)
- Accessibility tools 2026
- Performance tools 2026
- MCP servers existants pour browser testing (https://github.com/modelcontextprotocol/servers ou registries communautaires)

### 2. Pour chaque outil trouvé, fournis

| Champ | Description |
|---|---|
| Nom | exact |
| Type | (npm package / MCP server / standalone CLI / SaaS) |
| Cas d'usage | concret |
| Coût | (gratuit / freemium / payant) |
| Compatibilité ARM64 Linux Ubuntu | confirmer |
| Maintenance | (date dernière release, stars GitHub) |
| Recommandation Karim | (priorité 1, 2, 3 ou skip) |

### 3. Donne ton avis honnête sur le Mode 3

Réponds à ces questions précises :

a. **Mode 3 dédié frontend = bonne idée ou over-engineering ?**
   Considère : on a déjà `claude-frontend` (code) qui pourrait recevoir les outils testing. Vaut-il mieux séparer code vs test ?

b. **Si Mode 3 = oui, architecture proposée** :
   - 5ème session tmux ? Nom ? (suggestion : `claude-browser`)
   - Modèle Sonnet 4.6 ou Haiku 4.5 (pour économie tokens) ?
   - Skill dédié `frontend-tester` ? Contenu ?
   - Tool MCP `browser_test` côté mcp-bridge-factory ? Spec ?

c. **Si Mode 3 = non, alternative** :
   - Comment équiper `claude-frontend` existante avec les outils ?
   - Comment séparer "code frontend" vs "test frontend" en pratique ?

### 4. Structure ta réponse en 4 parties

```
PARTIE 1 — Inventaire outils (tableau)
PARTIE 2 — Nouveautés avril 2026 (recherche web)
PARTIE 3 — Avis Mode 3 (avec ton recommandation finale)
PARTIE 4 — Plan d'implémentation concret (ordre + estimation effort)
```

---

## 🛡️ CONTRAINTES TECHNIQUES

- **OS** : Ubuntu 24.04 ARM64 (Hetzner CAX31)
- **Node** : 22.22.2
- **Browser** : Chromium ARM64 (déjà installé)
- **Pas de root** pour les workers (tournent en `claudeclaw`)
- **MCP Bridge Factory** : `http://localhost:3004` (77 tools déjà actifs)
- **Pas de SaaS payant** sans validation explicite Karim
- **Compatible avec auto mode classifier** (Claude CLI 2.1.123, --permission-mode auto)

## 🎓 STYLE DE RÉPONSE

- Casquette PhD senior dev
- Honnêteté > flatterie
- Recommandations concrètes avec effort estimé
- Si une recommandation est risquée, le dire
- Tableaux > paragraphes
- Pas de marketing

## ✅ TERMINÉ QUAND

- [ ] 4 parties remplies
- [ ] Minimum 3 nouveautés avril 2026 trouvées via web search
- [ ] Avis Mode 3 clair (oui/non + pourquoi)
- [ ] Plan d'implémentation chiffré (heures + dépendances)
- [ ] Rapport HTML envoyé Telegram via `sendDocument`
