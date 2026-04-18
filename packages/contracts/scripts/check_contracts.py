#!/usr/bin/env python3
"""Validate OpenAPI contract shape and generated Python type consistency."""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[3]
OPENAPI_PATH = ROOT / "packages/contracts/openapi/v1.json"
GEN_SCRIPT = ROOT / "packages/contracts/scripts/generate_python_types.py"

REQUIRED_PATH_METHODS = {
    "/simulations": {"post", "get"},
    "/simulations/{id}": {"delete"},
    "/simulations/{id}/run": {"post"},
    "/simulations/{id}/status": {"get"},
    "/simulations/{id}/results": {"get"},
    "/simulations/{id}/clarifications/generate": {"post"},
    "/clarifications/{clarification_id}/answer": {"post"},
    "/simulations/{id}/clarifications": {"get"},
    "/simulations/{id}/challenge": {"post"},
    "/challenges/{challenge_id}/followup": {"post"},
    "/datasets": {"get"},
    "/simulations/{id}/export": {"get"},
}

REQUIRED_SCHEMAS = {
    "CreateSimulationRequest",
    "RunSimulationRequest",
    "SimulationStatus",
    "RuntimeProfile",
    "ErrorObject",
    "ErrorEnvelope",
    "FilterSet",
    "ClarificationStatus",
    "CreateSimulationEnvelope",
    "SimulationResultsEnvelope",
    "DatasetsEnvelope",
}

SEMANTIC_KEYWORDS = {
    "UNSUPPORTED_FILTER",
    "non-blocking",
    "use_refined_prompt=true",
    "refined_policy_text",
}


def fail(message: str) -> None:
    print(f"[contracts] {message}")
    raise SystemExit(1)


def validate_structure(spec: dict[str, Any]) -> None:
    if not str(spec.get("openapi", "")).startswith("3."):
        fail("openapi version must be 3.x")

    info = spec.get("info", {})
    if not info.get("title") or not info.get("version"):
        fail("info.title and info.version are required")

    paths = spec.get("paths")
    if not isinstance(paths, dict):
        fail("paths must be an object")

    for path, required_methods in REQUIRED_PATH_METHODS.items():
        methods = set(paths.get(path, {}).keys())
        missing = required_methods - methods
        if missing:
            fail(f"missing method(s) {sorted(missing)} for path {path}")

    schemas = spec.get("components", {}).get("schemas", {})
    if not isinstance(schemas, dict):
        fail("components.schemas must be an object")

    missing_schemas = REQUIRED_SCHEMAS - set(schemas.keys())
    if missing_schemas:
        fail(f"missing required schemas: {sorted(missing_schemas)}")

    serialized = json.dumps(spec, sort_keys=True)
    for keyword in SEMANTIC_KEYWORDS:
        if keyword not in serialized:
            fail(f"missing expected semantic marker: {keyword}")


def run_generator_check() -> None:
    result = subprocess.run(
        [sys.executable, str(GEN_SCRIPT), "--check"],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )
    if result.stdout:
        print(result.stdout.strip())
    if result.stderr:
        print(result.stderr.strip())
    if result.returncode != 0:
        fail("generated Python contracts are stale; run generator")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()

    try:
        spec = json.loads(OPENAPI_PATH.read_text())
    except FileNotFoundError:
        fail(f"missing OpenAPI file: {OPENAPI_PATH}")
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON in {OPENAPI_PATH}: {exc}")

    validate_structure(spec)
    run_generator_check()
    print("[contracts] openapi structure and generated types check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
