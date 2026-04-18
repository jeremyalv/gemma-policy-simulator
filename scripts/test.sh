#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f package.json ]] && command -v npm >/dev/null 2>&1; then
  npm run -s test --if-present
  exit 0
fi

if command -v pytest >/dev/null 2>&1 && [[ -d tests || -f pyproject.toml ]]; then
  pytest
  exit 0
fi

echo "[test] no test runner configured"
