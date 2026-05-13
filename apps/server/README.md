# Server App

Backend API and simulation runtime owned by the backend track.

Responsibilities:
- Simulation lifecycle endpoints and validation.
- Persona sampling and Ollama orchestration.
- Aggregation, storage, export, and pre-run clarification generation.
- API responses in `{ data, error, meta }` envelope.

Integration contract source:
- `docs/contracts/frontend-backend-v1.md`
- `packages/contracts/`

## Local Quickstart (Backend + Ollama)

### 1. Install dependencies

From repo root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Install and run Ollama

Install Ollama:
- macOS: `brew install ollama`
- Or follow official guide: https://ollama.com/download

Start Ollama server:

```bash
ollama serve
```

In another terminal, pull your model:

```bash
ollama pull gemma4:e2b
```

Quick sanity check:

```bash
ollama run gemma4:e2b "Reply with: ollama ok"
```

### 3. Configure backend environment

Create `.env` at repo root:

```env
SIMS_OLLAMA_BASE_URL=http://localhost:11434
SIMS_RUN_MODEL=gemma4:e2b
SIMS_RUN_TIMEOUT_SECONDS=60
SIMS_RUN_BATCH_SIZE=8
SIMS_RUN_MAX_RETRIES=1

SIMS_DATASET_NEMOTRON_PATH=data/nemotron_usa/nemotron_usa.jsonl
SIMS_DATASET_NEMOTRON_VERSION=Nemotron-Personas-USA
```

Notes:
- `SIMS_DATASET_NEMOTRON_PATH` should point to your local Nemotron USA dataset file/folder.
- Recommended local format today: `.jsonl`.
- Backward-compatible aliases are also accepted:
  - `SIMS_OLLAMA_MODEL` -> `SIMS_RUN_MODEL`
  - `SIMS_OLLAMA_TIMEOUT_SECONDS` -> `SIMS_RUN_TIMEOUT_SECONDS`
  - `SIMS_BATCH_SIZE` -> `SIMS_RUN_BATCH_SIZE`

### 4. Start backend server

From repo root:

```bash
source .venv/bin/activate
python3 -m uvicorn apps.server.app:app --host 0.0.0.0 --port 8000 --reload --env-file .env
```

### 5. Quick backend smoke test

Health check:

```bash
curl -s http://localhost:8000/health | jq
```

Then run the normal flow:
1. `POST /api/v1/simulations`
2. `POST /api/v1/simulations/{id}/run`
3. Poll `GET /api/v1/simulations/{id}/status`
4. `GET /api/v1/simulations/{id}/results`
5. `GET /api/v1/simulations/{id}/export`

Or run the automated end-to-end smoke script:

```bash
./scripts/smoke_e2e.sh
```

Optional overrides:

```bash
BASE_URL=http://localhost:8000 \
TIMEOUT_SECONDS=300 \
POLL_SECONDS=2 \
SAMPLE_SIZE=100 \
./scripts/smoke_e2e.sh
```

The script saves request/response artifacts under `/tmp/infinipol-smoke/run-<timestamp>/`.

## Calibrated Prompting (Anti-Over-Agreeability)

Run inference now uses a calibrated prompt template (`run_calibrated_v1`) that:
- forces internal tradeoff evaluation (benefits, costs, implementation risk, fairness/distribution risk, rights/liberty concerns),
- anchors approval scores to a strict 1..5 rubric,
- discourages defaulting to 4/5 without explicit persona-grounded risk analysis.

This does not change any API response contracts. For observability, run artifacts include:
- `prompt_template_version`
- `prompt_calibration_enabled`

### Reproducible local calibration check

Use fixed seed semantics (derived from simulation id) and run at least 3 controversial policies, each with 2 simulation ids:
- Nationwide Assault Weapons Buyback
- Federal Carbon Tax + Dividend
- National E-Verify + Legalization Pathway

Expected signal:
- Approval distribution should typically span at least 3 score buckets.
- Means should not be uniformly pinned at 4.5+ across all controversial cases.
- Representative rationales should include both benefits and risks.
