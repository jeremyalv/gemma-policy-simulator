"""Local simulation inference runner utilities."""

from __future__ import annotations

import hashlib
import json
import os
import random
from typing import Any
from urllib import error, request


DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434"
DEFAULT_MODEL = "gemma"
DEFAULT_TIMEOUT_SECONDS = 60
DEFAULT_BATCH_SIZE = 8
DEFAULT_MAX_RETRIES = 1
DEFAULT_TEMPERATURE = 0.2
DEFAULT_TOP_P = 0.9
PROMPT_TEMPLATE_VERSION = "run_calibrated_v1"

STATES = ["CA", "TX", "FL", "NY", "WA", "IL", "PA", "OH"]
SEXES = ["female", "male"]
MARITAL_STATUSES = ["never_married", "married", "divorced_or_widowed"]
EDUCATION_LEVELS = ["high_school", "bachelors", "masters"]
OCCUPATIONS = ["Nurse", "Teacher", "Engineer", "Retail Worker", "Driver", "Clerk"]
FIRST_NAMES = ["Maria", "James", "Ava", "Noah", "Liam", "Sophia", "Mia", "Lucas"]
LAST_NAMES = ["Santos", "Johnson", "Miller", "Williams", "Brown", "Martinez", "Davis", "Taylor"]
CITIES_BY_STATE = {
    "CA": ["Los Angeles", "San Diego"],
    "TX": ["Houston", "Austin"],
    "FL": ["Miami", "Orlando"],
    "NY": ["New York", "Buffalo"],
    "WA": ["Seattle", "Spokane"],
    "IL": ["Chicago", "Springfield"],
    "PA": ["Philadelphia", "Pittsburgh"],
    "OH": ["Columbus", "Cleveland"],
}


class SimulationRunError(Exception):
    """Raised when a simulation run fails."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "UNKNOWN_ERROR",
        retryable: bool = False,
        invalid_output: bool = False,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.retryable = retryable
        self.invalid_output = invalid_output


def _ollama_base_url() -> str:
    return os.getenv("SIMS_OLLAMA_BASE_URL", DEFAULT_OLLAMA_BASE_URL).rstrip("/")


def _env_first(*keys: str) -> str | None:
    for key in keys:
        value = os.getenv(key)
        if value is not None and value.strip():
            return value.strip()
    return None


def _run_model() -> str:
    return _env_first("SIMS_RUN_MODEL", "SIMS_OLLAMA_MODEL") or DEFAULT_MODEL


def resolve_run_model() -> str:
    return _run_model()


def _timeout_seconds() -> int:
    raw = _env_first("SIMS_RUN_TIMEOUT_SECONDS", "SIMS_OLLAMA_TIMEOUT_SECONDS")
    if raw is None:
        return DEFAULT_TIMEOUT_SECONDS
    try:
        parsed = int(raw)
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS
    return max(1, parsed)


def resolve_batch_size() -> int:
    raw = _env_first("SIMS_RUN_BATCH_SIZE", "SIMS_BATCH_SIZE")
    if raw is None:
        return DEFAULT_BATCH_SIZE
    try:
        parsed = int(raw)
    except ValueError:
        return DEFAULT_BATCH_SIZE
    return max(1, parsed)


def resolve_max_retries() -> int:
    raw = os.getenv("SIMS_RUN_MAX_RETRIES")
    if raw is None:
        return DEFAULT_MAX_RETRIES
    try:
        parsed = int(raw)
    except ValueError:
        return DEFAULT_MAX_RETRIES
    return max(0, parsed)


def _clamp_float(value: float, *, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def resolve_run_temperature() -> float:
    raw = os.getenv("SIMS_RUN_TEMPERATURE")
    if raw is None:
        return DEFAULT_TEMPERATURE
    try:
        parsed = float(raw)
    except ValueError:
        return DEFAULT_TEMPERATURE
    return _clamp_float(parsed, min_value=0.0, max_value=2.0)


def resolve_run_top_p() -> float:
    raw = os.getenv("SIMS_RUN_TOP_P")
    if raw is None:
        return DEFAULT_TOP_P
    try:
        parsed = float(raw)
    except ValueError:
        return DEFAULT_TOP_P
    return _clamp_float(parsed, min_value=0.0, max_value=1.0)


def _seed_for_simulation(simulation_id: str) -> int:
    digest = hashlib.sha256(simulation_id.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def _coerce_str_list(value: Any) -> list[str] | None:
    if value is None:
        return None
    if not isinstance(value, list):
        return None
    out = [item for item in value if isinstance(item, str) and item.strip()]
    return out if out else None


def _pick(rng: random.Random, default_values: list[str], allowed: list[str] | None) -> str:
    if allowed:
        return rng.choice(allowed)
    return rng.choice(default_values)


def generate_personas(*, simulation_id: str, count: int, filters: dict[str, Any] | None) -> list[dict[str, Any]]:
    if count < 1:
        return []

    filters = filters or {}
    seed = _seed_for_simulation(simulation_id)
    rng = random.Random(seed)

    states_filter = _coerce_str_list(filters.get("states"))
    sex_filter = _coerce_str_list(filters.get("sex"))
    marital_filter = _coerce_str_list(filters.get("marital_status"))
    education_filter = _coerce_str_list(filters.get("education_level"))
    occupation_filter = _coerce_str_list(filters.get("occupation"))
    age_range = filters.get("age_range")

    min_age, max_age = 18, 70
    if isinstance(age_range, list) and len(age_range) == 2 and all(isinstance(v, int) for v in age_range):
        min_age, max_age = int(age_range[0]), int(age_range[1])
        if min_age > max_age:
            raise SimulationRunError("invalid age_range filter for persona generation", code="UNKNOWN_ERROR")

    personas: list[dict[str, Any]] = []
    for idx in range(count):
        state = _pick(rng, STATES, states_filter)
        city = rng.choice(CITIES_BY_STATE.get(state, ["Unknown"]))
        persona_id = f"p_{simulation_id}_{idx+1:05d}"
        first_name = rng.choice(FIRST_NAMES)
        last_name = rng.choice(LAST_NAMES)
        personas.append(
            {
                "persona_id": persona_id,
                "name": f"{first_name} {last_name}",
                "age": rng.randint(min_age, max_age),
                "sex": _pick(rng, SEXES, sex_filter),
                "marital_status": _pick(rng, MARITAL_STATUSES, marital_filter),
                "education_level": _pick(rng, EDUCATION_LEVELS, education_filter),
                "occupation": _pick(rng, OCCUPATIONS, occupation_filter),
                "city": city,
                "state": state,
            }
        )
    return personas


def build_policy_prompt(*, policy_text: str, persona: dict[str, Any]) -> str:
    return (
        "You are a synthetic policy simulation respondent and neutral evaluator.\n"
        "Evaluate the policy using the persona context. Do not assume the policy is good by default.\n"
        "First, identify the strongest reasons this policy could fail for this persona.\n"
        "Before choosing approval, internally assess:\n"
        "- benefits\n"
        "- costs\n"
        "- implementation risk\n"
        "- fairness/distribution risk\n"
        "- rights/liberty concerns (when relevant)\n"
        "Use this approval rubric strictly:\n"
        "- 1: strongly oppose, major harms/rights concerns dominate\n"
        "- 2: oppose, risks likely outweigh benefits\n"
        "- 3: mixed/uncertain, tradeoffs balanced or unclear\n"
        "- 4: support with reservations/conditions\n"
        "- 5: strong support, benefits clearly outweigh risks\n"
        "Do not default to 4 or 5 unless your rationale explicitly addresses risks and tradeoffs for this persona.\n"
        "If uncertainty is high or tradeoffs are balanced, choose 3 instead of inflating approval.\n"
        "Base the score on policy substance and persona interests, not promotional tone in policy wording.\n"
        "In rationale, include at least one concrete upside and one concrete downside tied to this persona.\n"
        "If both upside and downside are material, prefer score 3 unless one side clearly dominates.\n"
        "Return strictly valid JSON with these keys:\n"
        "- approval (integer 1-5)\n"
        "- emotion (string)\n"
        "- rationale (string, 2-3 sentences)\n"
        "- behavior_change (boolean, optional)\n\n"
        f"Policy text:\n{policy_text}\n\n"
        f"Persona:\n{json.dumps(persona, ensure_ascii=True)}\n"
    )


def prompt_template_version() -> str:
    return PROMPT_TEMPLATE_VERSION


def _call_ollama(prompt: str) -> dict[str, Any]:
    body: dict[str, Any] = {
        "model": _run_model(),
        "prompt": prompt,
        "format": "json",
        "stream": False,
        "options": {
            "temperature": resolve_run_temperature(),
            "top_p": resolve_run_top_p(),
        },
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
        details = ""
        try:
            body = exc.read().decode("utf-8", errors="replace").strip()
            if body:
                details = f": HTTP {exc.code} {body[:240]}"
            else:
                details = f": HTTP {exc.code}"
        except Exception:
            details = f": HTTP {exc.code}"
        raise SimulationRunError(
            f"model runtime returned error{details}",
            code="RUNTIME_ERROR",
            retryable=True,
        ) from exc
    except error.URLError as exc:
        reason = getattr(exc, "reason", None)
        if reason:
            suffix = f": {reason}"
        else:
            suffix = f": {exc.__class__.__name__}: {exc}"
        raise SimulationRunError(f"failed to reach model runtime{suffix}", code="RUNTIME_ERROR", retryable=True) from exc
    except TimeoutError as exc:
        raise SimulationRunError(
            f"model runtime timed out: {exc.__class__.__name__}: {exc}",
            code="RUNTIME_ERROR",
            retryable=True,
        ) from exc
    except Exception as exc:
        raise SimulationRunError(
            f"unexpected model runtime error: {exc.__class__.__name__}: {exc}",
            code="RUNTIME_ERROR",
            retryable=True,
        ) from exc

    try:
        payload = json.loads(response_body)
    except json.JSONDecodeError as exc:
        raise SimulationRunError(
            "model response was not valid JSON",
            code="PARSE_ERROR",
            retryable=True,
            invalid_output=True,
        ) from exc

    raw_content = payload.get("response")
    if not isinstance(raw_content, str):
        raise SimulationRunError(
            "model response did not contain response text",
            code="PARSE_ERROR",
            retryable=True,
            invalid_output=True,
        )

    try:
        generated = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise SimulationRunError(
            "model output was not valid JSON",
            code="PARSE_ERROR",
            retryable=True,
            invalid_output=True,
        ) from exc

    if not isinstance(generated, dict):
        raise SimulationRunError(
            "model output must be a JSON object",
            code="PARSE_ERROR",
            retryable=True,
            invalid_output=True,
        )

    return generated


def parse_policy_response(generated: dict[str, Any]) -> dict[str, Any]:
    approval = generated.get("approval")
    emotion = generated.get("emotion")
    rationale = generated.get("rationale")
    behavior_change = generated.get("behavior_change")

    if not isinstance(approval, int) or not (1 <= approval <= 5):
        raise SimulationRunError(
            "model output approval must be integer in range 1..5",
            code="PARSE_ERROR",
            retryable=True,
            invalid_output=True,
        )
    if not isinstance(emotion, str) or not emotion.strip():
        raise SimulationRunError(
            "model output emotion must be non-empty string",
            code="PARSE_ERROR",
            retryable=True,
            invalid_output=True,
        )
    if not isinstance(rationale, str) or not rationale.strip():
        raise SimulationRunError(
            "model output rationale must be non-empty string",
            code="PARSE_ERROR",
            retryable=True,
            invalid_output=True,
        )
    if behavior_change is not None and not isinstance(behavior_change, bool):
        raise SimulationRunError(
            "model output behavior_change must be boolean when provided",
            code="PARSE_ERROR",
            retryable=True,
            invalid_output=True,
        )

    parsed: dict[str, Any] = {
        "approval": approval,
        "emotion": emotion.strip(),
        "rationale": rationale.strip(),
    }
    if isinstance(behavior_change, bool):
        parsed["behavior_change"] = behavior_change
    return parsed


def generate_policy_response_with_ollama(prompt: str) -> dict[str, Any]:
    generated = _call_ollama(prompt)
    return parse_policy_response(generated)
