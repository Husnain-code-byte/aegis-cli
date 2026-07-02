# Project Constitution

> This is the AGENTS.md equivalent for this project. It encodes the project stack, rules, conventions, and non-negotiable constraints that ALL AI agents must follow.

## Stack
- **Language:** [TypeScript 5.x]
- **Frontend:** [React 19 / Next.js]
- **Backend:** [Node 22 / Express or Fastify]
- **Database:** [PostgreSQL 16]
- **Package Manager:** [pnpm]
- **Test Framework:** [Vitest] (unit) + [Playwright] (E2E)
- **ORM:** [Prisma / Drizzle]
- **CI/CD:** [GitHub Actions]

## Critical Rules
1. NEVER auto-commit without explicit human confirmation
2. NEVER hardcode hex, RGB, HSL values — always use design tokens
3. NEVER modify .env, secrets, or credential files
4. NEVER make architecture decisions without an ADR
5. NEVER proceed past a failing verification gate
6. NEVER refactor and add features in the same session
7. Specs before code — always
8. One atomic feature per session
9. Human is architect, AI is builder — never reverse

## Conventions
- **Git:** trunk-based, structured commits: `type(scope): description [AI-assisted]`
- **Testing:** BDD/Gherkin specs before code, mutation score >= 80%
- **Code style:** TypeScript strict mode, explicit return types, no `any`
- **API:** OpenAPI 3.1 contract as source of truth, RFC 7807 errors
- **Database:** Repository pattern, parameterized queries, snake_case naming
- **Components:** Design tokens only, WCAG 2.1 AA, Storybook for all components

## Banned Practices
- Raw SQL in route handlers
- Hardcoded colors or spacing values
- Console.log in production code
- Commented-out code
- TODO without ticket reference
- Circular imports
- Multi-feature commits

## Allowed Libraries
[Define project-specific allowed libraries here]

## Security Requirements
- OWASP Top 10 awareness on every change
- Secrets never in code, never in logs
- Input validation at every API boundary
- Authentication on every protected endpoint
- CORS explicitly configured — never wildcard
