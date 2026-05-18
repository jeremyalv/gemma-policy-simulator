"""FastAPI application for SIMS backend."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from packages.contracts.python.contracts_v1 import ErrorEnvelope

from .errors import ApiError
from .service import (
    generate_challenge,
    answer_clarification_question,
    create_simulation_draft,
    delete_simulation,
    export_simulation_csv,
    generate_clarification_question,
    get_clarification_state,
    list_datasets,
    get_simulation_results,
    get_simulation_status,
    list_simulation_history,
    new_request_id,
    run_simulation,
    submit_challenge_followup,
)
from .storage import SimulationStore
from .validation import (
    validate_challenge_followup_payload,
    validate_answer_clarification_payload,
    validate_create_simulation_payload,
    validate_generate_challenge_payload,
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

    cors_origins = os.getenv(
        "SIMS_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    allowed_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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

    @app.get("/api/v1/datasets", status_code=200)
    async def get_datasets() -> Any:
        try:
            response = list_datasets()
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

    @app.post("/api/v1/simulations/{simulation_id}/challenge", status_code=200)
    async def post_generate_challenge(simulation_id: str, request: Request) -> Any:
        try:
            payload = await request.json()
        except Exception:
            return error_envelope(400, "VALIDATION_ERROR", "request body must be valid JSON")

        try:
            validated = validate_generate_challenge_payload(payload)
            response = generate_challenge(
                store=store,
                simulation_id=simulation_id,
                request_body=validated,
            )
        except ApiError as exc:
            return error_envelope(exc.status_code, exc.code, exc.message)

        return JSONResponse(status_code=200, content=response)

    @app.post("/api/v1/challenges/{challenge_id}/followup", status_code=200)
    async def post_challenge_followup(challenge_id: str, request: Request) -> Any:
        try:
            payload = await request.json()
        except Exception:
            return error_envelope(400, "VALIDATION_ERROR", "request body must be valid JSON")

        try:
            validated = validate_challenge_followup_payload(payload)
            response = submit_challenge_followup(
                store=store,
                challenge_id=challenge_id,
                request_body=validated,
            )
        except ApiError as exc:
            return error_envelope(exc.status_code, exc.code, exc.message)

        return JSONResponse(status_code=200, content=response)

    @app.get("/api/v1/simulations/{simulation_id}/results", status_code=200)
    async def get_simulation_results_by_id(simulation_id: str) -> Any:
        try:
            response = get_simulation_results(store, simulation_id)
        except ApiError as exc:
            return error_envelope(exc.status_code, exc.code, exc.message)

        return JSONResponse(status_code=200, content=response)

    @app.get("/api/v1/simulations/{simulation_id}/export", status_code=200)
    async def export_simulation_results_csv(simulation_id: str) -> Any:
        try:
            csv_iter = export_simulation_csv(store, simulation_id)
        except ApiError as exc:
            return error_envelope(exc.status_code, exc.code, exc.message)

        # Strip any character that could escape the Content-Disposition header
        # (CR/LF for response splitting, quote for attribute escape). If the
        # simulation_id is invalid the upstream service call will already have
        # raised NOT_FOUND; this is defense-in-depth.
        safe_id = "".join(c for c in simulation_id if c.isalnum() or c in ("_", "-"))[:32]
        return StreamingResponse(
            csv_iter,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="infinipol-{safe_id}-results.csv"'
            },
        )

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
