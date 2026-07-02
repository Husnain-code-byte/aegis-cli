# Project Constitution — ANSDLC 2.0

## Quick Facts
- **Stack:** [TypeScript 5.x / React 19 / Node 22 / PostgreSQL 16]
- **Package manager:** [pnpm]
- **Test framework:** [Vitest] (unit) + [Playwright] (E2E)
- **Framework:** ANSDLC 2.0 — @docs/research/ANSDLC-2.0-research.md

## Commands
- Build: `pnpm build`
- Dev server: `pnpm dev`
- Test (all): `pnpm test`
- Test (unit): `pnpm test:unit`
- Test (E2E): `pnpm test:e2e`
- Lint: `pnpm lint`
- Type check: `pnpm typecheck`

## Architecture
- **API contract:** @docs/api/openapi.yaml — source of truth for every endpoint
- **Architecture:** C4 model — @project-memory/03-architecture.md
- **ADR index:** @docs/adr/README.md — read before architectural decisions
- **Design tokens:** @project-memory/04-design-system.md — semantic tokens only

## Key Conventions
- Spec before code: every feature starts with @docs/specs/<feature>/gherkin.feature
- Atomic features: one feature per session, never multi-feature work
- Test first: Gherkin scenarios must exist before implementation begins
- Refactoring gate: complexity < 10/function, files < 150 lines, no duplication
- Git: trunk-based, feature flags, structured commits (`type(scope): description`)
- Human is architect, AI is builder: AI never makes architecture decisions solo

## ANSDLC Phase Reference
0: Vision → 1: Decomposition → 2: Reference → 3: Architecture → 4: Design System →
5: Implementation (5A-F atomic loop) → 6: Integration → 7: Hardening → 8: Observe & Iterate

@project-memory/00-project-constitution.md

## 10 Non-Negotiable Rules
1. **Specs Before Code** — PR/FAQ, Gherkin, test plan before any code generation
2. **Human Writes Tests, AI Writes Code** — human owns acceptance criteria
3. **Never Trust AI Output** — verify, then adversarially attack with different model
4. **One Atomic Feature at a Time** — split if > 5 AI sessions
5. **Commit After Every Verified Feature** — never bulk-commit, never auto-commit
6. **Feature Flags on Everything Non-Trivial** — merge to main, toggle off until verified
7. **Refactor Before Commit, Not After** — Phase 5E gate is mandatory
8. **Write Down Every Decision and Why** — ADR in MADR format, stored in Git
9. **Close the Production Loop** — SLOs, error budgets, production feedback → priorities
10. **Human is Architect, AI is Builder** — never reverse these roles

## Red Flags
- Vibe coding without specs
- AI writing both tests AND implementation
- Skipping adversarial review
- "While I was there" refactoring during feature work
- Committing without verification gates passing
- Hardcoded hex/RGB/HSL values instead of design tokens

## Critical Constraints
- NEVER auto-commit without explicit human confirmation
- NEVER hardcode hex, RGB, HSL values — always use design tokens
- NEVER modify .env, secrets, or credential files
- NEVER make architecture decisions without an ADR
- NEVER proceed past a failing verification gate
- NEVER refactor and add features in the same session
- Always respond in English only
