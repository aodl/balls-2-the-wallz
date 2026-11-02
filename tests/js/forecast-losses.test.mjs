import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  decodeWorld,
  ENTRY_IDENTITY,
  ENTRY_CONFIG,
} from "../../packages/kernels/b2z/world.mjs";
import { B2zCursor } from "../../packages/kernels/b2z/kernel.mjs";
import {
  decodeCanonical,
  encodeCanonical,
} from "@dtr/timeline-runtime/runtime/canonical";
import { sha256 } from "@dtr/timeline-runtime/runtime/seal";
import {
  BoardAnalysis,
  ballOutcomes,
} from "../../packages/agents/b2z/analysis.mjs";
import {
  quoteAction,
  consentEvaluation,
} from "../../packages/agents/b2z/actions.mjs";
import { evaluateActions } from "../../packages/agents/b2z/forecast.mjs";
import { accountIdentifier } from "../../apps/b2z-observer/identity.mjs";
import { decide } from "../../packages/agents/b2z/policies.mjs";
const f = JSON.parse(
  readFileSync(
    new URL("../fixtures/forecast-newborn-loss.json", import.meta.url),
  ),
);
test("newly purchased attacker and pre-existing ball both count when native/reference mutual destruction removes them", () => {
  let c = new B2zCursor(
      Buffer.from(f.initial_hex, "hex"),
      decodeCanonical(Buffer.from(f.inputs_hex, "hex")),
      decodeCanonical(Buffer.from(f.context_hex, "hex")),
    ),
    slices = 0,
    used = 0;
  for (;;) {
    const r = c.step([1, 7, 31][slices++ % 3]);
    used += r.used;
    assert.ok(used < 10000);
    if (r.complete) break;
    if (slices % 17 === 0) {
      const b = c.snapshot();
      c = B2zCursor.restore(b, sha256(b));
    }
  }
  c.finalizeElapsed(BigInt(f.observed_ns));
  const out = c.result();
  for (const k of ["state", "events", "scores"])
    assert.equal(sha256(out[k]), f.expected[k + "_sha256"]);
  const before = decodeWorld(Buffer.from(f.initial_hex, "hex")),
    after = decodeWorld(out.state),
    events = [
      {
        ...decodeCanonical(out.events),
        inputs: decodeCanonical(Buffer.from(f.inputs_hex, "hex")),
        slot: 0,
      },
    ],
    loss = ballOutcomes(before, after, events, f.account);
  assert.equal(loss.own_balls_spawned, 1);
  assert.equal(loss.own_existing_balls_lost, 1);
  assert.equal(loss.own_spawned_balls_lost, 1);
  assert.equal(loss.own_balls_lost, 2);
  assert.equal(loss.opponent_balls_lost, 2);
  assert.ok(
    loss.own_ball_losses.some((b) => b.id === f.born && b.origin === "spawned"),
  );
});
test("the planner charges the attacker loss in a paid same-tick mutual exchange", async () => {
  const world = decodeWorld(Buffer.from(f.initial_hex, "hex")),
    s = {
      world,
      configuration: ENTRY_CONFIG,
      reference: { ...ENTRY_IDENTITY, head: 1n, source_cursor: 1000n },
      trust: "local-synthetic",
      events: { events: [], receipts: [] },
      gaps: [],
    },
    b = new BoardAnalysis(s),
    action = { Fire: { cannon: f.cannon, angle: f.angle, quantity: 1 } },
    choices = [
      { id: "wait", action: { Wait: {} }, quote: { amount_e8s: 0n } },
      { id: "fire", action, quote: quoteAction(s, f.account, action) },
    ],
    e = await evaluateActions(b, f.account, {
      choices,
      horizon: 1,
      maxCandidates: 2,
      maxMs: 3000,
      delaySeconds: [0, 0, 0],
    });
  assert.equal(e.status, "complete");
  const r = e.forecasts.find(
    (r) => r.candidate === "fire" && r.scenario === "no-new-opponent-actions",
  );
  assert.equal(r.receipt_outcomes[0].actual_quantity, 1);
  assert.equal(r.own_balls_lost, 2);
  assert.equal(r.own_spawned_balls_lost, 1);
  assert.equal(decide("attrition-raider", e).candidate, "wait");
});
test("counterfactual birth/death identity follows exact payment and events, never allocation IDs", () => {
  const before = {
    playability: {
      players: [
        { id: 1, account: "ours" },
        { id: 2, account: "outside" },
      ],
    },
    balls: [
      { id: 1, owner: 1 },
      { id: 2, owner: 2 },
    ],
  };
  function audit(id, payload = "same-payment") {
    return [
      {
        slot: 0,
        inputs: [{ position: 7n, payload_hex: payload }],
        receipts: [
          {
            position: 7n,
            account: "outside",
            amount: 10n,
            reason: "ACCEPTED",
            kind: "purchase_completed",
            cannon: 2,
          },
        ],
        events: [
          {
            kind: "ball_spawned",
            sequence: 0,
            time: [0n, 1n],
            cannon: 2,
            ball: { id, owner: 2 },
          },
          {
            kind: "purchase_completed",
            sequence: 1,
            cannon: 2,
            actual_quantity: 1,
          },
          {
            kind: "capture_annihilation",
            sequence: 2,
            time: [1n, 1n],
            pairs: [
              {
                balls: [1, id],
                positions: [
                  [
                    [0n, 1n],
                    [0n, 1n],
                  ],
                  [
                    [1n, 1n],
                    [0n, 1n],
                  ],
                ],
              },
            ],
          },
        ],
      },
    ];
  }
  const after = { ...before, balls: [{ id: 2, owner: 2 }] },
    wait = ballOutcomes(before, after, audit(3), "ours"),
    fire = ballOutcomes(before, after, audit(4), "ours");
  assert.equal(wait.opponent_balls_lost, 1);
  assert.equal(fire.opponent_balls_lost, 1);
  assert.equal(
    wait.opposing_ball_losses[0].counterfactual_key,
    fire.opposing_ball_losses[0].counterfactual_key,
  );
  const candidates = [
    { id: "wait", action: { Wait: {} } },
    { id: "fire", action: { Fire: {} } },
  ];
  const row = (candidate, scenario, loss) => ({
    candidate,
    scenario,
    status: "complete",
    action_admitted_within_horizon: true,
    logical_ticks_completed: 1,
    elapsed_window_ns: 1n,
    ...loss,
  });
  const forecasts = ["a", "b", "c"].flatMap((s) => [
    row("wait", s, wait),
    row("fire", s, fire),
  ]);
  assert.equal(
    consentEvaluation({ candidates, forecasts }, []).candidates.length,
    2,
  );
  forecasts[1] = {
    ...forecasts[1],
    ...ballOutcomes(before, after, audit(4, "different-payment"), "ours"),
  };
  assert.equal(
    consentEvaluation({ candidates, forecasts }, []).candidates.length,
    1,
  );
  forecasts[1] = {
    ...forecasts[1],
    ...fire,
    casualty_attribution_complete: false,
  };
  assert.equal(
    consentEvaluation({ candidates, forecasts }, []).candidates.length,
    1,
  );
  assert.throws(
    () => ballOutcomes(before, after, [], "ours"),
    /LIFECYCLE_RECONCILIATION/,
  );
});

test("first-join births bind to the new funding player even when player and cannon IDs differ", async () => {
  const world = decodeWorld(Buffer.from(f.initial_hex, "hex")),
    account = accountIdentifier("2vxsx-fae"),
    snapshot = {
      world,
      configuration: ENTRY_CONFIG,
      reference: { ...ENTRY_IDENTITY, head: 2n, source_cursor: 1000n },
      trust: "local-synthetic",
      events: { events: [], receipts: [] },
      gaps: [],
    },
    action = { New: { angle: 0, quantity: 1, cell: null } },
    e = await evaluateActions(new BoardAnalysis(snapshot), account, {
      choices: [
        { id: "wait", action: { Wait: {} }, quote: { amount_e8s: 0n } },
        { id: "new", action, quote: quoteAction(snapshot, account, action) },
      ],
      horizon: 1,
      maxCandidates: 2,
      maxMs: 3000,
      delaySeconds: [0, 0, 0],
    });
  assert.equal(e.status, "complete");
  for (const r of e.forecasts.filter((r) => r.candidate === "new")) {
    assert.equal(r.balls_before, 0);
    assert.equal(r.own_balls_spawned, 1);
    assert.equal(r.balls_after, 1);
    assert.equal(r.own_balls_lost, 0);
  }
});
