"""Unit tests for the _call_ollama HTTP layer in simulation_runner.

R2-B audit flagged the entire HTTP error branch tree as untested — every
real-world failure mode (HTTP 5xx, connection refused, timeout, malformed JSON)
goes through this path and was never exercised below the mock boundary.
"""
from __future__ import annotations

import io
import json
from urllib import error
from urllib.error import HTTPError, URLError

import pytest

from apps.server import simulation_runner
from apps.server.simulation_runner import SimulationRunError, _call_ollama


# ──────────────────────────────────────────────────────────────────────────────
# HTTPError (5xx / 4xx from Ollama)
# ──────────────────────────────────────────────────────────────────────────────

def _make_http_error(code: int, body: bytes = b"") -> HTTPError:
    return HTTPError(
        url="http://localhost:11434/api/generate",
        code=code,
        msg="server error",
        hdrs=None,  # type: ignore[arg-type]
        fp=io.BytesIO(body),
    )


def test_call_ollama_http_500_raises_runtime_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def _fake_urlopen(*_a, **_k):
        raise _make_http_error(500, b"internal server error")

    monkeypatch.setattr(simulation_runner.request, "urlopen", _fake_urlopen)

    with pytest.raises(SimulationRunError) as exc_info:
        _call_ollama("hi")
    assert exc_info.value.code == "RUNTIME_ERROR"
    assert exc_info.value.retryable is True
    assert "HTTP 500" in exc_info.value.message
    assert "internal server error" in exc_info.value.message


def test_call_ollama_http_error_with_empty_body(monkeypatch: pytest.MonkeyPatch) -> None:
    def _fake_urlopen(*_a, **_k):
        raise _make_http_error(503, b"")

    monkeypatch.setattr(simulation_runner.request, "urlopen", _fake_urlopen)

    with pytest.raises(SimulationRunError) as exc_info:
        _call_ollama("hi")
    assert "HTTP 503" in exc_info.value.message


# ──────────────────────────────────────────────────────────────────────────────
# URLError (connection refused, DNS failure)
# ──────────────────────────────────────────────────────────────────────────────

def test_call_ollama_connection_refused_raises_retryable_runtime_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def _fake_urlopen(*_a, **_k):
        raise URLError("[Errno 111] Connection refused")

    monkeypatch.setattr(simulation_runner.request, "urlopen", _fake_urlopen)

    with pytest.raises(SimulationRunError) as exc_info:
        _call_ollama("hi")
    assert exc_info.value.code == "RUNTIME_ERROR"
    assert exc_info.value.retryable is True
    assert "failed to reach model runtime" in exc_info.value.message
    assert "Connection refused" in exc_info.value.message


# ──────────────────────────────────────────────────────────────────────────────
# TimeoutError
# ──────────────────────────────────────────────────────────────────────────────

def test_call_ollama_timeout_raises_retryable_runtime_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def _fake_urlopen(*_a, **_k):
        raise TimeoutError("request timed out")

    monkeypatch.setattr(simulation_runner.request, "urlopen", _fake_urlopen)

    with pytest.raises(SimulationRunError) as exc_info:
        _call_ollama("hi")
    assert exc_info.value.code == "RUNTIME_ERROR"
    assert exc_info.value.retryable is True
    assert "timed out" in exc_info.value.message


# ──────────────────────────────────────────────────────────────────────────────
# Malformed JSON response body
# ──────────────────────────────────────────────────────────────────────────────

class _FakeResp:
    def __init__(self, body: bytes) -> None:
        self._body = body
    def __enter__(self):
        return self
    def __exit__(self, *_):
        return False
    def read(self) -> bytes:
        return self._body


def test_call_ollama_invalid_json_raises_parse_error(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        simulation_runner.request,
        "urlopen",
        lambda *_a, **_k: _FakeResp(b"not json at all"),
    )

    with pytest.raises(SimulationRunError) as exc_info:
        _call_ollama("hi")
    assert exc_info.value.code == "PARSE_ERROR"
    assert exc_info.value.retryable is True
    assert exc_info.value.invalid_output is True


# ──────────────────────────────────────────────────────────────────────────────
# Generic Exception fall-through
# ──────────────────────────────────────────────────────────────────────────────

def test_call_ollama_unexpected_exception_caught_as_runtime_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def _fake_urlopen(*_a, **_k):
        raise RuntimeError("something weird")

    monkeypatch.setattr(simulation_runner.request, "urlopen", _fake_urlopen)

    with pytest.raises(SimulationRunError) as exc_info:
        _call_ollama("hi")
    assert exc_info.value.code == "RUNTIME_ERROR"
    assert "unexpected model runtime error" in exc_info.value.message
    assert "something weird" in exc_info.value.message


# ──────────────────────────────────────────────────────────────────────────────
# Happy path — verify it returns the parsed envelope
# ──────────────────────────────────────────────────────────────────────────────

def test_call_ollama_happy_path_returns_parsed_inner_response(monkeypatch: pytest.MonkeyPatch) -> None:
    # Ollama wraps the model's JSON output in a "response" string field.
    # _call_ollama parses both layers and returns the inner JSON object.
    body = json.dumps({"response": '{"approval": 4}', "done": True}).encode("utf-8")
    monkeypatch.setattr(
        simulation_runner.request,
        "urlopen",
        lambda *_a, **_k: _FakeResp(body),
    )

    result = _call_ollama("hi")
    assert result == {"approval": 4}
