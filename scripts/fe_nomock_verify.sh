#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
POLL_SECONDS="${POLL_SECONDS:-2}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-180}"
SAMPLE_SIZE="${SAMPLE_SIZE:-20}"
DATASET="${DATASET:-nemotron_usa}"
TITLE="${TITLE:-FE No-Mock Verification Policy}"
POLICY_TEXT="${POLICY_TEXT:-Policy text for FE no-mock integration verification.}"
FOCUS="${FOCUS:-weak_segment}"
FOLLOWUP_TEXT="${FOLLOWUP_TEXT:-This is helpful. Strengthen affordability safeguards and explain tradeoffs more clearly.}"

OUTPUT_DIR="${OUTPUT_DIR:-/tmp/infinipol-fe-nomock}"
RUN_TS="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$OUTPUT_DIR/run-$RUN_TS"
mkdir -p "$RUN_DIR"

echo "[fe-nomock] base_url=$BASE_URL"
echo "[fe-nomock] output_dir=$RUN_DIR"

echo "[fe-nomock] checking datasets..."
datasets_status="$(curl -sS -o "$RUN_DIR/datasets.json" -w "%{http_code}" "$BASE_URL/api/v1/datasets")"
if [[ "$datasets_status" != "200" ]]; then
  echo "[fe-nomock] expected 200 from /datasets but got $datasets_status"
  cat "$RUN_DIR/datasets.json"
  exit 1
fi

has_active="$(
  python3 -c 'import json,sys; b=json.load(sys.stdin); ds=(b.get("data") or []); print(any((d.get("status") in (None, "active")) for d in ds))' \
  < "$RUN_DIR/datasets.json"
)"
has_coming="$(
  python3 -c 'import json,sys; b=json.load(sys.stdin); ds=(b.get("data") or []); print(any(d.get("status") == "coming_v2" for d in ds))' \
  < "$RUN_DIR/datasets.json"
)"
if [[ "$has_active" != "True" || "$has_coming" != "True" ]]; then
  echo "[fe-nomock] /datasets did not include expected active + coming_v2 entries"
  cat "$RUN_DIR/datasets.json"
  exit 1
fi

create_payload="$(cat <<JSON
{
  "title": "$TITLE",
  "policy_text": "$POLICY_TEXT",
  "dataset": "$DATASET",
  "sample_size": $SAMPLE_SIZE
}
JSON
)"

echo "[fe-nomock] creating simulation..."
create_body="$(curl -sS -X POST "$BASE_URL/api/v1/simulations" \
  -H "Content-Type: application/json" \
  -d "$create_payload")"
printf '%s\n' "$create_body" > "$RUN_DIR/create.json"

simulation_id="$(
  python3 -c 'import json,sys; b=json.load(sys.stdin); print((b.get("data") or {}).get("id",""))' \
  <<<"$create_body"
)"
if [[ -z "$simulation_id" ]]; then
  echo "[fe-nomock] simulation creation failed"
  cat "$RUN_DIR/create.json"
  exit 1
fi
echo "[fe-nomock] simulation_id=$simulation_id"

echo "[fe-nomock] starting run..."
run_status="$(curl -sS -o "$RUN_DIR/run.json" -w "%{http_code}" \
  -X POST "$BASE_URL/api/v1/simulations/$simulation_id/run" \
  -H "Content-Type: application/json" \
  -d '{"use_refined_prompt": false}')"
if [[ "$run_status" != "202" ]]; then
  echo "[fe-nomock] expected 202 from /run but got $run_status"
  cat "$RUN_DIR/run.json"
  exit 1
fi

echo "[fe-nomock] polling status..."
deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
final_status=""
while true; do
  now="$(date +%s)"
  if (( now > deadline )); then
    echo "[fe-nomock] timeout waiting for terminal status"
    exit 1
  fi

  status_body="$(curl -sS "$BASE_URL/api/v1/simulations/$simulation_id/status")"
  printf '%s\n' "$status_body" > "$RUN_DIR/status-latest.json"
  final_status="$(
    python3 -c 'import json,sys; b=json.load(sys.stdin); print((b.get("data") or {}).get("status",""))' \
    <<<"$status_body"
  )"
  echo "[fe-nomock] status=$final_status"
  if [[ "$final_status" == "completed" || "$final_status" == "failed" ]]; then
    break
  fi
  sleep "$POLL_SECONDS"
done

if [[ "$final_status" != "completed" ]]; then
  echo "[fe-nomock] run ended in non-completed status=$final_status"
  cat "$RUN_DIR/status-latest.json"
  exit 1
fi

echo "[fe-nomock] fetching results..."
results_status="$(curl -sS -o "$RUN_DIR/results.json" -w "%{http_code}" \
  "$BASE_URL/api/v1/simulations/$simulation_id/results")"
if [[ "$results_status" != "200" ]]; then
  echo "[fe-nomock] expected 200 from /results but got $results_status"
  cat "$RUN_DIR/results.json"
  exit 1
fi

echo "[fe-nomock] fetching export..."
export_status="$(curl -sS -o "$RUN_DIR/export.csv" -w "%{http_code}" \
  "$BASE_URL/api/v1/simulations/$simulation_id/export")"
if [[ "$export_status" != "200" ]]; then
  echo "[fe-nomock] expected 200 from /export but got $export_status"
  exit 1
fi

echo "[fe-nomock] generating challenge..."
challenge_body="$(curl -sS -X POST "$BASE_URL/api/v1/simulations/$simulation_id/challenge" \
  -H "Content-Type: application/json" \
  -d "{\"focus\":\"$FOCUS\"}")"
printf '%s\n' "$challenge_body" > "$RUN_DIR/challenge.json"
challenge_id="$(
  python3 -c 'import json,sys; b=json.load(sys.stdin); print((b.get("data") or {}).get("challenge_id",""))' \
  <<<"$challenge_body"
)"
if [[ -z "$challenge_id" ]]; then
  echo "[fe-nomock] challenge generation failed"
  cat "$RUN_DIR/challenge.json"
  exit 1
fi

echo "[fe-nomock] submitting challenge followup..."
followup_payload="$(cat <<JSON
{
  "simulation_id": "$simulation_id",
  "user_response": "$FOLLOWUP_TEXT"
}
JSON
)"
followup_status="$(curl -sS -o "$RUN_DIR/followup.json" -w "%{http_code}" \
  -X POST "$BASE_URL/api/v1/challenges/$challenge_id/followup" \
  -H "Content-Type: application/json" \
  -d "$followup_payload")"
if [[ "$followup_status" != "200" ]]; then
  echo "[fe-nomock] expected 200 from challenge followup but got $followup_status"
  cat "$RUN_DIR/followup.json"
  exit 1
fi

echo "[fe-nomock] success"
echo "[fe-nomock] artifacts:"
echo "  - $RUN_DIR/datasets.json"
echo "  - $RUN_DIR/create.json"
echo "  - $RUN_DIR/run.json"
echo "  - $RUN_DIR/status-latest.json"
echo "  - $RUN_DIR/results.json"
echo "  - $RUN_DIR/export.csv"
echo "  - $RUN_DIR/challenge.json"
echo "  - $RUN_DIR/followup.json"
