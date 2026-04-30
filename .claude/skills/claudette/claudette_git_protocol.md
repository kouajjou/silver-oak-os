# Protocol Git Multi-Agents

## Avant de commencer
git worktree add /app/worktrees/<session> -b task/<TASK-ID>

## Convention branches
task/TASK-0001-fix-health-endpoint

## Merge
1. Tests verts dans worktree
2. Cross-review demande
3. PR creee : gh pr create --draft
4. Merge sequentiel uniquement

## Jamais
- Committer sur main directement
- Merger sans tests verts
- Toucher fichiers d'une autre session
