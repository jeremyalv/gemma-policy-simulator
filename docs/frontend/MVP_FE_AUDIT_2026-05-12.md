# FE MVP Audit Report (2026-05-12)

## Context
- Scope: FE MVP readiness audit for currently exposed frontend features.
- Source of truth:
  - V1 contract: `docs/contracts/frontend-backend-v1.md`
  - Generated types: `apps/client/src/api/types.gen.ts`
  - FE implementation: `apps/client/src/**`
  - BE exposed routes: `apps/server/app.py`

## Severity-Ranked Findings

### P0-1: Challenge flow is FE-visible but backend endpoints are not exposed
- Impact: MVP sign-off blocker. Users can access challenge UI, but production BE has no route handlers for the required APIs.
- Evidence:
  - FE route exists: [`apps/client/src/App.tsx`](../../apps/client/src/App.tsx)
  - FE endpoint calls exist: [`apps/client/src/api/endpoints/challenge.ts`](../../apps/client/src/api/endpoints/challenge.ts)
  - FE fallback banner explicitly indicates backend not ready: [`apps/client/src/features/challenge/ChallengePage.tsx`](../../apps/client/src/features/challenge/ChallengePage.tsx)
  - BE route definitions contain no challenge endpoints: [`apps/server/app.py`](../../apps/server/app.py)
- Required closure:
  - Implement `POST /api/v1/simulations/{id}/challenge`
  - Implement `POST /api/v1/challenges/{challenge_id}/followup`
  - Return contract-compliant `{ data, error, meta }` envelopes and lifecycle-consistent errors.

### P0-2: Dataset selector is FE-visible but backend `/datasets` route is not exposed
- Impact: MVP sign-off blocker. Create flow depends on runtime dataset list; BE does not currently serve it.
- Evidence:
  - FE hook calls API: [`apps/client/src/features/create/hooks/useDatasets.ts`](../../apps/client/src/features/create/hooks/useDatasets.ts)
  - FE dataset UI renders statuses from API: [`apps/client/src/features/create/sections/DatasetSection.tsx`](../../apps/client/src/features/create/sections/DatasetSection.tsx)
  - FE endpoint definition expects `GET /datasets`: [`apps/client/src/api/endpoints/datasets.ts`](../../apps/client/src/api/endpoints/datasets.ts)
  - BE route definitions contain no datasets endpoint: [`apps/server/app.py`](../../apps/server/app.py)
- Required closure:
  - Implement `GET /api/v1/datasets` per contract schema and status semantics.

### P1-1: FE still contains mock-dependent UX paths in MVP-visible features
- Impact: violates "real BE only" MVP gate if left enabled in sign-off path.
- Evidence:
  - Challenge mock/fallback state handling in flow hook: [`apps/client/src/features/challenge/hooks/useChallengeFlow.ts`](../../apps/client/src/features/challenge/hooks/useChallengeFlow.ts)
  - MSW handlers cover challenge and datasets with synthetic responses: [`apps/client/src/mocks/handlers.ts`](../../apps/client/src/mocks/handlers.ts)
- Required closure:
  - Final MVP verification must run with `VITE_USE_MOCKS=false`.
  - Remove dependency on fallback paths for any FE-visible MVP flow.

### P1-2: Result visualizations include known approximation placeholders
- Impact: not a hard blocker for lifecycle integration, but must be explicitly accepted or corrected for MVP quality.
- Evidence:
  - Heatmap TODO indicates approximation until richer backend data exists: [`apps/client/src/features/results/charts/ApprovalHeatmap.tsx`](../../apps/client/src/features/results/charts/ApprovalHeatmap.tsx)
  - Sample runtime helper TODO indicates telemetry placeholder: [`apps/client/src/features/create/sections/SampleSection.tsx`](../../apps/client/src/features/create/sections/SampleSection.tsx)
- Required closure:
  - Either keep with explicit product acceptance notes, or replace via backend-supported data.

## MVP Capability Matrix (Locked Snapshot)

| Feature | Route / Surface | Contract Dependency | Status | Notes |
|---|---|---|---|---|
| Landing | `/` | none | Ready | Static marketing/informational UX. |
| Dashboard list/delete | `/simulations` | `GET /simulations`, `DELETE /simulations/{id}` | Ready | Wired and backed by BE routes. |
| Create draft | `/simulations/new` | `POST /simulations` | Ready | Core draft creation flow wired. |
| Dataset selection | Create section | `GET /datasets` | Blocked by BE | FE implemented; BE route missing. |
| Clarification generation/answer/state | `/simulations/:id/clarify` | Clarification endpoints | Ready | FE + BE route coverage present. |
| Run trigger | Create/Clarification flows | `POST /simulations/{id}/run` | Ready | FE sends idempotency key; BE route present. |
| Progress polling | `/simulations/:id` | `GET /simulations/{id}/status` | Ready | FE polling flow present, BE route present. |
| Results | `/simulations/:id/results` | `GET /simulations/{id}/results` | Ready | BE route present; FE charts render. |
| CSV export | Results actions | `GET /simulations/{id}/export` | Ready | FE handles non-envelope CSV correctly. |
| Challenge flow | `/simulations/:id/results/challenge` | challenge endpoints | Blocked by BE | FE visible; BE routes missing. |
| Comparison page | `/compare` | sims list/results + static precedents | Partial | Core UX exists; production readiness depends on data quality and scenario coverage. |
| Guide/About/Methodology | `/guide`, `/about`, `/methodology` | none | Ready | Static pages. |

## Audit Outcome
- MVP status as of 2026-05-12: **Not sign-off ready**.
- Hard blockers:
  - Missing BE route: `GET /api/v1/datasets`
  - Missing BE routes: challenge endpoints
- Exit condition to move from "Not ready" to "Ready":
  - All P0 findings closed and verified with mocks disabled.
