---
name: context-update
description: Update project memory with current project state. Writes session log, updates feature registry and decision log.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash(git *)
---

# Update Session Context

Update the project memory files with current state.

## Updates
1. **Session log** (`project-memory/06-session-log.md`): append entry with date, feature, phase, done, not done, learned, next
2. **Feature registry** (`project-memory/05-feature-registry.md`): update status for any feature that changed
3. **Decision log** (`project-memory/07-decision-log.md`): add any new ADR references

## Session Entry Template
```markdown
## Session: YYYY-MM-DD HH:MM
- **Feature:** [name]
- **Phase:** [number]
- **Model:** [sonnet/opus/haiku]
- **Done:**
  - [accomplishment 1]
  - [accomplishment 2]
- **Not done:** [what was deferred and why]
- **Learned:** [key insight]
- **Decisions:** [ADR references]
- **Verification:**
  - Tests: [pass/fail/count]
  - Mutation score: [%]
  - Review: [PASS/NEEDS_REVISION]
- **Next session:** [what to do next]
```
