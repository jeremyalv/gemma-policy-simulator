"""Input validation for simulation draft creation."""

from __future__ import annotations

from typing import Any, cast

from packages.contracts.python.contracts_v1 import CreateSimulationRequest, FilterSet

from .errors import ApiError

SUPPORTED_DATASET = "nemotron_usa"
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
