import test from "node:test";
import assert from "node:assert/strict";
import { annotateDecision } from "../../packages/agents/b2z/forecast-coverage.mjs";
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
