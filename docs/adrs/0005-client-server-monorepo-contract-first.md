# ADR-0005: Client/Server Monorepo with Contract-First Integration

## Status
Accepted

## Date
2026-04-18

## Context
The project is developed by at least two parallel tracks: frontend and backend. Without a shared contract boundary, integration drift and rework increase.

## Decision
Adopt a monorepo layout with:
- `apps/client` for frontend delivery
- `apps/server` for backend delivery
- `packages/contracts` as shared contract artifacts

Use contract-first sequencing: update contract docs/types first, then backend implementation, then frontend integration.

## Consequences
Benefits:
- Clear ownership boundaries with fast local iteration.
- Reduced integration churn via shared typed contracts.
- Better parallelism between frontend and backend tracks.

Tradeoffs:
- Requires discipline around contract versioning and merge order.
- Shared contract package becomes a critical path for interface changes.
