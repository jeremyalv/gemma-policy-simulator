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

## Try in 10 Minutes (No HF Account Required)

One-command quick try (starts Ollama + backend + frontend, then runs a smoke check):

```bash
make quickstart
```

Stop all services started by quickstart:

```bash
make down
```

Run smoke verification only:

```bash
SAMPLE_SIZE=20 ./scripts/smoke_e2e.sh
```

Quickstart uses a bundled mini dataset (`data/quickstart/nemotron_usa_mini.jsonl`) and
is intended for UX trial/demo only. For larger, more representative runs, use the full
Nemotron setup in the advanced section below.

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
ollama pull gemma4:e4b
```

Quick sanity check:

```bash
ollama run gemma4:e4b "Reply with: ollama ok"
```

### 3. Configure backend environment

Create `.env` at repo root:

```env
SIMS_OLLAMA_BASE_URL=http://localhost:11434
SIMS_RUN_MODEL=gemma4:e4b
SIMS_RUN_TIMEOUT_SECONDS=60
SIMS_RUN_BATCH_SIZE=8
SIMS_RUN_MAX_RETRIES=1
SIMS_RUN_TEMPERATURE=0.2
SIMS_RUN_TOP_P=0.9

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
- `SIMS_RUN_TEMPERATURE` controls score variability (0.0..2.0, default `0.2`)
- `SIMS_RUN_TOP_P` controls token diversity (0.0..1.0, default `0.9`)

### 4. Start backend server

From repo root:

```bash
source .venv/bin/activate
python3 -m uvicorn apps.server.app:app --host 0.0.0.0 --port 8000 --reload --env-file .env
```

### 5. Quick backend smoke test

Health check:

```bash
curl -s http://localhost:8000/api/v1/datasets | jq
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

## Calibration Harness (Matrix + Dispersion Report)

Run a practical matrix benchmark and generate summary outputs (`summary.csv`, `summary.md`):

```bash
./scripts/calibration_matrix.sh
```

Useful overrides:

```bash
BASE_URL=http://localhost:8000 \
DB_PATH=apps/server/data/sims.db \
SAMPLE_SIZE=100 \
SEED_LABELS=101,202 \
./scripts/calibration_matrix.sh
```

This creates a run directory under `/tmp/infinipol-calibration/run-<timestamp>/` with:
- per-run `*_status.json`, `*_results.json`, `*_meta.json`
- aggregated `summary.csv` and `summary.md`

To re-analyze an existing run directory:

```bash
python3 scripts/analyze_calibration.py /tmp/infinipol-calibration/run-<timestamp>
```

Acceptance target for controversial-policy calibration:
- `>=3` nonzero approval buckets in at least `70%` of completed runs.

### Automated Knob Sweep (4–6 configs)

Run multiple `temperature/top_p` combinations and auto-rank results:

```bash
./scripts/calibration_sweep.sh
```

Custom combinations:

```bash
SWEEP_CONFIGS="0.25:0.90,0.35:0.95,0.45:0.98,0.55:0.98" \
./scripts/calibration_sweep.sh
```

Outputs:
- per-combo calibration artifacts under `/tmp/infinipol-calibration-sweep/sweep-<timestamp>/`
- `leaderboard.csv`
- `leaderboard.md` (ranked best-to-worst)

Fast local iteration mode (small matrix, much faster):

```bash
QUICK_MODE=1 ./scripts/calibration_sweep.sh
```

Quick mode defaults:
- `SAMPLE_SIZE=40`
- `POLICY_KEYS=federal_austerity,carbon_dividend`
- `SWEEP_CONFIGS=0.35:0.95,0.45:0.98,0.55:0.98`

## MVP Demo Profile (Frozen)

For hackathon demo stability, use this runtime profile:

```env
SIMS_OLLAMA_BASE_URL=http://localhost:11434
SIMS_RUN_MODEL=gemma4:e4b
SIMS_RUN_TIMEOUT_SECONDS=180
SIMS_RUN_BATCH_SIZE=2
SIMS_RUN_MAX_RETRIES=2
SIMS_RUN_TEMPERATURE=0.35
SIMS_RUN_TOP_P=0.95

SIMS_RUN_WORKER_ENABLED=1
SIMS_DB_PATH=apps/server/data/sims.db
SIMS_DATASET_NEMOTRON_PATH=data/nemotron_usa/nemotron_usa.jsonl
SIMS_DATASET_NEMOTRON_VERSION=Nemotron-Personas-USA
SIMS_CORS_ORIGINS=http://localhost:5173
```

Known limitation in this MVP profile:
- InfiniPol runs fully local/offline-first with Ollama, but on strongly polarizing policies the model can over-concentrate ratings into 1-2 approval buckets.
- Treat outputs as directional qualitative signal for policy iteration, not calibrated polling or population-representative forecasting.
