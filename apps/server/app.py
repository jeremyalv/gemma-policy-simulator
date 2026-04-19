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
    answer_clarification_question,
    create_simulation_draft,
    delete_simulation,
    generate_clarification_question,
    get_clarification_state,
    get_simulation_status,
    list_simulation_history,
    new_request_id,
    run_simulation,
)
from .storage import SimulationStore
from .validation import (
    validate_answer_clarification_payload,
    validate_create_simulation_payload,
    validate_generate_clarification_payload,
    validate_list_simulations_query,
    validate_run_simulation_payload,
)


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

    @app.post("/api/v1/simulations/{simulation_id}/clarifications/generate", status_code=200)
    async def post_generate_clarification(simulation_id: str, request: Request) -> Any:
        try:
            payload = await request.json()
        except Exception:
            return error_envelope(400, "VALIDATION_ERROR", "request body must be valid JSON")

        try:
            validated = validate_generate_clarification_payload(payload)
            response = generate_clarification_question(
                store=store,
                simulation_id=simulation_id,
                request_body=validated,
            )
        except ApiError as exc:
            return error_envelope(exc.status_code, exc.code, exc.message)

        return JSONResponse(status_code=200, content=response)

    @app.post("/api/v1/simulations/{simulation_id}/run", status_code=202)
    async def post_run_simulation(simulation_id: str, request: Request) -> Any:
        raw_body = await request.body()
        if not raw_body:
            payload: Any = {}
        else:
            try:
                payload = await request.json()
            except Exception:
                return error_envelope(400, "VALIDATION_ERROR", "request body must be valid JSON")

        idempotency_key = request.headers.get("Idempotency-Key")
        if idempotency_key is not None:
            idempotency_key = idempotency_key.strip() or None

        try:
            validated = validate_run_simulation_payload(payload)
            response = run_simulation(
                store=store,
                simulation_id=simulation_id,
                request_body=validated,
                idempotency_key=idempotency_key,
            )
        except ApiError as exc:
            return error_envelope(exc.status_code, exc.code, exc.message)

        return JSONResponse(status_code=202, content=response)

    @app.get("/api/v1/simulations/{simulation_id}/status", status_code=200)
    async def get_simulation_status_by_id(simulation_id: str) -> Any:
        try:
            response = get_simulation_status(store, simulation_id)
        except ApiError as exc:
            return error_envelope(exc.status_code, exc.code, exc.message)

        return JSONResponse(status_code=200, content=response)

    @app.post("/api/v1/clarifications/{clarification_id}/answer", status_code=200)
    async def post_answer_clarification(clarification_id: str, request: Request) -> Any:
        try:
            payload = await request.json()
        except Exception:
            return error_envelope(400, "VALIDATION_ERROR", "request body must be valid JSON")

        try:
            validated = validate_answer_clarification_payload(payload)
            response = answer_clarification_question(
                store=store,
                clarification_id=clarification_id,
                request_body=validated,
            )
        except ApiError as exc:
            return error_envelope(exc.status_code, exc.code, exc.message)

        return JSONResponse(status_code=200, content=response)

    @app.get("/api/v1/simulations/{simulation_id}/clarifications", status_code=200)
    async def get_simulation_clarification_state(simulation_id: str) -> Any:
        try:
            response = get_clarification_state(store, simulation_id)
        except ApiError as exc:
            return error_envelope(exc.status_code, exc.code, exc.message)

        return JSONResponse(status_code=200, content=response)

    return app


app = create_app()
