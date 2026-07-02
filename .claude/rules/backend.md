---
description: Backend rules for API routes, services, and data access
paths:
  - "src/api/**/*"
  - "src/routes/**/*"
  - "src/services/**/*"
  - "src/middleware/**/*"
  - "src/controllers/**/*"
  - "**/*.route.*"
  - "**/*.service.*"
---

# Backend Development Rules

## API Conventions
- All endpoints defined in `docs/api/openapi.yaml` — modify spec first, then implement
- Input validation: Zod/Pydantic schemas — NEVER inline validation in route handlers
- Error responses: RFC 7807 Problem Details format
  ```json
  {"type": "https://api.example.com/errors/validation-error", "title": "Validation Error", "status": 400, "detail": "The 'email' field is required.", "instance": "/api/users/123"}
  ```
- Authentication: JWT via Authorization header, validated in middleware
- Authorization: checked on every protected endpoint — never assume authentication = authorization
- Rate limiting: configured per endpoint tier

## Service Layer
- Business logic in service layer — never in route handlers
- Route handler: validate input → call service → format response
- Service: implement business logic → call repository → return domain objects
- Repository: data access only — no business logic
- Dependency injection for services — enables testing with mocks

## Database Access
- Repository pattern — no raw SQL in route handlers or services
- Use parameterized queries only — never string interpolation
- Every FK column must be indexed
- N+1 query detection: use eager loading or batch queries
- Pagination on all list endpoints: cursor-based (large) or offset-based (small)
- Read replicas for read-heavy endpoints — separate read/write connections

## Security (Every Endpoint)
- Validate input before processing — never trust client data
- Sanitize output — prevent XSS in error messages and responses
- CORS configured explicitly — never `Access-Control-Allow-Origin: *`
- Sensitive data never logged — mask PII, secrets, tokens
- Transaction boundaries: all-or-nothing for multi-step mutations
