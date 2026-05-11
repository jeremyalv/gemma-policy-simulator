from __future__ import annotations

import csv
import json
import sqlite3
from io import StringIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from apps.server.app import create_app
from apps.server.service import run_artifact_path
from apps.server.storage import SimulationStore


CSV_COLUMNS = [
    "persona_id",
    "name",
    "age",
    "occupation",
    "city",
    "state",
    "approval",
    "emotion",
    "rationale",
    "behavioral_change",
]


def _insert_row(
    db_path: Path,
    *,
    simulation_id: str,
    status: str,
) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO simulations (
                id, title, policy_text, dataset, sample_size, status, created_at,
                completed_at, mean_approval, refined_policy_text,
                runtime_profile, effective_sample_size,
                run_retry_count, run_invalid_output_count,
                clarification_status, clarification_turn_index
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                simulation_id,
                "Export test",
                "Policy text",
                "nemotron_usa",
                3,
                status,
                "2026-01-01T00:00:00Z",
                "2026-01-01T00:01:00Z" if status == "completed" else None,
                3.0 if status == "completed" else None,
                None,
                "balanced",
                3,
                0,
                0,
                "none",
                0,
            ),
        )


def _write_artifact(simulation_id: str, payload: dict[str, object]) -> None:
    run_artifact_path(simulation_id).write_text(json.dumps(payload), encoding="utf-8")


def _read_csv_rows(text: str) -> list[dict[str, str]]:
    reader = csv.DictReader(StringIO(text))
    return list(reader)


def test_export_completed_returns_csv_with_expected_headers_and_values(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_row(db_path, simulation_id="sim_export_ok", status="completed")

    _write_artifact(
        "sim_export_ok",
        {
            "simulation_id": "sim_export_ok",
            "model": "gemma",
            "output_count": 3,
            "raw_outputs": [
                {
                    "persona": {
                        "persona_id": "p_003",
                        "name": "Cara",
                        "age": 31,
                        "occupation": "Teacher",
                        "city": "Houston",
                        "state": "TX",
                    },
                    "response": {
                        "approval": 4,
                        "emotion": "hope",
                        "rationale": "Could help long-term.",
                        "behavior_change": True,
                    },
                },
                {
                    "persona": {
                        "persona_id": "p_001",
                        "name": "Alice",
                        "age": 22,
                        "occupation": "Nurse",
                        "city": "Los Angeles",
                        "state": "CA",
                    },
                    "response": {
                        "approval": 2,
                        "emotion": "concern",
                        "rationale": "Too expensive for me.",
                        "behavior_change": False,
                    },
                },
                {
                    "persona": {
                        "persona_id": "p_002",
                        "name": "Bob",
                        "age": 40,
                        "occupation": "Engineer",
                        "city": "Austin",
                        "state": "TX",
                    },
                    "response": {
                        "approval": 3,
                        "emotion": "neutral",
                        "rationale": "Need more details.",
                    },
                },
            ],
        },
    )

    client = TestClient(create_app(db_path))
    response = client.get("/api/v1/simulations/sim_export_ok/export")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert response.headers["content-disposition"] == (
        'attachment; filename="infinipol-sim_export_ok-results.csv"'
    )

    lines = response.text.splitlines()
    assert lines[0] == ",".join(CSV_COLUMNS)

    rows = _read_csv_rows(response.text)
    assert [row["persona_id"] for row in rows] == ["p_001", "p_002", "p_003"]

    assert rows[0] == {
        "persona_id": "p_001",
        "name": "Alice",
        "age": "22",
        "occupation": "Nurse",
        "city": "Los Angeles",
        "state": "CA",
        "approval": "2",
        "emotion": "concern",
        "rationale": "Too expensive for me.",
        "behavioral_change": "false",
    }
    assert rows[1]["behavioral_change"] == ""
    assert rows[2]["behavioral_change"] == "true"


def test_export_csv_escapes_quotes_commas_and_newlines(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_row(db_path, simulation_id="sim_export_escape", status="completed")

    _write_artifact(
        "sim_export_escape",
        {
            "simulation_id": "sim_export_escape",
            "model": "gemma",
            "output_count": 1,
            "raw_outputs": [
                {
                    "persona": {
                        "persona_id": "p_001",
                        "name": "Alice",
                        "age": 29,
                        "occupation": "Nurse",
                        "city": "Los Angeles",
                        "state": "CA",
                    },
                    "response": {
                        "approval": 4,
                        "emotion": "hope",
                        "rationale": "He said, \"Looks good\", but\nneeds clearer rollout.",
                    },
                }
            ],
        },
    )

    client = TestClient(create_app(db_path))
    response = client.get("/api/v1/simulations/sim_export_escape/export")

    assert response.status_code == 200
    rows = _read_csv_rows(response.text)
    assert len(rows) == 1
    assert rows[0]["rationale"] == 'He said, "Looks good", but\nneeds clearer rollout.'


def test_export_is_deterministic_across_repeated_calls(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_row(db_path, simulation_id="sim_export_det", status="completed")

    _write_artifact(
        "sim_export_det",
        {
            "simulation_id": "sim_export_det",
            "model": "gemma",
            "output_count": 2,
            "raw_outputs": [
                {
                    "persona": {
                        "persona_id": "p_b",
                        "name": "Bravo",
                        "age": 40,
                        "occupation": "Teacher",
                        "city": "Austin",
                        "state": "TX",
                    },
                    "response": {"approval": 5, "emotion": "hope", "rationale": "Reason B"},
                },
                {
                    "persona": {
                        "persona_id": "p_a",
                        "name": "Alpha",
                        "age": 35,
                        "occupation": "Engineer",
                        "city": "Seattle",
                        "state": "WA",
                    },
                    "response": {"approval": 3, "emotion": "concern", "rationale": "Reason A"},
                },
            ],
        },
    )

    client = TestClient(create_app(db_path))
    first = client.get("/api/v1/simulations/sim_export_det/export")
    second = client.get("/api/v1/simulations/sim_export_det/export")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.text == second.text


@pytest.mark.parametrize("status", ["pending", "running"])
def test_export_pending_or_running_returns_not_complete(tmp_path: Path, status: str) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_row(db_path, simulation_id=f"sim_{status}", status=status)

    client = TestClient(create_app(db_path))
    response = client.get(f"/api/v1/simulations/sim_{status}/export")

    assert response.status_code == 409
    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "SIMULATION_NOT_COMPLETE"


def test_export_failed_returns_simulation_failed(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_row(db_path, simulation_id="sim_failed", status="failed")

    client = TestClient(create_app(db_path))
    response = client.get("/api/v1/simulations/sim_failed/export")

    assert response.status_code == 409
    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "SIMULATION_FAILED"


def test_export_missing_simulation_returns_not_found(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()

    client = TestClient(create_app(db_path))
    response = client.get("/api/v1/simulations/sim_missing/export")

    assert response.status_code == 404
    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "NOT_FOUND"


def test_export_completed_missing_artifact_returns_internal_error(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_row(db_path, simulation_id="sim_missing_artifact", status="completed")

    client = TestClient(create_app(db_path))
    response = client.get("/api/v1/simulations/sim_missing_artifact/export")

    assert response.status_code == 500
    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "INTERNAL_ERROR"


def test_export_completed_invalid_artifact_json_returns_internal_error(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_row(db_path, simulation_id="sim_bad_json", status="completed")

    run_artifact_path("sim_bad_json").write_text("{not json", encoding="utf-8")

    client = TestClient(create_app(db_path))
    response = client.get("/api/v1/simulations/sim_bad_json/export")

    assert response.status_code == 500
    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "INTERNAL_ERROR"


def test_export_completed_missing_raw_outputs_returns_internal_error(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_row(db_path, simulation_id="sim_no_raw_outputs", status="completed")

    _write_artifact(
        "sim_no_raw_outputs",
        {
            "simulation_id": "sim_no_raw_outputs",
            "model": "gemma",
            "output_count": 0,
        },
    )

    client = TestClient(create_app(db_path))
    response = client.get("/api/v1/simulations/sim_no_raw_outputs/export")

    assert response.status_code == 500
    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "INTERNAL_ERROR"
