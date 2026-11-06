import test from "node:test";
import assert from "node:assert/strict";
import { annotateDecision } from "../../packages/agents/b2z/forecast-coverage.mjs";
import { decide } from "../../packages/agents/b2z/policies.mjs";
function fixture() {
  return {
    candidates: [
      { id: "wait", action: { Wait: {} } },
      { id: "fire", action: { Fire: { cannon: 1, angle: 0, quantity: 1 } } },
    ],
    assumptions: {
      scenarios: [{ name: "now" }, { name: "later" }],
      known_unassessed_schedules: [
        {
          own_admission_tick: 0,
          opponent_response_tick: 1,
          status: "UNASSESSED",
        },
      ],
    },
    bounds: { horizon: 4 },
    forecasts: ["wait", "fire"].flatMap((candidate) =>
      ["now", "later"].map((scenario) => ({
        candidate,
        scenario,
        status: "complete",
        action_admitted_within_horizon: candidate !== "wait",
        logical_ticks_completed: 4,
        elapsed_window_ns: 20000000000n,
        lifecycle_complete: true,
        casualty_attribution_complete: true,
      })),
    ),
  };
}
test("complete declared comparisons do not establish global robustness or campaign eligibility", () => {
  const e = fixture();
  e.campaign_approved = true;
  e.campaign_eligible = true;
  const r = annotateDecision(e, { candidate: "fire" });
  assert.equal(r.assessment.declared_scenarios.status, "COMPLETE");
  assert.equal(
    r.assessment.declared_scenarios.scope,
    "SELECTED_ACTION_VS_MATCHED_WAIT",
  );
  assert.deepEqual(
    r.assessment.known_omitted_schedules,
    e.assumptions.known_unassessed_schedules,
  );
  assert.equal(r.assessment.beyond_horizon.status, "UNKNOWN");
  assert.equal(r.assessment.unenumerated_legal_actions, "UNKNOWN");
  assert.equal(r.assessment.robust_against_all_plausible_responses, false);
  assert.equal(r.assessment.campaign_eligibility.status, "NOT_ESTABLISHED");
  assert.equal(r.assessment.campaign_eligibility.eligible, null);
  assert.equal(r.assessment.campaign_eligibility.spending_authorized, false);
});

test("normal completion requires explicit true accounting on selected and Wait rows", () => {
  for (const candidate of ["fire", "wait"])
    for (const field of ["lifecycle_complete", "casualty_attribution_complete"])
      for (const invalid of [undefined, null, false, 0, 1, "true", {}, []]) {
        const e = fixture();
        e.forecasts.find((r) => r.candidate === candidate)[field] = invalid;
        assert.equal(
          annotateDecision(e, { candidate: "fire" }).assessment
            .declared_scenarios.status,
          "UNASSESSED",
          `${candidate} ${field} ${String(invalid)}`,
        );
      }
});

function tactical() {
  const e = fixture();
  return {
    kind: "local-counterplay",
    candidates: e.candidates,
    responses: ["now", "later"],
    rows: e.forecasts.map((r) => ({
      candidate: r.candidate,
      response: r.scenario,
      status: "complete",
      lifecycle_complete: true,
      casualty_attribution_complete: true,
      defended_island_support: 1,
    })),
  };
}

test("tactical selected and Wait require explicit casualties and valid island support", () => {
  assert.equal(
    annotateDecision(tactical(), { candidate: "fire" }).assessment
      .declared_scenarios.status,
    "COMPLETE",
  );
  for (const candidate of ["fire", "wait"])
    for (const [field, invalids] of [
      ["casualty_attribution_complete", [undefined, null, false, 1, "true"]],
      ["lifecycle_complete", [undefined, null, false, 1, "true"]],
      [
        "defended_island_support",
        [undefined, null, false, -1, 1.5, "1", NaN, Infinity],
      ],
    ])
      for (const invalid of invalids) {
        const e = tactical();
        e.rows.find((r) => r.candidate === candidate)[field] = invalid;
        assert.equal(
          annotateDecision(e, { candidate: "fire" }).assessment
            .declared_scenarios.status,
          "UNASSESSED",
          `${candidate} ${field} ${String(invalid)}`,
        );
      }
});

test("duplicate or conflicting evidence is unassessed; unrelated timeout preserves completed pairs", () => {
  for (const build of [fixture, tactical]) {
    const e = build(),
      rows = e.rows ?? e.forecasts;
    e.status = "bounded_partial";
    rows.push({
      candidate: "unselected",
      scenario: "now",
      response: "now",
      status: "bounded_incomplete",
    });
    assert.equal(
      annotateDecision(e, { candidate: "fire" }).assessment.declared_scenarios
        .status,
      "COMPLETE",
    );
    rows.push({ ...rows[0], casualty_attribution_complete: false });
    assert.equal(
      annotateDecision(e, { candidate: "fire" }).assessment.declared_scenarios
        .status,
      "UNASSESSED",
    );
  }
  const e = tactical();
  e.rows[0].defended_island_active = false;
  assert.equal(
    annotateDecision(e, { candidate: "fire" }).assessment.declared_scenarios
      .status,
    "UNASSESSED",
  );
});

test("compatibility coverage and robustness derive from the same assessment", () => {
  const e = fixture();
  e.forecasts.forEach((r) =>
    Object.assign(r, {
      canonical_score_delta: [r.candidate === "wait" ? 0n : 2n, 1n],
      territory_before: 1,
      territory_after: 1,
      own_balls_lost: 0,
      opponent_balls_lost: 0,
      dormant_cannons: 0,
    }),
  );
  e.candidates.forEach(
    (c) => (c.quote = { amount_e8s: c.id === "wait" ? 0n : 10000000n }),
  );
  delete e.forecasts.at(-1).lifecycle_complete;
  const d = decide("frugal-expander", e);
  assert.ok(
    d.forecast_coverage
      .find((r) => r.candidate === "fire")
      .unassessed.some((r) => r.scenario === "later"),
  );
  assert.equal(
    d.robustness.assessed_all_declared_scenarios,
    d.assessment.declared_scenarios.status === "COMPLETE",
  );
});

test("invalid declared names and malformed or conflicting completion windows fail closed", () => {
  for (const alter of [
    (e) => (e.assumptions.scenarios = [{ name: null }]),
    (e) => (e.assumptions.scenarios = [{ name: NaN }]),
    (e) => e.assumptions.scenarios.push({ name: "now" }),
    (e) => (e.forecasts[0].logical_ticks_completed = -1),
    (e) => (e.forecasts[0].elapsed_window_ns = null),
    (e) => (e.forecasts[0].elapsed_window_ns = 1),
    (e) => (e.forecasts[0].elapsed_window_ns = 1n),
    (e) => (e.forecasts[0].idle_slots = "1"),
    (e) => e.candidates.push({ ...e.candidates[0] }),
  ]) {
    const e = fixture();
    alter(e);
    assert.equal(
      annotateDecision(e, { candidate: "fire" }).assessment.declared_scenarios
        .status,
      "UNASSESSED",
    );
  }
  const e = fixture();
  e.forecasts.forEach((r) => delete r.elapsed_window_ns);
  assert.equal(
    annotateDecision(e, { candidate: "fire" }).assessment.declared_scenarios
      .status,
    "COMPLETE",
  );
});
test("missing, interrupted, unadmitted and mismatched Wait comparisons remain unassessed", () => {
  for (const alter of [
    (e) => e.forecasts.pop(),
    (e) => (e.forecasts.at(-1).status = "bounded_incomplete"),
    (e) => (e.forecasts.at(-1).action_admitted_within_horizon = false),
    (e) => (e.forecasts[1].logical_ticks_completed = 2),
  ]) {
    const e = fixture();
    alter(e);
    assert.equal(
      annotateDecision(e, { candidate: "fire" }).assessment.declared_scenarios
        .status,
      "UNASSESSED",
    );
  }
});
test("known omitted candidates and a pause remain distinct from a complete future", () => {
  const e = fixture();
  e.omitted_candidates = [{ id: "other", status: "UNASSESSED" }];
  e.status = "paused";
  const a = annotateDecision(e, { candidate: "wait" }).assessment;
  assert.equal(a.declared_scenarios.status, "UNASSESSED");
  assert.deepEqual(a.omitted_candidates, e.omitted_candidates);
});
