# Contracts Guidance

- Backward-incompatible changes require version bumps.
- Keep `{ data, error, meta }` envelopes stable and machine-readable.
- Validate all inbound/outbound payloads at boundaries.
- Keep simulation lifecycle enum stable: `pending|running|completed|failed`.
- Update `docs/contracts/frontend-backend-v1.md` with any contract change.
