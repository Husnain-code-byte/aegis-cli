---
name: refactor-gate
description: Run the ANSDLC Phase 5E refactoring gate audit on current changes. Use before every commit.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash(*)
---

# ANSDLC Phase 5E — Refactoring Gate

Run the mandatory refactoring audit before any commit.

## Checks
1. **Complexity:** cyclomatic complexity < 10 per function — run complexity analysis tool
2. **File size:** all changed files < 150 lines — check each changed file
3. **Duplication:** no duplicated code blocks > 3 lines — run duplication detector
4. **Clarity:** no magic numbers, unclear variable names, commented-out code
5. **Campground Rule:** is the codebase cleaner than before this change?

## Verdict
- PASS: all checks pass → proceed to commit
- NEEDS_REFACTORING: any check fails → fix before commit

## Output
```json
{
  "verdict": "PASS | NEEDS_REFACTORING",
  "complexity": {"passed": true, "violations": []},
  "file_size": {"passed": true, "violations": []},
  "duplication": {"passed": true, "violations": []},
  "clarity": {"passed": true, "issues": []},
  "campground_rule": "CLEANER | SAME | WORSE"
}
```
