# ADR-0003: Canonical Persona Schema with Dataset Adapters

## Status
Accepted

## Date
2026-04-18

## Context
SIMS should start with Nemotron USA personas but remain reusable for other countries and domains.

## Decision
Define a canonical persona schema and implement dataset-specific adapters into that schema. Sampling and prompt construction operate only on canonical fields.

## Consequences
Benefits:
- Plug-and-play dataset portability.
- Stable simulation and analytics interfaces.
- Lower risk when adding Indo or other regional datasets.

Tradeoffs:
- Upfront adapter and validation work.
- Requires schema versioning discipline.
