# Protocol Tâche Claudette

## Réclamer une tâche
1. Lire /app/audits/plan-action-11-avril-2026/governance/TASKS.json
2. Trouver tâche status:pending assignée à ta session, toutes dependencies:completed
3. Mettre claimedBy: "<session>", claimLock: "<ISO timestamp>", status: "in_progress"
4. Créer git worktree : git worktree add /app/worktrees/<session> -b task/<TASK-ID>

## Compléter une tâche
1. Exécuter chaque acceptanceCriteria.command
2. Vérifier exit code = expectedExitCode
3. Si tous passed → status: "completed", remplir evidence[]
4. Supprimer worktree : git worktree remove /app/worktrees/<session> --force

## Rapport Telegram fin de tâche (P0/P1 uniquement)
```bash
BOT=$(grep "TELEGRAM_BOT_TOKEN" .env | head -1 | cut -d'=' -f2 | tr -d '"' | xargs)
CHAT=$(grep "TELEGRAM_ADMIN_ID" .env | head -1 | cut -d'=' -f2 | tr -d '"' | xargs)
curl -s -X POST "https://api.telegram.org/bot${BOT}/sendMessage" -d chat_id=${CHAT} --data-urlencode "text=✅ TASK-XXXX terminée — <session>"
```

## Log dans coordination.log
Append : {"timestamp":"ISO","session":"nom","action":"completed","task":"TASK-XXXX","details":"résumé"}
