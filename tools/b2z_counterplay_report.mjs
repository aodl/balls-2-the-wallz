#!/usr/bin/env node
/** Summarise exact-kernel trials; no network, signer, or campaign access. */
import { readFileSync, writeFileSync } from "node:fs";
import { parse, stringify } from "../packages/agents/b2z/common.mjs";
import { decide, decideCounterplay } from "../packages/agents/b2z/policies.mjs";
const path = process.argv[2];
const data = parse(readFileSync(path, "utf8"));
const groups = [];
for (const key of [
  ...new Set(data.rows.map((r) => `${r.geometry}:${r.seat}`)),
]) {
  const trials = data.rows.filter((r) => `${r.geometry}:${r.seat}` === key);
  const names = [...new Set(trials.map((r) => r.policy))];
  const responses = [...new Set(trials.map((r) => r.response))];
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
    candidates,
    responses,
    rows: trials.map((r) => ({
      candidate: r.policy,
      response: r.response,
      status: "complete",
      casualty_attribution_complete: r.candidate.casualty_attribution_complete,
      incremental_score: r.incremental_canonical_score,
      full_cost_e8s: r.candidate.full_cost_e8s,
      support_survivors: r.candidate.live_supporting_ball_ids.length,
      territory: r.candidate.territory,
      incremental_opponent_losses:
        r.candidate.opponent_balls_lost - r.wait.opponent_balls_lost,
    })),
  };
  const forecasts = trials.map((r) => ({
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
    const variants = trials.filter((r) => r.policy === defence);
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
  groups.push({
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
