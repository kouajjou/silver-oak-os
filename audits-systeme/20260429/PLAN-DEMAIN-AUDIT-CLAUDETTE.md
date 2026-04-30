# 📋 AUDIT CLAUDETTE — Plan demain (jeudi 30/04/2026)

> Préparé par Cowork PhD-mode le 29/04/2026 ~22h00
> Pour Karim — café tranquille demain matin avant d'attaquer

---

## 🎯 But de l'audit

Décider **quoi garder, quoi tuer** sur Claudette (178.104.24.23).
Stratégie : Factory = usine dev | Claudette = produit prod pour clients.

---

## 🔍 État actuel découvert (29/04 soir)

### Sur Claudette
- **PM2 services TOUS STOPPED** ⚠️ : claudette-api, mcp-bridge, dispatcher, worker, guardrails
- **19 sessions tmux ACTIVES** : claude-code, opus, aider-*, gpt4o-*, grok-*, deepseek-r1-*, audit-gemini-*
- **`/app/silver-oak-os` présent** (cloné aussi sur Claudette pour je-ne-sais-quelle-raison)

### Conclusion préliminaire
Claudette = **machine dev complètement à l'arrêt côté services**. Seules les sessions tmux dev sont vivantes.
**Aucun client beta n'utilise actuellement Claudette en prod.**

---

## 🗺️ Plan jeudi matin (3h)

### Phase 1 — Audit fin (45 min)
1. **Lister tout** ce qui tourne sur Claudette :
   - `pm2 list` (qui est online vs stopped)
   - `tmux list-sessions` (19 confirmées)
   - `systemctl list-units --type=service --state=active`
   - `crontab -l && crontab -l -u claude-temp`
   - Quels ports écoutent encore ? `ss -tlnp`
2. **Identifier** ce qui pointe encore sur Claudette :
   - DNS `claudette.silveroak.one`, `app.silveroak.one`, etc.
   - Caddy/nginx config
   - GitHub Actions runners
   - Webhooks externes
   - Cron jobs

### Phase 2 — Décision archive vs kill (15 min)
Pour chaque service Claudette, décider :
- ✅ **Garde** : claudette-api, frontend (futurs clients)
- ❌ **Archive** : tous les services dev (mcp-bridge, dispatcher, reviewer, beads, guardrails)
- ❌ **Kill** : 19 sessions tmux dev

### Phase 3 — Migration source-of-truth Claudette (1h)
- Copier `/app/produits-saas/factory/claudette/` (le vrai code Claudette SaaS) → endroit propre
- Cleaner backups inutiles dans `_archive/`
- Tag git `pre-beta-clean-2026-04-30`

### Phase 4 — Nettoyage progressif (Strangler Fig) (45 min)
- **NE PAS big-bang** : kill 1 service, vérifier rien casse, kill suivant
- Commencer par les + sûrs : audit-gemini-*, grok-*, gpt4o-*, deepseek-r1-*
- Ensuite : aider-* (peut-être encore utiles pour Maestro Mode 2)
- En dernier : claude-code, claude-backend, claude-frontend, opus
- **Chaque kill** = `pm2 delete X && pm2 save`

### Phase 5 — Documentation (15 min)
- Rapport dans `/app/silver-oak-os/audits-systeme/20260430/audit-claudette-cleanup.md`
- Telegram récap

---

## 🚨 Pièges à éviter demain

1. ❌ **Big bang** : tout tuer d'un coup → perte d'historique, casse caddy/dns
2. ❌ **Sans audit** : tuer un service qui sert encore (R6)
3. ❌ **Sans backup** : `pm2 save` AVANT chaque suppression
4. ❌ **Sans tag git** : impossible de revenir en arrière
5. ❌ **Toucher au code Claudette SaaS** : c'est le PRODUIT, on touche pas

---

## 🔑 Commandes prêtes à coller

### Audit
```bash
# Sur Claudette via SSH
ssh root@178.104.24.23
pm2 list --no-color > /tmp/audit-pm2.txt
tmux list-sessions > /tmp/audit-tmux.txt
ss -tlnp | grep LISTEN > /tmp/audit-ports.txt
systemctl list-units --type=service --state=active --no-pager > /tmp/audit-systemd.txt
crontab -l > /tmp/audit-cron.txt 2>&1
ls /app/ > /tmp/audit-app.txt
df -h /app /var > /tmp/audit-disk.txt
```

### Kill safe
```bash
# Tag pour rollback
cd /app/Usine-SaaS && git tag pre-beta-cleanup-20260430 && git push --tags

# Kill par catégorie (Strangler Fig)
# 1) Audit pool
pm2 delete audit-gemini-1 audit-gemini-2 audit-gemini-3 || true

# 2) APIs tier (gpt4o, grok, deepseek-r1)
tmux kill-session -t gpt4o-1 ; tmux kill-session -t gpt4o-2
tmux kill-session -t grok-1 ; tmux kill-session -t grok-2
tmux kill-session -t deepseek-r1-1 ; tmux kill-session -t deepseek-r1-2

# 3) Aider sessions (gardé jusqu'à confirmation)
# tmux kill-session -t aider-deepseek-1 ...

# 4) PM2 save après chaque batch
pm2 save
```

### Vérifications
```bash
# Après chaque kill, vérifier rien ne casse
curl -s http://localhost:80/api/health
curl -s https://app.silveroak.one/api/health
pm2 list
```

---

## 📊 Décision matrice (à valider demain matin)

| Service Claudette | Garder ? | Pourquoi |
|---|---|---|
| claudette-api | ✅ | Backend prod clients beta |
| frontend | ✅ | UI prod clients beta |
| nginx/caddy | ✅ | Reverse proxy public |
| Supabase (cloud) | ✅ | DB prod |
| Redis | ✅ | Cache + queues prod |
| **mcp-bridge** | ❌ | Dev only, remplacé par Factory |
| **dispatcher-v2** | ❌ | Dev only |
| **reviewer-v2** | ❌ | Dev only |
| **beads-memory** | ❌ | Dev only |
| **hitl-webhook** | ❌ | Dev only |
| **guardrails-l1/l2** | 🤔 | Peut-être utile en prod ? À discuter |
| **19 tmux sessions** | ❌ | Toutes dev, on tue |
| **opus session** | ❌ | C'est un Claude Opus dev, pas un Maestro |

---

## ✅ Définition de succès demain

| Critère | Indicateur |
|---|---|
| Claudette = prod-only | `pm2 list` n'a que claudette-api + frontend |
| Pas de regression | `curl /api/health` retourne 200 |
| Tout tagué git | `git tag` montre `pre-beta-cleanup-20260430` |
| Maestro fonctionne sur Factory | `agent_status` montre Maestro online |
| Rapport Telegram envoyé | Karim reçoit récap PDF/HTML |

---

## 🎯 Question à te poser au café

Veux-tu :
- **A** : Faire l'audit Claudette MOI MEME demain matin (3h focus)
- **B** : Déléguer à Cowork qui fait tout en autonomie (tu valides à la fin)
- **C** : Mode mix — Cowork audit + propose plan, tu valides chaque kill avant exécution

**Recommandation PhD : C** — sécurité maximum, pas de big-bang, tu gardes le contrôle.
