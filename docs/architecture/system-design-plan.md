# SIMS System Design Plan

## 1. Goals
- Simulate policy reactions from synthetic populations within seconds to minutes.
- Run entirely offline using local Ollama + Gemma.
- Produce traceable, segmented insights for policy decisions.
- Support iterative policy refinement through an optional pre-run clarification loop.

## 2. Non-Goals (V1)
- Real-time multi-user collaboration.
- Real citizen data ingestion.
- Full distributed microservices deployment.

## 3. Functional Requirements
- Create and store simulation drafts before execution.
- Support optional multi-turn pre-run clarification to refine policy prompt text.
- Trigger async simulation runs and expose progress polling.
- Return full aggregate and segmented results after completion.
- Persist simulation history and enable CSV export.
- Persist only the final refined prompt text, not clarification Q/A history.
- Support dataset-aware filter/segment capabilities (only enable filters available in the active dataset schema).

## 4. Quality Attributes
- Privacy: synthetic data only, fully local execution.
- Reproducibility: deterministic cohort sampling with explicit seed.
- Reliability: strict output-schema validation and retry/fail policy.
- Performance: usable interactive runs on M1 Pro and degraded mode for lower-spec devices.
- Explainability: quote-level traceability to persona and model metadata.

## 5. Logical Components
- `api_gateway`
  - validates envelope and route-level schemas.
  - handles simulation lifecycle endpoints and pagination.
- `persona_engine`
  - `dataset_loader`: read Parquet/CSV datasets.
  - `schema_adapter`: map dataset fields to canonical schema.
  - `sampler`: apply filters and deterministic sampling.
  - `capability_registry`: exposes filterable/segmentable fields per dataset.
- `simulation_engine`
  - `prompt_builder`: persona + policy + output-contract prompt.
  - `ollama_client`: batched local generation calls.
  - `response_parser`: strict JSON extraction and validation.
  - `result_aggregator`: summary and segmentation computations.
- `clarification_engine`
  - generates optional pre-run clarification questions.
  - synthesizes refined prompt text from answered clarifications.
- `storage`
  - `simulation_store`: lifecycle, run metadata, and outputs.
  - `artifact_store`: CSV exports and optional cached summaries.

## 6. Layered Deployment Shape
- Presentation: Streamlit/Gradio client in `apps/client`.
- Application: FastAPI server in `apps/server`.
- Data/Inference: local dataset + persona engine + Ollama runtime + SQLite artifacts.

## 7. API Surface (V1)
- `POST /simulations`
- `POST /simulations/{id}/clarifications/generate`
- `POST /clarifications/{clarification_id}/answer`
- `GET /simulations/{id}/clarifications`
- `POST /simulations/{id}/run`
- `GET /simulations/{id}/status`
- `GET /simulations/{id}/results`
- `GET /simulations`
- `DELETE /simulations/{id}`
- `GET /datasets`
- `GET /simulations/{id}/export`

## 8. State Machine
- `pending`: simulation exists, no inference started.
- `running`: inference in progress, progress metrics available.
- `completed`: results available.
- `failed`: terminal error; include machine-readable error code.

## 9. Data Flow
1. Client creates simulation draft (`POST /simulations`).
2. Client optionally iterates clarifications (`POST /simulations/{id}/clarifications/generate`, `POST /clarifications/{clarification_id}/answer`).
3. Client starts run (`POST /simulations/{id}/run`) with base or refined prompt.
4. API marks status `running` and invokes simulation engine.
5. Simulation engine samples personas and performs batched inference.
6. Parsed outputs are aggregated; status updated to `completed` or `failed`.
7. Client polls status and fetches full results.

## 9.1 Dataset Baseline (Nemotron Current Split)
Observed structured fields used for filtering/segmentation:
- `sex`, `age`, `marital_status`, `education_level`, `occupation`, `city`, `state`, `zipcode`, `country`

Observed long-form text persona context fields:
- `professional_persona`, `sports_persona`, `arts_persona`, `travel_persona`, `culinary_persona`
- `persona`, `cultural_background`, `skills_and_expertise`, `skills_and_expertise_list`
- `hobbies_and_interests`, `hobbies_and_interests_list`, `career_goals_and_ambitions`

Adapter rule:
- Use `uuid` as canonical `persona_id`.
- Treat missing canonical fields (for example explicit income/ethnicity) as dataset-dependent and nullable.

## 10. Hardware-Adaptive Execution Plan (M1 Pro + Lower Spec)
- Runtime profiles:
  - `interactive`: faster feedback, lower sample size.
  - `balanced`: default for demo quality/performance.
  - `thorough`: slower, higher sample size for deeper analysis.
- Device capability probe at server startup determines:
  - max sample size,
  - default batch size,
  - max concurrent runs (default `1` on laptops).
- Server may clamp requested sample size to device-safe limits and must return the effective sample size in status/result metadata.
- Suggested defaults:
  - M1 Pro baseline: default `30-100` agents, cap around `300`.
  - Lower-spec laptops: default `20-100` agents, cap around `150`.
- Optional two-phase UX:
  - phase 1 quick preview (small sample),
  - phase 2 refine run (larger sample) on user confirmation.

## 11. Error Handling Strategy
- Input validation failures: `400` with stable `error.code`.
- Not found resources: `404`.
- Lifecycle conflicts (already running/completed): `409`.
- Ollama runtime/parsing failures: `500` and status `failed`.
- Partial parsing failures: retry once; include invalid-count metrics.
- Unsupported filters for selected dataset: `400` with `error.code=UNSUPPORTED_FILTER`.

## 12. Key Architecture Decisions
- Async + polling: avoids HTTP timeouts for long-running local inference.
- SQLite first: zero-setup local persistence for single-machine demo.
- Format-agnostic dataset adapter: isolates source-schema differences.
- No per-persona OS threads: batched inference gives isolation with lower overhead.
- Clarification loop is optional and non-blocking: users can skip and run directly.
- Only final refined prompt text is persisted in simulation history.

## 13. Capacity and Scaling (POC to V2)
- V1 default is single-node local deployment.
- Keep API stateless so horizontal scaling is possible in V2.
- If concurrency increases, move run execution behind a queue worker.
- Add result caching for repeated history/result fetches.
- For laptop deployments, prioritize one active run with queued execution.

## 14. V1 Delivery Plan (2-3 weeks)
1. Week 1
- Backend: implement simulation lifecycle APIs and schema validation.
- Backend: integrate Nemotron adapter and deterministic sampler.
- Backend: add device capability probe and runtime profile selection.
- Frontend: scaffold simulation create/list/status/results pages with mock contract fixtures.
2. Week 2
- Backend: add optional pre-run clarification endpoints and refined prompt synthesis.
- Frontend: wire clarification UX, polling UX, and error-state UX.
- Integration: run contract compatibility checks on every merged endpoint.
3. Week 3
- Backend: add export endpoint and harden retries/error envelopes.
- Frontend: finalize charts, representative quote explorer, history filtering, and profile selection UI.
- Integration: end-to-end test `create -> optional clarifications -> run -> status -> results` flow.
- Integration: benchmark and tune on M1 Pro baseline and one lower-spec profile.

## 15. Team Topology and Ownership
- Frontend track owner: `apps/client` and client integration adapters.
- Backend track owner: `apps/server`, `src/*` simulation modules, and persistence.
- Shared ownership: `packages/contracts`, `docs/contracts`, and ADR updates.
- Merge policy: contract changes merge first, then backend/client implementation changes.

## 16. Collaboration Protocol
1. Propose contract change in `docs/contracts/frontend-backend-v1.md`.
2. Update `packages/contracts` schema/types in same PR.
3. Backend implements endpoint + contract tests.
4. Frontend consumes generated/shared types, no manual payload typing.
5. Integration PR validates lifecycle happy path and one failure path.

## 17. Component Ownership Map
| Component | Owner concern | Depends on |
|---|---|---|
| `apps/client/*` | UX, charts, polling, clarification UI | REST API + shared contracts |
| `apps/server/*` | API lifecycle, validation, orchestration | simulation modules |
| `src/persona_engine/*` | dataset loading/filtering/sampling | dataset files + adapter |
| `src/simulation_engine/*` | prompting, inference calls, parsing | Ollama runtime |
| `src/insights/*` | statistics, breakdowns, quote selection | parsed agent responses |
| `src/storage/*` | run persistence + exports | local SQLite/JSON |
| `packages/contracts/*` | shared request/response schemas | docs/contracts |

## 18. V2 Extensions
- `POST /simulations/compare` for multi-run comparative analysis.
- `GET /simulations/{id}/recommendations` for policy rollout guidance.
- Indonesia dataset adapter and localization tuning.
