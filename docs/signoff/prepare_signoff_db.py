"""
Prepare a sign-off database with a completed simulation for evidence capture.

Usage:
    python docs/signoff/prepare_signoff_db.py

Creates apps/server/data/signoff.db with:
  - sim_co2tax: completed climate carbon-tax simulation
  - sim_ubitest: completed UBI pilot simulation
  - sim_housing: completed housing voucher simulation
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from apps.server.storage import SimulationStore
from apps.server.service import run_artifact_path

DB_PATH = ROOT / "apps" / "server" / "data" / "signoff.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# ── Reusable raw output fixture ───────────────────────────────────────────────
_STATES     = ["CA", "TX", "FL", "NY", "WA", "IL", "PA", "OH"]
_CITIES     = {"CA": "Los Angeles", "TX": "Austin", "FL": "Miami", "NY": "New York",
               "WA": "Seattle", "IL": "Chicago", "PA": "Philadelphia", "OH": "Columbus"}
_AGES       = [22, 28, 35, 42, 55, 61, 30, 47]
_OCCUPATIONS = ["Nurse", "Teacher", "Engineer", "Retail Worker", "Driver", "Clerk", "Manager", "Writer"]
_NAMES      = ["Maria Santos", "James Johnson", "Ava Miller", "Noah Williams",
               "Liam Brown", "Sophia Martinez", "Mia Davis", "Lucas Taylor"]
_EMOTIONS   = ["curiosity", "support", "skepticism", "concern", "enthusiasm"]
_BEHAVIORS  = ["write_representative", "donate", "protest", "vote_support", "unchanged"]
_RATIONALES = [
    "This policy addresses economic pressures I've experienced directly and I believe it will help.",
    "I have concerns about the funding mechanism — tax increases typically hurt small businesses.",
    "The rebate structure seems well designed to protect lower-income households like mine.",
    "Implementation details are unclear. I'd want to see pilot data before full rollout.",
    "My community has long needed this type of investment. This proposal is a step forward.",
    "The cost-benefit analysis appears optimistic. Real-world outcomes tend to be messier.",
    "Positive in principle but the timeline is too aggressive for meaningful adoption.",
    "This aligns with values I hold around fairness and community investment.",
]

def _make_raw_outputs(sim_id: str, n: int = 30) -> list[dict]:
    import random
    rng = random.Random(sim_id)  # deterministic per sim
    outputs = []
    for i in range(n):
        state = rng.choice(_STATES)
        approval = rng.randint(1, 5)
        outputs.append({
            "persona": {
                "persona_id":       f"p_{i+1:05d}",
                "name":             _NAMES[i % len(_NAMES)],
                "age":              _AGES[i % len(_AGES)],
                "sex":              rng.choice(["female", "male"]),
                "marital_status":   rng.choice(["married", "never_married", "divorced_or_widowed"]),
                "education_level":  rng.choice(["high_school", "bachelors", "masters"]),
                "occupation":       _OCCUPATIONS[i % len(_OCCUPATIONS)],
                "city":             _CITIES[state],
                "state":            state,
            },
            "response": {
                "approval":          approval,
                "emotion":           rng.choice(_EMOTIONS),
                "behavioral_change": rng.choice(_BEHAVIORS),
                "rationale":         _RATIONALES[i % len(_RATIONALES)],
            },
        })
    return outputs


# ── Per-simulation definitions ────────────────────────────────────────────────
SIMS = [
    {
        "id":          "sim_co2tax",
        "title":       "Climate Carbon Tax Policy",
        "policy_text": "Introduce a $50/tonne carbon tax on industrial emitters with rebates for low-income households. Revenue funds renewable energy transition grants.",
        "profile":     "balanced",
        "sample_size": 30,
    },
    {
        "id":          "sim_ubitest",
        "title":       "Universal Basic Income Pilot",
        "policy_text": "Monthly $800 unconditional stipend for adults earning under $40k annually, funded by a 2% wealth tax on assets over $1M.",
        "profile":     "interactive",
        "sample_size": 30,
    },
    {
        "id":          "sim_housing",
        "title":       "Affordable Housing Voucher Expansion",
        "policy_text": "Expand Section 8 housing vouchers by 400k units, funded by a 0.5% increase in property taxes on commercial real estate above $5M valuation.",
        "profile":     "thorough",
        "sample_size": 30,
    },
]


def _create_schema(conn: sqlite3.Connection) -> None:
    store = SimulationStore.__new__(SimulationStore)
    store.db_path = DB_PATH
    store.ensure_schema()


def setup_db() -> None:
    store = SimulationStore(DB_PATH)
    store.ensure_schema()  # create tables before inserts

    for sim in SIMS:
        sim_id = sim["id"]

        with sqlite3.connect(DB_PATH) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO simulations (
                    id, title, policy_text, dataset, sample_size,
                    status, created_at, completed_at, mean_approval,
                    effective_sample_size, runtime_profile,
                    run_retry_count, run_invalid_output_count,
                    run_failure_code, run_failure_message, run_failed_persona_id,
                    run_attempted_count, run_success_count, run_failed_count,
                    run_success_rate, run_is_partial, run_failure_breakdown_json,
                    run_prompt_source, run_dataset_version, run_sampling_seed
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    sim_id,
                    sim["title"],
                    sim["policy_text"],
                    "nemotron_usa",
                    sim["sample_size"],
                    "completed",
                    "2026-05-13T10:00:00Z",
                    "2026-05-13T10:02:30Z",
                    3.4,
                    sim["sample_size"],
                    sim["profile"],
                    # telemetry fields
                    0,        # run_retry_count
                    0,        # run_invalid_output_count
                    None,     # run_failure_code
                    None,     # run_failure_message
                    None,     # run_failed_persona_id
                    sim["sample_size"],  # run_attempted_count
                    sim["sample_size"],  # run_success_count
                    0,        # run_failed_count
                    1.0,      # run_success_rate
                    0,        # run_is_partial (False)
                    "{}",     # run_failure_breakdown_json
                    "policy_text",
                    "nemotron_usa-v1",
                    12345,
                ),
            )

        # Write run artifact so results/export work
        artifacts_dir = DB_PATH.parent / "artifacts"
        artifact_path = run_artifact_path(sim_id, base_dir=artifacts_dir)
        artifact_path.parent.mkdir(parents=True, exist_ok=True)
        raw_outputs = _make_raw_outputs(sim_id, n=sim["sample_size"])
        artifact_path.write_text(
            json.dumps({
                "raw_outputs": raw_outputs,
                "run_telemetry": {
                    "retry_count": 0, "invalid_output_count": 0,
                    "failure_code": None, "failure_message": None,
                    "failed_persona_id": None,
                    "attempted_count": sim["sample_size"],
                    "success_count": sim["sample_size"],
                    "failed_count": 0, "success_rate": 1.0,
                    "is_partial": False, "failure_breakdown": {},
                },
            }),
            encoding="utf-8",
        )

        print(f"  [ok] {sim_id}: {sim['title']} ({sim['profile']} profile, {sim['sample_size']} personas)")

    print(f"\nDB ready at: {DB_PATH}")
    print("Start backend with:")
    print(f"  SIMS_DB_PATH={DB_PATH} python -m uvicorn apps.server.app:app --port 8000")


if __name__ == "__main__":
    print("Preparing sign-off database...")
    setup_db()
