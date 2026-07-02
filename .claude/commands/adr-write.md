---
name: adr-write
description: Document an architecture decision in MADR format. Use for any non-trivial architectural decision.
disable-model-invocation: true
argument-hint: [decision-title]
allowed-tools: Read, Write, Edit, Grep, Glob
---

# Write Architecture Decision Record

Document an architectural decision in MADR format.

## Process
1. Read existing ADRs: `docs/adr/README.md` for context and numbering
2. Determine next ADR number
3. Write ADR to `docs/adr/NNNN-lowercase-title.md`

## MADR Template
```markdown
# [Short title of solved problem and solution]

* Status: proposed
* Deciders: [names]
* Date: [YYYY-MM-DD]

## Context and Problem Statement
[2-3 sentences on the situation and forces at play]

## Decision Drivers
* [driver 1]
* [driver 2]

## Considered Options
* [option 1]
* [option 2]
* [option 3]

## Decision Outcome
Chosen option: "[option X]", because [justification].

### Consequences
* Good, because [positive]
* Bad, because [negative — explicitly name what we gave up]

## Pros and Cons of the Options
### [option 1]
* Good, because [argument]
* Bad, because [argument]
```

## Rules
- One decision per ADR
- Always name what was given up
- Status must be: proposed, accepted, deprecated, or superseded
