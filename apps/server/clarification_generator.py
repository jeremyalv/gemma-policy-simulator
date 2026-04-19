"""Gemma-backed clarification generation via local Ollama."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any
from urllib import error, request


DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "gemma"
DEFAULT_TIMEOUT_SECONDS = 30


@dataclass
class ClarificationGenerationError(Exception):
    """Raised when clarification generation fails."""

    message: str


def _ollama_base_url() -> str:
    return os.getenv("SIMS_OLLAMA_BASE_URL", DEFAULT_OLLAMA_BASE_URL).rstrip("/")


def _clarification_model() -> str:
    return os.getenv("SIMS_CLARIFICATION_MODEL", DEFAULT_MODEL)


def _build_prompt(policy_text: str, focus: str) -> str:
    return (
        "You are helping refine a public policy simulation prompt.\n"
        "Given the policy text and focus area, generate one concise clarification question and rationale.\n"
        "Return strictly valid JSON with exactly these keys: question_text, rationale.\n"
        "question_text must be a single sentence question.\n"
        "rationale must be one short sentence about why it matters for simulation outcomes.\n\n"
        f"Focus: {focus}\n"
        f"Policy text:\n{policy_text}\n"
    )


def _parse_model_response(response_body: bytes) -> tuple[str, str]:
    try:
        payload = json.loads(response_body)
    except json.JSONDecodeError as exc:
        raise ClarificationGenerationError("model response was not valid JSON") from exc

    raw_content = payload.get("response")
    if not isinstance(raw_content, str):
        raise ClarificationGenerationError("model response did not contain response text")

    try:
        generated = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise ClarificationGenerationError("model output was not valid JSON") from exc

    if not isinstance(generated, dict):
        raise ClarificationGenerationError("model output must be a JSON object")

    question_text = generated.get("question_text")
    rationale = generated.get("rationale")
    if not isinstance(question_text, str) or not question_text.strip():
        raise ClarificationGenerationError("model output missing non-empty question_text")
    if not isinstance(rationale, str) or not rationale.strip():
        raise ClarificationGenerationError("model output missing non-empty rationale")

    return question_text.strip(), rationale.strip()


def generate_clarification_with_gemma(policy_text: str, focus: str) -> tuple[str, str]:
    body: dict[str, Any] = {
        "model": _clarification_model(),
        "prompt": _build_prompt(policy_text=policy_text, focus=focus),
        "format": "json",
        "stream": False,
    }
    req = request.Request(
        url=f"{_ollama_base_url()}/api/generate",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=DEFAULT_TIMEOUT_SECONDS) as resp:
            response_body = resp.read()
    except error.URLError as exc:
        raise ClarificationGenerationError("failed to reach model runtime") from exc
    except TimeoutError as exc:
        raise ClarificationGenerationError("model runtime timed out") from exc
    except Exception as exc:
        raise ClarificationGenerationError("unexpected model runtime error") from exc

    return _parse_model_response(response_body)
