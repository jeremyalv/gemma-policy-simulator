"""
Seed a realistic completed simulation for demo / media gallery purposes.

Usage:
    python scripts/seed_demo_simulation.py

Creates:
  - apps/server/data/artifacts/sim_demo_carbon.json   (run artifact)
  - apps/server/data/artifacts/sim_demo_ubi.json      (run artifact)
  - Updates sims.db: two completed simulations + one challenge
"""

from __future__ import annotations

import json
import random
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "apps/server/data/sims.db"
ARTIFACTS_DIR = ROOT / "apps/server/data/artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

# ── Helpers ────────────────────────────────────────────────────────────────────

def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"


def make_persona(rng: random.Random, idx: int) -> dict:
    names_f = ["Sarah","Maria","Jennifer","Lisa","Karen","Patricia","Jessica","Michelle","Amanda","Emily",
               "Stephanie","Rebecca","Sharon","Cynthia","Dorothy","Angela","Melissa","Deborah","Christine","Rachel"]
    names_m = ["James","Robert","John","Michael","David","William","Richard","Joseph","Thomas","Charles",
               "Christopher","Daniel","Matthew","Anthony","Mark","Donald","Steven","Paul","Andrew","Joshua"]
    lastnames = ["Johnson","Smith","Williams","Brown","Jones","Garcia","Miller","Davis","Martinez","Wilson",
                 "Anderson","Taylor","Thomas","Hernandez","Moore","Martin","Jackson","Thompson","White","Lee"]
    occupations = [
        "teacher", "nurse", "software_engineer", "truck_driver", "retail_salesperson",
        "construction_worker", "accountant", "police_officer", "fast_food_or_counter_worker",
        "office_clerk", "electrician", "registered_nurse", "physician", "lawyer",
        "janitor_or_cleaner", "customer_service_representative", "factory_worker",
        "farm_worker", "social_worker", "small_business_owner",
    ]
    states = ["CA","TX","FL","NY","PA","IL","OH","GA","NC","MI","NJ","VA","WA","AZ","MA",
              "TN","IN","MO","MD","WI","CO","MN","SC","AL","LA","KY","OR","OK","CT","UT"]
    cities_by_state = {
        "CA": ["Los Angeles","San Francisco","San Diego","Sacramento","Fresno"],
        "TX": ["Houston","Dallas","Austin","San Antonio","Fort Worth"],
        "FL": ["Miami","Orlando","Tampa","Jacksonville","Fort Lauderdale"],
        "NY": ["New York","Buffalo","Albany","Rochester","Yonkers"],
        "PA": ["Philadelphia","Pittsburgh","Allentown","Erie","Reading"],
        "IL": ["Chicago","Aurora","Rockford","Joliet","Naperville"],
        "OH": ["Columbus","Cleveland","Cincinnati","Toledo","Akron"],
        "GA": ["Atlanta","Augusta","Columbus","Macon","Savannah"],
        "NC": ["Charlotte","Raleigh","Greensboro","Durham","Winston-Salem"],
        "MI": ["Detroit","Grand Rapids","Warren","Sterling Heights","Lansing"],
    }
    marital = ["never_married","married","divorced","widowed","separated"]
    education = ["less_than_high_school","high_school","some_college","bachelors","graduate"]

    sex = rng.choice(["Male", "Female"])
    first = rng.choice(names_m if sex == "Male" else names_f)
    last = rng.choice(lastnames)
    state = rng.choice(states)
    city_list = cities_by_state.get(state, [f"{state} City"])
    city = rng.choice(city_list)
    age = rng.randint(22, 74)
    occ = rng.choice(occupations)
    mar = rng.choice(marital)
    edu = rng.choice(education)

    return {
        "persona_id": str(uuid.uuid4()),
        "name": f"{first} {last}",
        "age": age,
        "sex": sex,
        "occupation": occ,
        "city": city,
        "state": state,
        "marital_status": mar,
        "education_level": edu,
        "persona": f"{first} {last} is a {age}-year-old {occ.replace('_', ' ')} from {city}, {state}.",
    }


# ── Carbon Dividend Policy ─────────────────────────────────────────────────────

CARBON_POLICY = (
    "Federal Carbon Dividend & Clean Energy Transition Act: "
    "Impose a $60/ton carbon fee on fossil fuel producers, rising $15/year. "
    "All revenue returned equally to every US adult as a monthly dividend (~$65/mo at launch). "
    "Phase out coal power by 2035; fund retraining for displaced workers. "
    "Exempt agricultural fuel use for 10 years."
)

CARBON_RATIONALES = {
    # approval=1
    1: [
        "This is a massive tax that will destroy jobs in energy-dependent communities. My neighbors work in fossil fuels — this will gut their livelihoods before any retraining program materializes.",
        "Government picking winners and losers in energy markets never ends well. The dividend sounds nice but the economic disruption will far outweigh the checks people receive.",
        "I'm a truck driver and fuel costs are already killing small operators. A carbon fee this aggressive will bankrupt independent haulers. Dividend won't cover what we lose.",
    ],
    # approval=2
    2: [
        "The intent is good but the timeline is too aggressive. Phasing out coal by 2035 leaves communities devastated. I'd support a slower transition with stronger job guarantees.",
        "I support climate action but the $60/ton starting point is too steep. Small businesses can't absorb those input cost increases fast enough. Start lower, scale slower.",
        "The dividend is a smart idea but implementation concerns me. Low-income rural households who drive long distances will be net losers despite the rebate.",
    ],
    # approval=3
    3: [
        "Mixed feelings. I like the dividend and the agricultural exemption shows pragmatism. But I worry the retraining programs will be underfunded and workers will be left behind like in previous energy transitions.",
        "The principle of pricing carbon and returning revenue to citizens is sound economics. My main concern is whether $65/month actually offsets real cost increases for working families.",
        "I can see both sides. Climate change is real and we need strong action. But the pace matters — my community depends on manufacturing and sudden cost spikes could force plant closures.",
        "Directionally right. Carbon pricing is the most efficient climate tool we have. The dividend addresses regressivity. Execution will determine whether this succeeds or fails.",
    ],
    # approval=4
    4: [
        "This is the kind of market-based climate solution conservatives should embrace. Revenue-neutral carbon pricing with direct dividends is far better than complex regulations.",
        "The dividend mechanism is excellent — gives everyone skin in the game and makes the policy politically durable. The agricultural exemption is reasonable pragmatism.",
        "Strong support. Climate costs must be internalized. The dividend offsets most household burden and the worker retraining fund addresses the just-transition concern.",
        "I've followed carbon pricing research for years. This design is close to optimal. Predictable price escalation lets businesses plan. Dividends maintain public support.",
    ],
    # approval=5
    5: [
        "This is exactly the bold climate policy we need. Carbon pricing with dividends is proven to reduce emissions while returning money to households. I fully support this.",
        "Finally a serious climate proposal with teeth. The dividend ensures this is progressive, not regressive. The 2035 coal deadline is ambitious but necessary.",
        "As a nurse I see climate health impacts every day — heat stress, wildfire smoke, flooding. This policy finally starts pricing those real costs. Strong yes from me.",
    ],
}

CARBON_EMOTIONS = {1: "angry", 2: "concerned", 3: "uncertain", 4: "hopeful", 5: "supportive"}


def make_carbon_output(rng: random.Random, idx: int) -> dict:
    # Realistic distribution for controversial climate policy: mean ~3.1
    weights = [12, 20, 28, 24, 16]   # approval 1-5
    approval = rng.choices([1, 2, 3, 4, 5], weights=weights, k=1)[0]
    persona = make_persona(rng, idx)
    rationale = rng.choice(CARBON_RATIONALES[approval])
    emotion = CARBON_EMOTIONS[approval]
    behavior_change = approval >= 4 or (approval == 3 and rng.random() < 0.3)
    return {
        "persona": persona,
        "response": {
            "approval": approval,
            "emotion": emotion,
            "rationale": rationale,
            "behavior_change": behavior_change,
        },
    }


# ── UBI Policy ────────────────────────────────────────────────────────────────

UBI_POLICY = (
    "Universal Basic Income Pilot Program: "
    "Provide every US adult citizen $1,000/month unconditional cash payment. "
    "Funded by a 2% wealth tax on net worth above $10M and consolidating 12 existing means-tested programs. "
    "5-year pilot in 10 states before potential nationwide rollout. "
    "Does not replace Social Security, Medicare, or Medicaid."
)

UBI_RATIONALES = {
    1: [
        "UBI would destroy the work ethic that built this country. Why would anyone take a difficult job when the government hands out $1,000 a month for nothing? This is fiscal insanity.",
        "Consolidating safety net programs to fund handouts to millionaires is backwards. The existing programs, flawed as they are, target people who actually need help.",
        "This is socialism with extra steps. A wealth tax at that level will drive capital out of the country. We'll end up with neither the jobs nor the programs we replaced.",
    ],
    2: [
        "The concept is interesting but $1,000/month is way too high to be sustainable. A smaller pilot with rigorous evaluation before any consolidation of existing programs makes more sense.",
        "I worry about the middle class getting squeezed. The wealth tax sounds targeted but economic incidence shifts. And replacing means-tested programs may hurt the most vulnerable.",
        "The evidence from small UBI pilots doesn't scale. Giving $1,000/month to everyone in the country is a completely different economic experiment than a city-level test.",
    ],
    3: [
        "I'm genuinely torn. UBI could provide real security for people in unstable gig economy work. But the funding mechanism through program consolidation worries me — devil is in the details.",
        "The 5-year state pilot is the right approach — let's see real data before scaling. My concern is that $1,000 barely covers rent in major cities but is over-generous in rural areas.",
        "There's real merit here for automation-displaced workers. But consolidating 12 programs creates transition risk. Some families depend on benefits that exceed $1,000/month.",
        "As a social worker I've seen the failures of means-tested programs — the cliff effects, the stigma, the bureaucracy. UBI fixes those. But the funding math needs scrutiny.",
    ],
    4: [
        "The pilot approach is smart — collect evidence before committing. I particularly like that Social Security and Medicare are protected. This addresses my biggest concern.",
        "Unconditional income could be transformative for workers in volatile industries. The wealth tax is well-targeted. The program consolidation will be politically messy but worth it.",
        "I support this. The evidence from Finland, Kenya, Stockton shows positive outcomes. This is a serious proposal with a responsible funding mechanism and realistic scope.",
    ],
    5: [
        "This is the bold vision we need for an automated economy. UBI treats citizens as adults who can make their own choices. $1,000/month would transform the lives of working families.",
        "The pilot design is excellent — 10 states, 5 years, rigorous evaluation. Protecting SS and Medicare shows this is serious policy, not ideology. Full support.",
        "As someone who grew up poor, cash transfers are what actually help families. No paperwork, no caseworkers, no shame. This is the future of social policy.",
    ],
}

UBI_EMOTIONS = {1: "opposed", 2: "skeptical", 3: "uncertain", 4: "hopeful", 5: "enthusiastic"}


def make_ubi_output(rng: random.Random, idx: int) -> dict:
    # UBI tends to be more polarized: 1-2 and 4-5 heavy, 3 moderate
    weights = [16, 18, 20, 24, 22]   # approval 1-5 → mean ~3.2
    approval = rng.choices([1, 2, 3, 4, 5], weights=weights, k=1)[0]
    persona = make_persona(rng, idx)
    rationale = rng.choice(UBI_RATIONALES[approval])
    emotion = UBI_EMOTIONS[approval]
    behavior_change = approval >= 4 or (approval == 3 and rng.random() < 0.25)
    return {
        "persona": persona,
        "response": {
            "approval": approval,
            "emotion": emotion,
            "rationale": rationale,
            "behavior_change": behavior_change,
        },
    }


# ── Build artifacts ─────────────────────────────────────────────────────────────

def build_artifact(sim_id: str, outputs: list[dict], model: str = "gemma4:e4b") -> dict:
    return {
        "simulation_id": sim_id,
        "model": model,
        "dataset_version": "Nemotron-Personas-USA",
        "sampling_seed": abs(hash(sim_id)) % (2**31),
        "prompt_template_version": "run_calibrated_v1",
        "prompt_calibration_enabled": True,
        "output_count": len(outputs),
        "raw_outputs": outputs,
        "run_telemetry": {
            "retry_count": 2,
            "invalid_output_count": 1,
            "failure_code": None,
            "failure_message": None,
            "failed_persona_id": None,
            "attempted_count": len(outputs),
            "success_count": len(outputs),
            "failed_count": 0,
            "success_rate": 1.0,
            "is_partial": False,
            "failure_breakdown": {},
        },
    }


def mean_approval(outputs: list[dict]) -> float:
    vals = [o["response"]["approval"] for o in outputs]
    return sum(vals) / len(vals)


# ── DB operations ─────────────────────────────────────────────────────────────

def upsert_simulation(conn: sqlite3.Connection, sim_id: str, title: str, policy_text: str,
                      sample_size: int, outputs: list[dict], created_offset_min: int = 60) -> None:
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    created = (now - timedelta(minutes=created_offset_min)).strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"
    started = (now - timedelta(minutes=created_offset_min - 2)).strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"
    completed = (now - timedelta(minutes=created_offset_min - 10)).strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"
    ma = mean_approval(outputs)

    conn.execute("DELETE FROM simulations WHERE id = ?", (sim_id,))
    conn.execute("""
        INSERT INTO simulations (
            id, title, policy_text, dataset, sample_size, filters_json,
            status, created_at, started_at, completed_at, mean_approval,
            runtime_profile, effective_sample_size, estimated_seconds,
            run_idempotency_key, run_prompt_source,
            run_retry_count, run_invalid_output_count,
            run_failure_code, run_failure_message, run_failed_persona_id,
            run_attempted_count, run_success_count, run_failed_count,
            run_success_rate, run_is_partial, run_failure_breakdown_json,
            run_dataset_version, run_sampling_seed,
            clarification_status, clarification_turn_index
        ) VALUES (
            ?,?,?,?,?,?,
            ?,?,?,?,?,
            ?,?,?,
            ?,?,
            ?,?,
            ?,?,?,
            ?,?,?,
            ?,?,?,
            ?,?,
            ?,?
        )
    """, (
        sim_id, title, policy_text, "nemotron_usa", sample_size, "{}",
        "completed", created, started, completed, ma,
        "balanced", sample_size, 180,
        f"idem_{sim_id}", "user_prompt",
        2, 1,
        None, None, None,
        sample_size, sample_size, 0,
        1.0, 0, "{}",
        "Nemotron-Personas-USA", abs(hash(sim_id)) % (2**31),
        "done", 0,
    ))
    conn.commit()
    print(f"  Upserted simulation {sim_id}: mean_approval={ma:.2f}, n={sample_size}")


def upsert_challenge(conn: sqlite3.Connection, sim_id: str, focus: str) -> str:
    challenge_id = f"ch_{sim_id[-8:]}"
    conn.execute("DELETE FROM challenges WHERE challenge_id = ?", (challenge_id,))
    conn.execute("""
        INSERT INTO challenges (challenge_id, simulation_id, focus, created_at)
        VALUES (?, ?, ?, ?)
    """, (challenge_id, sim_id, focus, utc_now()))
    conn.commit()
    print(f"  Upserted challenge {challenge_id} for {sim_id}")
    return challenge_id


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    rng = random.Random(42)

    # 1. Carbon Dividend — 50 personas
    carbon_id = "sim_demo_carbon"
    carbon_outputs = [make_carbon_output(rng, i) for i in range(50)]
    carbon_artifact = build_artifact(carbon_id, carbon_outputs)
    artifact_path = ARTIFACTS_DIR / f"{carbon_id}.json"
    artifact_path.write_text(json.dumps(carbon_artifact, ensure_ascii=True, indent=2), encoding="utf-8")
    print(f"Wrote {artifact_path}")

    # 2. UBI — 50 personas
    ubi_id = "sim_demo_ubi"
    ubi_outputs = [make_ubi_output(rng, i) for i in range(50)]
    ubi_artifact = build_artifact(ubi_id, ubi_outputs)
    artifact_path = ARTIFACTS_DIR / f"{ubi_id}.json"
    artifact_path.write_text(json.dumps(ubi_artifact, ensure_ascii=True, indent=2), encoding="utf-8")
    print(f"Wrote {artifact_path}")

    # 3. DB updates
    conn = sqlite3.connect(DB_PATH)
    print(f"\nUpdating DB: {DB_PATH}")
    upsert_simulation(conn, carbon_id,
                      "Federal Carbon Dividend & Clean Energy Transition Act",
                      CARBON_POLICY, 50, carbon_outputs, created_offset_min=120)
    upsert_simulation(conn, ubi_id,
                      "Universal Basic Income Pilot Program",
                      UBI_POLICY, 50, ubi_outputs, created_offset_min=60)

    # 4. Challenge for UBI (for challenge screenshot)
    upsert_challenge(conn, ubi_id,
                     "economic_feasibility")
    conn.close()

    print("\nDone. Demo simulations seeded:")
    print(f"  {carbon_id} — Carbon Dividend (mean ≈ {mean_approval(carbon_outputs):.2f})")
    print(f"  {ubi_id}    — UBI Pilot       (mean ≈ {mean_approval(ubi_outputs):.2f})")
    print("\nVisit:")
    print("  http://localhost:5173  (frontend)")
    print("  http://localhost:8000/api/v1/simulations  (API)")


if __name__ == "__main__":
    main()
