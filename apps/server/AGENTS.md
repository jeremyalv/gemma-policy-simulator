# Server Guidance

- Keep handlers aligned with documented API contracts.
- Enforce strict input validation and stable error codes.
- Keep lifecycle transitions explicit and idempotent where possible.
- Emit metadata needed by frontend polling and traceability.
- Implement hardware-adaptive runtime profiles and sample-size clamping.
- Prefer single active run plus queueing for laptop-class deployments.
- Clarification loop must be optional and non-blocking for `/run`.
- Persist final refined prompt text only (do not persist clarification transcript).
