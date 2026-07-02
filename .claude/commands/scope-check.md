---
name: scope-check
description: AI confirms exactly what it will and will NOT touch. Use before making any changes.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(git *)
---

# Scope Check

Before making any changes, declare scope boundaries.

## Declare
1. **Files I will modify:** [list specific file paths]
2. **Files I will create:** [list specific file paths]
3. **Files I will read but NOT modify:** [list]
4. **Files I will NOT touch under any circumstances:** [list]
5. **Constraints:** what I will NOT do (no refactoring, no new dependencies, no architectural changes)
6. **Anti-goals:** what I am explicitly avoiding

Ask user: "This is my scope. Is this correct? Should I proceed?"
Do not make ANY changes until scope is confirmed.
