# Skill: rice

**Agent**: Sophie (Product & UX)
**Priority**: P0

## Purpose

Prioritize features or ideas using the RICE framework to avoid building based on gut feeling.

## Formula

**RICE Score = (Reach × Impact × Confidence) / Effort**

- **Reach**: How many users affected per quarter? (number)
- **Impact**: How much does it move the needle? (0.25 = minimal, 0.5 = low, 1 = medium, 2 = high, 3 = massive)
- **Confidence**: How sure are we? (50% = low, 80% = medium, 100% = high)
- **Effort**: Person-weeks to build (1 = 1 week, 2 = 2 weeks, etc.)

## When to use

When Karim has a backlog of features and needs to decide what to build next.
Input: list of candidate features.
Output: ranked RICE scorecard.

## Output format

| Feature | Reach | Impact | Confidence | Effort | RICE Score |
|---------|-------|--------|------------|--------|------------|
| Feature A | 500 | 2 | 80% | 1 | 800 |
| Feature B | 200 | 3 | 50% | 3 | 100 |

**Recommendation**: Build [Feature A] first because [reason].

## Guard-rails

- Always question Reach estimates — solo founders tend to overestimate
- Confidence below 50% = more validation needed before building
- Effort above 4 weeks = consider breaking into smaller chunks
