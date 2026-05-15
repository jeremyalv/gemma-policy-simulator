"""Service logic for simulation draft creation."""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
import threading
from collections import Counter
from csv import DictWriter
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Any, cast
from uuid import uuid4

from packages.contracts.python.contracts_v1 import (
    ChallengeEnvelope,
    ChallengeFollowupEnvelope,
    ChallengeFollowupRequest,
    ClarificationAnswerEnvelope,
    ClarificationAnswerRequest,
    ClarificationQuestionEnvelope,
    ClarificationStateEnvelope,
    CreateSimulationEnvelope,
    CreateSimulationRequest,
    DatasetsEnvelope,
    DeleteSimulationEnvelope,
    GenerateChallengeRequest,
    GenerateClarificationRequest,
    RunAcceptedEnvelope,
    RunSimulationRequest,
    SimulationResultsEnvelope,
    SimulationStatusEnvelope,
    SimulationDraft,
    SimulationListEnvelope,
    SimulationListItem,
)

from .clarification_generator import (
    ClarificationGenerationError,
    generate_clarification_answer_with_gemma,
    generate_clarification_with_gemma,
)
from .errors import ApiError
from .results_aggregator import aggregate_results_payload
from .simulation_runner import (
    SimulationRunError,
    build_policy_prompt,
    generate_policy_response_with_ollama,
    prompt_template_version,
    resolve_batch_size,
    resolve_max_retries,
    resolve_run_model,
)
from .storage import SimulationStore
from src.persona_engine.nemotron_usa import DatasetLoadError, sample_personas

MAX_CLARIFICATION_TURNS = 3
ALLOWED_RUNTIME_PROFILES = {"interactive", "balanced", "thorough", "auto"}
PARTIAL_SUCCESS_THRESHOLD = 0.9

# Strict format for IDs used in URL paths. Anything else is rejected up front so
# user-controlled simulation_id strings can never be concatenated into file
# paths (artifact path traversal) or response headers (CRLF injection).
# Allows alphanumeric + _ - so test fixtures like "sim_001" and production
# "sim_8c97b8f8" both pass, but path-traversal payloads like "../" do not.
_SIM_ID_RE = re.compile(r"^sim_[A-Za-z0-9_-]{1,32}$")
_CLARIFICATION_ID_RE = re.compile(r"^cl_[A-Za-z0-9_-]{1,32}$")
_CHALLENGE_ID_RE = re.compile(r"^ch_[A-Za-z0-9_-]{1,32}$")


def _validate_id_format(value: str, pattern: re.Pattern[str], kind: str) -> str:
    if not isinstance(value, str) or not pattern.match(value):
        raise ApiError(
            code="NOT_FOUND",
            message=f"{kind} not found: {value!r}",
            status_code=404,
        )
    return value


# Characters that trigger formula evaluation when a CSV is opened in Excel/Sheets.
# Persona fields (rationale, emotion, name, etc.) flow from attacker-influenced
# Ollama output; prefixing with ' neutralises the formula without altering the
# visible text.
_CSV_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _csv_safe(value: Any) -> str:
    s = "" if value is None else str(value)
    if s and s[0] in _CSV_FORMULA_PREFIXES:
        return "'" + s
    return s


def new_simulation_id() -> str:
    return f"sim_{uuid4().hex[:8]}"


def new_request_id() -> str:
    return f"req_{uuid4().hex[:8]}"


def new_clarification_id() -> str:
    return f"cl_{uuid4().hex[:8]}"

def new_challenge_id() -> str:
    return f"ch_{uuid4().hex[:8]}"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _estimate_seconds(effective_sample_size: int, runtime_profile: str) -> int:
    # Deterministic baseline heuristic for run acceptance metadata.
    multiplier_by_profile = {
        "interactive": 0.25,
        "balanced": 0.42,
        "thorough": 0.7,
        "auto": 0.5,
    }
    multiplier = multiplier_by_profile.get(runtime_profile, 0.5)
    return max(5, int(round(effective_sample_size * multiplier)))


def _parse_utc_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _elapsed_seconds_from_started_at(started_at: Any) -> int:
    started_at_dt = _parse_utc_timestamp(started_at)
    if started_at_dt is None:
        return 0
    elapsed = (_utc_now() - started_at_dt).total_seconds()
    return max(0, int(elapsed))


def _resolve_runtime_profile(simulation: dict[str, Any]) -> str:
    runtime_profile = simulation.get("runtime_profile")
    if isinstance(runtime_profile, str) and runtime_profile in ALLOWED_RUNTIME_PROFILES:
        return runtime_profile
    return "auto"


def _resolve_agents_total(simulation: dict[str, Any]) -> int:
    effective_sample_size = simulation.get("effective_sample_size")
    if isinstance(effective_sample_size, int) and effective_sample_size > 0:
        return effective_sample_size

    sample_size = simulation.get("sample_size")
    if isinstance(sample_size, int) and sample_size > 0:
        return sample_size
    return 0


def _resolve_estimated_seconds(simulation: dict[str, Any], *, agents_total: int, runtime_profile: str) -> int:
    estimated_seconds = simulation.get("estimated_seconds")
    if isinstance(estimated_seconds, int) and estimated_seconds > 0:
        return estimated_seconds
    baseline_agents_total = max(agents_total, 1)
    return _estimate_seconds(baseline_agents_total, runtime_profile)


def _derive_progress_snapshot(
    *,
    status: str,
    agents_total: int,
    elapsed_seconds: int,
    estimated_seconds: int,
    has_timing: bool,
    attempted_count: int,
) -> tuple[int, float, int]:
    if status == "pending":
        return 0, 0.0, 0

    if status == "completed":
        return agents_total, 100.0, 0

    if status == "running":
        if agents_total > 0 and attempted_count > 0:
            progress_pct = min(99.9, max(0.0, (attempted_count / agents_total) * 100.0))
            agents_completed = min(agents_total, attempted_count)
            estimated_seconds_remaining = max(0, estimated_seconds - elapsed_seconds)
            return agents_completed, float(progress_pct), estimated_seconds_remaining

        raw_progress = (elapsed_seconds / estimated_seconds) * 100 if estimated_seconds > 0 else 0.0
        progress_pct = min(99.9, max(0.0, raw_progress))
        agents_completed = min(agents_total, math.floor((agents_total * progress_pct) / 100))
        estimated_seconds_remaining = max(0, estimated_seconds - elapsed_seconds)
        return agents_completed, float(progress_pct), estimated_seconds_remaining

    # Failed is terminal for remaining-time, but can expose partial progress when timing exists.
    if has_timing:
        raw_progress = (elapsed_seconds / estimated_seconds) * 100 if estimated_seconds > 0 else 0.0
        progress_pct = min(99.9, max(0.0, raw_progress))
        agents_completed = min(agents_total, math.floor((agents_total * progress_pct) / 100))
        return agents_completed, float(progress_pct), 0

    return 0, 0.0, 0


def _normalize_retry_error(exc: Exception) -> SimulationRunError:
    if isinstance(exc, SimulationRunError):
        return exc
    return SimulationRunError(
        "unexpected model runtime error",
        code="RUNTIME_ERROR",
        retryable=True,
        invalid_output=False,
    )


def _status_run_telemetry(simulation: dict[str, Any]) -> dict[str, Any]:
    retry_count = simulation.get("run_retry_count")
    invalid_output_count = simulation.get("run_invalid_output_count")
    failure_code = simulation.get("run_failure_code")
    failure_message = simulation.get("run_failure_message")
    failed_persona_id = simulation.get("run_failed_persona_id")
    attempted_count = simulation.get("run_attempted_count")
    success_count = simulation.get("run_success_count")
    failed_count = simulation.get("run_failed_count")
    success_rate = simulation.get("run_success_rate")
    is_partial = simulation.get("run_is_partial")
    failure_breakdown_json = simulation.get("run_failure_breakdown_json")
    failure_breakdown: dict[str, int] = {}
    if isinstance(failure_breakdown_json, str) and failure_breakdown_json.strip():
        try:
            parsed = json.loads(failure_breakdown_json)
        except json.JSONDecodeError:
            parsed = {}
        if isinstance(parsed, dict):
            for key, value in parsed.items():
                if isinstance(key, str) and isinstance(value, int) and value >= 0:
                    failure_breakdown[key] = value
    return {
        "retry_count": int(retry_count) if isinstance(retry_count, int) and retry_count >= 0 else 0,
        "invalid_output_count": int(invalid_output_count) if isinstance(invalid_output_count, int) and invalid_output_count >= 0 else 0,
        "failure_code": failure_code if isinstance(failure_code, str) and failure_code else None,
        "failure_message": failure_message if isinstance(failure_message, str) and failure_message else None,
        "failed_persona_id": failed_persona_id if isinstance(failed_persona_id, str) and failed_persona_id else None,
        "attempted_count": int(attempted_count) if isinstance(attempted_count, int) and attempted_count >= 0 else 0,
        "success_count": int(success_count) if isinstance(success_count, int) and success_count >= 0 else 0,
        "failed_count": int(failed_count) if isinstance(failed_count, int) and failed_count >= 0 else 0,
        "success_rate": float(success_rate) if isinstance(success_rate, (float, int)) and float(success_rate) >= 0 else 0.0,
        "is_partial": bool(is_partial) if isinstance(is_partial, int) else False,
        "failure_breakdown": failure_breakdown,
    }


def _run_request_fingerprint(simulation_id: str, request_body: RunSimulationRequest) -> str:
    normalized = {
        "simulation_id": simulation_id,
        "profile": request_body.get("profile", "auto"),
        "max_duration_seconds": request_body.get("max_duration_seconds"),
        "allow_sample_clamp": request_body.get("allow_sample_clamp", True),
        "use_refined_prompt": request_body.get("use_refined_prompt", True),
    }
    canonical = json.dumps(normalized, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _run_accepted_envelope(
    *,
    simulation_id: str,
    started_at: str,
    runtime_profile: str,
    estimated_seconds: int,
    effective_sample_size: int,
) -> RunAcceptedEnvelope:
    return cast(
        RunAcceptedEnvelope,
        {
            "data": {
                "id": simulation_id,
                "status": "running",
                "started_at": started_at,
                "estimated_seconds": estimated_seconds,
                "runtime_profile": runtime_profile,
                "effective_sample_size": effective_sample_size,
            },
            "error": None,
            "meta": {"request_id": new_request_id()},
        },
    )


def create_simulation_draft(store: SimulationStore, request_body: CreateSimulationRequest) -> CreateSimulationEnvelope:
    created_at = utc_now_iso()
    simulation: dict[str, Any] = {
        "id": new_simulation_id(),
        "title": request_body["title"],
        "policy_text": request_body["policy_text"],
        "status": "pending",
        "dataset": request_body["dataset"],
        "sample_size": request_body["sample_size"],
        "created_at": created_at,
    }

    if "filters" in request_body:
        simulation["filters"] = request_body["filters"]

    simulation["refined_policy_text"] = None
    store.insert_simulation(simulation)

    data = cast(SimulationDraft, {k: v for k, v in simulation.items() if k != "refined_policy_text" and (k != "filters" or v)})

    return cast(
        CreateSimulationEnvelope,
        {
            "data": data,
            "error": None,
            "meta": {"request_id": new_request_id()},
        },
    )


def list_datasets() -> DatasetsEnvelope:
    return cast(
        DatasetsEnvelope,
        {
            "data": [
                {
                    "id": "nemotron_usa",
                    "name": "NVIDIA Nemotron Personas USA",
                    "description": "Synthetic personas, census-aligned across US states",
                    "size": 1000000,
                    "attributes": [
                        "age",
                        "sex",
                        "marital_status",
                        "education_level",
                        "occupation",
                        "state",
                        "city",
                    ],
                    "license": "CC BY 4.0",
                    "status": "active",
                },
                {
                    "id": "sims_indo_v1",
                    "name": "SIMS Indonesia V1",
                    "description": "Handmade synthetic dataset for Indonesia",
                    "status": "coming_v2",
                },
            ],
            "error": None,
            "meta": {"request_id": new_request_id()},
        },
    )


def list_simulation_history(
    store: SimulationStore,
    *,
    page: int,
    limit: int,
    status: str | None,
    sort: str,
) -> SimulationListEnvelope:
    rows = store.list_simulations(page=page, limit=limit, status=status, sort=sort)
    total = store.count_simulations(status=status)

    items = [
        cast(
            SimulationListItem,
            {
                "id": row["id"],
                "title": row["title"],
                "status": row["status"],
                "sample_size": row["sample_size"],
                "mean_approval": row["mean_approval"],
                "created_at": row["created_at"],
                "completed_at": row["completed_at"],
            },
        )
        for row in rows
    ]

    return cast(
        SimulationListEnvelope,
        {
            "data": items,
            "error": None,
            "meta": {
                "total": total,
                "page": page,
                "limit": limit,
                "request_id": new_request_id(),
            },
        },
    )


def cleanup_simulation_artifacts(simulation_id: str) -> None:
    # Reject anything that doesn't look like a real sim id — prevents the
    # path-traversal vector where DELETE /simulations/..%2F..%2Fsecret would
    # cause unlink() on an arbitrary path.
    if not _SIM_ID_RE.match(simulation_id):
        return
    artifact_path = run_artifact_path(simulation_id)
    artifact_path.unlink(missing_ok=True)


def run_artifact_path(simulation_id: str, base_dir: Path | None = None) -> Path:
    root = base_dir or Path("apps/server/data/artifacts")
    root.mkdir(parents=True, exist_ok=True)
    return root / f"{simulation_id}.json"


def delete_simulation(store: SimulationStore, simulation_id: str) -> DeleteSimulationEnvelope:
    _validate_id_format(simulation_id, _SIM_ID_RE, "simulation")
    cleanup_simulation_artifacts(simulation_id)
    deleted_rows = store.delete_simulation(simulation_id)

    if deleted_rows == 0:
        raise ApiError(
            code="NOT_FOUND",
            message=f"simulation not found: {simulation_id}",
            status_code=404,
        )

    return cast(
        DeleteSimulationEnvelope,
        {
            "data": {"id": simulation_id, "deleted": True},
            "error": None,
            "meta": {"request_id": new_request_id()},
        },
    )


def generate_clarification_question(
    store: SimulationStore,
    simulation_id: str,
    request_body: GenerateClarificationRequest,
) -> ClarificationQuestionEnvelope:
    simulation = store.fetch_simulation(simulation_id)
    if simulation is None:
        raise ApiError(
            code="NOT_FOUND",
            message=f"simulation not found: {simulation_id}",
            status_code=404,
        )

    if simulation["status"] != "pending":
        raise ApiError(
            code="LIFECYCLE_CONFLICT",
            message="clarification generation is only allowed for pending simulations",
            status_code=409,
        )

    try:
        question_text, rationale = generate_clarification_with_gemma(
            policy_text=simulation["policy_text"],
            focus=request_body["focus"],
        )
    except ClarificationGenerationError as exc:
        raise ApiError(
            code="MODEL_RUNTIME_ERROR",
            message=exc.message,
            status_code=500,
        ) from exc

    clarification_id = new_clarification_id()
    turn_index = int(simulation.get("clarification_turn_index") or 0) + 1
    store.update_clarification_state(
        simulation_id=simulation_id,
        clarification_status="in_progress",
        clarification_turn_index=turn_index,
        current_clarification_id=clarification_id,
    )

    return cast(
        ClarificationQuestionEnvelope,
        {
            "data": {
                "clarification_id": clarification_id,
                "simulation_id": simulation_id,
                "question_text": question_text,
                "rationale": rationale,
                "status": "open",
                "turn_index": turn_index,
            },
            "error": None,
            "meta": {"request_id": new_request_id()},
        },
    )


def answer_clarification_question(
    store: SimulationStore,
    clarification_id: str,
    request_body: ClarificationAnswerRequest,
) -> ClarificationAnswerEnvelope:
    simulation_id = request_body["simulation_id"]
    simulation = store.fetch_simulation(simulation_id)
    if simulation is None:
        raise ApiError(
            code="NOT_FOUND",
            message=f"simulation not found: {simulation_id}",
            status_code=404,
        )

    if simulation["status"] != "pending":
        raise ApiError(
            code="LIFECYCLE_CONFLICT",
            message="clarification answers are only allowed for pending simulations",
            status_code=409,
        )

    current_clarification_id = simulation.get("current_clarification_id")
    if not current_clarification_id or current_clarification_id != clarification_id:
        raise ApiError(
            code="NOT_FOUND",
            message=f"clarification not found: {clarification_id}",
            status_code=404,
        )

    current_turn_index = int(simulation.get("clarification_turn_index") or 0)

    try:
        refined_policy_text, model_status, next_question_text = generate_clarification_answer_with_gemma(
            policy_text=simulation["policy_text"],
            refined_policy_text=simulation.get("refined_policy_text"),
            clarification_id=clarification_id,
            turn_index=current_turn_index,
            user_response=request_body["user_response"],
        )
    except ClarificationGenerationError as exc:
        raise ApiError(
            code="MODEL_RUNTIME_ERROR",
            message=exc.message,
            status_code=500,
        ) from exc

    final_status = model_status
    if current_turn_index >= MAX_CLARIFICATION_TURNS:
        final_status = "resolved"

    next_clarification_id: str | None = None
    response_next_question_text: str | None = None
    persisted_turn_index = current_turn_index
    persisted_current_clarification_id: str | None = None

    if final_status == "in_progress":
        if next_question_text is None:
            raise ApiError(
                code="MODEL_RUNTIME_ERROR",
                message="model output missing next_question_text for in_progress clarification",
                status_code=500,
            )
        next_clarification_id = new_clarification_id()
        response_next_question_text = next_question_text
        persisted_turn_index = current_turn_index + 1
        persisted_current_clarification_id = next_clarification_id

    store.update_refined_prompt_and_clarification_state(
        simulation_id=simulation_id,
        refined_policy_text=refined_policy_text,
        clarification_status=final_status,
        clarification_turn_index=persisted_turn_index,
        current_clarification_id=persisted_current_clarification_id,
    )

    return cast(
        ClarificationAnswerEnvelope,
        {
            "data": {
                "simulation_id": simulation_id,
                "clarification_status": final_status,
                "refined_policy_text": refined_policy_text,
                "next_clarification_id": next_clarification_id,
                "next_question_text": response_next_question_text,
            },
            "error": None,
            "meta": {"request_id": new_request_id()},
        },
    )


def get_clarification_state(store: SimulationStore, simulation_id: str) -> ClarificationStateEnvelope:
    simulation = store.fetch_simulation(simulation_id)
    if simulation is None:
        raise ApiError(
            code="NOT_FOUND",
            message=f"simulation not found: {simulation_id}",
            status_code=404,
        )

    clarification_status = cast(str, simulation.get("clarification_status") or "none")
    current_clarification_id = simulation.get("current_clarification_id")
    refined_policy_text = simulation.get("refined_policy_text")
    latest_refined_policy_text = refined_policy_text if isinstance(refined_policy_text, str) and refined_policy_text.strip() else simulation["policy_text"]
    has_open_question = clarification_status == "in_progress" and bool(current_clarification_id)

    return cast(
        ClarificationStateEnvelope,
        {
            "data": {
                "simulation_id": simulation_id,
                "clarification_status": clarification_status,
                "has_open_question": has_open_question,
                "latest_refined_policy_text": latest_refined_policy_text,
            },
            "error": None,
            "meta": {"request_id": new_request_id()},
        },
    )


def run_simulation(
    store: SimulationStore,
    simulation_id: str,
    request_body: RunSimulationRequest,
    idempotency_key: str | None,
) -> RunAcceptedEnvelope:
    simulation = store.fetch_simulation(simulation_id)
    if simulation is None:
        raise ApiError(
            code="NOT_FOUND",
            message=f"simulation not found: {simulation_id}",
            status_code=404,
        )

    fingerprint = _run_request_fingerprint(simulation_id, request_body)
    status = simulation["status"]

    if status == "running":
        persisted_key = simulation.get("run_idempotency_key")
        persisted_fingerprint = simulation.get("run_request_fingerprint")

        if idempotency_key and persisted_key == idempotency_key:
            if persisted_fingerprint == fingerprint:
                started_at = cast(str | None, simulation.get("started_at"))
                runtime_profile = cast(str | None, simulation.get("runtime_profile"))
                estimated_seconds = simulation.get("estimated_seconds")
                effective_sample_size = simulation.get("effective_sample_size")

                if (
                    isinstance(started_at, str)
                    and isinstance(runtime_profile, str)
                    and isinstance(estimated_seconds, int)
                    and isinstance(effective_sample_size, int)
                ):
                    return _run_accepted_envelope(
                        simulation_id=simulation_id,
                        started_at=started_at,
                        runtime_profile=runtime_profile,
                        estimated_seconds=estimated_seconds,
                        effective_sample_size=effective_sample_size,
                    )

            raise ApiError(
                code="LIFECYCLE_CONFLICT",
                message="simulation is already running with a different request",
                status_code=409,
            )

        raise ApiError(
            code="LIFECYCLE_CONFLICT",
            message="simulation is already running",
            status_code=409,
        )

    if status != "pending":
        raise ApiError(
            code="LIFECYCLE_CONFLICT",
            message=f"simulation cannot be started from status: {status}",
            status_code=409,
        )

    runtime_profile = cast(str, request_body.get("profile", "auto"))
    effective_sample_size = int(simulation["sample_size"])
    estimated_seconds = _estimate_seconds(effective_sample_size, runtime_profile)
    started_at = utc_now_iso()

    filters = simulation.get("filters")
    try:
        _, dataset_metadata = sample_personas(
            simulation_id=simulation_id,
            count=effective_sample_size,
            filters=filters if isinstance(filters, dict) else None,
        )
    except DatasetLoadError as exc:
        msg = str(exc)
        # "insufficient personas after filters" is a client-driven 409 (bad filter params).
        # All other DatasetLoadErrors (missing file, invalid format, HF load failure)
        # are server configuration errors — return 500 so clients don't treat them
        # as retryable filter conflicts.
        if "insufficient personas" in msg.lower():
            raise ApiError(
                code="INSUFFICIENT_DATASET_SAMPLE",
                message=msg,
                status_code=409,
            ) from exc
        raise ApiError(
            code="DATASET_ERROR",
            message=f"dataset unavailable: {msg}",
            status_code=500,
        ) from exc

    use_refined_prompt = cast(bool, request_body.get("use_refined_prompt", True))
    has_refined = isinstance(simulation.get("refined_policy_text"), str) and bool(cast(str, simulation["refined_policy_text"]).strip())
    run_prompt_source = "refined_policy_text" if use_refined_prompt and has_refined else "policy_text"

    updated_rows = store.start_simulation_run(
        simulation_id=simulation_id,
        started_at=started_at,
        runtime_profile=runtime_profile,
        effective_sample_size=effective_sample_size,
        estimated_seconds=estimated_seconds,
        run_idempotency_key=idempotency_key,
        run_request_fingerprint=fingerprint,
        run_prompt_source=run_prompt_source,
        run_dataset_version=cast(str, dataset_metadata["dataset_version"]),
        run_sampling_seed=int(cast(int, dataset_metadata["sampling_seed"])),
    )
    if updated_rows == 0:
        raise ApiError(
            code="LIFECYCLE_CONFLICT",
            message="simulation status changed before run start",
            status_code=409,
        )

    dispatch_run_worker(store.db_path, simulation_id)

    return _run_accepted_envelope(
        simulation_id=simulation_id,
        started_at=started_at,
        runtime_profile=runtime_profile,
        estimated_seconds=estimated_seconds,
        effective_sample_size=effective_sample_size,
    )


def dispatch_run_worker(db_path: Path, simulation_id: str) -> None:
    enabled = os.getenv("SIMS_RUN_WORKER_ENABLED", "1").strip().lower() not in {"0", "false", "off"}
    if not enabled:
        return
    thread = threading.Thread(
        target=execute_simulation_run,
        kwargs={"db_path": db_path, "simulation_id": simulation_id},
        daemon=True,
        name=f"sims-run-{simulation_id}",
    )
    thread.start()


def execute_simulation_run(*, db_path: Path, simulation_id: str) -> None:
    store = SimulationStore(db_path=db_path)
    outputs: list[dict[str, Any]] = []
    failure_breakdown: Counter[str] = Counter()
    telemetry = {
        "retry_count": 0,
        "invalid_output_count": 0,
        "failure_code": None,
        "failure_message": None,
        "failed_persona_id": None,
        "attempted_count": 0,
        "success_count": 0,
        "failed_count": 0,
        "success_rate": 0.0,
        "is_partial": False,
        "failure_breakdown": {},
    }
    try:
        simulation = store.fetch_simulation(simulation_id)
        if simulation is None or simulation.get("status") != "running":
            return

        policy_text = cast(str, simulation.get(cast(str, simulation.get("run_prompt_source", "policy_text"))) or simulation["policy_text"])
        effective_sample_size = int(simulation.get("effective_sample_size") or simulation["sample_size"])
        filters = simulation.get("filters")
        personas, dataset_metadata = sample_personas(
            simulation_id=simulation_id,
            count=effective_sample_size,
            filters=filters if isinstance(filters, dict) else None,
        )

        max_retries = resolve_max_retries()
        batch_size = resolve_batch_size()
        for start in range(0, len(personas), batch_size):
            batch = personas[start : start + batch_size]
            for persona in batch:
                prompt = build_policy_prompt(policy_text=policy_text, persona=persona)
                attempts = 0
                telemetry["attempted_count"] += 1
                persona_success = False
                parsed: dict[str, Any] | None = None
                while True:
                    try:
                        parsed = generate_policy_response_with_ollama(prompt)
                        telemetry["success_count"] += 1
                        persona_success = True
                        break
                    except Exception as exc:
                        run_error = _normalize_retry_error(exc)
                        if run_error.invalid_output:
                            telemetry["invalid_output_count"] += 1

                        if run_error.retryable and attempts < max_retries:
                            attempts += 1
                            telemetry["retry_count"] += 1
                            continue

                        telemetry["failure_code"] = run_error.code or "UNKNOWN_ERROR"
                        telemetry["failure_message"] = run_error.message or "unexpected run worker error"
                        persona_id = persona.get("persona_id")
                        if isinstance(persona_id, str) and persona_id:
                            telemetry["failed_persona_id"] = persona_id
                        telemetry["failed_count"] += 1
                        failure_breakdown[telemetry["failure_code"]] += 1
                        break
                if persona_success and parsed is not None:
                    outputs.append({"persona": persona, "response": parsed})

                attempted_now = int(telemetry["attempted_count"])
                success_now = int(telemetry["success_count"])
                failed_now = int(telemetry["failed_count"])
                success_rate_now = (success_now / attempted_now) if attempted_now > 0 else 0.0
                store.update_running_progress(
                    simulation_id=simulation_id,
                    run_retry_count=int(telemetry["retry_count"]),
                    run_invalid_output_count=int(telemetry["invalid_output_count"]),
                    run_attempted_count=attempted_now,
                    run_success_count=success_now,
                    run_failed_count=failed_now,
                    run_success_rate=float(success_rate_now),
                )

        attempted_count = int(telemetry["attempted_count"])
        success_count = int(telemetry["success_count"])
        failed_count = int(telemetry["failed_count"])
        success_rate = (success_count / attempted_count) if attempted_count > 0 else 0.0
        telemetry["success_rate"] = success_rate
        telemetry["is_partial"] = success_count > 0 and failed_count > 0
        telemetry["failure_breakdown"] = dict(failure_breakdown)
        completed = success_count > 0 and success_rate >= PARTIAL_SUCCESS_THRESHOLD
        if completed:
            telemetry["failure_code"] = None
            telemetry["failure_message"] = None
            telemetry["failed_persona_id"] = None
        else:
            telemetry["failure_code"] = "INSUFFICIENT_SUCCESS_RATE"
            telemetry["failure_message"] = (
                f"success rate {success_rate:.2f} below required {PARTIAL_SUCCESS_THRESHOLD:.2f}"
                if attempted_count > 0
                else f"success rate 0.00 below required {PARTIAL_SUCCESS_THRESHOLD:.2f}"
            )

        artifact = {
            "simulation_id": simulation_id,
            "model": resolve_run_model(),
            "dataset_version": simulation.get("run_dataset_version") or dataset_metadata["dataset_version"],
            "sampling_seed": simulation.get("run_sampling_seed") or dataset_metadata["sampling_seed"],
            "prompt_template_version": prompt_template_version(),
            "prompt_calibration_enabled": True,
            "output_count": len(outputs),
            "raw_outputs": outputs,
            "run_telemetry": telemetry,
        }
        run_artifact_path(simulation_id).write_text(json.dumps(artifact, ensure_ascii=True), encoding="utf-8")

        # DB transition — if this raises after the artifact is already written,
        # the outer except block will catch it and call fail_simulation_run, which
        # prevents the simulation from being permanently stuck in "running".
        if completed:
            mean_approval = sum(float(item["response"]["approval"]) for item in outputs) / len(outputs)
            store.complete_simulation_run(
                simulation_id=simulation_id,
                completed_at=utc_now_iso(),
                mean_approval=mean_approval,
                run_retry_count=int(telemetry["retry_count"]),
                run_invalid_output_count=int(telemetry["invalid_output_count"]),
                run_attempted_count=attempted_count,
                run_success_count=success_count,
                run_failed_count=failed_count,
                run_success_rate=float(success_rate),
                run_is_partial=bool(telemetry["is_partial"]),
                run_failure_breakdown_json=json.dumps(dict(failure_breakdown), sort_keys=True),
            )
        else:
            store.fail_simulation_run(
                simulation_id=simulation_id,
                completed_at=utc_now_iso(),
                run_retry_count=int(telemetry["retry_count"]),
                run_invalid_output_count=int(telemetry["invalid_output_count"]),
                run_failure_code=cast(str, telemetry["failure_code"]),
                run_failure_message=cast(str, telemetry["failure_message"]),
                run_failed_persona_id=cast(str | None, telemetry["failed_persona_id"]),
                run_attempted_count=attempted_count,
                run_success_count=success_count,
                run_failed_count=failed_count,
                run_success_rate=float(success_rate),
                run_is_partial=bool(telemetry["is_partial"]),
                run_failure_breakdown_json=json.dumps(dict(failure_breakdown), sort_keys=True),
            )
    except Exception as exc:
        if telemetry["failure_code"] is None:
            run_error = exc if isinstance(exc, SimulationRunError) else SimulationRunError("unexpected run worker error", code="UNKNOWN_ERROR")
            telemetry["failure_code"] = run_error.code or "UNKNOWN_ERROR"
            telemetry["failure_message"] = run_error.message or "unexpected run worker error"

        artifact = {
            "simulation_id": simulation_id,
            "model": resolve_run_model(),
            "dataset_version": simulation.get("run_dataset_version") if "simulation" in locals() and isinstance(simulation, dict) else None,
            "sampling_seed": simulation.get("run_sampling_seed") if "simulation" in locals() and isinstance(simulation, dict) else None,
            "prompt_template_version": prompt_template_version(),
            "prompt_calibration_enabled": True,
            "output_count": len(outputs),
            "raw_outputs": outputs,
            "run_telemetry": {
                **telemetry,
                "failure_breakdown": dict(failure_breakdown),
            },
        }
        run_artifact_path(simulation_id).write_text(json.dumps(artifact, ensure_ascii=True), encoding="utf-8")

        attempted_count = int(telemetry["attempted_count"]) if isinstance(telemetry.get("attempted_count"), int) else len(outputs)
        success_count = int(telemetry["success_count"]) if isinstance(telemetry.get("success_count"), int) else len(outputs)
        failed_count = int(telemetry["failed_count"]) if isinstance(telemetry.get("failed_count"), int) else 0
        success_rate = (success_count / attempted_count) if attempted_count > 0 else 0.0
        store.fail_simulation_run(
            simulation_id=simulation_id,
            completed_at=utc_now_iso(),
            run_retry_count=int(telemetry["retry_count"]),
            run_invalid_output_count=int(telemetry["invalid_output_count"]),
            run_failure_code=cast(str, telemetry["failure_code"]),
            run_failure_message=cast(str, telemetry["failure_message"]),
            run_failed_persona_id=cast(str | None, telemetry["failed_persona_id"]),
            run_attempted_count=attempted_count,
            run_success_count=success_count,
            run_failed_count=failed_count,
            run_success_rate=float(success_rate),
            run_is_partial=success_count > 0 and failed_count > 0,
            run_failure_breakdown_json=json.dumps(dict(failure_breakdown), sort_keys=True),
        )


def get_simulation_status(store: SimulationStore, simulation_id: str) -> SimulationStatusEnvelope:
    simulation = store.fetch_simulation(simulation_id)
    if simulation is None:
        raise ApiError(
            code="NOT_FOUND",
            message=f"simulation not found: {simulation_id}",
            status_code=404,
        )

    status = cast(str, simulation["status"])
    runtime_profile = _resolve_runtime_profile(simulation)
    agents_total = _resolve_agents_total(simulation)
    estimated_seconds = _resolve_estimated_seconds(
        simulation,
        agents_total=agents_total,
        runtime_profile=runtime_profile,
    )
    elapsed_seconds = _elapsed_seconds_from_started_at(simulation.get("started_at"))
    has_timing = _parse_utc_timestamp(simulation.get("started_at")) is not None

    status_telemetry = _status_run_telemetry(simulation)
    agents_completed, progress_pct, estimated_seconds_remaining = _derive_progress_snapshot(
        status=status,
        agents_total=agents_total,
        elapsed_seconds=elapsed_seconds,
        estimated_seconds=estimated_seconds,
        has_timing=has_timing,
        attempted_count=int(status_telemetry["attempted_count"]),
    )

    return cast(
        SimulationStatusEnvelope,
        {
            "data": {
                "id": simulation_id,
                "status": status,
                "agents_total": agents_total,
                "agents_completed": agents_completed,
                "progress_pct": float(progress_pct),
                "estimated_seconds_remaining": estimated_seconds_remaining,
                "runtime_profile": runtime_profile,
                "effective_sample_size": agents_total,
                "run_telemetry": status_telemetry,
            },
            "error": None,
            "meta": {"request_id": new_request_id()},
        },
    )


def get_simulation_results(store: SimulationStore, simulation_id: str) -> SimulationResultsEnvelope:
    simulation = store.fetch_simulation(simulation_id)
    if simulation is None:
        raise ApiError(
            code="NOT_FOUND",
            message=f"simulation not found: {simulation_id}",
            status_code=404,
        )

    status = cast(str, simulation["status"])
    if status in {"pending", "running"}:
        raise ApiError(
            code="SIMULATION_NOT_COMPLETE",
            message="results are only available after simulation completion",
            status_code=409,
        )
    if status == "failed":
        raise ApiError(
            code="SIMULATION_FAILED",
            message="simulation failed; results are unavailable",
            status_code=409,
        )
    if status != "completed":
        raise ApiError(
            code="LIFECYCLE_CONFLICT",
            message=f"unsupported lifecycle status for results: {status}",
            status_code=409,
        )

    artifact_path = run_artifact_path(simulation_id)
    if not artifact_path.exists():
        raise ApiError(
            code="INTERNAL_ERROR",
            message=f"missing run artifact for completed simulation: {simulation_id}",
            status_code=500,
        )

    try:
        artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ApiError(
            code="INTERNAL_ERROR",
            message=f"invalid run artifact JSON for simulation: {simulation_id}",
            status_code=500,
        ) from exc

    raw_outputs = artifact.get("raw_outputs")
    if not isinstance(raw_outputs, list):
        raise ApiError(
            code="INTERNAL_ERROR",
            message=f"run artifact missing raw_outputs for simulation: {simulation_id}",
            status_code=500,
        )

    runtime_profile = _resolve_runtime_profile(simulation)
    effective_sample_size = _resolve_agents_total(simulation) or len(raw_outputs)

    try:
        data = aggregate_results_payload(
            simulation_id=simulation_id,
            runtime_profile=runtime_profile,
            effective_sample_size=effective_sample_size,
            raw_outputs=cast(list[dict[str, Any]], raw_outputs),
        )
    except ValueError as exc:
        raise ApiError(
            code="INTERNAL_ERROR",
            message=f"invalid run artifact contents for simulation: {simulation_id}",
            status_code=500,
        ) from exc

    return cast(
        SimulationResultsEnvelope,
        {
            "data": data,
            "error": None,
            "meta": {"request_id": new_request_id()},
        },
    )


def _completed_simulation_results_data(store: SimulationStore, simulation_id: str) -> dict[str, Any]:
    envelope = get_simulation_results(store, simulation_id)
    return cast(dict[str, Any], envelope["data"])


def _round_to_1(value: float) -> float:
    return round(float(value), 1)


def _build_challenge_for_focus(focus: str, results_data: dict[str, Any]) -> dict[str, Any]:
    summary = cast(dict[str, Any], results_data.get("summary", {}))
    breakdown = cast(dict[str, Any], results_data.get("demographic_breakdown", {}))
    by_age_group = cast(dict[str, dict[str, Any]], breakdown.get("by_age_group", {}))
    by_state = cast(dict[str, float], breakdown.get("by_state", {}))
    emotion_profile = cast(dict[str, float], results_data.get("emotion_profile", {}))

    if focus == "weak_segment":
        weakest = min(
            by_age_group.items(),
            key=lambda item: (float(item[1].get("mean_approval", 0.0)), item[0]),
        ) if by_age_group else ("all", {"mean_approval": float(summary.get("mean_approval", 0.0))})
        segment = weakest[0]
        mean_approval = _round_to_1(float(weakest[1].get("mean_approval", 0.0)))
        challenge_text = (
            f"Approval is weakest for segment {segment} at {mean_approval}/5. "
            "What concrete policy change directly improves this segment's concerns?"
        )
        top_concern = "Low approval concentration in weakest segment"
    elif focus == "behavioral_change":
        behavioral_change_pct = _round_to_1(float(summary.get("behavioral_change_pct", 0.0)))
        mean_approval = _round_to_1(float(summary.get("mean_approval", 0.0)))
        segment = "Behavior-change cohort"
        challenge_text = (
            f"Behavioral change is {behavioral_change_pct}% with mean approval {mean_approval}/5. "
            "Why should skeptical groups trust this behavior-change assumption?"
        )
        top_concern = "Behavior-change expectation may be overestimated"
    elif focus == "emotion_bias":
        dominant = str(summary.get("dominant_emotion", "neutral"))
        dom_pct = _round_to_1(float(emotion_profile.get(dominant, 0.0)))
        mean_approval = _round_to_1(float(summary.get("mean_approval", 0.0)))
        segment = "All demographics"
        challenge_text = (
            f"Dominant emotion is {dominant} ({dom_pct}%). "
            "How will you reframe policy communication to reduce negative emotional bias?"
        )
        top_concern = "Emotional framing may reduce trust"
    else:
        if by_state:
            low_state, low_mean = min(by_state.items(), key=lambda item: (float(item[1]), item[0]))
            high_state, high_mean = max(by_state.items(), key=lambda item: (float(item[1]), item[0]))
            gap = _round_to_1(float(high_mean) - float(low_mean))
            segment = f"{low_state} vs {high_state}"
            mean_approval = _round_to_1(float(low_mean))
            challenge_text = (
                f"There is a {gap}-point approval gap between states ({low_state} lowest, {high_state} highest). "
                "How does the policy address this demographic disparity?"
            )
        else:
            segment = "State segments"
            mean_approval = _round_to_1(float(summary.get("mean_approval", 0.0)))
            challenge_text = "State-level approval disparity appears in results. How will policy design close that gap?"
        top_concern = "Uneven demographic impact across groups"

    return {
        "challenge_text": challenge_text,
        "evidence": {
            "segment": segment,
            "mean_approval": mean_approval,
            "top_concern": top_concern,
        },
    }


def generate_challenge(
    store: SimulationStore,
    simulation_id: str,
    request_body: GenerateChallengeRequest,
) -> ChallengeEnvelope:
    simulation = store.fetch_simulation(simulation_id)
    if simulation is None:
        raise ApiError(
            code="NOT_FOUND",
            message=f"simulation not found: {simulation_id}",
            status_code=404,
        )
    if cast(str, simulation["status"]) != "completed":
        raise ApiError(
            code="LIFECYCLE_CONFLICT",
            message="challenge generation is only allowed for completed simulations",
            status_code=409,
        )

    focus = request_body["focus"]
    results_data = _completed_simulation_results_data(store, simulation_id)
    challenge_id = new_challenge_id()
    built = _build_challenge_for_focus(focus, results_data)

    store.insert_challenge(
        challenge_id=challenge_id,
        simulation_id=simulation_id,
        focus=focus,
        created_at=utc_now_iso(),
    )

    return cast(
        ChallengeEnvelope,
        {
            "data": {
                "challenge_id": challenge_id,
                "challenge_text": built["challenge_text"],
                "evidence": built["evidence"],
            },
            "error": None,
            "meta": {"request_id": new_request_id()},
        },
    )


def submit_challenge_followup(
    store: SimulationStore,
    challenge_id: str,
    request_body: ChallengeFollowupRequest,
) -> ChallengeFollowupEnvelope:
    challenge = store.fetch_challenge(challenge_id)
    if challenge is None:
        raise ApiError(
            code="NOT_FOUND",
            message=f"challenge not found: {challenge_id}",
            status_code=404,
        )

    simulation_id = cast(str, request_body["simulation_id"])
    if simulation_id != challenge["simulation_id"]:
        raise ApiError(
            code="VALIDATION_ERROR",
            message="simulation_id does not match challenge context",
            status_code=400,
        )

    user_response = cast(str, request_body["user_response"]).lower()
    is_detailed = len(user_response) > 80
    mentions_data = any(token in user_response for token in ["data", "evidence", "study"])
    mentions_cost = any(token in user_response for token in ["cost", "rebate", "subsid"])

    if mentions_data:
        followup_text = (
            "That evidence-based framing helps. How will you validate those assumptions for the lowest-approval segment specifically?"
        )
    elif mentions_cost:
        followup_text = (
            "Cost mitigation is directionally strong. What is the timeline for relief, and how will households bridge the interim period?"
        )
    elif is_detailed:
        followup_text = (
            "The response is substantive. Which single policy lever should be prioritized first to maximize approval lift?"
        )
    else:
        followup_text = (
            "That addresses part of the concern. Please specify concrete implementation steps for the most skeptical segment."
        )

    next_challenge_id = new_challenge_id()
    store.insert_challenge(
        challenge_id=next_challenge_id,
        simulation_id=simulation_id,
        focus=cast(str, challenge["focus"]),
        created_at=utc_now_iso(),
    )

    return cast(
        ChallengeFollowupEnvelope,
        {
            "data": {
                "followup_text": followup_text,
                "suggested_policy_refinement": (
                    "Add a targeted mitigation for the weakest segment with explicit eligibility, timeline, and communication plan."
                ),
                "next_challenge_id": next_challenge_id,
            },
            "error": None,
            "meta": {"request_id": new_request_id()},
        },
    )


def export_simulation_csv(store: SimulationStore, simulation_id: str) -> str:
    simulation = store.fetch_simulation(simulation_id)
    if simulation is None:
        raise ApiError(
            code="NOT_FOUND",
            message=f"simulation not found: {simulation_id}",
            status_code=404,
        )

    status = cast(str, simulation["status"])
    if status in {"pending", "running"}:
        raise ApiError(
            code="SIMULATION_NOT_COMPLETE",
            message="export is only available after simulation completion",
            status_code=409,
        )
    if status == "failed":
        raise ApiError(
            code="SIMULATION_FAILED",
            message="simulation failed; export is unavailable",
            status_code=409,
        )
    if status != "completed":
        raise ApiError(
            code="LIFECYCLE_CONFLICT",
            message=f"unsupported lifecycle status for export: {status}",
            status_code=409,
        )

    artifact_path = run_artifact_path(simulation_id)
    if not artifact_path.exists():
        raise ApiError(
            code="INTERNAL_ERROR",
            message=f"missing run artifact for completed simulation: {simulation_id}",
            status_code=500,
        )

    try:
        artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ApiError(
            code="INTERNAL_ERROR",
            message=f"invalid run artifact JSON for simulation: {simulation_id}",
            status_code=500,
        ) from exc

    raw_outputs = artifact.get("raw_outputs")
    if not isinstance(raw_outputs, list):
        raise ApiError(
            code="INTERNAL_ERROR",
            message=f"run artifact missing raw_outputs for simulation: {simulation_id}",
            status_code=500,
        )

    fieldnames = [
        "persona_id",
        "name",
        "age",
        "occupation",
        "city",
        "state",
        "approval",
        "emotion",
        "rationale",
        "behavioral_change",
    ]
    rows: list[dict[str, Any]] = []
    for item in raw_outputs:
        if not isinstance(item, dict):
            raise ApiError(
                code="INTERNAL_ERROR",
                message=f"invalid run artifact contents for simulation: {simulation_id}",
                status_code=500,
            )
        persona = item.get("persona")
        response = item.get("response")
        if not isinstance(persona, dict) or not isinstance(response, dict):
            raise ApiError(
                code="INTERNAL_ERROR",
                message=f"invalid run artifact contents for simulation: {simulation_id}",
                status_code=500,
            )

        behavior_change = response.get("behavior_change")
        behavior_change_text = ""
        if isinstance(behavior_change, bool):
            behavior_change_text = "true" if behavior_change else "false"

        rows.append(
            {
                "persona_id": persona.get("persona_id", ""),
                "name": _csv_safe(persona.get("name", "")),
                "age": persona.get("age", ""),
                "occupation": _csv_safe(persona.get("occupation", "")),
                "city": _csv_safe(persona.get("city", "")),
                "state": _csv_safe(persona.get("state", "")),
                "approval": response.get("approval", ""),
                "emotion": _csv_safe(response.get("emotion", "")),
                "rationale": _csv_safe(response.get("rationale", "")),
                "behavioral_change": behavior_change_text,
            }
        )

    rows.sort(key=lambda row: str(row["persona_id"]))

    output = StringIO()
    writer = DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()
