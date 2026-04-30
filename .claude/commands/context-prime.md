# /context-prime — Project Context Loader

Load comprehensive context for the Claudette by Silver Oak project at the start of a session.

## What this command does

1. Reads CLAUDE.md for architecture overview
2. Shows current git status + recent commits
3. Loads .forge/state.json for session state
4. Lists modified files
5. Shows current test score if available

## Steps

### 1. Git Status & Branch
Run: `git status --short && git log --oneline -5`

### 2. Forge State
Read `.forge/state.json` — show active tasks and context.

### 3. Modified Files (from git status)
List the files currently modified (staged + unstaged).

### 4. Architecture Summary
Key components:
- `claudette-core/backend/src/agents/ceo/` — CEO orchestrator (post-B1, 8 modules)
- `claudette-ui/` — Next.js 16 dashboard
- `docker/clawbot/` — Containerized agent

### 5. Active Branch Context
Based on the branch name, identify what's being worked on:
- `fix/*` → Bug fix — check recent test results
- `feature/*` → New feature — check .forge/specs/
- `master` → Production — be extra careful

### 6. Test Status (if available)
Look for recent test output in `.forge/state.json > context.testScore`

## Output Format

```
🎯 Context Loaded — Claudette by Silver Oak
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Branch: [branch-name]
📝 Last 3 commits: [commits]

🔧 Active Tasks:
  • [task 1]
  • [task 2]

📁 Modified Files:
  • [file 1]
  • [file 2]

⚡ Quick Start:
  - To continue: [what to do based on active tasks]
  - Critical files: [from .forge/state.json]
```
