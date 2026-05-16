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

## Try in 10 Minutes (Recommended)

From repo root:

```bash
make quickstart
```

This launches Ollama + backend + frontend in real-backend mode and runs a smoke check.

Stop all services:

```bash
make down
```

Re-run smoke verification:

```bash
SAMPLE_SIZE=20 ./scripts/smoke_e2e.sh
```

## Quickstart (Run Frontend)

Prerequisite:
- Node.js 20+ and npm.
- If using real backend mode, backend server must be running at `http://localhost:8000`.

Install dependencies:

```bash
cd apps/client
npm ci
```

Start dev server (recommended for MVP integration):

```bash
cd apps/client
VITE_USE_MOCKS=false VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

Open:
- `http://localhost:5173`

Other useful commands:

```bash
cd apps/client
npm run test -- --run
npm run typecheck
npm run build
```

## Runtime modes

- `VITE_USE_MOCKS=false` (default behavior when unset): MVP sign-off mode, frontend talks to real backend only.
- `VITE_USE_MOCKS=true`: local mock/demo mode using MSW.

Examples:

```bash
# Sign-off mode (real backend)
cd apps/client
VITE_USE_MOCKS=false VITE_API_BASE_URL=http://localhost:8000 npm run dev
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
