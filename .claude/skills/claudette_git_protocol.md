# Protocol Git Multi-Agents Claudette

## Avant de commencer
```bash
git -C /app/silver-oak-os worktree add /app/worktrees/<session> -b task/<TASK-ID>
cd /app/worktrees/<session>
```

## Convention branches
- `task/TASK-0001-fix-health-endpoint`
- `hotfix/TASK-0002-disable-test-mode`

## Workflow
1. Travailler dans le worktree isolé
2. Tests verts : npx tsc --noEmit --skipLibCheck + acceptanceCriteria
3. Cross-review pour P0/P1 : utiliser /cross-review
4. PR : gh pr create --draft --title "task: TASK-XXXX description"
5. Merge séquentiel uniquement (jamais 2 merges en parallèle)
6. Cleanup : git worktree remove /app/worktrees/<session> --force

## Jamais
- Committer directement sur master/main
- Merger sans tests verts
- Toucher les fichiers assignés à une autre session (voir ownership.json)
- pm2 restart all depuis la session
