Demande une cross-review à claude-code (Coordinator) avant de merger.

Utilise ce command pour les tâches P0 et P1 uniquement.

Format de la demande :
1. Résume ce que tu as changé (3 lignes max)
2. Liste les fichiers modifiés
3. Colle les résultats des acceptanceCriteria (exit codes)
4. Demande confirmation avant merge

Log dans coordination.log :
{"timestamp":"ISO","session":"ta-session","action":"cross-review","task":"TASK-XXXX","details":"demande review à claude-code"}

Attends la réponse du Coordinator avant de lancer gh pr merge.
