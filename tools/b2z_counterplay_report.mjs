#!/usr/bin/env node
/** Summarise exact-kernel trials; no network, signer, or campaign access. */
import { readFileSync, writeFileSync } from "node:fs";
import {
  parse,
  stringify,
  fractionSub,
  fractionCmp,
} from "../packages/agents/b2z/common.mjs";
import { decide, decideCounterplay } from "../packages/agents/b2z/policies.mjs";
const path = process.argv[2];
const data = parse(readFileSync(path, "utf8"));
const groups = [];
for (const key of [
  ...new Set(data.rows.map((r) => `${r.geometry}:${r.seat}`)),
]) {
  const trials = data.rows.filter((r) => `${r.geometry}:${r.seat}` === key);
  const names = [...new Set(trials.map((r) => r.policy))];
  const responses = [...new Set(trials.map((r) => r.response))].filter(
    (r) => !["public-policy", "extra-ball"].includes(r),
  );
  const candidates = names.map((id) => ({
    id,
    action:
      id === "wait"
        ? { Wait: {} }
        : id.startsWith("move")
          ? { Move: {} }
          : { Fire: {} },
    quote: { amount_e8s: 0n },
    full_cost_e8s: trials.find((r) => r.policy === id).candidate.full_cost_e8s,
  }));
  const evaluation = {
    kind: "local-counterplay",
    investment_budget_e8s: 1000000n, // Frugal experimental allocation: 0.01 ICP, not signing authority.
    candidates,
    responses,
    rows: trials
      .filter((r) => responses.includes(r.response))
      .map((r) => ({
        candidate: r.policy,
        response: r.response,
        status: r.response_observation.some((o) => o.status)
          ? "unassessed"
          : "complete",
        casualty_attribution_complete:
          r.candidate.casualty_attribution_complete,
        incremental_score: r.incremental_canonical_score,
        full_cost_e8s: r.candidate.full_cost_e8s,
        support_survivors: r.candidate.live_supporting_ball_ids.length,
        defended_island_support:
          r.candidate.defended_island.supporting_ball_ids.length,
        territory: r.candidate.territory,
        incremental_opponent_losses:
          r.candidate.opponent_balls_lost - r.wait.opponent_balls_lost,
      })),
  };
  const forecasts = trials
    .filter((r) => responses.includes(r.response))
    .map((r) => ({
      candidate: r.policy,
      scenario: r.response,
      status: "complete",
      action_admitted_within_horizon: true,
      logical_ticks_completed: r.horizon_logical_ticks,
      canonical_score_delta: r.candidate.score_delta,
      territory_before: 0,
      territory_after: r.candidate.territory,
      own_balls_lost: r.candidate.own_balls_lost,
      opponent_balls_lost: r.candidate.opponent_balls_lost,
      dormant_cannons: r.candidate.live_supporting_ball_ids.length ? 0 : 1,
    }));
  const oldEvaluation = {
    candidates,
    forecasts,
    assumptions: { scenarios: responses.map((name) => ({ name })) },
  };
  const comparison = [
    "frugal-expander",
    "anchor-defender",
    "adaptive-allocator",
  ].map((policy) => ({
    policy,
    holdout: decide(policy, oldEvaluation, { version: "b2z-policies-3" }),
    improved: decide(policy, evaluation),
  }));
  const baselinePolicies = [
    "attrition-raider",
    "island-engineer",
    "opportunist",
    "bounded-random",
    "passive",
  ].map((policy) => decide(policy, oldEvaluation, { seed: trials[0].seed }));
  // Attacker selects from the resulting PUBLIC outcomes. This is local exhaustive
  // best response evidence, never future information supplied to a live player.
  const bestResponses = names.map((defence) => {
    const variants = trials.filter(
      (r) =>
        r.policy === defence &&
        r.response !== "public-policy" &&
        !r.response_observation.some((o) => o.status),
    );
    variants.sort((a, b) => {
      const x = a.candidate.score_delta,
        y = b.candidate.score_delta;
      return x[0] * y[1] < y[0] * x[1] ? -1 : x[0] * y[1] > y[0] * x[1] ? 1 : 0;
    });
    const attacking = [...variants].sort((a, b) => {
      const x = a.attacker_score_delta,
        y = b.attacker_score_delta;
      const difference = x[0] * y[1] - y[0] * x[1];
      return difference > 0n
        ? -1
        : difference < 0n
          ? 1
          : a.candidate.opponent_full_cost_e8s <
              b.candidate.opponent_full_cost_e8s
            ? -1
            : 1;
    });
    return {
      attacker_score_best_response: attacking[0].response,
      attacker_best_score: attacking[0].attacker_score_delta,
      defence,
      response: variants[0].response,
      defender_score: variants[0].candidate.score_delta,
      attacker_full_cost_e8s: variants[0].candidate.opponent_full_cost_e8s,
      note: "Worst observed defender canonical score; not a proven minimax or attacker profit optimum",
    };
  });
  const closedLoop = trials
    .filter((r) => r.response === "public-policy")
    .map((actual) => {
      const alternatives = trials.filter(
        (r) =>
          r.policy === actual.policy &&
          r.response !== "public-policy" &&
          !r.response_observation.some((o) => o.status),
      );
      alternatives.sort(
        (a, b) =>
          fractionCmp(b.attacker_score_delta, a.attacker_score_delta) ||
          Number(
            a.candidate.opponent_full_cost_e8s -
              b.candidate.opponent_full_cost_e8s,
          ),
      );
      const conservation = alternatives.find((r) => r.response === "wait"),
        best = alternatives[0];
      const fixed = alternatives.find((r) => r.response === "original");
      return {
        defence: actual.policy,
        public_decision: actual.response_observation.find((o) => o.decision),
        realised_attacker_score: actual.attacker_score_delta,
        score_gap_to_tested_oracle: fractionSub(
          best.attacker_score_delta,
          actual.attacker_score_delta,
        ),
        oracle_response: best.response,
        incremental_score_vs_conservation: fractionSub(
          actual.attacker_score_delta,
          conservation.attacker_score_delta,
        ),
        full_cost_e8s: actual.candidate.opponent_full_cost_e8s,
        extra_cost_vs_conservation_e8s:
          actual.candidate.opponent_full_cost_e8s -
          conservation.candidate.opponent_full_cost_e8s,
        fixed_repeat_score: fixed?.attacker_score_delta,
        conservation_score: conservation.attacker_score_delta,
        oracle_is_hindsight: true,
      };
    });
  groups.push({
    closedLoop,
    key,
    comparison,
    baselinePolicies,
    bestResponses,
    summary: decideCounterplay("anchor-defender", evaluation),
  });
}
writeFileSync(
  process.argv[3] ?? path + ".summary.json",
  stringify({
    scope:
      "Local counterplay comparisons; empirical response mean is not a probability model",
    groups,
    work: data.total_work,
    elapsed_ms: data.elapsed_ms,
  }),
);
console.log("PASS", groups.length, "matched groups summarised");
