---
name: test-writer
description: Generate tests matching project framework and conventions
triggers:
  - write tests
  - test
  - unit test
---
# Test Writer
- Use Vitest for unit tests (project default)
- Use Jest for integration tests
- Match existing test patterns in __tests__/
- Mock Supabase, Redis, EventBus, LLM providers
- Always test: happy path, error cases, edge cases, auth
- Never use real API calls in tests
- Clean up mocks in afterEach
- Use descriptive test names
