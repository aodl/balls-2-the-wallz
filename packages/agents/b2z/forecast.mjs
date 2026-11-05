import { Worker } from "node:worker_threads";
import { candidates } from "./actions.mjs";
import { decodeWorld } from "../../kernels/b2z/world.mjs";
import { defendedIslandSupport } from "./analysis.mjs";
import { decideCounterplay } from "./policies.mjs";
import {
  check,
  envelope,
  integer,
  stringify,
  fractionSub,
  fractionCmp,
} from "./common.mjs";
export const FORECAST_METRICS_VERSION = "b2z-forecast-metrics-2";
const cache = new Map();
export function forecastWorkerArgs(args = process.execArgv) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (["--input-type", "-e", "--eval", "-p", "--print"].includes(a)) {
      i++;
      continue;
    }
    if (
      ["--input-type=", "--eval=", "--print="].some((prefix) =>
        a.startsWith(prefix),
      )
    )
      continue;
    out.push(a);
  }
  return out;
}
export async function evaluateActions(
  board,
  account,
  {
    choices = null,
    horizon = 4,
    maxCandidates = 6,
    maxMs = 2000,
    maxWork = 100000,
    budgetE8s = 0n,
    feeE8s = 10000n,
    quantityMax = 2,
    headingOffset = 0,
    cannonId = null,
    delaySeconds = [0, 60, 120],
    includeStates = false,
    cacheResults = true,
  } = {},
) {
  integer(horizon, 1, 16);
  integer(maxCandidates, 1, 16);
  integer(maxMs, 50, 5000);
  integer(maxWork, 1, 1000000);
  check(
    delaySeconds.length === 3 &&
      delaySeconds.every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 600),
    "DELAY_SCENARIOS",
  );
  choices =
    choices ??
    candidates(board, account, {
      max: maxCandidates,
      budgetE8s,
      feeE8s,
      quantityMax,
      headingOffset,
      cannonId,
    });
  choices = choices.map((c) => ({
    ...c,
    full_cost_e8s: c.action.Wait
      ? 0n
      : (c.full_cost_e8s ?? c.quote.amount_e8s + feeE8s),
  }));
  check(
    choices.length <= maxCandidates &&
      choices.some((c) => c.action.Wait !== undefined),
    "WAIT_REQUIRED",
  );
  const milli = Number(
      board.snapshot.operational?.run?.pace?.nominal_milli ?? 200,
    ),
    tick_ns = milli > 0 ? BigInt(Math.ceil(1e12 / milli)) : null;
  const scenarios = [
    {
      name: "no-new-opponent-actions",
      delay_ticks:
        milli > 0 ? Math.ceil((delaySeconds[0] * milli) / 1000) : null,
      tick_ns,
      opponent: false,
    },
    {
      name: "plausible-public-last-heading-response",
      delay_ticks:
        milli > 0 ? Math.ceil((delaySeconds[1] * milli) / 1000) : null,
      tick_ns,
      opponent: true,
    },
    {
      name: "delayed-admission-opponent-first",
      delay_ticks:
        milli > 0 ? Math.ceil((delaySeconds[2] * milli) / 1000) : null,
      tick_ns,
      opponent: true,
    },
  ];
  if (
    milli === 0 ||
    board.snapshot.operational?.run.running === false ||
    board.snapshot.operational?.run.pace?.admission_open === false
  )
    return envelope("evaluate_actions", board, {
      derived_metrics_version: FORECAST_METRICS_VERSION,
      engine: { kind: "not run" },
      status: "paused",
      candidates: choices,
      forecasts: [],
      bounds: {
        horizon,
        max_candidates: maxCandidates,
        max_work: maxWork,
        hard_wall_ms: maxMs + 300,
      },
      measurements: { elapsed_ms: 0, worker_ms: 0, total_work: 0 },
      assumptions: {
        scenarios,
        gameplay_paused: true,
        zero_funding_rate: milli === 0,
        uncertainty:
          "Gameplay/admission pause has no assumed future resume. Gameplay/instant admission is not forecast; elapsed expiry maintenance is separate.",
      },
    });
  const key =
    FORECAST_METRICS_VERSION +
    "/" +
    (process.env.B2Z_AGENT_NATIVE ?? "js-reference") +
    "/" +
    (process.env.B2Z_AGENT_NATIVE_SHA256 ?? "unfrozen") +
    stringify(board.snapshot.reference, 0) +
    stringify(
      {
        account,
        choices,
        horizon,
        scenarios,
        maxWork,
        maxMs,
        includeStates,
      },
      0,
    );
  if (cacheResults && cache.has(key))
    return { ...cache.get(key), cache_hit: true };
  // Let Node inherit/filter process-wide flags normally. Inline source flags alone
  // require an explicit list because the worker loads a file, not parent stdin.
  const args = forecastWorkerArgs(),
    sourceFlags = args.length !== process.execArgv.length;
  const started = performance.now(),
    worker = new Worker(
      new URL("./forecast-worker.mjs", import.meta.url),
      sourceFlags ? { execArgv: args } : {},
    );
  let timer;
  const partial = [],
    taskSamples = [];
  let lastProgress = {};
  const result = await new Promise((resolve, reject) => {
    timer = setTimeout(
      () =>
        resolve({
          results: partial,
          total_work: lastProgress.total_work ?? null,
          worker_ms: lastProgress.worker_ms ?? null,
          status: "hard_timeout",
          task_metrics: taskSamples,
        }),
      maxMs + 300,
    );
    worker.on("message", (m) => {
      if (m.partial) {
        partial.push(m.result);
        if (m.task_metrics) taskSamples.push(m.task_metrics);
        lastProgress = m;
      } else resolve(m);
    });
    worker.once("error", reject);
    worker.postMessage({
      snapshot: board.snapshot,
      account,
      choices,
      horizon,
      scenarios,
      maxWork,
      maxMs,
      includeStates,
    });
  }).finally(async () => {
    clearTimeout(timer);
    await worker.terminate();
  });
  if (!includeStates)
    for (const row of result.results) delete row.next_state_hex;
  const out = envelope("evaluate_actions", board, {
    derived_metrics_version: FORECAST_METRICS_VERSION,
    engine: result.engine ?? {
      kind: process.env.B2Z_AGENT_NATIVE
        ? "existing-rust-kernel; interrupted before metadata"
        : "existing-js-reference",
    },
    status:
      result.status ??
      (result.results.some((r) => r.status !== "complete")
        ? "bounded_partial"
        : "complete"),
    candidates: choices,
    forecasts: result.results,
    bounds: {
      horizon,
      max_candidates: maxCandidates,
      max_work: maxWork,
      hard_wall_ms: maxMs + 300,
    },
    measurements: {
      elapsed_ms: performance.now() - started,
      worker_ms: result.worker_ms,
      total_work: result.total_work,
      scenario_costs: result.task_metrics ?? taskSamples,
      candidate_costs: choices.map((c) => {
        const samples = (result.task_metrics ?? taskSamples).filter(
          (t) => t.candidate === c.id,
        );
        return {
          candidate: c.id,
          completed: samples.filter((t) => t.status === "complete").length,
          reported_work: samples.reduce((n, t) => n + t.reported_work, 0),
          elapsed_ms: samples.reduce((n, t) => n + t.elapsed_ms, 0),
        };
      }),
    },
    assumptions: {
      scenarios,
      opponent_selection:
        "Nearest active opposing cannon at response time, toroidal distance then ID; public heading only. No assumed dormant revival. Intent/funds/admission remain unknown.",
      deterministic:
        "Actual existing B2zCursor with explicit synthetic future Ledger positions and consensus-time facts; never mainnet mutation",
      unknowns: [
        "Future opponent payments and budgets",
        "Ledger/Index discovery and admission order",
        "First-spawn sealed inputs",
        "Actual wall-clock pacing",
      ],
      latency: {
        source_fallback_seconds: 60,
        index_lag: "not bounded by fallback alone",
        browser_presentation: "Separate buffered delay; not payment admission",
      },
      uncertainty:
        "Scenario outcomes are predictions, not authenticated futures. Delayed actions beyond this logical horizon are not executed in the scenario.",
      zero_funding_rate: milli === 0,
    },
  });
  if (
    cacheResults &&
    out.status === "complete" &&
    out.forecasts.length === choices.length * scenarios.length &&
    out.forecasts.every((r) => r.status === "complete")
  )
    cache.set(key, out);
  if (cache.size > 32) cache.delete(cache.keys().next().value);
  return out;
}

/** Select only from bounded, fully assessed predictions; never grants spending authority. */
export function chooseForecastAttack(
  world,
  account,
  evaluation,
  { cannon, investmentBudgetE8s },
) {
  check(
    typeof investmentBudgetE8s === "bigint" && investmentBudgetE8s >= 0n,
    "BUDGET_REQUIRED",
  );
  const wait = evaluation.candidates.find((c) => c.action.Wait);
  check(wait, "WAIT_REQUIRED");
  const anchor = world.cannons.find(
    (c) => c.id === cannon && c.account === account,
  );
  check(anchor, "NOT_OWNER");
  const scenarios = evaluation.assumptions.scenarios.map((s) => s.name);
  const candidates = evaluation.candidates;
  check(
    candidates.every(
      (c) => typeof c.full_cost_e8s === "bigint" && c.full_cost_e8s >= 0n,
    ) && wait.full_cost_e8s === 0n,
    "UNPRICED_FORECAST_CHOICES",
  );
  check(
    candidates.every((c) => c.action.Wait || c.action.Fire?.cannon === cannon),
    "FORECAST_ACTION_SCOPE",
  );
  const rows = evaluation.forecasts.map((r) => {
    const baseline = evaluation.forecasts.find(
      (b) => b.candidate === wait.id && b.scenario === r.scenario,
    );
    const idle =
      baseline &&
      r.elapsed_window_ns === baseline.elapsed_window_ns &&
      (r.idle_slots > 0 || baseline.idle_slots > 0);
    const complete =
      r.status === "complete" &&
      baseline?.status === "complete" &&
      r.lifecycle_complete &&
      r.casualty_attribution_complete &&
      (r.candidate === wait.id || r.action_admitted_within_horizon) &&
      (r.logical_ticks_completed === baseline.logical_ticks_completed ||
        idle) &&
      typeof r.next_state_hex === "string";
    const choice = candidates.find((c) => c.id === r.candidate);
    return {
      candidate: r.candidate,
      response: r.scenario,
      status: complete ? "complete" : "unassessed",
      casualty_attribution_complete: complete,
      incremental_score: complete
        ? fractionSub(r.canonical_score_delta, baseline.canonical_score_delta)
        : [0n, 1n],
      full_cost_e8s: choice.full_cost_e8s,
      defended_island_support: complete
        ? defendedIslandSupport(
            decodeWorld(Buffer.from(r.next_state_hex, "hex")),
            account,
            anchor.cell,
          ).supporting_ball_ids.length
        : 0,
      territory: r.territory_after ?? 0,
      incremental_opponent_losses: complete
        ? r.opponent_balls_lost - baseline.opponent_balls_lost
        : 0,
    };
  });
  const base = {
    candidate: wait.id,
    version: "b2z-forecast-attack-1",
    scope: "Local derived planning only; no campaign authority",
    assumptions: evaluation.assumptions,
    note: "Only the declared bounded futures are assessed. Missing alternatives and longer delays may change the best action.",
  };
  if (
    evaluation.status === "paused" ||
    !scenarios.length ||
    scenarios.some(
      (s) =>
        !rows.some(
          (r) =>
            r.candidate === wait.id &&
            r.response === s &&
            r.status === "complete",
        ),
    )
  )
    return { ...base, reason: "INCOMPLETE_OR_PAUSED_WAIT_FORECAST" };
  const ranked = decideCounterplay("frugal-expander", {
    kind: "local-counterplay",
    candidates,
    responses: scenarios,
    rows,
    investment_budget_e8s: investmentBudgetE8s,
  });
  const eligible = ranked.summaries.filter((r) =>
    ranked.eligible_candidates.includes(r.candidate),
  );
  eligible.sort((a, b) =>
    a.full_cost_e8s < b.full_cost_e8s
      ? -1
      : a.full_cost_e8s > b.full_cost_e8s
        ? 1
        : fractionCmp(b.exact_worst_increment, a.exact_worst_increment) ||
          fractionCmp(b.exact_mean_increment, a.exact_mean_increment) ||
          a.candidate.localeCompare(b.candidate),
  );
  return {
    ...base,
    candidate: eligible[0]?.candidate ?? wait.id,
    analysis: ranked,
    reason:
      "Cheapest fully assessed Pareto improvement over Wait; at equal cost prefer worst incremental score, then mean score. No ICP-to-score exchange rate.",
  };
}
