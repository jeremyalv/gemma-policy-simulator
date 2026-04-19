"""FastAPI application for SIMS backend."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from packages.contracts.python.contracts_v1 import ErrorEnvelope

from .errors import ApiError
from .service import (
    create_simulation_draft,
    delete_simulation,
    list_simulation_history,
    new_request_id,
)
from .storage import SimulationStore
from .validation import validate_create_simulation_payload, validate_list_simulations_query


def default_db_path() -> Path:
    configured = os.getenv("SIMS_DB_PATH")
    if configured:
        return Path(configured)
    return Path("apps/server/data/sims.db")


def error_envelope(status_code: int, code: str, message: str) -> JSONResponse:
    envelope = cast(
        ErrorEnvelope,
        {
            "data": None,
            "error": {
                "code": code,
                "message": message,
            },
            "meta": {
                "request_id": new_request_id(),
            },
        },
    )
    return JSONResponse(status_code=status_code, content=envelope)


def create_app(db_path: Path | None = None) -> FastAPI:
    app = FastAPI(title="SIMS Server", version="0.1.0")
    store = SimulationStore(db_path or default_db_path())
    # Ensure schema exists even before startup hooks run in certain test harnesses.
    store.ensure_schema()

    @app.on_event("startup")
    def startup() -> None:
        store.ensure_schema()

    @app.post("/api/v1/simulations", status_code=201)
    async def post_simulations(request: Request) -> Any:
        try:
            payload = await request.json()
        except Exception:
            return error_envelope(400, "VALIDATION_ERROR", "request body must be valid JSON")

        try:
            validated = validate_create_simulation_payload(payload)
            response = create_simulation_draft(store, validated)
        except ApiError as exc:
            return error_envelope(exc.status_code, exc.code, exc.message)

        return JSONResponse(status_code=201, content=response)

    @app.get("/api/v1/simulations", status_code=200)
    async def get_simulations(request: Request) -> Any:
        query_params = dict(request.query_params)

        try:
            page, limit, status, sort = validate_list_simulations_query(query_params)
            response = list_simulation_history(
                store,
                page=page,
                limit=limit,
                status=status,
                sort=sort,
            )
        except ApiError as exc:
            return error_envelope(exc.status_code, exc.code, exc.message)

        return JSONResponse(status_code=200, content=response)

    @app.delete("/api/v1/simulations/{simulation_id}", status_code=200)
    async def delete_simulation_by_id(simulation_id: str) -> Any:
        try:
            response = delete_simulation(store, simulation_id)
        except ApiError as exc:
            return error_envelope(exc.status_code, exc.code, exc.message)

        return JSONResponse(status_code=200, content=response)

    return app


app = create_app()
