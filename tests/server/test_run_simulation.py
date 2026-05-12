from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient

from apps.server.app import create_app
from apps.server import service as service_module


def _client_with_db(tmp_path: Path) -> tuple[TestClient, Path]:
    db_path = tmp_path / "sims.db"
    app = create_app(db_path=db_path)
    return TestClient(app), db_path


@pytest.fixture(autouse=True)
def _mock_dataset_sampler(monkeypatch: pytest.MonkeyPatch) -> None:
    def _sample_personas(*, simulation_id: str, count: int, filters: dict[str, object] | None) -> tuple[list[dict[str, object]], dict[str, object]]:
        _ = (simulation_id, filters)
        personas = [
            {
                "persona_id": f"p_{idx + 1:05d}",
                "name": f"Persona {idx + 1}",
                "age": 30,
                "sex": "female",
                "marital_status": "married",
                "education_level": "bachelors",
                "occupation": "Teacher",
                "city": "Austin",
                "state": "TX",
            }
            for idx in range(count)
        ]
        return personas, {
            "dataset_version": "test-v1",
            "dataset_source": "/tmp/test.csv",
            "sampling_seed": 123,
            "available_count": count,
        }

    monkeypatch.setattr(service_module, "sample_personas", _sample_personas)


def _insert_row(
    db_path: Path,
    *,
    simulation_id: str,
    status: str = "pending",
    sample_size: int = 100,
    policy_text: str = "Base policy text",
    refined_policy_text: str | None = None,
    clarification_status: str = "none",
    clarification_turn_index: int = 0,
    current_clarification_id: str | None = None,
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
                status,
                "2026-01-01T00:00:00Z",
                None,
                None,
                refined_policy_text,
                clarification_status,
                clarification_turn_index,
                current_clarification_id,
            ),
        )


def test_run_simulation_happy_path_defaults_and_persistence(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001", sample_size=120)

    response = client.post("/api/v1/simulations/sim_001/run")
    assert response.status_code == 202

    body = response.json()
    assert set(body.keys()) == {"data", "error", "meta"}
    assert body["error"] is None
    assert body["data"]["id"] == "sim_001"
    assert body["data"]["status"] == "running"
    assert body["data"]["runtime_profile"] == "auto"
    assert body["data"]["effective_sample_size"] == 120
    assert isinstance(body["data"]["estimated_seconds"], int)
    assert body["meta"]["request_id"].startswith("req_")

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT status, started_at, runtime_profile, effective_sample_size, estimated_seconds,
                   run_idempotency_key, run_request_fingerprint, run_prompt_source
            FROM simulations
            WHERE id = ?
            """,
            ("sim_001",),
        ).fetchone()

    assert row is not None
    assert row[0] == "running"
    assert row[1] == body["data"]["started_at"]
    assert row[2] == "auto"
    assert row[3] == 120
    assert row[4] == body["data"]["estimated_seconds"]
    assert row[5] is None
    assert isinstance(row[6], str) and row[6]
    assert row[7] == "policy_text"


def test_run_simulation_explicit_profile_is_used(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001")

    response = client.post(
        "/api/v1/simulations/sim_001/run",
        json={"profile": "thorough"},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["data"]["runtime_profile"] == "thorough"

    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT runtime_profile FROM simulations WHERE id = ?", ("sim_001",)).fetchone()
    assert row is not None
    assert row[0] == "thorough"


@pytest.mark.parametrize("status", ["running", "completed", "failed"])
def test_run_simulation_lifecycle_conflict_non_pending(tmp_path: Path, status: str) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001", status=status)

    response = client.post("/api/v1/simulations/sim_001/run")
    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "LIFECYCLE_CONFLICT"


def test_run_simulation_not_found(tmp_path: Path) -> None:
    client, _ = _client_with_db(tmp_path)

    response = client.post("/api/v1/simulations/sim_missing/run")
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "NOT_FOUND"


@pytest.mark.parametrize(
    "payload",
    [
        [],
        {"profile": "fast"},
        {"max_duration_seconds": 0},
        {"max_duration_seconds": "100"},
        {"allow_sample_clamp": "yes"},
        {"use_refined_prompt": "yes"},
        {"unexpected": 1},
    ],
)
def test_run_simulation_validation_errors(tmp_path: Path, payload: object) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001")

    response = client.post("/api/v1/simulations/sim_001/run", json=payload)
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_run_simulation_validation_error_invalid_json(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001")

    response = client.post(
        "/api/v1/simulations/sim_001/run",
        content=b"{",
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_run_simulation_idempotency_replay_same_key_and_payload(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001", sample_size=150)
    headers = {"Idempotency-Key": "idem-001"}
    payload = {"profile": "balanced", "use_refined_prompt": True}

    first = client.post("/api/v1/simulations/sim_001/run", json=payload, headers=headers)
    second = client.post("/api/v1/simulations/sim_001/run", json=payload, headers=headers)

    assert first.status_code == 202
    assert second.status_code == 202
    first_data = first.json()["data"]
    second_data = second.json()["data"]
    assert second_data == first_data

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT run_idempotency_key, run_request_fingerprint FROM simulations WHERE id = ?",
            ("sim_001",),
        ).fetchone()
    assert row is not None
    assert row[0] == "idem-001"
    assert isinstance(row[1], str) and row[1]


def test_run_simulation_idempotency_same_key_different_payload_conflict(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001")
    headers = {"Idempotency-Key": "idem-001"}

    first = client.post("/api/v1/simulations/sim_001/run", json={"profile": "auto"}, headers=headers)
    assert first.status_code == 202

    second = client.post("/api/v1/simulations/sim_001/run", json={"profile": "balanced"}, headers=headers)
    assert second.status_code == 409
    body = second.json()
    assert body["error"]["code"] == "LIFECYCLE_CONFLICT"


def test_run_simulation_running_with_different_idempotency_key_conflict(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001")

    first = client.post(
        "/api/v1/simulations/sim_001/run",
        json={"profile": "auto"},
        headers={"Idempotency-Key": "idem-001"},
    )
    assert first.status_code == 202

    second = client.post(
        "/api/v1/simulations/sim_001/run",
        json={"profile": "auto"},
        headers={"Idempotency-Key": "idem-002"},
    )
    assert second.status_code == 409
    body = second.json()
    assert body["error"]["code"] == "LIFECYCLE_CONFLICT"


def test_run_simulation_non_blocking_with_clarification_in_progress(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        status="pending",
        refined_policy_text="Refined prompt",
        clarification_status="in_progress",
        clarification_turn_index=2,
        current_clarification_id="cl_002",
    )

    response = client.post(
        "/api/v1/simulations/sim_001/run",
        json={"use_refined_prompt": True},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["data"]["status"] == "running"

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT run_prompt_source FROM simulations WHERE id = ?",
            ("sim_001",),
        ).fetchone()

    assert row is not None
    assert row[0] == "refined_policy_text"


def test_run_simulation_insufficient_dataset_sample_returns_409(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001", sample_size=120)

    def _raise_insufficient(*, simulation_id: str, count: int, filters: dict[str, object] | None) -> tuple[list[dict[str, object]], dict[str, object]]:
        _ = (simulation_id, count, filters)
        raise service_module.DatasetLoadError("insufficient personas after filters: required=120, available=30")

    monkeypatch.setattr(service_module, "sample_personas", _raise_insufficient)

    response = client.post("/api/v1/simulations/sim_001/run")
    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "INSUFFICIENT_DATASET_SAMPLE"

    with sqlite3.connect(db_path) as conn:
        row = conn.execute("SELECT status FROM simulations WHERE id = ?", ("sim_001",)).fetchone()
    assert row is not None
    assert row[0] == "pending"
