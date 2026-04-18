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
    title: str,
    status: str,
    created_at: str,
    sample_size: int = 100,
    mean_approval: float | None = None,
    completed_at: str | None = None,
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
                title,
                "policy",
                "nemotron_usa",
                sample_size,
                None,
                status,
                created_at,
                completed_at,
                mean_approval,
                None,
            ),
        )


def test_list_simulations_default_pagination_and_meta(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)

    _insert_row(db_path, simulation_id="sim_001", title="A", status="pending", created_at="2026-01-01T00:00:00Z")
    _insert_row(db_path, simulation_id="sim_002", title="B", status="running", created_at="2026-01-02T00:00:00Z")
    _insert_row(
        db_path,
        simulation_id="sim_003",
        title="C",
        status="completed",
        created_at="2026-01-03T00:00:00Z",
        mean_approval=3.2,
        completed_at="2026-01-03T00:02:00Z",
    )

    response = client.get("/api/v1/simulations")
    assert response.status_code == 200

    body = response.json()
    assert set(body.keys()) == {"data", "error", "meta"}
    assert body["error"] is None
    assert body["meta"]["page"] == 1
    assert body["meta"]["limit"] == 20
    assert body["meta"]["total"] == 3
    assert body["meta"]["request_id"].startswith("req_")

    ids = [item["id"] for item in body["data"]]
    assert ids == ["sim_003", "sim_002", "sim_001"]


def test_list_simulations_pagination_slice(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)

    for idx in range(1, 6):
        _insert_row(
            db_path,
            simulation_id=f"sim_{idx:03d}",
            title=f"T{idx}",
            status="pending",
            created_at=f"2026-01-0{idx}T00:00:00Z",
        )

    response = client.get("/api/v1/simulations?page=2&limit=2&sort=created_at:asc")
    assert response.status_code == 200

    body = response.json()
    assert body["meta"]["total"] == 5
    assert body["meta"]["page"] == 2
    assert body["meta"]["limit"] == 2
    assert [item["id"] for item in body["data"]] == ["sim_003", "sim_004"]


def test_list_simulations_status_filter(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)

    _insert_row(db_path, simulation_id="sim_001", title="A", status="pending", created_at="2026-01-01T00:00:00Z")
    _insert_row(
        db_path,
        simulation_id="sim_002",
        title="B",
        status="completed",
        created_at="2026-01-02T00:00:00Z",
        mean_approval=2.8,
        completed_at="2026-01-02T00:02:00Z",
    )
    _insert_row(
        db_path,
        simulation_id="sim_003",
        title="C",
        status="completed",
        created_at="2026-01-03T00:00:00Z",
        mean_approval=3.1,
        completed_at="2026-01-03T00:02:00Z",
    )

    response = client.get("/api/v1/simulations?status=completed")
    assert response.status_code == 200

    body = response.json()
    assert body["meta"]["total"] == 2
    assert len(body["data"]) == 2
    assert all(item["status"] == "completed" for item in body["data"])


@pytest.mark.parametrize(
    "query",
    [
        "page=0",
        "page=abc",
        "limit=0",
        "limit=201",
        "status=archived",
        "sort=created_at",
        "sort=title:asc",
    ],
)
def test_list_simulations_query_validation_errors(tmp_path: Path, query: str) -> None:
    client, _ = _client_with_db(tmp_path)

    response = client.get(f"/api/v1/simulations?{query}")
    assert response.status_code == 400

    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_list_simulations_contract_shape_pending_values_are_null(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)

    _insert_row(db_path, simulation_id="sim_001", title="Pending", status="pending", created_at="2026-01-01T00:00:00Z")
    _insert_row(
        db_path,
        simulation_id="sim_002",
        title="Done",
        status="completed",
        created_at="2026-01-02T00:00:00Z",
        mean_approval=3.6,
        completed_at="2026-01-02T00:03:00Z",
    )

    response = client.get("/api/v1/simulations?sort=created_at:asc")
    assert response.status_code == 200

    body = response.json()
    pending_item = body["data"][0]
    completed_item = body["data"][1]

    assert "mean_approval" in pending_item
    assert "completed_at" in pending_item
    assert pending_item["mean_approval"] is None
    assert pending_item["completed_at"] is None

    assert completed_item["mean_approval"] == 3.6
    assert completed_item["completed_at"] == "2026-01-02T00:03:00Z"
