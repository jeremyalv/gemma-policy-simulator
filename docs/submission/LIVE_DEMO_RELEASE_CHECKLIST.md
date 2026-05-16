# Live Demo Release Checklist (Judge-Friendly)

## Goal

Ensure judges can verify value quickly even if live inference is slow.

## A) Required runtime posture

1. Freeze one model/runtime profile for submission week.
2. Keep frontend in real backend mode (`VITE_USE_MOCKS=false`).
3. Validate backend readiness endpoint returns 200:
   - `GET /api/v1/datasets`

## B) Must-have visible paths

1. Simulation list page loads without login.
2. At least one completed simulation appears in list.
3. Results page shows summary + demographic breakdown.
4. Export action returns CSV.
5. Challenge generate + followup path is clickable and returns responses.

## C) Known-good fallback path

If live run is slow during judging:

1. Open an already completed simulation from known-good set.
2. Show status payload with telemetry.
3. Show results payload.
4. Trigger export and preview CSV.
5. Show challenge roundtrip response.

## D) Link integrity

1. Repo URL is public and opens without auth.
2. Demo URL opens without auth.
3. Kaggle writeup links resolve.
4. Media gallery includes required cover image.

## E) Final smoke gates

Run before submission lock:

```bash
pytest -q tests/server
cd apps/client && npm run test -- --run && npm run build
python3 packages/contracts/scripts/check_contracts.py
SAMPLE_SIZE=20 ./scripts/smoke_e2e.sh
```

## F) Claim discipline

Only claim what is demonstrably backed by:
- `docs/signoff/artifacts/*`
- test output
- deterministic API responses captured in repository
