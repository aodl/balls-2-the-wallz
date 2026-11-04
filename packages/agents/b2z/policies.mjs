/** Small frozen policies. Inputs are public analysis, own history and typed candidates only. */
import { check, fractionSub, fractionCmp } from "./common.mjs";
export const LEGACY_POLICY_VERSION = "b2z-policies-1",
  PREVIOUS_POLICY_VERSION = "b2z-policies-2",
  POLICY_VERSION = "b2z-policies-3";
export const POLICIES = [
  "frugal-expander",
  "anchor-defender",
  "attrition-raider",
  "island-engineer",
  "opportunist",
  "adaptive-allocator",
  "bounded-random",
  "passive",
];
const value = (r) => Number((r[0] * 1000000n) / r[1]) / 1e6;
export function decideV1(
  policy,
  evaluation,
  { seed = 1, ownHistory = [] } = {},
) {
  check(POLICIES.includes(policy), "UNKNOWN_POLICY");
  const choices = evaluation.candidates,
    wait = choices.find((c) => c.action.Wait !== undefined);
  check(wait, "WAIT_REQUIRED");
  if (policy === "passive")
    return {
      policy,
      version: LEGACY_POLICY_VERSION,
      candidate: wait.id,
      reason:
        "Passive baseline: maintain existing entities with no new purchases.",
    };
  if (policy === "bounded-random") {
    const n = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
    return {
      policy,
      version: LEGACY_POLICY_VERSION,
      candidate: choices[n % choices.length].id,
      seed,
      reason:
        "Seeded bounded random selection among legal, budget-filtered candidates, including wait.",
    };
  }
  if (policy === "adaptive-allocator") {
    const options = POLICIES.slice(0, 5),
      stats = options.map((name) => ({
        name,
        rows: ownHistory.filter(
          (r) => r.policy === name && Number.isFinite(r.reward),
        ),
      }));
    const selected =
      stats.find((s) => s.rows.length === 0)?.name ??
      stats.sort(
        (a, b) =>
          b.rows.reduce((n, r) => n + r.reward, 0) / b.rows.length -
          a.rows.reduce((n, r) => n + r.reward, 0) / a.rows.length,
      )[0].name;
    return {
      ...decideV1(selected, evaluation, { seed, ownHistory }),
      policy,
      delegate: selected,
      reason:
        "Own-history exploration/empirical allocation; no other agent private plans used.",
    };
  }
  const ranked = choices
    .map((c) => {
      const rows = evaluation.forecasts.filter(
        (r) => r.candidate === c.id && r.status === "complete",
      );
      if (!rows.length) return { c, rank: -Infinity };
      const gain =
          rows.reduce((n, r) => n + value(r.canonical_score_delta), 0) /
          rows.length,
        area =
          rows.reduce((n, r) => n + r.territory_after - r.territory_before, 0) /
          rows.length,
        loss = rows.reduce((n, r) => n + r.own_balls_lost, 0),
        kills = rows.reduce((n, r) => n + r.opponent_balls_lost, 0),
        dormant = rows.reduce((n, r) => n + r.dormant_cannons, 0),
        cost = Number(c.quote.amount_e8s) / 100000000;
      const rank =
        policy === "frugal-expander"
          ? (gain + area * 0.001) / (1 + cost * 10) - loss * 0.5
          : policy === "anchor-defender"
            ? gain + area * 0.01 - loss * 20 - dormant * 100 - cost
            : policy === "attrition-raider"
              ? kills * 15 - loss * 15 + gain - cost * 5
              : policy === "island-engineer"
                ? gain + area * 0.02 - dormant * 30 - loss * 5 - cost * 2
                : gain + area * 0.005 + kills * 3 - loss * 4 - cost;
      return {
        c,
        rank,
        heuristic: {
          gain,
          area,
          loss,
          kills,
          dormant,
          cost_icp_for_ranking_only: cost,
        },
      };
    })
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        (a.c.quote.amount_e8s < b.c.quote.amount_e8s
          ? -1
          : a.c.quote.amount_e8s > b.c.quote.amount_e8s
            ? 1
            : 0),
    );
  const selected = ranked.find((r) => Number.isFinite(r.rank)) ?? { c: wait };
  return {
    policy,
    version: LEGACY_POLICY_VERSION,
    candidate: selected.c.id,
    ranking: ranked.map((r) => ({
      candidate: r.c.id,
      rank: Number.isFinite(r.rank) ? r.rank : null,
      heuristic: r.heuristic,
    })),
    reason:
      "Scenario-based heuristic over exact-kernel forecasts, not a claim of optimal play. Monetary validation remains integer e8s.",
  };
}

/** Compare each admitted candidate to Wait under the identical public scenario. */
export function decide(
  policy,
  evaluation,
  {
    version = evaluation.kind === "local-counterplay"
      ? "b2z-counterplay-2"
      : POLICY_VERSION,
    ...options
  } = {},
) {
  check(
    [
      POLICY_VERSION,
      PREVIOUS_POLICY_VERSION,
      LEGACY_POLICY_VERSION,
      "b2z-counterplay-2",
    ].includes(version),
    "UNKNOWN_POLICY_VERSION",
  );
  if (evaluation.kind === "local-counterplay") {
    check(version === "b2z-counterplay-2", "POLICY_EVALUATION_MISMATCH");
    return decideCounterplay(policy, evaluation);
  }
  check(version !== "b2z-counterplay-2", "POLICY_EVALUATION_MISMATCH");
  if (version === LEGACY_POLICY_VERSION)
    return decideV1(policy, evaluation, options);
  if (version === POLICY_VERSION && policy === "adaptive-allocator") {
    const history = options.ownHistory ?? [];
    options = {
      ...options,
      ownHistory: history
        .filter(
          (r) =>
            r.comparison === "matched-wait" &&
            r.complete === true &&
            r.initial_state === r.wait_initial_state &&
            typeof r.initial_state === "string" &&
            r.future_inputs === r.wait_future_inputs &&
            typeof r.future_inputs === "string" &&
            r.logical_horizon === r.wait_logical_horizon &&
            Number.isSafeInteger(r.logical_horizon) &&
            r.logical_horizon > 0 &&
            r.budget_e8s === r.wait_budget_e8s &&
            typeof r.budget_e8s === "bigint" &&
            Array.isArray(r.incremental_score_delta),
        )
        .map((r) => ({
          ...r,
          reward: value(r.incremental_score_delta) / r.logical_horizon,
        })),
    };
  }
  const wait = evaluation.candidates.find((c) => c.action.Wait);
  check(wait, "WAIT_REQUIRED");
  const rows = [],
    coverage = [],
    expected = evaluation.assumptions?.scenarios?.map((s) => s.name) ?? [
      ...new Set(evaluation.forecasts.map((r) => r.scenario)),
    ];
  for (const c of evaluation.candidates) {
    const scored = [],
      unassessed = [],
      bases = [];
    for (const r of evaluation.forecasts.filter((r) => r.candidate === c.id)) {
      const baseline = evaluation.forecasts.find(
        (b) => b.candidate === wait.id && b.scenario === r.scenario,
      );
      const idleWindow =
        baseline &&
        typeof r.elapsed_window_ns === "bigint" &&
        r.elapsed_window_ns === baseline.elapsed_window_ns &&
        (r.idle_slots > 0 || baseline.idle_slots > 0);
      const reason =
        r.status !== "complete"
          ? "INCOMPLETE_FORECAST"
          : !c.action.Wait && !r.action_admitted_within_horizon
            ? "NOT_ADMITTED_WITHIN_HORIZON"
            : typeof r.scenario !== "string" ||
                !Number.isSafeInteger(r.logical_ticks_completed) ||
                !baseline ||
                baseline.status !== "complete" ||
                (baseline.logical_ticks_completed !==
                  r.logical_ticks_completed &&
                  !idleWindow)
              ? "MISSING_MATCHED_WAIT"
              : null;
      if (reason) {
        unassessed.push({ scenario: r.scenario, reason });
        continue;
      }
      scored.push(r.scenario);
      bases.push({
        scenario: r.scenario,
        basis:
          baseline.logical_ticks_completed === r.logical_ticks_completed
            ? "same-logical-horizon"
            : "elapsed-window-with-idle",
        candidate_logical_ticks: r.logical_ticks_completed,
        wait_logical_ticks: baseline.logical_ticks_completed,
        ...(idleWindow ? { elapsed_window_ns: r.elapsed_window_ns } : {}),
      });
      rows.push({
        ...r,
        canonical_score_delta: fractionSub(
          r.canonical_score_delta,
          baseline.canonical_score_delta,
        ),
        territory_before: 0,
        territory_after:
          r.territory_after -
          r.territory_before -
          (baseline.territory_after - baseline.territory_before),
        own_balls_lost: r.own_balls_lost - baseline.own_balls_lost,
        opponent_balls_lost:
          r.opponent_balls_lost - baseline.opponent_balls_lost,
        dormant_cannons: r.dormant_cannons - baseline.dormant_cannons,
      });
    }
    for (const scenario of expected)
      if (
        !evaluation.forecasts.some(
          (r) => r.candidate === c.id && r.scenario === scenario,
        )
      )
        unassessed.push({ scenario, reason: "MISSING_FORECAST" });
    coverage.push({
      candidate: c.id,
      scored_scenarios: scored,
      comparison_bases: bases,
      unassessed,
    });
  }
  if (evaluation.status === "paused")
    return {
      policy,
      version,
      candidate: wait.id,
      forecast_coverage: coverage,
      reason:
        "Gameplay/admission is paused; no progressing gameplay or immediate admission is assumed.",
    };
  const candidates = evaluation.candidates.map((c) => ({
    ...c,
    quote: { ...c.quote, amount_e8s: c.full_cost_e8s ?? c.quote.amount_e8s },
  }));
  const selection = decideV1(
    policy,
    { ...evaluation, candidates, forecasts: rows },
    options,
  );
  return {
    ...selection,
    version,
    forecast_coverage: coverage,
    robustness: {
      assessed_all_declared_scenarios:
        coverage.find((c) => c.candidate === selection.candidate)?.unassessed
          .length === 0,
      note: "A positive immediate-admission ranking does not establish robustness across unassessed delays.",
    },
    ...(policy === "adaptive-allocator" && version === POLICY_VERSION
      ? {
          reward_evidence: {
            accepted: options.ownHistory?.length ?? 0,
            basis:
              "Only matched Wait trials; passive accrual and unmatched opponent effects receive no policy credit.",
          },
        }
      : {}),
    reason:
      "Marginal outcome against Wait in the same complete scenario; idle baselines use an explicitly labelled equal elapsed window; unadmitted actions are unassessed. Scenario coverage limits confidence; spending is not required.",
    comparison_units:
      "Exact canonical score deltas, then bounded heuristic ranking. Fee-inclusive cost where supplied; no financial arithmetic uses ranks.",
  };
}

/** Local tactical selection over explicitly enumerated responses, never signing authority.
 * Equal response weight describes this experiment, not opponent probabilities.
 * A candidate must cover every response; missing futures cannot enter the shortlist.
 */
export function decideCounterplay(policy, evaluation) {
  check(POLICIES.includes(policy), "UNKNOWN_POLICY");
  const { candidates, responses } = evaluation;
  check(
    responses.length > 0 && new Set(responses).size === responses.length,
    "RESPONSE_SET",
  );
  const wait = candidates.find((c) => c.action.Wait);
  check(wait, "WAIT_REQUIRED");
  const summaries = [],
    unassessed = [];
  for (const candidate of candidates) {
    const rows = responses.map((response) => {
      const matches = evaluation.rows.filter(
        (r) => r.candidate === candidate.id && r.response === response,
      );
      return matches.length === 1 ? matches[0] : null;
    });
    if (
      rows.some(
        (r) =>
          !r ||
          r.status !== "complete" ||
          !r.casualty_attribution_complete ||
          !Number.isSafeInteger(r.defended_island_support),
      )
    ) {
      unassessed.push(candidate.id);
      continue;
    }
    const increments = rows.map((r) => r.incremental_score);
    const total = increments.reduce(
      (a, b) => [a[0] * b[1] + b[0] * a[1], a[1] * b[1]],
      [0n, 1n],
    );
    const mean = [total[0], total[1] * BigInt(rows.length)];
    const worst = increments.reduce((a, b) => (fractionCmp(a, b) < 0 ? a : b));
    const gains = increments.map(value);
    summaries.push({
      candidate: candidate.id,
      full_cost_e8s: rows.reduce(
        (n, r) => (r.full_cost_e8s > n ? r.full_cost_e8s : n),
        0n,
      ),
      expected_incremental_score:
        gains.reduce((n, v) => n + v, 0) / rows.length,
      worst_incremental_score: Math.min(...gains),
      exact_mean_increment: mean,
      exact_worst_increment: worst,
      worst_support_survival: Math.min(
        ...rows.map((r) => r.defended_island_support),
      ),
      worst_territory: Math.min(...rows.map((r) => r.territory)),
      mean_opponent_losses:
        rows.reduce((n, r) => n + r.incremental_opponent_losses, 0) /
        rows.length,
      // Lossless canonical deltas remain available alongside derived summaries.
      canonical_increments: rows.map((r) => ({
        response: r.response,
        score: r.incremental_score,
      })),
    });
  }
  const dominates = (a, b) => {
    const pairs = [
      [a.worst_support_survival, b.worst_support_survival],
      [a.worst_territory, b.worst_territory],
    ];
    return (
      fractionCmp(a.exact_mean_increment, b.exact_mean_increment) >= 0 &&
      fractionCmp(a.exact_worst_increment, b.exact_worst_increment) >= 0 &&
      a.full_cost_e8s <= b.full_cost_e8s &&
      pairs.every(([x, y]) => x >= y) &&
      (a.full_cost_e8s < b.full_cost_e8s ||
        fractionCmp(a.exact_mean_increment, b.exact_mean_increment) > 0 ||
        fractionCmp(a.exact_worst_increment, b.exact_worst_increment) > 0 ||
        pairs.some(([x, y]) => x > y))
    );
  };
  const pareto = summaries.filter(
    (b) => !summaries.some((a) => a !== b && dominates(a, b)),
  );
  const baseline = summaries.find((r) => r.candidate === wait.id);
  check(baseline, "COMPLETE_WAIT_REQUIRED");
  let eligible = pareto.filter(
    (r) =>
      r.exact_mean_increment[0] > 0n &&
      r.exact_worst_increment[0] >= 0n &&
      (policy === "frugal-expander" ||
        r.worst_support_survival >= baseline.worst_support_survival) &&
      (policy !== "frugal-expander" ||
        (typeof evaluation.investment_budget_e8s === "bigint" &&
          r.full_cost_e8s <= evaluation.investment_budget_e8s)),
  );
  // A defence pays only for a demonstrated survival improvement or nonnegative
  // counterplay benefit. Preserve ICP when all assessed investments have downside.
  if (policy === "passive") eligible = [];
  const cheap = (a, b) =>
    a.full_cost_e8s < b.full_cost_e8s
      ? -1
      : a.full_cost_e8s > b.full_cost_e8s
        ? 1
        : a.candidate.localeCompare(b.candidate);
  eligible.sort((a, b) =>
    policy === "anchor-defender" || policy === "adaptive-allocator"
      ? b.worst_support_survival - a.worst_support_survival ||
        fractionCmp(b.exact_worst_increment, a.exact_worst_increment) ||
        cheap(a, b)
      : policy === "attrition-raider"
        ? b.mean_opponent_losses - a.mean_opponent_losses || cheap(a, b)
        : cheap(a, b),
  );
  return {
    policy,
    version: "b2z-counterplay-2",
    candidate: eligible[0]?.candidate ?? wait.id,
    pareto: pareto.map((r) => r.candidate),
    summaries,
    unassessed,
    scope: "Local planning only; no campaign consent or payment authority",
    rule: "Require complete declared responses, positive mean incremental score and nonnegative worst score; defence prioritises worst support survival, then worst score, then full cost. Frugal instead requires an explicit investment budget and prefers cheaper nonnegative-score improvements; no weighted utility.",
    uncertainty:
      "Uniform tested-response mean is descriptive, not an empirical opponent probability. Untested responses/delays remain unknown.",
  };
}

/** Public geometric target choice, not trajectory prediction or hindsight.
 * Receives only the current observation and affordable typed proposals.
 */
export function choosePublicAttack(observation, proposals) {
  const wait = proposals.find((p) => p.id === "wait");
  check(wait, "WAIT_REQUIRED");
  const { world, account, cannon, remaining_e8s, fee_e8s } = observation;
  check(
    typeof remaining_e8s === "bigint" &&
      remaining_e8s >= 0n &&
      typeof fee_e8s === "bigint" &&
      fee_e8s >= 0n,
    "BUDGET_REQUIRED",
  );
  proposals = proposals.filter(
    (p) =>
      p.action.Wait ||
      (typeof p.quote?.amount_e8s === "bigint" &&
        p.quote.amount_e8s + fee_e8s <= remaining_e8s),
  );
  const own = world.cannons.find(
    (c) => c.id === cannon && c.account === account,
  );
  check(own, "NOT_OWNER");
  const player = world.playability.players.find(
    (p) => p.account === account,
  )?.id;
  const wrap = (d) => (d > 500 ? d - 1000 : d < -500 ? d + 1000 : d);
  const targets = world.balls
    .filter((b) => b.owner !== player)
    .map((b) => ({
      id: b.id,
      dx: wrap((b.cell % 1000) - (own.cell % 1000)),
      dy: wrap(Math.floor(b.cell / 1000) - Math.floor(own.cell / 1000)),
    }));
  targets.sort(
    (a, b) =>
      Math.abs(a.dx) + Math.abs(a.dy) - Math.abs(b.dx) - Math.abs(b.dy) ||
      a.id - b.id,
  );
  if (!targets.length)
    return {
      candidate: wait.id,
      version: "public-attack-1",
      reason: "No public opposing ball target; preserve ICP.",
    };
  const t = targets[0];
  const angle =
    t.dy < 0
      ? Math.abs(t.dx) * 2 < Math.abs(t.dy)
        ? 49152
        : t.dx < 0
          ? 40960
          : 57344
      : null;
  const selected = proposals.find(
    (p) => p.action.Fire?.angle === angle && p.action.Fire.quantity === 1,
  );
  return {
    candidate: selected?.id ?? wait.id,
    version: "public-attack-1",
    target_ball: t.id,
    reason:
      "Choose an affordable single-ball approach toward the nearest public enemy ball by toroidal cell geometry; no future outcome inspected.",
    limitations:
      "Cell geometry ignores future reflection and admission changes; additional quantity is offered but this frugal attacker does not assume redundant fire is worthwhile.",
  };
}
