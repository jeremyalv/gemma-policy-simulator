# Repository Topology (Client + Server)

## Monorepo Layout
- `apps/client`: frontend UI and API consumption layer.
- `apps/server`: backend API service and orchestration entrypoint.
- `packages/contracts`: shared schema/types consumed by both apps.
- `src/*`: simulation domain modules used by server runtime.

## Ownership Model
- Frontend engineer owns `apps/client`.
- Backend engineer owns `apps/server` and `src/*`.
- Both engineers co-own `packages/contracts` and `docs/contracts`.

## Integration Model
1. Contract first (`docs/contracts` + `packages/contracts`).
2. Backend implements endpoint behavior + validation.
3. Frontend integrates against typed contracts.
4. Jointly verify lifecycle and error-path behavior.

## Merge Order
1. Contract PR merged.
2. Backend implementation PR merged.
3. Frontend integration PR merged.
4. End-to-end verification PR (or check) merged.
