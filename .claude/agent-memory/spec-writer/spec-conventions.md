---
name: spec-conventions
description: Gherkin/BDD specification conventions established for Aegis CLI feature specs
metadata:
  type: reference
---

F-007 Workspace Detection spec set the baseline convention. Gherkin features use exactly 16 scenarios: 3 happy-path, 5 error-path, 8 edge-case. Test-plan follows the F-002 pattern with Property/Unit/Integration/Mutation layers, 6 verification gates (TypeCheck, Unit, Integration, Property, Mutation, Specs), and a Scenario-to-Test Mapping table. PR/FAQ uses Press Release, FAQ (5-7 Qs), Success Criteria (8-14 items), Anti-Goals, Measurable Outcomes.

**Why:** Established pattern from F-002 (command parser) and F-027 (error formatter) specs -- the project constitution requires "Specs before code" and conventions must match.

**How to apply:** For new feature specs, read the most recently written feature spec first (the latest build order number) and match its structure, section ordering, and level of detail.
