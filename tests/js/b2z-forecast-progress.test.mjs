import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Worker } from "node:worker_threads";
import {
  decodeWorld,
  PLAYABILITY_IDENTITY,
  PLAYABILITY_CONFIG,
} from "../../packages/kernels/b2z/world.mjs";
import { accountIdentifier } from "../../apps/b2z-observer/identity.mjs";
import { quoteAction } from "../../packages/agents/b2z/actions.mjs";

function request() {
  const fixtures = JSON.parse(readFileSync("tests/fixtures/rules-v6.json"));
  const world = decodeWorld(Buffer.from(fixtures.cases.idle.state_hex, "hex"));
  const old = world.cannons[0].account,
    account = accountIdentifier("2vxsx-fae");
  for (const c of [
    ...world.cannons,
    ...world.playability.players,
    ...world.credits,
  ])
    if (c.account === old) c.account = account;
  const snapshot = {
    world,
    configuration: PLAYABILITY_CONFIG,
    reference: {
      ...PLAYABILITY_IDENTITY,
      head: 1n,
      source_cursor: 100n,
      root: "forecast-progress-regression",
    },
    trust: "local-synthetic",
    events: { events: [], receipts: [] },
    gaps: [],
  };
  const action = {
    Fire: { cannon: world.cannons[0].id, angle: 0, quantity: 1 },
  };
  return {
    snapshot,
    account,
    choices: [
      { id: "wait", action: { Wait: {} }, quote: { amount_e8s: 0n } },
      { id: "fire", action, quote: quoteAction(snapshot, account, action) },
    ],
    horizon: 1,
    scenarios: [
      { name: "first", opponent: false, delay_ticks: 0, tick_ns: 1000000000n },
      {
        name: "cached-equivalent",
        opponent: false,
        delay_ticks: 0,
        tick_ns: 1000000000n,
      },
    ],
    maxWork: 100000,
    maxMs: 3000,
    includeStates: false,
  };
}
async function collect(stopAtPaid, input = request()) {
  const worker = new Worker(
    new URL("../../packages/agents/b2z/forecast-worker.mjs", import.meta.url),
  );
  let timer,
    done = false;
  const progress = [];
  try {
    return await new Promise((resolve, reject) => {
      timer = setTimeout(
        () => reject(Error("Forecast progress test timed out")),
        10000,
      );
      worker.once("error", reject);
      worker.once("exit", (code) => {
        if (!done) reject(Error(`Worker exited before result: ${code}`));
      });
      worker.on("message", (message) => {
        if (done) return;
        if (message.partial) {
          progress.push(message.result);
          if (stopAtPaid && message.result.candidate === "fire") {
            done = true;
            resolve({ progress });
          }
        } else {
          done = true;
          resolve({ progress, final: message.results });
        }
      });
      worker.postMessage(input);
    });
  } finally {
    clearTimeout(timer);
    await worker.terminate();
  }
}

test("cached completed rows are delivered before later work can be interrupted", async () => {
  const { progress } = await collect(true);
  assert.equal(progress.at(-1).candidate, "fire");
  assert.equal(progress.at(-1).status, "complete");
  const cached = progress.find(
    (r) => r.candidate === "wait" && r.scenario === "cached-equivalent",
  );
  assert.ok(
    cached,
    "The completed cached Wait row must survive a later interruption",
  );
  assert.equal(cached.forecast_cache_hit, true);
  assert.equal(cached.status, "complete");
  assert.equal(cached.planned_transfer_e8s, 0n);
});

test("the complete reply and streamed rows agree exactly, including cache hits", async () => {
  const { progress, final } = await collect(false);
  assert.equal(final.length, 4);
  assert.equal(progress.filter((r) => r.forecast_cache_hit).length, 2);
  assert.deepEqual(progress, final);
});

test("kernel-context errors are streamed as well as retained in the final reply", async () => {
  const input = request();
  input.snapshot.reference.rules_hash = "00".repeat(32);
  const { progress, final } = await collect(false, input);
  assert.equal(final.length, 4);
  assert.ok(final.every((r) => r.status === "error"));
  assert.deepEqual(progress, final);
});
