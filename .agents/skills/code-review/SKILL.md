# Code Review Checklist

## Goal
Catch correctness, reliability, and regression risks before style issues.

## Checklist
1. Validate behavior changes against requirements and existing contracts.
2. Identify edge cases, null/empty paths, and error handling gaps.
3. Check state transitions, idempotency, and rollback safety.
4. Verify tests cover new behavior and high-risk branches.
5. Note any observability or logging blind spots.

## Output Format
- Findings first, ordered by severity.
- File + line references for each finding.
- Residual risk section if no critical findings exist.
