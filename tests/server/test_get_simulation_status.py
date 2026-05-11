from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient

from apps.server.app import create_app


def _client_with_db(tmp_path: Path) -> tuple[TestClient, Path]:
    db_path = tmp_path / "sims.db"
    app = create_app(db_path=db_path)
    return TestClient(app), db_path


def _insert_row(
    db_path: Path,
    *,
    simulation_id: str,
    status: str,
    sample_size: int = 100,
    effective_sample_size: int | None = None,
    runtime_profile: str | None = None,
    started_at: str | None = None,
    estimated_seconds: int | None = None,
    run_retry_count: int = 0,
    run_invalid_output_count: int = 0,
    run_failure_code: str | None = None,
    run_failure_message: str | None = None,
    run_failed_persona_id: str | None = None,
) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO simulations (
                id, title, policy_text, dataset, sample_size, filters_json,
                status, created_at, completed_at, mean_approval, refined_policy_text,
                started_at, runtime_profile, effective_sample_size, estimated_seconds,
                run_idempotency_key, run_request_fingerprint, run_prompt_source, run_retry_count,
                run_invalid_output_count, run_failure_code, run_failure_message, run_failed_persona_id,
                clarification_status, clarification_turn_index, current_clarification_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                simulation_id,
                "Policy title",
                "Base policy",
                "nemotron_usa",
                sample_size,
                None,
                status,
                "2026-01-01T00:00:00Z",
                None,
                None,
                None,
                started_at,
                runtime_profile,
                effective_sample_size,
                estimated_seconds,
                None,
                None,
                None,
                    run_retry_count,
                    run_invalid_output_count,
                run_failure_code,
                run_failure_message,
                run_failed_persona_id,
                "none",
                0,
                None,
            ),
        )


def test_get_simulation_status_running_progress(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)

    fixed_now = datetime(2026, 4, 19, 12, 0, 0, tzinfo=timezone.utc)
    monkeypatch.setattr("apps.server.service._utc_now", lambda: fixed_now)

    started_at = (fixed_now - timedelta(seconds=30)).isoformat().replace("+00:00", "Z")
    _insert_row(
        db_path,
        simulation_id="sim_running",
        status="running",
        sample_size=200,
        effective_sample_size=120,
        runtime_profile="balanced",
        started_at=started_at,
        estimated_seconds=100,
    )

    response = client.get("/api/v1/simulations/sim_running/status")
    assert response.status_code == 200

    body = response.json()
    assert body["error"] is None
    assert body["meta"]["request_id"].startswith("req_")
    data = body["data"]

    assert data["id"] == "sim_running"
    assert data["status"] == "running"
    assert data["agents_total"] == 120
    assert data["effective_sample_size"] == 120
    assert data["runtime_profile"] == "balanced"
    assert data["estimated_seconds_remaining"] == 70
    assert data["progress_pct"] == 30.0
    assert data["agents_completed"] == 36
    assert data["run_telemetry"] == {
        "retry_count": 0,
        "invalid_output_count": 0,
        "failure_code": None,
        "failure_message": None,
        "failed_persona_id": None,
    }


def test_get_simulation_status_pending_returns_zero_progress(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_pending", status="pending", sample_size=90)

    response = client.get("/api/v1/simulations/sim_pending/status")
    assert response.status_code == 200

    data = response.json()["data"]
    assert data["status"] == "pending"
    assert data["agents_total"] == 90
    assert data["agents_completed"] == 0
    assert data["progress_pct"] == 0.0
    assert data["estimated_seconds_remaining"] == 0
    assert data["runtime_profile"] == "auto"
    assert data["effective_sample_size"] == 90
    assert data["run_telemetry"] == {
        "retry_count": 0,
        "invalid_output_count": 0,
        "failure_code": None,
        "failure_message": None,
        "failed_persona_id": None,
    }


def test_get_simulation_status_completed_returns_terminal_progress(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_completed",
        status="completed",
        sample_size=80,
        effective_sample_size=60,
        runtime_profile="interactive",
    )

    response = client.get("/api/v1/simulations/sim_completed/status")
    assert response.status_code == 200

    data = response.json()["data"]
    assert data["status"] == "completed"
    assert data["agents_total"] == 60
    assert data["agents_completed"] == 60
    assert data["progress_pct"] == 100.0
    assert data["estimated_seconds_remaining"] == 0
    assert data["run_telemetry"] == {
        "retry_count": 0,
        "invalid_output_count": 0,
        "failure_code": None,
        "failure_message": None,
        "failed_persona_id": None,
    }


def test_get_simulation_status_failed_with_timing_returns_partial_progress(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    client, db_path = _client_with_db(tmp_path)

    fixed_now = datetime(2026, 4, 19, 12, 0, 0, tzinfo=timezone.utc)
    monkeypatch.setattr("apps.server.service._utc_now", lambda: fixed_now)

    started_at = (fixed_now - timedelta(seconds=25)).isoformat().replace("+00:00", "Z")
    _insert_row(
        db_path,
        simulation_id="sim_failed",
        status="failed",
        sample_size=100,
        runtime_profile="auto",
        started_at=started_at,
        estimated_seconds=50,
        run_retry_count=2,
        run_invalid_output_count=1,
        run_failure_code="PARSE_ERROR",
        run_failure_message="model output was not valid JSON",
        run_failed_persona_id="p_sim_failed_00001",
    )

    response = client.get("/api/v1/simulations/sim_failed/status")
    assert response.status_code == 200

    data = response.json()["data"]
    assert data["status"] == "failed"
    assert data["agents_total"] == 100
    assert data["agents_completed"] == 50
    assert data["progress_pct"] == 50.0
    assert data["estimated_seconds_remaining"] == 0
    assert data["run_telemetry"] == {
        "retry_count": 2,
        "invalid_output_count": 1,
        "failure_code": "PARSE_ERROR",
        "failure_message": "model output was not valid JSON",
        "failed_persona_id": "p_sim_failed_00001",
    }


def test_get_simulation_status_not_found(tmp_path: Path) -> None:
    client, _ = _client_with_db(tmp_path)

    response = client.get("/api/v1/simulations/sim_missing/status")
    assert response.status_code == 404

    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "NOT_FOUND"
    assert body["meta"]["request_id"].startswith("req_")


def test_get_simulation_status_back_compat_fallback_when_run_fields_missing(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    client, db_path = _client_with_db(tmp_path)

    fixed_now = datetime(2026, 4, 19, 12, 0, 0, tzinfo=timezone.utc)
    monkeypatch.setattr("apps.server.service._utc_now", lambda: fixed_now)

    started_at = (fixed_now - timedelta(seconds=10)).isoformat().replace("+00:00", "Z")
    _insert_row(
        db_path,
        simulation_id="sim_fallback",
        status="running",
        sample_size=40,
        started_at=started_at,
        runtime_profile=None,
        effective_sample_size=None,
        estimated_seconds=None,
    )

    response = client.get("/api/v1/simulations/sim_fallback/status")
    assert response.status_code == 200

    data = response.json()["data"]
    assert data["status"] == "running"
    assert data["runtime_profile"] == "auto"
    assert data["agents_total"] == 40
    assert data["effective_sample_size"] == 40
    assert isinstance(data["progress_pct"], float)
    assert 0.0 <= data["progress_pct"] <= 99.9
    assert data["estimated_seconds_remaining"] >= 0
    assert 0 <= data["agents_completed"] <= 40
    assert data["run_telemetry"] == {
        "retry_count": 0,
        "invalid_output_count": 0,
        "failure_code": None,
        "failure_message": None,
        "failed_persona_id": None,
    }


def test_get_simulation_status_contract_shape_for_required_fields(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_shape", status="pending", sample_size=77)

    response = client.get("/api/v1/simulations/sim_shape/status")
    assert response.status_code == 200

    body = response.json()
    assert set(body.keys()) == {"data", "error", "meta"}
    assert set(body["data"].keys()) == {
        "id",
        "status",
        "agents_total",
        "agents_completed",
        "progress_pct",
        "estimated_seconds_remaining",
        "runtime_profile",
        "effective_sample_size",
        "run_telemetry",
    }
