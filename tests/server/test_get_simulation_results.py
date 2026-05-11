from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from apps.server.app import create_app
from apps.server.service import run_artifact_path
from apps.server.storage import SimulationStore


def _insert_row(
    db_path: Path,
    *,
    simulation_id: str,
    status: str,
    sample_size: int = 5,
    runtime_profile: str | None = "balanced",
    effective_sample_size: int | None = 5,
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
                "Result test",
                "Policy text",
                "nemotron_usa",
                sample_size,
                status,
                "2026-01-01T00:00:00Z",
                "2026-01-01T00:01:00Z" if status == "completed" else None,
                3.0 if status == "completed" else None,
                None,
                runtime_profile,
                effective_sample_size,
                0,
                0,
                "none",
                0,
            ),
        )


def _write_artifact(simulation_id: str, payload: dict[str, object]) -> None:
    run_artifact_path(simulation_id).write_text(json.dumps(payload), encoding="utf-8")


def test_get_simulation_results_completed_aggregates_real_outputs(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_row(db_path, simulation_id="sim_results_ok", status="completed")

    _write_artifact(
        "sim_results_ok",
        {
            "simulation_id": "sim_results_ok",
            "model": "gemma",
            "output_count": 5,
            "raw_outputs": [
                {
                    "persona": {
                        "persona_id": "p_003",
                        "name": "Cara",
                        "age": 60,
                        "marital_status": "married",
                        "occupation": "Engineer",
                        "city": "Austin",
                        "state": "TX",
                    },
                    "response": {
                        "approval": 3,
                        "emotion": "concern",
                        "rationale": "Needs better details.",
                    },
                },
                {
                    "persona": {
                        "persona_id": "p_001",
                        "name": "Alice",
                        "age": 22,
                        "marital_status": "never_married",
                        "occupation": "Nurse",
                        "city": "Los Angeles",
                        "state": "CA",
                    },
                    "response": {
                        "approval": 1,
                        "emotion": "concern",
                        "rationale": "Too expensive for me.",
                        "behavior_change": True,
                    },
                },
                {
                    "persona": {
                        "persona_id": "p_005",
                        "name": "Evan",
                        "age": 55,
                        "marital_status": "married",
                        "occupation": "Driver",
                        "city": "Miami",
                        "state": "FL",
                    },
                    "response": {
                        "approval": 5,
                        "emotion": "anger",
                        "rationale": "I can accept this with safeguards.",
                    },
                },
                {
                    "persona": {
                        "persona_id": "p_004",
                        "name": "Dina",
                        "age": 31,
                        "marital_status": "divorced_or_widowed",
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
                        "persona_id": "p_002",
                        "name": "Bob",
                        "age": 40,
                        "marital_status": "never_married",
                        "occupation": "Teacher",
                        "city": "San Diego",
                        "state": "CA",
                    },
                    "response": {
                        "approval": 2,
                        "emotion": "hope",
                        "rationale": "Unclear implementation path.",
                        "behavior_change": False,
                    },
                },
            ],
            "run_telemetry": {
                "retry_count": 0,
                "invalid_output_count": 0,
                "failure_code": None,
                "failure_message": None,
                "failed_persona_id": None,
            },
        },
    )

    client = TestClient(create_app(db_path))
    response = client.get("/api/v1/simulations/sim_results_ok/results")
    assert response.status_code == 200
    body = response.json()

    assert set(body.keys()) == {"data", "error", "meta"}
    assert body["error"] is None

    data = body["data"]
    assert set(data.keys()) == {
        "id",
        "summary",
        "run_config",
        "demographic_breakdown",
        "emotion_profile",
        "representative_quotes",
        "raw_responses_url",
    }
    assert data["id"] == "sim_results_ok"

    assert data["summary"]["mean_approval"] == 3.0
    assert data["summary"]["approval_distribution"] == {"1": 1, "2": 1, "3": 1, "4": 1, "5": 1}
    assert data["summary"]["dominant_emotion"] == "concern"
    assert data["summary"]["behavioral_change_pct"] == 40.0

    assert data["run_config"] == {
        "runtime_profile": "balanced",
        "effective_sample_size": 5,
    }

    breakdown = data["demographic_breakdown"]
    assert breakdown["by_age_group"] == {
        "18-34": {"mean_approval": 2.5, "count": 2},
        "35-54": {"mean_approval": 2.0, "count": 1},
        "55+": {"mean_approval": 4.0, "count": 2},
    }
    assert breakdown["by_marital_status"] == {
        "divorced_or_widowed": {"mean_approval": 4.0, "count": 1},
        "married": {"mean_approval": 4.0, "count": 2},
        "never_married": {"mean_approval": 1.5, "count": 2},
    }
    assert breakdown["by_state"] == {
        "CA": 1.5,
        "FL": 5.0,
        "TX": 3.5,
    }
    assert breakdown["by_occupation_group"] == {
        "Driver": {"mean_approval": 5.0, "count": 1},
        "Engineer": {"mean_approval": 3.0, "count": 1},
        "Nurse": {"mean_approval": 1.0, "count": 1},
        "Teacher": {"mean_approval": 3.0, "count": 2},
    }

    assert data["emotion_profile"] == {
        "anger": 20.0,
        "concern": 40.0,
        "hope": 40.0,
    }

    quotes = data["representative_quotes"]
    assert len(quotes) == 5
    assert [q["persona_id"] for q in quotes] == ["p_001", "p_002", "p_003", "p_004", "p_005"]
    assert data["raw_responses_url"] == "/api/v1/simulations/sim_results_ok/export"


def test_get_simulation_results_quotes_are_deterministic(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_row(db_path, simulation_id="sim_results_det", status="completed")

    _write_artifact(
        "sim_results_det",
        {
            "simulation_id": "sim_results_det",
            "model": "gemma",
            "output_count": 2,
            "raw_outputs": [
                {
                    "persona": {
                        "persona_id": "p_b",
                        "name": "Bravo",
                        "age": 36,
                        "marital_status": "married",
                        "occupation": "Teacher",
                        "city": "Austin",
                        "state": "TX",
                    },
                    "response": {"approval": 4, "emotion": "hope", "rationale": "Reason B"},
                },
                {
                    "persona": {
                        "persona_id": "p_a",
                        "name": "Alpha",
                        "age": 28,
                        "marital_status": "never_married",
                        "occupation": "Nurse",
                        "city": "LA",
                        "state": "CA",
                    },
                    "response": {"approval": 2, "emotion": "concern", "rationale": "Reason A"},
                },
            ],
            "run_telemetry": {
                "retry_count": 0,
                "invalid_output_count": 0,
                "failure_code": None,
                "failure_message": None,
                "failed_persona_id": None,
            },
        },
    )

    client = TestClient(create_app(db_path))
    first = client.get("/api/v1/simulations/sim_results_det/results")
    second = client.get("/api/v1/simulations/sim_results_det/results")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["data"]["representative_quotes"] == second.json()["data"]["representative_quotes"]
    assert [q["persona_id"] for q in first.json()["data"]["representative_quotes"]] == ["p_a", "p_b"]


@pytest.mark.parametrize("status", ["pending", "running"])
def test_get_simulation_results_pending_or_running_conflict(tmp_path: Path, status: str) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_row(db_path, simulation_id=f"sim_{status}", status=status)
    client = TestClient(create_app(db_path))

    response = client.get(f"/api/v1/simulations/sim_{status}/results")
    assert response.status_code == 409
    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "SIMULATION_NOT_COMPLETE"


def test_get_simulation_results_failed_conflict(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    _insert_row(db_path, simulation_id="sim_failed", status="failed")
    client = TestClient(create_app(db_path))

    response = client.get("/api/v1/simulations/sim_failed/results")
    assert response.status_code == 409
    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "SIMULATION_FAILED"


def test_get_simulation_results_not_found(tmp_path: Path) -> None:
    db_path = tmp_path / "sims.db"
    store = SimulationStore(db_path)
    store.ensure_schema()
    client = TestClient(create_app(db_path))

    response = client.get("/api/v1/simulations/sim_missing/results")
    assert response.status_code == 404
    body = response.json()
    assert body["data"] is None
    assert body["error"]["code"] == "NOT_FOUND"
