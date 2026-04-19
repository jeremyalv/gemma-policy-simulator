from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient

from apps.server import service as service_module
from apps.server.app import create_app


def _client_with_db(tmp_path: Path) -> tuple[TestClient, Path]:
    db_path = tmp_path / "sims.db"
    app = create_app(db_path=db_path)
    return TestClient(app), db_path


def _insert_row(db_path: Path, simulation_id: str) -> None:
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
                "Title",
                "policy",
                "nemotron_usa",
                100,
                None,
                "pending",
                "2026-01-01T00:00:00Z",
                None,
                None,
                None,
            ),
        )


def test_delete_simulation_success_removes_row(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, "sim_001")

    response = client.delete("/api/v1/simulations/sim_001")
    assert response.status_code == 200

    body = response.json()
    assert set(body.keys()) == {"data", "error", "meta"}
    assert body["error"] is None
    assert body["data"]["id"] == "sim_001"
    assert body["data"]["deleted"] is True
    assert body["meta"]["request_id"].startswith("req_")

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT id FROM simulations WHERE id = ?",
            ("sim_001",),
        ).fetchone()

    assert row is None


def test_delete_simulation_not_found_returns_404(tmp_path: Path) -> None:
    client, _ = _client_with_db(tmp_path)

    response = client.delete("/api/v1/simulations/sim_missing")
    assert response.status_code == 404

    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "NOT_FOUND"
    assert body["meta"]["request_id"].startswith("req_")


def test_delete_simulation_invokes_artifact_cleanup_hook(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    client, db_path = _client_with_db(tmp_path)
    _insert_row(db_path, "sim_001")
    observed_ids: list[str] = []

    def _spy_cleanup(simulation_id: str) -> None:
        observed_ids.append(simulation_id)

    monkeypatch.setattr(service_module, "cleanup_simulation_artifacts", _spy_cleanup)

    response = client.delete("/api/v1/simulations/sim_001")
    assert response.status_code == 200
    assert observed_ids == ["sim_001"]
