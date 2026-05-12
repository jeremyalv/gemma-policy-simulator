"""Nemotron USA dataset loading, filtering, and deterministic sampling."""

from __future__ import annotations

import csv
import hashlib
import json
import os
import random
from pathlib import Path
from typing import Any


DEFAULT_DATASET_PATH = "data/nemotron_usa"
DEFAULT_DATASET_VERSION = "unknown"
MAX_SQLITE_INT64 = (1 << 63) - 1


class DatasetLoadError(Exception):
    """Raised when dataset loading or normalization fails."""


def resolve_dataset_path() -> Path:
    configured = os.getenv("SIMS_DATASET_NEMOTRON_PATH", DEFAULT_DATASET_PATH).strip()
    return Path(configured)


def resolve_dataset_version() -> str:
    value = os.getenv("SIMS_DATASET_NEMOTRON_VERSION", DEFAULT_DATASET_VERSION).strip()
    return value or DEFAULT_DATASET_VERSION


def sampling_seed_for_simulation(simulation_id: str) -> int:
    digest = hashlib.sha256(simulation_id.encode("utf-8")).hexdigest()
    # Keep seed deterministic while staying within SQLite signed INTEGER bounds.
    return int(digest[:16], 16) % MAX_SQLITE_INT64


def _normalize_marital_status(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in {"never_married", "never married"}:
        return "never_married"
    if normalized in {"married", "currently married"}:
        return "married"
    if normalized in {"divorced", "widowed", "separated", "divorced_or_widowed"}:
        return "divorced_or_widowed"
    return normalized


def _coerce_required_str(raw: dict[str, Any], key: str) -> str:
    value = raw.get(key)
    if not isinstance(value, str) or not value.strip():
        raise DatasetLoadError(f"dataset row missing required string field: {key}")
    return value.strip()


def _coerce_required_int(raw: dict[str, Any], key: str) -> int:
    value = raw.get(key)
    if isinstance(value, bool):
        raise DatasetLoadError(f"dataset row has invalid int field: {key}")
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    raise DatasetLoadError(f"dataset row missing required int field: {key}")


def _normalize_row(raw: dict[str, Any], idx: int) -> dict[str, Any]:
    name = raw.get("name")
    if not isinstance(name, str) or not name.strip():
        name = f"Persona {idx + 1}"

    marital_status = _normalize_marital_status(_coerce_required_str(raw, "marital_status"))
    return {
        "persona_id": _coerce_required_str(raw, "uuid"),
        "name": name.strip(),
        "age": _coerce_required_int(raw, "age"),
        "sex": _coerce_required_str(raw, "sex").lower(),
        "marital_status": marital_status,
        "education_level": _coerce_required_str(raw, "education_level").lower(),
        "occupation": _coerce_required_str(raw, "occupation"),
        "city": _coerce_required_str(raw, "city"),
        "state": _coerce_required_str(raw, "state"),
    }


def _read_csv(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    return [_normalize_row(dict(row), idx) for idx, row in enumerate(rows)]


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for idx, line in enumerate(handle):
            raw = line.strip()
            if not raw:
                continue
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise DatasetLoadError(f"invalid JSONL row in dataset file: {path}") from exc
            if not isinstance(parsed, dict):
                raise DatasetLoadError("dataset JSONL row must be an object")
            rows.append(_normalize_row(parsed, idx))
    return rows


def _read_with_hf_datasets(dataset_path: str) -> list[dict[str, Any]]:
    try:
        from datasets import load_dataset  # type: ignore
    except Exception as exc:  # pragma: no cover - tested via behavior, not import details
        raise DatasetLoadError(
            "dataset requires Hugging Face datasets package; install with: pip install datasets pyarrow"
        ) from exc

    try:
        dataset = load_dataset(dataset_path, split="train")
    except Exception as exc:
        raise DatasetLoadError(f"failed to load dataset via Hugging Face datasets: {dataset_path}") from exc

    rows: list[dict[str, Any]] = []
    for idx, row in enumerate(dataset):  # type: ignore[assignment]
        if not isinstance(row, dict):
            raise DatasetLoadError("dataset row must be an object")
        rows.append(_normalize_row(dict(row), idx))
    return rows


def load_nemotron_usa_rows() -> tuple[list[dict[str, Any]], str]:
    dataset_path = resolve_dataset_path()
    if dataset_path.is_file():
        suffix = dataset_path.suffix.lower()
        if suffix == ".csv":
            return _read_csv(dataset_path), str(dataset_path)
        if suffix in {".jsonl", ".ndjson"}:
            return _read_jsonl(dataset_path), str(dataset_path)
        raise DatasetLoadError(f"unsupported dataset file format: {dataset_path}")

    if dataset_path.is_dir():
        csv_files = sorted(dataset_path.rglob("*.csv"))
        if csv_files:
            return _read_csv(csv_files[0]), str(csv_files[0])
        jsonl_files = sorted(dataset_path.rglob("*.jsonl")) + sorted(dataset_path.rglob("*.ndjson"))
        if jsonl_files:
            return _read_jsonl(jsonl_files[0]), str(jsonl_files[0])

    # Fallback to HF datasets loader (supports local dataset dirs and hub IDs if available).
    return _read_with_hf_datasets(str(dataset_path)), str(dataset_path)


def _coerce_str_list(value: Any) -> list[str] | None:
    if not isinstance(value, list):
        return None
    out = [item.strip() for item in value if isinstance(item, str) and item.strip()]
    return out or None


def _coerce_age_range(value: Any) -> tuple[int, int] | None:
    if not isinstance(value, list) or len(value) != 2:
        return None
    lo, hi = value
    if isinstance(lo, bool) or isinstance(hi, bool):
        return None
    if not isinstance(lo, int) or not isinstance(hi, int):
        return None
    if lo > hi:
        return None
    return lo, hi


def apply_filters(rows: list[dict[str, Any]], filters: dict[str, Any] | None) -> list[dict[str, Any]]:
    filters = filters or {}
    states = _coerce_str_list(filters.get("states"))
    sex = _coerce_str_list(filters.get("sex"))
    marital_status = _coerce_str_list(filters.get("marital_status"))
    education_level = _coerce_str_list(filters.get("education_level"))
    occupation = _coerce_str_list(filters.get("occupation"))
    age_range = _coerce_age_range(filters.get("age_range"))

    normalized_states = {item.upper() for item in states} if states else None
    normalized_sex = {item.lower() for item in sex} if sex else None
    normalized_marital = {_normalize_marital_status(item) for item in marital_status} if marital_status else None
    normalized_education = {item.lower() for item in education_level} if education_level else None
    normalized_occupation = {item.lower() for item in occupation} if occupation else None

    def _match(row: dict[str, Any]) -> bool:
        if normalized_states and str(row["state"]).upper() not in normalized_states:
            return False
        if normalized_sex and str(row["sex"]).lower() not in normalized_sex:
            return False
        if normalized_marital and _normalize_marital_status(str(row["marital_status"])) not in normalized_marital:
            return False
        if normalized_education and str(row["education_level"]).lower() not in normalized_education:
            return False
        if normalized_occupation and str(row["occupation"]).lower() not in normalized_occupation:
            return False
        if age_range is not None:
            lo, hi = age_range
            age = int(row["age"])
            if age < lo or age > hi:
                return False
        return True

    return [row for row in rows if _match(row)]


def sample_personas(
    *,
    simulation_id: str,
    count: int,
    filters: dict[str, Any] | None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if count < 1:
        return [], {
            "dataset_version": resolve_dataset_version(),
            "dataset_source": str(resolve_dataset_path()),
            "sampling_seed": sampling_seed_for_simulation(simulation_id),
            "available_count": 0,
        }

    all_rows, dataset_source = load_nemotron_usa_rows()
    filtered = apply_filters(all_rows, filters)
    seed = sampling_seed_for_simulation(simulation_id)

    if len(filtered) < count:
        raise DatasetLoadError(
            f"insufficient personas after filters: required={count}, available={len(filtered)}"
        )

    rng = random.Random(seed)
    selected = rng.sample(filtered, count)
    selected.sort(key=lambda row: str(row["persona_id"]))

    metadata = {
        "dataset_version": resolve_dataset_version(),
        "dataset_source": dataset_source,
        "sampling_seed": seed,
        "available_count": len(filtered),
    }
    return selected, metadata
