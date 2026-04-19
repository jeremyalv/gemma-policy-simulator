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
                "A carbon policy draft",
                "nemotron_usa",
                100,
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


def test_answer_clarification_in_progress_continuation(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        status="pending",
        clarification_status="in_progress",
        clarification_turn_index=1,
        current_clarification_id="cl_001",
    )

    monkeypatch.setattr(
        service_module,
        "generate_clarification_answer_with_gemma",
        lambda **kwargs: (
            "Refined policy text v2",
            "in_progress",
            "Should rebates vary by household size?",
        ),
    )

    response = client.post(
        "/api/v1/clarifications/cl_001/answer",
        json={"simulation_id": "sim_001", "user_response": "Use monthly rebates."},
    )
    assert response.status_code == 200

    body = response.json()
    assert set(body.keys()) == {"data", "error", "meta"}
    assert body["error"] is None
    assert body["data"]["simulation_id"] == "sim_001"
    assert body["data"]["clarification_status"] == "in_progress"
    assert body["data"]["refined_policy_text"] == "Refined policy text v2"
    assert body["data"]["next_clarification_id"].startswith("cl_")
    assert body["data"]["next_question_text"] == "Should rebates vary by household size?"

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT status, refined_policy_text, clarification_status, clarification_turn_index, current_clarification_id
            FROM simulations
            WHERE id = ?
            """,
            ("sim_001",),
        ).fetchone()

    assert row is not None
    assert row[0] == "pending"
    assert row[1] == "Refined policy text v2"
    assert row[2] == "in_progress"
    assert row[3] == 2
    assert row[4] == body["data"]["next_clarification_id"]


def test_answer_clarification_resolved_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        status="pending",
        refined_policy_text="Refined policy text v1",
        clarification_status="in_progress",
        clarification_turn_index=2,
        current_clarification_id="cl_002",
    )

    monkeypatch.setattr(
        service_module,
        "generate_clarification_answer_with_gemma",
        lambda **kwargs: (
            "Refined policy text final",
            "resolved",
            None,
        ),
    )

    response = client.post(
        "/api/v1/clarifications/cl_002/answer",
        json={"simulation_id": "sim_001", "user_response": "Keep rebate flat."},
    )
    assert response.status_code == 200

    body = response.json()
    assert body["data"]["clarification_status"] == "resolved"
    assert body["data"]["next_clarification_id"] is None
    assert body["data"]["next_question_text"] is None

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT refined_policy_text, clarification_status, clarification_turn_index, current_clarification_id
            FROM simulations
            WHERE id = ?
            """,
            ("sim_001",),
        ).fetchone()

    assert row is not None
    assert row[0] == "Refined policy text final"
    assert row[1] == "resolved"
    assert row[2] == 2
    assert row[3] is None


def test_answer_clarification_cap_forces_resolved(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        status="pending",
        clarification_status="in_progress",
        clarification_turn_index=3,
        current_clarification_id="cl_003",
    )

    monkeypatch.setattr(
        service_module,
        "generate_clarification_answer_with_gemma",
        lambda **kwargs: (
            "Refined policy text capped",
            "in_progress",
            "This should be ignored due to cap.",
        ),
    )

    response = client.post(
        "/api/v1/clarifications/cl_003/answer",
        json={"simulation_id": "sim_001", "user_response": "Cap reached input."},
    )
    assert response.status_code == 200

    body = response.json()
    assert body["data"]["clarification_status"] == "resolved"
    assert body["data"]["next_clarification_id"] is None
    assert body["data"]["next_question_text"] is None

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
    assert row[0] == "resolved"
    assert row[1] == 3
    assert row[2] is None


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"simulation_id": ""},
        {"simulation_id": 123, "user_response": "x"},
        {"simulation_id": "sim_001"},
        {"simulation_id": "sim_001", "user_response": ""},
    ],
)
def test_answer_clarification_validation_error_payload(tmp_path: Path, payload: dict[str, object]) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        status="pending",
        clarification_status="in_progress",
        clarification_turn_index=1,
        current_clarification_id="cl_001",
    )

    response = client.post("/api/v1/clarifications/cl_001/answer", json=payload)
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_answer_clarification_validation_error_invalid_json(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        status="pending",
        clarification_status="in_progress",
        clarification_turn_index=1,
        current_clarification_id="cl_001",
    )

    response = client.post(
        "/api/v1/clarifications/cl_001/answer",
        content=b"{",
        headers={"content-type": "application/json"},
    )
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_answer_clarification_not_found_simulation(tmp_path: Path) -> None:
    client, _ = _client_with_db(tmp_path)

    response = client.post(
        "/api/v1/clarifications/cl_001/answer",
        json={"simulation_id": "sim_missing", "user_response": "answer"},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "NOT_FOUND"


@pytest.mark.parametrize(
    "current_id,path_id",
    [
        (None, "cl_001"),
        ("cl_real", "cl_other"),
    ],
)
def test_answer_clarification_not_found_inactive_or_mismatch(
    tmp_path: Path,
    current_id: str | None,
    path_id: str,
) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        status="pending",
        clarification_status="in_progress",
        clarification_turn_index=1,
        current_clarification_id=current_id,
    )

    response = client.post(
        f"/api/v1/clarifications/{path_id}/answer",
        json={"simulation_id": "sim_001", "user_response": "answer"},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "NOT_FOUND"


def test_answer_clarification_lifecycle_conflict(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        status="running",
        clarification_status="in_progress",
        clarification_turn_index=1,
        current_clarification_id="cl_001",
    )

    response = client.post(
        "/api/v1/clarifications/cl_001/answer",
        json={"simulation_id": "sim_001", "user_response": "answer"},
    )
    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "LIFECYCLE_CONFLICT"


def test_answer_clarification_model_failure_has_no_state_mutation(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        status="pending",
        refined_policy_text="Refined policy text v1",
        clarification_status="in_progress",
        clarification_turn_index=1,
        current_clarification_id="cl_001",
    )

    def _raise_runtime_error(**kwargs: object) -> tuple[str, str, str | None]:
        raise ClarificationGenerationError("runtime unavailable")

    monkeypatch.setattr(service_module, "generate_clarification_answer_with_gemma", _raise_runtime_error)

    response = client.post(
        "/api/v1/clarifications/cl_001/answer",
        json={"simulation_id": "sim_001", "user_response": "answer"},
    )
    assert response.status_code == 500
    body = response.json()
    assert body["error"]["code"] == "MODEL_RUNTIME_ERROR"

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            """
            SELECT refined_policy_text, clarification_status, clarification_turn_index, current_clarification_id
            FROM simulations
            WHERE id = ?
            """,
            ("sim_001",),
        ).fetchone()

    assert row is not None
    assert row[0] == "Refined policy text v1"
    assert row[1] == "in_progress"
    assert row[2] == 1
    assert row[3] == "cl_001"


def test_answer_clarification_persists_no_transcript_columns(tmp_path: Path) -> None:
    _, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        status="pending",
        clarification_status="in_progress",
        clarification_turn_index=1,
        current_clarification_id="cl_001",
    )

    with sqlite3.connect(db_path) as conn:
        column_names = {
            row[1]
            for row in conn.execute("PRAGMA table_info(simulations)").fetchall()
        }

    assert "refined_policy_text" in column_names
    assert "clarification_status" in column_names
    assert "clarification_turn_index" in column_names
    assert "current_clarification_id" in column_names
    assert "clarification_question_text" not in column_names
    assert "clarification_rationale" not in column_names
    assert "clarification_transcript" not in column_names
    assert "clarification_answer_text" not in column_names
