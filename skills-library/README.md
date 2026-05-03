# Skills Library

Shared, reusable skills for Silver Oak OS agents.

## Structure

```
skills-library/
├── communication/   Email, Telegram, WhatsApp
├── data/            Database queries, exports
├── browser/         Playwright + specific site browsers
├── calendar/        Google Calendar
├── finance/         Stripe, MRR
└── validation/      Human-in-the-loop checks
```

## Usage

Skills are auto-discovered by `skill-registry.ts` at startup.
Each skill is a directory with a `SKILL.md` file using the standard frontmatter format.

When creating a new agent via `createAgent(spec)`, specify `skills_needed: ['gmail_read', 'airbnb_browser']`
and the factory will copy those skills from this library into `agents/<id>/skills/`.

## Adding a new skill

1. Create `skills-library/<category>/<skill_name>/SKILL.md`
2. Use the frontmatter format: `name`, `description`, `triggers`, `allowed-tools`
3. No restart needed — registry rescans on demand
