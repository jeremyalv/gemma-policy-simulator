from __future__ import annotations

from pathlib import Path

import pytest

from src.persona_engine.nemotron_usa import MAX_SQLITE_INT64, sample_personas, sampling_seed_for_simulation


def _write_dataset(path: Path) -> None:
    path.write_text(
        "\n".join(
            [
                "uuid,name,age,sex,marital_status,education_level,occupation,city,state",
                "u1,Alice,30,female,married,bachelors,Teacher,Austin,TX",
                "u2,Bob,42,male,never_married,high_school,Driver,Houston,TX",
                "u3,Cara,55,female,divorced,masters,Nurse,Miami,FL",
                "u4,Dan,28,male,married,bachelors,Engineer,Seattle,WA",
            ]
        ),
        encoding="utf-8",
    )


def test_sample_personas_is_deterministic(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    dataset_file = tmp_path / "nemotron.csv"
    _write_dataset(dataset_file)
    monkeypatch.setenv("SIMS_DATASET_NEMOTRON_PATH", str(dataset_file))
    monkeypatch.setenv("SIMS_DATASET_NEMOTRON_VERSION", "v1.1")

    sample_a, meta_a = sample_personas(simulation_id="sim_det", count=2, filters=None)
    sample_b, meta_b = sample_personas(simulation_id="sim_det", count=2, filters=None)

    assert [row["persona_id"] for row in sample_a] == [row["persona_id"] for row in sample_b]
    assert meta_a["dataset_version"] == "v1.1"
    assert meta_a["sampling_seed"] == meta_b["sampling_seed"]


def test_sample_personas_applies_filters(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    dataset_file = tmp_path / "nemotron.csv"
    _write_dataset(dataset_file)
    monkeypatch.setenv("SIMS_DATASET_NEMOTRON_PATH", str(dataset_file))

    sample_rows, meta = sample_personas(
        simulation_id="sim_filter",
        count=1,
        filters={
            "states": ["FL"],
            "sex": ["female"],
            "occupation": ["Nurse"],
            "age_range": [50, 60],
        },
    )

    assert len(sample_rows) == 1
    assert sample_rows[0]["state"] == "FL"
    assert sample_rows[0]["occupation"] == "Nurse"
    assert meta["available_count"] == 1


def test_sampling_seed_fits_sqlite_signed_int() -> None:
    seed = sampling_seed_for_simulation("sim_9845da2a")
    assert 0 <= seed <= MAX_SQLITE_INT64
