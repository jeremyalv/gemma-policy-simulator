"""SQLite storage for simulation draft metadata."""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class SimulationStore:
    db_path: Path

    def __post_init__(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS simulations (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    policy_text TEXT NOT NULL,
                    dataset TEXT NOT NULL,
                    sample_size INTEGER NOT NULL,
                    filters_json TEXT,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    completed_at TEXT,
                    mean_approval REAL,
                    refined_policy_text TEXT,
                    started_at TEXT,
                    runtime_profile TEXT,
                    effective_sample_size INTEGER,
                    estimated_seconds INTEGER,
                    run_idempotency_key TEXT,
                    run_request_fingerprint TEXT,
                    run_prompt_source TEXT,
                    clarification_status TEXT NOT NULL DEFAULT 'none',
                    clarification_turn_index INTEGER NOT NULL DEFAULT 0,
                    current_clarification_id TEXT
                )
                """
            )
            existing_columns = {
                row["name"]
                for row in conn.execute("PRAGMA table_info(simulations)").fetchall()
            }
            if "completed_at" not in existing_columns:
                conn.execute("ALTER TABLE simulations ADD COLUMN completed_at TEXT")
            if "mean_approval" not in existing_columns:
                conn.execute("ALTER TABLE simulations ADD COLUMN mean_approval REAL")
            if "started_at" not in existing_columns:
                conn.execute("ALTER TABLE simulations ADD COLUMN started_at TEXT")
            if "runtime_profile" not in existing_columns:
                conn.execute("ALTER TABLE simulations ADD COLUMN runtime_profile TEXT")
            if "effective_sample_size" not in existing_columns:
                conn.execute("ALTER TABLE simulations ADD COLUMN effective_sample_size INTEGER")
            if "estimated_seconds" not in existing_columns:
                conn.execute("ALTER TABLE simulations ADD COLUMN estimated_seconds INTEGER")
            if "run_idempotency_key" not in existing_columns:
                conn.execute("ALTER TABLE simulations ADD COLUMN run_idempotency_key TEXT")
            if "run_request_fingerprint" not in existing_columns:
                conn.execute("ALTER TABLE simulations ADD COLUMN run_request_fingerprint TEXT")
            if "run_prompt_source" not in existing_columns:
                conn.execute("ALTER TABLE simulations ADD COLUMN run_prompt_source TEXT")
            if "clarification_status" not in existing_columns:
                conn.execute("ALTER TABLE simulations ADD COLUMN clarification_status TEXT NOT NULL DEFAULT 'none'")
            if "clarification_turn_index" not in existing_columns:
                conn.execute("ALTER TABLE simulations ADD COLUMN clarification_turn_index INTEGER NOT NULL DEFAULT 0")
            if "current_clarification_id" not in existing_columns:
                conn.execute("ALTER TABLE simulations ADD COLUMN current_clarification_id TEXT")

    def insert_simulation(self, row: dict[str, Any]) -> None:
        filters_json = json.dumps(row.get("filters")) if row.get("filters") else None
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO simulations (
                    id,
                    title,
                    policy_text,
                    dataset,
                    sample_size,
                    filters_json,
                    status,
                    created_at,
                    completed_at,
                    mean_approval,
                    refined_policy_text
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["id"],
                    row["title"],
                    row["policy_text"],
                    row["dataset"],
                    row["sample_size"],
                    filters_json,
                    row["status"],
                    row["created_at"],
                    row.get("completed_at"),
                    row.get("mean_approval"),
                    row.get("refined_policy_text"),
                ),
            )

    def fetch_simulation(self, simulation_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM simulations WHERE id = ?",
                (simulation_id,),
            ).fetchone()

        if row is None:
            return None

        filters_value = json.loads(row["filters_json"]) if row["filters_json"] else None
        return {
            "id": row["id"],
            "title": row["title"],
            "policy_text": row["policy_text"],
            "dataset": row["dataset"],
            "sample_size": row["sample_size"],
            "filters": filters_value,
            "status": row["status"],
            "created_at": row["created_at"],
            "completed_at": row["completed_at"],
            "mean_approval": row["mean_approval"],
            "refined_policy_text": row["refined_policy_text"],
            "started_at": row["started_at"],
            "runtime_profile": row["runtime_profile"],
            "effective_sample_size": row["effective_sample_size"],
            "estimated_seconds": row["estimated_seconds"],
            "run_idempotency_key": row["run_idempotency_key"],
            "run_request_fingerprint": row["run_request_fingerprint"],
            "run_prompt_source": row["run_prompt_source"],
            "clarification_status": row["clarification_status"],
            "clarification_turn_index": row["clarification_turn_index"],
            "current_clarification_id": row["current_clarification_id"],
        }

    def count_simulations(self, status: str | None = None) -> int:
        query = "SELECT COUNT(*) AS total FROM simulations"
        params: tuple[Any, ...] = ()
        if status is not None:
            query += " WHERE status = ?"
            params = (status,)

        with self._connect() as conn:
            row = conn.execute(query, params).fetchone()

        return int(row["total"]) if row is not None else 0

    def list_simulations(
        self,
        *,
        page: int,
        limit: int,
        status: str | None,
        sort: str,
    ) -> list[dict[str, Any]]:
        sort_dir = "ASC" if sort.endswith(":asc") else "DESC"
        offset = (page - 1) * limit

        query = """
            SELECT id, title, status, sample_size, mean_approval, created_at, completed_at
            FROM simulations
        """
        params: list[Any] = []
        if status is not None:
            query += " WHERE status = ?"
            params.append(status)

        query += f" ORDER BY created_at {sort_dir} LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with self._connect() as conn:
            rows = conn.execute(query, tuple(params)).fetchall()

        return [
            {
                "id": row["id"],
                "title": row["title"],
                "status": row["status"],
                "sample_size": row["sample_size"],
                "mean_approval": row["mean_approval"],
                "created_at": row["created_at"],
                "completed_at": row["completed_at"],
            }
            for row in rows
        ]

    def delete_simulation(self, simulation_id: str) -> int:
        with self._connect() as conn:
            cursor = conn.execute(
                "DELETE FROM simulations WHERE id = ?",
                (simulation_id,),
            )
            return int(cursor.rowcount)

    def update_clarification_state(
        self,
        *,
        simulation_id: str,
        clarification_status: str,
        clarification_turn_index: int,
        current_clarification_id: str | None,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE simulations
                SET clarification_status = ?, clarification_turn_index = ?, current_clarification_id = ?
                WHERE id = ?
                """,
                (
                    clarification_status,
                    clarification_turn_index,
                    current_clarification_id,
                    simulation_id,
                ),
            )

    def update_refined_prompt_and_clarification_state(
        self,
        *,
        simulation_id: str,
        refined_policy_text: str,
        clarification_status: str,
        clarification_turn_index: int,
        current_clarification_id: str | None,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE simulations
                SET refined_policy_text = ?, clarification_status = ?, clarification_turn_index = ?, current_clarification_id = ?
                WHERE id = ?
                """,
                (
                    refined_policy_text,
                    clarification_status,
                    clarification_turn_index,
                    current_clarification_id,
                    simulation_id,
                ),
            )

    def start_simulation_run(
        self,
        *,
        simulation_id: str,
        started_at: str,
        runtime_profile: str,
        effective_sample_size: int,
        estimated_seconds: int,
        run_idempotency_key: str | None,
        run_request_fingerprint: str,
        run_prompt_source: str,
    ) -> int:
        with self._connect() as conn:
            cursor = conn.execute(
                """
                UPDATE simulations
                SET
                    status = 'running',
                    started_at = ?,
                    runtime_profile = ?,
                    effective_sample_size = ?,
                    estimated_seconds = ?,
                    run_idempotency_key = ?,
                    run_request_fingerprint = ?,
                    run_prompt_source = ?
                WHERE id = ? AND status = 'pending'
                """,
                (
                    started_at,
                    runtime_profile,
                    effective_sample_size,
                    estimated_seconds,
                    run_idempotency_key,
                    run_request_fingerprint,
                    run_prompt_source,
                    simulation_id,
                ),
            )
            return int(cursor.rowcount)
