# 🎯 BLOQUANT — Login Pro Max sur Factory pour user claudeclaw

> Découvert le 29/04/2026 ~21h45 marathon nuit
> Bloque le lancement Maestro Mode 1 (4 sessions tmux Pro Max)

## Situation

Sur **Factory** (178.104.255.59):
- User `claudeclaw` (uid 1000) existe et peut lancer `claude`
- `--dangerously-skip-permissions` interdit en root → must be claudeclaw
- ❌ `claudeclaw` n'a JAMAIS fait le login Pro Max sur cette machine

Sur **Claudette** (178.104.24.23):
- User `claude-temp` est loggé et utilise tmux Pro Max forfait $0
- Ce login a été fait en juillet 2024 et est resté actif depuis

## Pourquoi c'est bloquant

Pour lancer Mode 1 Maestro, il faut 4 tmux Pro Max LOCAUX:
- claude-code
- claude-backend
- claude-frontend
- opus

Sans login, Claude CLI demande:
1. Theme → OK auto
2. **Account type** → user input requis
3. **OAuth URL** → browser requis (impossible via tmux)

## Solutions possibles

### A) Login direct via browser (recommandé, 5 min)
Karim ouvre une session SSH GUI ou X11 forwarding:
```bash
ssh -X root@178.104.255.59
sudo -u claudeclaw -i bash
cd /app/silver-oak-os
claude
# → URL OAuth s'ouvre, Karim auth dans son browser
```

### B) Copier les credentials Claude Code de Claudette
Si l'OAuth token de claude-temp@Claudette est stocké dans un fichier copiable:
```bash
# Sur Claudette
sudo -u claude-temp ls -la ~/.config/claude/
# Si token JSON trouvé → scp vers Factory ~/.config/claude/ pour claudeclaw
```
⚠️ Risqué - peut violer terms of service Anthropic Pro Max (login transferable).

### C) Reporter Mode 1 → use Mode 2 only (5 LLM API non-Anthropic) jusqu'au login
- Mode 2 marche déjà 100% (DeepSeek + Gemini testés ✅)
- Maestro peut dispatcher uniquement aux 5 APIs en attendant
- Login Pro Max claudeclaw = étape demain matin tranquille

## Recommandation

**C en attendant + A demain matin.**

Cowork peut continuer à 200% avec Mode 2 (5 APIs) ce soir.
Demain matin, login Pro Max via browser quand Karim a son café.

## Effort estimé pour A (login)

- 5 min Karim (ouvre URL OAuth, copie token)
- Plus rien à coder côté Factory

## Status

[ ] Login claudeclaw → claude.ai Pro Max
[ ] Test session 1: claude-code
[ ] Test session 2: claude-backend
[ ] Test session 3: claude-frontend
[ ] Test session 4: opus
[ ] Maestro dispatch test send_to_session
