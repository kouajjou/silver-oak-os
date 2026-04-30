# Audit 12 - Maestro Mode 1 / Mode 2 : realite des dispatches
Date : 2026-04-29
Fichiers : src/agents/maestro_orchestrator.ts (218 lignes) + src/services/cli_tmux_dispatcher.ts (6003 bytes)

## 1. Architecture reelle maestroHandle()

maestroHandle passe par 6 etapes :
1. breakDownTaskSafe(task)      -> optionnel, decompose en sous-taches
2. classifyTaskComplexity(task) -> mode_1_tmux | mode_2_api
3. Build MaestroTask payload    -> task_description, user_id, mode, max_tokens
4. dispatchToMaestro(payload)   -> resultat via maestro_dispatcher.ts
5. judgeResultSafe()            -> score qualite (non-bloquant)
6. logAgentRun()                -> persistance DB

POINT CLE : maestroHandle() ne fait PAS callProMax() ni callLLM() directement.
Il delegue TOUT a dispatchToMaestro() qui fait le vrai travail.

## 2. Mode 1 tmux Pro Max - comment ca marche EXACTEMENT

Fichier : src/services/cli_tmux_dispatcher.ts

Flux :
Factory -> POST /dispatch (MCP Bridge mcp.silveroak.one)
        -> tmux session opus / claude-code / claude-backend / claude-frontend
        <- poll read_session_output (MCP StreamableHTTP)
        <- TASK_DONE detecte -> retourne le resultat

Sessions tmux supportees : opus, claude-code, claude-backend, claude-frontend

Protocole MCP :
1. mcpInit() -> POST /mcp initialize -> retourne mcp-session-id
2. send_to_session(session, message) via MCP StreamableHTTP
3. Poll read_session_output jusqu a TASK_DONE

Cout : 0 dollar marginal (forfait Pro Max ~200 dollar/mois flat)

Serveur cible : MCP_BRIDGE_URL=https://mcp.silveroak.one
Ce serveur MCP Bridge est sur CLAUDETTE (178.104.24.23), pas sur Silver Oak OS (178.104.255.59).

## 3. Mode 2 API - comment ca marche EXACTEMENT

ATTENTION : maestro_orchestrator.ts n importe PAS callLLM directement.
Aucun import de adapters/llm dans le fichier.

Le mode 2 passe aussi par dispatchToMaestro() avec mode: mode_2_api.
C est maestro_dispatcher.ts qui appelle ensuite callLLM() avec le provider.

Filter providers pour Mode 2 : gemini/grok/mistral sont filtres.
Providers actifs Mode 2 : deepseek, openai (keys presentes dans .env).

## 4. Filesystem write - Maestro peut-il modifier du code ?

REPONSE : NON sur Silver Oak OS

Preuves :
- maestro_orchestrator.ts n a PAS de tools[] avec Edit/Write/Bash
- Aucun import writeFileSync dans maestro_orchestrator.ts
- Seul fs utilise : fs.readFileSync(agents/maestro/CLAUDE.md) -> lecture seule
- Pas de callProMax() -> pas de Claude Code SDK avec allowDangerouslySkipPermissions

Comment le code modifie-t-il du code alors ?
Via Mode 1 : les workers tmux (claude-backend, claude-code) sur Claudette (178.104.24.23)
SONT des sessions Claude Code avec droits filesystem. Ils peuvent modifier des fichiers
sur Claudette. Mais Claudette n est PAS le meme serveur que Silver Oak OS.

## 5. Serveurs impliques

Silver Oak OS backend : 178.104.255.59
MCP Bridge mcp.silveroak.one : Claudette 178.104.24.23
Workers tmux (opus/claude-code/etc) : Claudette 178.104.24.23

Variables .env confirmees :
MCP_BRIDGE_URL=https://mcp.silveroak.one
MCP_BRIDGE_TOKEN=e8e6c27f94d32b60875c58715331bb93fa173d88af7d9bd2

## 6. REPONSE FINALE : Maestro peut-il modifier alex_orchestrator.ts lui-meme ?

NON - pour 3 raisons :

1. maestro_orchestrator.ts ne fait pas d appel direct SDK (pas de callProMax)
2. Il n a pas de tools filesystem (pas Edit/Write/Bash)
3. Les workers tmux Mode 1 tournent sur Claudette (178.104.24.23),
   pas sur Silver Oak OS (178.104.255.59)

CONCLUSION : Pour modifier /app/silver-oak-os/src/agents/alex_orchestrator.ts,
il faut soit :
- Un worker ssh sur 178.104.255.59 avec acces au code source
- Ou une session Claude Code qui tourne DIRECTEMENT sur 178.104.255.59

Les workers claude-backend/claude-code de Claudette ne peuvent modifier
que les fichiers de Claudette (/app/Usine-SaaS/...), pas les fichiers Silver Oak OS.

Fix alex_orchestrator.ts doit etre fait manuellement ou via une session
Claude Code sur 178.104.255.59 (pas via le pipeline Maestro standard).

## Statut : DONE
