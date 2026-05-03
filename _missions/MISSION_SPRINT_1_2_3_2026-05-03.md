# MISSION CTO PhD — Sprint 1+2+3 : Skills Library + SoulPrompts Library + Agent Factory v2

**Date** : 2026-05-03
**Branche** : feature/skills-souls-factory-v2-2026-05-03 (déjà créée par moi)
**Auteur** : Karim Kouajjou (validé)
**Estimation** : 9-11h
**Stratégie** : R-déclaratif "apprendre à pêcher" — bibliothèques partagées + factory unifiée + registry source de vérité

---

## 🎯 OBJECTIF FINAL

Quand Alex (ou Karim) dit "crée un agent X pour faire Y", **UN SEUL appel `createAgent(spec)`** doit produire :

1. ✅ Dossier `/app/silver-oak-os/agents/<id>/` complet
2. ✅ `agent.yaml` valide
3. ✅ `CLAUDE.md` trilingue (FR + EN + ES) assemblé depuis SoulPrompts library
4. ✅ `skills/` peuplé depuis Skills library (selon les besoins déclarés)
5. ✅ Bot Telegram créé via BotFather si demandé + token dans .env
6. ✅ Entry dans Supabase `agents` table (source unique de vérité)
7. ✅ DOMAIN_ROUTES généré dynamiquement (pas hardcodé)
8. ✅ Notification automatique aux autres directeurs concernés (delegation_rules)
9. ✅ Self-test ping (Alex envoie un test au nouvel agent, vérifie qu'il répond correctement)
10. ✅ Skills chargés au runtime quand l'agent exécute (pas juste fichiers orphelins)

---

## 📚 SPRINT 1 : Bibliothèque Skills (3-4h)

### 1.1 — Créer la structure de bibliothèque

**Path** : `/app/silver-oak-os/skills-library/`

```
skills-library/
├── README.md                    (doc d'utilisation)
├── communication/
│   ├── gmail_read/SKILL.md
│   ├── gmail_compose/SKILL.md
│   ├── gmail_label/SKILL.md
│   ├── telegram_draft/SKILL.md
│   └── whatsapp_send/SKILL.md
├── data/
│   ├── supabase_query/SKILL.md
│   ├── sqlite_log/SKILL.md
│   └── csv_export/SKILL.md
├── browser/
│   ├── playwright_navigate/SKILL.md
│   ├── playwright_screenshot/SKILL.md
│   ├── airbnb_browser/SKILL.md
│   ├── logify_browser/SKILL.md
│   └── pricelab_browser/SKILL.md
├── calendar/
│   └── google_calendar/SKILL.md
├── finance/
│   ├── stripe_query/SKILL.md
│   └── mrr_calc/SKILL.md
└── validation/
    └── maker_checker/SKILL.md
```

### 1.2 — Format SKILL.md (Anthropic standard)

Chaque SKILL.md DOIT respecter ce format (compatible avec le `skill-registry.ts` existant) :

```markdown
---
name: gmail_read
description: Read Gmail inbox, list threads, get specific emails. Returns JSON.
triggers: [gmail, inbox, email, mail, courrier]
allowed-tools: Bash(CLAUDECLAW_DIR=* ~/.venv/bin/python3 ~/.config/gmail/gmail.py *)
---

# Gmail Read Skill

## Purpose
Read emails from Karim's Gmail inbox.

## Usage
[commands, examples]

## Outputs
JSON with thread_id, from, subject, snippet, etc.
```

**IMPORTANT** : Utiliser le format frontmatter YAML en haut, comme dans `/app/silver-oak-os/skills/gmail/SKILL.md` (référence existante).

### 1.3 — Brancher initSkillRegistry au démarrage backend

**Fichier à modifier** : `/app/silver-oak-os/src/dashboard.ts` (ou `index.ts`)

**Action** :
1. Importer `initSkillRegistry` depuis `./skill-registry.js`
2. Appeler `initSkillRegistry()` au démarrage (avant le serveur HTTP listen)
3. Ajouter un log : `logger.info({skills: getAllSkills().length}, 'Skill registry initialized')`

### 1.4 — ÉTENDRE skill-registry.ts pour scanner aussi `agents/<id>/skills/`

**Fichier à modifier** : `/app/silver-oak-os/src/skill-registry.ts`

**Action** : Dans `initSkillRegistry()`, après le scan de `projectSkillsDir` et `globalSkillsDir`, ajouter :

```typescript
// NEW: Scan per-agent skills
const agentsDir = path.join(projectRoot, 'agents');
if (fs.existsSync(agentsDir)) {
  const agents = fs.readdirSync(agentsDir, { withFileTypes: true });
  for (const agent of agents) {
    if (!agent.isDirectory()) continue;
    if (agent.name.startsWith('_')) continue; // skip _template
    const agentSkills = path.join(agentsDir, agent.name, 'skills');
    if (fs.existsSync(agentSkills)) {
      scanDirectory(agentSkills);
    }
  }
}
```

Aussi ajouter le scan de `skills-library/<category>/<skill>/` (récursif sur 2 niveaux).

### 1.5 — Tests Sprint 1

```bash
cd /app/silver-oak-os && npx tsc --noEmit
# 0 erreur attendu
npm run test 2>&1 | tail -10
# Tests skill-registry doivent passer
```

---

## 📚 SPRINT 2 : Bibliothèque SoulPrompts (2h)

### 2.1 — Structure

**Path** : `/app/silver-oak-os/soul-prompts/`

```
soul-prompts/
├── README.md
├── traits/
│   ├── gardien_validation_required.md   (Lucas, Sara — toujours valider avec Karim avant action externe)
│   ├── analyste_data_driven.md          (Marco, Nina — décisions sur data, sources citées)
│   ├── creatif_libre.md                 (Léo — punchy, opinionated, anti-corporate)
│   ├── strategique_long_terme.md        (Sophie, Elena — focus 6-12 mois)
│   └── conformité_strict.md             (Jules — RGPD, AI Act, never break the rules)
├── languages/
│   ├── fr.md                            (block FR avec règles, vocabulary, ton)
│   ├── en.md                            (block EN)
│   └── es.md                            (block ES)
├── roles/
│   ├── orchestrator.md                  (Alex — Chief of Staff, triage, delegate)
│   ├── specialist.md                    (autres directeurs — domaine précis)
│   └── workhorse.md                     (Maestro workers — exécution technique)
└── shared/
    ├── boundary.md                      (Silver Oak Staff is PERSONAL productivity team)
    ├── hive_mind.md                     (logging actions to SQLite)
    ├── memory.md                        (memory context blocks)
    ├── delegation_policy.md             (golden rule: execute, don't forward)
    └── message_format.md                (Telegram, voice, file markers)
```

### 2.2 — Format trait

Chaque `traits/*.md` doit avoir 3 sections FR/EN/ES :

```markdown
# Trait: gardien_validation_required

## FR
Tu es un gardien. Tu NE FAIS RIEN sans la validation de Karim.
Avant chaque action externe (envoi de message, modification de prix, etc.) :
1. Tu prépares un draft
2. Tu envoies à Karim sur Telegram pour validation
3. Tu attends son OK explicite
4. Puis tu exécutes

## EN
You are a gatekeeper. You DO NOTHING without Karim's validation.
Before any external action: 1) draft, 2) Telegram for validation, 3) wait OK, 4) execute.

## ES
Eres un guardián. NO HACES NADA sin la validación de Karim.
Antes de cualquier acción externa: 1) borrador, 2) Telegram para validar, 3) esperar OK, 4) ejecutar.
```

### 2.3 — Builder de SoulPrompt

Créer fichier : `/app/silver-oak-os/src/services/soul_prompt_builder.ts`

**Fonction principale** :

```typescript
export interface SoulPromptSpec {
  agentId: string;
  agentName: string;
  agentDescription: string;
  role: 'orchestrator' | 'specialist' | 'workhorse';
  traits: string[];                  // ['gardien_validation_required', 'analyste_data_driven']
  languages: ('fr' | 'en' | 'es')[]; // ['fr', 'en', 'es']
  customMission?: string;            // Mission spécifique de l'agent
  delegationRules?: string;          // Règles de délégation custom
  sharedBlocks?: string[];           // ['hive_mind', 'memory', 'message_format'] — défaut tous
}

/**
 * Assemble un CLAUDE.md trilingue à partir des bibliothèques.
 * Retourne le contenu Markdown complet.
 */
export function buildSoulPrompt(spec: SoulPromptSpec): string {
  // 1. Header (Identity)
  // 2. Pour chaque language demandée : injecte le block FR/EN/ES depuis traits
  // 3. Mission custom
  // 4. Role block (orchestrator/specialist/workhorse)
  // 5. Shared blocks (boundary, hive_mind, memory, delegation_policy, message_format)
  // 6. Custom delegation rules si fournis
  // Returns full markdown string
}
```

### 2.4 — Migration des CLAUDE.md existants vers la bibliothèque

**Action** : Pour chaque directeur existant (alex, sara, leo, marco, nina, sophie, elena, jules, maestro, luca), extraire les blocks réutilisables et les pousser dans `soul-prompts/traits/`, `languages/`, `roles/`.

⚠️ **NE PAS écraser les CLAUDE.md existants pour l'instant.** On garde les actuels qui marchent. La bibliothèque est utilisée par la factory v2 pour les NOUVEAUX agents.

### 2.5 — Tests Sprint 2

```bash
# Test unitaire du builder
npx vitest run src/services/soul_prompt_builder.test.ts
```

Créer le test qui vérifie qu'un `buildSoulPrompt({agentId: 'test', traits: ['gardien_validation_required'], languages: ['fr']})` retourne bien un Markdown contenant les sections attendues.

---

## 🏭 SPRINT 3 : Agent Factory v2 (4-5h)

### 3.1 — Service principal

**Fichier à créer** : `/app/silver-oak-os/src/services/agent_factory_v2.ts`

```typescript
export interface CreateAgentSpec {
  id: string;                                       // 'luca'
  name: string;                                     // 'Lucas'
  description: string;                              // 'Airbnb Property Manager'
  mission: string;                                  // Description longue de la mission
  role: 'orchestrator' | 'specialist' | 'workhorse';
  soul_traits: string[];                            // ['gardien_validation_required']
  languages: ('fr' | 'en' | 'es')[];                // ['fr', 'en', 'es']
  skills_needed: string[];                          // ['gmail_read', 'airbnb_browser', 'logify_browser', 'maker_checker']
  telegram_bot_required: boolean;                   // true si bot Telegram nécessaire
  delegation_rules?: Record<string, string>;        // {sara: 'forward Airbnb emails', marco: 'track property finances'}
  domain_keywords: string[];                        // ['airbnb', 'locataire', 'logify', 'pricelab', 'appartement'] — pour DOMAIN_ROUTES
  model?: string;                                   // claude-sonnet-4-6 par défaut
}

export interface CreateAgentResult {
  agentId: string;
  agentDir: string;
  claudeMdPath: string;
  skillsImported: string[];
  telegramBotUsername?: string;
  selfTestPassed: boolean;
  domainRoutesUpdated: boolean;
  delegationsNotified: string[];
}

export async function createAgent(spec: CreateAgentSpec): Promise<CreateAgentResult> {
  // 1. Validation (id valide, pas de collision, max 20 agents)
  // 2. Crée /agents/<id>/ + sub-dirs
  // 3. Génère agent.yaml
  // 4. Build CLAUDE.md via buildSoulPrompt(spec) + écrit
  // 5. Pour chaque skill in skills_needed : copie depuis skills-library vers agents/<id>/skills/
  // 6. Si telegram_bot_required : crée bot via BotFather + ajoute LUCA_BOT_TOKEN dans .env
  // 7. INSERT dans Supabase agents table
  // 8. Régénère DOMAIN_ROUTES depuis registry (write-back to alex_orchestrator)
  // 9. Pour chaque delegation_rule : envoie notif au directeur concerné (via leur agent + log hive_mind)
  // 10. Self-test : delegateToAgent(id, "Présente-toi en 3 lignes en français.", chatId='test', fromAgent='factory')
  //     - Si réponse > 100 chars et contient le name : OK
  //     - Sinon : log warn + selfTestPassed=false
  // 11. Retourne CreateAgentResult
}
```

### 3.2 — DOMAIN_ROUTES dynamique depuis registry

**Fichier à modifier** : `/app/silver-oak-os/src/agents/alex_orchestrator.ts`

**Action** :
1. Remplacer le `const DOMAIN_ROUTES = [...]` hardcodé par une fonction `loadDomainRoutes()`
2. `loadDomainRoutes()` lit depuis Supabase `agents` table le champ `domain_keywords` de chaque agent
3. Génère les regex automatiquement
4. Cache en mémoire, refresh sur signal (ex : nouveau agent créé)

### 3.3 — Supabase agents table

**Migration** : `/app/silver-oak-os/migrations/2026_05_03_agents_registry.sql`

```sql
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  mission TEXT,
  role TEXT NOT NULL CHECK (role IN ('orchestrator', 'specialist', 'workhorse')),
  soul_traits JSONB DEFAULT '[]'::jsonb,
  languages JSONB DEFAULT '["fr"]'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  domain_keywords JSONB DEFAULT '[]'::jsonb,
  delegation_rules JSONB DEFAULT '{}'::jsonb,
  telegram_bot_username TEXT,
  model TEXT DEFAULT 'claude-sonnet-4-6',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_status ON agents(status);
```

⚠️ Si Supabase pas dispo, fallback sur SQLite dans `store/claudeclaw.db` (déjà utilisé par hive_mind).

### 3.4 — Migration des agents existants

**Action** : Pour chaque agent existant (sans toucher leurs CLAUDE.md/skills/ qui marchent) :
- INSERT dans Supabase `agents` table avec leurs métadonnées actuelles
- Lire `agent.yaml` + scanner `skills/` + extraire keywords des CLAUDE.md
- Backfill `domain_keywords` depuis `DOMAIN_ROUTES` actuel

Cela permet à `loadDomainRoutes()` de marcher dès le déploiement.

### 3.5 — Bot Telegram création automatique

⚠️ **Limitation** : BotFather est un bot Telegram interactif. On NE PEUT PAS le scripter via API Telegram standard.

**Solution** :
1. Si `telegram_bot_required: true` → la factory ne fait PAS le bot elle-même
2. Elle envoie un message Telegram à Karim via `@sok_ops_bot` avec :
   - "Crée un nouveau bot via @BotFather pour `<agent.name>`"
   - "Quand tu as le token, réponds-moi avec : `/registerbot <id> <token>`"
3. Karim répond → handler dans `dashboard.ts` reçoit `/registerbot` → ajoute dans .env + reload PM2
4. Self-test rejoue à ce moment-là

### 3.6 — Endpoint /create-agent dans dashboard

**Fichier à modifier** : `/app/silver-oak-os/src/dashboard.ts`

```typescript
app.post('/api/create-agent', async (c) => {
  const spec = await c.req.json();
  const result = await createAgent(spec);
  return c.json(result);
});
```

⚠️ Auth : utiliser le même token DASHBOARD_TOKEN que les autres endpoints.

### 3.7 — Tests Sprint 3

```bash
# Test unitaire factory
npx vitest run src/services/agent_factory_v2.test.ts

# Test E2E : créer un agent test_agent_001 via factory
curl -X POST http://localhost:3141/api/create-agent?token=$DASHBOARD_TOKEN \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_agent_001",
    "name": "TestBot",
    "description": "Test agent for factory v2 validation",
    "mission": "Just a test agent.",
    "role": "specialist",
    "soul_traits": ["gardien_validation_required"],
    "languages": ["fr", "en"],
    "skills_needed": ["gmail_read"],
    "telegram_bot_required": false,
    "domain_keywords": ["test", "factory_test", "bot_test"]
  }'

# Vérifications post-création :
# 1. ls /app/silver-oak-os/agents/test_agent_001/  → doit avoir CLAUDE.md, agent.yaml, skills/
# 2. cat agents/test_agent_001/CLAUDE.md  → doit contenir FR + EN sections
# 3. ls agents/test_agent_001/skills/  → doit contenir gmail_read/
# 4. SELECT * FROM agents WHERE id='test_agent_001'  → doit retourner ligne
# 5. Test routing : Alex doit router "test factory bot test" → test_agent_001

# Cleanup test :
rm -rf /app/silver-oak-os/agents/test_agent_001
sqlite3 store/claudeclaw.db "DELETE FROM agents WHERE id='test_agent_001'"
```

---

## ✅ CRITÈRES DE TERMINAISON (DoD)

Avant de dire TASK_DONE, TOUTES ces conditions DOIVENT être vraies :

- [ ] `/app/silver-oak-os/skills-library/` existe avec au moins 15 skills (3+/catégorie)
- [ ] `/app/silver-oak-os/soul-prompts/` existe avec traits + languages + roles + shared
- [ ] `/app/silver-oak-os/src/services/soul_prompt_builder.ts` existe et exporte `buildSoulPrompt`
- [ ] `/app/silver-oak-os/src/services/agent_factory_v2.ts` existe et exporte `createAgent`
- [ ] `skill-registry.ts` étendu pour scanner `agents/<id>/skills/` ET `skills-library/`
- [ ] `initSkillRegistry()` appelé au démarrage de `dashboard.ts`
- [ ] Migration Supabase + SQLite fallback : table `agents` existe et peuplée
- [ ] DOMAIN_ROUTES généré dynamiquement via `loadDomainRoutes()`
- [ ] Endpoint `POST /api/create-agent` opérationnel
- [ ] Test E2E `test_agent_001` créé + supprimé avec succès
- [ ] Tests vitest verts (444+ tests) — pas de régression
- [ ] `npx tsc --noEmit` retourne 0 erreur
- [ ] `pm2 reload silver-oak-os-backend --update-env` réussi
- [ ] Health check `/health` retourne 200 OK

---

## 📜 SOP V26 — Règles non-négociables à respecter

1. ✅ **R1 Anthropic banni** : Aucun appel Anthropic API en code (sauf via Claude Code SDK déjà existant)
2. ✅ **R2 Branche dédiée** : `feature/skills-souls-factory-v2-2026-05-03` (déjà créée)
3. ✅ **R7 Audit AVANT build** : Lire le rapport audit que je t'ai préparé dans /app/silver-oak-os/_missions/AUDIT_PRE_SPRINT.md AVANT de commencer (à créer si absent)
4. ✅ **R8 `x-test-mode:true`** dans tests
5. ✅ **R9 Retry until DoD green**
6. ✅ **R11 YAGNI strict** : Ne crée que ce qui est nécessaire
7. ✅ **R12 HITL** : Diff > 500 lignes ou cost > $1 → Telegram notification à Karim avant continuer
8. ✅ **R14 Judge Gemini cross-LLM** sur diff finale
9. ✅ **R18 Backup AVANT toute modif** : Pour chaque fichier modifié, créer `.bak.before-sprint-1-2-3-2026-05-03`
10. ✅ **R26 Pas de merge main** : Reste sur la feature branch
11. ✅ **R29 CHANGELOG update**
12. ✅ **R30 Rapport Telegram via sendDocument** à la fin
13. ✅ **JAMAIS pm2 restart all** : seulement `pm2 reload silver-oak-os-backend --update-env`
14. ✅ **JAMAIS supprimer fichiers** : déplace dans `_archive/`
15. ✅ **`npx tsc` (pas `npm run build`)** pour la compilation
16. ✅ **`esbuild` not `tsc`** pour les builds prod (mais pour ce sprint, `npx tsc --noEmit` pour validation)

---

## 🚨 Garde-fous spécifiques à cette mission

1. **Ne PAS toucher les CLAUDE.md des directeurs existants** (Lucas, Sara, etc.) — ils marchent. La factory v2 est utilisée pour les NOUVEAUX agents et la migration progressive.
2. **Ne PAS toucher `alex_orchestrator.ts` DOMAIN_ROUTES hardcodé immédiatement** — d'abord créer `loadDomainRoutes()` qui FALLBACK sur le hardcodé si registry vide. Migration progressive.
3. **Ne PAS toucher le bridge MCP** — il est instable, on ne fait QUE du Silver Oak OS code dans cette mission.
4. **Si Supabase indisponible** : fallback sur SQLite `store/claudeclaw.db`. Ne pas bloquer.
5. **Si BotFather automation impossible** : implémenter le workflow `/registerbot` manuel via Telegram.
6. **Tests à chaque sprint terminé** — pas tout à la fin. Sprint 1 fini → tests Sprint 1 → Sprint 2.
7. **Telegram notification après chaque sprint terminé** : "Sprint 1 DONE", "Sprint 2 DONE", "Sprint 3 DONE", "ALL DONE" final.

---

## 📲 Telegram Bot Factory

- Token : `8648150174:AAEkTaZkGEIPr5o-_AG8GMZJFJoaw7ffy3k`
- Chat ID : `5566541774`
- Bot username : `@sok_ops_bot`

**Appel** :
```bash
curl -s -X POST "https://api.telegram.org/bot8648150174:AAEkTaZkGEIPr5o-_AG8GMZJFJoaw7ffy3k/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": 5566541774, "text": "Sprint 1 DONE — Skills library opérationnelle"}'
```

---

## 🔁 Workflow d'exécution recommandé

1. **Audit pré-sprint** (10 min) : Lire le code actuel, identifier les fichiers à modifier
2. **Sprint 1 — Skills Library** (3-4h)
   - Créer skills-library/ + 15 SKILL.md
   - Étendre skill-registry.ts (scanner agents/<id>/skills/ + skills-library/)
   - Brancher initSkillRegistry() dans dashboard.ts startup
   - Test : `npx tsc --noEmit` + vitest verts + reload PM2
   - Rapport Telegram "Sprint 1 DONE"
3. **Sprint 2 — SoulPrompts Library** (2h)
   - Créer soul-prompts/ + traits + languages + roles + shared
   - Créer soul_prompt_builder.ts + tests
   - Test : vitest verts
   - Rapport Telegram "Sprint 2 DONE"
4. **Sprint 3 — Agent Factory v2** (4-5h)
   - Migration SQL agents table + INSERT existing agents
   - Créer agent_factory_v2.ts (createAgent fonction principale)
   - Modifier alex_orchestrator.ts pour loadDomainRoutes() dynamique
   - Endpoint /api/create-agent
   - Test E2E avec test_agent_001 + cleanup
   - Test self-test avec un agent existant
   - Rapport Telegram "Sprint 3 DONE"
5. **Validation finale**
   - tsc 0 erreur
   - vitest 444+ verts
   - pm2 reload --update-env
   - Health check 200
   - CHANGELOG update
   - git commit feature branch
   - Rapport Telegram final avec sendDocument

---

## 🎯 Rapport final attendu

À sauvegarder dans `/app/audits/rapports/20260503_sprint_skills_souls_factory_v2.md` :

```markdown
# Rapport Sprint Skills+Souls+Factory v2 — 2026-05-03

## Résumé
- Durée totale : XXh
- Sprint 1 : DONE | tests OK | xx fichiers
- Sprint 2 : DONE | tests OK | xx fichiers
- Sprint 3 : DONE | tests OK | xx fichiers

## Fichiers créés
- /skills-library/... (XX SKILL.md)
- /soul-prompts/... (XX fichiers)
- src/services/soul_prompt_builder.ts (XXX lignes)
- src/services/agent_factory_v2.ts (XXX lignes)

## Fichiers modifiés
- src/skill-registry.ts (étendu)
- src/dashboard.ts (initSkillRegistry + endpoint create-agent)
- src/agents/alex_orchestrator.ts (loadDomainRoutes dynamique)
- store/claudeclaw.db (table agents)

## Tests
- TSC : 0 erreur
- vitest : XXX/XXX verts
- E2E test_agent_001 : OK
- Self-test agent existant : OK

## Régressions identifiées
- Aucune / [liste]

## Limitations
- Bot Telegram création nécessite step manuel /registerbot
- ...

## Prochaines étapes recommandées
- Migration progressive des CLAUDE.md actuels vers buildSoulPrompt
- Suppression DOMAIN_ROUTES hardcodé une fois loadDomainRoutes confirmé stable
- Mode 3 claude-browser à re-déployer (mission séparée)
```

---

## ⚠️ FIN DE TÂCHE OBLIGATOIRE

Quand TOUT est validé (tous les critères DoD verts) :

```bash
# 1. Commit final
cd /app/silver-oak-os
git add -A
git commit -m "feat(factory-v2): skills-library + soul-prompts + agent_factory_v2 (SOP V26 R-déclaratif)

Sprint 1 (Skills Library):
- /skills-library/ avec 15+ skills atomiques réutilisables
- skill-registry.ts étendu : scanne agents/<id>/skills/ + skills-library/
- initSkillRegistry() branché au startup dashboard.ts

Sprint 2 (SoulPrompts Library):
- /soul-prompts/ avec traits trilingues (FR/EN/ES) + roles + shared blocks
- soul_prompt_builder.ts: buildSoulPrompt(spec) assemble CLAUDE.md complet
- Tests vitest verts

Sprint 3 (Agent Factory v2):
- agent_factory_v2.ts: createAgent(spec) orchestre TOUT en 1 appel
- Migration Supabase agents table (source unique de vérité)
- loadDomainRoutes() dynamique depuis registry (plus hardcodé)
- Endpoint POST /api/create-agent
- Self-test ping + delegation rules notif
- Test E2E test_agent_001 OK

Tests: tsc 0 erreur + vitest 444+ verts + E2E OK + reload OK

Karim approval: GO sprint 1+2+3 d'un coup, casquette CTO PhD, SOP V26 stricte"

# 2. Telegram final avec sendDocument
curl -s -X POST "https://api.telegram.org/bot8648150174:AAEkTaZkGEIPr5o-_AG8GMZJFJoaw7ffy3k/sendDocument" \
  -F "chat_id=5566541774" \
  -F "caption=Rapport final Sprint Skills+Souls+Factory v2" \
  -F "document=@/app/audits/rapports/20260503_sprint_skills_souls_factory_v2.md"

# 3. TASK_DONE OBLIGATOIRE
echo "TASK_DONE_SPRINT_SKILLS_SOULS_FACTORY_V2_2026-05-03"
```

---

## 🚀 GO

Lis l'audit que j'ai préparé pour toi (sections 1-12 de mon rapport CTO ci-dessus), commence par Sprint 1, puis Sprint 2, puis Sprint 3. Tests à chaque étape. Telegram notification après chaque sprint. Bonne chance Maestro !

Casquette : CTO PhD Senior. SOP V26 stricte. Karim n'utilise PAS Alex pendant ta mission. Tu as le champ libre.
