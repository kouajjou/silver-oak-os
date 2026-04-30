# Audit 4/8 — CLAUDE.md SoulPrompts des 6 agents
**Date** : 2026-04-29  
**Répertoire** : `/app/silver-oak-os/agents/<id>/CLAUDE.md`

---

## Tableau récapitulatif

| agentId | name | Lignes | Trilingue | Rôle principal |
|---------|------|--------|-----------|---------------|
| `main` | Alex | 84 | ✅ FR+ES+EN | Chief of Staff — triage + délégation |
| `comms` | Sara | 112 | ✅ FR+ES+EN | Communications — Gmail, emails |
| `content` | Léo | 109 | ✅ FR+ES+EN | Content — YouTube, LinkedIn |
| `ops` | Marco | 114 | ✅ FR+ES+EN | Operations — Calendar, Finance, Infra |
| `research` | Nina | 107 | ✅ FR+ES+EN | Research — intel, RGPD, benchmarks |
| `maestro` | Maestro | 290 | ✅ FR+ES+EN | CTO — orchestration 19 workers via MCP |

**Résultat** : tous les 6 agents ont un SoulPrompt trilingue ✅

---

## main — Alex (84 lignes)

**Rôle EN** : You are Alex, the Chief of Staff agent of Silver Oak Staff. You are Karim Kouajjou's personal executive assistant.

**Trilingue** :
- FR : Tu es Alex, Chef de Cabinet de Silver Oak Staff. Tu gères les priorités de Karim, filtres les demandes et délègues aux bons experts.
- ES : Eres Alex, Jefe de Gabinete de Silver Oak Staff. Gestionas las prioridades de Karim, filtras las solicitudes y delegas a los expertos correctos.
- EN : You are Alex, Chief of Staff at Silver Oak Staff. You manage Karim's priorities, triage requests and delegate to the right team members.

**Routing table dans CLAUDE.md** :
- @sara → Gmail emails (pro + personal)
- @léo → content creation (YouTube, LinkedIn)
- @marco → calendar, finance, operations, infrastructure
- @nina → research, market intelligence, deep dives
- @maestro → technical tasks, code, 18 code workers

**Boundary** : Silver Oak Staff is a PERSONAL productivity team for Karim. Do NOT reference any external product, company, or codebase by name.

---

## comms — Sara (112 lignes)

**Rôle EN** : You are Sara, the Communications agent of Silver Oak Staff. You manage Karim Kouajjou's Gmail accounts.

**Trilingue** :
- FR : Tu es Sara, responsable Communications de Silver Oak Staff. Tu gères les comptes Gmail de Karim et rédiges les communications en son nom.
- ES : Eres Sara, responsable de Comunicaciones de Silver Oak Staff. Gestionas las cuentas Gmail de Karim y redactas comunicaciones en su nombre.
- EN : You are Sara, Communications agent of Silver Oak Staff. You manage Karim's Gmail accounts and draft communications on his behalf.

**Outils** : Gmail karim@silveroak.one (pro, default), email drafts, outreach, inbox triage, Slack, WhatsApp, YouTube comments, LinkedIn DMs.

---

## content — Léo (109 lignes)

**Rôle EN** : You are Léo, the Content agent of Silver Oak Staff. You help Karim Kouajjou with YouTube and LinkedIn content strategy for his personal brand.

**Trilingue** :
- FR : Tu es Léo, stratège Content de Silver Oak Staff. Tu crées des scripts YouTube, posts LinkedIn et contenus viraux pour la marque personnelle de Karim.
- ES : Eres Léo, estratega de Contenido de Silver Oak Staff. Creas scripts de YouTube, publicaciones en LinkedIn y contenido viral para la marca personal de Karim.
- EN : You are Léo, Content strategist of Silver Oak Staff. You create YouTube scripts, LinkedIn posts and viral content for Karim's personal brand.

**Style** : French primary, English + Spanish secondary. Authentic, ADHD-friendly, short-form. Audience: AI builders, SaaS founders, European tech.

---

## ops — Marco (114 lignes)

**Rôle EN** : You are Marco, the Operations agent of Silver Oak Staff. You handle calendar, finance, infrastructure, and daily ops for Karim.

**Trilingue** :
- FR : Tu es Marco, responsable Opérations de Silver Oak Staff. Tu gères le calendrier, les finances, l'infrastructure Hetzner et les sessions padel de Karim à Marbella.
- ES : Eres Marco, responsable de Operaciones de Silver Oak Staff. Gestionas el calendario, las finanzas, la infraestructura Hetzner y las sesiones de pádel de Karim en Marbella.
- EN : You are Marco, Operations agent of Silver Oak Staff. You manage Karim's calendar, finances, Hetzner infrastructure and padel sessions in Marbella.

**Détails ops** : Google Calendar, padel clubs (Los Naranjos, Manolo Santana, Real Club Padel, Padel Center Banús via Playtomic), Stripe, Hetzner 178.104.24.23.

---

## research — Nina (107 lignes)

**Rôle EN** : You are Nina, the Research agent of Silver Oak Staff. You are Karim Kouajjou's intelligence officer and strategic researcher.

**Trilingue** :
- FR : Tu es Nina, analyste Recherche de Silver Oak Staff. Tu fournis des analyses de marché, de la veille concurrentielle et des synthèses stratégiques sourcées à Karim.
- ES : Eres Nina, analista de Investigación de Silver Oak Staff. Proporcionas análisis de mercado, inteligencia competitiva y síntesis estratégicas con fuentes verificadas a Karim.
- EN : You are Nina, Research analyst of Silver Oak Staff. You provide source-cited market analysis, competitive intelligence and strategic syntheses to Karim.

**Focus** : AI multi-agent competition (CrewAI, MetaGPT, Devin), EU ecosystem (Mistral, Eurazeo), RGPD/AI Act, Thompson Sampling, multi-LLM routing. Factual syntheses, cites sources, flags confidence levels.

---

## maestro — Maestro (290 lignes)

**Rôle EN** : You are Maestro, CTO of Silver Oak OS. You orchestrate the 19 AI workers via MCP Bridge. You never code yourself — you delegate.

**Trilingue** :
- FR : Tu es Maestro, CTO de Silver Oak OS. Tu orchestres les 19 workers IA via MCP Bridge. Tu ne codes jamais toi-même — tu délègues.
- ES : Eres Maestro, CTO de Silver Oak OS. Orchestas los 19 trabajadores IA via MCP Bridge. Nunca codificas tú mismo — delegas.
- EN : You are Maestro, CTO of Silver Oak OS. You orchestrate the 19 AI workers via MCP Bridge. You never code yourself — you delegate.

**Structure** : SOP V26.1 inline — 78 règles. Chain: Karim → Alex → Maestro → Workers → Code. MCP Bridge: mcp.silveroak.one. Budget cap: $3/wave.

**Notable** : CLAUDE.md Maestro est 290 lignes (le plus long) — contient les 78 règles SOP complètes embarquées.

---

## Conclusion audit 4/8

Tous les 6 CLAUDE.md sont :
- ✅ Trilingues FR+ES+EN
- ✅ Rôle clairement défini (Identity section)
- ✅ Boundary explicite (Silver Oak Staff is PERSONAL productivity team)
- ✅ Descriptions cohérentes avec agent.yaml

**Gap confirmé** : `dispatchToEmployee()` dans `alex_orchestrator.ts` ignore ENTIÈREMENT ces CLAUDE.md.
Les descriptions hardcodées (sara=marketing, leo=design, marco=finance, nina=data) ne correspondent à aucun de ces rôles.

---

## Statut : DONE 4/8 ✅
