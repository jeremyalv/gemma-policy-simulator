# Development Workflow

## Daily Loop
1. Read `AGENTS.md` and the affected docs before editing.
2. Update architecture/contracts first for behavior or interface changes.
3. Implement in your ownership area (`apps/client` or `apps/server`).
4. Add tests or fixtures for schema and parsing behavior.
5. Run `./scripts/check.sh` and `./scripts/test.sh`.

## Frontend / Backend Coordination
1. Treat `docs/contracts/frontend-backend-v1.md` and `packages/contracts/` as integration truth.
2. Backend publishes endpoint readiness with example payload fixtures.
3. Frontend integrates through shared contract types, not handwritten interfaces.
4. Any envelope or status enum change requires same-day frontend sync.
5. Verify async path together: `create -> run -> status polling -> results`.

## Contract Consistency
- OpenAPI artifact at `packages/contracts/openapi/v1.json` is the canonical source of truth.
- Backend typed contracts in `packages/contracts/python/contracts_v1.py` are generated output and must not be hand-edited.
- Regenerate types with `python3 packages/contracts/scripts/generate_python_types.py`.
- Validate consistency with `python3 packages/contracts/scripts/check_contracts.py`.
- `./scripts/check.sh` runs the contract consistency check by default.

## Simulation-Specific Verification
- Confirm deterministic runs with fixed `sampling_seed`.
- Validate every agent output against JSON contract.
- Check segmentation outputs for missing-value buckets.
- Confirm run metadata includes model/dataset/prompt versions.

## Nemotron USA Local Dataset Setup
1. Create a Hugging Face account at [https://huggingface.co/join](https://huggingface.co/join).
2. Install CLI tooling:
   - `pip install -U "huggingface_hub[cli]"`
3. Create an access token at [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens), then login:
   - `huggingface-cli login`
4. Download dataset files locally:
   - `huggingface-cli download nvidia/Nemotron-Personas-USA --repo-type dataset --local-dir data/nemotron_usa --local-dir-use-symlinks False`
5. Configure backend environment:
   - `SIMS_DATASET_NEMOTRON_PATH=data/nemotron_usa`
   - `SIMS_DATASET_NEMOTRON_VERSION=1.1`
6. If local files are Parquet-only, install runtime reader dependencies:
   - `pip install datasets pyarrow`

## Performance Verification (Laptop Targets)
- Run at least one benchmark on M1 Pro using `interactive` and `balanced` profiles.
- Validate degraded mode on a lower-spec profile (reduced sample size and batch size).
- Ensure frontend polling remains responsive for runs longer than 60 seconds.
- Confirm server reports `effective_sample_size` when clamping occurs.

## Agreeability Calibration Workflow
1. Run baseline matrix:
   - `./scripts/calibration_matrix.sh`
2. Tune prompt/runtime knobs (for example `SIMS_RUN_TEMPERATURE`, `SIMS_RUN_TOP_P`) and restart server.
3. Re-run matrix and compare summaries:
   - baseline: `/tmp/infinipol-calibration/run-<baseline>/summary.md`
   - tuned: `/tmp/infinipol-calibration/run-<tuned>/summary.md`
4. Keep tuning only if:
   - `>=3` nonzero approval buckets in at least 70% of completed runs.
   - mean approvals are not consistently pinned high on controversial policies.

## High-Risk Changes
- Make intent explicit in commit message.
- Add rollback and risk note in PR.
- Request focused review.
