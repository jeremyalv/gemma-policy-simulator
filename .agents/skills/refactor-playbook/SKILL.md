# Refactor Playbook

## Goal
Improve structure without changing behavior.

## Workflow
1. Lock current behavior with tests before moving logic.
2. Perform small, reviewable transformations.
3. Keep public contracts stable unless explicitly planned.
4. Re-run checks after each logical step.
5. Document tradeoffs or deferred cleanup in follow-up notes.

## Guardrails
- Avoid mixed behavior + refactor commits.
- Prefer extracting pure functions over deep in-place mutation.
