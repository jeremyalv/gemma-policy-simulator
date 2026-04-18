#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ran_any=0

echo "[check] starting quality checks"

if [[ -f package.json ]] && command -v npm >/dev/null 2>&1; then
  ran_any=1
  echo "[check] npm lint/test (if present)"
  npm run -s lint --if-present
  npm run -s test --if-present
fi

if [[ -f pyproject.toml || -f requirements.txt ]] ; then
  if command -v ruff >/dev/null 2>&1; then
    ran_any=1
    echo "[check] ruff"
    ruff check .
  fi
  if command -v pytest >/dev/null 2>&1; then
    ran_any=1
    echo "[check] pytest"
    pytest
  fi
fi

if [[ "$ran_any" -eq 0 ]]; then
  echo "[check] no recognized toolchain yet; configure package manager or test runner"
fi

echo "[check] done"
