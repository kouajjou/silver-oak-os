# Protocol de Tache Claudette

## Reclamer une tache
1. Lire TASKS.json dans /app/audits/plan-action-11-avril-2026/governance/
2. Trouver tache status:pending assignee a ta session, dependencies:done
3. Mettre claimedBy, claimLock ISO, status:in_progress

## Completer une tache
1. Executer chaque acceptanceCriteria.command
2. Verifier exit code = expectedExitCode
3. Si tous passed -> status:completed + evidence

## Rapport Telegram fin de tache
Format JSON dans coordination.log :
{"timestamp":"ISO","session":"nom","action":"completed","task":"TASK-XXXX","details":"resume"}
