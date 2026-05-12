from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from apps.server.app import create_app


def test_get_datasets_returns_contract_envelope(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    client = TestClient(create_app(db_path))

    response = client.get("/api/v1/datasets")
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {"data", "error", "meta"}
    assert body["error"] is None
    assert isinstance(body["data"], list)
    assert len(body["data"]) >= 2

    first = body["data"][0]
    assert first["id"] == "nemotron_usa"
    assert first["status"] == "active"
    assert "name" in first
    assert "description" in first

    assert any(item.get("status") == "coming_v2" for item in body["data"])
