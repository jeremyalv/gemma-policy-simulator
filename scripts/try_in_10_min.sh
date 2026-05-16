#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

QUICKSTART="${QUICKSTART:-1}"
SMOKE="${SMOKE:-1}"
SAMPLE_SIZE="${SAMPLE_SIZE:-20}"

cd "$ROOT_DIR"

echo "[quickstart] starting InfiniPol quick try"
echo "[quickstart] quickstart=$QUICKSTART sample_size=$SAMPLE_SIZE"

QUICKSTART="$QUICKSTART" VITE_DEFAULT_SAMPLE_SIZE="$SAMPLE_SIZE" ./scripts/dev_up.sh

if [[ "$SMOKE" == "1" || "$SMOKE" == "true" ]]; then
  echo "[quickstart] running API smoke check..."
  BASE_URL="${BASE_URL:-http://localhost:8000}" SAMPLE_SIZE="$SAMPLE_SIZE" ./scripts/smoke_e2e.sh
fi

cat <<'MSG'

[quickstart] done. Try the app now:
1) Open http://localhost:5173
2) Click New Simulation
3) Keep sample size at 20 (quick mode default)
4) Submit run and wait for completed status
5) Open Results and click Export CSV

Stop all local services:
  make down
MSG
