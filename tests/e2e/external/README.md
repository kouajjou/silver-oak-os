# External E2E Tests (gap-015)

Tests Silver Oak OS depuis nimporte quelle machine avec internet.
Aucun acces SSH requis.

## Usage

```bash
export SILVER_OAK_API_TOKEN="<your-token>"
npx vitest tests/e2e/external/
```

## Tests inclus

- /api/chat/sync reply field
- /api/chat/sync response field (Item 2 compat)
- Auth rejection without token
- /api/voice/agents 404 (voiceRouter disabled)
- /api/health basic
- Maestro Opus gate (gap-004)

## Quand executer

- Avant chaque release
- Apres toute modif backend (CI)
- Manuel pour validation Karim
