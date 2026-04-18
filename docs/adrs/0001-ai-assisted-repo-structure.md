# ADR-0001: AI-Assisted Repository Structure

## Status
Accepted

## Date
2026-04-18

## Context
The repository is intended to be actively maintained with AI coding agents. Prompt quality alone is not enough; project structure must encode intent, constraints, and workflows.

## Decision
Adopt a lightweight structure:
- `AGENTS.md` as the repository north star.
- `.agents/skills/` for reusable engineering workflows.
- `.githooks/` plus `scripts/` for local workflow checks.
- `docs/` for progressive context and decision history.
- Local `AGENTS.md` files for high-risk modules.

## Consequences
Benefits:
- Faster onboarding for humans and agents.
- More consistent execution patterns.
- Lower risk in sensitive areas.

Tradeoffs:
- Requires lightweight maintenance as code evolves.
