"""Dataset capability registry for filters/segments."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class DatasetCapabilities:
    supported_filter_keys: frozenset[str]


_REGISTRY: dict[str, DatasetCapabilities] = {
    "nemotron_usa": DatasetCapabilities(
        supported_filter_keys=frozenset(
            {
                "states",
                "age_range",
                "sex",
                "marital_status",
                "education_level",
                "occupation",
            }
        )
    )
}


def get_dataset_capabilities(dataset_id: str) -> DatasetCapabilities | None:
    return _REGISTRY.get(dataset_id)
