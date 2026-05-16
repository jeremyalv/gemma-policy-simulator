#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
DB_PATH="${DB_PATH:-apps/server/data/sims.db}"
POLICIES_FILE="${POLICIES_FILE:-scripts/calibration_policies.json}"
SAMPLE_SIZE="${SAMPLE_SIZE:-100}"
SEED_LABELS="${SEED_LABELS:-101,202}"
POLL_SECONDS="${POLL_SECONDS:-2}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-900}"
SWEEP_OUTPUT_DIR="${SWEEP_OUTPUT_DIR:-/tmp/infinipol-calibration-sweep}"
# Format: "temperature:top_p,temperature:top_p,..."
SWEEP_CONFIGS="${SWEEP_CONFIGS:-0.20:0.90,0.30:0.92,0.35:0.95,0.40:0.95,0.45:0.98,0.50:0.98}"
POLICY_KEYS="${POLICY_KEYS:-}"
QUICK_MODE="${QUICK_MODE:-0}"

if [[ "$QUICK_MODE" == "1" || "$QUICK_MODE" == "true" ]]; then
  if ! printenv SAMPLE_SIZE >/dev/null; then
    SAMPLE_SIZE="40"
  fi
  if ! printenv POLICY_KEYS >/dev/null; then
    POLICY_KEYS="federal_austerity,carbon_dividend"
  fi
  if ! printenv SWEEP_CONFIGS >/dev/null; then
    SWEEP_CONFIGS="0.35:0.95,0.45:0.98,0.55:0.98"
  fi
  if ! printenv TIMEOUT_SECONDS >/dev/null; then
    TIMEOUT_SECONDS="480"
  fi
fi

mkdir -p "$SWEEP_OUTPUT_DIR"
SWEEP_TS="$(date +%Y%m%d-%H%M%S)"
SWEEP_DIR="$SWEEP_OUTPUT_DIR/sweep-$SWEEP_TS"
mkdir -p "$SWEEP_DIR"

echo "[sweep] base_url=$BASE_URL"
echo "[sweep] db_path=$DB_PATH"
echo "[sweep] sample_size=$SAMPLE_SIZE"
echo "[sweep] seed_labels=$SEED_LABELS"
echo "[sweep] policy_keys=${POLICY_KEYS:-<all>}"
echo "[sweep] configs=$SWEEP_CONFIGS"
echo "[sweep] quick_mode=$QUICK_MODE"
echo "[sweep] sweep_dir=$SWEEP_DIR"

leaderboard_csv="$SWEEP_DIR/leaderboard.csv"
cat > "$leaderboard_csv" <<CSV
rank,temperature,top_p,total_runs,completed_runs,pct_with_3plus_buckets,pct_mean_pinned_high,avg_top_bucket_share_pct,avg_entropy,acceptance,run_dir
CSV

run_index=0
IFS=',' read -r -a configs <<< "$SWEEP_CONFIGS"
for cfg in "${configs[@]}"; do
  trimmed="$(echo "$cfg" | xargs)"
  [[ -z "$trimmed" ]] && continue

  if [[ "$trimmed" != *:* ]]; then
    echo "[sweep] skip invalid config: $trimmed (expected temperature:top_p)"
    continue
  fi

  temp="${trimmed%%:*}"
  top_p="${trimmed##*:}"
  run_index=$((run_index + 1))
  combo_label="t${temp}_p${top_p}"
  combo_dir="$SWEEP_DIR/$run_index-$combo_label"
  mkdir -p "$combo_dir"

  echo "[sweep] running combo #$run_index temperature=$temp top_p=$top_p"
  log_path="$combo_dir/matrix.log"

  SIMS_RUN_TEMPERATURE="$temp" \
  SIMS_RUN_TOP_P="$top_p" \
  BASE_URL="$BASE_URL" \
  DB_PATH="$DB_PATH" \
  POLICIES_FILE="$POLICIES_FILE" \
  OUTPUT_DIR="$combo_dir" \
  SAMPLE_SIZE="$SAMPLE_SIZE" \
  SEED_LABELS="$SEED_LABELS" \
  POLICY_KEYS="$POLICY_KEYS" \
  POLL_SECONDS="$POLL_SECONDS" \
  TIMEOUT_SECONDS="$TIMEOUT_SECONDS" \
  QUICK_MODE="$QUICK_MODE" \
  ./scripts/calibration_matrix.sh | tee "$log_path"

  run_dir="$(
    python3 - <<'PY' "$log_path"
from __future__ import annotations
import re
import sys
from pathlib import Path

log_path = Path(sys.argv[1])
text = log_path.read_text(encoding="utf-8", errors="replace")
lines = [line.strip() for line in text.splitlines() if line.strip()]

# Primary source: "[calibration] see <run_dir>"
for line in reversed(lines):
    match = re.search(r"^\[calibration\]\s+see\s+(.+)$", line)
    if match:
        print(match.group(1).strip())
        raise SystemExit(0)

# Fallback: derive run dir from analysis write path ".../summary.md"
for line in reversed(lines):
    match = re.search(r"^\[analysis\]\s+wrote\s+(.+/summary\.md)$", line)
    if match:
        summary_path = Path(match.group(1).strip())
        print(str(summary_path.parent))
        raise SystemExit(0)

print("")
PY
)"
  run_dir="${run_dir//$'\r'/}"
  run_dir="$(echo "$run_dir" | xargs)"
  if [[ -z "$run_dir" || ! -d "$run_dir" ]]; then
    echo "[sweep] could not locate run_dir for combo $combo_label"
    echo "[sweep] parsed run_dir='$run_dir'"
    continue
  fi

  python3 - <<'PY' "$run_dir" "$temp" "$top_p" "$leaderboard_csv"
from __future__ import annotations
import csv
import sys
from pathlib import Path

run_dir = Path(sys.argv[1])
temp = sys.argv[2]
top_p = sys.argv[3]
leaderboard_csv = Path(sys.argv[4])

summary_csv = run_dir / "summary.csv"
if not summary_csv.exists():
    raise SystemExit(f"missing summary.csv in {run_dir}")

rows = list(csv.DictReader(summary_csv.open("r", encoding="utf-8")))
total_runs = len(rows)
completed = [r for r in rows if r.get("status") == "completed"]
completed_runs = len(completed)

if completed_runs == 0:
    pct_3plus = 0.0
    pct_pinned = 0.0
    avg_top_bucket = 0.0
    avg_entropy = 0.0
else:
    three_plus = [r for r in completed if int(float(r.get("nonzero_buckets") or 0)) >= 3]
    pinned = [r for r in completed if float(r.get("mean_approval") or 0.0) >= 4.2]
    pct_3plus = round(len(three_plus) / completed_runs * 100.0, 1)
    pct_pinned = round(len(pinned) / completed_runs * 100.0, 1)
    avg_top_bucket = round(sum(float(r.get("top_bucket_share_pct") or 0.0) for r in completed) / completed_runs, 2)
    avg_entropy = round(sum(float(r.get("entropy") or 0.0) for r in completed) / completed_runs, 3)

acceptance = "PASS" if completed_runs > 0 and pct_3plus >= 70.0 else "FAIL"

with leaderboard_csv.open("a", encoding="utf-8", newline="") as handle:
    writer = csv.writer(handle)
    writer.writerow([
        "",
        temp,
        top_p,
        total_runs,
        completed_runs,
        pct_3plus,
        pct_pinned,
        avg_top_bucket,
        avg_entropy,
        acceptance,
        str(run_dir),
    ])
PY

done

python3 - <<'PY' "$leaderboard_csv" "$SWEEP_DIR"
from __future__ import annotations
import csv
import sys
from pathlib import Path

leaderboard_csv = Path(sys.argv[1])
sweep_dir = Path(sys.argv[2])

rows = list(csv.DictReader(leaderboard_csv.open("r", encoding="utf-8")))

# rank by: higher pct_with_3plus, then lower avg_top_bucket_share, then lower pct_mean_pinned_high, then higher avg_entropy
rows.sort(
    key=lambda r: (
        -float(r["pct_with_3plus_buckets"]),
        float(r["avg_top_bucket_share_pct"]),
        float(r["pct_mean_pinned_high"]),
        -float(r["avg_entropy"]),
    )
)

for idx, row in enumerate(rows, start=1):
    row["rank"] = str(idx)

with leaderboard_csv.open("w", encoding="utf-8", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()) if rows else [
        "rank","temperature","top_p","total_runs","completed_runs","pct_with_3plus_buckets","pct_mean_pinned_high","avg_top_bucket_share_pct","avg_entropy","acceptance","run_dir"
    ])
    writer.writeheader()
    writer.writerows(rows)

md_path = sweep_dir / "leaderboard.md"
lines = [
    "# Calibration Sweep Leaderboard",
    "",
    "Ranking priority: higher `% >=3 buckets`, lower top-bucket concentration, lower pinned-high %, higher entropy.",
    "",
    "| rank | temp | top_p | completed | %>=3 buckets | % pinned high | avg top bucket % | avg entropy | acceptance | run_dir |",
    "|---:|---:|---:|---:|---:|---:|---:|---:|---|---|",
]
for r in rows:
    lines.append(
        f"| {r['rank']} | {r['temperature']} | {r['top_p']} | {r['completed_runs']}/{r['total_runs']} | {r['pct_with_3plus_buckets']} | {r['pct_mean_pinned_high']} | {r['avg_top_bucket_share_pct']} | {r['avg_entropy']} | {r['acceptance']} | {r['run_dir']} |"
    )

md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"[sweep] wrote {leaderboard_csv}")
print(f"[sweep] wrote {md_path}")
if rows:
    best = rows[0]
    print(
        f"[sweep] best temperature={best['temperature']} top_p={best['top_p']} "
        f"pct_3plus={best['pct_with_3plus_buckets']} acceptance={best['acceptance']}"
    )
PY

echo "[sweep] done"
echo "[sweep] see $SWEEP_DIR/leaderboard.md"
