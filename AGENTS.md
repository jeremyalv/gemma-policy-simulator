# AGENTS.md

## Purpose
`gemma-policy-simulator` (SIMS) is a local-first synthetic multi-agent policy simulator. The system helps policymakers test policy variants against census-aligned synthetic personas before real-world rollout.

## Repo Map
- `apps/client/`: frontend application (UI, polling, visualization, pre-run clarification flow).
- `apps/server/`: backend application (API, simulation orchestration, storage).
- `packages/contracts/`: shared API schemas and generated types.
- `src/persona_engine/`: dataset loading, schema adapters, and persona sampling.
- `src/simulation_engine/`: prompt construction, Ollama execution, and JSON validation.
- `src/insights/`: aggregation, segmentation, summaries, and chart-ready transforms.
- `src/contracts/`: request/response schemas and validation rules.
- `src/storage/`: simulation history and export persistence.
- `data/schema/`: canonical schema docs for compatible persona datasets.
- `docs/architecture/`: architecture and system design plans.
- `docs/contracts/`: frontend-backend API contracts.
- `docs/adrs/`: architectural decisions.
- `.agents/skills/`: reusable workflows for review/debug/refactor/release.

## Rules
- Offline-first: core simulation must run without cloud APIs.
- API responses must use the `{ data, error, meta }` envelope.
- Frontend and backend integrate through `packages/contracts/` only; avoid ad-hoc payload shapes.
- Optimize defaults for M1 Pro laptops and provide degraded mode for lower-spec devices.
- Every simulated agent response must conform to the JSON output contract.
- Preserve auditability: store prompt template version, model version, dataset version, and seed.
- Keep persona data synthetic-only; never introduce real personal data.
- Enforce deterministic sampling with an explicit seed for reproducibility.
- Changes to `src/contracts/`, `src/simulation_engine/`, and `data/schema/` require tests or contract fixtures.

## Commands
- `./scripts/check.sh` runs lint/test checks if toolchains are present.
- `./scripts/test.sh` runs the configured test suite.
- `./scripts/setup-hooks.sh` enables repository git hooks.

## Workflows
1. Plan: update architecture docs and API contracts before implementation.
2. Build: run frontend and backend tracks in parallel against shared contracts.
3. Verify: run checks and contract tests; confirm reproducibility with fixed seed.
4. Review: include risk notes for representativeness, bias, and parsing failure modes.
5. Ship: document model/dataset versions and rollback steps in release notes.
