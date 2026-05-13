# Client App

Frontend application owned by the frontend track.

Responsibilities:
- Policy authoring UI and simulation history screens.
- Status polling and result visualization.
- Pre-run clarification interaction flow.
- API integration with shared contract types.

Integration contract source:
- `docs/contracts/frontend-backend-v1.md`
- `packages/contracts/`

## Runtime modes

- `VITE_USE_MOCKS=false` (default behavior when unset): MVP sign-off mode, frontend talks to real backend only.
- `VITE_USE_MOCKS=true`: local mock/demo mode using MSW.

Examples:

```bash
# Sign-off mode (real backend)
cd apps/client
VITE_USE_MOCKS=false VITE_API_BASE_URL=http://localhost:8000/api/v1 npm run dev
```

```bash
# Mock mode (explicit opt-in)
cd apps/client
VITE_USE_MOCKS=true npm run dev
```

## No-mock verification checklist

Use `VITE_USE_MOCKS=false` and verify:

1. Create draft simulation.
2. Optional clarification flow works.
3. Run starts and status transitions to terminal state.
4. Results page loads.
5. CSV export downloads.
6. Challenge generation + followup roundtrip works.
7. Dataset list renders active + coming-soon entries from backend.

You can run backend/API verification helper:

```bash
./scripts/fe_nomock_verify.sh
```
