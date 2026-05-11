"""Service logic for simulation draft creation."""

from __future__ import annotations

import hashlib
import json
import math
import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, cast
from uuid import uuid4

from packages.contracts.python.contracts_v1 import (
    ClarificationAnswerEnvelope,
    ClarificationAnswerRequest,
    ClarificationQuestionEnvelope,
    ClarificationStateEnvelope,
    CreateSimulationEnvelope,
    CreateSimulationRequest,
    DeleteSimulationEnvelope,
    GenerateClarificationRequest,
    RunAcceptedEnvelope,
    RunSimulationRequest,
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
from .simulation_runner import (
    SimulationRunError,
    build_policy_prompt,
    generate_personas,
    generate_policy_response_with_ollama,
    resolve_batch_size,
)
from .storage import SimulationStore

MAX_CLARIFICATION_TURNS = 3
ALLOWED_RUNTIME_PROFILES = {"interactive", "balanced", "thorough", "auto"}


def new_simulation_id() -> str:
    return f"sim_{uuid4().hex[:8]}"


def new_request_id() -> str:
    return f"req_{uuid4().hex[:8]}"


def new_clarification_id() -> str:
    return f"cl_{uuid4().hex[:8]}"


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
) -> tuple[int, float, int]:
    if status == "pending":
        return 0, 0.0, 0

    if status == "completed":
        return agents_total, 100.0, 0

    if status == "running":
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
    artifact_path = run_artifact_path(simulation_id)
    artifact_path.unlink(missing_ok=True)


def run_artifact_path(simulation_id: str, base_dir: Path | None = None) -> Path:
    root = base_dir or Path("apps/server/data/artifacts")
    root.mkdir(parents=True, exist_ok=True)
    return root / f"{simulation_id}.json"


def delete_simulation(store: SimulationStore, simulation_id: str) -> DeleteSimulationEnvelope:
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
        if current_turn_index >= MAX_CLARIFICATION_TURNS:
            final_status = "resolved"
        else:
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
    try:
        simulation = store.fetch_simulation(simulation_id)
        if simulation is None or simulation.get("status") != "running":
            return

        policy_text = cast(str, simulation.get(cast(str, simulation.get("run_prompt_source", "policy_text"))) or simulation["policy_text"])
        effective_sample_size = int(simulation.get("effective_sample_size") or simulation["sample_size"])
        filters = simulation.get("filters")

        personas = generate_personas(
            simulation_id=simulation_id,
            count=effective_sample_size,
            filters=filters if isinstance(filters, dict) else None,
        )

        outputs: list[dict[str, Any]] = []
        batch_size = resolve_batch_size()
        for start in range(0, len(personas), batch_size):
            batch = personas[start : start + batch_size]
            for persona in batch:
                prompt = build_policy_prompt(policy_text=policy_text, persona=persona)
                parsed = generate_policy_response_with_ollama(prompt)
                outputs.append({"persona": persona, "response": parsed})

        if not outputs:
            raise SimulationRunError("no outputs generated")

        artifact = {
            "simulation_id": simulation_id,
            "model": "gemma",
            "output_count": len(outputs),
            "raw_outputs": outputs,
        }
        run_artifact_path(simulation_id).write_text(json.dumps(artifact, ensure_ascii=True), encoding="utf-8")

        mean_approval = sum(float(item["response"]["approval"]) for item in outputs) / len(outputs)
        store.complete_simulation_run(
            simulation_id=simulation_id,
            completed_at=utc_now_iso(),
            mean_approval=mean_approval,
        )
    except Exception:
        store.fail_simulation_run(
            simulation_id=simulation_id,
            completed_at=utc_now_iso(),
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

    agents_completed, progress_pct, estimated_seconds_remaining = _derive_progress_snapshot(
        status=status,
        agents_total=agents_total,
        elapsed_seconds=elapsed_seconds,
        estimated_seconds=estimated_seconds,
        has_timing=has_timing,
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
            },
            "error": None,
            "meta": {"request_id": new_request_id()},
        },
    )
