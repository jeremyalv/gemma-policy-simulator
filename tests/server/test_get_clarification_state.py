from __future__ import annotations

import sqlite3
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
    status: str = "pending",
    refined_policy_text: str | None = None,
    clarification_status: str = "none",
    clarification_turn_index: int = 0,
    current_clarification_id: str | None = None,
    policy_text: str = "Base policy text",
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


def test_get_clarification_state_no_clarification_falls_back_to_policy_text(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        clarification_status="none",
        current_clarification_id=None,
        refined_policy_text=None,
        policy_text="Policy baseline",
    )

    response = client.get("/api/v1/simulations/sim_001/clarifications")
    assert response.status_code == 200

    body = response.json()
    assert set(body.keys()) == {"data", "error", "meta"}
    assert body["error"] is None
    assert body["data"]["simulation_id"] == "sim_001"
    assert body["data"]["clarification_status"] == "none"
    assert body["data"]["has_open_question"] is False
    assert body["data"]["latest_refined_policy_text"] == "Policy baseline"
    assert body["meta"]["request_id"].startswith("req_")


def test_get_clarification_state_in_progress_has_open_question(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        clarification_status="in_progress",
        clarification_turn_index=2,
        current_clarification_id="cl_002",
        refined_policy_text="Refined v2",
    )

    response = client.get("/api/v1/simulations/sim_001/clarifications")
    assert response.status_code == 200

    body = response.json()
    assert body["data"]["clarification_status"] == "in_progress"
    assert body["data"]["has_open_question"] is True
    assert body["data"]["latest_refined_policy_text"] == "Refined v2"


def test_get_clarification_state_resolved_has_no_open_question(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id="sim_001",
        clarification_status="resolved",
        clarification_turn_index=3,
        current_clarification_id=None,
        refined_policy_text="Resolved refined prompt",
    )

    response = client.get("/api/v1/simulations/sim_001/clarifications")
    assert response.status_code == 200

    body = response.json()
    assert body["data"]["clarification_status"] == "resolved"
    assert body["data"]["has_open_question"] is False
    assert body["data"]["latest_refined_policy_text"] == "Resolved refined prompt"


@pytest.mark.parametrize("status", ["pending", "running", "completed", "failed"])
def test_get_clarification_state_all_lifecycle_statuses(tmp_path: Path, status: str) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(
        db_path,
        simulation_id=f"sim_{status}",
        status=status,
        clarification_status="none",
        current_clarification_id=None,
        refined_policy_text=None,
        policy_text=f"Policy for {status}",
    )

    response = client.get(f"/api/v1/simulations/sim_{status}/clarifications")
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["simulation_id"] == f"sim_{status}"
    assert body["data"]["latest_refined_policy_text"] == f"Policy for {status}"


def test_get_clarification_state_not_found(tmp_path: Path) -> None:
    client, _ = _client_with_db(tmp_path)

    response = client.get("/api/v1/simulations/sim_missing/clarifications")
    assert response.status_code == 404

    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "NOT_FOUND"
    assert body["meta"]["request_id"].startswith("req_")
