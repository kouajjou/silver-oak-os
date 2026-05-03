# Skill: prd_writer

**Agent**: Sophie (Product & UX)
**Priority**: P0

## Purpose

Write a complete Product Requirements Document (PRD) for a validated SaaS idea.
Output: signed-off spec that Maestro can build from without asking questions.

## When to use

After `idea_validation` returns GO.
Before any Maestro/engineering work begins.

## PRD structure

1. **Overview** — one paragraph: what it is, who it's for, why now
2. **Problem** — the specific pain with evidence (quotes, data, market size)
3. **Solution** — what we're building (not how — that's Maestro's job)
4. **Success metrics** — 3 measurable KPIs at 30/60/90 days
5. **User stories** — "As a [user], I want [action], so that [outcome]" — max 10
6. **Non-goals** — explicit list of what we are NOT building in v1
7. **Acceptance criteria** — binary checklist Maestro uses to verify completion
8. **Timeline** — estimated effort by component (days, not hours)
9. **Open questions** — unresolved decisions that need Karim input

## Output format

Full markdown document, saved to `saas/<saas-id>/PRD.md`.

## Guard-rails

- Non-goals section is MANDATORY — if missing, PRD is invalid
- Success metrics must be measurable (not "improve UX", but "J7 retention > 40%")
- Max 10 user stories for v1 — scope creep kills solo founders
- Always include HITL checkpoint: "Karim must approve PRD before build starts"
