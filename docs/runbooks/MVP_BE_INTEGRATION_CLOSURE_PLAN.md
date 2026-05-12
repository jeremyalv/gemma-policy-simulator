# MVP BE Integration Closure Plan (2026-05-12)

## Goal
Close backend integration gaps so FE-visible MVP flows run against real backend only, with zero mock dependency at sign-off.

## Scope
- In scope:
  - `GET /api/v1/datasets`
  - `POST /api/v1/simulations/{id}/challenge`
  - `POST /api/v1/challenges/{challenge_id}/followup`
  - Contract/lifecycle/error validation for existing MVP endpoints.
- Out of scope:
  - Net-new V2 endpoints.
  - Frontend redesign work.

## P0 Integration Lane

### 1) Implement missing backend routes
- Add route handlers in `apps/server/app.py` and service logic in `apps/server/service.py` for:
  - `GET /api/v1/datasets`
  - `POST /api/v1/simulations/{id}/challenge`
  - `POST /api/v1/challenges/{challenge_id}/followup`
- Ensure responses conform to V1 contract shape from `packages/contracts/openapi/v1.json`.

### 2) Enforce envelope and error code semantics
- Every JSON response for these endpoints must use:
  - success: `{ data, error: null, meta }`
  - failure: `{ data: null, error, meta }`
- Validate lifecycle gates and return consistent codes/messages (no ad-hoc payloads).

### 3) Disable mock dependency in verification path
- Run MVP verification with `VITE_USE_MOCKS=false`.
- Any FE-visible flow that relies on fallback/mock response is sign-off blocking.

## Endpoint Acceptance Checks

### `GET /api/v1/datasets`
- Must return dataset items compatible with FE `DatasetSection`.
- Must include expected status values (`active`, `coming_v2`) per contract/docs.
- Failure paths must use standard envelope and stable error codes.

### `POST /api/v1/simulations/{id}/challenge`
- Preconditions:
  - Simulation exists.
  - Lifecycle compatible with challenge flow.
- Success:
  - Contract-compliant challenge payload in `data`.
- Failure:
  - Lifecycle/validation errors returned in standard envelope.

### `POST /api/v1/challenges/{challenge_id}/followup`
- Preconditions:
  - Challenge id exists and maps to simulation context.
- Success:
  - Follow-up payload and refinement fields match contract-generated types.
- Failure:
  - Missing/invalid ids and payload validation produce stable envelope errors.

## Sign-Off Gates (Frozen)
1. No FE-visible flow uses mock fallback.
2. Core journey passes end-to-end on real backend:
   - Create draft
   - Optional clarification
   - Run
   - Status polling
   - Results
   - Export
3. Contract mismatch count is zero for MVP routes.
4. Missing endpoint list is empty for FE-consumed V1 APIs.

## Verification Plan

### A. End-to-end smoke (real backend)
- Configure FE with `VITE_USE_MOCKS=false`.
- Validate:
  - Draft creation and navigation to clarification/progress.
  - Clarification skip path and multi-turn path.
  - Run to terminal status and results retrieval.
  - Export CSV behavior and lifecycle gates.

### B. Integration checks for newly implemented endpoints
- Datasets:
  - Active dataset selectable.
  - `coming_v2` dataset displayed but not selectable.
- Challenge:
  - Generate challenge and follow-up roundtrip succeeds.
  - Invalid id/lifecycle cases return contract-compliant errors.

### C. Negative/lifecycle checks
- Unsupported filters in `POST /simulations` => `400` + `UNSUPPORTED_FILTER`.
- Accessing results/export before completion => expected 409-style lifecycle errors.
- Missing IDs / malformed payloads => validation errors in standard envelope.

## Ownership and Sequence
1. BE: implement missing endpoints + service logic + tests.
2. BE: run contract checks and ensure envelope/error stability.
3. FE+BE: execute real-backend smoke with mocks disabled.
4. Product/Engineering: sign off only when all gates pass.

## Artifacts
- Audit reference: `docs/frontend/MVP_FE_AUDIT_2026-05-12.md`
- Contract truth:
  - `docs/contracts/frontend-backend-v1.md`
  - `packages/contracts/openapi/v1.json`
