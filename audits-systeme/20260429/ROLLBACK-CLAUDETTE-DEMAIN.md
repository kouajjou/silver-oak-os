# 🔧 ROLLBACK CLAUDETTE — Demain matin (5 min)

## Étape 1 — SSH Claudette depuis ton Mac

Ouvre un terminal sur ton Mac (Marbella) :

```bash
ssh root@178.104.24.23
```

(Utilise ta clé SSH locale qui marche déjà — pas besoin de password)

## Étape 2 — Vérifier l'état

```bash
cd /app/mcp-bridge
pm2 list | grep mcp-bridge
ls -la src/mcp.ts*.bak* 2>&1 | head -10
```

Tu devrais voir des fichiers `mcp.ts.bak.before-await-fix-*` récents.

## Étape 3 — Rollback

```bash
# Trouve le backup le plus récent
LATEST_BAK=$(ls -t /app/mcp-bridge/src/mcp.ts*.bak* 2>/dev/null | head -1)
echo "Backup à restaurer : $LATEST_BAK"

# Restaure
cp "$LATEST_BAK" /app/mcp-bridge/src/mcp.ts

# Vérifie
git diff src/mcp.ts | head -20
```

## Étape 4 — Compile + reload

```bash
npx tsc 2>&1 | tail -5
# Si 0 erreur :
pm2 reload mcp-bridge --update-env
sleep 3
pm2 logs mcp-bridge --lines 10 --nostream
curl -s http://localhost:3003/health | head -5
```

## Étape 5 — Vérifier depuis Cowork

Ouvre une fresh conversation Cowork et teste :
```
@MCP Claudette api_latency
```

Tu dois recevoir une réponse (pas {} ni erreur).

---

# Si le backup n'existe pas

Si `ls src/mcp.ts*.bak*` ne montre rien, alors aider-deepseek-1 n'a **jamais touché** au fichier. Le bridge est down pour une autre raison.

Dans ce cas :

```bash
# Check pm2 logs error
pm2 logs mcp-bridge --err --lines 30 --nostream

# Force restart
pm2 stop mcp-bridge
pm2 delete mcp-bridge
cd /app/mcp-bridge
npm install --production
npx tsc
pm2 start ecosystem.config.cjs --only mcp-bridge
pm2 save
```

---

# 🎯 Audit complet à faire ENSUITE

Une fois MCP Claudette online, le rapport d'audit live est dans :
```
cat /tmp/audit-claudette-live.md | less
```

Ce fichier contient tout : PM2 list, tmux sessions, ports, services systemd, crons, RAM, etc. Tu peux le ramener sur Factory :

```bash
scp /tmp/audit-claudette-live.md root@178.104.255.59:/app/silver-oak-os/audits-systeme/20260430/
```

Puis cleanup safe selon le plan dans :
```
/app/silver-oak-os/audits-systeme/20260429/CLEANUP-CLAUDETTE-LIVE-PLAN.md
```
