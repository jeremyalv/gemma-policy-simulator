#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[hooks] not a git repository"
  exit 1
fi

git config core.hooksPath .githooks
echo "[hooks] enabled .githooks as core.hooksPath"
