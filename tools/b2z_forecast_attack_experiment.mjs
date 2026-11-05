#!/usr/bin/env node
/** Bounded local forecasts at recorded public decision points. No network or signer. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { sha256 } from "@dtr/timeline-runtime/runtime/seal";
import { B2zCursor, encodePayment } from "../packages/kernels/b2z/kernel.mjs";
import {
  decodeWorld,
  encodeWorld,
  ENTRY_IDENTITY,
  ENTRY_CONFIG,
} from "../packages/kernels/b2z/world.mjs";
import { BoardAnalysis } from "../packages/agents/b2z/analysis.mjs";
import {
  evaluateActions,
  chooseForecastAttack,
} from "../packages/agents/b2z/forecast.mjs";
import {
  parse,
  stringify,
  fractionSub,
} from "../packages/agents/b2z/common.mjs";
const out = process.argv[2] ?? ".work/b2z-forecast-attack";
mkdirSync(out, { recursive: true });
const archive =
  process.argv[3] ??
  "evidence/B2Z/closed-loop-counterplay-2026-11-04/heldout-results.json.gz";
const bytes = readFileSync(archive);
const data = parse(
  (archive.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8"),
);
const started = performance.now(),
  rows = [];
let replayWork = 0,
  forecastWork = 0,
  forecastReportedWork = 0,
  uncertainForecasts = 0;
const fee = 10000n,
  workLimit = 2000000;
function bound() {
  assert.ok(
    replayWork + forecastWork <= workLimit &&
      performance.now() - started < 300000,
    "Offline experiment bound",
  );
}
function payment(account, quote, position) {
  const bytes = encodePayment(account, quote.amount_e8s, {
    kind: "angle",
    value: 0,
  });
  bytes.set(Buffer.from(quote.memo_hex, "hex"), 48);
  return { position, payload_hex: Buffer.from(bytes).toString("hex") };
}
function defenceInput(row, tick, world) {
  if (tick !== row.admission_tick || row.defender_action.Wait) return [];
  const id =
    row.defender_action.Move?.cannon ?? row.defender_action.Fire?.cannon;
  const cannon = world.cannons.find((c) => c.id === id);
  assert.ok(cannon);
  return [
    payment(cannon.account, row.defender_quote, 1001n + BigInt(tick) * 10n),
  ];
}
function advance(world, inputs) {
  inputs.sort((a, b) =>
    a.position < b.position ? -1 : a.position > b.position ? 1 : 0,
  );
  const cursor = new B2zCursor(encodeWorld(world), inputs, {
    ...ENTRY_IDENTITY,
    logical_start: world.time[0],
    logical_end: world.time[0] + 1n,
  });
  for (;;) {
    const r = cursor.step(32);
    replayWork += r.used;
    bound();
    if (r.complete) break;
  }
  cursor.finalizeElapsed(world.playability.elapsed_ns + 5000000000n);
  return decodeWorld(cursor.result().state);
}
function publicSnapshot(row) {
  let world = decodeWorld(
      Buffer.from(data.initial_states[row.initial_state], "hex"),
    ),
    source = 0n;
  assert.equal(sha256(encodeWorld(world)), row.initial_state);
  for (let tick = 0; tick < 4; tick++) {
    const inputs = [
      ...(tick === row.opening_inputs.tick ? row.opening_inputs.inputs : []),
      ...defenceInput(row, tick, world),
    ];
    for (const i of inputs) if (i.position > source) source = i.position;
    world = advance(world, inputs);
  }
  const trace = row.response_observation.find((r) => r.decision);
  assert.equal(sha256(encodeWorld(world)), trace.public_state);
  const paid = trace.proposals.find((p) => p.action.Fire),
    cannon = paid.action.Fire.cannon;
  const account = world.cannons.find((c) => c.id === cannon).account;
  return {
    world,
    trace,
    cannon,
    account,
    snapshot: {
      world,
      configuration: ENTRY_CONFIG,
      reference: {
        ...ENTRY_IDENTITY,
        head: 4n,
        source_cursor: source,
        root: trace.public_state,
      },
      trust: "local-synthetic",
      events: { events: [], receipts: [] },
      gaps: [],
      operational: {
        run: {
          running: true,
          pace: { nominal_milli: 200, admission_open: true },
        },
      },
    },
  };
}
function conditionalReplay(row, context, proposal, evaluation) {
  const predicted = evaluation.forecasts.find(
    (r) =>
      r.candidate === proposal.id && r.scenario === "no-new-opponent-actions",
  );
  if (predicted?.status !== "complete" || !predicted.next_state_hex)
    return { status: "UNASSESSED", reason: "INCOMPLETE_PREDICTION" };
  let world = context.world;
  for (let tick = 4; tick < 8; tick++) {
    const inputs = defenceInput(row, tick, world);
    if (tick === 4 && !proposal.action.Wait)
      inputs.push(payment(context.account, proposal.quote, 1045n));
    world = advance(world, inputs);
  }
  if (
    !row.defender_action.Wait &&
    row.admission_tick >= 4 &&
    row.admission_tick < 8
  )
    return {
      status: "UNASSESSED",
      reason: "ACTUAL_OPPONENT_INPUT_NOT_IN_NO_NEW_ACTIONS_SCENARIO",
    };
  const expected = sha256(Buffer.from(predicted.next_state_hex, "hex")),
    actual = sha256(encodeWorld(world));
  return {
    status: expected === actual ? "PASS" : "FAIL",
    expected_state: expected,
    actual_state: actual,
    horizon_ticks: 4,
  };
}
for (const row of data.rows.filter((r) => r.response === "public-policy")) {
  bound();
  const context = publicSnapshot(row);
  const choices = context.trace.proposals.map((p) => ({
    ...p,
    quote: p.quote ?? { amount_e8s: 0n },
  }));
  const allowance = Math.min(100000, workLimit - replayWork - forecastWork);
  assert.ok(allowance > 0, "Offline forecast work budget exhausted");
  const evaluation = await evaluateActions(
    new BoardAnalysis(context.snapshot),
    context.account,
    {
      choices,
      horizon: 4,
      maxCandidates: 5,
      maxMs: 5000,
      maxWork: allowance,
      delaySeconds: [0, 5, 10],
      includeStates: true,
    },
  );
  if (!evaluation.cache_hit) {
    const reported = evaluation.measurements.total_work;
    const known = Number.isSafeInteger(reported) && reported >= 0;
    forecastReportedWork += known ? reported : 0;
    const uncertain = evaluation.status !== "complete" || !known;
    forecastWork += uncertain
      ? Math.max(allowance, known ? reported : 0)
      : reported;
    if (uncertain) uncertainForecasts++;
  }
  bound();
  // Selection receives only the observed state and its bounded predictions.
  const selection = chooseForecastAttack(
    context.world,
    context.account,
    evaluation,
    {
      cannon: context.cannon,
      investmentBudgetE8s: context.trace.remaining_budget_e8s,
    },
  );
  const proposal = choices.find((c) => c.id === selection.candidate);
  assert.ok(proposal);
  // Only AFTER selection, look up its exact previously executed counterfactual.
  const variants = data.rows.filter(
    (r) =>
      r.geometry === row.geometry &&
      r.seat === row.seat &&
      r.policy === row.policy,
  );
  const realised = variants.find((r) => r.response === selection.candidate),
    wait = variants.find((r) => r.response === "wait");
  assert.ok(realised && wait);
  if (!proposal.action.Wait) {
    const receiptQuote = realised.response_observation.find(
      (o) => o.quote,
    ).quote;
    assert.equal(receiptQuote.memo_hex, proposal.quote.memo_hex);
    assert.equal(receiptQuote.amount_e8s, proposal.quote.amount_e8s);
  }
  const accuracy = conditionalReplay(row, context, proposal, evaluation);
  const recordedEvaluation = {
    ...evaluation,
    forecasts: evaluation.forecasts.map(
      ({ next_state_hex, ...summary }) => summary,
    ),
  };
  rows.push({
    geometry: row.geometry,
    seat: row.seat,
    seed: row.seed,
    defence: row.policy,
    initial_state: row.initial_state,
    public_state: context.trace.public_state,
    remaining_before_e8s: context.trace.remaining_budget_e8s,
    geometric_choice: context.trace.decision.candidate,
    selection,
    forecast: recordedEvaluation,
    conditional_accuracy: accuracy,
    realised: {
      source:
        "Previously executed exact-kernel branch; selected proposal and observed-state identity checked",
      state: realised.candidate.final_state,
      attacker_score_delta: realised.attacker_score_delta,
      incremental_vs_geometric: fractionSub(
        realised.attacker_score_delta,
        row.attacker_score_delta,
      ),
      incremental_vs_conservation: fractionSub(
        realised.attacker_score_delta,
        wait.attacker_score_delta,
      ),
      full_cost_e8s: realised.candidate.opponent_full_cost_e8s,
      cost_delta_vs_geometric_e8s:
        realised.candidate.opponent_full_cost_e8s -
        row.candidate.opponent_full_cost_e8s,
      remaining_e8s: realised.attacker_remaining_e8s,
      defended_island: realised.candidate.defended_island,
      receipts: realised.candidate.receipts,
    },
  });
  writeFileSync(
    out + "/results.json",
    stringify({
      scope:
        "Local synthetic replay comparison, not live authentication or spending",
      archive,
      bounds: {
        horizon_ticks: 4,
        delay_seconds: [0, 5, 10],
        per_forecast_ms: 5000,
        per_forecast_work: 100000,
        total_work: workLimit,
        total_ms: 300000,
      },
      rows,
      replay_work: replayWork,
      forecast_work: forecastReportedWork,
      forecast_work_budget_charge: forecastWork,
      uncertain_forecast_runs: uncertainForecasts,
      elapsed_ms: performance.now() - started,
    }),
  );
  console.log(
    row.geometry,
    row.seat,
    row.policy,
    selection.candidate,
    evaluation.status,
    accuracy.status,
  );
  assert.notEqual(
    accuracy.status,
    "FAIL",
    "Matched-input conditional forecast disagrees with exact replay",
  );
}
console.log(
  "PASS",
  rows.length,
  "decisions;",
  replayWork + forecastReportedWork,
  "reported work units;",
  replayWork + forecastWork,
  "budget charge;",
  (performance.now() - started).toFixed(1),
  "ms",
);
