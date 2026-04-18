# Shared Contracts

Shared schema artifacts used by both `apps/client` and `apps/server`.

Canonical source of truth:
- `openapi/v1.json` (OpenAPI-first contract artifact)

Generated/consumable backend contract types:
- `python/contracts_v1.py` (auto-generated `TypedDict`/`Literal` module)
- `python/__init__.py` (stable import surface)

Local commands:
- `python3 packages/contracts/scripts/generate_python_types.py` regenerates backend contract types.
- `python3 packages/contracts/scripts/generate_python_types.py --check` fails when generated types are stale.
- `python3 packages/contracts/scripts/check_contracts.py` validates contract structure and generated type sync.

Rules:
- Contract changes require synchronized updates to `docs/contracts/frontend-backend-v1.md`.
- Breaking changes require versioning and explicit migration notes.
- OpenAPI is canonical; generated Python types must not be hand-edited.
