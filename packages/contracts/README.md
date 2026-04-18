# Shared Contracts

Shared schema artifacts used by both `apps/client` and `apps/server`.

Expected contents:
- API schema (OpenAPI or equivalent)
- Generated request/response types
- Runtime validation schemas for critical boundaries

Rules:
- Contract changes require synchronized updates to `docs/contracts/frontend-backend-v1.md`.
- Breaking changes require versioning and explicit migration notes.
