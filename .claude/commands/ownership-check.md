Vérifie que tous les fichiers que tu t'apprêtes à modifier sont bien assignés à ta session dans ownership.json.

Chemin : /app/audits/plan-action-11-avril-2026/governance/ownership.json

Commande de vérification :
```bash
cat /app/audits/plan-action-11-avril-2026/governance/ownership.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
modules=d.get('modules',[])
ma_session='<TA-SESSION>'
mes_modules=[m['path'] for m in modules if m['owner']==ma_session]
print('Mes modules:', mes_modules)
"
```

Si un fichier que tu veux modifier n'est PAS dans ta liste :
- STOP
- Log dans coordination.log : {"action":"conflict","session":"ta-session","details":"tentative de toucher <fichier> appartenant à <autre-session>"}
- Contacter la session owner via coordination.log
- Attendre coordination avant de continuer
