# Contracts Package Guidance

- Contract updates are integration-critical; keep diffs small and explicit.
- Regenerate client/server types from one schema source.
- Preserve envelope semantics: `{ data, error, meta }`.
- Document all backward-incompatible changes before merge.
