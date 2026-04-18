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


def test_create_simulation_success_persists_row(tmp_path: Path) -> None:
    client, db_path = _client_with_db(tmp_path)
    payload = {
        "title": "Carbon tax",
        "policy_text": "Policy text",
        "dataset": "nemotron_usa",
        "sample_size": 120,
        "filters": {
            "states": ["CA", "TX"],
            "age_range": [18, 65],
            "education_level": ["bachelors"],
        },
    }

    response = client.post("/api/v1/simulations", json=payload)
    assert response.status_code == 201

    body = response.json()
    assert set(body.keys()) == {"data", "error", "meta"}
    assert body["error"] is None
    assert body["data"]["status"] == "pending"
    assert body["data"]["dataset"] == "nemotron_usa"
    assert body["meta"]["request_id"].startswith("req_")
    assert body["data"]["id"].startswith("sim_")

    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "SELECT id, title, policy_text, dataset, sample_size, status, filters_json FROM simulations WHERE id = ?",
            (body["data"]["id"],),
        ).fetchone()

    assert row is not None
    assert row[1] == "Carbon tax"
    assert row[2] == "Policy text"
    assert row[3] == "nemotron_usa"
    assert row[4] == 120
    assert row[5] == "pending"
    assert row[6] is not None


def test_create_simulation_validation_error_sample_size(tmp_path: Path) -> None:
    client, _ = _client_with_db(tmp_path)

    response = client.post(
        "/api/v1/simulations",
        json={
            "title": "x",
            "policy_text": "y",
            "dataset": "nemotron_usa",
            "sample_size": 10,
        },
    )

    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_create_simulation_validation_error_missing_required_field(tmp_path: Path) -> None:
    client, _ = _client_with_db(tmp_path)

    response = client.post(
        "/api/v1/simulations",
        json={
            "title": "x",
            "dataset": "nemotron_usa",
            "sample_size": 100,
        },
    )

    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_create_simulation_unsupported_filter_error(tmp_path: Path) -> None:
    client, _ = _client_with_db(tmp_path)

    response = client.post(
        "/api/v1/simulations",
        json={
            "title": "x",
            "policy_text": "y",
            "dataset": "nemotron_usa",
            "sample_size": 100,
            "filters": {"income_brackets": ["low"]},
        },
    )

    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "UNSUPPORTED_FILTER"


def test_create_simulation_generates_distinct_ids(tmp_path: Path) -> None:
    client, _ = _client_with_db(tmp_path)
    payload = {
        "title": "x",
        "policy_text": "y",
        "dataset": "nemotron_usa",
        "sample_size": 100,
    }

    response_a = client.post("/api/v1/simulations", json=payload)
    response_b = client.post("/api/v1/simulations", json=payload)

    assert response_a.status_code == 201
    assert response_b.status_code == 201
    assert response_a.json()["data"]["id"] != response_b.json()["data"]["id"]
