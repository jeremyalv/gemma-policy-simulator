from __future__ import annotations

from apps.server.simulation_runner import build_policy_prompt


def test_build_policy_prompt_contains_calibration_rubric_and_tradeoff_dimensions() -> None:
    prompt = build_policy_prompt(
        policy_text="Example policy text",
        persona={
            "persona_id": "p_1",
            "name": "Alex",
            "age": 40,
            "occupation": "Engineer",
            "city": "Austin",
            "state": "TX",
        },
    )

    assert "neutral evaluator" in prompt
    assert "Do not assume the policy is good by default" in prompt
    assert "benefits" in prompt
    assert "costs" in prompt
    assert "implementation risk" in prompt
    assert "fairness/distribution risk" in prompt
    assert "rights/liberty concerns" in prompt
    assert "Use this approval rubric strictly" in prompt
    assert "- 1: strongly oppose, major harms/rights concerns dominate" in prompt
    assert "- 5: strong support, benefits clearly outweigh risks" in prompt
    assert "Do not default to 4 or 5" in prompt


def test_build_policy_prompt_keeps_output_json_contract_shape() -> None:
    prompt = build_policy_prompt(policy_text="Policy", persona={"persona_id": "p_1"})
    assert "- approval (integer 1-5)" in prompt
    assert "- emotion (string)" in prompt
    assert "- rationale (string, 2-3 sentences)" in prompt
    assert "- behavior_change (boolean, optional)" in prompt
