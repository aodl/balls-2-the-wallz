import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeWorld } from "../../packages/kernels/b2z/world.mjs";
import { chooseForecastAttack } from "../../packages/agents/b2z/forecast.mjs";
const fixture = JSON.parse(readFileSync("tests/fixtures/rules-v6.json")).cases
  .idle;
const world = decodeWorld(Buffer.from(fixture.state_hex, "hex")),
  cannon = world.cannons[0],
  account = cannon.account;
function evaluation() {
  const candidates = [
    { id: "wait", action: { Wait: {} }, full_cost_e8s: 0n },
    {
      id: "z-consistent",
      action: { Fire: { cannon: cannon.id, angle: 0, quantity: 1 } },
      full_cost_e8s: 10010000n,
    },
    {
      id: "a-variable",
      action: { Fire: { cannon: cannon.id, angle: 49152, quantity: 1 } },
      full_cost_e8s: 10010000n,
    },
  ];
  return {
    status: "complete",
    candidates,
    assumptions: { scenarios: [{ name: "fast" }, { name: "delayed" }] },
    forecasts: candidates.flatMap((c) =>
      ["fast", "delayed"].map((s) => ({
        candidate: c.id,
        scenario: s,
        status: "complete",
        lifecycle_complete: true,
        casualty_attribution_complete: true,
        action_admitted_within_horizon: c.id !== "wait",
        logical_ticks_completed: 4,
        elapsed_window_ns: 20000000000n,
        idle_slots: 0,
        next_state_hex: fixture.state_hex,
        territory_after: 4,
        opponent_balls_lost: 0,
        canonical_score_delta: [
          1000n +
            (c.id === "wait"
              ? 0n
              : c.id === "z-consistent"
                ? 2n
                : s === "fast"
                  ? 5n
                  : 1n),
          1n,
        ],
      })),
    ),
  };
}
const options = { cannon: cannon.id, investmentBudgetE8s: 10010000n };
test("equal-cost forecast choice prefers worst incremental gain over alphabetic order or mean alone", () => {
  const d = chooseForecastAttack(world, account, evaluation(), options);
  assert.equal(d.candidate, "z-consistent");
  assert.equal(d.version, "b2z-forecast-attack-1");
  assert.equal(d.assessment.declared_scenarios.status, "COMPLETE");
  assert.equal(d.assessment.robust_against_all_plausible_responses, false);
  assert.equal(d.assessment.campaign_eligibility.spending_authorized, false);
});
test("missing, incomplete and unadmitted futures cannot enter the shortlist", () => {
  const e = evaluation();
  e.forecasts = e.forecasts.filter(
    (r) => r.candidate !== "z-consistent" || r.scenario !== "delayed",
  );
  for (const r of e.forecasts)
    if (r.candidate === "a-variable") r.action_admitted_within_horizon = false;
  assert.equal(
    chooseForecastAttack(world, account, e, options).candidate,
    "wait",
  );
});
test("missing Wait prediction, paused operation and missing island state fall back without paid action", () => {
  let e = evaluation();
  e.forecasts = e.forecasts.filter(
    (r) => r.candidate !== "wait" || r.scenario !== "delayed",
  );
  assert.equal(
    chooseForecastAttack(world, account, e, options).candidate,
    "wait",
  );
  e = evaluation();
  e.status = "paused";
  assert.equal(
    chooseForecastAttack(world, account, e, options).candidate,
    "wait",
  );
  e = evaluation();
  for (const r of e.forecasts) delete r.next_state_hex;
  assert.equal(
    chooseForecastAttack(world, account, e, options).candidate,
    "wait",
  );
});
test("budget and natural accrual do not justify payment without a marginal benefit", () => {
  const e = evaluation();
  assert.equal(
    chooseForecastAttack(world, account, e, {
      ...options,
      investmentBudgetE8s: 0n,
    }).candidate,
    "wait",
  );
  for (const r of e.forecasts) r.canonical_score_delta = [1000n, 1n];
  assert.equal(
    chooseForecastAttack(world, account, e, options).candidate,
    "wait",
  );
  assert.throws(
    () =>
      chooseForecastAttack(world, account, e, {
        ...options,
        investmentBudgetE8s: 1,
      }),
    /BUDGET_REQUIRED/,
  );
});
test("corrupt predicted state is an error, not a fabricated safe future", () => {
  const e = evaluation();
  e.forecasts[0].next_state_hex = "00";
  assert.throws(() => chooseForecastAttack(world, account, e, options));
});

test("forecast proposals require full integer prices and the selected own cannon", () => {
  let e = evaluation();
  delete e.candidates[1].full_cost_e8s;
  assert.throws(
    () => chooseForecastAttack(world, account, e, options),
    /UNPRICED_FORECAST_CHOICES/,
  );
  e = evaluation();
  e.candidates[1].action.Fire.cannon = 999;
  assert.throws(
    () => chooseForecastAttack(world, account, e, options),
    /FORECAST_ACTION_SCOPE/,
  );
});
