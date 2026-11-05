"""Check and summarise these frozen synthetic results; performs no network calls."""
import gzip
import json
from collections import Counter
from fractions import Fraction
from pathlib import Path
from statistics import mean

HERE = Path(__file__).resolve().parent


def load(name):
    with gzip.open(HERE / name, "rt") as handle:
        return json.load(handle)


def integer(value):
    return int(value["$integer"])


def rational(value):
    return Fraction(integer(value[0]), integer(value[1]))


def exact(value):
    return f"{value.numerator}/{value.denominator}"


def key(row):
    return row["geometry"], row["seat"]


original = load("preliminary-screen.json.gz")
corrected = load("corrected-C-screen.json.gz")
assert original["status"] == corrected["status"] == "PASS"
assert original["bounds"] == corrected["bounds"]
assert original["initial_states"] == corrected["initial_states"]
assert len(original["initial_states"]) == 4

# C3 omitted a distinct schedule. Preserve it, but do not call it final C.
records = [r for r in original["records"] if r["allocation"] != "C"]
records += corrected["records"]
groups = {label: [r for r in records if r["allocation"] == label]
          for label in "ABC"}
assert all(len(rows) == 4 for rows in groups.values())

shared_rows = 0
for b in groups["B"]:
    a = next(r for r in groups["A"] if key(r) == key(b))
    c = next(r for r in groups["C"] if key(r) == key(b))
    for field in ("initial_state", "public_state", "available_candidates"):
        assert a[field] == b[field] == c[field], (key(b), field)
    assert b["forecasts"]["bounds"] == c["forecasts"]["bounds"]
    c_rows = {(r["candidate"], r["scenario"]): r
              for r in c["forecasts"]["forecasts"]}
    for row in b["forecasts"]["forecasts"]:
        assert row == c_rows[row["candidate"], row["scenario"]]
        shared_rows += 1
    assert [(d["objective"], d["candidate"]) for d in a["decisions"]] == [
        (d["objective"], d["candidate"]) for d in b["decisions"]] == [
        (d["objective"], d["candidate"]) for d in c["decisions"]]

allocation_summary = []
for label, rows in groups.items():
    complete_alternatives = 0
    selected_complete = 0
    choices = []
    for record in rows:
        evaluation = record["forecasts"]
        names = [s["name"] for s in evaluation["assumptions"]["scenarios"]]
        forecasts = evaluation["forecasts"]
        for candidate in evaluation["candidates"]:
            matched = [r for r in forecasts if r["candidate"] == candidate["id"]]
            if not candidate["action"].get("Wait") == {}:
                complete_alternatives += int(len(matched) == len(names) and
                                             all(r["status"] == "complete" for r in matched))
        for decision in record["decisions"]:
            complete = decision["assessment"]["declared_scenarios"]["status"] == "COMPLETE"
            selected_complete += int(complete)
            choices.append({"geometry": record["geometry"], "seat": record["seat"],
                            "objective": decision["objective"], "candidate": decision["candidate"],
                            "declared_selected_vs_wait_complete": complete})
    measured = sum(r["forecasts"]["measurements"]["total_work"] for r in rows)
    charged = sum(r["forecasts"]["bounds"]["max_work"]
                  if r["forecasts"]["status"] != "complete"
                  else r["forecasts"]["measurements"]["total_work"] for r in rows)
    allocation_summary.append({
        "allocation": label, "evaluations": len(rows),
        "complete_evaluations": sum(r["forecasts"]["status"] == "complete" for r in rows),
        "complete_selected_wait_comparisons": selected_complete,
        "selected_wait_comparisons": sum(len(r["decisions"]) for r in rows),
        "fully_assessed_paid_alternatives": complete_alternatives,
        "declared_paid_alternatives": sum(len(r["forecasts"]["candidates"]) - 1 for r in rows),
        "mean_elapsed_ms": mean(r["forecasts"]["measurements"]["elapsed_ms"] for r in rows),
        "reported_work": measured, "conservative_charge": charged,
        "extra_interrupted_reservation": charged - measured, "choices": choices,
    })

def realised_key(row):
    return (*key(row), row["candidate"], row["admission_delay_ticks"])


before = {realised_key(r): r for r in original["realised"]}
after = {realised_key(r): r for r in corrected["realised"]}
assert before.keys() == after.keys()
for k, row in after.items():
    # Only the audited allocation/scenario labels differ between runs.
    assert {n: v for n, v in row.items() if n != "conditional_checks"} == {
        n: v for n, v in before[k].items() if n != "conditional_checks"}
    assert row["native"]["status"] == "PASS"
    assert row["outcomes"]["lifecycle_complete"]
    assert row["outcomes"]["casualty_attribution_complete"]
    assert all(c["status"] == "PASS" for c in row["conditional_checks"])

outcomes = []
for row in corrected["realised"]:
    base = after[(*key(row), "wait", 0)]
    gain = rational(row["attacker_score_delta"]) - rational(base["attacker_score_delta"])
    outcomes.append({
        "geometry": row["geometry"], "seat": row["seat"], "candidate": row["candidate"],
        "admission_delay_ticks": row["admission_delay_ticks"],
        "incremental_score_exact": exact(gain), "incremental_score_display": float(gain),
        "attacker_territory": row["attacker_territory"], "defender_territory": row["defender_territory"],
        "target_active": row["defended_island"]["active"],
        "target_support": len(row["defended_island"]["supporting_ball_ids"]),
        "attacker_births": row["outcomes"]["own_balls_spawned"],
        "attacker_deaths": row["outcomes"]["own_balls_lost"],
        "defender_births": row["outcomes"]["opponent_balls_spawned"],
        "defender_deaths": row["outcomes"]["opponent_balls_lost"],
        "attacker_full_cost_e8s": str(integer(row["attacker_full_cost_e8s"])),
        "marginal_cost_vs_wait_e8s": str(integer(row["attacker_full_cost_e8s"]) -
                                           integer(base["attacker_full_cost_e8s"])),
        "next_ball_price_e8s": str(integer(row["next_ball_e8s"])),
        "native_segments": row["native"]["segments"],
    })

receipts = [receipt for row in corrected["realised"] for receipt in row["receipts"]]
summary = {
    "scope": "Synthetic exact-kernel predictions and realised 32-tick trials; no IC or live spending",
    "same_initial_states_and_candidates": True, "identical_B_C_shared_forecast_rows": shared_rows,
    "same_realised_states_events_and_receipts": len(after), "allocations": allocation_summary,
    "outcomes_32_ticks": outcomes,
    "native_segments_per_batch": sum(r["native"]["segments"] for r in corrected["realised"]),
    "corrected_C_conditional_4_tick_checks": sum(len(r["conditional_checks"]) for r in corrected["realised"]),
    "receipt_statuses": dict(Counter(r["status"] for r in receipts)),
    "retained_remainder_e8s": str(sum(integer(r["remainder"]) for r in receipts)),
    "attacker_full_cost_e8s_all_trials": str(sum(integer(r["attacker_full_cost_e8s"]) for r in corrected["realised"])),
    "defender_full_cost_e8s_all_trials": str(sum(integer(r["defender_full_cost_e8s"]) for r in corrected["realised"])),
    "fee_e8s_all_trials": str(len(receipts) * 10000),
    "unassessed": ["Unselected third-angle 32-tick outcomes", "Other public opponent responses",
                   "60/120-second admission outside the four-tick horizon", "Actual future IC delivery"],
    "conclusion": "No selection changed. Keep the reviewed candidate-major defaults; improve coverage metadata only.",
}
(HERE / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
print("PASS: shared inputs, 36 legacy rows, 22 realised outcomes and independent native comparisons")
for row in allocation_summary:
    print(row["allocation"], {k: v for k, v in row.items() if k != "choices"})
