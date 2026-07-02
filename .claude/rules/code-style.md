---
description: Universal coding conventions for this project — always loaded
---

# Code Style Conventions

## General
- TypeScript strict mode — no `any` without explicit justification
- Prefer `const` over `let` — use `let` only when reassignment is required
- Use explicit return types on all exported functions
- Single responsibility: one function = one purpose (describable without "and")

## Naming
- PascalCase: components, types, interfaces, classes
- camelCase: variables, functions, methods
- kebab-case: file names, directory names, CSS classes
- UPPER_SNAKE_CASE: constants, environment variables

## Imports
- Order: external libraries → internal modules → types → styles
- No circular imports — dependency-cruiser enforces this
- Use named exports — default exports only for page components (Next.js convention)

## Error Handling
- Never swallow errors silently — log or propagate
- Validate at boundaries (API handlers, form submissions) — not internally
- Use typed errors — never throw raw strings or generic Error
- Error messages must be actionable — tell the developer what to DO

## General Rules
- No commented-out code — delete it, git history preserves it
- No TODO without ticket reference: `// TODO(PROJ-123): description`
- No console.log in production paths — use structured logger
- Always respond in English only
