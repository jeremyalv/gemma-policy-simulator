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

## Simulation-Specific Verification
- Confirm deterministic runs with fixed `sampling_seed`.
- Validate every agent output against JSON contract.
- Check segmentation outputs for missing-value buckets.
- Confirm run metadata includes model/dataset/prompt versions.

## Performance Verification (Laptop Targets)
- Run at least one benchmark on M1 Pro using `interactive` and `balanced` profiles.
- Validate degraded mode on a lower-spec profile (reduced sample size and batch size).
- Ensure frontend polling remains responsive for runs longer than 60 seconds.
- Confirm server reports `effective_sample_size` when clamping occurs.

## High-Risk Changes
- Make intent explicit in commit message.
- Add rollback and risk note in PR.
- Request focused review.
