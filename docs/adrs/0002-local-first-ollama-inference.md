# ADR-0002: Local-First Inference via Ollama

## Status
Accepted

## Date
2026-04-18

## Context
SIMS requires offline, private, and low-cost execution for policy simulation in constrained environments.

## Decision
Use Ollama as the default local inference runtime for Gemma-family models. The simulation engine communicates through local REST calls and enforces structured JSON output parsing.

## Consequences
Benefits:
- No external API dependency for core simulation.
- Better privacy posture and predictable operational cost.
- Supports edge or low-connectivity deployment.

Tradeoffs:
- Hardware constraints affect throughput.
- Additional local model/runtime setup complexity.
