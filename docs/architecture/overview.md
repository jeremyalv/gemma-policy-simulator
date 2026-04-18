# SIMS Architecture Overview

## Mission
SIMS provides rapid, offline policy simulation using large synthetic persona datasets and local LLM inference.

## System Layers
1. Presentation Layer (`apps/client`)
- Policy input (text + presets), simulation history, results dashboard, and challenge/follow-up UX.
- Polling loop for async simulation status and incremental progress.

2. Application Layer (`apps/server`)
- Simulation service (CRUD + run orchestration + status + results).
- Challenge service (stateless challenge/follow-up loop).
- Export service (CSV and report artifacts).

3. Data and Inference Layer (`src/*`, local runtime)
- Loads census-aligned synthetic personas (default: Nemotron USA).
- Validates canonical schema and supports adapter-based dataset swaps.
- Samples reproducible cohorts by explicit seed and filters.
- Current Nemotron split mixes structured demographics (`sex`, `age`, `marital_status`, `education_level`, `occupation`, `city`, `state`, `zipcode`, `country`) with rich long-form persona text columns.
- Builds one prompt per persona with demographic grounding.
- Sends batched requests to local Ollama (`http://localhost:11434`).
- Parses and validates strict JSON outputs per agent.
- Aggregates approval, emotion, and rationale signals.
- Produces demographic cuts and representative quotes.
- Supports challenge/follow-up loop and future recommendations.
- Persists run artifacts in local SQLite/JSON storage.

## API Interaction Model
- Base API: `http://localhost:8000/api/v1`
- Envelope: `{ data, error, meta }` on all JSON endpoints.
- Simulation lifecycle: `pending -> running -> completed | failed`.
- Async execution: create simulation, trigger run, poll status, fetch results.

## Monorepo Delivery Model
- `apps/client` and `apps/server` are developed in parallel.
- `packages/contracts` is the shared integration boundary.
- Contract changes must land before implementation changes in either app.

## Request Lifecycle (Run Simulation)
1. Client triggers `POST /simulations/{id}/run`.
2. Server samples personas from dataset using filters and seed.
3. Prompt builder creates one isolated prompt per persona.
4. Ollama executes batched inference locally.
5. Aggregator computes summary, segments, emotions, and representative quotes.
6. Store persists raw and aggregated artifacts.
7. Client polls `GET /simulations/{id}/status`, then loads `GET /simulations/{id}/results`.

## Core Principles
- Local-first inference and data processing.
- Transparent and auditable pipeline.
- Deterministic simulation through explicit seeds and versioned prompts.
- Modular adapters for dataset and model portability.
- Hardware-adaptive execution for M1 Pro and lower-spec user devices.
