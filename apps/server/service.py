"""Service logic for simulation draft creation."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, cast
from uuid import uuid4

from packages.contracts.python.contracts_v1 import (
    ClarificationAnswerEnvelope,
    ClarificationAnswerRequest,
    ClarificationQuestionEnvelope,
    CreateSimulationEnvelope,
    CreateSimulationRequest,
    DeleteSimulationEnvelope,
    GenerateClarificationRequest,
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
from .storage import SimulationStore

MAX_CLARIFICATION_TURNS = 3


def new_simulation_id() -> str:
    return f"sim_{uuid4().hex[:8]}"


def new_request_id() -> str:
    return f"req_{uuid4().hex[:8]}"


def new_clarification_id() -> str:
    return f"cl_{uuid4().hex[:8]}"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


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
    """Cleanup hook for non-database simulation artifacts."""
    _ = simulation_id


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
