---
name: code-review
description: Structured code review patterns for security, performance, and style
triggers:
  - review
  - code review
  - PR review
---
# Code Review Checklist
## Security
- [ ] No hardcoded secrets/tokens
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention
- [ ] Auth checks on all routes
## Performance
- [ ] No N+1 queries
- [ ] Proper indexing
- [ ] No memory leaks (event listeners cleaned up)
- [ ] Async operations handled correctly
## Style
- [ ] TypeScript strict types (no any)
- [ ] Consistent naming conventions
- [ ] Error handling (try/catch with proper logging)
- [ ] No console.log in production code
## Testing
- [ ] Unit tests for new functions
- [ ] Edge cases covered
- [ ] Mocks cleaned up after tests
