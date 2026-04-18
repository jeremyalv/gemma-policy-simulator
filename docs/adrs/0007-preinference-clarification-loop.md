# ADR-0007: Pre-Inference Clarification Loop (Optional, Multi-Turn)

## Status
Accepted

## Date
2026-04-18

## Context
The project needs policy clarification behavior similar to Codex plan mode, but the goal is to improve prompt quality before inference rather than challenge results after inference.

## Decision
Adopt an optional, multi-turn pre-run clarification loop. Users may skip clarifications and run simulation immediately. Clarification transcript is ephemeral and not stored in simulation history; only final refined prompt text is persisted.

## Consequences
Benefits:
- Higher prompt clarity before inference.
- Lower UX friction because run is never blocked.
- Cleaner history by storing final refined prompt instead of turn-by-turn chat.

Tradeoffs:
- Requires transient clarification state handling.
- Less forensic traceability because Q/A transcript is not persisted.
