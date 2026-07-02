---
description: Testing conventions for all test files
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/tests/**/*"
  - "**/__tests__/**/*"
  - "**/*.feature"
---

# Testing Conventions

## Test Types
- **Unit tests** — test one function/component in isolation
- **Integration tests** — test interaction between modules
- **Contract tests** — test API boundaries against OpenAPI spec
- **E2E tests** — test complete user flows
- **Property-based tests** — for computation-heavy logic (Hypothesis/Fast-Check)
- **Mutation tests** — verify test quality (Stryker/PITest, threshold >= 80%)

## BDD / Gherkin Standards
- Given-When-Then structure for every scenario
- One behavior per scenario — test exactly ONE thing
- Scenarios describe WHAT not HOW — no implementation details
- Cover: happy path, error path, edge cases, boundary conditions

## Test Quality
- Every test must assert on a meaningful outcome — "function ran" is not an assertion
- Tests must be independent — no shared state between tests
- Tests must be deterministic — no flaky tests (no time-based, no random, no order-dependent)
- Test one thing per test — compound assertions make debugging harder
- Descriptive test names: "returns 404 when user not found" not "test case 3"

## Frontend Testing
- Use content-based selectors (`getByText('Submit')`) — never positional selectors
- Never use `setTimeout` for waiting — use `waitFor` / `findBy` with explicit conditions
- Test from user perspective: what they see, what they click, what changes
- Visual regression tests for components with visual variants

## Mutation Testing Gate
- Run Stryker (JS/TS) or PITest (Java) on changed code
- Threshold: >= 80% mutation score
- If score < 80%: tests are inadequate — write more tests before commit
- Mutation testing proves your tests actually catch bugs
