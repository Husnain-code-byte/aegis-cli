---
name: commit-format
description: Show the correct git commit message format for ANSDLC 2.0 projects.
disable-model-invocation: true
allowed-tools: Bash(git *)
---

# ANSDLC 2.0 Commit Message Format

## Format
```
type(scope): concise description [AI-assisted]

- What was implemented and why
- What tests were added
- Verification results: tests passed, mutation score, review status
- Any known limitations or follow-up items

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Types
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `refactor` — code change that neither fixes a bug nor adds a feature
- `test` — adding or updating tests
- `chore` — build process, dependencies, tooling

## Rules
- One commit per verified feature — never bulk-commit
- Commit only after ALL verification gates pass
- Never auto-commit — always get explicit human confirmation
- Push to remote immediately after committing

## Show Current
Current branch: !git branch --show-current
Staged changes: !git diff --cached --stat
