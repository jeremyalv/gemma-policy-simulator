"""Input validation for simulation draft creation."""

from __future__ import annotations

from typing import Any, Mapping, cast

from packages.contracts.python.contracts_v1 import (
    ClarificationAnswerRequest,
    CreateSimulationRequest,
    FilterSet,
    GenerateClarificationRequest,
    RunSimulationRequest,
)

from .errors import ApiError

SUPPORTED_DATASET = "nemotron_usa"
ALLOWED_STATUSES = {"pending", "running", "completed", "failed"}
ALLOWED_SORTS = {"created_at:asc", "created_at:desc"}
DEFAULT_SORT = "created_at:desc"
DEFAULT_PAGE = 1
DEFAULT_LIMIT = 20
MAX_LIMIT = 200
ALLOWED_RUNTIME_PROFILES = {"interactive", "balanced", "thorough", "auto"}
SUPPORTED_FILTER_KEYS = {
    "states",
    "age_range",
    "sex",
    "marital_status",
    "education_level",
    "occupation",
}

STRING_LIST_FILTER_KEYS = {
    "states",
    "sex",
    "marital_status",
    "education_level",
    "occupation",
}


def _require_string(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ApiError("VALIDATION_ERROR", f"{key} is required and must be a non-empty string")
    return value


def _validate_sample_size(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ApiError("VALIDATION_ERROR", "sample_size must be an integer")
    if value < 20 or value > 2000:
        raise ApiError("VALIDATION_ERROR", "sample_size must be between 20 and 2000")
    return value


def _validate_filters(raw_filters: Any) -> FilterSet:
    if raw_filters is None:
        return cast(FilterSet, {})

    if not isinstance(raw_filters, dict):
        raise ApiError("VALIDATION_ERROR", "filters must be an object")

    unsupported_keys = sorted(set(raw_filters.keys()) - SUPPORTED_FILTER_KEYS)
    if unsupported_keys:
        keys = ", ".join(unsupported_keys)
        raise ApiError("UNSUPPORTED_FILTER", f"Unsupported filter key(s): {keys}")

    normalized: dict[str, Any] = {}

    for key in STRING_LIST_FILTER_KEYS:
        if key not in raw_filters:
            continue
        value = raw_filters[key]
        if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
            raise ApiError("VALIDATION_ERROR", f"{key} must be an array of non-empty strings")
        normalized[key] = value

    if "age_range" in raw_filters:
        value = raw_filters["age_range"]
        if not isinstance(value, list) or len(value) != 2:
            raise ApiError("VALIDATION_ERROR", "age_range must be a two-item integer array")
        min_age, max_age = value
        if isinstance(min_age, bool) or isinstance(max_age, bool) or not isinstance(min_age, int) or not isinstance(max_age, int):
            raise ApiError("VALIDATION_ERROR", "age_range must be a two-item integer array")
        if min_age > max_age:
            raise ApiError("VALIDATION_ERROR", "age_range min must be <= max")
        normalized["age_range"] = [min_age, max_age]

    return cast(FilterSet, normalized)


def validate_create_simulation_payload(payload: Any) -> CreateSimulationRequest:
    if not isinstance(payload, dict):
        raise ApiError("VALIDATION_ERROR", "request body must be a JSON object")

    title = _require_string(payload, "title")
    policy_text = _require_string(payload, "policy_text")
    dataset = _require_string(payload, "dataset")

    if dataset != SUPPORTED_DATASET:
        raise ApiError("VALIDATION_ERROR", f"dataset must be '{SUPPORTED_DATASET}'")

    sample_size = _validate_sample_size(payload.get("sample_size"))
    filters = _validate_filters(payload.get("filters"))

    request: dict[str, Any] = {
        "title": title,
        "policy_text": policy_text,
        "dataset": dataset,
        "sample_size": sample_size,
    }
    if filters:
        request["filters"] = filters

    return cast(CreateSimulationRequest, request)


def validate_generate_clarification_payload(payload: Any) -> GenerateClarificationRequest:
    if not isinstance(payload, dict):
        raise ApiError("VALIDATION_ERROR", "request body must be a JSON object")

    focus = payload.get("focus")
    if not isinstance(focus, str) or not focus.strip():
        raise ApiError("VALIDATION_ERROR", "focus is required and must be a non-empty string")

    return cast(GenerateClarificationRequest, {"focus": focus.strip()})


def validate_answer_clarification_payload(payload: Any) -> ClarificationAnswerRequest:
    if not isinstance(payload, dict):
        raise ApiError("VALIDATION_ERROR", "request body must be a JSON object")

    simulation_id = payload.get("simulation_id")
    user_response = payload.get("user_response")

    if not isinstance(simulation_id, str) or not simulation_id.strip():
        raise ApiError("VALIDATION_ERROR", "simulation_id is required and must be a non-empty string")
    if not isinstance(user_response, str) or not user_response.strip():
        raise ApiError("VALIDATION_ERROR", "user_response is required and must be a non-empty string")

    return cast(
        ClarificationAnswerRequest,
        {
            "simulation_id": simulation_id.strip(),
            "user_response": user_response.strip(),
        },
    )


def validate_run_simulation_payload(payload: Any) -> RunSimulationRequest:
    if payload is None:
        payload = {}

    if not isinstance(payload, dict):
        raise ApiError("VALIDATION_ERROR", "request body must be a JSON object")

    allowed_keys = {"profile", "max_duration_seconds", "allow_sample_clamp", "use_refined_prompt"}
    extra_keys = sorted(set(payload.keys()) - allowed_keys)
    if extra_keys:
        raise ApiError("VALIDATION_ERROR", f"unexpected field(s): {', '.join(extra_keys)}")

    profile = payload.get("profile", "auto")
    if not isinstance(profile, str) or profile not in ALLOWED_RUNTIME_PROFILES:
        raise ApiError("VALIDATION_ERROR", "profile must be one of interactive|balanced|thorough|auto")

    max_duration_seconds = payload.get("max_duration_seconds")
    if max_duration_seconds is not None:
        if isinstance(max_duration_seconds, bool) or not isinstance(max_duration_seconds, int):
            raise ApiError("VALIDATION_ERROR", "max_duration_seconds must be an integer")
        if max_duration_seconds < 1:
            raise ApiError("VALIDATION_ERROR", "max_duration_seconds must be >= 1")

    allow_sample_clamp = payload.get("allow_sample_clamp", True)
    if not isinstance(allow_sample_clamp, bool):
        raise ApiError("VALIDATION_ERROR", "allow_sample_clamp must be a boolean")

    use_refined_prompt = payload.get("use_refined_prompt", True)
    if not isinstance(use_refined_prompt, bool):
        raise ApiError("VALIDATION_ERROR", "use_refined_prompt must be a boolean")

    normalized: dict[str, Any] = {
        "profile": profile,
        "allow_sample_clamp": allow_sample_clamp,
        "use_refined_prompt": use_refined_prompt,
    }
    if max_duration_seconds is not None:
        normalized["max_duration_seconds"] = max_duration_seconds

    return cast(RunSimulationRequest, normalized)


def _parse_positive_int(name: str, value: str, *, minimum: int, maximum: int | None = None) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ApiError("VALIDATION_ERROR", f"{name} must be an integer")

    if parsed < minimum:
        raise ApiError("VALIDATION_ERROR", f"{name} must be >= {minimum}")
    if maximum is not None and parsed > maximum:
        raise ApiError("VALIDATION_ERROR", f"{name} must be <= {maximum}")
    return parsed


def validate_list_simulations_query(
    query_params: Mapping[str, str],
) -> tuple[int, int, str | None, str]:
    page = DEFAULT_PAGE
    limit = DEFAULT_LIMIT
    status: str | None = None
    sort = DEFAULT_SORT

    if "page" in query_params:
        page = _parse_positive_int("page", query_params["page"], minimum=1)

    if "limit" in query_params:
        limit = _parse_positive_int("limit", query_params["limit"], minimum=1, maximum=MAX_LIMIT)

    if "status" in query_params:
        status_value = query_params["status"]
        if status_value not in ALLOWED_STATUSES:
            raise ApiError("VALIDATION_ERROR", "status must be one of pending|running|completed|failed")
        status = status_value

    if "sort" in query_params:
        sort_value = query_params["sort"]
        if sort_value not in ALLOWED_SORTS:
            raise ApiError("VALIDATION_ERROR", "sort must be created_at:asc or created_at:desc")
        sort = sort_value

    return page, limit, status, sort
