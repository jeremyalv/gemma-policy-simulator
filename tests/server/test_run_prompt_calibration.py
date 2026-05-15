from __future__ import annotations

from apps.server.simulation_runner import build_policy_prompt, resolve_run_temperature, resolve_run_top_p


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
    assert "strongest reasons this policy could fail" in prompt
    assert "choose 3 instead of inflating approval" in prompt
    assert "not promotional tone in policy wording" in prompt
    assert "one concrete upside and one concrete downside" in prompt
    assert "prefer score 3 unless one side clearly dominates" in prompt


def test_build_policy_prompt_keeps_output_json_contract_shape() -> None:
    prompt = build_policy_prompt(policy_text="Policy", persona={"persona_id": "p_1"})
    assert "- approval (integer 1-5)" in prompt
    assert "- emotion (string)" in prompt
    assert "- rationale (string, 2-3 sentences)" in prompt
    assert "- behavior_change (boolean, optional)" in prompt


def test_runtime_knob_resolvers_use_defaults_and_clamp(monkeypatch) -> None:
    monkeypatch.delenv("SIMS_RUN_TEMPERATURE", raising=False)
    monkeypatch.delenv("SIMS_RUN_TOP_P", raising=False)
    assert resolve_run_temperature() == 0.2
    assert resolve_run_top_p() == 0.9

    monkeypatch.setenv("SIMS_RUN_TEMPERATURE", "3.0")
    monkeypatch.setenv("SIMS_RUN_TOP_P", "2")
    assert resolve_run_temperature() == 2.0
    assert resolve_run_top_p() == 1.0

    monkeypatch.setenv("SIMS_RUN_TEMPERATURE", "-1")
    monkeypatch.setenv("SIMS_RUN_TOP_P", "-0.1")
    assert resolve_run_temperature() == 0.0
    assert resolve_run_top_p() == 0.0
