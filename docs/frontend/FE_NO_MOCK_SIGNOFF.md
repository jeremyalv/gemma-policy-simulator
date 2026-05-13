# FE No-Mock Sign-Off Verification (Issue #45)

This checklist verifies MVP frontend integration against the real backend only.

## 1) Start services

Backend:

```bash
python3 -m uvicorn apps.server.app:app --host 0.0.0.0 --port 8000 --reload --env-file .env
```

Frontend (no mocks):

```bash
cd apps/client
VITE_USE_MOCKS=false VITE_API_BASE_URL=http://localhost:8000/api/v1 npm run dev
```

Expected startup behavior:
- Browser console includes: `[InfiniPol] startup mode: real backend (mocks disabled)`.
- No MSW startup log appears.

## 2) Core MVP path (UI)

Run the full journey:
1. Create draft simulation.
2. Optional clarification flow.
3. Start run and wait for terminal status.
4. Open results page.
5. Download CSV export.

## 3) Challenge roundtrip (UI)

From results:
1. Generate challenge (choose any focus).
2. Submit followup response.
3. Confirm followup/refinement renders.

## 4) Dataset behavior (UI)

On create page:
1. Dataset list loads from backend `/datasets`.
2. Active dataset can be selected.
3. `coming_v2` entry is visible and not selectable.

## 5) API verification helper (optional automation)

Run:

```bash
./scripts/fe_nomock_verify.sh
```

This validates backend/API integration for:
- `GET /datasets`
- `POST /simulations`
- `POST /simulations/{id}/run`
- `GET /simulations/{id}/status`
- `GET /simulations/{id}/results`
- `GET /simulations/{id}/export`
- `POST /simulations/{id}/challenge`
- `POST /challenges/{challenge_id}/followup`
