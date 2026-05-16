#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/.runtime/infinipol"
mkdir -p "$RUNTIME_DIR"

QUICKSTART="${QUICKSTART:-0}"
if [[ "$QUICKSTART" == "1" || "$QUICKSTART" == "true" ]]; then
  ENV_FILE="$ROOT_DIR/.env.quickstart"
  DEFAULT_SAMPLE_SIZE="${VITE_DEFAULT_SAMPLE_SIZE:-20}"
else
  ENV_FILE="$ROOT_DIR/.env"
  DEFAULT_SAMPLE_SIZE="${VITE_DEFAULT_SAMPLE_SIZE:-500}"
fi

BACKEND_READY_URL="${BACKEND_READY_URL:-http://localhost:8000/api/v1/datasets}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[up] missing env file: $ENV_FILE"
  echo "[up] create it or run with QUICKSTART=1 to use .env.quickstart"
  exit 1
fi

read_env_value() {
  local key="$1"
  local file="$2"
  local value
  value="$(awk -F= -v k="$key" '$1==k{v=$0} END{print v}' "$file" | cut -d= -f2- | tr -d '\r')"
  value="${value%\"}"
  value="${value#\"}"
  echo "$value"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[up] missing command: $1"
    exit 1
  fi
}

is_port_listening() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_http() {
  local url="$1"
  local timeout_s="${2:-30}"
  local end=$((SECONDS + timeout_s))
  while (( SECONDS < end )); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

start_process() {
  local name="$1"
  local cmd="$2"
  local pid_file="$3"
  local log_file="$4"

  if [[ -f "$pid_file" ]]; then
    local old_pid
    old_pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "$old_pid" ]] && kill -0 "$old_pid" >/dev/null 2>&1; then
      echo "[up] $name already running (pid=$old_pid)"
      return 0
    fi
  fi

  echo "[up] starting $name..."
  nohup bash -lc "$cmd" >"$log_file" 2>&1 &
  local pid=$!
  echo "$pid" >"$pid_file"
  sleep 1

  if ! kill -0 "$pid" >/dev/null 2>&1; then
    echo "[up] failed to start $name. Last logs:"
    tail -n 40 "$log_file" || true
    exit 1
  fi

  echo "[up] $name started (pid=$pid)"
}

require_cmd curl
require_cmd lsof
require_cmd python3
require_cmd npm
require_cmd ollama

if [[ ! -d "$ROOT_DIR/apps/client/node_modules" ]]; then
  echo "[up] frontend dependencies not installed: apps/client/node_modules missing"
  echo "[up] run: (cd apps/client && npm ci)"
  exit 1
fi

if ! python3 -c "import uvicorn" >/dev/null 2>&1; then
  echo "[up] python dependency missing: uvicorn"
  echo "[up] run: pip install -r requirements.txt"
  exit 1
fi

RUN_MODEL="$(read_env_value "SIMS_RUN_MODEL" "$ENV_FILE")"
if [[ -z "$RUN_MODEL" ]]; then
  RUN_MODEL="gemma:e4b"
fi

echo "[up] quickstart=$QUICKSTART"
echo "[up] env_file=$ENV_FILE"
echo "[up] model=$RUN_MODEL"

OLLAMA_PID_FILE="$RUNTIME_DIR/ollama.pid"
SERVER_PID_FILE="$RUNTIME_DIR/server.pid"
CLIENT_PID_FILE="$RUNTIME_DIR/client.pid"

OLLAMA_LOG="$RUNTIME_DIR/ollama.log"
SERVER_LOG="$RUNTIME_DIR/server.log"
CLIENT_LOG="$RUNTIME_DIR/client.log"

if is_port_listening 11434; then
  echo "[up] ollama port 11434 already listening; reusing existing service"
else
  start_process "ollama" "ollama serve" "$OLLAMA_PID_FILE" "$OLLAMA_LOG"
fi

if ! wait_for_http "http://localhost:11434/api/tags" 20; then
  echo "[up] ollama API did not become ready at http://localhost:11434"
  echo "[up] check logs: $OLLAMA_LOG"
  exit 1
fi

if ! ollama list | awk '{print $1}' | grep -Fxq "$RUN_MODEL"; then
  echo "[up] model '$RUN_MODEL' is not installed locally"
  echo "[up] run: ollama pull $RUN_MODEL"
  echo "[up] continuing startup (simulation runs will fail until model is pulled)"
fi

if is_port_listening 8000; then
  echo "[up] backend port 8000 already listening; reusing existing service"
else
  start_process "backend" "cd '$ROOT_DIR' && python3 -m uvicorn apps.server.app:app --host 0.0.0.0 --port 8000 --reload --env-file '$ENV_FILE'" "$SERVER_PID_FILE" "$SERVER_LOG"
fi

if ! wait_for_http "$BACKEND_READY_URL" 30; then
  echo "[up] backend did not become ready at $BACKEND_READY_URL"
  echo "[up] check logs: $SERVER_LOG"
  exit 1
fi

if is_port_listening 5173; then
  echo "[up] frontend port 5173 already listening; reusing existing service"
else
  start_process "frontend" "cd '$ROOT_DIR/apps/client' && VITE_USE_MOCKS=false VITE_API_BASE_URL=http://localhost:8000 VITE_DEFAULT_SAMPLE_SIZE='$DEFAULT_SAMPLE_SIZE' npm run dev -- --host 0.0.0.0 --port 5173 --strictPort" "$CLIENT_PID_FILE" "$CLIENT_LOG"
fi

if ! wait_for_http "http://localhost:5173" 30; then
  echo "[up] frontend did not become ready at http://localhost:5173"
  echo "[up] check logs: $CLIENT_LOG"
  exit 1
fi

echo "[up] ready"
echo "[up] frontend: http://localhost:5173"
echo "[up] backend:  http://localhost:8000"
echo "[up] ready:    $BACKEND_READY_URL"
echo "[up] logs:     $RUNTIME_DIR"
