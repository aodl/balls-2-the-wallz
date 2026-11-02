#!/usr/bin/env node
import { ballPrice } from "../packages/kernels/b2z/pricing-v6.mjs";
/** Small paired trials of the existing kernel. No network, signer or campaign authority. */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  decodeCanonical,
  encodeCanonical,
  cloneCanonical,
} from "@dtr/timeline-runtime/runtime/canonical";
import { sha256 } from "@dtr/timeline-runtime/runtime/seal";
import { B2zCursor, encodePayment } from "../packages/kernels/b2z/kernel.mjs";
import {
  decodeWorld,
  encodeWorld,
  ENTRY_IDENTITY,
  ENTRY_CONFIG,
  setOwner,
  territoryBallCount,
  ownershipCounts,
  ownerAt,
} from "../packages/kernels/b2z/world.mjs";
import { BoardAnalysis } from "../packages/agents/b2z/analysis.mjs";
import { quoteAction } from "../packages/agents/b2z/actions.mjs";
import { evaluateActions } from "../packages/agents/b2z/forecast.mjs";
import { decide, POLICY_VERSION } from "../packages/agents/b2z/policies.mjs";
import { fractionSub, stringify } from "../packages/agents/b2z/common.mjs";
const output = process.argv[2] ?? ".work/b2z-post-review/matched";
mkdirSync(output, { recursive: true });
const fixtures = JSON.parse(readFileSync("tests/fixtures/rules-v6.json")),
  horizon = process.argv.includes("--reactive-defence") ? 16 : 8,
  budget = 25000000n,
  fee = 10000n,
  rows = [],
  started = performance.now();
let work = 0;
const score = (w, a) =>
  w.credits.find((c) => c.account === a)?.units ?? [0n, 1n];
function payment(account, quote, position) {
  const bytes = encodePayment(account, quote.amount_e8s, {
    kind: "angle",
    value: 0,
  });
  bytes.set(Buffer.from(quote.memo_hex, "hex"), 48);
  return { position, payload_hex: Buffer.from(bytes).toString("hex") };
}
function run(initial, account, choice, opponentInputs, admissionTick = 0) {
  const runStart = performance.now(),
    workStart = work;
  let w = cloneCanonical(initial),
    spent = 0n;
  const receipts = [];
  for (let tick = 0; tick < horizon; tick++) {
    const inputs = [...(opponentInputs[tick] ?? [])];
    if (tick === admissionTick && !choice.action.Wait) {
      inputs.push(payment(account, choice.quote, 1001n + BigInt(tick) * 10n));
      spent = choice.quote.amount_e8s + fee;
    }
    const c = new B2zCursor(encodeWorld(w), inputs, {
      ...ENTRY_IDENTITY,
      logical_start: w.time[0],
      logical_end: w.time[0] + 1n,
    });
    for (;;) {
      const r = c.step(32);
      work += r.used;
      assert.ok(
        work <= 2000000 && performance.now() - started < 60000,
        "Matched trial work/time bound",
      );
      if (r.complete) break;
    }
    c.finalizeElapsed(
      w.playability.elapsed_ns +
        (process.argv.includes("--reactive-defence")
          ? 5000000000n
          : 1000000000n),
    );
    const out = c.result();
    w = decodeWorld(out.state);
    receipts.push(...decodeCanonical(out.events).receipts);
  }
  assert.ok(spent <= budget);
  return {
    world: w,
    spent,
    delta: fractionSub(score(w, account), score(initial, account)),
    receipts,
    work: work - workStart,
    elapsed_ms: performance.now() - runStart,
  };
}
if (
  process.argv.includes("--bridge-defence") ||
  process.argv.includes("--reactive-defence")
) {
  const reactive = process.argv.includes("--reactive-defence");
  const scenarios = reactive
    ? [
        { geometry: "bent-near", attackKind: "cardinal" },
        { geometry: "bent-near", attackKind: "two-directions" },
        { geometry: "straight-long-approach", attackKind: "cardinal" },
      ]
    : [{ geometry: "straight-near", attackKind: "cardinal" }];
  for (const { geometry, attackKind } of scenarios) {
    for (const seat of [0, 1]) {
      const initial = decodeWorld(
        Buffer.from(fixtures.cases.bridge_left.state_hex, "hex"),
      );
      // Historical bridge fixture already has a strike due at 1/16 tick.
      // New valueless scenarios isolate only the explicit opposing inputs below.
      if(reactive)initial.pending=[];
      if (geometry === "bent-near") {
        setOwner(initial, 103, 0);
        for (const cell of [999102, 999103, 999104]) setOwner(initial, cell, 1);
      }
      if (geometry === "straight-long-approach") {
        const source = initial.cannons.find((c) => c.id === 3),
          ball = initial.balls.find((b) => b.owner === 2);
        setOwner(initial, source.cell, 0);
        source.cell += 99000;
        setOwner(initial, source.cell, 3);
        ball.cell += 99000;
        ball.y0 += 101376n;
        // A distant neutral gap is not a free-flight corridor: captures reflect.
        // Endow a connected friendly approach so this scenario has an actual incoming threat.
        for(let y=1;y<=100;y++)setOwner(initial,y*1000+103,3);
      }
      const target = geometry === "bent-near" ? 999103 : 103;
      const catalog = JSON.parse(
        readFileSync("config/agents/players.public.json"),
      ).players;
      const mapping = new Map(
        initial.playability.players.map((p, i) => [
          p.account,
          catalog[(i + seat) % 2].account_identifier,
        ]),
      );
      for (const p of [
        ...initial.playability.players,
        ...initial.cannons,
        ...initial.credits,
      ])
        p.account = mapping.get(p.account);
      initial.credits.sort((a, b) => a.account.localeCompare(b.account));
      const cannon = initial.cannons.find((c) => c.id === seat + 1),
        account = cannon.account,
        enemy = initial.cannons.find((c) => c.account !== account);
      const snapshot = { world: initial, configuration: ENTRY_CONFIG },
        action = { Move: { cannon: cannon.id, cell: target } },
        quote = quoteAction(snapshot, account, action);
      const headings =
        attackKind === "two-directions" ? [49152, 57344] : [49152];
      const opposingInputs = {
        1: headings.map((angle, index) => {
          const quote = quoteAction(snapshot, enemy.account, {
            Fire: { cannon: enemy.id, angle, quantity: 1 },
          });
          // Both inputs are admitted before physics, so their sequential pool prices are fixed.
          quote.amount_e8s = ballPrice(
            territoryBallCount(initial, enemy.id) + index,
          );
          return payment(enemy.account, quote, 1010n + BigInt(index));
        }),
      };
      const initialHash = sha256(encodeWorld(initial)),
        attackHash = sha256(
          encodeCanonical([{ tick: 1, inputs: opposingInputs[1] }]),
        );
      const player = initial.playability.players.find(
        (p) => p.account === account,
      ).id;
      const metrics = (r) => ({
        score_delta: r.delta,
        final_state: sha256(encodeWorld(r.world)),
        territory: ownershipCounts(r.world).reduce(
          (n, [id, count]) =>
            n +
            (r.world.playability.territories.find((t) => t.id === id)
              ?.player === player
              ? count
              : 0),
          0,
        ),
        defending_ball_survived: r.world.balls.some(
          (b) => b.id === 1 && b.owner === player,
        ),
        islands_retained: r.world.playability.territories.filter(
          (t) => t.player === player,
        ).length,
        active_islands: r.world.playability.territories.filter(
          (t) =>
            t.player === player &&
            r.world.balls.some(
              (b) => b.owner === player && ownerAt(r.world, b.cell) === t.id,
            ),
        ).length,
        full_cost_e8s: r.spent,
        opponent_full_cost_e8s: r.receipts
          .filter((receipt) => receipt.account !== account)
          .reduce((sum, receipt) => sum + receipt.amount + fee, 0n),
        receipts: r.receipts,
        work: r.work,
        elapsed_ms: r.elapsed_ms,
      });
      for (const admission of reactive ? [0, 2, 12] : [0, 2, 4]) {
        const wait = run(
          initial,
          account,
          { action: { Wait: {} }, quote: { amount_e8s: 0n } },
          opposingInputs,
          admission,
        );
        const move = run(
          initial,
          account,
          { action, quote },
          opposingInputs,
          admission,
        );
        const baseline = metrics(wait),
          candidate = metrics(move);
        const ownReceipts = move.receipts.filter(
          (receipt) => receipt.account === account,
        );
        assert.equal(
          ownReceipts.length,
          1,
          "Exactly one Move receipt, including a rejected payment",
        );
        assert.equal(move.spent, quote.amount_e8s + fee);
        assert.equal(wait.spent, 0n);
        assert.equal(
          ownReceipts[0].status,
          admission === 0 || geometry === 'straight-long-approach' && admission === 2 ? 'applied' : 'rejected',
        );
        for (const arm of [move, wait]) {
          const attacks = arm.receipts.filter(
            (receipt) => receipt.account !== account,
          );
          assert.equal(attacks.length, headings.length);
          assert.ok(
            attacks.every(
              (receipt) =>
                receipt.status === "applied" && receipt.actual_quantity === 1,
            ),
            "Every intended attack actually launched",
          );
        }
        rows.push({
          seat,
          geometry,
          attack: attackKind,
          target_cell: target,
          assumed_conserve_delay_seconds: admission * 5,
          defence: admission === 0 ? "proactive" : "reactive",
          defending_cannon: cannon.id,
          account,
          initial_state: initialHash,
          wait_initial_state: initialHash,
          opposing_inputs: attackHash,
          wait_opposing_inputs: attackHash,
          admission_tick: admission,
          horizon_logical_ticks: horizon,
          budget_e8s: budget,
          wait_budget_e8s: budget,
          move: candidate,
          wait: baseline,
          incremental_canonical_score: fractionSub(move.delta, wait.delta),
          incremental_territory: candidate.territory - baseline.territory,
        });
      }
    }
  }
} else {
  for (const name of ["bridge_left", "mutual"])
    for (const seat of [0, 1]) {
      const initial = decodeWorld(
          Buffer.from(fixtures.cases[name].state_hex, "hex"),
        ),
        publicPlayers = JSON.parse(
          readFileSync("config/agents/players.public.json"),
        ).players,
        remap = new Map(
          initial.playability.players.map((p, i) => [
            p.account,
            publicPlayers[i].account_identifier,
          ]),
        );
      for (const p of [
        ...initial.playability.players,
        ...initial.cannons,
        ...initial.credits,
      ])
        p.account = remap.get(p.account);
      initial.credits.sort((a, b) => a.account.localeCompare(b.account));
      const players = initial.playability.players;
      // Rotate the tested policy between distinct existing player/cannon positions.
      const account = players[seat % players.length].account,
        snapshot = {
          world: initial,
          configuration: ENTRY_CONFIG,
          reference: {
            ...ENTRY_IDENTITY,
            source_cursor: 1000n,
            head: BigInt(seat + 1),
            root: sha256(encodeWorld(initial)),
          },
          trust: "local-synthetic",
          events: { events: [], receipts: [] },
          gaps: [],
          operational: {
            run: {
              running: true,
              pace: { nominal_milli: 1000, admission_open: true },
            },
          },
        },
        board = new BoardAnalysis(snapshot),
        wait = { id: "wait", action: { Wait: {} }, quote: { amount_e8s: 0n } },
        cannon = initial.cannons.find((c) => c.account === account),
        choices = [wait];
      const action = { Fire: { cannon: cannon.id, angle: 4096, quantity: 1 } },
        quote = quoteAction(snapshot, account, action);
      if (quote.amount_e8s + fee <= budget)
        choices.push({ id: "fire", action, quote });
      // Identical sealed opponent stream is replayed in candidate and Wait, including paid amount/order.
      const enemy = initial.cannons.find((c) => c.account !== account),
        opponentInputs = {};
      if (enemy) {
        try {
          const q = quoteAction(snapshot, enemy.account, {
            Fire: { cannon: enemy.id, angle: enemy.heading ?? 0, quantity: 1 },
          });
          opponentInputs[2] = [payment(enemy.account, q, 1020n)];
        } catch (e) {
          if (!/CAPACITY/.test(e.message)) throw e;
        }
      }
      const evaluation = await evaluateActions(board, account, {
          choices,
          horizon,
          maxCandidates: 2,
          maxMs: 5000,
          maxWork: 60000,
          delaySeconds: [0, 1, 2],
        }),
        baseline = run(initial, account, wait, opponentInputs),
        inputHash = sha256(
          encodeCanonical(
            Array.from({ length: horizon }, (_, tick) => ({
              tick,
              inputs: opponentInputs[tick] ?? [],
            })),
          ),
        ),
        stateHash = snapshot.reference.root;
      for (const policy of [
        "frugal-expander",
        "attrition-raider",
        "adaptive-allocator",
        "forced-fire-check",
      ]) {
        const decision =
            policy === "forced-fire-check"
              ? {
                  candidate: choices.find((c) => !c.action.Wait)?.id ?? "wait",
                  reason: "Paired candidate diagnostic, not a policy update",
                }
              : decide(policy, evaluation, { seed: seat + 1 }),
          choice = choices.find((c) => c.id === decision.candidate),
          actual = run(initial, account, choice, opponentInputs),
          incremental = fractionSub(actual.delta, baseline.delta);
        rows.push({
          fixture: name,
          seat,
          account,
          policy,
          policy_version: POLICY_VERSION,
          decision,
          comparison: "matched-wait",
          complete: true,
          initial_state: stateHash,
          wait_initial_state: stateHash,
          future_inputs: inputHash,
          wait_future_inputs: inputHash,
          logical_horizon: horizon,
          wait_logical_horizon: horizon,
          budget_e8s: budget,
          wait_budget_e8s: budget,
          natural_wait_score_delta: baseline.delta,
          actual_score_delta: actual.delta,
          incremental_score_delta: incremental,
          full_expenditure_e8s: actual.spent,
          receipt_statuses: actual.receipts.map((r) => r.status),
          forecast_status: evaluation.status,
          forecast_measurements: evaluation.measurements,
          forecast_bounds: evaluation.bounds,
        });
      }
    }
}
const result = {
  status: "PASS",
  scope: `Matched pure-kernel local trials; fixed opponent input stream and ${horizon} logical ticks; no ICP, inference or billed-cycle claim`,
  rows,
  total_work: work,
  elapsed_ms: performance.now() - started,
  experiment: process.argv.includes("--reactive-defence")
    ? "Bent near bridge or straight bridge with long approach; cardinal/diagonal attacks; proactive tick 0 versus reactive ticks 2/12; sixteen ticks at assumed Conserve pace"
    : process.argv.includes("--bridge-defence") ||
        process.argv.includes("--reactive-defence")
      ? "Move versus Wait; left/right anchor and swapped account seats; same central northbound attack at tick 1; admission 0/2/4"
      : "policy comparisons",
  limitations:
    process.argv.includes("--bridge-defence") ||
    process.argv.includes("--reactive-defence")
      ? [
          "Selected bridge geometry/approach scenarios; left/right moving anchor and swapped accounts; no general balance conclusion",
          "Fixed identical attack stream per matched pair",
          "No billed cycles or live latency claim",
        ]
      : [
          "Two selected fixture geometries and two seats; no statistical winner claim",
          "Frozen scripted opponent stream, not a forecast of actual opponent intentions",
          "Forecast ranking scenarios and the separately supplied experimental opponent stream are explicitly different assumptions",
        ],
};
writeFileSync(output + "/results.json", stringify(result));
console.log(
  "PASS",
  rows.length,
  "paired trials;",
  work,
  "work units;",
  result.elapsed_ms.toFixed(1),
  "ms",
);
