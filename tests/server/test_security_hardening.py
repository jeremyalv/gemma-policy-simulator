"""Security regression tests for path traversal, CSV formula injection, and ID validation."""
from __future__ import annotations

import sqlite3
from pathlib import Path
from urllib.parse import quote

import pytest

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient

from apps.server.app import create_app
from apps.server.service import _csv_safe, _SIM_ID_RE


# ──────────────────────────────────────────────────────────────────────────
# 1. simulation_id format validation prevents path traversal
# ──────────────────────────────────────────────────────────────────────────

def test_sim_id_regex_accepts_real_ids() -> None:
    assert _SIM_ID_RE.match("sim_8c97b8f8")
    assert _SIM_ID_RE.match("sim_001")
    assert _SIM_ID_RE.match("sim_a-b_c")


def test_sim_id_regex_rejects_path_traversal() -> None:
    assert _SIM_ID_RE.match("sim_../etc") is None
    assert _SIM_ID_RE.match("sim_../../secret") is None
    assert _SIM_ID_RE.match("sim_/absolute") is None
    assert _SIM_ID_RE.match("sim_\\backslash") is None
    assert _SIM_ID_RE.match("../etc/passwd") is None


def test_sim_id_regex_rejects_crlf() -> None:
    # Header injection payload — must not match
    assert _SIM_ID_RE.match("sim_abc\r\nX-Injected: 1") is None
    assert _SIM_ID_RE.match("sim_abc\nfoo") is None


def test_delete_with_invalid_simulation_id_returns_404_not_500(tmp_path: Path) -> None:
    """Path-traversal payloads must 404, never reach the artifact unlink path."""
    app = create_app(db_path=tmp_path / "sims.db")
    client = TestClient(app)
    # Plain text traversal — must not match the regex; ID validation fires
    response = client.delete("/api/v1/simulations/sim_..%2Fsecret")
    assert response.status_code == 404
    # Direct traversal (Starlette will strip path components, so we just
    # confirm we don't 5xx — never call .unlink on a normalized path).
    response2 = client.delete("/api/v1/simulations/sim_with..dotdot")
    assert response2.status_code == 404


# ──────────────────────────────────────────────────────────────────────────
# 2. CSV formula injection neutralisation
# ──────────────────────────────────────────────────────────────────────────

def test_csv_safe_neutralises_excel_formula_prefixes() -> None:
    assert _csv_safe("=SUM(A1:A5)").startswith("'")
    assert _csv_safe("+1+1").startswith("'")
    assert _csv_safe("-2+3").startswith("'")
    assert _csv_safe("@cmd").startswith("'")
    assert _csv_safe("\tinjected").startswith("'")
    assert _csv_safe("\rinjected").startswith("'")


def test_csv_safe_leaves_normal_text_unchanged() -> None:
    assert _csv_safe("Strong support") == "Strong support"
    assert _csv_safe("23.5%") == "23.5%"
    assert _csv_safe("") == ""
    assert _csv_safe(None) == ""
    assert _csv_safe(42) == "42"
