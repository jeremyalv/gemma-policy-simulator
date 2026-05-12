#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
POLL_SECONDS="${POLL_SECONDS:-2}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-180}"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/infinipol-smoke}"

TITLE="${TITLE:-Smoke Test Policy}"
POLICY_TEXT="${POLICY_TEXT:-Pilot policy for smoke test validation.}"
DATASET="${DATASET:-nemotron_usa}"
SAMPLE_SIZE="${SAMPLE_SIZE:-100}"

mkdir -p "$OUTPUT_DIR"
RUN_TS="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$OUTPUT_DIR/run-$RUN_TS"
mkdir -p "$RUN_DIR"

echo "[smoke] base_url=$BASE_URL"
echo "[smoke] output_dir=$RUN_DIR"

create_payload="$(cat <<JSON
{
  "title": "$TITLE",
  "policy_text": "$POLICY_TEXT",
  "dataset": "$DATASET",
  "sample_size": $SAMPLE_SIZE
}
JSON
)"

echo "[smoke] creating simulation..."
create_body="$(curl -sS -X POST "$BASE_URL/api/v1/simulations" \
  -H "Content-Type: application/json" \
  -d "$create_payload")"
printf '%s\n' "$create_body" > "$RUN_DIR/create.json"

simulation_id="$(
  python3 -c 'import json,sys; b=json.load(sys.stdin); print((b.get("data") or {}).get("id",""))' \
  <<<"$create_body"
)"

if [[ -z "$simulation_id" ]]; then
  echo "[smoke] failed to create simulation; response saved to $RUN_DIR/create.json"
  exit 1
fi

echo "[smoke] simulation_id=$simulation_id"

echo "[smoke] starting run..."
run_status="$(curl -sS -o "$RUN_DIR/run.json" -w "%{http_code}" \
  -X POST "$BASE_URL/api/v1/simulations/$simulation_id/run" \
  -H "Content-Type: application/json" \
  -d '{"use_refined_prompt": false}')"
if [[ "$run_status" != "202" ]]; then
  echo "[smoke] expected 202 from /run but got $run_status"
  cat "$RUN_DIR/run.json"
  exit 1
fi

echo "[smoke] polling status..."
deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
final_status=""
while true; do
  now="$(date +%s)"
  if (( now > deadline )); then
    echo "[smoke] timeout waiting for terminal status"
    exit 1
  fi

  status_body="$(curl -sS "$BASE_URL/api/v1/simulations/$simulation_id/status")"
  printf '%s\n' "$status_body" > "$RUN_DIR/status-latest.json"
  final_status="$(
    python3 -c 'import json,sys; b=json.load(sys.stdin); print((b.get("data") or {}).get("status",""))' \
    <<<"$status_body"
  )"

  echo "[smoke] status=$final_status"
  if [[ "$final_status" == "completed" || "$final_status" == "failed" ]]; then
    break
  fi
  sleep "$POLL_SECONDS"
done

if [[ "$final_status" != "completed" ]]; then
  echo "[smoke] run ended in non-completed status=$final_status"
  cat "$RUN_DIR/status-latest.json"
  exit 1
fi

echo "[smoke] fetching results..."
results_status="$(curl -sS -o "$RUN_DIR/results.json" -w "%{http_code}" \
  "$BASE_URL/api/v1/simulations/$simulation_id/results")"
if [[ "$results_status" != "200" ]]; then
  echo "[smoke] expected 200 from /results but got $results_status"
  cat "$RUN_DIR/results.json"
  exit 1
fi

echo "[smoke] fetching export..."
export_status="$(curl -sS -o "$RUN_DIR/export.csv" -w "%{http_code}" \
  "$BASE_URL/api/v1/simulations/$simulation_id/export")"
if [[ "$export_status" != "200" ]]; then
  echo "[smoke] expected 200 from /export but got $export_status"
  exit 1
fi

echo "[smoke] success"
echo "[smoke] simulation_id=$simulation_id"
echo "[smoke] artifacts:"
echo "  - $RUN_DIR/create.json"
echo "  - $RUN_DIR/run.json"
echo "  - $RUN_DIR/status-latest.json"
echo "  - $RUN_DIR/results.json"
echo "  - $RUN_DIR/export.csv"
