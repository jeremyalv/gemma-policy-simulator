#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
DB_PATH="${DB_PATH:-apps/server/data/sims.db}"
POLICIES_FILE="${POLICIES_FILE:-scripts/calibration_policies.json}"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/infinipol-calibration}"
SAMPLE_SIZE="${SAMPLE_SIZE:-100}"
SEED_LABELS="${SEED_LABELS:-101,202}"
POLICY_KEYS="${POLICY_KEYS:-}"
POLL_SECONDS="${POLL_SECONDS:-2}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-900}"
QUICK_MODE="${QUICK_MODE:-0}"

if [[ "$QUICK_MODE" == "1" || "$QUICK_MODE" == "true" ]]; then
  if ! printenv SAMPLE_SIZE >/dev/null; then
    SAMPLE_SIZE="40"
  fi
  if ! printenv POLICY_KEYS >/dev/null; then
    POLICY_KEYS="federal_austerity,carbon_dividend"
  fi
  if ! printenv SEED_LABELS >/dev/null; then
    SEED_LABELS="101,202"
  fi
  if ! printenv TIMEOUT_SECONDS >/dev/null; then
    TIMEOUT_SECONDS="480"
  fi
fi

mkdir -p "$OUTPUT_DIR"
RUN_TS="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$OUTPUT_DIR/run-$RUN_TS"
mkdir -p "$RUN_DIR"

echo "[calibration] base_url=$BASE_URL"
echo "[calibration] db_path=$DB_PATH"
echo "[calibration] policies_file=$POLICIES_FILE"
echo "[calibration] run_dir=$RUN_DIR"
echo "[calibration] sample_size=$SAMPLE_SIZE"
echo "[calibration] seed_labels=$SEED_LABELS"
echo "[calibration] policy_keys=${POLICY_KEYS:-<all>}"
echo "[calibration] quick_mode=$QUICK_MODE"

python3 - <<'PY' "$POLICIES_FILE" "$DB_PATH" "$SAMPLE_SIZE" "$SEED_LABELS" "$POLICY_KEYS"
from __future__ import annotations
import json
import sqlite3
import sys
from pathlib import Path

policies_path = Path(sys.argv[1])
db_path = Path(sys.argv[2])
sample_size = int(sys.argv[3])
seed_labels = [s.strip() for s in sys.argv[4].split(",") if s.strip()]
policy_keys = {s.strip() for s in sys.argv[5].split(",") if s.strip()}

policies = json.loads(policies_path.read_text(encoding="utf-8"))
if not isinstance(policies, list) or not policies:
    raise SystemExit("policies file is empty or invalid")
if policy_keys:
    policies = [p for p in policies if str(p.get("key", "")).strip() in policy_keys]
if not policies:
    raise SystemExit("no policies selected after POLICY_KEYS filter")

conn = sqlite3.connect(db_path)
try:
    for policy in policies:
        key = str(policy["key"])
        title = str(policy["title"])
        policy_text = str(policy["policy_text"])
        for seed_label in seed_labels:
            sim_id = f"sim_cal_{key}_{seed_label}"
            conn.execute("DELETE FROM simulations WHERE id = ?", (sim_id,))
            conn.execute(
                """
                INSERT INTO simulations (
                    id, title, policy_text, dataset, sample_size, filters_json,
                    status, created_at, completed_at, mean_approval, refined_policy_text,
                    clarification_status, clarification_turn_index, current_clarification_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL, NULL, NULL, 'none', 0, NULL)
                """,
                (
                    sim_id,
                    f"[Calibration] {title} (seed {seed_label})",
                    policy_text,
                    "nemotron_usa",
                    sample_size,
                    None,
                    "pending",
                ),
            )
    conn.commit()
finally:
    conn.close()
PY

run_specs="$(python3 - <<'PY' "$POLICIES_FILE" "$SEED_LABELS" "$POLICY_KEYS"
from __future__ import annotations
import json
import sys
from pathlib import Path

policies = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
seed_labels = [s.strip() for s in sys.argv[2].split(",") if s.strip()]
policy_keys = {s.strip() for s in sys.argv[3].split(",") if s.strip()}
if policy_keys:
    policies = [p for p in policies if str(p.get("key", "")).strip() in policy_keys]
for policy in policies:
    key = policy["key"]
    for seed in seed_labels:
        print(f"{key},{seed},sim_cal_{key}_{seed}")
PY
)"

while IFS=, read -r policy_key seed_label simulation_id; do
  [[ -z "${simulation_id:-}" ]] && continue
  run_key="${policy_key}_s${seed_label}"

  echo "[calibration] run=$run_key simulation_id=$simulation_id"

  run_status="$(curl -sS -o "$RUN_DIR/${run_key}_run.json" -w "%{http_code}" \
    -X POST "$BASE_URL/api/v1/simulations/$simulation_id/run" \
    -H "Content-Type: application/json" \
    -d '{"use_refined_prompt": false}')"

  if [[ "$run_status" != "202" ]]; then
    echo "[calibration] /run failed for $simulation_id status=$run_status"
    continue
  fi

  deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
  terminal_status=""
  while true; do
    now="$(date +%s)"
    if (( now > deadline )); then
      echo "[calibration] timeout waiting for $simulation_id"
      break
    fi

    status_body="$(curl -sS "$BASE_URL/api/v1/simulations/$simulation_id/status" || true)"
    if [[ -z "${status_body:-}" ]]; then
      echo "[calibration] $run_key status=<empty response>; retrying"
      sleep "$POLL_SECONDS"
      continue
    fi

    printf '%s\n' "$status_body" > "$RUN_DIR/${run_key}_status.json"
    terminal_status="$(python3 -c '
import json
import sys

raw = sys.argv[1].strip() if len(sys.argv) > 1 else ""
if not raw:
    print("__INVALID__")
    raise SystemExit(0)
try:
    payload = json.loads(raw)
except json.JSONDecodeError:
    print("__INVALID__")
    raise SystemExit(0)

data = payload.get("data") if isinstance(payload, dict) else None
if isinstance(data, dict):
    print(str(data.get("status") or ""))
else:
    print("")
' "$status_body")"
    if [[ "$terminal_status" == "__INVALID__" ]]; then
      echo "[calibration] $run_key status=<invalid json>; retrying"
      sleep "$POLL_SECONDS"
      continue
    fi
    echo "[calibration] $run_key status=$terminal_status"

    if [[ "$terminal_status" == "completed" || "$terminal_status" == "failed" ]]; then
      break
    fi
    sleep "$POLL_SECONDS"
  done

  if [[ "$terminal_status" == "completed" ]]; then
    curl -sS "$BASE_URL/api/v1/simulations/$simulation_id/results" > "$RUN_DIR/${run_key}_results.json"
  else
    printf '{"data":null,"error":{"code":"RUN_NOT_COMPLETED","message":"status=%s"}}\n' "$terminal_status" > "$RUN_DIR/${run_key}_results.json"
  fi

  cat > "$RUN_DIR/${run_key}_meta.json" <<META
{"run_key":"$run_key","policy_key":"$policy_key","seed":"$seed_label","simulation_id":"$simulation_id"}
META
done <<< "$run_specs"

python3 scripts/analyze_calibration.py "$RUN_DIR"

echo "[calibration] done"
echo "[calibration] see $RUN_DIR/summary.md"
