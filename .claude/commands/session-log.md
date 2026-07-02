---
name: session-log
description: Write a session log entry to project-memory/06-session-log.md. Use at the end of every session.
disable-model-invocation: true
allowed-tools: Read, Write, Edit
---

# Write Session Log Entry

Append a structured session log entry to `project-memory/06-session-log.md`.

## Entry Format
```markdown
## Session: YYYY-MM-DD HH:MM
- **Feature:** [feature name]
- **Phase:** [0-8 or sub-phase 5A-5F]
- **Status:** [completed | in progress | blocked]
- **Scope:** [what was declared in scope]
- **Done:**
  - [concrete accomplishment 1]
  - [concrete accomplishment 2]
- **Not Done:** [what was deferred and why]
- **Learned:** [one key insight from this session]
- **Decisions Made:** [ADR references if any]
- **Verification Results:**
  - Unit tests: [pass/fail + count]
  - Integration tests: [pass/fail + count]
  - Mutation score: [percentage]
  - Adversarial review: [CLEAN/BUGGY]
  - Refactoring gate: [PASS/NEEDS_REFACTORING]
- **Next Session:** [concrete next action]
```

## Rules
- One entry per session — never combine multiple sessions
- Be specific — "Added error handling for timeout in PaymentService" not "worked on API"
- Always list what was NOT done — prevents scope creep in next session
- Reference ADR numbers if decisions were documented
