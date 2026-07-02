---
name: spec-write
description: Generate a BDD specification (Gherkin) and test plan for a feature. Use BEFORE any implementation code.
disable-model-invocation: true
argument-hint: [feature-name]
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Write Feature Specification

Generate a complete BDD specification for feature: $ARGUMENTS

## Output Files
Create:
1. `docs/specs/$ARGUMENTS/pr-faq.md` — Amazon PR/FAQ format
2. `docs/specs/$ARGUMENTS/gherkin.feature` — Gherkin scenarios
3. `docs/specs/$ARGUMENTS/test-plan.md` — Verification architecture

## Process
1. Read the project vision: `project-memory/01-vision.md`
2. Read the subsystem map: `project-memory/02-subsystem-map.md`
3. Write PR/FAQ: what problem, for whom, success criteria, anti-goals
4. Write Gherkin: Given-When-Then for happy path, error path, edge cases, boundary conditions
5. Write test plan: property-based test properties, mutation threshold (default 80%), explicit edge cases

## Gherkin Requirements
- Happy path covered
- Error path covered (invalid input, missing data, unauthorized)
- Edge cases covered (empty, null, boundary values, concurrent access, timeouts)
- No implementation details (no CSS selectors, API routes, DB queries)
- Each scenario tests exactly ONE behavior

After writing, immediately invoke the spec-reviewer agent to review the spec.
