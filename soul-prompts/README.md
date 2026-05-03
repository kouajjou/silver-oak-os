# SoulPrompts Library

Reusable personality blocks for assembling agent CLAUDE.md files.

## Structure

```
soul-prompts/
├── traits/       Behavioral traits (gardien, analyste, créatif, etc.)
├── languages/    Language blocks (FR/EN/ES rules)
├── roles/        Role definitions (orchestrator, specialist, workhorse)
└── shared/       Shared infrastructure blocks (hive_mind, memory, etc.)
```

## Usage

Use `buildSoulPrompt(spec)` from `src/services/soul_prompt_builder.ts` to assemble a complete CLAUDE.md.

```typescript
import { buildSoulPrompt } from './services/soul_prompt_builder.js';

const content = buildSoulPrompt({
  agentId: 'luca',
  agentName: 'Lucas',
  agentDescription: 'Airbnb Property Manager',
  role: 'specialist',
  traits: ['gardien_validation_required'],
  languages: ['fr', 'en', 'es'],
  customMission: 'Manage Karim\'s Airbnb properties autonomously.',
  sharedBlocks: ['boundary', 'hive_mind', 'memory', 'message_format'],
});
```

## Adding a new trait

Create `soul-prompts/traits/<trait_name>.md` with FR/EN/ES sections.
The file will be picked up by `buildSoulPrompt()` automatically.
