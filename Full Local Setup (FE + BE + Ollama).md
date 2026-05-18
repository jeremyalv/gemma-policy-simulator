Full Local Setup (FE + BE + Ollama)
1) Install prerequisites
git
Python 3.12+
Node.js 20+ + npm
Ollama
Ollama install:

macOS: brew install ollama
Or: https://ollama.com/download
2) Clone repo and install deps
git clone <repo-url>
cd gemma-policy-simulator

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd apps/client
npm ci
cd ../..
3) Start Ollama + pull model
Terminal A:

ollama serve
Terminal B:

ollama pull gemma4:e4b
ollama run gemma4:e4b "Reply with: ollama ok"
4) Prepare dataset (Nemotron USA)
Ask BE owner for the prepared local JSONL path (repo expects local file, no runtime remote fetch).
Set this in .env in repo root.

Example .env:

SIMS_OLLAMA_BASE_URL=http://localhost:11434
SIMS_RUN_MODEL=gemma4:e4b
SIMS_RUN_TIMEOUT_SECONDS=120
SIMS_RUN_MAX_RETRIES=2
SIMS_RUN_BATCH_SIZE=4

SIMS_RUN_WORKER_ENABLED=1
SIMS_DB_PATH=apps/server/data/sims.db
SIMS_DATASET_NEMOTRON_PATH=data/nemotron_usa/nemotron_usa.jsonl
SIMS_DATASET_NEMOTRON_VERSION=Nemotron-Personas-USA

SIMS_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
5) Run backend
From repo root:

source .venv/bin/activate
make server
(Equivalent command already in Makefile.)

Backend should run at http://localhost:8000.

6) Run frontend
New terminal:

cd gemma-policy-simulator
make client
This runs FE in real-backend mode:

VITE_USE_MOCKS=false
VITE_API_BASE_URL=http://localhost:8000
Open:

http://localhost:5173
7) Quick end-to-end check
From repo root:

./scripts/smoke_e2e.sh
Expected flow:

create simulation
run
poll status
fetch results
fetch export CSV
8) If something fails
model 'gemma' not found → .env not loaded / wrong model var; restart backend with --env-file .env (already in make server)
FE says “Could not reach backend” but BE logs 200 → likely CORS/env mismatch; ensure SIMS_CORS_ORIGINS above and restart backend
URL shows /api/v1/api/v1/... → FE env wrong; use base URL http://localhost:8000 only (no trailing /api/v1)