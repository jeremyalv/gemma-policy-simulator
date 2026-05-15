from __future__ import annotations

import csv
import json
import subprocess
from pathlib import Path


def _write(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_analyze_calibration_outputs_summary_files(tmp_path: Path) -> None:
    run_dir = tmp_path / "run"
    run_dir.mkdir()

    _write(
        run_dir / "policy_a_s101_status.json",
        {
            "data": {
                "status": "completed",
                "run_telemetry": {"success_rate": 1.0, "failed_count": 0},
            }
        },
    )
    _write(
        run_dir / "policy_a_s101_results.json",
        {
            "data": {
                "summary": {
                    "mean_approval": 3.4,
                    "approval_distribution": {"1": 10, "2": 20, "3": 30, "4": 20, "5": 20},
                    "dominant_emotion": "concern",
                }
            }
        },
    )
    _write(
        run_dir / "policy_a_s101_meta.json",
        {
            "run_key": "policy_a_s101",
            "policy_key": "policy_a",
            "seed": "101",
            "simulation_id": "sim_a",
        },
    )

    _write(
        run_dir / "policy_b_s202_status.json",
        {
            "data": {
                "status": "failed",
                "run_telemetry": {"success_rate": 0.65, "failed_count": 35},
            }
        },
    )
    _write(
        run_dir / "policy_b_s202_results.json",
        {"data": None, "error": {"code": "SIMULATION_FAILED", "message": "failed"}},
    )
    _write(
        run_dir / "policy_b_s202_meta.json",
        {
            "run_key": "policy_b_s202",
            "policy_key": "policy_b",
            "seed": "202",
            "simulation_id": "sim_b",
        },
    )

    result = subprocess.run(
        ["python3", "scripts/analyze_calibration.py", str(run_dir)],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr

    summary_csv = run_dir / "summary.csv"
    summary_md = run_dir / "summary.md"
    assert summary_csv.exists()
    assert summary_md.exists()

    rows = list(csv.DictReader(summary_csv.open("r", encoding="utf-8")))
    assert len(rows) == 2
    completed = next(row for row in rows if row["status"] == "completed")
    assert completed["nonzero_buckets"] == "5"
    assert completed["dominant_emotion"] == "concern"

    md = summary_md.read_text(encoding="utf-8")
    assert "# Calibration Report" in md
    assert "Completed runs: **1**" in md


def test_analyze_calibration_handles_missing_pairs(tmp_path: Path) -> None:
    run_dir = tmp_path / "run"
    run_dir.mkdir()

    _write(run_dir / "orphan_status.json", {"data": {"status": "completed"}})

    result = subprocess.run(
        ["python3", "scripts/analyze_calibration.py", str(run_dir)],
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    md = (run_dir / "summary.md").read_text(encoding="utf-8")
    assert "Total runs: **0**" in md
