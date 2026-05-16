#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime/infinipol"

stop_pidfile() {
  local name="$1"
  local pid_file="$2"

  if [[ ! -f "$pid_file" ]]; then
    echo "[down] $name: not running (no pid file)"
    return
  fi

  local pid
  pid="$(cat "$pid_file" 2>/dev/null || true)"
  if [[ -z "$pid" ]]; then
    rm -f "$pid_file"
    echo "[down] $name: stale pid file removed"
    return
  fi

  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "[down] stopping $name (pid=$pid)"
    pkill -TERM -P "$pid" >/dev/null 2>&1 || true
    kill "$pid" >/dev/null 2>&1 || true
    sleep 1
    if kill -0 "$pid" >/dev/null 2>&1; then
      pkill -KILL -P "$pid" >/dev/null 2>&1 || true
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  else
    echo "[down] $name: process already stopped"
  fi

  rm -f "$pid_file"
}

stop_pidfile "frontend" "$RUNTIME_DIR/client.pid"
stop_pidfile "backend" "$RUNTIME_DIR/server.pid"
stop_pidfile "ollama" "$RUNTIME_DIR/ollama.pid"

echo "[down] done"
