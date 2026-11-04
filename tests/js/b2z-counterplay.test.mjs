import test from "node:test";
import assert from "node:assert/strict";
import {
  decide,
  decideCounterplay,
} from "../../packages/agents/b2z/policies.mjs";
const choices = ["wait", "move", "support", "redundant"].map((id) => ({
  id,
  action:
    id === "wait"
      ? { Wait: {} }
      : id === "move"
        ? { Move: { cannon: 1, cell: 2 } }
        : { Fire: { cannon: 1, angle: 0, quantity: 1 } },
}));
function fixture() {
  return {
    investment_budget_e8s: 10010000n,
    candidates: choices,
    responses: ["original", "alternate"],
    rows: choices.flatMap((c) =>
      ["original", "alternate"].map((response) => ({
        candidate: c.id,
        response,
        status: "complete",
        casualty_attribution_complete: true,
        incremental_score: [
          c.id === "wait"
            ? 0n
            : c.id === "move"
              ? response === "original"
                ? 8n
                : -1n
              : 2n,
          1n,
        ],
        defended_island_support:
          c.id === "support" || c.id === "redundant" ? 1 : 0,
        territory: 4,
        incremental_opponent_losses: 0,
        full_cost_e8s: {
          wait: 0n,
          move: 20000n,
          support: 10010000n,
          redundant: 40010000n,
        }[c.id],
      })),
    ),
  };
}
test("counterplay excludes cheap brittle defence and dominated redundant purchase", () => {
  const d = decideCounterplay("anchor-defender", fixture());
  assert.equal(d.candidate, "support");
  assert.ok(!d.pareto.includes("redundant"));
  assert.equal(
    d.summaries.find((r) => r.candidate === "move").expected_incremental_score,
    3.5,
  );
});
test("unevaluated responses exclude paid actions; missing Wait fails closed", () => {
  const e = fixture();
  e.rows = e.rows.filter(
    (r) => r.candidate !== "support" || r.response !== "alternate",
  );
  e.rows = e.rows.filter((r) => r.candidate !== "redundant");
  assert.equal(decideCounterplay("anchor-defender", e).candidate, "wait");
  e.rows = e.rows.filter((r) => r.candidate !== "wait");
  assert.throws(
    () => decideCounterplay("anchor-defender", e),
    /COMPLETE_WAIT_REQUIRED/,
  );
});
test("complete positive benefit permits bounded spending but no benefit chooses Wait", () => {
  const e = fixture();
  for (const r of e.rows)
    if (r.candidate === "move") r.incremental_score = [1n, 1n];
  assert.equal(decideCounterplay("frugal-expander", e).candidate, "move");
  assert.equal(decideCounterplay("passive", e).candidate, "wait");
  for (const r of e.rows) r.incremental_score = [0n, 1n];
  assert.equal(decideCounterplay("anchor-defender", e).candidate, "wait");
});

test("tiny canonical benefits and downside remain exact in tactical eligibility", () => {
  const e = fixture();
  e.candidates = e.candidates.filter((c) => ["wait", "move"].includes(c.id));
  e.rows = e.rows.filter((r) => ["wait", "move"].includes(r.candidate));
  for (const r of e.rows)
    if (r.candidate === "move") r.incremental_score = [1n, 1000000000000n];
  assert.equal(decideCounterplay("frugal-expander", e).candidate, "move");
  e.rows.find(
    (r) => r.candidate === "move" && r.response === "alternate",
  ).incremental_score = [-1n, 1000000000000n];
  assert.equal(decideCounterplay("frugal-expander", e).candidate, "wait");
});

test("conflicting duplicate response rows are incomplete rather than first-match wins", () => {
  const e = fixture();
  e.rows.push({ ...e.rows.find((r) => r.candidate === "support") });
  assert.ok(
    decideCounterplay("anchor-defender", e).unassessed.includes("support"),
  );
});

test("counterplay validates unknown and explicit historical versions before dispatch", () => {
  const e = { ...fixture(), kind: "local-counterplay" };
  assert.throws(
    () => decide("anchor-defender", e, { version: "unknown" }),
    /UNKNOWN_POLICY_VERSION/,
  );
  for (const version of ["b2z-policies-1", "b2z-policies-2", "b2z-policies-3"])
    assert.throws(
      () => decide("anchor-defender", e, { version }),
      /POLICY_EVALUATION_MISMATCH/,
    );
  assert.equal(decide("anchor-defender", e).version, "b2z-counterplay-2");
});

test("a remote friendly island cannot conceal loss of the defended last ball", async () => {
  const { readFileSync } = await import("node:fs");
  const { decodeWorld, setOwner } = await import(
    "../../packages/kernels/b2z/world.mjs"
  );
  const { defendedIslandSupport } = await import(
    "../../packages/agents/b2z/analysis.mjs"
  );
  const f = JSON.parse(
    readFileSync("tests/fixtures/agent-two-island-support.json"),
  );
  const cases = JSON.parse(readFileSync("tests/fixtures/rules-v6.json")).cases;
  const w = decodeWorld(Buffer.from(cases[f.base].state_hex, "hex"));
  const account = w.playability.players.find(
    (p) => p.id === f.account_player,
  ).account;
  w.playability.territories.push({
    id: f.remote_island.id,
    player: f.account_player,
  });
  for (const cell of f.remote_island.cells)
    setOwner(w, cell, f.remote_island.id);
  w.cannons.push({ id: 4, account, cell: 700100 });
  w.playability.lifecycle.push({ cannon: 4, generation: 1, player: 1 });
  w.playability.next_territory_id = 5;
  w.balls.push({
    ...w.balls[0],
    id: 3,
    cell: 700101,
    x0: 101n * 1024n + 512n,
    y0: 700n * 1024n + 512n,
  });
  assert.equal(
    defendedIslandSupport(w, account, f.defended_cell).supporting_ball_ids
      .length,
    1,
  );
  w.balls = w.balls.filter((b) => b.id !== f.lost_ball);
  const after = defendedIslandSupport(w, account, f.defended_cell);
  assert.equal(after.player_ball_count, f.expected.total_survivors);
  assert.equal(after.supporting_ball_ids.length, f.expected.defended_support);
  assert.equal(after.active, false);
  const e = fixture();
  e.candidates = e.candidates.filter((c) => ["wait", "move"].includes(c.id));
  e.rows = e.rows.filter((r) => ["wait", "move"].includes(r.candidate));
  for (const r of e.rows) {
    r.support_survivors = 1;
    r.defended_island_support =
      r.candidate === "wait" ? 1 : after.supporting_ball_ids.length;
    r.incremental_score = [r.candidate === "wait" ? 0n : 5n, 1n];
  }
  assert.equal(decideCounterplay("anchor-defender", e).candidate, "wait");
  assert.equal(decideCounterplay("frugal-expander", e).candidate, "move");
});

test("public attacker changes direction using only present targets and respects remaining budget", async () => {
  const { choosePublicAttack } = await import(
    "../../packages/agents/b2z/policies.mjs"
  );
  const observation = {
    world: {
      cannons: [{ id: 3, account: "own", cell: 1103 }],
      playability: { players: [{ id: 2, account: "own" }] },
      balls: [{ id: 1, owner: 1, cell: 101 }],
    },
    account: "own",
    cannon: 3,
    remaining_e8s: 10010000n,
    fee_e8s: 10000n,
  };
  const proposals = [
    { id: "wait", action: { Wait: {} } },
    ...[
      [49152, "original"],
      [40960, "changed"],
    ].map(([angle, id]) => ({
      id,
      action: { Fire: { cannon: 3, angle, quantity: 1 } },
      quote: { amount_e8s: 10000000n },
    })),
  ];
  assert.equal(choosePublicAttack(observation, proposals).candidate, "changed");
  observation.world.balls[0].cell = 103;
  assert.equal(
    choosePublicAttack(observation, proposals).candidate,
    "original",
  );
  observation.remaining_e8s = 0n;
  assert.equal(choosePublicAttack(observation, proposals).candidate, "wait");
});

test("Frugal requires an explicit integer investment allocation rather than adopting the whole balance", () => {
  const e = fixture();
  delete e.investment_budget_e8s;
  assert.equal(decideCounterplay("frugal-expander", e).candidate, "wait");
  e.investment_budget_e8s = 10010000;
  assert.equal(decideCounterplay("frugal-expander", e).candidate, "wait");
  e.investment_budget_e8s = 10010000n;
  assert.equal(decideCounterplay("frugal-expander", e).candidate, "support");
});
