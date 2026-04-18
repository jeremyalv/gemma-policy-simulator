# Debugging Workflow

## Goal
Find the smallest reproducible failure and fix root cause.

## Workflow
1. Reproduce with explicit inputs and expected output.
2. Narrow blast radius by bisecting code paths or conditions.
3. Confirm root cause with targeted instrumentation.
4. Implement minimal fix and add regression coverage.
5. Verify no neighboring regressions in related paths.

## Output
- Repro steps
- Root cause
- Fix summary
- Regression test added
