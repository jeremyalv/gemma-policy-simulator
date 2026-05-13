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
    for key in ("SIMS_CLARIFICATION_MODEL", "SIMS_RUN_MODEL", "SIMS_OLLAMA_MODEL"):
        value = os.getenv(key)
        if value is not None and value.strip():
            return value.strip()
    return DEFAULT_MODEL


def _timeout_seconds() -> int:
    raw = (
        os.getenv("SIMS_CLARIFICATION_TIMEOUT_SECONDS")
        or os.getenv("SIMS_RUN_TIMEOUT_SECONDS")
        or os.getenv("SIMS_OLLAMA_TIMEOUT_SECONDS")
    )
    if raw is None:
        return DEFAULT_TIMEOUT_SECONDS
    try:
        parsed = int(raw)
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS
    return max(1, parsed)


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


def _build_answer_prompt(
    *,
    policy_text: str,
    refined_policy_text: str | None,
    clarification_id: str,
    turn_index: int,
    user_response: str,
) -> str:
    prior_refined = refined_policy_text or ""
    return (
        "You are helping refine a public policy simulation prompt.\n"
        "Given the base policy text, current refined text (if any), and user answer, update the refined policy text.\n"
        "Then decide if another clarification is needed.\n"
        "Return strictly valid JSON with exactly these keys:\n"
        "- refined_policy_text (string)\n"
        "- clarification_status (string: in_progress or resolved)\n"
        "- next_question_text (string or null; required when clarification_status is in_progress)\n\n"
        f"Current clarification_id: {clarification_id}\n"
        f"Current turn_index: {turn_index}\n"
        f"Base policy text:\n{policy_text}\n\n"
        f"Current refined policy text:\n{prior_refined}\n\n"
        f"User answer:\n{user_response}\n"
    )


def _call_ollama(prompt: str) -> dict[str, Any]:
    body: dict[str, Any] = {
        "model": _clarification_model(),
        "prompt": prompt,
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
        with request.urlopen(req, timeout=_timeout_seconds()) as resp:
            response_body = resp.read()
    except error.HTTPError as exc:
        detail = ""
        try:
            body = exc.read().decode("utf-8", errors="replace").strip()
            if body:
                detail = f" {body}"
        except Exception:
            detail = ""
        raise ClarificationGenerationError(
            f"model runtime returned error: HTTP {exc.code}{detail}"
        ) from exc
    except error.URLError as exc:
        reason = getattr(exc, "reason", None)
        suffix = f": {reason}" if reason else ""
        raise ClarificationGenerationError(f"failed to reach model runtime{suffix}") from exc
    except TimeoutError as exc:
        raise ClarificationGenerationError("model runtime timed out") from exc
    except Exception as exc:
        raise ClarificationGenerationError("unexpected model runtime error") from exc

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

    return generated


def _parse_question_output(generated: dict[str, Any]) -> tuple[str, str]:
    question_text = generated.get("question_text")
    rationale = generated.get("rationale")
    if not isinstance(question_text, str) or not question_text.strip():
        raise ClarificationGenerationError("model output missing non-empty question_text")
    if not isinstance(rationale, str) or not rationale.strip():
        raise ClarificationGenerationError("model output missing non-empty rationale")

    return question_text.strip(), rationale.strip()


def _parse_answer_output(generated: dict[str, Any]) -> tuple[str, str, str | None]:
    refined_policy_text = generated.get("refined_policy_text")
    clarification_status = generated.get("clarification_status")
    next_question_text = generated.get("next_question_text")

    if not isinstance(refined_policy_text, str) or not refined_policy_text.strip():
        raise ClarificationGenerationError("model output missing non-empty refined_policy_text")
    if clarification_status not in {"in_progress", "resolved"}:
        raise ClarificationGenerationError("model output clarification_status must be in_progress or resolved")
    if next_question_text is not None and (not isinstance(next_question_text, str) or not next_question_text.strip()):
        raise ClarificationGenerationError("model output next_question_text must be non-empty string or null")

    return refined_policy_text.strip(), clarification_status, next_question_text.strip() if isinstance(next_question_text, str) else None


def generate_clarification_with_gemma(policy_text: str, focus: str) -> tuple[str, str]:
    generated = _call_ollama(_build_prompt(policy_text=policy_text, focus=focus))
    return _parse_question_output(generated)


def generate_clarification_answer_with_gemma(
    *,
    policy_text: str,
    refined_policy_text: str | None,
    clarification_id: str,
    turn_index: int,
    user_response: str,
) -> tuple[str, str, str | None]:
    generated = _call_ollama(
        _build_answer_prompt(
            policy_text=policy_text,
            refined_policy_text=refined_policy_text,
            clarification_id=clarification_id,
            turn_index=turn_index,
            user_response=user_response,
        )
    )
    return _parse_answer_output(generated)
