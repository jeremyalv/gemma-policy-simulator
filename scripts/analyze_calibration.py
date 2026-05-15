#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import math
from pathlib import Path
from typing import Any


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _entropy_from_distribution(distribution: dict[str, int]) -> float:
    total = sum(int(v) for v in distribution.values())
    if total <= 0:
        return 0.0
    entropy = 0.0
    for value in distribution.values():
        count = int(value)
        if count <= 0:
            continue
        p = count / total
        entropy -= p * math.log2(p)
    return round(entropy, 3)


def _top_bucket_share(distribution: dict[str, int]) -> float:
    total = sum(int(v) for v in distribution.values())
    if total <= 0:
        return 0.0
    max_count = max(int(v) for v in distribution.values())
    return round((max_count / total) * 100.0, 1)


def _count_nonzero_buckets(distribution: dict[str, int]) -> int:
    return sum(1 for score in ["1", "2", "3", "4", "5"] if int(distribution.get(score, 0)) > 0)


def analyze_run_dir(run_dir: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for status_path in sorted(run_dir.glob("*_status.json")):
        prefix = status_path.name.removesuffix("_status.json")
        results_path = run_dir / f"{prefix}_results.json"
        meta_path = run_dir / f"{prefix}_meta.json"
        if not results_path.exists() or not meta_path.exists():
            continue

        status = _load_json(status_path)
        meta = _load_json(meta_path)
        status_data = (status.get("data") or {}) if isinstance(status, dict) else {}
        sim_status = str(status_data.get("status") or "")
        telemetry = status_data.get("run_telemetry") if isinstance(status_data.get("run_telemetry"), dict) else {}

        row: dict[str, Any] = {
            "run_key": prefix,
            "simulation_id": meta.get("simulation_id", ""),
            "policy_key": meta.get("policy_key", ""),
            "seed": meta.get("seed", ""),
            "status": sim_status,
            "mean_approval": "",
            "nonzero_buckets": "",
            "top_bucket_share_pct": "",
            "dominant_emotion": "",
            "entropy": "",
            "success_rate": telemetry.get("success_rate", 0.0),
            "failed_count": telemetry.get("failed_count", 0),
        }

        if sim_status == "completed":
            results = _load_json(results_path)
            data = (results.get("data") or {}) if isinstance(results, dict) else {}
            summary = data.get("summary") if isinstance(data.get("summary"), dict) else {}
            distribution = summary.get("approval_distribution") if isinstance(summary.get("approval_distribution"), dict) else {}
            normalized_distribution = {str(k): int(v) for k, v in distribution.items()}

            row["mean_approval"] = float(summary.get("mean_approval", 0.0))
            row["nonzero_buckets"] = _count_nonzero_buckets(normalized_distribution)
            row["top_bucket_share_pct"] = _top_bucket_share(normalized_distribution)
            row["dominant_emotion"] = str(summary.get("dominant_emotion", ""))
            row["entropy"] = _entropy_from_distribution(normalized_distribution)

        rows.append(row)

    completed_rows = [r for r in rows if r["status"] == "completed"]
    with_three_buckets = [r for r in completed_rows if isinstance(r["nonzero_buckets"], int) and r["nonzero_buckets"] >= 3]
    pinned_high = [r for r in completed_rows if isinstance(r["mean_approval"], float) and r["mean_approval"] >= 4.2]

    summary = {
        "total_runs": len(rows),
        "completed_runs": len(completed_rows),
        "pct_with_3plus_buckets": round((len(with_three_buckets) / len(completed_rows) * 100.0), 1) if completed_rows else 0.0,
        "pct_mean_pinned_high": round((len(pinned_high) / len(completed_rows) * 100.0), 1) if completed_rows else 0.0,
        "acceptance_pass": (len(completed_rows) > 0 and (len(with_three_buckets) / len(completed_rows)) >= 0.7),
    }
    return rows, summary


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    fieldnames = [
        "run_key",
        "simulation_id",
        "policy_key",
        "seed",
        "status",
        "mean_approval",
        "nonzero_buckets",
        "top_bucket_share_pct",
        "dominant_emotion",
        "entropy",
        "success_rate",
        "failed_count",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def _write_markdown(path: Path, rows: list[dict[str, Any]], summary: dict[str, Any]) -> None:
    lines = [
        "# Calibration Report",
        "",
        f"- Total runs: **{summary['total_runs']}**",
        f"- Completed runs: **{summary['completed_runs']}**",
        f"- >=3 approval buckets: **{summary['pct_with_3plus_buckets']}%** (target >= 70%)",
        f"- Mean pinned high (>=4.2): **{summary['pct_mean_pinned_high']}%**",
        f"- Acceptance: **{'PASS' if summary['acceptance_pass'] else 'FAIL'}**",
        "",
        "| run_key | policy | seed | status | mean | buckets>=1 | top bucket % | dominant emotion | entropy | success rate | failed count |",
        "|---|---|---:|---|---:|---:|---:|---|---:|---:|---:|",
    ]

    for row in rows:
        lines.append(
            "| {run_key} | {policy_key} | {seed} | {status} | {mean_approval} | {nonzero_buckets} | {top_bucket_share_pct} | {dominant_emotion} | {entropy} | {success_rate} | {failed_count} |".format(**row)
        )

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze calibration runs from status/results artifacts")
    parser.add_argument("run_dir", type=Path, help="Directory containing *_status.json and *_results.json files")
    args = parser.parse_args()

    run_dir = args.run_dir
    if not run_dir.exists() or not run_dir.is_dir():
        raise SystemExit(f"run_dir does not exist or is not a directory: {run_dir}")

    rows, summary = analyze_run_dir(run_dir)
    csv_path = run_dir / "summary.csv"
    md_path = run_dir / "summary.md"
    _write_csv(csv_path, rows)
    _write_markdown(md_path, rows, summary)

    print(f"[analysis] rows={len(rows)}")
    print(f"[analysis] completed={summary['completed_runs']} pct_3plus={summary['pct_with_3plus_buckets']}%")
    print(f"[analysis] acceptance={'PASS' if summary['acceptance_pass'] else 'FAIL'}")
    print(f"[analysis] wrote {csv_path}")
    print(f"[analysis] wrote {md_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
