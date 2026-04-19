from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient

from apps.server import service as service_module
from apps.server.app import create_app
from apps.server.clarification_generator import ClarificationGenerationError


def _client_with_db(tmp_path: Path) -> tuple[TestClient, Path]:
    db_path = tmp_path / "sims.db"
    app = create_app(db_path=db_path)
    return TestClient(app), db_path


def _insert_row(
    db_path: Path,
    *,
    simulation_id: str,
    status: str = "pending",
) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO simulations (
                id, title, policy_text, dataset, sample_size, filters_json,
                status, created_at, completed_at, mean_approval, refined_policy_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                simulation_id,
                "Policy title",
                "A carbon policy draft",
                "nemotron_usa",
                100,
                None,
                status,
                "2026-01-01T00:00:00Z",
                None,
                None,
                None,
            ),
        )


def test_generate_clarification_success_pending_simulation(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001")

    monkeypatch.setattr(
        service_module,
        "generate_clarification_with_gemma",
        lambda policy_text, focus: (
            f"What funding source supports {focus}?",
            "Funding design materially affects support levels.",
        ),
    )

    response = client.post(
        "/api/v1/simulations/sim_001/clarifications/generate",
        json={"focus": "rebates"},
    )
    assert response.status_code == 200

    body = response.json()
    assert set(body.keys()) == {"data", "error", "meta"}
    assert body["error"] is None
    assert body["data"]["simulation_id"] == "sim_001"
    assert body["data"]["status"] == "open"
    assert body["data"]["turn_index"] == 1
    assert body["data"]["clarification_id"].startswith("cl_")
    assert body["meta"]["request_id"].startswith("req_")

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT status, clarification_status, clarification_turn_index, current_clarification_id
            FROM simulations
            WHERE id = ?
            """,
            ("sim_001",),
        ).fetchone()

    assert row is not None
    assert row[0] == "pending"
    assert row[1] == "in_progress"
    assert row[2] == 1
    assert row[3] == body["data"]["clarification_id"]


def test_generate_clarification_turn_progression(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001")

    monkeypatch.setattr(
        service_module,
        "generate_clarification_with_gemma",
        lambda policy_text, focus: (
            f"What does {focus} target?",
            "Targeting affects response heterogeneity.",
        ),
    )

    first = client.post(
        "/api/v1/simulations/sim_001/clarifications/generate",
        json={"focus": "scope"},
    )
    second = client.post(
        "/api/v1/simulations/sim_001/clarifications/generate",
        json={"focus": "eligibility"},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    first_id = first.json()["data"]["clarification_id"]
    second_body = second.json()
    assert second_body["data"]["turn_index"] == 2
    assert second_body["data"]["clarification_id"] != first_id

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT clarification_turn_index, current_clarification_id FROM simulations WHERE id = ?",
            ("sim_001",),
        ).fetchone()

    assert row is not None
    assert row[0] == 2
    assert row[1] == second_body["data"]["clarification_id"]


def test_generate_clarification_not_found(tmp_path: Path) -> None:
    client, _ = _client_with_db(tmp_path)

    response = client.post(
        "/api/v1/simulations/sim_missing/clarifications/generate",
        json={"focus": "scope"},
    )

    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "NOT_FOUND"


def test_generate_clarification_lifecycle_conflict(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001", status="running")
    monkeypatch.setattr(
        service_module,
        "generate_clarification_with_gemma",
        lambda policy_text, focus: ("Question?", "Rationale."),
    )

    response = client.post(
        "/api/v1/simulations/sim_001/clarifications/generate",
        json={"focus": "scope"},
    )

    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "LIFECYCLE_CONFLICT"


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"focus": ""},
        {"focus": 123},
    ],
)
def test_generate_clarification_validation_error_payload(tmp_path: Path, payload: dict[str, object]) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001")

    response = client.post(
        "/api/v1/simulations/sim_001/clarifications/generate",
        json=payload,
    )

    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_generate_clarification_validation_error_invalid_json(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001")

    response = client.post(
        "/api/v1/simulations/sim_001/clarifications/generate",
        data="{",
        headers={"content-type": "application/json"},
    )

    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_generate_clarification_model_runtime_error_no_state_mutation(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001")

    def _raise_runtime_error(policy_text: str, focus: str) -> tuple[str, str]:
        raise ClarificationGenerationError("runtime unavailable")

    monkeypatch.setattr(service_module, "generate_clarification_with_gemma", _raise_runtime_error)

    response = client.post(
        "/api/v1/simulations/sim_001/clarifications/generate",
        json={"focus": "scope"},
    )

    assert response.status_code == 500
    body = response.json()
    assert body["error"]["code"] == "MODEL_RUNTIME_ERROR"

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT clarification_status, clarification_turn_index, current_clarification_id
            FROM simulations
            WHERE id = ?
            """,
            ("sim_001",),
        ).fetchone()

    assert row is not None
    assert row[0] == "none"
    assert row[1] == 0
    assert row[2] is None


def test_generate_clarification_persists_no_transcript_columns(tmp_path: Path) -> None:
    _, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, simulation_id="sim_001")

    with sqlite3.connect(db_path) as conn:
        column_names = {
            row[1]
            for row in conn.execute("PRAGMA table_info(simulations)").fetchall()
        }

    assert "clarification_status" in column_names
    assert "clarification_turn_index" in column_names
    assert "current_clarification_id" in column_names
    assert "clarification_question_text" not in column_names
    assert "clarification_rationale" not in column_names
    assert "clarification_transcript" not in column_names
    assert "clarification_answer_text" not in column_names
