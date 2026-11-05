import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  decodeWorld,
  PLAYABILITY_IDENTITY,
  PLAYABILITY_CONFIG,
} from "../../packages/kernels/b2z/world.mjs";
import { BoardAnalysis } from "../../packages/agents/b2z/analysis.mjs";
import { quoteAction } from "../../packages/agents/b2z/actions.mjs";
import { evaluateActions } from "../../packages/agents/b2z/forecast.mjs";
import { accountIdentifier } from "../../apps/b2z-observer/identity.mjs";
const cases = JSON.parse(readFileSync("tests/fixtures/rules-v6.json")).cases;
function setup() {
  const world = decodeWorld(Buffer.from(cases.idle.state_hex, "hex")),
    account = accountIdentifier("2vxsx-fae"),
    old = world.cannons[0].account;
  for (const c of [
    ...world.cannons,
    ...world.credits,
    ...world.playability.players,
  ])
    if (c.account === old) c.account = account;
  const snapshot = {
    world,
    configuration: PLAYABILITY_CONFIG,
    reference: {
      ...PLAYABILITY_IDENTITY,
      head: 1n,
      source_cursor: 100n,
      root: "cost-regression",
    },
    trust: "local-synthetic",
    events: { events: [], receipts: [] },
    gaps: [],
  };
  const action = {
    Fire: { cannon: world.cannons[0].id, angle: 0, quantity: 1 },
  };
  return {
    board: new BoardAnalysis(snapshot),
    account,
    options: {
      choices: [
        { id: "wait", action: { Wait: {} }, quote: { amount_e8s: 0n } },
        { id: "fire", action, quote: quoteAction(snapshot, account, action) },
      ],
      horizon: 2,
      maxCandidates: 2,
      maxMs: 2000,
      maxWork: 100000,
      delaySeconds: [0, 0, 0],
      cacheResults: false,
    },
  };
}
test("cost attribution is bounded, complete and separate from deterministic forecast rows", async () => {
  const { board, account, options } = setup();
  const e = await evaluateActions(board, account, options);
  assert.equal(e.status, "complete");
  const samples = e.measurements.scenario_costs;
  assert.equal(samples.length, 6);
  assert.equal(
    samples.reduce((n, r) => n + r.reported_work, 0),
    e.measurements.total_work,
  );
  assert.ok(
    samples.every(
      (r) =>
        [r.elapsed_ms, r.segment_ms, r.summary_ms].every(
          (n) => Number.isFinite(n) && n >= 0,
        ) && r.segment_ms + r.summary_ms <= r.elapsed_ms + 1,
    ),
  );
  assert.ok(
    samples.filter((r) => r.cache_hit).every((r) => r.reported_work === 0),
  );
  assert.ok(e.forecasts.every((r) => !("elapsed_ms" in r)));
  assert.equal(e.measurements.candidate_costs.length, 2);
});
test("cache bypass runs fresh work while normal completed-result caching is retained", async () => {
  const { board, account, options } = setup();
  const normal = { ...options, cacheResults: true };
  const fresh = await evaluateActions(board, account, normal);
  assert.equal(fresh.status, "complete");
  const cached = await evaluateActions(board, account, normal);
  assert.equal(cached.cache_hit, true);
  const bypass = await evaluateActions(board, account, options);
  assert.notEqual(bypass.cache_hit, true);
  assert.deepEqual(bypass.forecasts, fresh.forecasts);
});
