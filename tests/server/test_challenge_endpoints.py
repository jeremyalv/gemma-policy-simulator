from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from fastapi.testclient import TestClient

from apps.server.app import create_app
from apps.server.service import run_artifact_path
from apps.server.storage import SimulationStore


def _insert_simulation(db_path: Path, *, simulation_id: str, status: str) -> None:
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
                "Challenge test",
                "Policy text",
                "nemotron_usa",
                20,
                status,
                "2026-01-01T00:00:00Z",
                "2026-01-01T00:01:00Z" if status == "completed" else None,
                3.0 if status == "completed" else None,
                None,
                "balanced",
                20,
                0,
                0,
                "none",
                0,
            ),
        )


def _write_completed_artifact(simulation_id: str) -> None:
    run_artifact_path(simulation_id).write_text(
        json.dumps(
            {
                "simulation_id": simulation_id,
                "model": "gemma4:e2b",
                "output_count": 3,
                "raw_outputs": [
                    {
                        "persona": {
                            "persona_id": "p_1",
                            "name": "A",
                            "age": 25,
                            "marital_status": "never_married",
                            "occupation": "Teacher",
                            "city": "Austin",
                            "state": "TX",
                        },
                        "response": {"approval": 2, "emotion": "Concern", "rationale": "r1"},
                    },
                    {
                        "persona": {
                            "persona_id": "p_2",
                            "name": "B",
                            "age": 62,
                            "marital_status": "married",
                            "occupation": "Nurse",
                            "city": "LA",
                            "state": "CA",
                        },
                        "response": {"approval": 4, "emotion": "neutral", "rationale": "r2"},
                    },
                    {
                        "persona": {
                            "persona_id": "p_3",
                            "name": "C",
                            "age": 40,
                            "marital_status": "married",
                            "occupation": "Engineer",
                            "city": "Miami",
                            "state": "FL",
                        },
                        "response": {"approval": 3, "emotion": "Neutral", "rationale": "r3"},
                    },
                ],
                "run_telemetry": {
                    "retry_count": 0,
                    "invalid_output_count": 0,
                    "failure_code": None,
                    "failure_message": None,
                    "failed_persona_id": None,
                },
            }
        ),
        encoding="utf-8",
    )


def test_generate_challenge_completed_returns_challenge_payload(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_simulation(db_path, simulation_id="sim_ch_ok", status="completed")
    _write_completed_artifact("sim_ch_ok")
    client = TestClient(create_app(db_path))

    response = client.post("/api/v1/simulations/sim_ch_ok/challenge", json={"focus": "emotion_bias"})
    assert response.status_code == 200
    body = response.json()
    assert body["error"] is None
    assert body["data"]["challenge_id"].startswith("ch_")
    assert isinstance(body["data"]["challenge_text"], str)
    assert set(body["data"]["evidence"].keys()) == {"segment", "mean_approval", "top_concern"}


def test_generate_challenge_missing_simulation_returns_404(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    client = TestClient(create_app(db_path))

    response = client.post("/api/v1/simulations/sim_missing/challenge", json={"focus": "weak_segment"})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_generate_challenge_non_completed_returns_409(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_simulation(db_path, simulation_id="sim_ch_pending", status="pending")
    client = TestClient(create_app(db_path))

    response = client.post("/api/v1/simulations/sim_ch_pending/challenge", json={"focus": "weak_segment"})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "LIFECYCLE_CONFLICT"


def test_generate_challenge_bad_payload_returns_400(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_simulation(db_path, simulation_id="sim_ch_completed", status="completed")
    _write_completed_artifact("sim_ch_completed")
    client = TestClient(create_app(db_path))

    response = client.post("/api/v1/simulations/sim_ch_completed/challenge", json={})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_followup_valid_flow_returns_payload(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_simulation(db_path, simulation_id="sim_followup_ok", status="completed")
    _write_completed_artifact("sim_followup_ok")
    client = TestClient(create_app(db_path))

    challenge_resp = client.post("/api/v1/simulations/sim_followup_ok/challenge", json={"focus": "weak_segment"})
    challenge_id = challenge_resp.json()["data"]["challenge_id"]

    followup = client.post(
        f"/api/v1/challenges/{challenge_id}/followup",
        json={"simulation_id": "sim_followup_ok", "user_response": "Here is my policy response with evidence and data"},
    )
    assert followup.status_code == 200
    body = followup.json()
    assert body["error"] is None
    assert isinstance(body["data"]["followup_text"], str)
    assert isinstance(body["data"]["suggested_policy_refinement"], str)
    assert body["data"]["next_challenge_id"].startswith("ch_")


def test_followup_unknown_challenge_returns_404(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    client = TestClient(create_app(db_path))

    response = client.post(
        "/api/v1/challenges/ch_missing/followup",
        json={"simulation_id": "sim_x", "user_response": "Test"},
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_followup_simulation_mismatch_returns_400(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_simulation(db_path, simulation_id="sim_followup_mismatch", status="completed")
    _write_completed_artifact("sim_followup_mismatch")
    client = TestClient(create_app(db_path))

    challenge_resp = client.post(
        "/api/v1/simulations/sim_followup_mismatch/challenge",
        json={"focus": "weak_segment"},
    )
    challenge_id = challenge_resp.json()["data"]["challenge_id"]

    response = client.post(
        f"/api/v1/challenges/{challenge_id}/followup",
        json={"simulation_id": "sim_other", "user_response": "Test"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
