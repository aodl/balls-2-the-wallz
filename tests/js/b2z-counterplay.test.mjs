import test from "node:test";
import assert from "node:assert/strict";
import { decideCounterplay } from "../../packages/agents/b2z/policies.mjs";
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
        support_survivors: c.id === "support" || c.id === "redundant" ? 1 : 0,
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
