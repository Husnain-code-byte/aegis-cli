---
description: Specification conventions for feature specs and documentation
paths:
  - "docs/specs/**/*"
  - "docs/adr/**/*"
  - "docs/architecture/**/*"
  - "**/*.feature"
---

# Specification Conventions

## Feature Specs (`docs/specs/<feature>/`)
- `pr-faq.md` — Amazon PR/FAQ: customer problem, solution, success criteria
- `gherkin.feature` — BDD scenarios: Given-When-Then, happy + error + edge paths
- `test-plan.md` — verification architecture: test types, properties, mutation threshold, edge cases

## Architecture Decision Records (`docs/adr/`)
- MADR format only
- File naming: `NNNN-lowercase-kebab-case.md`
- Index: `docs/adr/README.md` must be updated with every new ADR
- Status: proposed → accepted → deprecated → superseded
- Every ADR names what was given up (consequences)

## Architecture Diagrams (`docs/architecture/`)
- C4 Model: System Context → Container → Component → (Code is in the codebase)
- PlantUML format (text-based, git-friendly)
- Text labels on all relationships — not just arrows
- Updated when architecture changes — not just at initial design

## Spec Quality Standards
- Spec written BEFORE implementation — never reverse-engineered from code
- Human reviews and approves spec before AI implements
- Every spec scenario must be independently testable
- Unclear requirements flagged and clarified before implementation
- "No" is explicit — list what we are NOT building (anti-goals)
