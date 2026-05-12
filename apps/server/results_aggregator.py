"""Aggregation utilities for simulation results payloads."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any


def _age_group(age: int) -> str:
    if age <= 34:
        return "18-34"
    if age <= 54:
        return "35-54"
    return "55+"


def _mean(values: list[int]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _group_mean_count(values: dict[str, list[int]]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}
    for key in sorted(values.keys()):
        approvals = values[key]
        if not approvals:
            continue
        grouped[key] = {
            "mean_approval": _mean(approvals),
            "count": len(approvals),
        }
    return grouped


def _group_state_mean(values: dict[str, list[int]]) -> dict[str, float]:
    grouped: dict[str, float] = {}
    for key in sorted(values.keys()):
        approvals = values[key]
        if not approvals:
            continue
        grouped[key] = _mean(approvals)
    return grouped


def _dominant_emotion(emotion_counts: Counter[str]) -> str:
    if not emotion_counts:
        return "neutral"
    # Deterministic tie-break: alphabetical by emotion label.
    return sorted(emotion_counts.items(), key=lambda item: (-item[1], item[0]))[0][0]


def _normalize_emotion_label(value: str) -> str:
    return value.strip().lower()


def _select_representative_quotes(
    raw_outputs: list[dict[str, Any]],
    *,
    max_quotes: int = 5,
) -> list[dict[str, Any]]:
    sortable: list[tuple[str, int, dict[str, Any]]] = []
    for idx, item in enumerate(raw_outputs):
        persona = item.get("persona")
        if not isinstance(persona, dict):
            continue
        persona_id = persona.get("persona_id")
        if isinstance(persona_id, str) and persona_id:
            sortable.append((persona_id, idx, item))
        else:
            sortable.append((f"~{idx:06d}", idx, item))

    selected: list[dict[str, Any]] = []
    for _, _, item in sorted(sortable, key=lambda value: (value[0], value[1]))[:max_quotes]:
        persona = item.get("persona")
        response = item.get("response")
        if not isinstance(persona, dict) or not isinstance(response, dict):
            continue

        persona_id = persona.get("persona_id")
        name = persona.get("name")
        age = persona.get("age")
        occupation = persona.get("occupation")
        city = persona.get("city")
        state = persona.get("state")
        approval = response.get("approval")
        emotion = response.get("emotion")
        rationale = response.get("rationale")

        if not (
            isinstance(persona_id, str)
            and isinstance(name, str)
            and isinstance(age, int)
            and isinstance(occupation, str)
            and isinstance(city, str)
            and isinstance(state, str)
            and isinstance(approval, int)
            and isinstance(emotion, str)
            and isinstance(rationale, str)
        ):
            continue

        selected.append(
            {
                "persona_id": persona_id,
                "name": name,
                "age": age,
                "occupation": occupation,
                "city": city,
                "state": state,
                "approval": approval,
                "emotion": emotion,
                "rationale": rationale,
            }
        )
    return selected


def aggregate_results_payload(
    *,
    simulation_id: str,
    runtime_profile: str,
    effective_sample_size: int,
    raw_outputs: list[dict[str, Any]],
) -> dict[str, Any]:
    approvals: list[int] = []
    emotion_counts: Counter[str] = Counter()
    behavior_change_true_count = 0

    by_age_group: dict[str, list[int]] = defaultdict(list)
    by_marital_status: dict[str, list[int]] = defaultdict(list)
    by_state: dict[str, list[int]] = defaultdict(list)
    by_occupation_group: dict[str, list[int]] = defaultdict(list)

    for item in raw_outputs:
        persona = item.get("persona")
        response = item.get("response")
        if not isinstance(persona, dict) or not isinstance(response, dict):
            continue

        approval = response.get("approval")
        emotion = response.get("emotion")
        if not isinstance(approval, int) or not (1 <= approval <= 5):
            continue
        if not isinstance(emotion, str) or not emotion.strip():
            continue

        approvals.append(approval)
        normalized_emotion = _normalize_emotion_label(emotion)
        emotion_counts[normalized_emotion] += 1

        behavior_change = response.get("behavior_change")
        if behavior_change is True:
            behavior_change_true_count += 1

        age = persona.get("age")
        if isinstance(age, int):
            by_age_group[_age_group(age)].append(approval)

        marital_status = persona.get("marital_status")
        if isinstance(marital_status, str) and marital_status:
            by_marital_status[marital_status].append(approval)

        state = persona.get("state")
        if isinstance(state, str) and state:
            by_state[state].append(approval)

        occupation = persona.get("occupation")
        if isinstance(occupation, str) and occupation:
            by_occupation_group[occupation].append(approval)

    if not approvals:
        raise ValueError("artifact contained no valid persona responses")

    total = len(approvals)
    approval_distribution = {str(score): 0 for score in range(1, 6)}
    for score in approvals:
        approval_distribution[str(score)] += 1

    emotion_profile: dict[str, float] = {}
    for emotion in sorted(emotion_counts.keys()):
        pct = (emotion_counts[emotion] / total) * 100
        emotion_profile[emotion] = round(pct, 1)

    return {
        "id": simulation_id,
        "summary": {
            "mean_approval": _mean(approvals),
            "approval_distribution": approval_distribution,
            "dominant_emotion": _dominant_emotion(emotion_counts),
            "behavioral_change_pct": round((behavior_change_true_count / total) * 100, 1),
        },
        "run_config": {
            "runtime_profile": runtime_profile,
            "effective_sample_size": effective_sample_size,
        },
        "demographic_breakdown": {
            "by_age_group": _group_mean_count(by_age_group),
            "by_marital_status": _group_mean_count(by_marital_status),
            "by_state": _group_state_mean(by_state),
            "by_occupation_group": _group_mean_count(by_occupation_group),
        },
        "emotion_profile": emotion_profile,
        "representative_quotes": _select_representative_quotes(raw_outputs, max_quotes=5),
        "raw_responses_url": f"/api/v1/simulations/{simulation_id}/export",
    }
