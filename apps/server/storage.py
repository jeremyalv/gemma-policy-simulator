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
                    refined_policy_text TEXT
                )
                """
            )

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
                    refined_policy_text
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            "refined_policy_text": row["refined_policy_text"],
        }
