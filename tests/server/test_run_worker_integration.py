from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient

from apps.server import service as service_module
from apps.server.app import create_app
from apps.server.service import run_artifact_path
from apps.server.simulation_runner import SimulationRunError


def _client_with_db(tmp_path: Path) -> tuple[TestClient, Path]:
    db_path = tmp_path / "sims.db"
    app = create_app(db_path=db_path)
    return TestClient(app), db_path


def _insert_row(
    db_path: Path,
    *,
    simulation_id: str,
    sample_size: int = 20,
    policy_text: str = "Base policy text",
    refined_policy_text: str | None = None,
) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO simulations (
                id, title, policy_text, dataset, sample_size, filters_json,
                status, created_at, completed_at, mean_approval, refined_policy_text,
                clarification_status, clarification_turn_index, current_clarification_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                simulation_id,
                "Policy title",
                policy_text,
                "nemotron_usa",
                sample_size,
                None,
                "pending",
                "2026-01-01T00:00:00Z",
                None,
                None,
                refined_policy_text,
                "none",
                0,
                None,
            ),
        )


def _poll_status(client: TestClient, simulation_id: str, *, timeout_s: float = 2.0) -> dict[str, object]:
    deadline = time.time() + timeout_s
    last: dict[str, object] = {}
    while time.time() < deadline:
        response = client.get(f"/api/v1/simulations/{simulation_id}/status")
        assert response.status_code == 200
        last = response.json()
        status = last["data"]["status"]
        if status in {"completed", "failed"}:
            return last
        time.sleep(0.02)
    return last


def test_run_worker_eventually_completes_and_writes_artifact(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SIMS_RUN_WORKER_ENABLED", "1")
    monkeypatch.setenv("SIMS_RUN_BATCH_SIZE", "4")

    def _fake_generate(prompt: str) -> dict[str, object]:
        _ = prompt
        return {"approval": 4, "emotion": "concern", "rationale": "Looks feasible in local context."}

    monkeypatch.setattr(service_module, "generate_policy_response_with_ollama", _fake_generate)

    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_async_ok", sample_size=12)

    response = client.post("/api/v1/simulations/sim_async_ok/run")
    assert response.status_code == 202

    polled = _poll_status(client, "sim_async_ok")
    assert polled["data"]["status"] == "completed"

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT status, mean_approval, completed_at FROM simulations WHERE id = ?",
            ("sim_async_ok",),
        ).fetchone()

    assert row is not None
    assert row[0] == "completed"
    assert row[1] == 4.0
    assert isinstance(row[2], str) and row[2]

    artifact = run_artifact_path("sim_async_ok")
    assert artifact.exists()
    payload = json.loads(artifact.read_text(encoding="utf-8"))
    assert payload["simulation_id"] == "sim_async_ok"
    assert payload["output_count"] == 12
    assert len(payload["raw_outputs"]) == 12
    assert payload["run_telemetry"] == {
        "retry_count": 0,
        "invalid_output_count": 0,
        "failure_code": None,
        "failure_message": None,
        "failed_persona_id": None,
    }


def test_run_worker_uses_base_prompt_when_use_refined_prompt_false(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("SIMS_RUN_WORKER_ENABLED", "1")
    seen_prompts: list[str] = []

    def _fake_generate(prompt: str) -> dict[str, object]:
        seen_prompts.append(prompt)
        return {"approval": 3, "emotion": "neutral", "rationale": "Reasonable policy framing."}

    monkeypatch.setattr(service_module, "generate_policy_response_with_ollama", _fake_generate)

    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_prompt_source",
        sample_size=4,
        policy_text="BASE_POLICY_TEXT",
        refined_policy_text="REFINED_POLICY_TEXT",
    )

    response = client.post("/api/v1/simulations/sim_prompt_source/run", json={"use_refined_prompt": False})
    assert response.status_code == 202
    polled = _poll_status(client, "sim_prompt_source")
    assert polled["data"]["status"] == "completed"
    assert seen_prompts, "expected at least one prompt generation"
    assert all("BASE_POLICY_TEXT" in prompt for prompt in seen_prompts)
    assert all("REFINED_POLICY_TEXT" not in prompt for prompt in seen_prompts)


def test_run_worker_failure_marks_failed(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SIMS_RUN_WORKER_ENABLED", "1")

    def _boom(prompt: str) -> dict[str, object]:
        _ = prompt
        raise RuntimeError("runtime unavailable")

    monkeypatch.setattr(service_module, "generate_policy_response_with_ollama", _boom)

    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_async_fail", sample_size=5)

    response = client.post("/api/v1/simulations/sim_async_fail/run")
    assert response.status_code == 202

    polled = _poll_status(client, "sim_async_fail")
    assert polled["data"]["status"] == "failed"

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT
                status, completed_at, run_retry_count, run_invalid_output_count,
                run_failure_code, run_failure_message, run_failed_persona_id
            FROM simulations WHERE id = ?
            """,
            ("sim_async_fail",),
        ).fetchone()
    assert row is not None
    assert row[0] == "failed"
    assert isinstance(row[1], str) and row[1]
    assert row[2] == 1
    assert row[3] == 0
    assert row[4] == "RUNTIME_ERROR"
    assert isinstance(row[5], str) and row[5]
    assert row[6] == "p_sim_async_fail_00001"

    artifact = run_artifact_path("sim_async_fail")
    assert artifact.exists()
    payload = json.loads(artifact.read_text(encoding="utf-8"))
    assert payload["output_count"] == 0
    assert payload["run_telemetry"]["retry_count"] == 1
    assert payload["run_telemetry"]["invalid_output_count"] == 0
    assert payload["run_telemetry"]["failure_code"] == "RUNTIME_ERROR"
    assert payload["run_telemetry"]["failed_persona_id"] == "p_sim_async_fail_00001"


def test_run_worker_parse_retry_then_success(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SIMS_RUN_WORKER_ENABLED", "1")
    monkeypatch.setenv("SIMS_RUN_MAX_RETRIES", "1")

    calls = {"count": 0}

    def _flaky(prompt: str) -> dict[str, object]:
        _ = prompt
        calls["count"] += 1
        if calls["count"] == 1:
            raise SimulationRunError(
                "model output was not valid JSON",
                code="PARSE_ERROR",
                retryable=True,
                invalid_output=True,
            )
        return {"approval": 4, "emotion": "concern", "rationale": "Looks feasible in local context."}

    monkeypatch.setattr(service_module, "generate_policy_response_with_ollama", _flaky)

    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_parse_retry_ok", sample_size=1)

    response = client.post("/api/v1/simulations/sim_parse_retry_ok/run")
    assert response.status_code == 202

    polled = _poll_status(client, "sim_parse_retry_ok")
    assert polled["data"]["status"] == "completed"
    telemetry = polled["data"]["run_telemetry"]
    assert telemetry["retry_count"] == 1
    assert telemetry["invalid_output_count"] == 1
    assert telemetry["failure_code"] is None


def test_run_worker_runtime_retry_then_success(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SIMS_RUN_WORKER_ENABLED", "1")
    monkeypatch.setenv("SIMS_RUN_MAX_RETRIES", "1")

    calls = {"count": 0}

    def _flaky(prompt: str) -> dict[str, object]:
        _ = prompt
        calls["count"] += 1
        if calls["count"] == 1:
            raise RuntimeError("runtime unavailable")
        return {"approval": 5, "emotion": "hope", "rationale": "The policy seems beneficial overall."}

    monkeypatch.setattr(service_module, "generate_policy_response_with_ollama", _flaky)

    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_runtime_retry_ok", sample_size=1)

    response = client.post("/api/v1/simulations/sim_runtime_retry_ok/run")
    assert response.status_code == 202

    polled = _poll_status(client, "sim_runtime_retry_ok")
    assert polled["data"]["status"] == "completed"
    telemetry = polled["data"]["run_telemetry"]
    assert telemetry["retry_count"] == 1
    assert telemetry["invalid_output_count"] == 0
    assert telemetry["failure_code"] is None


def test_run_worker_parse_failure_after_retries_marks_failed(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SIMS_RUN_WORKER_ENABLED", "1")
    monkeypatch.setenv("SIMS_RUN_MAX_RETRIES", "1")

    def _always_parse_fail(prompt: str) -> dict[str, object]:
        _ = prompt
        raise SimulationRunError(
            "model output approval must be integer in range 1..5",
            code="PARSE_ERROR",
            retryable=True,
            invalid_output=True,
        )

    monkeypatch.setattr(service_module, "generate_policy_response_with_ollama", _always_parse_fail)

    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_parse_retry_fail", sample_size=5)

    response = client.post("/api/v1/simulations/sim_parse_retry_fail/run")
    assert response.status_code == 202

    polled = _poll_status(client, "sim_parse_retry_fail")
    assert polled["data"]["status"] == "failed"
    telemetry = polled["data"]["run_telemetry"]
    assert telemetry["retry_count"] == 1
    assert telemetry["invalid_output_count"] == 2
    assert telemetry["failure_code"] == "PARSE_ERROR"
    assert telemetry["failed_persona_id"] == "p_sim_parse_retry_fail_00001"

    artifact = run_artifact_path("sim_parse_retry_fail")
    assert artifact.exists()
    payload = json.loads(artifact.read_text(encoding="utf-8"))
    assert payload["output_count"] == 0
    assert payload["run_telemetry"]["failure_code"] == "PARSE_ERROR"
    assert payload["run_telemetry"]["failed_persona_id"] == "p_sim_parse_retry_fail_00001"


def test_delete_simulation_removes_run_artifact(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_delete_artifact", sample_size=3)
    artifact = run_artifact_path("sim_delete_artifact")
    artifact.write_text('{"ok":true}', encoding="utf-8")
    assert artifact.exists()

    response = client.delete("/api/v1/simulations/sim_delete_artifact")
    assert response.status_code == 200
    assert not artifact.exists()
