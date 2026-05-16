# InfiniPol: Trustworthy Local Policy Testing for Low-Connectivity Teams

## Subtitle
Local-first synthetic policy simulation with Gemma 4, transparent telemetry, and auditable outputs.

## One-line thesis
Policy teams should not have to choose between speed and safety; InfiniPol gives them a local, explainable pre-rollout testing loop.

## 1) Context and stakes: why this matters now

Many policy teams operate in conditions where good decision support is hardest to access: unreliable internet, fragmented field feedback, and sensitive local context that cannot be casually pushed to external services. Yet these teams still make high-impact decisions under time pressure.

The current default is usually one of two weak options:
- informal internal review, which is fast but hard to audit,
- cloud-heavy tooling, which is powerful but brittle in low-connectivity and privacy-constrained environments.

InfiniPol is built for this exact gap. It provides a local-first simulation workflow where teams can test policy drafts against synthetic personas, inspect quality telemetry, and export traceable evidence before rollout.

Core claim: InfiniPol reduces blind policy iteration risk by making pre-rollout testing reproducible, auditable, and operational even when connectivity is unstable.

## 2) Product workflow: from draft to traceable evidence

InfiniPol is intentionally narrow and practical. The user flow is:

1. Create a simulation draft from policy text (`POST /api/v1/simulations`).
2. Start local run execution (`POST /api/v1/simulations/{id}/run`).
3. Poll status with lifecycle + run-quality telemetry (`GET /api/v1/simulations/{id}/status`).
4. Inspect aggregated outcomes (`GET /api/v1/simulations/{id}/results`).
5. Export persona-level responses for audit (`GET /api/v1/simulations/{id}/export`).
6. Stress-test interpretation through challenge roundtrip:
   - `POST /api/v1/simulations/{id}/challenge`
   - `POST /api/v1/challenges/{challenge_id}/followup`

For MVP sign-off, the frontend is run in strict real-backend mode (`VITE_USE_MOCKS=false`). No hidden mock fallback is used in the judge path.

## 3) Architecture: local-first by design, contract-first in integration

InfiniPol uses a monorepo with explicit FE/BE contract boundaries:

- Frontend (`apps/client`): authoring, polling, results UI, challenge flow.
- Backend (`apps/server`): orchestration, persona sampling, inference, storage, aggregation, export.
- Shared contracts (`packages/contracts`): OpenAPI and generated types used as integration truth.

Local execution path:

- Gemma 4 served through local Ollama.
- Dataset-backed persona sampling from local files.
- Async run worker for non-blocking execution.
- Raw outputs + telemetry persisted to local artifacts and SQLite.

Design priorities:
- offline-first operation,
- deterministic reproducibility (seeded behavior),
- transparent failure/lifecycle semantics.

## 4) Safety and trust mechanisms

InfiniPol is designed to show its work instead of hiding model behavior.

1. Lifecycle guards:
- Results and export are blocked until completion.
- Clear `404` and `409` semantics for not-found and not-complete states.

2. Run-quality telemetry:
- retry and invalid-output counters,
- attempted/success/failed counts and success rate,
- partial-run visibility,
- stable failure code/message fields for diagnosability.

3. Auditability:
- persisted raw outputs,
- deterministic artifact trail,
- metadata needed for run traceability.

4. Contract stability:
- JSON endpoints follow `{ data, error, meta }`.
- FE and BE sync through shared contracts rather than ad hoc payloads.

These are observable runtime behaviors, not documentation-only promises.

## 5) Evidence: what is already proven

We validated this as a real integrated system with artifacts and tests.

Evidence sources:
- API artifact pack: `docs/signoff/artifacts/*`
- Sign-off report: `docs/frontend/SIGNOFF_EVIDENCE_2026-05-13.md`
- Contract checker: `packages/contracts/scripts/check_contracts.py`

Key integration proofs:
- `GET /datasets` returns active + coming_v2 entries (`1_datasets.json`).
- Completed runs expose telemetry in status (`5_status_*.json`).
- Results and export are live and functional (`6_results_*.json`, `7_export_*.csv`).
- Challenge roundtrip is implemented (`8_challenge_generate.json`, `9_challenge_followup.json`).
- Lifecycle/not-found safeguards are explicit (`10_lifecycle_409.json`, `11_not_found_404.json`).

Reliability gates:
- Backend tests: 113/113 pass.
- Frontend tests: 19/19 pass.
- Contract synchronization checks pass.

## 6) Practical utility example

A policy team comparing two variants of the same proposal can run both drafts locally and inspect:
- approval distribution and central tendency,
- which demographic segments are likely weak points,
- rationale and emotional patterns for qualitative interpretation,
- follow-up challenges that force refinement.

This turns policy drafting from one-shot intuition into an iterative, documented decision loop.

## 7) Limitations (explicit)

InfiniPol is decision support, not ground truth. Current limitations:
- output concentration can still occur on some policy/model combinations,
- synthetic personas are a proxy, not a replacement for real consultation,
- quickstart dataset mode is for usability/demo speed, not representativeness benchmarking.

We treat these limits as first-class transparency requirements in both docs and demo narrative.

## 8) Next steps after MVP

1. Improve opinion dispersion calibration while preserving contract compatibility.
2. Strengthen challenge scoring quality and quote representativeness.
3. Expand judge-friendly deployment packaging and deterministic demo presets.

## 9) Why this is a Safety & Trust submission

InfiniPol addresses trust at the workflow level:
- local-first execution for constrained environments,
- explicit telemetry and lifecycle semantics for explainability,
- reproducible artifact trail for accountable policy iteration.

The contribution is not just model usage. It is a practical operating pattern: teams can test, inspect, and revise policy drafts with transparent evidence before real-world impact.
