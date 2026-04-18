"""Service logic for simulation draft creation."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, cast
from uuid import uuid4

from packages.contracts.python.contracts_v1 import (
    CreateSimulationEnvelope,
    CreateSimulationRequest,
    SimulationDraft,
    SimulationListEnvelope,
    SimulationListItem,
)

from .storage import SimulationStore


def new_simulation_id() -> str:
    return f"sim_{uuid4().hex[:8]}"


def new_request_id() -> str:
    return f"req_{uuid4().hex[:8]}"


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
