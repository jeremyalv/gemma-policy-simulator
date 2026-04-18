# ADR-0004: API Envelope and Async Simulation Lifecycle

## Status
Accepted

## Date
2026-04-18

## Context
Simulation runs are long-running and can exceed request timeouts. Frontend and backend also need a stable response format for predictable client behavior.

## Decision
Adopt a fixed JSON response envelope `{ data, error, meta }` for all API responses except CSV export streams. Use a two-step simulation lifecycle (`create` then `run`) with status polling and explicit lifecycle states (`pending`, `running`, `completed`, `failed`).

## Consequences
Benefits:
- Stable frontend parsing and error handling.
- Clear async control flow for long-running inference.
- Better support for draft/review workflows before expensive execution.

Tradeoffs:
- Additional endpoint complexity (`run`, `status`, `results`).
- Polling overhead unless future push-based updates are added.
